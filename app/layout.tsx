import type { Metadata, Viewport } from 'next'
import { Figtree, Fraunces } from 'next/font/google'
import './globals.css'
import { NOMBRE_APP, NOMBRE_CORTO } from '@/lib/config'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
})

/** Serif con carácter para titulares y números: le da calidez y oficio. */
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: `${NOMBRE_APP} · Paseos con cuidado en San Isidro y Jesús María`,
  description:
    'Paseos de perros con vecinos estudiantes, con fotos y puntos de control. Piloto en San Isidro y Jesús María, Lima.',
  applicationName: NOMBRE_APP,
  appleWebApp: { capable: true, title: NOMBRE_CORTO, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  // Es un piloto: que no salga en los buscadores (noindex). Quien tenga el enlace, entra.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
