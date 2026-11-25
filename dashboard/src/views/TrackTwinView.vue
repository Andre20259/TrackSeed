<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ConeColour } from '@shared/messages'
import TwinMap from '@/components/TwinMap.vue'
import { useTwinStore } from '@/stores/twin'
import { CONE_COLOURS, CONE_HEX, formatDate, formatLength, STATE_LABEL, TRACK_TYPE_LABEL } from '@/lib/cones'

const props = defineProps<{ id: string }>()
const twin = useTwinStore()

const editing = ref(false)
const adding = ref(false)
const newColour = ref<ConeColour>('blue')

// Ticks once a second so "updated Xs ago" stays current.
const now = ref(Date.now())
const clock = setInterval(() => (now.value = Date.now()), 1000)
onBeforeUnmount(() => {
  clearInterval(clock)
  twin.close()
})

watch(() => props.id, (id) => twin.open(id), { immediate: true })
watch(editing, (on) => {
  if (!on) adding.value = false
})

const ago = computed(() => {
  if (!twin.lastUpdate) return ''
  const s = Math.max(0, Math.round((now.value - twin.lastUpdate.getTime()) / 1000))
  return s < 2 ? 'just now' : s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`
})
const progress = computed(() => (twin.total ? Math.round((100 * twin.done) / twin.total) : 0))

const legend = [
  { state: 'planned', label: 'Planned' },
  { state: 'placed', label: 'Placed, being checked' },
  { state: 'verified', label: 'Verified' },
  { state: 'wrong_colour', label: 'Wrong colour' },
  { state: 'missing', label: 'Missing' },
] as const

function onAdd(x: number, y: number) {
  twin.addCone(x, y, newColour.value)
}

function commitPosition(axis: 'x' | 'y', value: string) {
  const c = twin.selected
  const v = Number(value)
  if (!c || !Number.isFinite(v) || v === c[axis]) return
  twin.moveCone(c.id, axis === 'x' ? v : c.x, axis === 'y' ? v : c.y)
}
</script>

<template>
  <v-container class="py-6" max-width="1400">
    <v-alert v-if="twin.error" type="error" variant="tonal" class="mb-4" closable :text="twin.error" />

    <template v-if="twin.track">
      <div class="d-flex flex-wrap align-center ga-3 mb-4">
        <v-btn icon="mdi-arrow-left" variant="text" to="/tracks" aria-label="Back to tracks" />
        <div class="flex-grow-1">
          <h1 class="page-title">{{ twin.track.name }}</h1>
          <p class="page-subtitle">
            {{ TRACK_TYPE_LABEL[twin.track.type] }} · {{ twin.total }} cones · {{ formatLength(twin.track.lengthM) }} ·
            uploaded {{ formatDate(twin.track.uploadedAt) }}
          </p>
        </div>
        <v-chip v-if="twin.live" color="success" variant="tonal" prepend-icon="mdi-access-point">
          Live · updated {{ ago }}
        </v-chip>
        <v-chip v-else variant="outlined" prepend-icon="mdi-access-point-off">No placer on this track</v-chip>
      </div>

      <v-row>
        <v-col cols="12" lg="8">
          <v-card>
            <v-toolbar density="comfortable" color="transparent">
              <v-switch v-model="editing" label="Edit track" color="primary" hide-details inset class="ml-4" />
              <template v-if="editing">
                <v-btn-toggle v-model="newColour" mandatory density="compact" class="ml-4" variant="outlined" divided>
                  <v-btn v-for="c in CONE_COLOURS" :key="c" :value="c" :aria-label="`${c} cone`">
                    <v-icon icon="mdi-circle" :color="CONE_HEX[c]" />
                  </v-btn>
                </v-btn-toggle>
                <v-btn
                  class="ml-2"
                  :variant="adding ? 'flat' : 'tonal'"
                  color="primary"
                  prepend-icon="mdi-plus"
                  :text="adding ? 'Click the map…' : 'Add cone'"
                  @click="adding = !adding"
                />
              </template>
            </v-toolbar>
            <v-divider />
            <TwinMap
              :cones="twin.track.cones"
              :selected-id="twin.selectedId"
              :editable="editing"
              :adding="adding"
              height="min(68vh, 640px)"
              @select="twin.selectedId = $event"
              @move="twin.moveCone"
              @add="onAdd"
            />
            <v-divider />
            <v-card-text class="d-flex flex-wrap ga-4 text-body-small">
              <span v-for="l in legend" :key="l.state" class="d-flex align-center ga-1">
                <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
                  <circle v-if="l.state === 'planned'" r="5" fill="none" :stroke="CONE_HEX.blue" stroke-width="2" />
                  <circle v-else-if="l.state === 'placed'" r="5" :fill="CONE_HEX.blue" fill-opacity="0.45" :stroke="CONE_HEX.blue" stroke-width="2" />
                  <circle v-else-if="l.state === 'missing'" r="5" fill="none" stroke="#9E9E9E" stroke-width="2" stroke-dasharray="3 2" />
                  <circle v-else r="5" :fill="CONE_HEX.blue" />
                  <circle v-if="l.state === 'wrong_colour' || l.state === 'missing'" r="6.5" fill="none" class="legend-alert" stroke-width="1.2" />
                </svg>
                {{ l.label }}
              </span>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4" class="d-flex flex-column ga-4">
          <v-card title="Progress">
            <v-card-text>
              <div class="d-flex align-baseline ga-2 mb-2">
                <span class="stat-value">{{ progress }}%</span>
                <span class="text-body-medium text-medium-emphasis">{{ twin.done }} of {{ twin.total }} cones down</span>
              </div>
              <v-progress-linear :model-value="progress" color="primary" height="8" rounded />
              <v-row density="compact" class="mt-3">
                <v-col v-for="s in ['verified', 'placed', 'planned', 'wrong_colour', 'missing'] as const" :key="s" cols="6">
                  <div class="text-title-medium">{{ twin.counts[s] }}</div>
                  <div class="text-body-small text-medium-emphasis">{{ STATE_LABEL[s] }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card title="Alerts">
            <v-list v-if="twin.alerts.length" density="compact">
              <v-list-item
                v-for="c in twin.alerts"
                :key="c.id"
                prepend-icon="mdi-alert-circle"
                base-color="error"
                :title="`Cone ${c.id}: ${STATE_LABEL[c.state].toLowerCase()}`"
                :subtitle="c.state === 'wrong_colour' ? `${c.foundColour} found, ${c.colour} expected` : 'Not found by the phone'"
                @click="twin.selectedId = c.id"
              />
            </v-list>
            <v-card-text v-else class="text-medium-emphasis">No wrong or missing cones.</v-card-text>
          </v-card>

          <v-card v-if="twin.selected" :title="`Cone ${twin.selected.id}`">
            <template #append>
              <v-chip size="small" variant="tonal">{{ STATE_LABEL[twin.selected.state] }}</v-chip>
            </template>
            <v-card-text>
              <p v-if="twin.selected.offsetCm != null" class="text-body-medium mb-3">
                Measured offset: <strong>{{ twin.selected.offsetCm }} cm</strong>
              </p>
              <div class="text-label-large mb-1">Colour</div>
              <v-btn-toggle
                :model-value="twin.selected.colour"
                mandatory
                density="compact"
                variant="outlined"
                divided
                :disabled="!editing"
                class="mb-4"
                @update:model-value="(c: ConeColour) => twin.setColour(twin.selected!.id, c)"
              >
                <v-btn v-for="c in CONE_COLOURS" :key="c" :value="c" :text="c">
                  <template #prepend><v-icon icon="mdi-circle" :color="CONE_HEX[c]" /></template>
                </v-btn>
              </v-btn-toggle>
              <v-row density="compact">
                <v-col cols="6">
                  <v-text-field
                    :model-value="twin.selected.x"
                    label="x (m)"
                    type="number"
                    step="0.1"
                    density="compact"
                    variant="outlined"
                    :disabled="!editing"
                    @change="commitPosition('x', ($event.target as HTMLInputElement).value)"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    :model-value="twin.selected.y"
                    label="y (m)"
                    type="number"
                    step="0.1"
                    density="compact"
                    variant="outlined"
                    :disabled="!editing"
                    @change="commitPosition('y', ($event.target as HTMLInputElement).value)"
                  />
                </v-col>
              </v-row>
              <p class="text-body-small text-medium-emphasis">
                {{ editing
                  ? 'Moving a cone or changing its colour sends new guidance to the phone; the placer then moves the cone.'
                  : 'Turn on "Edit track" to change this cone. You can also drag cones on the map.' }}
              </p>
            </v-card-text>
            <v-card-actions v-if="editing">
              <v-spacer />
              <v-btn color="error" prepend-icon="mdi-delete-outline" text="Remove cone" @click="twin.removeCone(twin.selected.id)" />
            </v-card-actions>
          </v-card>
          <v-card v-else class="empty-hint">
            <v-card-text class="text-medium-emphasis">Select a cone on the map to see its details.</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <div v-else-if="!twin.error" class="d-flex justify-center pa-16">
      <v-progress-circular indeterminate color="primary" />
    </div>
  </v-container>
</template>

<style scoped>
.legend-alert {
  stroke: rgb(var(--v-theme-error));
}
</style>
