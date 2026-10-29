'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Clock, Dog as DogIcon, Heart, IdCard, MapPin, PawPrint, Star } from 'lucide-react'
import { dayInfo, hourLabel, nextSlot, openToday, SIZE_INFO, walkerFits } from '@/lib/schedule'
import type { Dog, Size, Walker } from '@/lib/types'
import { btnPrimary } from '@/lib/ui'
import { cn, plural } from '@/lib/utils'
import { tieneCalificacion } from '@/lib/calificacion'
import { comprobacionesMarcadas, REGLA_NUEVO } from '@/lib/verificacion'
import { SelloPaseador } from './ui/Logo'
import { TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { PortraitAvatar } from './ui/PortraitAvatar'


function Capacity({ current, max }: { current: number; max: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'grid h-6 w-6 place-items-center rounded-full',
            i < current ? 'bg-brand-700 text-white' : 'border border-dashed border-ink/25 text-ink/25',
          )}
        >
          <PawPrint size={12} strokeWidth={2.4} />
        </span>
      ))}
    </span>
  )
}

function SizeChips({ sizes }: { sizes: Size[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {(['small', 'medium', 'large'] as Size[]).map((s, i) => {
        const on = sizes.includes(s)
        return (
          <span
            key={s}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold',
              on ? 'bg-ink text-white' : 'bg-ink/5 text-ink-soft line-through decoration-ink/30',
            )}
          >
            <DogIcon size={11 + i * 2} /> {SIZE_INFO[s].label}
          </span>
        )
      })}
    </span>
  )
}

