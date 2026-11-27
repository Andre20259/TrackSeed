// Types shared by the dashboard and the backend (and mirrored by the Android app).
// Positions are in metres in the track's local frame: origin at marker A, x east, y north.

// 'orange' is the small orange cone; 'big_orange' the large one used at start, finish and timing lines.
export type ConeColour = 'blue' | 'yellow' | 'orange' | 'big_orange'

/** planned → placed (put down, being checked) → verified; or wrong_colour / missing after the check. */
export type ConeState = 'planned' | 'placed' | 'verified' | 'wrong_colour' | 'missing'

export type TrackType = 'skidpad' | 'acceleration' | 'autocross' | 'trackdrive'

export interface Cone {
  id: number
  x: number
  y: number
  colour: ConeColour
  state: ConeState
  /** Distance from the guided position measured by the phone, in cm (placed / verified cones). */
  offsetCm?: number
  /** Colour the phone actually saw, when it differs from `colour`. */
  foundColour?: ConeColour
}

/** The open track format teams upload (track.schema.json describes the same shape). */
export interface TrackPlan {
  name: string
  type: TrackType
  cones: { x: number; y: number; colour: ConeColour }[]
}

export interface TrackSummary {
  id: string
  name: string
  type: TrackType
  coneCount: number
  lengthM?: number
  uploadedAt: string
  /** Set while a placer is setting this track out. */
  activeSessionId?: number
}

export interface Track extends TrackSummary {
  cones: Cone[]
}

export interface Session {
  id: number
  trackId: string
  trackName: string
  trackType: TrackType
  date: string
  car: string
  placer: string
  setupMin: number
  conesPlaced: number
  conesCorrected: number
  medianErrorCm: number
  maxErrorCm: number
  weather: string
  notes: string
}

/** Server → dashboard / phone, over the track's WebSocket. The server is the only writer of the twin. */
export type ServerMessage =
  | { type: 'snapshot'; track: Track }
  | { type: 'cone_upserted'; trackId: string; cone: Cone }
  | { type: 'cone_removed'; trackId: string; coneId: number }

/** Phone → server, over WebSocket. `msgId` lets the server drop a confirmation resent from the offline queue. */
export interface ConeConfirmed {
  type: 'cone_confirmed'
  msgId: string
  trackId: string
  coneId: number
  colour: ConeColour
  offsetCm: number
}
