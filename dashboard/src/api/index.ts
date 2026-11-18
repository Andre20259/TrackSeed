import type {
  Cone,
  ConeColour,
  ServerMessage,
  Session,
  Track,
  TrackPlan,
  TrackSummary,
} from '@shared/messages'

// shortcut: in-memory sample data until the Fastify backend exists. Keep these function signatures
// and swap the bodies for fetch() (REST) and a WebSocket to /tracks/:id/live.

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = <T>(v: T): T => structuredClone(v)

// ---------- sample tracks (metres, origin at marker A) ----------

function loop(perSide: number, rx: number, ry: number, wobble: number, halfWidth: number) {
  const centre = (t: number) => [rx * Math.cos(t), (ry - 0.35 * ry * Math.cos(t) + wobble * Math.sin(3 * t)) * Math.sin(t)] as const
  const cones: Omit<Cone, 'id' | 'state'>[] = []
  for (let i = 0; i < perSide; i++) {
    const t = (2 * Math.PI * i) / perSide
    const [x, y] = centre(t)
    const [x1, y1] = centre(t + 1e-3)
    const [x0, y0] = centre(t - 1e-3)
    const len = Math.hypot(x1 - x0, y1 - y0)
    const nx = -(y1 - y0) / len
    const ny = (x1 - x0) / len
    const start = i === 0
    cones.push({ x: x + nx * halfWidth, y: y + ny * halfWidth, colour: start ? 'orange' : 'blue' })
    cones.push({ x: x - nx * halfWidth, y: y - ny * halfWidth, colour: start ? 'orange' : 'yellow' })
  }
  return cones
}

function skidpad() {
  // FS skidpad: circle centres 18.25 m apart, inner radius 7.625 m, outer radius 10.625 m.
  const cones: Omit<Cone, 'id' | 'state'>[] = []
  for (const cx of [-9.125, 9.125]) {
    for (let i = 0; i < 16; i++) {
      const a = (2 * Math.PI * i) / 16
      cones.push({ x: cx + 7.625 * Math.cos(a), y: 7.625 * Math.sin(a), colour: 'blue' })
    }
    for (let i = 0; i < 13; i++) {
      const a = (2 * Math.PI * i) / 13
      const x = cx + 10.625 * Math.cos(a)
      const y = 10.625 * Math.sin(a)
      if (Math.hypot(x + cx, y) >= 10.6) cones.push({ x, y, colour: 'yellow' })
    }
  }
  cones.push({ x: 0, y: -12, colour: 'orange' }, { x: 0, y: 12, colour: 'orange' })
  return cones
}

function acceleration(lengthM: number) {
  const cones: Omit<Cone, 'id' | 'state'>[] = []
  for (let x = 0; x <= lengthM; x += 5) {
    cones.push({ x, y: 1.5, colour: 'blue' }, { x, y: -1.5, colour: 'yellow' })
  }
  cones.push({ x: 0, y: 3, colour: 'orange' }, { x: 0, y: -3, colour: 'orange' })
  cones.push({ x: lengthM, y: 3, colour: 'orange' }, { x: lengthM, y: -3, colour: 'orange' })
  return cones
}

const round2 = (v: number) => Math.round(v * 100) / 100

function makeTrack(summary: Omit<TrackSummary, 'coneCount'>, plan: Omit<Cone, 'id' | 'state'>[]): Track {
  const cones: Cone[] = plan.map((c, i) => ({ ...c, x: round2(c.x), y: round2(c.y), id: i + 1, state: 'planned' }))
  return { ...summary, coneCount: cones.length, cones }
}

const tracks = new Map<string, Track>()
for (const t of [
  makeTrack({ id: 'autocross-v3', name: 'Autocross v3', type: 'autocross', lengthM: 640, uploadedAt: '2026-10-20', activeSessionId: 0 }, loop(95, 40, 26, 0, 1.5)),
  makeTrack({ id: 'skidpad-fsg', name: 'Skidpad (FSG)', type: 'skidpad', uploadedAt: '2026-09-02' }, skidpad()),
  makeTrack({ id: 'accel-75', name: 'Acceleration 75 m', type: 'acceleration', lengthM: 75, uploadedAt: '2026-09-02' }, acceleration(75)),
  makeTrack({ id: 'trackdrive-leiria', name: 'Trackdrive Leiria', type: 'trackdrive', lengthM: 1100, uploadedAt: '2026-10-12' }, loop(156, 70, 42, 6, 1.5)),
  makeTrack({ id: 'autocross-v2', name: 'Autocross v2', type: 'autocross', lengthM: 590, uploadedAt: '2026-09-28' }, loop(88, 36, 24, 3, 1.5)),
]) tracks.set(t.id, t)

// Today's session on Autocross v3: cones 1–118 down, 116–118 still being checked, cone 87 the wrong colour.
for (const c of tracks.get('autocross-v3')!.cones) {
  if (c.id > 118) continue
  c.state = c.id >= 116 ? 'placed' : 'verified'
  c.offsetCm = 2 + ((c.id * 7) % 12)
  if (c.id === 87) Object.assign(c, { state: 'wrong_colour', foundColour: 'yellow' })
}

