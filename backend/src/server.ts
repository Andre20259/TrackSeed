import pg from 'pg'
import { buildApp } from './app.ts'
import { memoryStore, pgStore } from './store.ts'

const { DATABASE_URL, PORT = '3000', HOST = '127.0.0.1' } = process.env

const pool = DATABASE_URL ? new pg.Pool({ connectionString: DATABASE_URL }) : null
const app = buildApp(pool ? await pgStore(pool) : memoryStore(), true)
if (!pool) app.log.warn('DATABASE_URL is not set: tracks are kept in memory and lost when the server stops')

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close()
    await pool?.end()
    process.exit(0)
  })
}

await app.listen({ port: Number(PORT), host: HOST })
