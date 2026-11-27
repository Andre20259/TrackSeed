<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TrackSummary, TrackType } from '@shared/messages'
import { deleteTrack, listTracks } from '@/api'
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
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const shown = computed(() => tracks.value.filter((t) => type.value == null || t.type === type.value))

const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    tracks.value = await listTracks()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function openTrack(_e: unknown, row: { item: TrackSummary }) {
  router.push(`/tracks/${row.item.id}`)
}

// Deleting cannot be undone, so it always goes through a confirmation dialog.
const toDelete = ref<TrackSummary | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function askDelete(track: TrackSummary) {
  deleteError.value = null
  toDelete.value = track
}

async function confirmDelete() {
  const track = toDelete.value
  if (!track) return
  deleting.value = true
  deleteError.value = null
  try {
    await deleteTrack(track.id)
    tracks.value = tracks.value.filter((t) => t.id !== track.id)
    toDelete.value = null
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : String(e)
  } finally {
    deleting.value = false
  }
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

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error">
      <template #append><v-btn variant="text" text="Retry" @click="load" /></template>
    </v-alert>

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
        <template #[`item.actions`]="{ item }">
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            :aria-label="`Delete ${item.name}`"
            title="Delete track"
            @click.stop="askDelete(item)"
          />
        </template>
        <template #no-data>No tracks yet. Upload a track file (YAML or JSON) to start.</template>
      </v-data-table>
    </v-card>

    <UploadTrackDialog v-model="uploading" @uploaded="onUploaded" />

    <v-dialog
      :model-value="!!toDelete"
      max-width="460"
      :persistent="deleting"
      @update:model-value="(open: boolean) => { if (!open) toDelete = null }"
    >
      <v-card v-if="toDelete" :title="`Delete “${toDelete.name}”?`">
        <v-card-text>
          This removes the track and its {{ toDelete.coneCount }} cones from the team library. It can't be undone.
          <v-alert v-if="deleteError" type="error" variant="tonal" class="mt-4" :text="deleteError" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text="Cancel" :disabled="deleting" @click="toDelete = null" />
          <v-btn color="error" variant="flat" text="Delete track" :loading="deleting" @click="confirmDelete" />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.clickable-rows :deep(tbody tr) {
  cursor: pointer;
}
</style>
