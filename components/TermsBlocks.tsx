'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ScrollText } from 'lucide-react'
import type { TermsBlock } from '@/lib/legal'
import { cn } from '@/lib/utils'

/**
 * Términos en bloques cortos: cada bloque dice en una frase qué se acepta y se marca por separado.
 * El texto completo se despliega. Así nadie puede decir que no entendió.
 */
export function TermsBlocks({
  blocks,
  value,
  onChange,
}: {
  blocks: TermsBlock[]
  value: Record<string, boolean>
  onChange: (v: Record<string, boolean>) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const done = blocks.filter((b) => value[b.id]).length
  const all = done === blocks.length

  return (
    <div>
      <p className="mb-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[14px] font-semibold leading-snug text-amber-900">
        Borrador del piloto: todavía no lo revisa un abogado.
      </p>
      <div className="flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
        <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
          <ScrollText size={16} className="text-brand-700" />
          {done} de {blocks.length} aceptados
        </p>
        <button
          type="button"
          onClick={() => onChange(Object.fromEntries(blocks.map((b) => [b.id, !all])))}
          className="min-h-11 text-[14px] font-extrabold text-brand-700 underline underline-offset-4"
        >
          {all ? 'Quitar todos' : 'Aceptar todos'}
        </button>
      </div>

      <ul className="mt-3 space-y-2.5">
        {blocks.map((b) => {
          const on = !!value[b.id]
          const expanded = open === b.id
          return (
            <li key={b.id} className={cn('rounded-2xl border-2 bg-paper transition-colors', on ? 'border-forest/60' : 'border-ink/10')}>
              <div className="flex items-start gap-3 p-3.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={b.title}
                  onClick={() => onChange({ ...value, [b.id]: !on })}
                  // Zona táctil de 44 px; la casilla que se ve mide 28 px y queda centrada.
                  className="-ml-2 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center"
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 place-items-center rounded-lg border-2 transition',
                      on ? 'border-forest bg-forest text-white' : 'border-ink/25 bg-paper',
                    )}
                  >
                    {on && <Check size={17} strokeWidth={3.5} />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-extrabold leading-snug text-ink">{b.title}</p>
                  <p className="mt-1 text-[14px] leading-snug text-ink-soft">{b.summary}</p>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : b.id)}
                    aria-expanded={expanded}
                    className="min-h-11 mt-2 flex items-center gap-1 text-[14px] font-extrabold text-brand-700"
                  >
                    Leer el texto completo <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
                  </button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-ink/10 px-4 text-[12.5px] leading-relaxed text-ink-soft"
                  >
                    <span className="block py-3">{b.full}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-900">
        Borrador de demostración: un abogado debe revisar estos textos antes de usarlos con personas reales.
      </p>
    </div>
  )
}
