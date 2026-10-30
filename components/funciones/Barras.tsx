'use client'

import { motion } from 'framer-motion'
import { acotar, lecturaBarra, tonoBarra, type Atributo } from '@/lib/calificacionDetallada'
import { cn } from '@/lib/utils'

const TONO = {
  bien: 'bg-forest',
  atencion: 'bg-red-600',
  neutro: 'bg-vino',
} as const

/** Una barra de 0 a 100 que se llena al aparecer. El estado no va solo en color: dice el número y una palabra. */
export function BarraAtributo({ atributo, valor, comparar, etiquetaComparar = 'Ficha' }: { atributo: Atributo; valor: number; comparar?: number; etiquetaComparar?: string }) {
  const v = acotar(valor)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-extrabold text-ink">{atributo.nombre}</span>
        <span className="text-[14px] font-bold tabular-nums text-ink-soft">
          {v} % · {lecturaBarra(atributo, v)}
        </span>
      </div>
      <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-ink/10" role="img" aria-label={`${atributo.nombre}: ${v} de 100`}>
        <motion.span
          className={cn('absolute inset-y-0 left-0 rounded-full', TONO[tonoBarra(atributo, v)])}
          initial={{ width: 0 }}
          whileInView={{ width: `${v}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {comparar !== undefined && (
          <span className="absolute inset-y-[-2px] w-1 rounded-full bg-ink" style={{ left: `calc(${acotar(comparar)}% - 2px)` }} aria-hidden />
        )}
      </div>
      {comparar !== undefined && (
        <p className="mt-1 text-[12px] font-semibold text-ink-soft">
          {etiquetaComparar}: {acotar(comparar)} %
        </p>
      )}
    </div>
  )
}

/** Deslizador de 0 a 100 con la barra viva debajo. Se mueve con el dedo o con las flechas del teclado. */
export function DeslizadorAtributo({ atributo, valor, onChange, marca }: { atributo: Atributo; valor: number; onChange: (n: number) => void; marca?: number }) {
  const v = acotar(valor)
  const id = `barra-${atributo.id}`
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[14px] font-extrabold text-ink">
          {atributo.nombre}
        </label>
        <span className="text-[14px] font-bold tabular-nums text-ink-soft" aria-live="polite">
          {v} %
        </span>
      </div>
      <div className="relative mt-1">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${v} %, ${lecturaBarra(atributo, v)}`}
          className="barra-deslizador h-11 w-full cursor-pointer appearance-none bg-transparent"
          style={{ ['--relleno' as string]: `${v}%` }}
        />
        {marca !== undefined && (
          <span
            className="pointer-events-none absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-ink/60"
            style={{ left: `calc(${acotar(marca)}% - 2px)` }}
            title={`Ficha: ${acotar(marca)} %`}
            aria-hidden
          />
        )}
      </div>
      <div className="flex justify-between text-[12px] font-semibold text-ink-soft">
        <span>{atributo.bajo}</span>
        <span>{atributo.alto}</span>
      </div>
    </div>
  )
}
