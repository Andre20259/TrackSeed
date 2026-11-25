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

export const uploadTrack = (plan: TrackPlan) =>
  backend<TrackSummary>('/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })

/** Subscribes to a track's live updates; returns the function that closes the connection. */
export function connectTrack(_trackId: string, _onMessage: (m: ServerMessage) => void): () => void {
  // shortcut: no live channel yet, so the twin shows the stored plan; open the backend WebSocket here next.
  return () => {}
}

const NO_EDITS = 'Editing tracks is not available yet: the backend has no edit endpoints.'

export async function updateCone(_trackId: string, _coneId: number, _patch: { x?: number; y?: number; colour?: ConeColour }) {
  throw new Error(NO_EDITS)
}

export async function addCone(_trackId: string, _cone: { x: number; y: number; colour: ConeColour }) {
  throw new Error(NO_EDITS)
}

export async function removeCone(_trackId: string, _coneId: number) {
  throw new Error(NO_EDITS)
}

// shortcut: the backend stores no sessions yet; these return nothing until the phone app reports sessions.
export async function listSessions(): Promise<Session[]> {
  return []
}

export async function getSession(id: number): Promise<Session> {
  throw new Error(`Session ${id} not found`)
}
