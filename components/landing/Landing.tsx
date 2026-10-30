'use client'

import { Children, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  X,
} from 'lucide-react'
import { CONFIG, contactoPrincipal, LEMA, NOMBRE_APP, NOMBRE_CORTO, TEXTOS_PAGO, textoPlanLunesViernes } from '@/lib/config'
import { enlaceWhatsApp } from '@/lib/telefono'
import { DURATIONS } from '@/lib/data'
import { FOTOS_PERROS } from '@/lib/fotosPerros'
import { COMPROBACIONES, MAX_PERROS_POR_PASEO, REGLA_NUEVO, textoHastaComprobaciones } from '@/lib/verificacion'
import { cn } from '@/lib/utils'
import { Logo, PawMark } from '../ui/Logo'
import { Redes } from '../ui/Redes'
import { StoreBadges } from '../ui/StoreBadges'
import {
  Abanico,
  Capa,
  Carrusel,
  Contador,
  FranjaGigante,
  HuellasFlotantes,
  PestanasSubrayadas,
  TextoQueSeEnciende,
  TextoRevuelto,
  useEntradaLateral,
  useInclinacionPorVelocidad,
} from '../ui/Movimiento'
import { PawPattern } from '../Onboarding'
import { Entrada } from './Entrada'
import { Aureola } from './Aureola'
import { DistritosSerenazgo } from '../funciones/Distritos'
import { NivelesPaseador, PlanesFamilia } from '../funciones/Planes'
import { Protocolos } from '../funciones/Protocolos'
import { ACADEMIA, BENEFICIOS_ALIADO, SERVICIOS } from '@/lib/servicios'

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
  { href: '#planes', t: 'Planes' },
  { href: '#app', t: 'App' },
  { href: '#preguntas', t: 'Preguntas' },
]

const btnPrincipal =
  'btn-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-700 px-6 text-[16px] font-extrabold text-white shadow-press'
const btnVino =
  'btn-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-vino px-6 text-[16px] font-extrabold text-white shadow-press-vino'

/** Botón de contorno que se rellena al pasar el mouse (como «Find out more» en BAO London). */
const btnContorno =
  'group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-[16px] font-extrabold ring-2 ring-white/85 transition-colors duration-300 hover:bg-white hover:text-vino focus-visible:outline-none focus-visible:ring-brand-300'

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
      <p className={cn('eyebrow inline-flex items-center gap-2', claro ? 'text-brand-200' : 'text-brand-700')}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        <TextoRevuelto texto={eyebrow} />
      </p>
      <h2 className={cn('font-display mt-3 text-[32px] font-bold leading-[1.05] text-balance md:text-[46px]', claro ? 'text-white' : 'text-ink')}>
        <PalabrasQueSuben>{children}</PalabrasQueSuben>
      </h2>
    </motion.div>
  )
}

