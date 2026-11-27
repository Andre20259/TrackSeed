import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import '@/assets/main.css'
import { createVuetify } from 'vuetify'

// Black and yellow, like the team's branding. Dark only: yellow needs a dark background to read well.
// Cone colours on the map are separate (lib/cones.ts) because they mean real cone colours.
export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#111111',
          surface: '#1A1A1A',
          'surface-variant': '#262626',
          'on-surface-variant': '#D6D6D6',
          primary: '#FFE100',
          'on-primary': '#111111',
          secondary: '#BDBDBD',
          'on-secondary': '#111111',
          error: '#FF5A5A',
          warning: '#FF9F1A',
          success: '#4ADE80',
          'on-success': '#111111',
          info: '#5AB0FF',
        },
        variables: { 'border-color': '#FFFFFF', 'border-opacity': 0.1 },
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