export function WalkerCard({
  walker,
  index,
  dog,
  fav,
  onFav,
  onDni,
  onBook,
  onReviews,
}: {
  walker: Walker
  index: number
  dog: Dog | null
  fav: boolean
  onFav: (w: Walker) => void
  onDni: (w: Walker) => void
  onBook: (w: Walker) => void
  onReviews: (w: Walker) => void
}) {
  const [open, setOpen] = useState(false)
  const fits = walkerFits(walker, dog)
  const next = fits ? nextSlot(walker, dog) : null
  const today = fits ? openToday(walker, dog) : 0
  const review = walker.reviews[0]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, delay: Math.min(index, 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={cn('overflow-hidden rounded-3xl border border-ink/10 bg-paper p-4 shadow-card', !fits && 'opacity-80')}
    >
      <div className="flex gap-4">
        <div className="relative shrink-0 self-start">
          <PortraitAvatar
            portrait={walker.portrait}
            photo={walker.photo}
            alt={`Foto de ${walker.name}`}
            className="h-[112px] w-[88px] rounded-t-[44px] rounded-b-2xl border border-ink/10"
          />
          <SelloPaseador comprobaciones={walker.comprobaciones} size={34} className="absolute -bottom-2 -right-2 drop-shadow" />
          <button
            type="button"
            onClick={() => onFav(walker)}
            aria-pressed={fav}
            aria-label={fav ? `Quitar a ${walker.firstName} de favoritos` : `Guardar a ${walker.firstName} en favoritos`}
            className="absolute -left-2 -top-2 grid h-11 w-11 place-items-center rounded-full bg-paper shadow-card ring-1 ring-ink/10 transition active:scale-90"
          >
            <Heart size={17} className={cn('transition-colors', fav ? 'fill-red-500 text-red-500' : 'text-ink-soft')} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-[23px] font-bold leading-[1.05] text-ink">{walker.name}</h3>
              {walker.esEjemplo && <EtiquetaEjemplo className="mt-1.5" />}
            </div>
            <div className="shrink-0 text-right leading-none">
              <span className="font-display text-[24px] font-bold text-ink">S/{walker.pricePerHour}</span>
              <span className="block text-[12px] font-semibold text-ink-soft">por hora</span>
            </div>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[14px] font-bold text-forest">
            <MapPin size={13} /> {walker.neighbor}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{walker.tagline}</p>
          <p className={cn('mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-extrabold', walker.disponible === false ? 'bg-ink/10 text-ink-soft' : 'bg-forest-50 text-forest')}>
            <span aria-hidden className={cn('h-2 w-2 rounded-full', walker.disponible === false ? 'bg-ink/40' : 'bg-forest')} />
            {walker.disponible === false ? TEXTO_RESERVAS.noDisponible : TEXTO_RESERVAS.disponibleAhora}
          </p>
          {walker.probation && (
            <p className="mt-1.5 inline-block rounded-full bg-gold/20 px-2.5 py-1 text-[12px] font-extrabold text-brand-800">{REGLA_NUEVO.etiqueta}</p>
          )}
          <button
            type="button"
            onClick={() => onReviews(walker)}
            className="min-h-11 mt-2 flex items-center gap-1.5 text-[14px] font-bold text-ink"
            aria-label={`Ver reseñas de ${walker.name}`}
          >
            <Star size={14} className={cn(!tieneCalificacion(walker) ? 'text-ink-soft' : 'fill-gold text-gold')} />
            {!tieneCalificacion(walker) ? (
              <span className="font-semibold text-ink-soft">Aún sin reseñas</span>
            ) : (
              <>
                {walker.rating.toFixed(1)}
                <span className="font-semibold text-ink-soft underline underline-offset-2">
                  {walker.deServidor ? plural(walker.resenasN ?? 0, 'reseña', 'reseñas') : plural(walker.walks, 'paseo', 'paseos')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {walker.bio && <p className="mt-3.5 font-display text-[14.5px] italic leading-snug text-ink">“{walker.bio.length > 120 ? walker.bio.slice(0, 117).trimEnd() + '…' : walker.bio}”</p>}

      {walker.includes.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow text-ink-soft">Su paseo incluye</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {walker.includes.slice(0, 4).map((i) => (
              <span key={i} className="rounded-full bg-forest-50 px-2.5 py-1 text-[12px] font-bold text-forest">
                {i}
              </span>
            ))}
            {walker.includes.length > 4 && <span className="rounded-full bg-sand px-2.5 py-1 text-[12px] font-bold text-ink-soft">+{walker.includes.length - 4}</span>}
          </div>
        </div>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {comprobacionesMarcadas(walker.comprobaciones ?? []).map((c) => c.titulo).map((c) => (
          <li key={c} className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-forest text-white">
              <Check size={10} strokeWidth={4} />
            </span>
            {c}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onDni(walker)}
        className="min-h-11 mt-3 flex w-full items-center gap-2.5 rounded-2xl border border-ink/10 px-3 py-2.5 text-left active:scale-[0.99]"
      >
        <IdCard size={18} className="shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-soft">
          DNI <b className="tabular-nums text-ink">••••{walker.dni.slice(-4)}</b> · {walker.code}
        </span>
        <span className="text-[12px] font-extrabold text-brand-700 underline underline-offset-2">Cómo comprobarlo</span>
      </button>

      {/* Horarios y cupo, calculados para el tamaño de TU perro */}
      <div className="mt-4 rounded-2xl bg-sand p-3.5">
        {dog && !fits ? (
          <>
            <p className="text-[14px] font-extrabold text-ink">
              {dog.rpp ? 'Por ahora no atendemos razas potencialmente peligrosas.' : `${walker.firstName} no pasea perros ${SIZE_INFO[dog.size].plural}`}
            </p>
            <p className="mt-1 text-[14px] leading-snug text-ink-soft">Pasea:</p>
            <div className="mt-1.5">
              <SizeChips sizes={walker.accepts} />
            </div>
          </>
        ) : next ? (
          <>
            <p className="eyebrow text-ink-soft">{dog ? `Próximo horario para ${dog.name}` : 'Próximo horario'}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 font-display text-[19px] font-bold text-ink">
                <Clock size={17} className="text-brand-700" />
                {dayInfo(next.dayIdx).label} · {hourLabel(next.hour)}
              </p>
              <Capacity current={next.info.dogs + (dog ? 1 : 0)} max={walker.maxDogs} />
            </div>
            <p className="mt-1 text-[14px] leading-snug text-ink-soft">
              {next.info.dogs === 0
                ? `Grupo nuevo · máx. ${plural(walker.maxDogs, 'perro', 'perros')} por paseo`
                : `Se une a un grupo de ${next.info.dogs} perro${next.info.dogs > 1 ? 's' : ''} ${SIZE_INFO[next.info.size].plural}`}
              {today > 0 ? ` · ${plural(today, 'horario libre', 'horarios libres')} hoy` : ''}
            </p>
          </>
        ) : (
          <p className="text-[14px] font-bold text-ink-soft">Sin horarios compatibles esta semana.</p>
        )}
        {!dog && (
          <div className="mt-2.5">
            <SizeChips sizes={walker.accepts} />
          </div>
        )}
      </div>

      {review && (
        <figure className="mt-3.5">
          <blockquote className="font-display text-[15px] italic leading-snug text-ink">“{review.text}”</blockquote>
          <figcaption className="mt-1.5 flex items-center justify-between text-[12px] font-semibold text-ink-soft">
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {review.district ? `${review.author} · ${review.district}` : review.author}
              {review.esEjemplo && <EtiquetaEjemplo />}
            </span>
            <button type="button" onClick={() => onReviews(walker)} className="min-h-11 font-extrabold text-brand-700 underline underline-offset-2">
              {walker.reviews.length === 1 ? 'Ver la reseña' : `Ver las ${walker.reviews.length} reseñas`}
            </button>
          </figcaption>
        </figure>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="min-h-11 mt-3 flex w-full items-center justify-between border-t border-ink/10 pt-3 text-[14px] font-extrabold text-ink-soft"
      >
        Sobre {walker.firstName}
        <ChevronDown size={18} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-1 pt-3">
              <p className="text-[14px] leading-relaxed text-ink-soft">{walker.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {walker.extras.map((e) => (
                  <span key={e} className="rounded-full bg-brand-50 px-3 py-1.5 text-[12px] font-bold text-brand-800 ring-1 ring-brand-200">
                    {e}
                  </span>
                ))}
                {walker.responds && <span className="rounded-full bg-sand px-3 py-1.5 text-[12px] font-bold text-ink-soft">Responde {walker.responds}</span>}
                {walker.experience && <span className="rounded-full bg-sand px-3 py-1.5 text-[12px] font-bold text-ink-soft">{walker.experience} de experiencia</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => onBook(walker)}
        disabled={!fits}
        className={cn(btnPrimary, 'mt-3 h-[52px] w-full text-[15.5px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
      >
        {fits ? (
          <>
            Ver horarios con {walker.firstName}
            <ArrowRight size={18} strokeWidth={2.6} />
          </>
        ) : (
          'No compatible con tu perro'
        )}
      </button>
    </motion.article>
  )
}
