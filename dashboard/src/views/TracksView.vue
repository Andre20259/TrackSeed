<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TrackSummary, TrackType } from '@shared/messages'
import { listTracks } from '@/api'
import UploadTrackDialog from '@/components/UploadTrackDialog.vue'
import { formatDate, formatLength, TRACK_TYPE_LABEL, TRACK_TYPES } from '@/lib/cones'

const router = useRouter()
const tracks = ref<TrackSummary[]>([])
const loading = ref(true)
const search = ref('')
const type = ref<TrackType | null>(null)
const uploading = ref(false)

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Type', key: 'type' },
  { title: 'Cones', key: 'coneCount', align: 'end' as const },
  { title: 'Length', key: 'lengthM', align: 'end' as const },
  { title: 'Uploaded', key: 'uploadedAt' },
]

const shown = computed(() => tracks.value.filter((t) => type.value == null || t.type === type.value))

async function load() {
  loading.value = true
  tracks.value = await listTracks()
  loading.value = false
}

function openTrack(_e: unknown, row: { item: TrackSummary }) {
  router.push(`/tracks/${row.item.id}`)
}

function onUploaded(t: TrackSummary) {
  router.push(`/tracks/${t.id}`)
}

onMounted(load)
</script>

<template>
  <v-container class="py-6" max-width="1200">
    <div class="d-flex flex-wrap align-center ga-4 mb-4">
      <div class="flex-grow-1">
        <h1 class="page-title">Tracks</h1>
        <p class="page-subtitle">Team library · {{ tracks.length }} tracks</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-upload" text="Upload track" @click="uploading = true" />
    </div>

    <v-card>
      <v-card-text class="d-flex flex-wrap align-center ga-4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search tracks"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          max-width="320"
        />
        <v-chip-group v-model="type" selected-class="text-primary" filter>
          <v-chip v-for="t in TRACK_TYPES" :key="t" :value="t" :text="TRACK_TYPE_LABEL[t]" variant="outlined" />
        </v-chip-group>
      </v-card-text>

      <v-data-table
        :headers="headers"
        :items="shown"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
        class="clickable-rows"
        @click:row="openTrack"
      >
        <template #[`item.name`]="{ item }">
          <span class="font-weight-medium">{{ item.name }}</span>
          <v-chip v-if="item.activeSessionId != null" size="x-small" color="primary" variant="tonal" class="ml-2">
            Live
          </v-chip>
        </template>
        <template #[`item.type`]="{ item }">{{ TRACK_TYPE_LABEL[item.type] }}</template>
        <template #[`item.lengthM`]="{ item }">{{ formatLength(item.lengthM) }}</template>
        <template #[`item.uploadedAt`]="{ item }">{{ formatDate(item.uploadedAt) }}</template>
        <template #no-data>No tracks yet. Upload a track JSON to start.</template>
      </v-data-table>
    </v-card>

    <UploadTrackDialog v-model="uploading" @uploaded="onUploaded" />
  </v-container>
</template>

<style scoped>
.clickable-rows :deep(tbody tr) {
  cursor: pointer;
}
</style>
