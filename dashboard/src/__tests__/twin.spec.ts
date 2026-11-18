import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Track } from '@shared/messages'
import { useTwinStore } from '@/stores/twin'

const track: Track = {
  id: 't1',
  name: 'Test',
  type: 'acceleration',
  coneCount: 2,
  uploadedAt: '2026-11-01',
  cones: [
    { id: 1, x: 0, y: 0, colour: 'blue', state: 'planned' },
    { id: 2, x: 5, y: 0, colour: 'yellow', state: 'planned' },
  ],
}

describe('twin store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('applies confirmations, edits and removals from the server', () => {
    const twin = useTwinStore()
    twin.apply({ type: 'snapshot', track: structuredClone(track) })
    twin.apply({ type: 'cone_upserted', trackId: 't1', cone: { id: 1, x: 0, y: 0, colour: 'blue', state: 'verified', offsetCm: 4 } })
    twin.apply({ type: 'cone_upserted', trackId: 't1', cone: { id: 3, x: 10, y: 0, colour: 'orange', state: 'planned' } })
    twin.selectedId = 2
    twin.apply({ type: 'cone_removed', trackId: 't1', coneId: 2 })

    expect(twin.track?.cones.map((c) => c.id)).toEqual([1, 3])
    expect(twin.track?.coneCount).toBe(2)
    expect(twin.counts.verified).toBe(1)
    expect(twin.done).toBe(1)
    expect(twin.selectedId).toBeNull()
  })

  it('ignores messages for another track', () => {
    const twin = useTwinStore()
    twin.apply({ type: 'snapshot', track: structuredClone(track) })
    twin.apply({ type: 'cone_removed', trackId: 'other', coneId: 1 })
    expect(twin.total).toBe(2)
  })

  it('lists wrong and missing cones as alerts', () => {
    const twin = useTwinStore()
    twin.apply({ type: 'snapshot', track: structuredClone(track) })
    twin.apply({ type: 'cone_upserted', trackId: 't1', cone: { id: 2, x: 5, y: 0, colour: 'yellow', state: 'wrong_colour', foundColour: 'blue' } })
    expect(twin.alerts.map((c) => c.id)).toEqual([2])
  })
})
