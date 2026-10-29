import type { Metadata } from 'next'
import { NOMBRE_APP } from '@/lib/config'
import { MarcaClient } from './MarcaClient'

export const metadata: Metadata = { title: `Marca · ${NOMBRE_APP}`, robots: { index: false } }

export default function Page() {
  return <MarcaClient />
}
