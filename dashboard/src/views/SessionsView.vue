<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Session } from '@shared/messages'
import { listSessions } from '@/api'
import { formatDate } from '@/lib/cones'

const router = useRouter()
const sessions = ref<Session[]>([])
const loading = ref(true)
const car = ref<string | null>(null)

const cars = computed(() => [...new Set(sessions.value.map((s) => s.car))].sort().reverse())
const shown = computed(() => sessions.value.filter((s) => car.value == null || s.car === car.value))

const headers = [
  { title: 'Date', key: 'date' },
  { title: 'Track', key: 'trackName' },
  { title: 'Car', key: 'car' },
  { title: 'Placer', key: 'placer' },
  { title: 'Setup', key: 'setupMin', align: 'end' as const },
  { title: 'Cones', key: 'conesPlaced', align: 'end' as const },
  { title: 'Median error', key: 'medianErrorCm', align: 'end' as const },
]

function openSession(_e: unknown, row: { item: Session }) {
  router.push(`/sessions/${row.item.id}`)
}

onMounted(async () => {
  sessions.value = await listSessions()
  loading.value = false
})
</script>

<template>
  <v-container class="py-6" max-width="1200">
    <h1 class="page-title">Sessions</h1>
    <p class="page-subtitle mb-4">
      {{ sessions.length }} sessions this season · each links the track, the car and the setup results
    </p>

    <v-card>
      <v-card-text>
        <v-chip-group v-model="car" selected-class="text-primary" filter>
          <v-chip v-for="c in cars" :key="c" :value="c" :text="c" variant="outlined" prepend-icon="mdi-car-sports" />
        </v-chip-group>
      </v-card-text>
      <v-data-table
        :headers="headers"
        :items="shown"
        :loading="loading"
        :sort-by="[{ key: 'date', order: 'desc' }]"
        item-value="id"
        hover
        class="clickable-rows"
        @click:row="openSession"
      >
        <template #[`item.date`]="{ item }">{{ formatDate(item.date) }}</template>
        <template #[`item.car`]="{ item }">
          <v-chip size="small" color="secondary" variant="tonal">{{ item.car }}</v-chip>
        </template>
        <template #[`item.setupMin`]="{ item }">{{ item.setupMin }} min</template>
        <template #[`item.medianErrorCm`]="{ item }">{{ item.medianErrorCm }} cm</template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<style scoped>
.clickable-rows :deep(tbody tr) {
  cursor: pointer;
}
</style>
