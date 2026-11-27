import pg from 'pg'
import { buildApp } from './app.ts'
import { memoryStore, pgStore, type Query } from './store.ts'

const { DATABASE_URL, PORT = '3000', HOST = '127.0.0.1' } = process.env

const pool = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL }) : null
// pg types its rows loosely; the store states each row's shape where it queries.
const query: Query = (text, params) => pool!.query(text, params) as Promise<{ rows: never[] }>
const app = buildApp(pool ? await pgStore(query) : memoryStore(), true)
if (!pool) app.log.warn('DATABASE_URL is not set: tracks are kept in memory and lost when the server stops')

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close()
    await pool?.end()
    process.exit(0)
  })
}

await app.listen({ port: Number(PORT), host: HOST })
