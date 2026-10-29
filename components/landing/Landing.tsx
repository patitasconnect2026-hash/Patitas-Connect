'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import {
  ArrowRight,
  Bike,
  CalendarCheck,
  Camera,
  Check,
  ChevronDown,
  Clock,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  MapPin,
  Siren,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { CONFIG, NOMBRE_APP, NOMBRE_CORTO, TEXTOS_PAGO, textoPlanLunesViernes } from '@/lib/config'
import { DURATIONS } from '@/lib/data'
import { COMPROBACIONES, MAX_PERROS_POR_PASEO, REGLA_NUEVO, textoHastaComprobaciones } from '@/lib/verificacion'
import { cn } from '@/lib/utils'
import { Logo, PawMark } from '../ui/Logo'
import { StoreBadges } from '../ui/StoreBadges'
import { PawPattern } from '../Onboarding'

/** Textos de la portada pública. Todo lo que se promete aquí existe en la app (ver la skill patitas-connect, sección 6). */
export const TEXTO_PORTADA = {
  piloto: 'Piloto en San Isidro y Jesús María',
  entrar: 'Entrar',
  reservar: 'Buscar paseador',
  serPaseador: 'Postular como paseador',
} as const

/** Los dos públicos de la portada: quien da a su perro en paseo y quien quiere pasear perros. */
type Publico = 'familia' | 'paseador'

const NAV = [
  { href: '#familias', t: 'Para familias' },
  { href: '#paseadores', t: 'Para paseadores' },
  { href: '#como-funciona', t: 'Cómo funciona' },
  { href: '#app', t: 'App' },
  { href: '#preguntas', t: 'Preguntas' },
]

const btnPrincipal =
  'btn-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-700 px-6 text-[16px] font-extrabold text-white shadow-press'
const btnVino =
  'btn-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-vino px-6 text-[16px] font-extrabold text-white shadow-press-vino'

const aparecer = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
}

