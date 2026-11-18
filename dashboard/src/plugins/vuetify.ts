import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import '@/assets/main.css'
import { createVuetify } from 'vuetify'

// Slate neutrals with a violet accent: the accent stays clear of the blue, yellow and orange cones on the map.
export default createVuetify({
  theme: {
    defaultTheme: 'system',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#F6F7FB',
          surface: '#FFFFFF',
          'surface-variant': '#EEF0F6',
          'on-surface-variant': '#334155',
          primary: '#6D4AFF',
          secondary: '#475569',
          error: '#E5484D',
          warning: '#D97706',
          success: '#12A594',
          info: '#0284C7',
        },
        variables: { 'border-color': '#0F172A', 'border-opacity': 0.08 },
      },
      dark: {
        dark: true,
        colors: {
          background: '#0B0F1A',
          surface: '#121826',
          'surface-variant': '#1C2333',
          'on-surface-variant': '#CBD5E1',
          primary: '#9D87FF',
          secondary: '#94A3B8',
          error: '#FF6B6F',
          warning: '#F5B544',
          success: '#3DD6C3',
          info: '#38BDF8',
        },
        variables: { 'border-color': '#E2E8F0', 'border-opacity': 0.1 },
      },
    },
  },
  defaults: {
    VCard: { flat: true, border: true, rounded: 'xl' },
    VBtn: { rounded: 'lg', flat: true, class: 'text-none' },
    VChip: { rounded: 'lg' },
    VTextField: { variant: 'outlined', rounded: 'lg' },
    VTextarea: { variant: 'outlined', rounded: 'lg' },
    VFileInput: { variant: 'outlined', rounded: 'lg' },
    VAlert: { rounded: 'lg' },
    VDialog: { VCard: { border: false, elevation: 12 } },
    VList: { VListItem: { rounded: 'lg' } },
    VSwitch: { color: 'primary', inset: true },
    VProgressLinear: { rounded: true },
  },
})
