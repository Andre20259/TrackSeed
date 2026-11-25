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
