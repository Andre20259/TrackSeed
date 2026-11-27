import type { Cone, ConeColour, Track, TrackPlan, TrackSummary } from '../../shared/messages.ts'

export type SavedCone = { id: number; x: number; y: number; colour: ConeColour }

/** Where tracks are kept. The routes only see this, so tests can use either version. */
export interface TrackStore {
  list(): Promise<TrackSummary[]>
  get(id: string): Promise<Track | null>
  insert(id: string, plan: TrackPlan): Promise<TrackSummary>
  /** Makes the track's cones exactly `cones` (edited, added and removed at once); null if the track does not exist. */
  saveCones(trackId: string, cones: SavedCone[]): Promise<Track | null>
  /** Deletes the track and all its cones; false if it does not exist. */
  remove(trackId: string): Promise<boolean>
}

// The twin has no stored cone states yet: every cone is planned until the phone confirms it.
const planned = (c: SavedCone): Cone => ({ id: c.id, x: c.x, y: c.y, colour: c.colour, state: 'planned' })

/** shortcut: tracks live only while the server runs; for development without PostgreSQL and for tests. */
export function memoryStore(): TrackStore {
  const tracks = new Map<string, Track>()
  const summary = ({ cones, ...t }: Track): TrackSummary => ({ ...t, coneCount: cones.length })
  return {
    async list() {
      return [...tracks.values()].reverse().map(summary)
    },
    async get(id) {
      const t = tracks.get(id)
      return t ? structuredClone(t) : null
    },
    async insert(id, plan) {
      const cones = plan.cones.map((c, i) => planned({ ...c, id: i + 1 }))
      const track: Track = { id, name: plan.name, type: plan.type, coneCount: cones.length, uploadedAt: new Date().toISOString(), cones }
      tracks.set(id, track)
      return summary(track)
    },
    async saveCones(trackId, cones) {
      const t = tracks.get(trackId)
      if (!t) return null
      t.cones = [...cones].sort((a, b) => a.id - b.id).map(planned)
      t.coneCount = t.cones.length
      return structuredClone(t)
    },
    async remove(trackId) {
      return tracks.delete(trackId)
    },
  }
}

/** The one call the store needs from a database client; `pg.Pool` and PGlite (tests) both provide it. */
export type Query = <R>(text: string, params?: unknown[]) => Promise<{ rows: R[] }>

interface TrackRow {
  id: string
  name: string
  type: TrackSummary['type']
  cone_count: number
  uploaded_at: Date
}

const toSummary = (r: TrackRow): TrackSummary => ({
  id: r.id,
  name: r.name,
  type: r.type,
  coneCount: r.cone_count,
  uploadedAt: r.uploaded_at.toISOString(),
})

export async function pgStore(query: Query): Promise<TrackStore> {
  // shortcut: tables created on start-up; move to a migration tool when the schema first changes with real data in it.
  await query(`
    create table if not exists tracks (
      id text primary key,
      name text not null,
      type text not null,
      uploaded_at timestamptz not null default now()
    )`)
  await query(`
    create table if not exists cones (
      track_id text not null references tracks (id) on delete cascade,
      id integer not null,
      x double precision not null,
      y double precision not null,
      colour text not null,
      primary key (track_id, id)
    )`)
  // Databases from the first version kept cones as a jsonb column on tracks: move them to the cones table.
  await query(`
    do $$ begin
      if exists (select 1 from information_schema.columns where table_name = 'tracks' and column_name = 'cones') then
        insert into cones (track_id, id, x, y, colour)
        select t.id, r.ord, r.x, r.y, r.colour
        from tracks t,
          rows from (jsonb_to_recordset(t.cones) as (x float8, y float8, colour text)) with ordinality as r (x, y, colour, ord)
        on conflict do nothing;
        alter table tracks drop column cones;
      end if;
    end $$`)

  const summaries = `
    select t.id, t.name, t.type, t.uploaded_at, count(c.id)::int as cone_count
    from tracks t left join cones c on c.track_id = t.id`
  const cone = 'id, x, y, colour'

  const store: TrackStore = {
    async list() {
      const { rows } = await query<TrackRow>(`${summaries} group by t.id order by t.uploaded_at desc`)
      return rows.map(toSummary)
    },

    async get(id) {
      const { rows } = await query<TrackRow>(`${summaries} where t.id = $1 group by t.id`, [id])
      if (!rows[0]) return null
      const cones = await query<Cone>(`select ${cone} from cones where track_id = $1 order by id`, [id])
      return { ...toSummary(rows[0]), cones: cones.rows.map(planned) }
    },

    async insert(id, plan) {
      // One statement, so a track is never stored without its cones.
      const numbered = plan.cones.map((c, i) => ({ ...c, id: i + 1 }))
      const { rows } = await query<TrackRow>(
        `with t as (
           insert into tracks (id, name, type) values ($1, $2, $3) returning id, name, type, uploaded_at
         ), c as (
           insert into cones (track_id, id, x, y, colour)
           select t.id, r.id, r.x, r.y, r.colour
           from t, jsonb_to_recordset($4::jsonb) as r(id int, x float8, y float8, colour text)
         )
         select t.*, $5::int as cone_count from t`,
        [id, plan.name, plan.type, JSON.stringify(numbered), numbered.length],
      )
      return toSummary(rows[0]!)
    },

    async saveCones(trackId, cones) {
      // One statement, so a save is applied completely or not at all. No row comes back if the track does not exist.
      const { rows } = await query(
        `with t as (
           select id from tracks where id = $1
         ), incoming as (
           select r.* from t, jsonb_to_recordset($2::jsonb) as r(id int, x float8, y float8, colour text)
         ), removed as (
           delete from cones c using t
           where c.track_id = t.id and not exists (select 1 from incoming i where i.id = c.id)
         ), kept as (
           insert into cones (track_id, id, x, y, colour)
           select t.id, i.id, i.x, i.y, i.colour from t, incoming i
           on conflict (track_id, id) do update set x = excluded.x, y = excluded.y, colour = excluded.colour
         )
         select id from t`,
        [trackId, JSON.stringify(cones)],
      )
      return rows.length ? store.get(trackId) : null
    },

    async remove(trackId) {
      // The cones go with it: cones.track_id is "on delete cascade".
      const { rows } = await query(`delete from tracks where id = $1 returning id`, [trackId])
      return rows.length > 0
    },
  }
  return store
}
