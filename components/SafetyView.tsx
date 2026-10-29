'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Camera, ChevronDown, LifeBuoy, MapPin, PawPrint, ShieldAlert, UserCheck, Users, Wallet } from 'lucide-react'
import { etiquetaAyuda, NOMBRE_APP, NOMBRE_CORTO, TEXTOS_PAGO } from '@/lib/config'
import { AyudaContactos } from './SosPanel'
import { masPagoDueno } from '@/lib/pagosTextos'
import { btnInk, btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { TEXTO_ALGO_PASA } from '@/lib/equipoTextos'
import { COMPROBACIONES, MAX_PERROS_POR_PASEO, REGLA_NUEVO, reglaNuevoDueno, textoCantidadComprobaciones } from '@/lib/verificacion'
import { Seal } from './ui/Logo'
import { VerMas } from './ui/VerMas'

const RULES = [
  { n: String(MAX_PERROS_POR_PASEO), title: 'perros como máximo', text: 'Nunca más. Con menos perros, más atención a cada uno.' },
  { n: '=', title: 'mismo tamaño siempre', text: 'Pequeños con pequeños, grandes con grandes. Nadie arrastra a nadie.' },
  { n: '§', title: 'razas peligrosas', text: 'Por ahora no las atendemos.' },
  { n: '📍', title: 'check-in y check-out', text: 'Foto y hora al recoger y al entregar, con portería si tu edificio tiene.' },
]

const FAQ: Array<{ q: string; a: string; mas?: string }> = [
  {
    q: '¿Cuándo se paga?',
    a: 'Antes del paseo: pagas y el equipo lo verifica a mano.',
    mas: masPagoDueno(),
  },
  {
    q: '¿Y si algo sale mal?',
    a: 'Toca SOS: te decimos qué hacer y a quién llamar.',
    mas: `La app no llama sola: tú tocas el botón. El serenazgo y ${NOMBRE_CORTO} aparecen cuando estén configurados.`,
  },
  {
    q: '¿Cómo veo dónde está mi perro?',
    a: 'Con puntos de control: foto y lugar al empezar, al terminar y en cada foto.',
    mas: 'El seguimiento es por puntos de control con foto. No es continuo: con la pantalla apagada el teléfono no sigue la ubicación. La hora y el lugar los pone el teléfono y se pueden alterar. Hoy solo te llegan si usan el mismo navegador.',
  },
  {
    q: '¿Por qué el mismo tamaño?',
    a: 'Uno grande puede lastimar a uno pequeño.',
    mas: 'Cada horario muestra el tamaño del grupo.',
  },
  {
    q: '¿Mi perro es raza peligrosa?',
    a: 'Por ahora no atendemos razas potencialmente peligrosas.',
  },
  {
    q: '¿Qué datos ven?',
    a: 'Tu primer nombre, la ficha del perro y la dirección.',
    mas: 'La ficha incluye lo que escribas: carácter, vacunas, notas y datos médicos. También ve el nombre del portero, si hay. Si dejaste un contacto de emergencia, puede llamarlo. No ve tu celular.',
  },
]

function PagoAcordadoFlow() {
  const nodes = [
    { icon: Wallet, label: `Pagas a ${NOMBRE_CORTO}`, sub: 'Yape, Plin o transferencia', tone: 'bg-ink text-white' },
    { icon: PawPrint, label: 'Se hace el paseo', sub: 'Con fotos de control', tone: 'bg-brand-700 text-white' },
    { icon: UserCheck, label: 'El paseador recibe', sub: `${NOMBRE_CORTO} le paga`, tone: 'bg-forest text-white' },
  ]
  return (
    <div className="rounded-3xl border border-ink/10 bg-paper p-5 shadow-card">
      <div className="grid grid-cols-3 gap-2">
        {nodes.map((n, i) => (
          <div key={n.label} className="relative flex flex-col items-center text-center">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, type: 'spring', stiffness: 260, damping: 18 }}
              className={cn('grid h-12 w-12 place-items-center rounded-2xl', n.tone)}
            >
              <n.icon size={22} />
            </motion.span>
            <p className="mt-2 text-[14px] font-extrabold leading-tight text-ink">{n.label}</p>
            <p className="text-[12px] text-ink-soft">{n.sub}</p>
            {i < nodes.length - 1 && (
              <span className="absolute left-[calc(50%+34px)] top-6 h-0.5 w-[calc(100%-60px)] overflow-hidden rounded-full bg-ink/10">
                <motion.span
                  className="absolute inset-y-0 w-4 rounded-full bg-brand-500"
                  animate={{ x: ['-100%', '600%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SafetyView({ onExplore, onApply, onAlgoPasa, onQuienesSomos }: { onExplore: () => void; onApply: () => void; onAlgoPasa: () => void; onQuienesSomos: () => void }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="pb-8">
      <header className="relative overflow-hidden bg-ink px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] text-brand-50">
        <Seal size={64} className="relative" />
        <p className="eyebrow relative mt-5 text-brand-300">Seguridad</p>
        <h1 className="font-display relative mt-1 text-[36px] font-bold leading-[1.03] text-balance">Cómo se cuida a tu perro</h1>
        <p className="relative mt-3 text-[14.5px] leading-relaxed text-brand-50/75">
          Quién puede pasear, cómo se pasea y qué pasa con tu dinero.
        </p>
        <svg viewBox="0 0 400 28" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px block h-7 w-full text-canvas" aria-hidden>
          <path d="M0 28V12C60 0 120 2 190 10s130 16 210 2v16Z" fill="currentColor" />
        </svg>
      </header>

      <section aria-label="Ayuda y equipo" className="mt-6 grid grid-cols-2 gap-3 px-4">
        {[
          { icon: LifeBuoy, label: TEXTO_ALGO_PASA.titulo, onClick: onAlgoPasa },
          { icon: Users, label: 'Quiénes somos', onClick: onQuienesSomos },
        ].map((b) => (
          <button key={b.label} type="button" onClick={b.onClick} className="min-h-11 flex flex-col items-center gap-2 rounded-3xl border border-ink/10 bg-paper p-4 text-center shadow-card active:scale-[0.97]">
            <b.icon size={24} className="text-brand-700" />
            <span className="text-[14px] font-extrabold leading-tight text-ink">{b.label}</span>
          </button>
        ))}
      </section>

      <section className="mt-9 px-5">
        <p className="eyebrow text-brand-700">Comprobaciones</p>
        <h2 className="font-display text-[28px] font-bold leading-tight text-ink">{textoCantidadComprobaciones()}</h2>
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">Esto es lo que ves en cada paseador.</p>
        <ol className="mt-5">
          {COMPROBACIONES.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '0px 0px -30px 0px' }}
              transition={{ duration: 0.35 }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {i < COMPROBACIONES.length - 1 && <span className="absolute bottom-0 left-[19px] top-11 w-px bg-ink/15" />}
              <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 font-display text-[19px] font-bold text-white">{i + 1}</span>
              <div className="pt-0.5">
                <h3 className="font-display text-[19px] font-bold leading-tight text-ink">{s.titulo}</h3>
                <p className="mt-1 text-[14px] leading-snug text-ink-soft">{s.apoyo}</p>
                <VerMas>{s.detalle}</VerMas>
              </div>
            </motion.li>
          ))}
        </ol>
        <div className="mt-6 rounded-2xl bg-sand p-4">
          <p className="text-[15px] font-extrabold text-ink">Etiqueta «{REGLA_NUEVO.etiqueta}»</p>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{reglaNuevoDueno()}</p>
        </div>
      </section>

      <section className="mt-9 px-4">
        <div className="px-1">
          <p className="eyebrow text-brand-700">Reglas de cada paseo</p>
          <h2 className="font-display text-[28px] font-bold leading-tight text-ink">Lo que nunca cambia</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {RULES.map((r) => (
            <div key={r.title} className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
              <span className="font-display text-[34px] font-bold italic leading-none text-brand-600">{r.n}</span>
              <h3 className="mt-2 text-[14px] font-extrabold leading-tight text-ink">{r.title}</h3>
              <p className="mt-1 text-[14px] leading-snug text-ink-soft">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9 px-4">
        <div className="px-1">
          <p className="eyebrow text-brand-700">Tu dinero</p>
          <h2 className="font-display text-[28px] font-bold leading-tight text-ink">Pago a {NOMBRE_CORTO}</h2>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{TEXTOS_PAGO.honestidad}</p>
        </div>
        <div className="mt-4">
          <PagoAcordadoFlow />
        </div>
      </section>

      <section className="mt-9 px-4">
        <div className="px-1">
          <p className="eyebrow text-brand-700">Durante el paseo</p>
          <h2 className="font-display text-[28px] font-bold leading-tight text-ink">Durante el paseo</h2>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { icon: MapPin, label: 'Puntos de control' },
            { icon: Camera, label: 'Fotos del paseo' },
            { icon: ShieldAlert, label: etiquetaAyuda('SOS') },
          ].map((c) => (
            <div key={c.label} className="flex flex-col items-center rounded-3xl border border-ink/10 bg-paper p-4 text-center shadow-card">
              <c.icon size={24} className="text-brand-700" />
              <p className="mt-2 text-[14px] font-extrabold leading-tight text-ink">{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9 px-4">
        <div className="px-1">
          <p className="eyebrow text-brand-700">Ayuda</p>
          <h2 className="font-display text-[28px] font-bold leading-tight text-ink">{etiquetaAyuda(`Contacto de ${NOMBRE_CORTO}`)}</h2>
        </div>
        <div className="mt-4">
          <AyudaContactos mensaje={`Hola, necesito ayuda con ${NOMBRE_APP}.`} />
        </div>
      </section>

      <section className="mt-9 px-4">
        <div className="px-1">
          <p className="eyebrow text-brand-700">Dudas</p>
          <h2 className="font-display text-[28px] font-bold leading-tight text-ink">Preguntas frecuentes</h2>
        </div>
        <div className="mt-4 divide-y divide-ink/10 overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-card">
          {FAQ.map((f, i) => (
            <div key={f.q}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="min-h-11 flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                <span className="text-[14.5px] font-extrabold text-ink">{f.q}</span>
                <ChevronDown size={18} className={cn('shrink-0 text-ink-soft transition-transform', open === i && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden px-5 text-[14px] leading-relaxed text-ink-soft">
                    <div className="pb-4">
                      <p>{f.a}</p>
                      {f.mas && <VerMas className="mt-1">{f.mas}</VerMas>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 space-y-3 px-4">
        <button type="button" onClick={onExplore} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
          Encontrar paseador <ArrowRight size={19} strokeWidth={2.6} />
        </button>
        <button type="button" onClick={onApply} className={cn(btnInk, 'h-14 w-full text-[15px]')}>
          Soy estudiante: quiero ser paseador
        </button>
      </div>
    </div>
  )
}
