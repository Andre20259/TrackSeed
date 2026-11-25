import type { Pool } from 'pg'
import type { Track, TrackPlan, TrackSummary } from '../../shared/messages.ts'

/** Where tracks are kept. The routes only see this, so tests can use an in-memory version. */
export interface TrackStore {
  list(): Promise<TrackSummary[]>
  get(id: string): Promise<Track | null>
  insert(id: string, plan: TrackPlan): Promise<TrackSummary>
}

interface Row {
  id: string
  name: string
  type: TrackSummary['type']
  cone_count: number
  uploaded_at: Date
}

const toSummary = (r: Row): TrackSummary => ({
  id: r.id,
  name: r.name,
  type: r.type,
  coneCount: r.cone_count,
  uploadedAt: r.uploaded_at.toISOString(),
})

/** A freshly uploaded track: every cone planned, numbered in file order. */
export const planToCones = (cones: TrackPlan['cones']): Track['cones'] =>
  cones.map((c, i) => ({ id: i + 1, x: c.x, y: c.y, colour: c.colour, state: 'planned' }))

/** shortcut: tracks live only while the server runs; for development without PostgreSQL and for tests. */
export function memoryStore(): TrackStore {
  const tracks = new Map<string, Track>()
  return {
    async list() {
      return [...tracks.values()].reverse().map(({ cones: _c, ...summary }) => summary)
    },
    async get(id) {
      return tracks.get(id) ?? null
    },
    async insert(id, plan) {
      const summary: TrackSummary = { id, name: plan.name, type: plan.type, coneCount: plan.cones.length, uploadedAt: new Date().toISOString() }
      tracks.set(id, { ...summary, cones: planToCones(plan.cones) })
      return summary
    },
  }
}

export async function pgStore(pool: Pool): Promise<TrackStore> {
  // shortcut: one table created on start-up; move to a migration tool once there is a second table.
  await pool.query(`
    create table if not exists tracks (
      id text primary key,
      name text not null,
      type text not null,
      cones jsonb not null,
      uploaded_at timestamptz not null default now()
    )`)

  const columns = 'id, name, type, jsonb_array_length(cones) as cone_count, uploaded_at'

  return {
    async list() {
      const { rows } = await pool.query<Row>(`select ${columns} from tracks order by uploaded_at desc`)
      return rows.map(toSummary)
    },
    async get(id) {
      const { rows } = await pool.query<Row & { cones: TrackPlan['cones'] }>(
        `select ${columns}, cones from tracks where id = $1`,
        [id],
      )
      const r = rows[0]
      return r ? { ...toSummary(r), cones: planToCones(r.cones) } : null
    },
    async insert(id, plan) {
      const { rows } = await pool.query<Row>(
        `insert into tracks (id, name, type, cones) values ($1, $2, $3, $4) returning ${columns}`,
        [id, plan.name, plan.type, JSON.stringify(plan.cones)],
      )
      return toSummary(rows[0]!)
    },
  }
}
