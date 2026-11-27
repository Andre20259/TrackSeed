import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import type { TrackPlan } from '../../shared/messages.ts'
import { memoryStore, pgStore, type TrackStore } from './store.ts'

const plan: TrackPlan = {
  name: 'FSG 25',
  type: 'trackdrive',
  cones: [
    { x: 0, y: 1.5, colour: 'blue' },
    { x: 0, y: -1.5, colour: 'yellow' },
    { x: 2.106, y: -1.634, colour: 'orange' },
  ],
}

// The same checks run on the in-memory store and on real PostgreSQL SQL (PGlite runs PostgreSQL inside Node).
const stores: [string, () => Promise<TrackStore>][] = [
  ['memory', async () => memoryStore()],
  ['PostgreSQL', async () => {
    const db = new PGlite()
    return pgStore((text, params) => db.query(text, params))
  }],
]

for (const [name, make] of stores) {
  describe(`${name} store`, () => {
    test('stores a track and returns it with numbered cones', async () => {
      const store = await make()
      const summary = await store.insert('t1', plan)
      assert.equal(summary.coneCount, 3)
      assert.deepEqual((await store.list()).map((t) => t.id), ['t1'])
      const track = await store.get('t1')
      assert.deepEqual(track?.cones[2], { id: 3, x: 2.106, y: -1.634, colour: 'orange', state: 'planned' })
      assert.equal(await store.get('nope'), null)
    })

    test('saving replaces the cones at once; ids of kept cones never change', async () => {
      const store = await make()
      await store.insert('t1', plan)
      const saved = await store.saveCones('t1', [
        { id: 4, x: 9, y: 9, colour: 'yellow' },
        { id: 2, x: 0.5, y: -1.5, colour: 'blue' },
        { id: 3, x: 2.106, y: -1.634, colour: 'orange' },
      ])
      assert.deepEqual(saved?.cones.map((c) => [c.id, c.x, c.colour]), [[2, 0.5, 'blue'], [3, 2.106, 'orange'], [4, 9, 'yellow']])
      assert.deepEqual(await store.get('t1'), saved)
      assert.equal(saved?.coneCount, 3)
    })

    test('saving an unknown track changes nothing', async () => {
      const store = await make()
      await store.insert('t1', plan)
      assert.equal(await store.saveCones('nope', [{ id: 1, x: 0, y: 0, colour: 'blue' }]), null)
      assert.equal((await store.get('t1'))?.coneCount, 3)
    })
  })
}

test('a database from the first version keeps its cones after the upgrade', async () => {
  const db = new PGlite()
  await db.query(`create table tracks (id text primary key, name text not null, type text not null,
    cones jsonb not null, uploaded_at timestamptz not null default now())`)
  await db.query(`insert into tracks (id, name, type, cones) values ('old', 'Old', 'skidpad', $1::jsonb)`, [
    JSON.stringify([{ x: 1, y: 2, colour: 'blue' }, { x: 3, y: 4, colour: 'yellow' }]),
  ])

  const store = await pgStore((text, params) => db.query(text, params))
  const track = await store.get('old')
  assert.deepEqual(track?.cones.map(({ id, x, y, colour }) => ({ id, x, y, colour })), [
    { id: 1, x: 1, y: 2, colour: 'blue' },
    { id: 2, x: 3, y: 4, colour: 'yellow' },
  ])
  assert.equal((await store.insert('new', plan)).coneCount, 3)
  await pgStore((text, params) => db.query(text, params)) // running the upgrade twice changes nothing
  assert.equal((await store.get('old'))?.coneCount, 2)
})
