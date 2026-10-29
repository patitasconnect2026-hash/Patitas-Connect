import type { Metadata } from 'next'
import { AdminAcceso } from '@/components/admin/AdminAcceso'
import { NOMBRE_APP } from '@/lib/config'

export const metadata: Metadata = {
  title: `Panel interno · ${NOMBRE_APP}`,
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminAcceso />
}