function Seccion({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-20 px-4 py-16 sm:px-6 md:py-24', className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

function Titulo({ eyebrow, children, claro = false }: { eyebrow: string; children: React.ReactNode; claro?: boolean }) {
  return (
    <motion.div {...aparecer} className="max-w-2xl">
      <p className={cn('eyebrow', claro ? 'text-brand-200' : 'text-brand-700')}>{eyebrow}</p>
      <h2 className={cn('font-display mt-3 text-[32px] font-bold leading-[1.05] text-balance md:text-[46px]', claro ? 'text-white' : 'text-ink')}>
        {children}
      </h2>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Portada: pestañas para los dos públicos (como el buscador de Good Dog) */
/* ------------------------------------------------------------------ */

const PORTADA: Record<
  Publico,
  {
    pestana: string
    titulo: React.ReactNode
    texto: string
    avisos: Array<{ icon: typeof Camera; t: string; d: string }>
  }
> = {
  familia: {
    pestana: 'Tengo un perro',
    titulo: (
      <>
        El paseo <span className="text-brand-700">con cuidado</span> que tu mejor amigo merece.
      </>
    ),
    texto: 'Vecinos estudiantes de San Isidro y Jesús María pasean a tu perro. Ves fotos con hora y lugar, entregas con un código y pagas al terminar.',
    avisos: [
      { icon: Camera, t: 'Foto del paseo', d: 'Con hora y lugar' },
      { icon: KeyRound, t: 'Código de recojo', d: 'Lo das tú al entregar' },
      {
        icon: Wallet,
        t: 'Pagas al terminar',
        d: `A ${NOMBRE_CORTO}, no al paseador`,
      },
    ],
  },
  paseador: {
    pestana: 'Quiero pasear perros',
    titulo: (
      <>
        Gana paseando perros de tu <span className="text-brand-700">barrio</span>.
      </>
    ),
    texto: `Para estudiantes mayores de 18 que viven o estudian en San Isidro o Jesús María. Tú pones tu tarifa y tus horarios.`,
    avisos: [
      {
        icon: Wallet,
        t: 'Tu tarifa',
        d: `S/ ${CONFIG.tarifaMinima} a ${CONFIG.tarifaMaxima} por hora`,
      },
      { icon: Clock, t: 'Tus horarios', d: 'Y tus parques' },
      { icon: GraduationCap, t: 'Primer paseo', d: 'Te acompañamos' },
    ],
  },
}

function Aviso({ icon: Icon, t, d, className }: { icon: typeof Camera; t: string; d: string; className?: string }) {
  return (
    <div className={cn('absolute hidden items-center gap-3 rounded-2xl bg-paper px-3.5 py-3 shadow-pop ring-1 ring-ink/5 sm:flex', className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icon size={19} aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-[14px] font-extrabold text-ink">{t}</span>
        <span className="block text-[13px] text-ink-soft">{d}</span>
      </span>
    </div>
  )
}

const POSICION_AVISOS = ['left-0 top-[12%] sm:-left-4', 'right-0 top-[46%] sm:-right-4', 'bottom-[2%] left-[6%]']

function Portada({ onEntrar }: { onEntrar: () => void }) {
  const [publico, setPublico] = useState<Publico>('familia')
  const reducir = useReducedMotion()
  const { scrollY } = useScroll()
  // Parallax suave del isotipo y del círculo (capas que se mueven a distinta velocidad, como en Rainforest).
  const yCirculo = useTransform(scrollY, [0, 600], [0, reducir ? 0 : 60])
  const yLogo = useTransform(scrollY, [0, 600], [0, reducir ? 0 : -40])
  const giro = useTransform(scrollY, [0, 600], [0, reducir ? 0 : 8])
  const p = PORTADA[publico]

  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-8 sm:px-6 md:pb-32 md:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(40rem 28rem at 8% 0%, rgba(250,224,212,.95), transparent 60%), radial-gradient(36rem 30rem at 100% 100%, rgba(243,190,166,.45), transparent 60%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.05fr_1fr] md:gap-8">
        <div>
          {/* Pestañas: cada público ve su frase y su botón. */}
          <div role="tablist" aria-label="¿Quién eres?" className="inline-flex rounded-full bg-paper p-1 ring-1 ring-ink/10">
            {(Object.keys(PORTADA) as Publico[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                id={`tab-${k}`}
                aria-selected={publico === k}
                aria-controls="portada-panel"
                onClick={() => setPublico(k)}
                className={cn(
                  'relative min-h-11 rounded-full px-4 text-[14px] font-extrabold transition-colors sm:px-5 sm:text-[15px]',
                  publico === k ? 'text-white' : 'text-ink-soft hover:text-ink',
                )}
              >
                {publico === k && (
                  <motion.span
                    layoutId="pestana-activa"
                    className="absolute inset-0 rounded-full bg-vino"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative">{PORTADA[k].pestana}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={publico}
              id="portada-panel"
              role="tabpanel"
              aria-labelledby={`tab-${publico}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="font-display mt-6 text-[38px] font-bold leading-[1.02] text-ink text-balance sm:text-[52px] lg:text-[64px]">{p.titulo}</h1>
              <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-ink-soft md:text-[20px]">{p.texto}</p>
              <div className="mt-8">
                {publico === 'familia' ? (
                  <button type="button" onClick={onEntrar} className={btnPrincipal}>
                    {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
                  </button>
                ) : (
                  <Link href="/paseador" className={btnVino}>
                    <Bike size={19} aria-hidden /> {TEXTO_PORTADA.serPaseador}
                  </Link>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          <p className="mt-6 inline-flex items-center gap-2 text-[14px] font-bold text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-forest" aria-hidden /> {TEXTO_PORTADA.piloto}
          </p>
        </div>

        {/* El isotipo grande, en capas, con los avisos del público elegido. */}
        <div className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[460px] md:max-w-[520px]">
          <motion.div style={{ y: yCirculo }} className="absolute inset-[4%] overflow-hidden rounded-full bg-brand-600">
            <PawPattern id="portada-huellas" />
          </motion.div>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
            style={{ y: yLogo, rotate: giro }}
            className="absolute inset-[15%] grid place-items-center rounded-full bg-brand-50 shadow-[0_30px_60px_-24px_rgba(91,34,41,.6)]"
          >
            <Image
              src="/marca/logo-mark.png"
              alt={`Isotipo de ${NOMBRE_APP}: un perro abrazando a su cachorro`}
              width={482}
              height={512}
              priority
              sizes="(min-width: 768px) 300px, 60vw"
              className="h-[72%] w-auto object-contain"
            />
          </motion.div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={publico}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              {p.avisos.map((a, i) => (
                <motion.div
                  key={a.t}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                  className="absolute inset-0"
                >
                  <Aviso icon={a.icon} t={a.t} d={a.d} className={POSICION_AVISOS[i]} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* «Desliza para descubrir», como en TAG Heuer. */}
      <a
        href="#caminos"
        className="relative mx-auto mt-14 hidden w-fit flex-col items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.2em] text-ink-soft md:flex"
      >
        Desliza para descubrir
        <span className="relative block h-10 w-px overflow-hidden bg-ink/15">
          <motion.span
            className="absolute left-0 top-0 block h-4 w-px bg-brand-700"
            animate={reducir ? undefined : { y: [-16, 40] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </a>

      {/* Borde curvo abajo, como en Paws Playgrounds. */}
      <svg aria-hidden viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full text-vino md:h-16">
        <path d="M0 80 C 360 0, 1080 0, 1440 80 Z" fill="currentColor" />
      </svg>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Marquesina: lo esencial, pasando sin parar (se detiene con «reducir movimiento») */
/* ------------------------------------------------------------------ */

const FRASES = [
  'Pagas al terminar',
  'Fotos con hora y lugar',
  'Código de recojo',
  textoHastaComprobaciones(),
  'Perros del mismo tamaño',
  'San Isidro y Jesús María',
]

function Marquesina() {
  const fila = (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden>
      {FRASES.map((f) => (
        <li key={f} className="flex items-center gap-8 whitespace-nowrap">
          <span className="font-display text-[20px] font-bold uppercase tracking-wide md:text-[24px]">{f}</span>
          <PawMark className="h-5 w-5 text-brand-300" />
        </li>
      ))}
    </ul>
  )
  return (
    <div className="overflow-hidden bg-vino py-5 text-brand-50">
      <p className="sr-only">{FRASES.join('. ')}.</p>
      <div className="marquesina flex w-max">
        {fila}
        {fila}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dos caminos: un panel para cada público (paneles altos, como Geospace) */
/* ------------------------------------------------------------------ */

function Caminos({ onEntrar }: { onEntrar: () => void }) {
  const paneles = [
    {
      id: 'familias',
      eyebrow: 'Para familias',
      titulo: 'Das a tu perro en paseo',
      fondo: 'bg-brand-700',
      puntos: [
        `Eliges paseador, día y hora (${DURATIONS.join(', ')} minutos)`,
        'Recibes fotos con hora y lugar durante el paseo',
        'Entregas con un código de 4 dígitos',
        `Pagas al terminar, a ${NOMBRE_CORTO}`,
      ],
      boton: (
        <button type="button" onClick={onEntrar} className={cn(btnVino, 'w-full sm:w-auto')}>
          {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
        </button>
      ),
    },
    {
      id: 'paseadores',
      eyebrow: 'Para paseadores',
      titulo: 'Paseas perros y ganas',
      fondo: 'bg-vino-800',
      puntos: [
        `Pones tu tarifa: entre S/ ${CONFIG.tarifaMinima} y S/ ${CONFIG.tarifaMaxima} por hora`,
        'Eliges tus horarios y tus parques',
        'Te acompañamos en tu primer paseo',
        TEXTOS_PAGO.honestidadPaseador,
      ],
      boton: (
        <Link href="/paseador" className={cn(btnPrincipal, 'w-full sm:w-auto')}>
          <Bike size={19} aria-hidden /> {TEXTO_PORTADA.serPaseador}
        </Link>
      ),
    },
  ]
  return (
    <section id="caminos" className="scroll-mt-20 bg-vino px-4 pb-16 pt-6 sm:px-6 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <motion.h2 {...aparecer} className="font-display text-center text-[30px] font-bold text-white md:text-[42px]">
          ¿Quién eres?
        </motion.h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {paneles.map((p, i) => (
            <motion.article
              key={p.id}
              id={p.id}
              {...aparecer}
              transition={{ ...aparecer.transition, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className={cn('group relative scroll-mt-24 overflow-hidden rounded-[2rem] p-7 text-white ring-1 ring-white/10 md:min-h-[480px] md:p-10', p.fondo)}
            >
              <PawMark className="absolute -bottom-10 -right-10 h-56 w-56 rotate-12 text-white/[0.07] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110" />
              <p className="eyebrow relative text-brand-200">{p.eyebrow}</p>
              <h3 className="font-display relative mt-3 text-[30px] font-bold leading-[1.05] md:text-[40px]">{p.titulo}</h3>
              <ul className="relative mt-6 space-y-3">
                {p.puntos.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[16px] font-semibold">
                    <Check size={20} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-200" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <div className="relative mt-8">{p.boton}</div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Cómo funciona: el número queda fijo a la izquierda y cambia al bajar (como las secciones fijas de TAG Heuer) */
/* ------------------------------------------------------------------ */

const PASOS = [
  {
    icon: CalendarCheck,
    t: 'Pide o reserva',
    d: `Eliges día, hora y duración (${DURATIONS.join(', ')} minutos). No pagas nada al reservar.`,
  },
  {
    icon: KeyRound,
    t: 'Entrega con código',
    d: 'Le das al paseador un código de 4 dígitos al entregar a tu perro.',
  },
  {
    icon: Camera,
    t: 'Fotos y puntos de control',
    d: 'Durante el paseo recibes fotos con hora y lugar, tomadas con la cámara de la app.',
  },
  {
    icon: Wallet,
    t: 'Recibes y pagas',
    d: `Tocas «Recibí a tu perro» y le pagas a ${NOMBRE_CORTO}. ${NOMBRE_CORTO} le paga al paseador.`,
  },
]

function ComoFunciona() {
  const [activo, setActivo] = useState(0)
  return (
    <Seccion id="como-funciona" className="bg-paper">
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <Titulo eyebrow="Cómo funciona">Cuatro pasos, sin sorpresas.</Titulo>
          <div className="mt-10 hidden items-end gap-4 md:flex" aria-hidden>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activo}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.3 }}
                className="font-display text-[140px] font-bold leading-none text-brand-600"
              >
                0{activo + 1}
              </motion.span>
            </AnimatePresence>
            <span className="mb-6 block h-1.5 w-40 overflow-hidden rounded-full bg-sand">
              <motion.span
                className="block h-full rounded-full bg-vino"
                animate={{ width: `${((activo + 1) / PASOS.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </span>
          </div>
        </div>
        <ol className="space-y-5 md:space-y-10 md:py-10">
          {PASOS.map((p, i) => (
            <motion.li key={p.t} onViewportEnter={() => setActivo(i)} viewport={{ amount: 0.6 }}>
              <motion.div
                {...aparecer}
                className={cn('rounded-3xl bg-canvas p-6 ring-1 transition-colors duration-300 md:p-8', activo === i ? 'ring-brand-300' : 'ring-ink/5')}
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-vino text-brand-50">
                    <p.icon size={22} aria-hidden />
                  </span>
                  <span className="font-display text-[15px] font-bold text-brand-700">Paso {i + 1}</span>
                </div>
                <h3 className="mt-5 text-[20px] font-extrabold text-ink">{p.t}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{p.d}</p>
              </motion.div>
            </motion.li>
          ))}
        </ol>
      </div>
    </Seccion>
  )
}

function Confianza() {
  return (
    <Seccion id="confianza" className="relative overflow-hidden bg-vino-800 text-white">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div>
          <Titulo eyebrow="Confianza" claro>
            {textoHastaComprobaciones()} antes de pasear.
          </Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/80">
            Cada paseador muestra solo las comprobaciones que el equipo ya hizo. Si una no está marcada, no aparece.
          </motion.p>
          <motion.ul {...aparecer} className="mt-8 space-y-4">
            {[
              {
                icon: GraduationCap,
                t: 'Primeros paseos acompañados',
                d: `En sus primeros ${REGLA_NUEVO.paseos} paseos lleva máximo ${REGLA_NUEVO.maxPerros} perros; después, ${MAX_PERROS_POR_PASEO}.`,
              },
              {
                icon: PawMarkIcon,
                t: 'Perros del mismo tamaño',
                d: 'Pequeños, medianos y grandes nunca se mezclan en un grupo.',
              },
              {
                icon: Siren,
                t: 'Si algo pasa',
                d: 'Botón de ayuda para llamar a Policía, Bomberos o SAMU, y «Reportar problema» para el equipo.',
              },
            ].map((r) => (
              <li key={r.t} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
                  <r.icon size={20} aria-hidden />
                </span>
                <span>
                  <span className="block text-[17px] font-extrabold">{r.t}</span>
                  <span className="block text-[15px] text-white/75">{r.d}</span>
                </span>
              </li>
            ))}
          </motion.ul>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {COMPROBACIONES.map((c, i) => (
            <motion.li
              key={c.id}
              {...aparecer}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-white">
                <Check size={18} strokeWidth={3} aria-hidden />
              </span>
              <h3 className="mt-4 text-[17px] font-extrabold">{c.titulo}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-white/75">{c.apoyo}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </Seccion>
  )
}

function PawMarkIcon({ size = 20 }: { size?: number; 'aria-hidden'?: boolean }) {
  return <PawMark style={{ width: size, height: size }} />
}

function Precios({ onEntrar }: { onEntrar: () => void }) {
  return (
    <Seccion id="precios" className="bg-canvas">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <Titulo eyebrow="Precios y pago">Pagas al terminar. A {NOMBRE_CORTO}, no al paseador.</Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            {TEXTOS_PAGO.honestidad} Pagas solo el precio del paseo, sin cargos extra, con Yape, Plin o transferencia.
          </motion.p>
          <motion.div {...aparecer} className="mt-8">
            <button type="button" onClick={onEntrar} className={btnPrincipal}>
              {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
            </button>
          </motion.div>
        </div>
        <motion.div {...aparecer} className="overflow-hidden rounded-[2rem] bg-paper shadow-card ring-1 ring-ink/5">
          <div className="relative overflow-hidden bg-brand-700 px-7 py-8 text-white">
            <PawPattern id="precios-huellas" />
            <p className="relative text-[15px] font-bold text-brand-100">Cada paseador pone su tarifa</p>
            <p className="font-display relative mt-1 text-[44px] font-bold leading-none md:text-[56px]">
              S/ {CONFIG.tarifaMinima} <span className="text-brand-200">a</span> {CONFIG.tarifaMaxima}
            </p>
            <p className="relative mt-2 text-[15px] font-semibold text-white">por hora de paseo</p>
          </div>
          <ul className="divide-y divide-ink/5 px-7 py-2">
            {[
              { t: 'Duraciones', d: `${DURATIONS.join(', ')} minutos` },
              { t: 'Horario de recojo', d: '6:00 a. m. a 9:00 p. m.' },
              { t: 'Plan de lunes a viernes', d: textoPlanLunesViernes() },
              {
                t: 'Cancelación',
                d: `Gratis hasta ${CONFIG.horasCancelacionGratis} horas antes`,
              },
            ].map((r) => (
              <li key={r.t} className="flex items-center justify-between gap-4 py-4">
                <span className="text-[15px] font-bold text-ink">{r.t}</span>
                <span className="text-right text-[15px] text-ink-soft">{r.d}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </Seccion>
  )
}

function Cobertura() {
  return (
    <Seccion id="cobertura" className="bg-paper">
      <Titulo eyebrow="Dónde estamos">Empezamos por dos distritos, y bien hecho.</Titulo>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {[
          {
            n: 'San Isidro',
            d: 'Paseadores que viven o estudian en el distrito, cerca de sus parques.',
          },
          {
            n: 'Jesús María',
            d: 'Paseadores vecinos, con parques cerca de tu casa.',
          },
        ].map((z, i) => (
          <motion.div
            key={z.n}
            {...aparecer}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="relative overflow-hidden rounded-[2rem] bg-sand p-8 md:p-10"
          >
            <PawMark className="absolute -right-6 -top-6 h-40 w-40 rotate-12 text-sand-2" />
            <MapPin size={28} className="relative text-brand-700" aria-hidden />
            <h3 className="font-display relative mt-4 text-[34px] font-bold leading-none text-ink md:text-[42px]">{z.n}</h3>
            <p className="relative mt-3 max-w-sm text-[16px] leading-relaxed text-ink-soft">{z.d}</p>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-[15px] text-ink-soft">¿Vives en otro distrito? Pronto llegamos.</p>
    </Seccion>
  )
}

/* ------------------------------------------------------------------ */
/* La app: el ÚNICO lugar con Google Play y App Store */
/* ------------------------------------------------------------------ */

function App() {
  const reducir = useReducedMotion()
  return (
    <Seccion id="app" className="relative overflow-hidden bg-sand">
      <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
        <div>
          <Titulo eyebrow="La app">{NOMBRE_APP} en tu celular.</Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            Hoy funciona desde el navegador de tu celular, sin instalar nada. Muy pronto también como app, para familias y paseadores.
          </motion.p>
          <motion.div {...aparecer} className="mt-8">
            <StoreBadges />
          </motion.div>
          <motion.p {...aparecer} className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-ink-soft">
            <Smartphone size={17} aria-hidden /> Todavía no están en las tiendas: avisaremos cuando salgan.
          </motion.p>
        </div>
        {/* Ícono de la app flotando, con ondas suaves detrás. */}
        <div className="relative mx-auto grid aspect-square w-full max-w-[300px] place-items-center" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-[3rem] border-2 border-brand-300"
              animate={reducir ? undefined : { scale: [0.7, 1.15], opacity: [0.7, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i,
                ease: 'easeOut',
              }}
            />
          ))}
          <motion.div
            animate={reducir ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative grid h-44 w-44 place-items-center rounded-[2.6rem] bg-brand-50 shadow-[0_30px_60px_-20px_rgba(91,34,41,.55)] ring-1 ring-vino/10"
          >
            <Image src="/marca/logo-mark.png" alt="" width={482} height={512} className="h-32 w-auto" />
          </motion.div>
        </div>
      </div>
    </Seccion>
  )
}

function QuienesSomos() {
  return (
    <Seccion className="bg-canvas">
      <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
        <div className="mx-auto grid h-40 w-40 place-items-center rounded-full bg-brand-50 ring-1 ring-brand-100 md:h-48 md:w-48">
          <HeartHandshake size={64} className="text-brand-700" aria-hidden />
        </div>
        <div>
          <Titulo eyebrow="Quiénes somos">Tres estudiantes de Lima que aman a los perros.</Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
            {NOMBRE_APP} es un piloto: empezamos con pocas familias para hacerlo bien. Una persona hace la web, otra el diseño y otra habla con las familias.
            Todo lo que ves aquí es lo que la app hace hoy.
          </motion.p>
        </div>
      </div>
    </Seccion>
  )
}

function Final({ onEntrar }: { onEntrar: () => void }) {
  return (
    <Seccion className="bg-canvas pt-0 md:pt-0">
      <motion.div {...aparecer} className="relative overflow-hidden rounded-[2.5rem] bg-vino-800 px-6 py-14 text-center text-white md:px-12 md:py-20">
        <PawPattern id="final-huellas" />
        <div className="relative">
          <Image src="/marca/logo-mark.png" alt="" width={96} height={102} className="mx-auto h-24 w-auto rounded-full bg-brand-50 p-3" />
          <h2 className="font-display mx-auto mt-6 max-w-2xl text-[34px] font-bold leading-[1.05] text-balance md:text-[50px]">
            Tu perro feliz, tú <span className="text-brand-300">tranquilo</span>.
          </h2>
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={onEntrar} className={btnPrincipal}>
              {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
            </button>
          </div>
        </div>
      </motion.div>
    </Seccion>
  )
}

const PREGUNTAS = [
  {
    q: '¿Cuánto cuesta un paseo?',
    a: `Cada paseador pone su tarifa, entre S/ ${CONFIG.tarifaMinima} y S/ ${CONFIG.tarifaMaxima} por hora. Ves el precio antes de reservar y pagas solo eso, sin cargos extra.`,
  },
  {
    q: '¿Cuándo y cómo pago?',
    a: `Al terminar el paseo, no antes. Le pagas a ${NOMBRE_CORTO} con Yape, Plin o transferencia, y ${NOMBRE_CORTO} le paga al paseador después de confirmar el pago.`,
  },
  {
    q: '¿Cómo sé que mi perro está bien?',
    a: 'El paseador toma fotos con la cámara de la app; cada una guarda la hora y el lugar. Al entregar le das un código de 4 dígitos, y al final confirmas que tu perro llegó bien.',
  },
  {
    q: '¿Quiénes son los paseadores?',
    a: `Estudiantes mayores de 18 que viven o estudian en San Isidro o Jesús María. Cada uno muestra cuáles de las ${COMPROBACIONES.length} comprobaciones ya hizo el equipo.`,
  },
  {
    q: '¿Qué pasa si algo sale mal?',
    a: 'La app tiene un botón de ayuda para llamar a Policía (105), Bomberos (116) o SAMU (106), y pasos claros si tu perro se pierde o se lastima. Cualquier problema se reporta desde el paseo y el equipo lo revisa.',
  },
  {
    q: '¿Puedo cancelar?',
    a: `Sí. Es gratis hasta ${CONFIG.horasCancelacionGratis} horas antes del paseo.`,
  },
  {
    q: '¿Cómo postulo como paseador?',
    a: 'Entra a «Postular como paseador», completa tus datos y un examen corto con casos reales. El equipo revisa tu postulación y te escribe por WhatsApp.',
  },
  {
    q: '¿Hay app para el celular?',
    a: 'Hoy funciona desde el navegador de tu celular, sin instalar nada. La app para Google Play y App Store llega pronto.',
  },
]

function Preguntas() {
  return (
    <Seccion id="preguntas" className="bg-paper">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <Titulo eyebrow="Preguntas frecuentes">Lo que más nos preguntan.</Titulo>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {PREGUNTAS.map((p) => (
            <details key={p.q} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                {p.q}
                <ChevronDown size={20} className="shrink-0 text-ink-soft transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-5 pr-8 text-[16px] leading-relaxed text-ink-soft">{p.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Seccion>
  )
}

function Pie({ onEntrar }: { onEntrar: () => void }) {
  return (
    <footer className="bg-vino-900 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-14 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="cream" size={44} />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/75">Paseos de perros con vecinos estudiantes. {TEXTO_PORTADA.piloto}, Lima.</p>
        </div>
        <nav aria-label="Familias">
          <p className="text-[14px] font-extrabold text-brand-200">Familias</p>
          <ul className="mt-3 space-y-1 text-[15px]">
            <li>
              <button type="button" onClick={onEntrar} className="min-h-11 text-white/85 hover:text-white">
                Entrar o crear cuenta
              </button>
            </li>
            <li>
              <a href="#como-funciona" className="inline-flex min-h-11 items-center text-white/85 hover:text-white">
                Cómo funciona
              </a>
            </li>
            <li>
              <a href="#preguntas" className="inline-flex min-h-11 items-center text-white/85 hover:text-white">
                Preguntas frecuentes
              </a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Paseadores">
          <p className="text-[14px] font-extrabold text-brand-200">Paseadores</p>
          <ul className="mt-3 space-y-1 text-[15px]">
            <li>
              <Link href="/paseador" className="inline-flex min-h-11 items-center text-white/85 hover:text-white">
                {TEXTO_PORTADA.serPaseador}
              </Link>
            </li>
            <li>
              <a href="#confianza" className="inline-flex min-h-11 items-center text-white/85 hover:text-white">
                Comprobaciones
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-[13px] text-white/70 sm:flex-row sm:justify-between">
        <p>© {NOMBRE_APP}. Proyecto piloto de estudiantes.</p>
        <p>San Isidro · Jesús María · Lima, Perú</p>
      </div>
    </footer>
  )
}

/** Portada pública (la web de la marca). «Entrar» o «Buscar paseador» abre la app de la familia; «Postular» lleva a /paseador. */
export function Landing({ onEntrar }: { onEntrar: () => void }) {
  const { scrollYProgress } = useScroll()
  const progreso = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-canvas text-ink">
        <motion.div aria-hidden style={{ scaleX: progreso }} className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-brand-600" />
        <header className="sticky top-0 z-50 border-b border-ink/5 bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-20">
            <a href="#" aria-label={`${NOMBRE_APP}, inicio`} className="shrink-0">
              <Logo size={40} />
            </a>
            <nav aria-label="Secciones" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="rounded-full px-3.5 py-2 text-[15px] font-bold text-ink-soft transition hover:bg-sand hover:text-ink">
                      {n.t}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <button
              type="button"
              onClick={onEntrar}
              className="btn-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-vino px-5 text-[15px] font-extrabold text-white shadow-press-vino"
            >
              {TEXTO_PORTADA.entrar}
            </button>
          </div>
        </header>
        <main>
          <Portada onEntrar={onEntrar} />
          <Marquesina />
          <Caminos onEntrar={onEntrar} />
          <ComoFunciona />
          <Confianza />
          <Precios onEntrar={onEntrar} />
          <Cobertura />
          <App />
          <QuienesSomos />
          <Preguntas />
          <Final onEntrar={onEntrar} />
        </main>
        <Pie onEntrar={onEntrar} />
      </div>
    </MotionConfig>
  )
}
