import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ConeColour, ConeState, ServerMessage, Track } from '@shared/messages'
import * as api from '@/api'

/**
 * The open track's digital twin. Only server messages change it: an edit is sent to the server,
 * and the change comes back as a message like any confirmation from the phone.
 */
export const useTwinStore = defineStore('twin', () => {
  const track = ref<Track | null>(null)
  const selectedId = ref<number | null>(null)
  const lastUpdate = ref<Date | null>(null)
  const error = ref<string | null>(null)
  let disconnect: (() => void) | null = null

  function apply(msg: ServerMessage) {
    lastUpdate.value = new Date()
    if (msg.type === 'snapshot') {
      track.value = msg.track
      return
    }
    const t = track.value
    if (!t || t.id !== msg.trackId) return
    if (msg.type === 'cone_upserted') {
      const i = t.cones.findIndex((c) => c.id === msg.cone.id)
      if (i >= 0) t.cones[i] = msg.cone
      else t.cones.push(msg.cone)
    } else {
      t.cones = t.cones.filter((c) => c.id !== msg.coneId)
      if (selectedId.value === msg.coneId) selectedId.value = null
    }
    t.coneCount = t.cones.length
  }

  let opening = 0
  async function open(trackId: string) {
    close()
    error.value = null
    const ticket = ++opening
    try {
      const t = await api.getTrack(trackId)
      if (ticket !== opening) return // another track was opened meanwhile
      track.value = t
      lastUpdate.value = new Date()
      disconnect = api.connectTrack(trackId, apply)
    } catch (e) {
      if (ticket === opening) error.value = e instanceof Error ? e.message : String(e)
    }
  }

  function close() {
    opening++
    disconnect?.()
    disconnect = null
    track.value = null
    selectedId.value = null
    lastUpdate.value = null
  }

  const live = computed(() => track.value?.activeSessionId != null)
  const selected = computed(() => track.value?.cones.find((c) => c.id === selectedId.value) ?? null)

  const counts = computed(() => {
    const n: Record<ConeState, number> = { planned: 0, placed: 0, verified: 0, wrong_colour: 0, missing: 0 }
    for (const c of track.value?.cones ?? []) n[c.state]++
    return n
  })
  const total = computed(() => track.value?.cones.length ?? 0)
  const done = computed(() => counts.value.placed + counts.value.verified + counts.value.wrong_colour)
  const alerts = computed(() =>
    (track.value?.cones ?? []).filter((c) => c.state === 'wrong_colour' || c.state === 'missing'),
  )

  async function run(action: () => Promise<void>) {
    try {
      error.value = null
      await action()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }
  const id = () => track.value?.id ?? ''

  return {
    track, selectedId, selected, lastUpdate, error, live, counts, total, done, alerts,
    apply, open, close,
    moveCone: (coneId: number, x: number, y: number) => run(() => api.updateCone(id(), coneId, { x, y })),
    setColour: (coneId: number, colour: ConeColour) => run(() => api.updateCone(id(), coneId, { colour })),
    addCone: (x: number, y: number, colour: ConeColour) => run(() => api.addCone(id(), { x, y, colour })),
    removeCone: (coneId: number) => run(() => api.removeCone(id(), coneId)),
  }
})
