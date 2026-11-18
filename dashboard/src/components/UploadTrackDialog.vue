<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TrackPlan, TrackSummary } from '@shared/messages'
import { uploadTrack } from '@/api'
import { checkTrackPlan, EXAMPLE_PLAN } from '@/api/trackPlan'
import { TRACK_TYPE_LABEL } from '@/lib/cones'

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ uploaded: [track: TrackSummary] }>()

const plan = ref<TrackPlan | null>(null)
const errors = ref<string[]>([])
const sending = ref(false)

const colourCounts = computed(() => {
  const n = { blue: 0, yellow: 0, orange: 0 }
  for (const c of plan.value?.cones ?? []) n[c.colour]++
  return n
})

function reset() {
  plan.value = null
  errors.value = []
}

async function onFile(value: unknown) {
  reset()
  const file = Array.isArray(value) ? value[0] : value
  if (!(file instanceof File)) return
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    errors.value = ['The file is not valid JSON.']
    return
  }
  const result = checkTrackPlan(json)
  if (result.ok) plan.value = result.plan
  else errors.value = result.errors
}

async function send() {
  if (!plan.value) return
  sending.value = true
  try {
    emit('uploaded', await uploadTrack(plan.value))
    open.value = false
    reset()
  } catch (e) {
    errors.value = [e instanceof Error ? e.message : String(e)]
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="560" @after-leave="reset">
    <v-card title="Upload a track" subtitle="A JSON file with the position and colour of every cone">
      <v-card-text>
        <v-file-input
          label="Track file (.json)"
          accept=".json,application/json"
          prepend-icon=""
          prepend-inner-icon="mdi-file-upload-outline"
          variant="outlined"
          @update:model-value="onFile"
        />

        <v-alert v-if="errors.length" type="error" variant="tonal" class="mb-4" title="This track can't be uploaded">
          <ul class="pl-4">
            <li v-for="e in errors" :key="e">{{ e }}</li>
          </ul>
        </v-alert>

        <v-alert v-if="plan" type="success" variant="tonal" class="mb-4" :title="plan.name">
          {{ TRACK_TYPE_LABEL[plan.type] }} · {{ plan.cones.length }} cones
          ({{ colourCounts.blue }} blue, {{ colourCounts.yellow }} yellow, {{ colourCounts.orange }} orange)
        </v-alert>

        <v-expansion-panels variant="accordion">
          <v-expansion-panel title="Expected format">
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
