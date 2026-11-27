import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Track, TrackPlan, TrackSummary } from '../../shared/messages.ts'
import { buildApp, newTrackId } from './app.ts'
import { memoryStore } from './store.ts'

const plan: TrackPlan = {
  name: '  FSG 25 ',
  type: 'trackdrive',
  cones: [
    { x: 0, y: 1.5, colour: 'blue' },
    { x: 0, y: -1.5, colour: 'yellow' },
    { x: 2.1, y: -1.6, colour: 'orange' },
  ],
}

test('an uploaded track is stored, listed and returned with its cones', async () => {
  const app = buildApp(memoryStore())
  const created = await app.inject({ method: 'POST', url: '/api/tracks', payload: plan })
  assert.equal(created.statusCode, 201)
  const summary = created.json<TrackSummary>()
  assert.equal(summary.name, 'FSG 25')
  assert.match(summary.id, /^fsg-25-[0-9a-f]{4}$/)

  const list = await app.inject({ url: '/api/tracks' })
  assert.deepEqual(list.json<TrackSummary[]>().map((t) => t.id), [summary.id])

  const track = (await app.inject({ url: `/api/tracks/${summary.id}` })).json<Track>()
  assert.equal(track.cones.length, 3)
  assert.deepEqual(track.cones[2], { id: 3, x: 2.1, y: -1.6, colour: 'orange', state: 'planned' })
})

test('invalid tracks are rejected with a 400', async () => {
  const app = buildApp(memoryStore())
  for (const bad of [
    { ...plan, type: 'drag-race' },
    { ...plan, name: '   ' },
    { ...plan, cones: [] },
    { ...plan, cones: [{ x: '1', y: 0, colour: 'blue' }] },
    { ...plan, cones: [{ x: 1, y: 0, colour: 'red' }] },
  ]) {
    const res = await app.inject({ method: 'POST', url: '/api/tracks', payload: bad })
    assert.equal(res.statusCode, 400, JSON.stringify(bad))
  }
})

test('an unknown track id gives a 404', async () => {
  const res = await buildApp(memoryStore()).inject({ url: '/api/tracks/nope' })
  assert.equal(res.statusCode, 404)
})

test('track ids are URL-safe', () => {
  assert.match(newTrackId('Skidpad (FSG) #2'), /^skidpad-fsg-2-[0-9a-f]{4}$/)
  assert.match(newTrackId('***'), /^track-[0-9a-f]{4}$/)
})

test('an edited track is saved in one request: moved, recoloured, added and removed cones', async () => {
  const app = buildApp(memoryStore())
  const { id } = (await app.inject({ method: 'POST', url: '/api/tracks', payload: plan })).json<TrackSummary>()
  const cones = [
    { id: 1, x: 3.25, y: 1.5, colour: 'blue' },
    { id: 3, x: 2.1, y: -1.6, colour: 'yellow' },
    { id: 4, x: 5, y: 0, colour: 'big_orange' },
  ]
  const saved = await app.inject({ method: 'PUT', url: `/api/tracks/${id}/cones`, payload: cones })
  assert.equal(saved.statusCode, 200)
  assert.deepEqual(saved.json<Track>().cones, cones.map((c) => ({ ...c, state: 'planned' })))

  const reloaded = (await app.inject({ url: `/api/tracks/${id}` })).json<Track>()
  assert.deepEqual(reloaded.cones.map((c) => c.id), [1, 3, 4])
  assert.equal(reloaded.coneCount, 3)
})

test('a save with invalid cones is rejected and changes nothing', async () => {
  const app = buildApp(memoryStore())
  const { id } = (await app.inject({ method: 'POST', url: '/api/tracks', payload: plan })).json<TrackSummary>()
  const save = async (payload: unknown, track = id) =>
    (await app.inject({ method: 'PUT', url: `/api/tracks/${track}/cones`, payload: payload as object })).statusCode

  assert.equal(await save([{ id: 1, x: 1, y: 1, colour: 'red' }]), 400)
  assert.equal(await save([{ x: 1, y: 1, colour: 'blue' }]), 400)
  assert.equal(await save([{ id: 1.5, x: 1, y: 1, colour: 'blue' }]), 400)
  assert.equal(await save([{ id: 1, x: '1', y: 1, colour: 'blue' }]), 400)
  assert.equal(await save([{ id: 2, x: 1, y: 1, colour: 'blue' }, { id: 2, x: 2, y: 2, colour: 'blue' }]), 400)
  assert.equal(await save([]), 400)
  assert.equal(await save([{ id: 1, x: 1, y: 1, colour: 'blue' }], 'nope'), 404)
  assert.equal((await app.inject({ url: `/api/tracks/${id}` })).json<Track>().coneCount, 3)
})

test('a deleted track is gone from the list and its id gives a 404', async () => {
  const app = buildApp(memoryStore())
  const { id } = (await app.inject({ method: 'POST', url: '/api/tracks', payload: plan })).json<TrackSummary>()
  const keep = (await app.inject({ method: 'POST', url: '/api/tracks', payload: plan })).json<TrackSummary>()

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/tracks/${id}` })).statusCode, 204)
  assert.equal((await app.inject({ url: `/api/tracks/${id}` })).statusCode, 404)
  assert.deepEqual((await app.inject({ url: '/api/tracks' })).json<TrackSummary[]>().map((t) => t.id), [keep.id])
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/tracks/${id}` })).statusCode, 404)
})

