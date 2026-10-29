'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { TEXTO_ENTRADA_ADMIN } from '@/lib/adminTextos'
import { cn } from '@/lib/utils'

/** «Salir» de /admin: cierra la sesión del equipo en este navegador. Un doble toque no la cierra dos veces. */
export function BotonSalir({ onSalir, className }: { onSalir: () => Promise<void>; className?: string }) {
  const [ocupado, setOcupado] = useState(false)
  return (
    <button
      type="button"
      disabled={ocupado}
      onClick={async () => {
        if (ocupado) return
        setOcupado(true)
        try {
          await onSalir()
        } finally {
          setOcupado(false)
        }
      }}
      className={cn('inline-flex min-h-11 items-center gap-2 rounded-full bg-sand px-4 py-2.5 text-[14px] font-extrabold text-ink active:scale-95 disabled:text-ink-soft', className)}
    >
      <LogOut size={16} aria-hidden /> {TEXTO_ENTRADA_ADMIN.salir}
    </button>
  )
}
