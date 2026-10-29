import type { Metadata } from 'next'
import { PantallaNuevaContrasena } from '@/components/acceso/PantallaAcceso'
import { NOMBRE_APP } from '@/lib/config'

export const metadata: Metadata = {
  title: `Contraseña nueva · ${NOMBRE_APP}`,
}

export default function Page() {
  return <PantallaNuevaContrasena />
}
