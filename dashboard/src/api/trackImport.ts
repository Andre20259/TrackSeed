import { parse } from 'yaml'
import type { ConeColour, TrackType } from '@shared/messages'

/** What a track file gave us; name, type and cones are checked afterwards by checkTrackPlan. */
export interface ImportedTrack {
  format: 'TrackSeed JSON' | 'FS track YAML'
  name?: string
  type?: TrackType
  cones: unknown
  notes: string[]
}

// Keys are normalised (lower case, "-" and spaces as "_"): files write both "big-orange" and "big_orange".
// A plain "orange" is the small cone.
const CLASS_COLOUR: Record<string, ConeColour> = {
  blue: 'blue',
  yellow: 'yellow',
  orange: 'orange',
  small_orange: 'orange',
  orange_small: 'orange',
  big_orange: 'big_orange',
  orange_big: 'big_orange',
  large_orange: 'big_orange',
}
const classKey = (cls: string) => cls.trim().toLowerCase().replace(/[-\s]+/g, '_')
// Lists in the FS format whose items may have no "class": their side gives the colour.
const SIDE_COLOUR: Record<string, ConeColour> = { left: 'blue', right: 'yellow' }

const mm = (v: number) => Math.round(v * 1000) / 1000

/**
 * Reads a track file: the TrackSeed JSON format, or the FS track YAML used by FS driverless simulators
 * (`track: { left, right, unknown, time_keeping: [{ position: [x, y, z], class }] }`).
 * YAML is a superset of JSON, so one parser reads both.
 */
export function readTrackFile(text: string): ImportedTrack | { error: string } {
  let doc: unknown
  try {
    doc = parse(text)
  } catch {
    return { error: 'The file is not valid JSON or YAML.' }
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return { error: 'The file must contain one track object.' }
  }
  const o = doc as Record<string, unknown>

  if (typeof o.track !== 'object' || o.track === null) {
    return {
      format: 'TrackSeed JSON',
      name: typeof o.name === 'string' ? o.name : undefined,
      type: o.type as TrackType | undefined,
      cones: o.cones,
      notes: [],
    }
  }

  const cones: { x: number; y: number; colour: ConeColour }[] = []
  const skipped = new Map<string, number>()
  for (const [list, items] of Object.entries(o.track as Record<string, unknown>)) {
    if (!Array.isArray(items)) continue
    for (const item of items as Record<string, unknown>[]) {
      const pos = item?.position
      const cls = typeof item?.class === 'string' ? item.class : undefined
      const colour = cls ? CLASS_COLOUR[classKey(cls)] : SIDE_COLOUR[list]
      if (Array.isArray(pos) && typeof pos[0] === 'number' && typeof pos[1] === 'number' && colour) {
        cones.push({ x: mm(pos[0]), y: mm(pos[1]), colour })
      } else {
        const why = cls ?? list
        skipped.set(why, (skipped.get(why) ?? 0) + 1)
      }
    }
  }
  const notes = [...skipped].map(([why, n]) => `${n} "${why}" ${n === 1 ? 'entry' : 'entries'} skipped (not a blue, yellow or orange cone).`)
  return { format: 'FS track YAML', cones, notes }
}
