import type { Metadata } from 'next'
import { WalkerApp } from '@/components/walker/WalkerApp'
import { NOMBRE_APP } from '@/lib/config'

export const metadata: Metadata = {
  title: `Paseadores · ${NOMBRE_APP}`,
  description: 'Gana paseando perros de tu barrio en San Isidro y Jesús María. Crea tu cuenta de paseador.',
}

export default function Page() {
  return <WalkerApp />
}
