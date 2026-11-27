<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { TrackSummary } from '@shared/messages'
import { listTracks } from '@/api'

const drawer = ref<boolean | null>(null)
const liveTrack = ref<TrackSummary | null>(null)

onMounted(async () => {
  // The Tracks page reports a missing backend; the sidebar just shows no live track.
  const tracks = await listTracks().catch(() => [])
  liveTrack.value = tracks.find((t) => t.activeSessionId != null) ?? null
})
</script>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" width="248" class="sidebar">
      <div class="brand">
        <div class="brand-mark"><v-icon icon="mdi-traffic-cone" size="22" /></div>
        <div>
          <div class="brand-name">TrackSeed</div>
          <div class="brand-team">FS Team Leiria</div>
        </div>
      </div>

      <v-list nav density="comfortable" class="px-3" color="primary">
        <v-list-item to="/tracks" prepend-icon="mdi-map-marker-path" title="Tracks" />
        <v-list-item to="/sessions" prepend-icon="mdi-history" title="Sessions" />
      </v-list>

      <div v-if="liveTrack" class="px-3 mt-4">
        <div class="section-label">Live now</div>
        <router-link :to="`/tracks/${liveTrack.id}`" class="live-card">
          <span class="pulse" aria-hidden="true" />
          <div>
            <div class="live-name">{{ liveTrack.name }}</div>
            <div class="live-sub">Placer on the track</div>
          </div>
        </router-link>
      </div>
    </v-navigation-drawer>

    <v-app-bar flat height="56" class="topbar">
      <v-app-bar-nav-icon class="d-lg-none" @click="drawer = !drawer" />
      <v-spacer />
      <v-btn
        v-if="liveTrack"
        :to="`/tracks/${liveTrack.id}`"
        variant="tonal"
        color="success"
        size="small"
        class="mr-3"
        prepend-icon="mdi-access-point"
      >
        Live · {{ liveTrack.name }}
      </v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>
.sidebar {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}
.topbar {
  background: rgba(var(--v-theme-background), 0.8) !important;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
}
.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
}
.brand-name {
  font-weight: 700;
  letter-spacing: -0.02em;
  font-size: 1.05rem;
}
.brand-team {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.5);
  padding: 0 8px 8px;
}
.live-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background: rgba(var(--v-theme-success), 0.1);
}
.live-card:hover {
  background: rgba(var(--v-theme-success), 0.16);
}
.live-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.live-sub {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
  box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0.6);
  animation: pulse 1.8s infinite;
  flex-shrink: 0;
}
@keyframes pulse {
  70% {
    box-shadow: 0 0 0 8px rgba(var(--v-theme-success), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
  }
}
</style>
