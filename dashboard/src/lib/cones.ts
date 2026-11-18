import type { ConeColour, ConeState, TrackType } from '@shared/messages'

export const CONE_HEX: Record<ConeColour, string> = {
  blue: '#2563EB',
  yellow: '#EAB308',
  orange: '#F97316',
}

export const CONE_COLOURS: ConeColour[] = ['blue', 'yellow', 'orange']

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
