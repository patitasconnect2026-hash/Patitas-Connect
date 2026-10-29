'use client'

import { ArrowLeft } from 'lucide-react'
import type { ClienteAcceso } from '@/lib/servidor/tipos'
import { cn } from '@/lib/utils'
import { FormularioAcceso, type ModoAcceso } from './FormularioAcceso'
import type { RolDeRegistro } from '@/lib/servidor/acceso'

/**
 * La pantalla de entrada de la app principal (solo con servidor): «Iniciar sesión» arriba y «¿No tienes cuenta?» abajo.
 * Se abre desde la portada de la familia y desde la del paseador; es el MISMO camino para las dos.
 */
export function PantallaEntrada({
  cliente,
  onListo,
  onVolver,
  aviso,
  modoInicial,
  rolInicial,
  className,
}: {
  cliente: ClienteAcceso | null
  onListo: () => void
  /** Vuelve a la portada. Sin esto no hay flecha. */
  onVolver?: () => void
  aviso?: string
  modoInicial?: ModoAcceso
  rolInicial?: RolDeRegistro | null
  className?: string
}) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-canvas', className)}>
      <header className="flex items-center gap-3 px-5 pb-1 pt-[max(1rem,env(safe-area-inset-top))]">
        {onVolver ? (
          <button type="button" onClick={onVolver} aria-label="Atrás" className="grid h-11 w-11 place-items-center rounded-full bg-sand text-ink active:scale-95">
            <ArrowLeft size={18} />
          </button>
        ) : (
          <span className="h-11" />
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3">
        {cliente ? (
          <FormularioAcceso cliente={cliente} onListo={onListo} aviso={aviso} modoInicial={modoInicial} rolInicial={rolInicial} />
        ) : (
          <p role="status" className="text-[14px] font-semibold text-ink-soft">
            Un momento…
          </p>
        )}
      </div>
    </div>
  )
}
