import type { Metadata } from 'next'
import { NOMBRE_APP } from '@/lib/config'
import { AficheClient } from './AficheClient'

export const metadata: Metadata = {
  title: `Afiche para edificios · ${NOMBRE_APP}`,
  robots: { index: false },
}

/**
 * Afiche A4 imprimible para paneles de edificios, veterinarias y parques.
 * Cada edificio usa su propio código: /afiche?e=Torre%20Los%20Olivos&c=OLIVOS
 * El QR abre la app con ese código ya puesto, así se mide qué edificio funciona mejor.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string; c?: string }> }) {
  const { e, c } = await searchParams
  const building = (e ?? 'tu edificio').slice(0, 40)
  const code = (c ?? 'VECINO10').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14) || 'VECINO10'
  return <AficheClient building={building} code={code} />
}
