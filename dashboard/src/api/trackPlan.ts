import type { ConeColour, TrackPlan, TrackType } from '@shared/messages'
import { CONE_COLOURS, TRACK_TYPES } from '@/lib/cones'

export type PlanCheck = { ok: true; plan: TrackPlan } | { ok: false; errors: string[] }

const MAX_CONES = 2000
const MAX_COORD_M = 5000

/**
 * Checks an uploaded track file before it is sent. The server repeats the same checks with
 * track.schema.json; this copy only gives the user errors before uploading.
 */
export function checkTrackPlan(input: unknown): PlanCheck {
  const errors: string[] = []
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: ['The file must contain one JSON object.'] }
  }
  const o = input as Record<string, unknown>

  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!name) errors.push('"name" must be a non-empty text.')
  if (!TRACK_TYPES.includes(o.type as TrackType)) {
    errors.push(`"type" must be one of: ${TRACK_TYPES.join(', ')}.`)
  }
  if (!Array.isArray(o.cones) || o.cones.length === 0) {
    errors.push('"cones" must be a non-empty list.')
  } else if (o.cones.length > MAX_CONES) {
    errors.push(`A track can have at most ${MAX_CONES} cones (found ${o.cones.length}).`)
  }

  const cones: TrackPlan['cones'] = []
  if (Array.isArray(o.cones)) {
    o.cones.slice(0, MAX_CONES).forEach((c: unknown, i) => {
      const cone = (typeof c === 'object' && c !== null ? c : {}) as Record<string, unknown>
      const { x, y, colour } = cone
      const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
      if (!finite(x) || !finite(y) || Math.abs(x) > MAX_COORD_M || Math.abs(y) > MAX_COORD_M) {
        errors.push(`Cone ${i + 1}: "x" and "y" must be numbers in metres (within ±${MAX_COORD_M} m).`)
      } else if (!CONE_COLOURS.includes(colour as ConeColour)) {
        errors.push(`Cone ${i + 1}: "colour" must be blue, yellow, orange or big_orange.`)
      } else {
        cones.push({ x, y, colour: colour as ConeColour })
      }
    })
  }

  if (errors.length) return { ok: false, errors: errors.slice(0, 8).concat(errors.length > 8 ? [`…and ${errors.length - 8} more.`] : []) }
  return { ok: true, plan: { name, type: o.type as TrackType, cones } }
}

export const EXAMPLE_PLAN = `{
  "name": "Skidpad (FSG)",
  "type": "skidpad",
  "cones": [
    { "x": 0.0, "y": 0.0, "colour": "big_orange" },
    { "x": 1.5, "y": 7.6, "colour": "blue" },
    { "x": 1.5, "y": 10.6, "colour": "yellow" }
  ]
}`
