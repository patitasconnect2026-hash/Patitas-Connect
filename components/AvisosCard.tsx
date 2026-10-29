'use client'

import { BellRing } from 'lucide-react'
import { useAvisos } from '@/lib/datos'
import { TEXTO_ALERTAS } from '@/lib/avisosTextos'
import { prepararSonido, sonar, vibrar } from '@/lib/avisosSonido'
import { btnInk, btnSoft } from '@/lib/ui'
import { cn } from '@/lib/utils'

/**
 * La primera vez explica los avisos («Activar avisos» / «Ahora no»); después queda solo el interruptor para silenciar.
 * Con el navegador cerrado todavía no hay aviso, y aquí se dice.
 */
export function AvisosCard({ quien }: { quien: 'familia' | 'paseador' }) {
  const [pref, setPref] = useAvisos()
  if (!pref.visto) {
    return (
      <section aria-label={TEXTO_ALERTAS.titulo} className="space-y-2 rounded-2xl bg-forest-50 p-3">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
          <BellRing className="size-4" aria-hidden /> {TEXTO_ALERTAS.titulo}
        </h3>
        <p className="text-[14px] text-ink">{quien === 'familia' ? TEXTO_ALERTAS.apoyoFamilia : TEXTO_ALERTAS.apoyoPaseador}</p>
        <p className="text-[13px] text-ink-soft">{TEXTO_ALERTAS.limite}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              prepararSonido()
              setPref({ visto: true, silenciado: false })
              sonar()
              vibrar()
            }}
            className={cn(btnInk, 'h-11 flex-1 text-[14px]')}
          >
            {TEXTO_ALERTAS.activar}
          </button>
          <button type="button" onClick={() => setPref({ visto: true, silenciado: true })} className={cn(btnSoft, 'h-11 flex-1 text-[14px]')}>
            {TEXTO_ALERTAS.ahoraNo}
          </button>
        </div>
      </section>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-paper/70 px-3 py-1">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-ink">{TEXTO_ALERTAS.interruptor}</span>
        <span className="block text-[13px] text-ink-soft">{pref.silenciado ? TEXTO_ALERTAS.interruptorNo : TEXTO_ALERTAS.interruptorSi}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!pref.silenciado}
        aria-label={TEXTO_ALERTAS.interruptor}
        onClick={() => {
          prepararSonido()
          setPref((p) => ({ ...p, silenciado: !p.silenciado }))
        }}
        className="flex h-11 w-16 shrink-0 items-center justify-center"
      >
        <span className={cn('relative block h-8 w-14 rounded-full transition', pref.silenciado ? 'bg-ink/25' : 'bg-forest')}>
          <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', pref.silenciado ? 'left-1' : 'left-7')} />
        </span>
      </button>
    </div>
  )
}
