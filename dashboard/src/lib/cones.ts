import type { ConeColour, ConeState, TrackType } from '@shared/messages'

export const CONE_HEX: Record<ConeColour, string> = {
  blue: '#2563EB',
  yellow: '#EAB308',
  orange: '#F97316',
  big_orange: '#F97316',
}

export const CONE_COLOURS: ConeColour[] = ['blue', 'yellow', 'orange', 'big_orange']

export const COLOUR_LABEL: Record<ConeColour, string> = {
  blue: 'Blue',
  yellow: 'Yellow',
  orange: 'Small orange',
  big_orange: 'Big orange',
}

/** Size on the map relative to a blue or yellow cone: big orange cones are drawn larger. */
export const CONE_SCALE: Record<ConeColour, number> = { blue: 1, yellow: 1, orange: 1, big_orange: 1.6 }

export const STATE_LABEL: Record<ConeState, string> = {
  planned: 'Planned',
  placed: 'Placed',
  verified: 'Verified',
  wrong_colour: 'Wrong colour',
  missing: 'Missing',
}

export const TRACK_TYPE_LABEL: Record<TrackType, string> = {
  skidpad: 'Skidpad',
  acceleration: 'Acceleration',
  autocross: 'Autocross',
  trackdrive: 'Trackdrive',
}

export const TRACK_TYPES = Object.keys(TRACK_TYPE_LABEL) as TrackType[]

export const formatLength = (m?: number) =>
  m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
