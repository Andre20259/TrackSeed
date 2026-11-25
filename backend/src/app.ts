import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import Fastify from 'fastify'
import type { TrackPlan } from '../../shared/messages.ts'
import type { TrackStore } from './store.ts'

// The same file the dashboard and other FS tools can use to produce valid tracks.
const trackSchema = JSON.parse(readFileSync(new URL('../../shared/track.schema.json', import.meta.url), 'utf8'))

/** URL-friendly id from the track name, with a random suffix so two uploads never clash. */
export const newTrackId = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'track'}-${randomBytes(2).toString('hex')}`

export function buildApp(store: TrackStore, logger = false) {
  const app = Fastify({
    logger,
    // Reject "12" where a number is expected instead of silently converting it.
    ajv: { customOptions: { coerceTypes: false } },
  })

  app.get('/api/tracks', () => store.list())

  app.get<{ Params: { id: string } }>('/api/tracks/:id', async (req, reply) => {
    const track = await store.get(req.params.id)
    return track ?? reply.code(404).send({ message: `Track "${req.params.id}" not found` })
  })

  app.post<{ Body: TrackPlan }>('/api/tracks', { schema: { body: trackSchema } }, async (req, reply) => {
    const plan = { ...req.body, name: req.body.name.trim() }
    return reply.code(201).send(await store.insert(newTrackId(plan.name), plan))
  })

  return app
}
