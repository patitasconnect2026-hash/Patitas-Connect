import type { Metadata } from 'next'
import { PantallaAcceso } from '@/components/acceso/PantallaAcceso'
import { NOMBRE_APP } from '@/lib/config'

export const metadata: Metadata = {
  title: `Entrar · ${NOMBRE_APP}`,
  description: 'Entra o crea tu cuenta de familia o de paseador.',
}

export default function Page() {
  return <PantallaAcceso />
}
