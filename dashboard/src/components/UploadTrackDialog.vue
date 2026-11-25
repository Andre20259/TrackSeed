<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Cone, TrackSummary, TrackType } from '@shared/messages'
import { uploadTrack } from '@/api'
import { readTrackFile, type ImportedTrack } from '@/api/trackImport'
import { checkTrackPlan, EXAMPLE_PLAN } from '@/api/trackPlan'
import TwinMap from '@/components/TwinMap.vue'
import { TRACK_TYPE_LABEL, TRACK_TYPES } from '@/lib/cones'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ uploaded: [track: TrackSummary] }>()

const imported = ref<ImportedTrack | null>(null)
const fileError = ref<string | null>(null)
const name = ref('')
const type = ref<TrackType | null>(null)
const sendError = ref<string | null>(null)
const sending = ref(false)

const typeItems = TRACK_TYPES.map((t) => ({ title: TRACK_TYPE_LABEL[t], value: t }))

const check = computed(() =>
  imported.value && type.value ? checkTrackPlan({ name: name.value, type: type.value, cones: imported.value.cones }) : null,
)
const plan = computed(() => (check.value?.ok ? check.value.plan : null))
const errors = computed(() => (check.value && !check.value.ok ? check.value.errors : []))
const preview = computed<Cone[]>(() =>
  (plan.value?.cones ?? []).map((c, i) => ({ ...c, id: i + 1, state: 'verified' })),
)
const colourCounts = computed(() => {
  const n = { blue: 0, yellow: 0, orange: 0 }
  for (const c of plan.value?.cones ?? []) n[c.colour]++
  return n
})

function reset() {
  imported.value = null
  fileError.value = null
  sendError.value = null
  name.value = ''
  type.value = null
}

async function onFile(value: unknown) {
  reset()
  const file = Array.isArray(value) ? value[0] : value
  if (!(file instanceof File)) return
  const result = readTrackFile(await file.text())
  if ('error' in result) {
    fileError.value = result.error
    return
  }
  imported.value = result
  name.value = result.name ?? file.name.replace(/\.(ya?ml|json)$/i, '').replace(/[_]+/g, ' ')
  type.value = result.type && TRACK_TYPES.includes(result.type) ? result.type : null
}

async function send() {
  if (!plan.value) return
  sending.value = true
  sendError.value = null
  try {
    emit('uploaded', await uploadTrack(plan.value))
    open.value = false
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : String(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="640" scrollable @after-leave="reset">
    <v-card title="Upload a track" subtitle="TrackSeed JSON or an FS track YAML file (left, right, unknown cone lists)">
      <v-card-text>
        <v-file-input
          label="Track file (.yaml, .yml or .json)"
          accept=".yaml,.yml,.json,application/json,application/yaml,text/yaml"
          prepend-icon=""
          prepend-inner-icon="mdi-file-upload-outline"
          @update:model-value="onFile"
        />

        <v-alert v-if="fileError" type="error" variant="tonal" class="mb-4" :text="fileError" />

        <template v-if="imported">
          <div class="text-body-small text-medium-emphasis mb-3">Read as {{ imported.format }}</div>
          <v-row density="compact">
            <v-col cols="12" sm="7">
              <v-text-field v-model="name" label="Track name" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="5">
              <v-select
                v-model="type"
                :items="typeItems"
                label="Type"
                density="comfortable"
                :hint="type ? '' : 'The file does not say; choose one'"
                persistent-hint
              />
            </v-col>
          </v-row>

          <v-alert v-if="errors.length" type="error" variant="tonal" class="mb-4" title="This track can't be uploaded">
            <ul class="pl-4">
              <li v-for="e in errors" :key="e">{{ e }}</li>
            </ul>
          </v-alert>

          <template v-if="plan">
            <v-card class="mb-3">
              <TwinMap :cones="preview" height="260px" />
            </v-card>
            <div class="text-body-medium mb-2">
              {{ plan.cones.length }} cones: {{ colourCounts.blue }} blue, {{ colourCounts.yellow }} yellow,
              {{ colourCounts.orange }} orange
            </div>
          </template>
          <ul v-if="imported.notes.length" class="text-body-small text-medium-emphasis pl-4 mb-2">
            <li v-for="n in imported.notes" :key="n">{{ n }}</li>
          </ul>
        </template>

        <v-alert v-if="sendError" type="error" variant="tonal" class="mb-4" title="Upload failed" :text="sendError" />

        <v-expansion-panels v-if="!imported" variant="accordion" class="mt-2">
          <v-expansion-panel title="TrackSeed JSON format">
            <v-expansion-panel-text>
              <p class="text-body-medium mb-2">
                Positions in metres from marker A (x east, y north). Type is skidpad, acceleration, autocross or
                trackdrive.
              </p>
              <pre class="example">{{ EXAMPLE_PLAN }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text="Cancel" @click="open = false" />
        <v-btn text="Upload" variant="flat" color="primary" :disabled="!plan" :loading="sending" @click="send" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.example {
  font-size: 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}
</style>
