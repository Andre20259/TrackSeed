import { describe, expect, it } from 'vitest'
import { checkTrackPlan, EXAMPLE_PLAN } from '@/api/trackPlan'

const errorsOf = (input: unknown) => {
  const r = checkTrackPlan(input)
  return r.ok ? [] : r.errors
}

describe('checkTrackPlan', () => {
  it('accepts the example shown in the upload dialog', () => {
    const r = checkTrackPlan(JSON.parse(EXAMPLE_PLAN))
    expect(r.ok && r.plan.cones.length).toBe(3)
  })

  it('rejects a file that is not an object', () => {
    expect(errorsOf([1, 2])).toEqual(['The file must contain one JSON object.'])
  })

  it('lists every problem with the track and its cones', () => {
    const errors = errorsOf({
      name: ' ',
      type: 'drag-race',
      cones: [{ x: 1, y: 2, colour: 'red' }, { x: 'a', y: 2, colour: 'blue' }, { x: 1, y: 9999, colour: 'blue' }],
    })
    expect(errors).toHaveLength(5)
    expect(errors[0]).toContain('"name"')
    expect(errors[1]).toContain('"type"')
    expect(errors[2]).toContain('Cone 1')
  })

  it('trims the name', () => {
    const r = checkTrackPlan({ name: '  Skidpad ', type: 'skidpad', cones: [{ x: 0, y: 0, colour: 'orange' }] })
    expect(r.ok && r.plan.name).toBe('Skidpad')
  })
})
