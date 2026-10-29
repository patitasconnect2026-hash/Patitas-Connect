'use client'

import { useEffect, useState } from 'react'
import { Info, RefreshCw, WifiOff } from 'lucide-react'
import { useEstadoServidor, type EstadoServidor } from '@/lib/datos'
import { TEXTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { cn } from '@/lib/utils'

/**
 * Lo que se ve cuando los paseos viven en el servidor y algo no sale: no hay internet (lo que la persona hizo se queda
 * en la pantalla y se envía solo al volver) o la base dijo que NO a un cambio (ya se mostró lo que dice la base).
 * Fuera del servidor no aparece nunca.
 */
export function AvisoDeServidorVista({
  conexion,
  pendientes = false,
  rechazo,
  onReintentar,
  onCerrar,
  className,
}: {
  conexion: EstadoServidor['conexion']
  /** Hay cambios que esperan internet: se dice que se envían solos. Si no, solo que se sigue intentando. */
  pendientes?: boolean
  rechazo: string | null
  onReintentar: () => void
  onCerrar: () => void
  className?: string
}) {
  if (conexion === 'conectado' && !rechazo) return null
  return (
    <div className={cn('shrink-0 space-y-2 px-4 pb-1 pt-2', className)} role="status" aria-live="polite">
      {conexion === 'sin_conexion' && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-300/60">
          <WifiOff size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold leading-snug">{TEXTO_SERVIDOR.sinConexion}</p>
            <p className="text-[14px] leading-snug">{pendientes ? TEXTO_SERVIDOR.sinConexionApoyo : TEXTO_SERVIDOR.noCargoApoyo}</p>
            <button type="button" onClick={onReintentar} className="mt-1 flex min-h-11 items-center gap-1.5 rounded-full bg-amber-600 px-4 text-[14px] font-extrabold text-white active:scale-95">
              <RefreshCw size={15} /> {TEXTO_SERVIDOR.reintentar}
            </button>
          </div>
        </div>
      )}
      {conexion === 'conectando' && (
        <p className="flex items-center gap-2 rounded-2xl bg-sand p-3 text-[14px] font-semibold text-ink">
          <RefreshCw size={15} className="shrink-0 animate-spin motion-reduce:animate-none" /> {TEXTO_SERVIDOR.conectando}
        </p>
      )}
      {rechazo && (
        <div className="flex items-start gap-3 rounded-2xl bg-sand p-3 text-ink ring-1 ring-ink/10">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-snug">{rechazo}</p>
            <button type="button" onClick={onCerrar} className="mt-1 min-h-11 rounded-full bg-ink px-4 text-[14px] font-extrabold text-white active:scale-95">
              {TEXTO_SERVIDOR.entendido}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Con los datos del servidor. «Conectando» solo se muestra si tarda (así no parpadea al abrir). */
export function AvisoDeServidor({ className }: { className?: string }) {
  const { conexion, pendientes, rechazo, cerrarRechazo, reintentar } = useEstadoServidor()
  const [tarda, setTarda] = useState(false)
  useEffect(() => {
    if (conexion !== 'conectando') return
    const t = setTimeout(() => setTarda(true), 1800)
    return () => clearTimeout(t)
  }, [conexion])
  const visible = conexion === 'conectando' && !tarda ? 'conectado' : conexion
  return <AvisoDeServidorVista conexion={visible} pendientes={pendientes} rechazo={rechazo} onReintentar={reintentar} onCerrar={cerrarRechazo} className={className} />
}
