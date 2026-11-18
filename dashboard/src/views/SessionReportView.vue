<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Session, Track } from '@shared/messages'
import { getSession, getTrack } from '@/api'
import TwinMap from '@/components/TwinMap.vue'
import { formatDate, TRACK_TYPE_LABEL } from '@/lib/cones'

const props = defineProps<{ id: string }>()
const session = ref<Session | null>(null)
const track = ref<Track | null>(null)
const error = ref<string | null>(null)
// shortcut: notes are edited locally only, until the backend has PATCH /sessions/:id.
const notes = ref('')
// The browser's print dialog can also save the report as PDF.
const print = () => window.print()

watch(
  () => props.id,
  async (id) => {
    error.value = null
    session.value = null
    try {
      const s = await getSession(Number(id))
      session.value = s
      notes.value = s.notes
      track.value = await getTrack(s.trackId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  },
  { immediate: true },
)

// The report shows the track as it was handed over: every cone verified.
const finalCones = computed(() => (track.value?.cones ?? []).map((c) => ({ ...c, state: 'verified' as const })))

const stats = computed(() => {
  const s = session.value
  if (!s) return []
  return [
    { label: 'Setup time', value: `${s.setupMin} min`, note: `${s.setupMin} person-minutes · 1 placer` },
    { label: 'Cones placed', value: `${s.conesPlaced}`, note: `${s.conesCorrected} corrected` },
    { label: 'Median error', value: `${s.medianErrorCm} cm`, note: `max ${s.maxErrorCm} cm` },
    { label: 'Weather', value: s.weather.split(' · ')[0] ?? s.weather, note: s.weather.split(' · ').slice(1).join(' · ') },
  ]
})
</script>

<template>
  <v-container class="py-6" max-width="1200">
    <v-alert v-if="error" type="error" variant="tonal" :text="error" />

    <template v-else-if="session">
      <div class="d-flex flex-wrap align-center ga-3 mb-4">
        <v-btn icon="mdi-arrow-left" variant="text" to="/sessions" aria-label="Back to sessions" />
        <div class="flex-grow-1">
          <h1 class="page-title">Session report</h1>
          <p class="page-subtitle">{{ formatDate(session.date) }} · placed by {{ session.placer }}</p>
        </div>
        <v-btn variant="outlined" prepend-icon="mdi-printer-outline" text="Print" @click="print" />
      </div>

      <v-card color="surface-variant" variant="flat" class="mb-4">
        <v-card-text class="d-flex flex-wrap align-center ga-6">
          <div>
            <div class="text-label-medium text-medium-emphasis">TRACK</div>
            <router-link :to="`/tracks/${session.trackId}`" class="text-title-large track-link">
              {{ session.trackName }}
            </router-link>
            <div class="text-body-small">{{ TRACK_TYPE_LABEL[session.trackType] }}</div>
          </div>
          <div>
            <div class="text-label-medium text-medium-emphasis">CAR</div>
            <v-chip color="primary" variant="flat" prepend-icon="mdi-car-sports">{{ session.car }}</v-chip>
          </div>
        </v-card-text>
      </v-card>

      <v-row>
        <v-col v-for="s in stats" :key="s.label" cols="12" sm="6" md="3">
          <v-card height="100%">
            <v-card-text>
              <div class="text-body-medium text-medium-emphasis">{{ s.label }}</div>
              <div class="stat-value">{{ s.value }}</div>
              <div class="text-label-large text-primary">{{ s.note }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12" md="7">
          <v-card title="Track as set out">
            <TwinMap :cones="finalCones" height="360px" />
          </v-card>
        </v-col>
        <v-col cols="12" md="5">
          <v-card title="Notes" height="100%">
            <v-card-text>
              <v-textarea v-model="notes" placeholder="Add notes about this session" variant="outlined" rows="6" auto-grow hide-details />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <div v-else class="d-flex justify-center pa-16">
      <v-progress-circular indeterminate color="primary" />
    </div>
  </v-container>
</template>

<style scoped>
.track-link {
  color: inherit;
  text-decoration: none;
  display: block;
}
.track-link:hover {
  text-decoration: underline;
}
</style>
