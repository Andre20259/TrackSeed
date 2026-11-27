<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Cone } from '@shared/messages'
import { COLOUR_LABEL, CONE_HEX, CONE_SCALE, STATE_LABEL } from '@/lib/cones'

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

// Crosshair: always exactly at the pointer (no snapping, so cones can be placed precisely);
// over a cone, or while dragging one, it also names that cone.
const pointer = ref<{ x: number; y: number } | null>(null)
const hoveredId = ref<number | null>(null)
const aimCone = computed(() => {
  const id = drag.value?.id ?? hoveredId.value
  return id == null ? null : (props.cones.find((c) => c.id === id) ?? null)
})
const aim = computed(() => drag.value ?? pointer.value)
// The whole map window in drawing units. It is larger than `box` when the window's shape differs from the
// track's (the drawing is centred), so the crosshair uses this to reach every edge.
const view = ref(box.value)
function measureView() {
  const el = svg.value
  const m = el?.getScreenCTM()
  if (!el || !m) return
  const rect = el.getBoundingClientRect()
  const inv = m.inverse()
  const a = new DOMPoint(rect.left, rect.top).matrixTransform(inv)
  const b = new DOMPoint(rect.right, rect.bottom).matrixTransform(inv)
  view.value = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }
}
// Labels move to the other side of the lines near the right, top and bottom edges so they stay on the map.
const flipX = computed(() => !!aim.value && aim.value.x > view.value.x + view.value.w * 0.72)
const nearTop = computed(() => !!aim.value && -aim.value.y < view.value.y + r.value * 6)
const nearBottom = computed(() => !!aim.value && -aim.value.y > view.value.y + view.value.h - r.value * 8)
const metres = (v: number) => `${v.toFixed(2)} m`

function leave() {
  pointer.value = null
  hoveredId.value = null
}

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
  if (props.adding) return // let the click reach the ground: a new cone goes exactly where clicked
  e.stopPropagation()
  emit('select', c.id)
  if (!props.editable) return
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  drag.value = { id: c.id, x: c.x, y: c.y }
}

function onMove(e: PointerEvent) {
  measureView()
  const p = toWorld(e)
  pointer.value = p
  if (drag.value && p) drag.value = { id: drag.value.id, ...p }
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
    @pointerleave="leave"
  >
    <g class="scale" :transform="`translate(${box.x + r * 4} ${box.y + box.h - r * 4})`">
      <line x1="0" :x2="scaleM" y1="0" y2="0" :stroke-width="r * 0.4" />
      <line x1="0" x2="0" :y1="-r" y2="0" :stroke-width="r * 0.4" />
      <line :x1="scaleM" :x2="scaleM" :y1="-r" y2="0" :stroke-width="r * 0.4" />
      <text :x="scaleM / 2" :y="-r * 1.6" :font-size="r * 3.2" text-anchor="middle">{{ scaleM }} m</text>
    </g>

    <g
      v-for="c in cones"
      :key="c.id"
      class="cone"
      @pointerdown="onConeDown($event, c)"
      @pointerenter="hoveredId = c.id"
      @pointerleave="hoveredId = null"
    >
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
      <circle :cx="at(c).x" :cy="-at(c).y" :r="r * CONE_SCALE[c.colour]" :style="style(c)" />
    </g>

    <g v-if="aim" class="crosshair" :class="{ 'over-cone': aimCone }" pointer-events="none" aria-hidden="true">
      <line :x1="aim.x" :x2="aim.x" :y1="view.y" :y2="view.y + view.h" vector-effect="non-scaling-stroke" />
      <line :x1="view.x" :x2="view.x + view.w" :y1="-aim.y" :y2="-aim.y" vector-effect="non-scaling-stroke" />
      <text
        :x="aim.x + (flipX ? -r : r)"
        :y="view.y + r * 3.5"
        :font-size="r * 2.8"
        :text-anchor="flipX ? 'end' : 'start'"
      >x {{ metres(aim.x) }}</text>
      <text :x="view.x + r" :y="-aim.y + (nearTop ? r * 3.5 : -r)" :font-size="r * 2.8">y {{ metres(aim.y) }}</text>
      <text
        v-if="aimCone"
        class="cone-label"
        :x="aim.x + (flipX ? -r * 3 : r * 3)"
        :y="-aim.y + (nearBottom ? -r * 3 : r * 5)"
        :font-size="r * 3"
        :text-anchor="flipX ? 'end' : 'start'"
      >Cone {{ aimCone.id }} · {{ COLOUR_LABEL[aimCone.colour].toLowerCase() }} · {{ STATE_LABEL[aimCone.state].toLowerCase() }}</text>
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
.twin-map.adding .cone {
  cursor: crosshair;
}
.ring-selected {
  fill: none;
  stroke: rgb(var(--v-theme-primary));
}
.ring-alert {
  fill: none;
  stroke: rgb(var(--v-theme-error));
}
.crosshair line {
  stroke: rgba(var(--v-theme-on-surface), 0.35);
  stroke-width: 1;
}
.crosshair.over-cone line {
  stroke: rgb(var(--v-theme-primary));
}
/* A halo in the card colour keeps labels readable over cones and lines. */
.crosshair text {
  fill: rgba(var(--v-theme-on-surface), 0.9);
  paint-order: stroke;
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 0.35em;
  stroke-linejoin: round;
  font-variant-numeric: tabular-nums;
}
.crosshair .cone-label {
  fill: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.scale line {
  stroke: rgba(var(--v-theme-on-surface), 0.6);
}
.scale text {
  fill: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
