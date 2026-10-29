'use client'

import Link from 'next/link'
import { TEXTO_ACCESO } from '@/lib/servidor/acceso'
import { btnInk, btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { LogoMark } from '../ui/Logo'

/**
 * Lo que se ve mientras la app lee la sesión o cuando no pudo comprobar la cuenta. Nunca es la portada: quien tiene
 * sesión (o aún no sabemos si la tiene) no debe ver «Crear mi cuenta».
 */
export function PantallaEspera({ tipo, onReintentar, onSalir }: { tipo: 'cargando' | 'no_se_pudo' | 'cuenta_de_familia'; onReintentar?: () => void; onSalir?: () => void }) {
  if (tipo === 'cargando') {
    return (
      <div role="status" aria-label={TEXTO_ACCESO.espera} className="flex min-h-0 flex-1 items-center justify-center bg-brand-600">
        <LogoMark size={72} tone="cream" />
      </div>
    )
  }
  const familia = tipo === 'cuenta_de_familia'
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center bg-canvas px-6 pb-10">
      <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">{familia ? TEXTO_ACCESO.esDeFamilia : TEXTO_ACCESO.noSePudo}</h1>
      <p className="mt-2 text-[14px] leading-snug text-ink-soft">{familia ? TEXTO_ACCESO.esDeFamiliaApoyo : TEXTO_ACCESO.noSePudoApoyo}</p>
      <div className="mt-5 space-y-2.5">
        {familia && (
          <Link href="/" className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
            {TEXTO_ACCESO.volverALaApp}
          </Link>
        )}
        {onReintentar && (
          <button type="button" onClick={onReintentar} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
            {TEXTO_ACCESO.reintentar}
          </button>
        )}
        {onSalir && (
          <button type="button" onClick={onSalir} className={cn(btnInk, 'h-12 w-full text-[14.5px]')}>
            {TEXTO_ACCESO.salir}
          </button>
        )}
      </div>
    </div>
  )
}
