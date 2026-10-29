'use client'

import { useRef, useState } from 'react'
import { TEXTO_BORRAR, type ResultadoBorrado } from '@/lib/servidor/cuenta'
import { btnRed } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Sheet } from '../ui/Sheet'
import { VerMas } from '../ui/VerMas'

/**
 * «¿Borrar tu cuenta?» con servidor: la familia y el paseador usan la misma hoja. Un doble toque no lo pide dos veces y,
 * si la base se niega (paseo en marcha, reporte abierto o pago pendiente), dice por qué y no se borra nada. Si se borró,
 * la sesión deja de existir y la app vuelve sola a la portada: aquí no hay nada más que mostrar.
 */
export function BorrarCuentaSheet({ rol, onBorrar, onClose }: { rol: 'familia' | 'paseador'; onBorrar: () => Promise<ResultadoBorrado>; onClose: () => void }) {
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState('')
  const enCurso = useRef(false)

  const borrar = async () => {
    if (enCurso.current) return
    enCurso.current = true
    setBorrando(true)
    setError('')
    const r = await onBorrar()
    if (!r.ok) {
      setError(r.mensaje)
      setBorrando(false)
      enCurso.current = false
    }
  }

  return (
    <Sheet label="Borrar mi cuenta" onClose={borrando ? () => undefined : onClose}>
      <div className="space-y-4 px-5 pb-6 pt-4">
        <h2 className="font-display text-[26px] font-bold leading-tight text-ink">{TEXTO_BORRAR.titulo}</h2>
        <p className="text-[14px] font-semibold leading-relaxed text-ink">{TEXTO_BORRAR.resumen}</p>
        <VerMas>{rol === 'familia' ? TEXTO_BORRAR.masFamilia : TEXTO_BORRAR.masPaseador}</VerMas>
        <p className="text-[14px] leading-snug text-ink-soft">{TEXTO_BORRAR.condiciones}</p>
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-3.5 text-[14px] font-semibold leading-snug text-red-800">
            {error}
          </p>
        )}
        <button type="button" onClick={borrar} disabled={borrando} aria-busy={borrando} className={cn(btnRed, 'h-14 w-full text-[15.5px] disabled:opacity-60')}>
          {borrando ? TEXTO_BORRAR.borrando : TEXTO_BORRAR.boton}
        </button>
        <button type="button" onClick={onClose} disabled={borrando} className="h-12 w-full text-[14px] font-bold text-ink-soft disabled:opacity-60">
          {TEXTO_BORRAR.cancelar}
        </button>
      </div>
    </Sheet>
  )
}
