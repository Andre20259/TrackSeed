import type { ConeColour, ServerMessage, Session, Track, TrackPlan, TrackSummary } from '@shared/messages'

// Everything comes from the backend; Vite forwards /api to it in development.
const UNREACHABLE = 'Cannot reach the backend. Is it running (npm run dev in TrackSeed/backend)?'

async function backend<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, init)
  } catch {
    throw new Error(UNREACHABLE)
  }
  const body = await res.json().catch(() => null)
  // The dev proxy answers 502–504 itself when the backend is down.
  if (!body && res.status >= 502 && res.status <= 504) throw new Error(UNREACHABLE)
  if (!res.ok) throw new Error(body?.message ?? `The server answered ${res.status} ${res.statusText}`)
  return body as T
}

export const listTracks = () => backend<TrackSummary[]>('/tracks')

export const getTrack = (id: string) => backend<Track>(`/tracks/${encodeURIComponent(id)}`)

export const uploadTrack = (plan: TrackPlan) => backend<TrackSummary>('/tracks', json('POST', plan))

/** Subscribes to a track's live updates; returns the function that closes the connection. */
export function connectTrack(_trackId: string, _onMessage: (m: ServerMessage) => void): () => void {
  // shortcut: no live channel yet, so the twin shows the stored plan; open the backend WebSocket here next.
  return () => {}
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const conesOf = (trackId: string) => `/tracks/${encodeURIComponent(trackId)}/cones`

/** Saves an edited track in one request: the backend makes its cones exactly these. */
export const saveCones = (trackId: string, cones: { id: number; x: number; y: number; colour: ConeColour }[]) =>
  backend<Track>(conesOf(trackId), json('PUT', cones))

// shortcut: the backend stores no sessions yet; these return nothing until the phone app reports sessions.
export async function listSessions(): Promise<Session[]> {
  return []
}

export async function getSession(id: number): Promise<Session> {
  throw new Error(`Session ${id} not found`)
}
