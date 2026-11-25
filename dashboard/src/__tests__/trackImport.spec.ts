import { describe, expect, it } from 'vitest'
import { readTrackFile } from '@/api/trackImport'
import { checkTrackPlan, EXAMPLE_PLAN } from '@/api/trackPlan'

// Same layout as FSG25_FEUP_clean.yaml, shortened.
const FS_YAML = `track:
  version: 1.0
  lanesFirstWithLastConnected: true
  start:
    position: [0.0, 0.0, 0.0]
    orientation: [0.0, 0.0, 0.0]
  left:
  - position: [1.0, 1.5, 0.0]
  right: []
  time_keeping:
  - position: [7.655096032296323, -5.943247785704075, 0.0]
    class: timekeeping
  - position: [7.8962014191403025, 5.304318510567531, 0.0]
    class: timekeeping
  unknown:
  - position: [21.389288006241067, 1.6259677215598272, 0.0]
    class: blue
  - position: [21.685942359284738, -1.8098552283291562, 0.0]
    class: yellow
  - position: [2.10587, -1.63374, 0.0]
    class: big_orange
`

describe('readTrackFile', () => {
  it('reads FS track YAML: cones by class or side, other entries skipped', () => {
    const r = readTrackFile(FS_YAML)
    expect(r).toMatchObject({ format: 'FS track YAML' })
    expect('name' in r).toBe(false)
    expect('cones' in r && r.cones).toEqual([
      { x: 1, y: 1.5, colour: 'blue' },
      { x: 21.389, y: 1.626, colour: 'blue' },
      { x: 21.686, y: -1.81, colour: 'yellow' },
      { x: 2.106, y: -1.634, colour: 'orange' },
    ])
    expect('notes' in r && r.notes).toEqual(['2 "timekeeping" entries skipped (not a blue, yellow or orange cone).'])
  })

  it('gives a plan that passes the upload check once name and type are chosen', () => {
    const r = readTrackFile(FS_YAML)
    const cones = 'cones' in r ? r.cones : []
    expect(checkTrackPlan({ name: 'FSG25', type: 'trackdrive', cones }).ok).toBe(true)
  })

  it('reads the TrackSeed JSON format with its name and type', () => {
    expect(readTrackFile(EXAMPLE_PLAN)).toMatchObject({ format: 'TrackSeed JSON', name: 'Skidpad (FSG)', type: 'skidpad' })
  })

  it('reports files that are not JSON or YAML', () => {
    expect(readTrackFile('track: [unclosed')).toEqual({ error: 'The file is not valid JSON or YAML.' })
    expect(readTrackFile('just text')).toEqual({ error: 'The file must contain one track object.' })
  })
})
