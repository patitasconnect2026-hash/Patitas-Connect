'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ChevronsRight, CircleCheck, PawPrint, X } from 'lucide-react'
import type { FotoPaseo } from '@/lib/fotos'
import type { Walk } from '@/lib/types'
import { NOMBRE_APP, NOMBRE_CORTO } from '@/lib/config'
import { textoPagaYMuestra } from '@/lib/pagosTextos'
import { btnInk, btnPrimary } from '@/lib/ui'
import { cn, soles } from '@/lib/utils'
import { DogAvatar } from './ui/Dog'
import { FotosPaseo } from './FotosPaseo'
import { ReviewForm } from './ReviewsSheet'
import { Sheet } from './ui/Sheet'

/** Control "desliza para confirmar". También funciona con teclado (Enter/Espacio). */
function SlideToConfirm({ label, onComplete }: { label: string; onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [max, setMax] = useState(0)
  const x = useMotionValue(0)
  const fade = useTransform(x, [0, Math.max(max, 1) * 0.6], [1, 0])
  const fill = useTransform(x, (v) => v + 56)
  const HANDLE = 56

  useLayoutEffect(() => {
    const measure = () => setMax(Math.max(0, (trackRef.current?.offsetWidth ?? 0) - HANDLE - 8))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const complete = () => {
    animate(x, max, { duration: 0.2 })
    setTimeout(onComplete, 220)
  }

  return (
    <div ref={trackRef} className="relative h-16 select-none overflow-hidden rounded-full bg-forest-50 p-1 ring-2 ring-forest/25">
      <motion.div className="absolute inset-y-1 left-1 rounded-full bg-forest/25" style={{ width: fill }} />
      <motion.span style={{ opacity: fade }} className="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-[15px] font-extrabold text-forest">
        {label}
      </motion.span>
      <motion.button
        type="button"
        drag="x"
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0}
        dragMomentum={false}
        style={{ x, width: HANDLE, height: HANDLE }}
        onDragEnd={() => {
          if (x.get() > max * 0.82) complete()
          else animate(x, 0, { type: 'spring', stiffness: 500, damping: 34 })
        }}
        onClick={(e) => {
          // Los clics por teclado (Enter/Espacio) llegan con detail === 0
          if (e.detail === 0) complete()
        }}
        aria-label={label}
        className="relative grid cursor-grab place-items-center rounded-full bg-forest text-white shadow-lg active:cursor-grabbing"
      >
        <ChevronsRight size={26} strokeWidth={2.6} />
      </motion.button>
    </div>
  )
}

export function ConfirmSheet({
  walk,
  reviewed,
  fotos,
  jobId,
  entregaConfirmada,
  onConfirm,
  onRate,
  onReview,
  onClose,
}: {
  walk: Walk
  reviewed: boolean
  /** Las fotos reales de ESTE paseo (con su hora y su lugar). */
  fotos: FotoPaseo[]
  /** El paseo (encargo): de aquí sale el código de las fotos. */
  jobId: string
  /** El dueño ya tocó «Recibí a [perro]» (el paseo se cierra). */
  entregaConfirmada: boolean
  onConfirm: () => void
  onRate: (n: number) => void
  onReview: (r: { rating: number; text: string; tags: string[] }) => void
  onClose: () => void
}) {
  const { booking: b } = walk
  const done = walk.phase === 'completed'

  return (
    <Sheet label="Confirmar entrega" onClose={onClose} full={done && !reviewed}>
      <div className="flex justify-end px-5 pt-2">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      {entregaConfirmada && !done ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 text-center">
          <div className="mx-auto w-24">
            <DogAvatar dog={b.dog} className="h-24 w-24 rounded-full ring-4 ring-forest/20" />
          </div>
          <h2 className="mt-4 font-display text-[30px] font-bold leading-[1.05] text-ink">Recibiste a {b.dog.name}</h2>
          <p className="mx-auto mt-2 max-w-[310px] text-[14px] leading-relaxed text-ink-soft">Ya lo registramos. El paseo se cierra.</p>
          <button type="button" onClick={onClose} className={cn(btnInk, 'mt-4 h-14 w-full text-[16px]')}>
            <CircleCheck size={19} /> Listo
          </button>
        </div>
      ) : !done ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 text-center">
          <div className="mx-auto w-24">
            <DogAvatar dog={b.dog} className="h-24 w-24 rounded-full ring-4 ring-forest/20" />
          </div>
          <h2 className="mt-4 font-display text-[30px] font-bold leading-[1.05] text-ink">¿Recibiste a {b.dog.name}?</h2>
          <p className="mx-auto mt-2 max-w-[310px] text-[14px] leading-relaxed text-ink-soft">
            Registras que {b.dog.name} llegó bien. Si algo no está bien, repórtalo.
          </p>

          {jobId && <FotosPaseo fotos={fotos} perro={b.dog.name} jobId={jobId} compacto className="mt-4 text-left" />}

          <dl className="mt-4 space-y-2 rounded-3xl bg-sand p-4 text-left text-[14px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Precio del paseo</dt>
              <dd className="font-display text-[17px] font-bold text-forest">{soles(b.walkPrice)}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <SlideToConfirm label={`Desliza: recibí a ${b.dog.name}`} onComplete={onConfirm} />
          </div>
          <button type="button" onClick={onConfirm} className="mt-2 min-h-11 w-full rounded-full text-[14px] font-extrabold text-forest underline underline-offset-4 active:scale-95">
            O confirma con un toque
          </button>
          <button type="button" onClick={onClose} className="h-11 w-full rounded-full text-[14px] font-bold text-ink-soft active:scale-95">
            Aún no
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 14 }}
            className="relative mx-auto grid h-24 w-24 place-items-center rounded-full bg-forest text-white"
          >
            <PawPrint size={42} strokeWidth={2.3} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-gold"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 74, y: Math.sin((i / 6) * Math.PI * 2) * 74, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
                transition={{ delay: 0.25, duration: 0.9, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
          <h2 className="mt-5 font-display text-[32px] font-bold leading-tight text-ink">Paseo cerrado</h2>
          <p className="mx-auto mt-1.5 max-w-[300px] text-[14px] leading-relaxed text-ink-soft">{b.dog.name} llegó bien.</p>
          <p className="mx-auto mt-1 max-w-[300px] text-[14.5px] font-extrabold leading-snug text-ink">{textoPagaYMuestra(b.walker.firstName)}</p>
          <button type="button" onClick={onClose} className={cn(btnPrimary, 'mt-4 h-14 w-full text-[16px]')}>
            Paga a {NOMBRE_CORTO}
          </button>

          <div className="mt-5">
            {reviewed ? (
              <p className="flex items-center justify-center gap-2 rounded-2xl bg-forest-50 p-3.5 text-[14px] font-extrabold text-forest">
                <CircleCheck size={18} /> Tu reseña ya está publicada
              </p>
            ) : (
              <ReviewForm dogName={b.dog.name} rating={walk.rating} onRating={onRate} onSubmit={onReview} />
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-bold text-forest">
            <PawPrint size={15} /> Paseo registrado en {NOMBRE_APP}
          </div>

          <button type="button" onClick={onClose} className={cn(btnInk, 'mt-5 h-14 w-full text-[16px]')}>
            <CircleCheck size={19} /> Listo
          </button>
        </div>
      )}
    </Sheet>
  )
}
