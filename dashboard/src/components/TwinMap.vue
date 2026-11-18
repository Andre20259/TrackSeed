<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Cone } from '@shared/messages'
import { CONE_HEX, STATE_LABEL } from '@/lib/cones'

const props = withDefaults(
  defineProps<{
    cones: Cone[]
    selectedId?: number | null
    /** Cones can be dragged to a new position. */
    editable?: boolean
    /** A click on empty ground emits `add`. */
    adding?: boolean
    height?: string
  }>(),
  { selectedId: null, editable: false, adding: false, height: '520px' },
)

const emit = defineEmits<{
  select: [id: number | null]
  move: [id: number, x: number, y: number]
  add: [x: number, y: number]
}>()

const svg = ref<SVGSVGElement | null>(null)
const drag = ref<{ id: number; x: number; y: number } | null>(null)

// World y points north, SVG y points down: everything is drawn at (x, -y).
const box = computed(() => {
  if (!props.cones.length) return { x: -10, y: -10, w: 20, h: 20 }
  const xs = props.cones.map((c) => c.x)
  const ys = props.cones.map((c) => c.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = Math.max(maxX - minX, maxY - minY, 10) * 0.08
  return { x: minX - pad, y: -maxY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad }
})
const r = computed(() => Math.max(box.value.w, box.value.h) / 150)
const scaleM = computed(() => (box.value.w > 120 ? 50 : box.value.w > 40 ? 10 : 5))

const round2 = (v: number) => Math.round(v * 100) / 100

function toWorld(e: PointerEvent) {
  const m = svg.value?.getScreenCTM()
  if (!m) return null
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
  return { x: round2(p.x), y: round2(-p.y) }
}

const at = (c: Cone) => (drag.value?.id === c.id ? drag.value : c)

function style(c: Cone) {
  const hex = CONE_HEX[c.state === 'wrong_colour' ? (c.foundColour ?? c.colour) : c.colour]
  const w = r.value * 0.5
  switch (c.state) {
    case 'planned':
      return { fill: 'transparent', stroke: hex, strokeWidth: w }
    case 'placed':
      return { fill: hex, fillOpacity: 0.45, stroke: hex, strokeWidth: w }
    case 'missing':
      return { fill: 'transparent', stroke: '#9E9E9E', strokeWidth: w, strokeDasharray: `${w * 1.5} ${w}` }
    default:
      return { fill: hex }
  }
}

function onConeDown(e: PointerEvent, c: Cone) {
  e.stopPropagation()
  emit('select', c.id)
  if (!props.editable) return
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  drag.value = { id: c.id, x: c.x, y: c.y }
}

function onMove(e: PointerEvent) {
  if (!drag.value) return
  const p = toWorld(e)
  if (p) drag.value = { id: drag.value.id, ...p }
}

function onUp() {
  const d = drag.value
  drag.value = null
  const c = d && props.cones.find((x) => x.id === d.id)
  if (d && c && (c.x !== d.x || c.y !== d.y)) emit('move', d.id, d.x, d.y)
}

function onGround(e: PointerEvent) {
  if (!props.adding) return emit('select', null)
  const p = toWorld(e)
  if (p) emit('add', p.x, p.y)
}
</script>

<template>
  <svg
    ref="svg"
    class="twin-map"
    :class="{ adding, editable }"
    :viewBox="`${box.x} ${box.y} ${box.w} ${box.h}`"
    :style="{ height }"
    role="img"
    aria-label="Top-down map of the track cones"
    @pointerdown="onGround"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="drag = null"
  >
    <g class="scale" :transform="`translate(${box.x + r * 4} ${box.y + box.h - r * 4})`">
      <line x1="0" :x2="scaleM" y1="0" y2="0" :stroke-width="r * 0.4" />
      <line x1="0" x2="0" :y1="-r" y2="0" :stroke-width="r * 0.4" />
      <line :x1="scaleM" :x2="scaleM" :y1="-r" y2="0" :stroke-width="r * 0.4" />
      <text :x="scaleM / 2" :y="-r * 1.6" :font-size="r * 3.2" text-anchor="middle">{{ scaleM }} m</text>
    </g>
    <text class="north" :x="box.x + box.w - r * 4" :y="box.y + r * 5" :font-size="r * 3.2" text-anchor="middle">N ↑</text>

    <g
      v-for="c in cones"
      :key="c.id"
      class="cone"
      @pointerdown="onConeDown($event, c)"
    >
      <title>Cone {{ c.id }} · {{ c.colour }} · {{ STATE_LABEL[c.state] }}</title>
      <circle :cx="at(c).x" :cy="-at(c).y" :r="r * 3" fill="transparent" />
      <circle
        v-if="c.id === selectedId"
        class="ring-selected"
        :cx="at(c).x"
        :cy="-at(c).y"
        :r="r * 2.6"
        :stroke-width="r * 0.6"
      />
      <circle
        v-if="c.state === 'wrong_colour' || c.state === 'missing'"
        class="ring-alert"
        :cx="at(c).x"
        :cy="-at(c).y"
        :r="r * 2"
        :stroke-width="r * 0.5"
      />
      <circle :cx="at(c).x" :cy="-at(c).y" :r="c.colour === 'orange' ? r * 1.3 : r" :style="style(c)" />
    </g>
  </svg>
</template>

<style scoped>
.twin-map {
  display: block;
  width: 100%;
  touch-action: none;
  user-select: none;
}
.twin-map.adding {
  cursor: crosshair;
}
.cone {
  cursor: pointer;
}
.twin-map.editable .cone {
  cursor: grab;
}
.ring-selected {
  fill: none;
  stroke: rgb(var(--v-theme-primary));
}
.ring-alert {
  fill: none;
  stroke: rgb(var(--v-theme-error));
}
.scale line {
  stroke: rgba(var(--v-theme-on-surface), 0.6);
}
.scale text,
.north {
  fill: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
