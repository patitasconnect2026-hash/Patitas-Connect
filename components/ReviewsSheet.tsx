'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, Check, PenLine, Star, X } from 'lucide-react'
import { tieneCalificacion } from '@/lib/calificacion'
import { REVIEW_TAGS } from '@/lib/data'
import type { Review, Walker } from '@/lib/types'
import { btnPrimary, inputBase } from '@/lib/ui'
import { cn, plural } from '@/lib/utils'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { PortraitAvatar } from './ui/PortraitAvatar'
import { Sheet } from './ui/Sheet'
import { Stars } from './ui/Stars'

/** Formulario de reseña: estrellas, etiquetas rápidas y comentario. */
export function ReviewForm({
  dogName,
  rating,
  onRating,
  onSubmit,
}: {
  dogName: string
  rating: number
  onRating: (n: number) => void
  onSubmit: (r: { rating: number; text: string; tags: string[] }) => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl bg-forest-50 p-5 text-center ring-1 ring-forest/20"
      >
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-forest text-white">
          <Check size={22} strokeWidth={3} />
        </span>
        <p className="mt-2.5 font-display text-[20px] font-bold text-ink">¡Gracias por tu reseña!</p>
        <p className="mt-0.5 text-[14px] text-ink-soft">Ayuda a otros vecinos a elegir con confianza.</p>
      </motion.div>
    )
  }

  return (
    <div className="rounded-3xl bg-sand p-4 text-left">
      <p className="font-display text-[19px] font-bold leading-tight text-ink">¿Cómo le fue a {dogName}?</p>
      <div className="mt-2.5 flex justify-center gap-1" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={plural(n, 'estrella', 'estrellas')}
            onClick={() => onRating(n)}
            className="min-h-11 p-1.5 transition active:scale-90"
          >
            <Star size={34} strokeWidth={1.6} className={cn('transition-colors', n <= rating ? 'fill-gold text-gold' : 'fill-ink/5 text-ink-soft')} />
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {REVIEW_TAGS.map((t) => {
          const on = tags.includes(t)
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
              className={cn(
                'min-h-11 rounded-full border px-3 py-1.5 text-[14px] font-bold transition active:scale-95',
                on ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink-soft',
              )}
            >
              {t}
            </button>
          )
        })}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={280}
        placeholder="Cuéntales a otros vecinos cómo fue (opcional)"
        className={cn(inputBase, 'mt-3 h-auto resize-none py-3 leading-snug')}
      />
      <button
        type="button"
        disabled={rating < 1}
        onClick={() => {
          onSubmit({ rating, text: text.trim(), tags })
          setSent(true)
        }}
        className={cn(btnPrimary, 'mt-3 h-12 w-full text-[15px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
      >
        <PenLine size={17} /> {rating < 1 ? 'Elige las estrellas' : 'Publicar reseña'}
      </button>
    </div>
  )
}

export function ReviewsSheet({
  walker,
  mine,
  canReview,
  dogName,
  onReview,
  onClose,
}: {
  walker: Walker
  mine: Review[]
  /** Completó un paseo con este paseador y aún no escribió reseña */
  canReview: boolean
  dogName: string
  onReview: (r: { rating: number; text: string; tags: string[] }) => void
  onClose: () => void
}) {
  const [rating, setRating] = useState(0)
  const all = useMemo(() => [...mine, ...walker.reviews], [mine, walker.reviews])
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of all) for (const t of r.tags) m.set(t, (m.get(t) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [all])

  return (
    <Sheet label={`Reseñas de ${walker.name}`} onClose={onClose} full>
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
        <div className="flex items-center gap-3.5">
          <PortraitAvatar portrait={walker.portrait} photo={walker.photo} alt={walker.name} className="h-[68px] w-14 rounded-t-3xl rounded-b-xl" />
          <div>
            <h2 className="font-display text-[25px] font-bold leading-none text-ink">{walker.name}</h2>
            {walker.esEjemplo && <EtiquetaEjemplo className="mt-1.5" />}
            {!tieneCalificacion(walker) ? (
              // Sin calificación inventada: la calificación solo existe con reseñas de verdad.
              <p className="mt-1.5 text-[14px] font-semibold text-ink-soft">Aún sin reseñas</p>
            ) : (
              <>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="font-display text-[26px] font-bold leading-none text-ink">{walker.rating.toFixed(1)}</span>
                  <Stars value={walker.rating} size={15} />
                </div>
                <p className="mt-0.5 text-[14px] font-semibold text-ink-soft">
                  {walker.deServidor ? plural(walker.resenasN ?? 0, 'reseña', 'reseñas') : plural(walker.walks, 'paseo completado', 'paseos completados')}
                </p>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-ink/10 px-5 pb-6 pt-5">
        <p className="flex items-start gap-2 rounded-2xl bg-forest-50 p-3 text-[14px] leading-snug text-forest">
          <BadgeCheck size={16} className="mt-0.5 shrink-0" />
          Solo pueden reseñar los dueños que completaron un paseo.
        </p>

        {canReview && (
          <div className="mt-4">
            <ReviewForm dogName={dogName} rating={rating} onRating={setRating} onSubmit={onReview} />
          </div>
        )}

        {tagCounts.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {tagCounts.map(([t, n]) => (
              <span key={t} className="rounded-full border border-ink/12 px-3 py-1.5 text-[12px] font-bold text-ink-soft">
                {t} <span className="text-ink-soft">{n}</span>
              </span>
            ))}
          </div>
        )}

        <ul className="mt-5 space-y-4">
          {all.map((r) => (
            <li key={r.id} className={cn('rounded-3xl border p-4', r.mine ? 'border-brand-300 bg-brand-50' : 'border-ink/10 bg-paper')}>
              <div className="flex items-center justify-between">
                <Stars value={r.rating} size={14} />
                <span className="text-[12px] font-semibold text-ink-soft">{r.when}</span>
              </div>
              {r.text && <p className="mt-2 font-display text-[16px] italic leading-snug text-ink">“{r.text}”</p>}
              {r.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {r.tags.map((t) => (
                    <span key={t} className="rounded-full bg-sand px-2.5 py-1 text-[12px] font-bold text-ink-soft">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-bold text-ink-soft">
                {r.mine ? 'Tu reseña' : r.district ? `${r.author} · ${r.district}` : r.author}
                {r.esEjemplo && <EtiquetaEjemplo />}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}
