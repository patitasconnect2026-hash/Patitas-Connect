'use client'

import { TEXTO_EJEMPLOS } from '@/lib/ejemplos'
import { cn } from '@/lib/utils'

/** «Mostrar ejemplos»: muestra u oculta los paseadores, reseñas y paseos inventados. */
export function InterruptorEjemplos({ activo, onChange, className }: { activo: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className={cn('min-h-11 flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-left active:scale-[0.99]', className)}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-ink">{TEXTO_EJEMPLOS.interruptor}</span>
        <span className="block text-[14px] leading-snug text-ink-soft">{TEXTO_EJEMPLOS.apoyo}</span>
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', activo ? 'bg-forest' : 'bg-ink/15')}>
        <span className={cn('absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', activo && 'translate-x-5')} />
      </span>
    </button>
  )
}
