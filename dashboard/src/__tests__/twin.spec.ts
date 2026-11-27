import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Track } from '@shared/messages'
import { useTwinStore } from '@/stores/twin'
import * as api from '@/api'

vi.mock('@/api', () => ({
  saveCones: vi.fn<typeof api.saveCones>(async (trackId, cones) => ({
    ...track,
    id: trackId,
    coneCount: cones.length,
    cones: cones.map((c) => ({ ...c, state: 'planned' as const })),
  })),
}))

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

describe('twin store edits', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(api.saveCones).mockClear()
  })

  function editedTwin() {
    const twin = useTwinStore()
    twin.apply({ type: 'snapshot', track: structuredClone(track) })
    twin.moveCone(1, 4.5, 2)
    twin.setColour(2, 'orange')
    twin.removeCone(2)
    twin.addCone(9, 9, 'yellow')
    return twin
  }

  it('keeps edits local and counts them until saved', () => {
    const twin = editedTwin()
    expect(twin.changes).toBe(3) // cone 1 moved, cone 2 removed, cone 3 added
    expect(twin.track?.cones.map((c) => c.id)).toEqual([1, 3])
    expect(api.saveCones).not.toHaveBeenCalled()
  })

  it('revert brings back the saved track', () => {
    const twin = editedTwin()
    twin.revert()
    expect(twin.changes).toBe(0)
    expect(twin.track?.cones).toEqual(track.cones)
  })

  it('save sends every cone in one request and becomes the new saved version', async () => {
    const twin = editedTwin()
    await twin.save()
    expect(api.saveCones).toHaveBeenCalledTimes(1)
    expect(api.saveCones).toHaveBeenCalledWith('t1', [
      { id: 1, x: 4.5, y: 2, colour: 'blue' },
      { id: 3, x: 9, y: 9, colour: 'yellow' },
    ])
    expect(twin.changes).toBe(0)
  })

  it('a failed save keeps the edits and shows the error', async () => {
    const twin = editedTwin()
    vi.mocked(api.saveCones).mockRejectedValueOnce(new Error('Cannot reach the backend.'))
    await twin.save()
    expect(twin.error).toBe('Cannot reach the backend.')
    expect(twin.changes).toBe(3)
  })

  it('a new cone never reuses the id of a cone removed before saving', () => {
    const twin = useTwinStore()
    twin.apply({ type: 'snapshot', track: structuredClone(track) })
    twin.removeCone(2)
    twin.addCone(1, 1, 'blue')
    expect(twin.track?.cones.map((c) => c.id)).toEqual([1, 3])
  })
})
