import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import Fastify from 'fastify'
import type { TrackPlan } from '../../shared/messages.ts'
import type { SavedCone, TrackStore } from './store.ts'

// The same file the dashboard and other FS tools can use to produce valid tracks.
const trackSchema = JSON.parse(readFileSync(new URL('../../shared/track.schema.json', import.meta.url), 'utf8'))
const coneSchema = trackSchema.properties.cones.items
// A saved track is its full cone list; each cone keeps its id so edits never renumber the others.
const savedConesSchema = {
  ...trackSchema.properties.cones,
  items: {
    ...coneSchema,
    required: [...coneSchema.required, 'id'],
    properties: { ...coneSchema.properties, id: { type: 'integer', minimum: 1, maximum: 1_000_000 } },
  },
}

type TrackParams = { Params: { id: string } }

/** URL-friendly id from the track name, with a random suffix so two uploads never clash. */
export const newTrackId = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'track'}-${randomBytes(2).toString('hex')}`

export function buildApp(store: TrackStore, logger = false) {
  const app = Fastify({
    logger,
    // Reject "12" where a number is expected instead of silently converting it.
    ajv: { customOptions: { coerceTypes: false } },
  })

  const trackNotFound = (id: string) => ({ message: `Track "${id}" not found` })

  app.get('/api/tracks', () => store.list())

  app.get<TrackParams>('/api/tracks/:id', async (req, reply) => {
    const track = await store.get(req.params.id)
    return track ?? reply.code(404).send(trackNotFound(req.params.id))
  })

  app.post<{ Body: TrackPlan }>('/api/tracks', { schema: { body: trackSchema } }, async (req, reply) => {
    const plan = { ...req.body, name: req.body.name.trim() }
    return reply.code(201).send(await store.insert(newTrackId(plan.name), plan))
  })

  // Saves an edited track in one go: cones left out are removed, new ids are added.
  app.put<TrackParams & { Body: SavedCone[] }>(
    '/api/tracks/:id/cones',
    { schema: { body: savedConesSchema } },
    async (req, reply) => {
      if (new Set(req.body.map((c) => c.id)).size !== req.body.length) {
        return reply.code(400).send({ message: 'Two cones have the same id' })
      }
      const track = await store.saveCones(req.params.id, req.body)
      return track ?? reply.code(404).send(trackNotFound(req.params.id))
    },
  )

  return app
}
