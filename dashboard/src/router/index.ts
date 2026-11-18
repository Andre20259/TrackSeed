import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/tracks' },
    { path: '/tracks', name: 'tracks', component: () => import('@/views/TracksView.vue') },
    { path: '/tracks/:id', name: 'track', component: () => import('@/views/TrackTwinView.vue'), props: true },
    { path: '/sessions', name: 'sessions', component: () => import('@/views/SessionsView.vue') },
    { path: '/sessions/:id', name: 'session', component: () => import('@/views/SessionReportView.vue'), props: true },
    { path: '/:pathMatch(.*)*', redirect: '/tracks' },
  ],
})

export default router