const sessions: Session[] = [
  { id: 0, trackId: 'autocross-v3', trackName: 'Autocross v3', trackType: 'autocross', date: '2026-10-22', car: 'T26', placer: 'Tomás', setupMin: 48, conesPlaced: 190, conesCorrected: 3, medianErrorCm: 7, maxErrorCm: 14, weather: '14 °C · cloudy · wind 12 km/h', notes: 'Wet patch near cone 120; skidpad runs moved to the afternoon.' },
  { id: 1, trackId: 'skidpad-fsg', trackName: 'Skidpad (FSG)', trackType: 'skidpad', date: '2026-10-18', car: 'T26', placer: 'André', setupMin: 21, conesPlaced: 60, conesCorrected: 1, medianErrorCm: 6, maxErrorCm: 12, weather: '17 °C · sunny · wind 6 km/h', notes: '' },
  { id: 2, trackId: 'accel-75', trackName: 'Acceleration 75 m', trackType: 'acceleration', date: '2026-10-11', car: 'T24', placer: 'Tomás', setupMin: 15, conesPlaced: 38, conesCorrected: 0, medianErrorCm: 5, maxErrorCm: 9, weather: '19 °C · sunny · no wind', notes: '' },
  { id: 3, trackId: 'autocross-v2', trackName: 'Autocross v2', trackType: 'autocross', date: '2026-10-04', car: 'T24', placer: 'André', setupMin: 62, conesPlaced: 176, conesCorrected: 7, medianErrorCm: 9, maxErrorCm: 21, weather: '12 °C · light rain · wind 18 km/h', notes: 'Re-aligned twice after the rain.' },
  { id: 4, trackId: 'skidpad-fsg', trackName: 'Skidpad (FSG)', trackType: 'skidpad', date: '2026-09-27', car: 'T24', placer: 'Tomás', setupMin: 24, conesPlaced: 60, conesCorrected: 2, medianErrorCm: 8, maxErrorCm: 16, weather: '21 °C · sunny · wind 9 km/h', notes: '' },
]

// ---------- live updates (WebSocket stand-in) ----------

const listeners = new Map<string, Set<(m: ServerMessage) => void>>()

function broadcast(trackId: string, message: ServerMessage) {
  listeners.get(trackId)?.forEach((fn) => fn(clone(message)))
}

function upsert(track: Track, cone: Cone) {
  const i = track.cones.findIndex((c) => c.id === cone.id)
  if (i >= 0) track.cones[i] = cone
  else track.cones.push(cone)
  track.coneCount = track.cones.length
  broadcast(track.id, { type: 'cone_upserted', trackId: track.id, cone: clone(cone) })
}

// shortcut: simulates the placer's phone on the live track, one confirmation every 1.5 s.
function simulatePlacer(track: Track) {
  const next = track.cones.find((c) => c.state === 'planned')
  const checking = track.cones.find((c) => c.state === 'placed')
  if (checking) upsert(track, { ...checking, state: 'verified' })
  if (next) upsert(track, { ...next, state: 'placed', offsetCm: 2 + Math.round(Math.random() * 12) })
}

/** Subscribes to a track's live updates; returns the function that closes the connection. */
export function connectTrack(trackId: string, onMessage: (m: ServerMessage) => void): () => void {
  if (!listeners.has(trackId)) listeners.set(trackId, new Set())
  listeners.get(trackId)!.add(onMessage)
  const track = tracks.get(trackId)
  if (track) onMessage({ type: 'snapshot', track: clone(track) })
  const timer = track?.activeSessionId != null ? setInterval(() => simulatePlacer(track), 1500) : undefined
  return () => {
    clearInterval(timer)
    listeners.get(trackId)?.delete(onMessage)
  }
}

// ---------- REST ----------

const summary = ({ cones: _cones, ...rest }: Track): TrackSummary => rest

export async function listTracks(): Promise<TrackSummary[]> {
  await delay()
  return [...tracks.values()].map(summary).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

export async function getTrack(id: string): Promise<Track> {
  await delay()
  const t = tracks.get(id)
  if (!t) throw new Error(`Track "${id}" not found`)
  return clone(t)
}

export async function uploadTrack(plan: TrackPlan): Promise<TrackSummary> {
  await delay(300)
  const slug = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'track'
  let id = slug
  for (let n = 2; tracks.has(id); n++) id = `${slug}-${n}`
  const track = makeTrack({ id, name: plan.name, type: plan.type, uploadedAt: new Date().toISOString().slice(0, 10) }, plan.cones)
  tracks.set(id, track)
  return summary(track)
}

function editable(trackId: string) {
  const t = tracks.get(trackId)
  if (!t) throw new Error(`Track "${trackId}" not found`)
  return t
}

/** Moving a cone or changing its colour sends new guidance, so the cone goes back to "planned". */
export async function updateCone(trackId: string, coneId: number, patch: { x?: number; y?: number; colour?: ConeColour }) {
  await delay()
  const t = editable(trackId)
  const cone = t.cones.find((c) => c.id === coneId)
  if (!cone) throw new Error(`Cone ${coneId} not found`)
  const { offsetCm: _o, foundColour: _f, ...rest } = cone
  upsert(t, { ...rest, ...patch, state: 'planned' })
}

export async function addCone(trackId: string, cone: { x: number; y: number; colour: ConeColour }) {
  await delay()
  const t = editable(trackId)
  const id = Math.max(0, ...t.cones.map((c) => c.id)) + 1
  upsert(t, { id, x: round2(cone.x), y: round2(cone.y), colour: cone.colour, state: 'planned' })
}

export async function removeCone(trackId: string, coneId: number) {
  await delay()
  const t = editable(trackId)
  t.cones = t.cones.filter((c) => c.id !== coneId)
  t.coneCount = t.cones.length
  broadcast(trackId, { type: 'cone_removed', trackId, coneId })
}

export async function listSessions(): Promise<Session[]> {
  await delay()
  return clone(sessions)
}

export async function getSession(id: number): Promise<Session> {
  await delay()
  const s = sessions.find((x) => x.id === id)
  if (!s) throw new Error(`Session ${id} not found`)
  return clone(s)
}
