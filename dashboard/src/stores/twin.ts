import { computed, ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import type { Cone, ConeColour, ConeState, ServerMessage, Track } from '@shared/messages'
import * as api from '@/api'

/**
 * The open track's digital twin. `track` is what the map shows: the saved track plus any edits not
 * saved yet. Edits stay local until `save()` sends them all at once; `revert()` drops them.
 */
export const useTwinStore = defineStore('twin', () => {
  const track = ref<Track | null>(null)
  const saved = ref<Track | null>(null)
  const selectedId = ref<number | null>(null)
  const lastUpdate = ref<Date | null>(null)
  const error = ref<string | null>(null)
  const saving = ref(false)
  let disconnect: (() => void) | null = null

  function show(t: Track) {
    // toRaw: structuredClone cannot copy Vue's reactive proxies (revert passes the saved track).
    const plain = toRaw(t)
    track.value = structuredClone(plain)
    saved.value = structuredClone(plain)
    if (!t.cones.some((c) => c.id === selectedId.value)) selectedId.value = null
  }

  // Server messages describe saved data, so they update both the saved track and the one on screen.
  function apply(msg: ServerMessage) {
    lastUpdate.value = new Date()
    if (msg.type === 'snapshot') return show(msg.track)
    for (const t of [track.value, saved.value]) {
      if (!t || t.id !== msg.trackId) continue
      if (msg.type === 'cone_upserted') {
        const i = t.cones.findIndex((c) => c.id === msg.cone.id)
        if (i >= 0) t.cones[i] = { ...msg.cone }
        else t.cones.push({ ...msg.cone })
      } else {
        t.cones = t.cones.filter((c) => c.id !== msg.coneId)
        if (selectedId.value === msg.coneId) selectedId.value = null
      }
      t.coneCount = t.cones.length
    }
  }

  let opening = 0
  async function open(trackId: string) {
    close()
    error.value = null
    const ticket = ++opening
    try {
      const t = await api.getTrack(trackId)
      if (ticket !== opening) return // another track was opened meanwhile
      show(t)
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
    saved.value = null
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

  /** Cones added, removed, moved or recoloured since the last save. */
  const changes = computed(() => {
    const before = new Map((saved.value?.cones ?? []).map((c) => [c.id, c]))
    const now = track.value?.cones ?? []
    let n = [...before.keys()].filter((id) => !now.some((c) => c.id === id)).length
    for (const c of now) {
      const b = before.get(c.id)
      if (!b || b.x !== c.x || b.y !== c.y || b.colour !== c.colour) n++
    }
    return n
  })

  // An edited cone gets new guidance, so it goes back to planned.
  function edit(coneId: number, change: Partial<Pick<Cone, 'x' | 'y' | 'colour'>>) {
    const cones = track.value?.cones
    const i = cones?.findIndex((c) => c.id === coneId) ?? -1
    if (!cones || i < 0) return
    const { offsetCm: _o, foundColour: _f, ...cone } = cones[i]!
    cones[i] = { ...cone, ...change, state: 'planned' }
  }

  function addCone(x: number, y: number, colour: ConeColour) {
    if (!track.value) return
    // Above every id ever saved too, so a new cone never takes the id of one removed in this edit.
    const ids = [...track.value.cones, ...(saved.value?.cones ?? [])].map((c) => c.id)
    const id = Math.max(0, ...ids) + 1
    track.value.cones.push({ id, x, y, colour, state: 'planned' })
    selectedId.value = id
  }

  function removeCone(coneId: number) {
    if (!track.value) return
    track.value.cones = track.value.cones.filter((c) => c.id !== coneId)
    if (selectedId.value === coneId) selectedId.value = null
  }

  async function save() {
    const t = track.value
    if (!t || saving.value) return
    saving.value = true
    error.value = null
    try {
      show(await api.saveCones(t.id, t.cones.map(({ id, x, y, colour }) => ({ id, x, y, colour }))))
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      saving.value = false
    }
  }

  function revert() {
    if (saved.value) show(saved.value)
  }

  return {
    track, selectedId, selected, lastUpdate, error, saving, live, counts, total, done, alerts, changes,
    apply, open, close, save, revert, addCone, removeCone,
    moveCone: (coneId: number, x: number, y: number) => edit(coneId, { x, y }),
    setColour: (coneId: number, colour: ConeColour) => edit(coneId, { colour }),
  }
})
