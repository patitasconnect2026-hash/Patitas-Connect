import type { MetadataRoute } from 'next'
import { NOMBRE_APP, NOMBRE_CORTO } from '@/lib/config'

/** Permite "Agregar a pantalla de inicio" desde Safari/Chrome y abrirla como app (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOMBRE_APP,
    short_name: NOMBRE_CORTO,
    description: 'Paseos de perros con cuidado en San Isidro y Jesús María.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fbf6ee',
    theme_color: '#ea580c',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