/** Las palabras del título suben una por una desde detrás de una línea (como los titulares de BAO London). */
function PalabrasQueSuben({ children }: { children: React.ReactNode }) {
  const partes = Children.toArray(children)
  if (!partes.every((c) => typeof c === 'string' || typeof c === 'number')) return <>{children}</>
  const palabras = partes.join('').split(' ').filter(Boolean)
  return (
    <motion.span initial="oculto" whileInView="visible" viewport={{ once: true, margin: '-40px' }} transition={{ staggerChildren: 0.07 }}>
      {palabras.map((w, i) => (
        <Fragment key={i}>
          <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
            <motion.span
              variants={{
                oculto: { y: '105%', rotate: 4 },
                visible: { y: 0, rotate: 0 },
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block origin-bottom-left"
            >
              {w}
            </motion.span>
          </span>{' '}
        </Fragment>
      ))}
    </motion.span>
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
        Paseos <span className="text-brand-700">felices</span>, dueños tranquilos.
      </>
    ),
    texto: 'Paseadores de tu barrio para tu perro. Tú eliges el horario, ves fotos del paseo y pagas al terminar.',
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
        Pasea perros. Gana <span className="text-brand-700">entre clases</span>.
      </>
    ),
    texto: `Para estudiantes mayores de 18 de San Isidro o Jesús María. Tu tarifa, tus horarios, sin chocar con tus clases.`,
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

function Portada({ onEntrar }: { onEntrar: () => void }) {
  const [publico, setPublico] = useState<Publico>('familia')
  const reducir = useReducedMotion()
  const p = PORTADA[publico]
  // Manchas de color que flotan muy despacio en el fondo de cada panel.
  const flotar = (dx: number, dy: number, s: number) =>
    reducir
      ? {}
      : {
          animate: { x: [0, dx, 0], y: [0, dy, 0] },
          transition: {
            duration: s,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        }

  return (
    <section id="inicio" className="relative scroll-mt-16 px-3 pb-20 pt-3 sm:px-4 md:scroll-mt-20 md:pb-28 md:pt-4">
      {/* Fondo dividido en dos paneles, cada uno con su atmósfera: claro y cálido para el texto, vino profundo para la aureola. */}
      <div className="relative mx-auto grid max-w-[1400px] gap-3 md:grid-cols-[1fr_1.05fr]">
        <div className="relative overflow-hidden rounded-[2rem] px-5 py-10 sm:px-8 md:flex md:items-center md:px-12 md:py-16">
          <div aria-hidden className="absolute inset-0 overflow-hidden bg-[linear-gradient(160deg,#fffaf4_0%,#fbf1e6_55%,#f3e4d2_100%)]">
            <motion.div {...flotar(40, 30, 16)} className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-200/55 blur-3xl" />
            <motion.div {...flotar(-30, -40, 19)} className="absolute -bottom-28 right-[-10%] h-96 w-96 rounded-full bg-vino-100/60 blur-3xl" />
          </div>
          <div className="relative">
            {/* Pestañas: cada público ve su frase y su botón. Un fondo vino se desliza bajo la elegida. */}
            <p className="eyebrow text-brand-700">¿Quién eres?</p>
            <div
              role="tablist"
              aria-label="¿Quién eres?"
              className="mt-3 inline-grid grid-cols-2 gap-1 rounded-[1.4rem] bg-white/80 p-1.5 shadow-[0_14px_34px_-16px_rgba(91,34,41,.45)] ring-1 ring-vino/10 backdrop-blur"
            >
              {(Object.keys(PORTADA) as Publico[]).map((k) => {
                const activa = publico === k
                const Icono = k === 'familia' ? PawMarkIcon : Bike
                return (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    id={`tab-${k}`}
                    aria-selected={activa}
                    aria-controls="portada-panel"
                    onClick={() => setPublico(k)}
                    className={cn(
                      'group relative flex min-h-14 items-center gap-2.5 rounded-[1.1rem] px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:px-4',
                      activa ? 'text-white' : 'text-ink hover:bg-brand-50',
                    )}
                  >
                    {activa && (
                      <motion.span
                        layoutId="pestana-activa"
                        className="absolute inset-0 rounded-[1.1rem] bg-[linear-gradient(135deg,#6b2a31,#4b1b21)] shadow-[0_10px_22px_-10px_rgba(46,16,20,.8)]"
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 32,
                        }}
                      />
                    )}
                    <span
                      className={cn(
                        'relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110 max-[399px]:hidden',
                        activa ? 'bg-white/15 text-brand-200' : 'bg-brand-50 text-brand-700',
                      )}
                    >
                      <Icono size={18} aria-hidden />
                    </span>
                    <span className="relative leading-tight">
                      <span className="block text-[14px] font-extrabold sm:text-[15px]">{PORTADA[k].pestana}</span>
                      <span className={cn('block text-[13px] font-semibold max-[399px]:hidden', activa ? 'text-white/75' : 'text-ink-soft')}>
                        {k === 'familia' ? 'Para familias' : 'Para paseadores'}
                      </span>
                    </span>
                  </button>
                )
              })}
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
        </div>

        <div className="relative overflow-hidden rounded-[2rem] px-4 py-10 sm:px-10 md:flex md:items-center md:py-14">
          <div aria-hidden className="absolute inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_50%_45%,#6b2a31_0%,#3d161b_55%,#2e1014_100%)]">
            <motion.div {...flotar(-40, 30, 18)} className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
            <motion.div {...flotar(30, -30, 21)} className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-brand-300/15 blur-3xl" />
          </div>
          <div className="relative w-full">
            <Aureola avisos={p.avisos} clave={publico} />
          </div>
        </div>
      </div>

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
  const inclinar = useInclinacionPorVelocidad()
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
  const nombre = (
    <ul className="flex shrink-0 items-center gap-6 pr-6" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-6 whitespace-nowrap">
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.3em]">{NOMBRE_APP}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </li>
      ))}
    </ul>
  )
  return (
    <div className="overflow-hidden bg-vino text-brand-50">
      <p className="sr-only">{FRASES.join('. ')}.</p>
      {/* Al bajar rápido, las letras se inclinan; abajo, el nombre corre en sentido contrario. */}
      <motion.div style={{ skewX: inclinar }} className="py-5">
        <div className="marquesina flex w-max">
          {fila}
          {fila}
        </div>
      </motion.div>
      <div className="border-t border-white/10 bg-brand-700 py-2.5 text-white">
        <div className="marquesina marquesina-reversa flex w-max">
          {nombre}
          {nombre}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Manifiesto: la promesa en letras grandes que se encienden al bajar, y cifras reales que cuentan */
/* ------------------------------------------------------------------ */

const MANIFIESTO = `Conectamos a tu perro con paseadores cercanos. Tú eliges el horario, ves cada paseo en fotos y pagas al terminar.`

function Manifiesto() {
  const cifras = [
    { n: 4, t: 'pasos y listo' },
    { n: COMPROBACIONES.length, t: 'comprobaciones del equipo' },
    { n: 2, t: 'distritos para empezar' },
    { n: 0, t: 'soles al reservar' },
  ]
  return (
    <section aria-label="Lo que hacemos" className="relative overflow-hidden bg-paper px-4 py-20 sm:px-6 md:py-32">
      <HuellasFlotantes className="text-brand-100" />
      <div className="relative mx-auto max-w-5xl">
        <TextoQueSeEnciende
          texto={MANIFIESTO}
          resaltar={['cercanos.', 'fotos', 'terminar.']}
          className="font-display text-[28px] font-bold leading-[1.18] text-ink sm:text-[38px] md:text-[54px]"
        />
        <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink/10 pt-10 md:grid-cols-4">
          {cifras.map((c, i) => (
            <motion.li key={c.t} {...aparecer} transition={{ ...aparecer.transition, delay: i * 0.1 }}>
              <Contador hasta={c.n} className="font-display block text-[56px] font-bold leading-none text-brand-700 md:text-[72px]" />
              <span className="mt-2 block text-[15px] font-bold text-ink-soft">{c.t}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Ventana: una foto que se abre al bajar, con el título encima (como las fotos de BAO London) */
/* ------------------------------------------------------------------ */

function Ventana() {
  const ref = useRef<HTMLElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start start'],
  })
  const recorte = useTransform(
    scrollYProgress,
    [0, 1],
    reducir ? ['inset(0% 0% round 0px)', 'inset(0% 0% round 0px)'] : ['inset(14% 22% round 48px)', 'inset(0% 0% round 0px)'],
  )
  const escala = useTransform(scrollYProgress, [0, 1], reducir ? [1, 1] : [1.35, 1])
  const texto = useTransform(scrollYProgress, [0.45, 1], reducir ? [0, 0] : [60, 0])
  return (
    <section ref={ref} aria-labelledby="ventana-titulo" className="relative h-[88svh] min-h-[520px] overflow-hidden bg-vino-900">
      <motion.div className="absolute inset-0 overflow-hidden" style={{ clipPath: recorte }}>
        <motion.div className="absolute inset-0" style={{ scale: escala }}>
          <Image src={FOTOS_PERROS.corriendo.src} alt="" fill sizes="100vw" className="object-cover" />
        </motion.div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(46,16,20,.35)_0%,rgba(46,16,20,.55)_55%,rgba(46,16,20,.8)_100%)]" />
      </motion.div>
      <motion.div style={{ y: texto }} className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <p className="eyebrow text-brand-200">Cada paseo</p>
        <h2 id="ventana-titulo" className="font-display mt-4 max-w-3xl text-[40px] font-bold leading-[1.02] text-balance md:text-[76px]">
          Míralo feliz desde tu celular.
        </h2>
        <a href="#como-funciona" className={cn(btnContorno, 'mt-9')}>
          Ver cómo funciona <ArrowRight size={18} aria-hidden />
        </a>
        <p className="absolute bottom-5 text-[13px] text-white/70">Foto referencial de Unsplash.</p>
      </motion.div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Dos caminos: un panel para cada público (paneles altos, como Geospace) */
/* ------------------------------------------------------------------ */

/** Envuelve algo para que entre desde un lado, ligado al scroll. */
function EntraDeLado({ lado, children }: { lado: 1 | -1; children: React.ReactNode }) {
  const { ref, style } = useEntradaLateral<HTMLDivElement>(lado)
  return (
    <motion.div ref={ref} style={style}>
      {children}
    </motion.div>
  )
}

function Caminos({ onEntrar }: { onEntrar: () => void }) {
  const paneles = [
    {
      id: 'familias',
      eyebrow: 'Para familias',
      titulo: 'Tu perro, en buenas manos',
      fondo: 'bg-brand-700',
      puntos: [
        `Eliges día, hora y duración: ${DURATIONS.join(', ')} minutos`,
        'Eliges paseador o propones cuánto pagar',
        'Pequeño, mediano o grande: paseos con perros de su tamaño',
        `Fotos durante el paseo y pagas al terminar, a ${NOMBRE_CORTO}`,
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
      titulo: 'Gana dinero entre clases',
      fondo: 'bg-vino-800',
      puntos: [
        `Tu tarifa: de S/ ${CONFIG.tarifaMinima} a S/ ${CONFIG.tarifaMaxima} por hora`,
        'Tus horarios, sin chocar con tus clases',
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
    <section id="caminos" className="relative scroll-mt-20 overflow-hidden bg-vino px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24">
      <HuellasFlotantes className="text-white/[0.06]" />
      <div className="relative mx-auto max-w-6xl">
        <motion.h2 {...aparecer} className="font-display text-center text-[30px] font-bold text-white md:text-[42px]">
          ¿Quién eres?
        </motion.h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {paneles.map((p, i) => (
            <EntraDeLado key={p.id} lado={i === 0 ? -1 : 1}>
              <motion.article
                id={p.id}
                whileHover={{ y: -6 }}
                className={cn(
                  'group relative scroll-mt-24 overflow-hidden rounded-[2rem] p-7 text-white ring-1 ring-white/10 md:min-h-[480px] md:p-10',
                  p.fondo,
                )}
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
            </EntraDeLado>
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
    t: 'Reserva en un minuto',
    d: `Eliges día, hora y duración (${DURATIONS.join(', ')} minutos). Reservar no cuesta nada.`,
  },
  {
    icon: KeyRound,
    t: 'Entrega con código',
    d: 'Tu perro sale solo cuando das tu código de 4 dígitos.',
  },
  {
    icon: Camera,
    t: 'Míralo pasear',
    d: 'Recibes fotos con hora y lugar, tomadas con la cámara de la app.',
  },
  {
    icon: Wallet,
    t: 'Recíbelo y paga',
    d: `Confirmas que llegó bien y le pagas a ${NOMBRE_CORTO}. ${NOMBRE_CORTO} le paga al paseador.`,
  },
]

function ComoFunciona() {
  const [activo, setActivo] = useState(0)
  const lista = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({
    target: lista,
    offset: ['start 70%', 'end 60%'],
  })
  const linea = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  return (
    <Seccion id="como-funciona" className="bg-paper">
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <Titulo eyebrow="Cómo funciona">Así de fácil.</Titulo>
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
        <ol ref={lista} className="relative space-y-5 pl-5 md:space-y-10 md:py-10 md:pl-8">
          {/* La línea se llena mientras bajas por los pasos. */}
          <span aria-hidden className="absolute bottom-0 left-0 top-0 w-1 rounded-full bg-sand md:my-10">
            <motion.span style={{ scaleY: linea }} className="block h-full w-full origin-top rounded-full bg-brand-600" />
          </span>
          {PASOS.map((p, i) => (
            <motion.li key={p.t} onViewportEnter={() => setActivo(i)} viewport={{ amount: 0.6 }}>
              <motion.div
                initial={{ opacity: 0, x: 60, rotate: 2 }}
                whileInView={{ opacity: 1, x: 0, rotate: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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

/* ------------------------------------------------------------------ */
/* Tranquilidad: tres paneles altos que se abren como artículo (como Geospace) */
/* ------------------------------------------------------------------ */

const HISTORIAS = [
  {
    id: 'fotos',
    icon: Camera,
    t: 'Fotos con hora y lugar',
    corto: 'Ves a tu perro durante el paseo.',
    fondo: 'bg-sand text-ink',
    parrafos: [
      'Durante el paseo, el paseador toma fotos con la cámara de la app. Cada foto guarda la hora y el lugar donde se tomó, así sabes cómo va el paseo.',
      'Además, en el camino marca puntos de control. Tú los ves desde tu celular, sin tener que escribirle a nadie.',
    ],
  },
  {
    id: 'codigo',
    icon: KeyRound,
    t: 'Código de recojo',
    corto: 'Tu perro sale solo con tu código.',
    fondo: 'bg-brand-700 text-white',
    parrafos: [
      'Cuando el paseador llega a tu casa, le das un código de 4 dígitos que ves en tu app. Así el paseo empieza solo cuando tú entregas a tu perro.',
      'Al volver, tocas «Recibí a tu perro» para confirmar que llegó bien. Si algo no está bien, lo reportas desde el mismo paseo.',
    ],
  },
  {
    id: 'pago',
    icon: Wallet,
    t: 'Pagas al terminar',
    corto: `A ${NOMBRE_CORTO}, no al paseador.`,
    fondo: 'bg-vino-900 text-white',
    parrafos: [
      `No pagas nada al reservar. Al terminar el paseo le pagas a ${NOMBRE_CORTO} con Yape, Plin o transferencia, y pagas solo el precio del paseo.`,
      `${NOMBRE_CORTO} le paga al paseador después de confirmar tu pago. ${TEXTOS_PAGO.honestidad}`,
    ],
  },
] as const

function Articulo({ indice, onCerrar, onSiguiente }: { indice: number; onCerrar: () => void; onSiguiente: () => void }) {
  const h = HISTORIAS[indice]
  const cerrar = useRef<HTMLButtonElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({ container: caja })
  const x = useTransform(scrollYProgress, [0, 1], ['0%', reducir ? '0%' : '-35%'])

  useEffect(() => {
    cerrar.current?.focus()
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', tecla)
    }
  }, [onCerrar])

  useEffect(() => {
    caja.current?.scrollTo({ top: 0 })
  }, [indice])

  // Va directo al <body>: las secciones se achican al bajar y eso movería un panel fijo que esté adentro.
  return createPortal(
    <motion.div className="fixed inset-0 z-[70] flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* A la izquierda queda el panel elegido, como en Geospace. */}
      <button type="button" aria-label="Cerrar" tabIndex={-1} onClick={onCerrar} className={cn('hidden flex-1 md:block', h.fondo)}>
        <span className="grid h-full place-items-center">
          <h.icon size={120} strokeWidth={1.2} className="opacity-25" aria-hidden />
        </span>
      </button>
      <motion.div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby="articulo-titulo"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-canvas md:w-[58%] md:shadow-[-30px_0_60px_-30px_rgba(20,8,9,.5)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-canvas/90 px-5 py-3 backdrop-blur md:px-10">
          <p className="eyebrow inline-flex items-center gap-2 text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> 0{indice + 1} / 0{HISTORIAS.length}
          </p>
          <button
            ref={cerrar}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white"
          >
            <X size={22} aria-hidden />
          </button>
        </div>
        <motion.p
          aria-hidden
          style={{ x }}
          className="font-display mt-6 whitespace-nowrap px-5 text-[64px] font-bold uppercase leading-none text-brand-600 md:px-10 md:text-[110px]"
        >
          {h.t}
        </motion.p>
        <article className="px-5 pb-16 md:px-10">
          <h2 id="articulo-titulo" className="font-display mt-8 text-[30px] font-bold leading-tight text-ink md:text-[40px]">
            {h.t}
          </h2>
          <p className="mt-6 text-[18px] leading-relaxed text-ink first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-[68px] first-letter:font-bold first-letter:leading-[0.8] first-letter:text-brand-700">
            {h.parrafos[0]}
          </p>
          <div className={cn('my-10 grid h-56 place-items-center rounded-[2rem] md:h-72', h.fondo)} aria-hidden>
            <h.icon size={72} strokeWidth={1.4} />
          </div>
          <p className="text-[18px] leading-relaxed text-ink-soft">{h.parrafos[1]}</p>
          {/* «Siguiente», con el botón redondo de flecha (como «Read full article» en Geospace). */}
          <button
            type="button"
            onClick={onSiguiente}
            className="group mt-14 flex w-full items-center justify-between gap-4 border-t border-ink/10 pt-6 text-left"
          >
            <span>
              <span className="eyebrow block text-ink-soft">Siguiente</span>
              <span className="font-display mt-1 block text-[22px] font-bold text-ink md:text-[26px]">{HISTORIAS[(indice + 1) % HISTORIAS.length].t}</span>
            </span>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-700 text-white transition-transform group-hover:translate-x-1">
              <ArrowRight size={22} aria-hidden />
            </span>
          </button>
        </article>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

function Tranquilidad() {
  const [abierto, setAbierto] = useState<number | null>(null)
  const origen = useRef<HTMLButtonElement | null>(null)
  const cerrar = useCallback(() => {
    setAbierto(null)
    origen.current?.focus()
  }, [])
  return (
    <section id="tranquilidad" className="scroll-mt-20 bg-canvas pt-16 md:pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Titulo eyebrow="Tu tranquilidad">Tranquilo en cada paseo.</Titulo>
      </div>
      <ul className="mt-10 flex flex-col md:h-[78vh] md:max-h-[720px] md:min-h-[520px] md:flex-row">
        {HISTORIAS.map((h, i) => (
          <motion.li
            key={h.id}
            className="relative flex min-h-[260px] md:min-h-0 md:flex-1"
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            whileHover={{ flexGrow: 1.5 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 30,
              delay: i * 0.12,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                origen.current = e.currentTarget
                setAbierto(i)
              }}
              className={cn('group flex w-full flex-col justify-between p-6 text-left md:p-10', h.fondo)}
            >
              <span className="font-display text-[15px] font-bold opacity-80">0{i + 1}</span>
              <span>
                <h.icon size={40} strokeWidth={1.6} className="transition-transform duration-500 group-hover:-translate-y-2" aria-hidden />
                <span className="font-display mt-5 block text-[28px] font-bold uppercase leading-[1.02] md:text-[34px]">{h.t}</span>
                <span className="mt-2 block text-[16px] font-semibold opacity-85">{h.corto}</span>
                <span className="mt-6 inline-flex items-center gap-3 text-[15px] font-extrabold">
                  <span className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-current transition group-hover:bg-white/15">
                    <ArrowRight size={18} aria-hidden />
                  </span>
                  Leer más
                </span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
      <AnimatePresence>
        {abierto !== null && <Articulo key="articulo" indice={abierto} onCerrar={cerrar} onSiguiente={() => setAbierto((abierto + 1) % HISTORIAS.length)} />}
      </AnimatePresence>
    </section>
  )
}

function Confianza() {
  return (
    <Seccion id="confianza" className="relative overflow-hidden bg-vino-800 text-white">
      <HuellasFlotantes className="text-white/[0.05]" />
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Titulo eyebrow="Confianza" claro>
            {textoHastaComprobaciones()} antes de pasear.
          </Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/80">
            Solo ves las comprobaciones que el equipo ya hizo. Nada inventado.
          </motion.p>
        </div>
        <motion.ul
          initial="oculto"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          transition={{ staggerChildren: 0.12 }}
          className="space-y-4 lg:pt-10"
        >
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
            <motion.li
              key={r.t}
              variants={{
                oculto: { opacity: 0, x: 40 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
                <r.icon size={20} aria-hidden />
              </span>
              <span>
                <span className="block text-[17px] font-extrabold">{r.t}</span>
                <span className="block text-[15px] text-white/75">{r.d}</span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
        <motion.div {...aparecer} className="min-w-0 lg:col-span-2">
          {/* Las comprobaciones en carrusel, con flechas y barra de avance (como Good Dog). */}
          <Carrusel etiqueta="Comprobaciones de cada paseador" claro>
            {COMPROBACIONES.map((c, i) => (
              <li key={c.id} className="w-[82%] shrink-0 snap-start rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10 sm:w-[320px]">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-white">
                    <Check size={19} strokeWidth={3} aria-hidden />
                  </span>
                  <span className="font-display text-[15px] font-bold text-brand-200">
                    {String(i + 1).padStart(2, '0')} / {String(COMPROBACIONES.length).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-5 text-[18px] font-extrabold">{c.titulo}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">{c.apoyo}</p>
              </li>
            ))}
          </Carrusel>
        </motion.div>
      </div>
    </Seccion>
  )
}

function PawMarkIcon({ size = 20 }: { size?: number; 'aria-hidden'?: boolean }) {
  return <PawMark style={{ width: size, height: size }} />
}

function Precios({ onEntrar }: { onEntrar: () => void }) {
  const ficha = useRef<HTMLDivElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ficha,
    offset: ['start end', 'start 40%'],
  })
  const girarX = useTransform(scrollYProgress, [0, 1], reducir ? [0, 0] : [24, 0])
  const subir = useTransform(scrollYProgress, [0, 1], reducir ? [0, 0] : [80, 0])
  return (
    <Seccion id="precios" className="relative overflow-hidden bg-canvas">
      <HuellasFlotantes className="text-brand-100/70" />
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <Titulo eyebrow="Precios y pago">Pagas al terminar. Ni un sol antes.</Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            {TEXTOS_PAGO.honestidad} Sin cargos extra: Yape, Plin o transferencia.
          </motion.p>
          <motion.div {...aparecer} className="mt-8">
            <button type="button" onClick={onEntrar} className={btnPrincipal}>
              {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
            </button>
          </motion.div>
        </div>
        <div className="[perspective:1200px]">
          <motion.div
            ref={ficha}
            style={{ rotateX: girarX, y: subir }}
            className="origin-bottom overflow-hidden rounded-[2rem] bg-paper shadow-card ring-1 ring-ink/5"
          >
            <div className="relative overflow-hidden bg-brand-700 px-7 py-8 text-white">
              <PawPattern id="precios-huellas" />
              <p className="relative text-[15px] font-bold text-brand-100">Cada paseador pone su tarifa</p>
              <p className="font-display relative mt-1 text-[44px] font-bold leading-none md:text-[56px]">
                S/ <Contador hasta={CONFIG.tarifaMinima} /> <span className="text-brand-200">a</span> <Contador hasta={CONFIG.tarifaMaxima} />
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
      </div>
    </Seccion>
  )
}

const ZONAS = {
  'san-isidro': {
    t: 'San Isidro',
    d: 'Paseadores que viven o estudian en el distrito, cerca de sus parques.',
  },
  'jesus-maria': {
    t: 'Jesús María',
    d: 'Paseadores vecinos, con parques cerca de tu casa.',
  },
} as const
type Zona = keyof typeof ZONAS

function Cobertura() {
  const [zona, setZona] = useState<Zona>('san-isidro')
  const z = ZONAS[zona]
  return (
    <section id="cobertura" className="scroll-mt-20 overflow-hidden bg-paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Titulo eyebrow="Dónde estamos">Primero, tu barrio.</Titulo>
      </div>
      {/* Los distritos en letras gigantes, que se deslizan al bajar (como Geospace). */}
      <FranjaGigante texto="San Isidro · Jesús María · San Isidro ·" className="mt-8 text-brand-600/90" />
      <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <PestanasSubrayadas
          id="zonas"
          etiqueta="Distritos"
          valor={zona}
          onCambio={setZona}
          opciones={(Object.keys(ZONAS) as Zona[]).map((v) => ({
            v,
            t: ZONAS[v].t,
          }))}
        />
        <div id="zonas-panel" role="tabpanel" aria-labelledby={`zonas-tab-${zona}`} className="mt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={zona}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden rounded-[2rem] bg-sand p-8 md:p-10"
            >
              <PawMark className="absolute -right-6 -top-6 h-40 w-40 rotate-12 text-sand-2" />
              <MapPin size={28} className="relative text-brand-700" aria-hidden />
              <h3 className="font-display relative mt-4 text-[34px] font-bold leading-none text-ink md:text-[42px]">{z.t}</h3>
              <p className="relative mt-3 max-w-sm text-[16px] leading-relaxed text-ink-soft">{z.d}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-6 text-[15px] text-ink-soft">¿Vives en otro distrito? Pronto llegamos.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* La app: el ÚNICO lugar con Google Play y App Store */
/* ------------------------------------------------------------------ */

/** Las fichas del abanico: lo que hace la app, sin pantallas inventadas. */
const FICHAS_APP = [
  {
    id: 'icono',
    contenido: (
      <div className="grid h-[300px] place-items-center rounded-[2.4rem] bg-brand-50 shadow-[0_30px_60px_-20px_rgba(91,34,41,.55)] ring-1 ring-vino/10">
        <div className="text-center">
          <Image src="/marca/logo-mark.png" alt="" width={482} height={512} className="mx-auto h-32 w-auto" />
          <p className="font-display mt-4 text-[20px] font-bold uppercase text-brand-700">{NOMBRE_CORTO}</p>
          <p className="font-display text-[13px] font-bold uppercase tracking-[0.3em] text-vino">{NOMBRE_APP.split(' ').slice(1).join(' ')}</p>
        </div>
      </div>
    ),
  },
  ...[
    {
      id: 'foto',
      icon: Camera,
      t: 'Foto del paseo',
      d: 'Con hora y lugar',
      fondo: 'bg-brand-700',
    },
    {
      id: 'codigo',
      icon: KeyRound,
      t: 'Código de recojo',
      d: 'Lo das tú al entregar',
      fondo: 'bg-vino-800',
    },
    {
      id: 'pago',
      icon: Wallet,
      t: 'Pagas al terminar',
      d: `A ${NOMBRE_CORTO}, no al paseador`,
      fondo: 'bg-ink',
    },
  ].map((c) => ({
    id: c.id,
    contenido: (
      <div className={cn('flex h-[300px] flex-col justify-between rounded-[2.4rem] p-7 text-white shadow-[0_30px_60px_-20px_rgba(20,8,9,.55)]', c.fondo)}>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15">
          <c.icon size={26} aria-hidden />
        </span>
        <span>
          <span className="font-display block text-[24px] font-bold uppercase leading-tight">{c.t}</span>
          <span className="mt-1 block text-[15px] font-semibold text-white/80">{c.d}</span>
        </span>
      </div>
    ),
  })),
]

function App() {
  return (
    <Seccion id="app" className="relative overflow-hidden bg-sand">
      <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
        <div>
          <Titulo eyebrow="La app">{NOMBRE_APP} en tu bolsillo.</Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            Hoy funciona desde tu navegador, sin instalar nada. La app ya está en camino.
          </motion.p>
          <motion.div {...aparecer} className="mt-8">
            <StoreBadges />
          </motion.div>
          <motion.p {...aparecer} className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-ink-soft">
            <Smartphone size={17} aria-hidden /> Todavía no están en las tiendas: avisaremos cuando salgan.
          </motion.p>
        </div>
        {/* Fichas en abanico que pasan solas (como el carrusel de Spaidra). */}
        <Abanico fichas={FICHAS_APP} etiqueta="Lo que hace la app" />
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
          <Titulo eyebrow="Quiénes somos">Tres estudiantes que aman a los perros.</Titulo>
          <motion.p {...aparecer} className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
            Somos un piloto en Lima: empezamos con pocas familias para hacerlo bien. Lo que ves aquí es lo que la app hace hoy.
          </motion.p>
        </div>
      </div>
    </Seccion>
  )
}

function Final({ onEntrar }: { onEntrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null)
  const reducir = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: caja,
    offset: ['start end', 'center center'],
  })
  const escala = useTransform(scrollYProgress, [0, 1], reducir ? [1, 1] : [0.82, 1])
  const redondeo = useTransform(scrollYProgress, [0, 1], reducir ? [40, 40] : [120, 40])
  const giro = useTransform(scrollYProgress, [0, 1], reducir ? [0, 0] : [-180, 0])
  return (
    <Seccion className="bg-canvas pt-0 md:pt-0">
      <motion.div
        ref={caja}
        style={{ scale: escala, borderRadius: redondeo }}
        className="relative overflow-hidden bg-vino-800 px-6 py-14 text-center text-white md:px-12 md:py-20"
      >
        <PawPattern id="final-huellas" />
        <div className="relative">
          <motion.div style={{ rotateY: giro }} className="mx-auto w-fit">
            <Image src="/marca/logo-mark.png" alt="" width={96} height={102} className="mx-auto h-24 w-auto rounded-full bg-brand-50 p-3" />
          </motion.div>
          <h2 className="font-display mx-auto mt-6 max-w-2xl text-[34px] font-bold leading-[1.05] text-balance md:text-[50px]">
            Paseos felices, dueños <span className="text-brand-300">tranquilos</span>.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onEntrar} className={btnPrincipal}>
              {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
            </button>
            <Link href="/paseador" className={btnContorno}>
              <Bike size={19} aria-hidden /> {TEXTO_PORTADA.serPaseador}
            </Link>
          </div>
          {/* Redes del anuncio: cada seguidor cuenta. */}
          <p className="mt-10 text-[15px] font-bold text-brand-100">Síguenos y compártelo: cada seguidor cuenta.</p>
          <Redes claro className="mt-4 justify-center" />
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

/** El nombre en grande al final, con las letras subiendo una por una (como el pie de TAG Heuer). */
function MarcaGigante() {
  const letras = NOMBRE_APP.toUpperCase().split('')
  return (
    <motion.p
      aria-hidden
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
      transition={{ staggerChildren: 0.035 }}
      className="font-display mx-auto mt-14 flex max-w-6xl justify-between overflow-hidden text-[8.4vw] font-bold leading-[1.1] text-brand-200/90 lg:text-[104px]"
    >
      {letras.map((l, i) => (
        <motion.span
          key={i}
          variants={{ oculto: { y: '110%' }, visible: { y: 0 } }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {l === ' ' ? '\u00a0' : l}
        </motion.span>
      ))}
    </motion.p>
  )
}

function Pie({ onEntrar }: { onEntrar: () => void }) {
  return (
    <footer className="bg-vino-900 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-14 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="cream" size={44} />
          <p className="font-display mt-4 max-w-xs text-[18px] font-bold leading-snug text-brand-100">{LEMA}</p>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-white/75">{TEXTO_PORTADA.piloto}, Lima.</p>
          <p className="mt-6 text-[14px] font-extrabold text-brand-200">Síguenos</p>
          <Redes claro className="mt-3" />
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
      <MarcaGigante />
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-[13px] text-white/70 sm:flex-row sm:justify-between">
        <p>© {NOMBRE_APP}. Proyecto piloto de estudiantes.</p>
        <p>San Isidro · Jesús María · Lima, Perú</p>
      </div>
      <div className="mx-auto mt-3 max-w-6xl text-[13px] text-white/70">
        <p>Fotos de la entrada: Unsplash. No son paseos de {NOMBRE_CORTO}.</p>
      </div>
    </footer>
  )
}

/** Portada pública (la web de la marca). «Entrar» o «Buscar paseador» abre la app de la familia; «Postular» lleva a /paseador. */
/** Membresías de las familias y niveles del paseador (lib/planes.ts). Mientras no se cobre, lo dicen las tarjetas. */
function Planes() {
  return (
    <Seccion id="planes" className="bg-paper">
      <Titulo eyebrow="Planes">Gratis para empezar.</Titulo>
      <motion.p {...aparecer} className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">
        Más reservas y prioridad si pasea seguido.
      </motion.p>
      <PlanesFamilia className="mt-8" />
    </Seccion>
  )
}

/** Para paseadores: niveles con menos comisión, academia y grupos que entran juntos. */
function Profesionales() {
  return (
    <Seccion id="niveles" className="bg-vino">
      <Titulo eyebrow="Paseadores" claro>
        Sube de nivel, paga menos.
      </Titulo>
      <motion.p {...aparecer} className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/80">
        Postulas en minutos. Tu grupo entra junto.
      </motion.p>
      <NivelesPaseador claro className="mt-8" />
      <motion.div {...aparecer} className="mt-8 rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
        <p className="eyebrow text-brand-200">Academia</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {ACADEMIA.map((c) => (
            <li key={c.id} className="rounded-full bg-white/10 px-3 py-1.5 text-[14px] font-bold text-white">
              {c.nombre} · {c.minutos} min
            </li>
          ))}
        </ul>
      </motion.div>
    </Seccion>
  )
}

/** Qué pasa si se pierde el GPS, se apaga el celular, cancelan o el perro se enferma. */
function SiAlgoSaleMal() {
  return (
    <Seccion id="protocolos" className="bg-canvas">
      <Titulo eyebrow="Reglas claras">Si algo sale mal.</Titulo>
      <motion.p {...aparecer} className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">
        Cada caso tiene pasos y alguien responsable.
      </motion.p>
      <Protocolos className="mt-8" />
    </Seccion>
  )
}

/** Servicios (hoy y pronto), veterinarias que quieran sumarse y distritos con su serenazgo. */
function Servicios() {
  const ayuda = contactoPrincipal()
  const aliada = ayuda ? enlaceWhatsApp(ayuda.whatsapp || ayuda.telefono, `Hola, tengo una veterinaria y quiero ser aliada de ${NOMBRE_CORTO}.`) : null
  return (
    <Seccion id="servicios" className="bg-paper">
      <Titulo eyebrow="Servicios y distritos">Hoy paseos. Pronto más.</Titulo>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICIOS.map((sv) => (
          <motion.li key={sv.id} {...aparecer} className="rounded-3xl border border-ink/10 bg-canvas p-5">
            <p className="flex items-center justify-between gap-2">
              <span className="font-display text-[20px] font-bold text-ink">{sv.nombre}</span>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-extrabold', sv.estado === 'activo' ? 'bg-forest text-white' : 'bg-sand text-ink')}>
                {sv.estado === 'activo' ? 'Hoy' : 'Pronto'}
              </span>
            </p>
            <p className="mt-1.5 text-[15px] leading-snug text-ink-soft">{sv.detalle}</p>
          </motion.li>
        ))}
      </ul>
      <motion.div {...aparecer} className="mt-6 rounded-3xl bg-sand p-5">
        <p className="font-display text-[22px] font-bold text-ink">¿Tienes una veterinaria?</p>
        <ul className="mt-2 space-y-1 text-[15px] text-ink">
          {BENEFICIOS_ALIADO.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {aliada ? (
          <a href={aliada} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-vino px-5 text-[15px] font-extrabold text-white">
            Quiero ser aliada
          </a>
        ) : (
          <p className="mt-4 text-[14px] text-ink-soft">Escríbenos por nuestras redes.</p>
        )}
      </motion.div>
      <h3 className="font-display mt-12 text-[26px] font-bold text-ink">Distritos y serenazgo</h3>
      <DistritosSerenazgo className="mt-4" />
    </Seccion>
  )
}

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
        {/* Cada bloque es una «capa»: se queda quieto al terminar y el siguiente sube encima, como cartas (BAO London). */}
        <main>
          <Capa primera className="bg-canvas">
            <Entrada />
          </Capa>
          <Capa className="bg-canvas">
            <Portada onEntrar={onEntrar} />
            <Marquesina />
          </Capa>
          <Capa className="bg-paper">
            <Manifiesto />
          </Capa>
          <Capa className="bg-vino">
            <Caminos onEntrar={onEntrar} />
          </Capa>
          <Capa className="bg-vino-900">
            <Ventana />
          </Capa>
          <Capa className="bg-paper">
            <ComoFunciona />
          </Capa>
          <Capa className="bg-canvas">
            <Tranquilidad />
          </Capa>
          <Capa className="bg-vino-800">
            <Confianza />
          </Capa>
          <Capa className="bg-canvas">
            <Precios onEntrar={onEntrar} />
          </Capa>
          <Capa className="bg-paper">
            <Planes />
          </Capa>
          <Capa className="bg-vino">
            <Profesionales />
          </Capa>
          <Capa className="bg-canvas">
            <SiAlgoSaleMal />
          </Capa>
          <Capa className="bg-paper">
            <Cobertura />
          </Capa>
          <Capa className="bg-paper">
            <Servicios />
          </Capa>
          <Capa className="bg-sand">
            <App />
          </Capa>
          <Capa ultima className="bg-canvas">
            <QuienesSomos />
            <Preguntas />
            <Final onEntrar={onEntrar} />
          </Capa>
        </main>
        <Pie onEntrar={onEntrar} />
      </div>
    </MotionConfig>
  )
}
