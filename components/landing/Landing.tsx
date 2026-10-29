'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MotionConfig, motion } from 'framer-motion'
import {
  ArrowRight,
  Bike,
  CalendarCheck,
  Camera,
  Check,
  ChevronDown,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  MapPin,
  Siren,
  Wallet,
} from 'lucide-react'
import { CONFIG, NOMBRE_APP, NOMBRE_CORTO, TEXTOS_PAGO, textoPlanLunesViernes } from '@/lib/config'
import { DURATIONS } from '@/lib/data'
import { COMPROBACIONES, MAX_PERROS_POR_PASEO, REGLA_NUEVO, textoHastaComprobaciones } from '@/lib/verificacion'
import { cn } from '@/lib/utils'
import { ChasquiHead } from '../ui/Chasqui'
import { Logo, PawMark } from '../ui/Logo'
import { StoreBadges } from '../ui/StoreBadges'
import { PawPattern } from '../Onboarding'

/** Textos de la portada pública. Todo lo que se promete aquí existe en la app (ver la skill patitas-connect, sección 6). */
export const TEXTO_PORTADA = {
  piloto: 'Piloto en San Isidro y Jesús María',
  entrar: 'Entrar',
  reservar: 'Reservar un paseo',
  serPaseador: 'Quiero ser paseador',
} as const

const NAV = [
  { href: '#como-funciona', t: 'Cómo funciona' },
  { href: '#confianza', t: 'Confianza' },
  { href: '#precios', t: 'Precios' },
  { href: '#paseadores', t: 'Paseadores' },
  { href: '#preguntas', t: 'Preguntas' },
]

const btnPrincipal =
  'btn-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-700 px-6 text-[16px] font-extrabold text-white shadow-press'
const btnSecundario =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink/15 bg-paper px-6 text-[16px] font-extrabold text-ink transition hover:border-ink/40 active:scale-[0.98]'

const aparecer = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.3 },
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
      <h2 className={cn('font-display mt-3 text-[34px] font-bold leading-[1.05] tracking-tight text-balance md:text-[48px]', claro ? 'text-white' : 'text-ink')}>
        {children}
      </h2>
    </motion.div>
  )
}

/** Tarjeta flotante del dibujo de la portada: así se ven los avisos dentro de la app. */
function Aviso({ icon: Icon, t, d, className }: { icon: typeof Camera; t: string; d: string; className?: string }) {
  return (
    <div className={cn('absolute hidden items-center gap-3 rounded-2xl sm:flex bg-paper px-3.5 py-3 shadow-pop ring-1 ring-ink/5', className)}>
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

function Portada({ onEntrar }: { onEntrar: () => void }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(40rem 28rem at 8% 0%, rgba(255,228,204,.95), transparent 60%), radial-gradient(36rem 30rem at 100% 100%, rgba(253,199,154,.45), transparent 60%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.05fr_1fr] md:gap-8">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-paper px-3.5 py-1.5 text-[13px] font-extrabold text-ink ring-1 ring-ink/10"
          >
            <span className="h-2 w-2 rounded-full bg-forest" aria-hidden /> {TEXTO_PORTADA.piloto}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display mt-6 text-[44px] font-bold leading-[0.98] tracking-tight text-ink text-balance sm:text-[58px] lg:text-[72px]"
          >
            El paseo <span className="italic text-brand-700">con cuidado</span> que tu mejor amigo merece.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 max-w-xl text-[18px] leading-relaxed text-ink-soft md:text-[20px]"
          >
            Vecinos estudiantes de San Isidro y Jesús María pasean a tu perro. Ves fotos con hora y lugar, entregas con un código y
            pagas al terminar.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <button type="button" onClick={onEntrar} className={btnPrincipal}>
              {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
            </button>
            <Link href="/paseador" className={btnSecundario}>
              <Bike size={19} aria-hidden /> {TEXTO_PORTADA.serPaseador}
            </Link>
          </motion.div>
          <div className="mt-8">
            <p className="text-[14px] font-bold text-ink">Pronto también como app para tu celular:</p>
            <StoreBadges className="mt-3" />
          </div>
        </div>

        {/* Dibujo: el isotipo grande, con los avisos que la familia ve durante un paseo. */}
        <div className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[460px] md:max-w-[520px]">
          <div className="absolute inset-[4%] overflow-hidden rounded-full bg-brand-600">
            <PawPattern id="portada-huellas" />
          </div>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
            className="absolute inset-[15%] grid place-items-center rounded-full bg-brand-50 shadow-[0_30px_60px_-24px_rgba(124,45,18,.6)]"
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
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <Aviso icon={Camera} t="Foto del paseo" d="Con hora y lugar" className="left-0 top-[12%] sm:-left-4" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <Aviso icon={KeyRound} t="Código de recojo" d="Lo das tú al entregar" className="right-0 top-[46%] sm:-right-4" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
            <Aviso icon={Wallet} t="Pagas al terminar" d={`A ${NOMBRE_CORTO}, no al paseador`} className="bottom-[2%] left-[6%]" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const PASOS = [
  { icon: CalendarCheck, t: 'Pide o reserva', d: `Eliges día, hora y duración (${DURATIONS.join(', ')} minutos). No pagas nada al reservar.` },
  { icon: KeyRound, t: 'Entrega con código', d: 'Le das al paseador un código de 4 dígitos al entregar a tu perro.' },
  { icon: Camera, t: 'Fotos y puntos de control', d: 'Durante el paseo recibes fotos con hora y lugar, tomadas con la cámara de la app.' },
  { icon: Wallet, t: 'Recibes y pagas', d: `Tocas «Recibí a tu perro» y le pagas a ${NOMBRE_CORTO}. ${NOMBRE_CORTO} le paga al paseador.` },
]

function ComoFunciona() {
  return (
    <Seccion id="como-funciona" className="bg-paper">
      <Titulo eyebrow="Cómo funciona">Cuatro pasos, sin sorpresas.</Titulo>
      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PASOS.map((p, i) => (
          <motion.li key={p.t} {...aparecer} transition={{ duration: 0.3, delay: i * 0.06 }} className="rounded-3xl bg-canvas p-6 ring-1 ring-ink/5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-brand-50">
                <p.icon size={22} aria-hidden />
              </span>
              <span className="font-display text-[40px] font-bold leading-none text-brand-200" aria-hidden>
                {i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-[19px] font-extrabold text-ink">{p.t}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{p.d}</p>
          </motion.li>
        ))}
      </ol>
    </Seccion>
  )
}

function Confianza() {
  return (
    <Seccion id="confianza" className="relative overflow-hidden bg-ink text-white">
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
              { icon: GraduationCap, t: 'Primeros paseos acompañados', d: `En sus primeros ${REGLA_NUEVO.paseos} paseos lleva máximo ${REGLA_NUEVO.maxPerros} perros; después, ${MAX_PERROS_POR_PASEO}.` },
              { icon: PawMarkIcon, t: 'Perros del mismo tamaño', d: 'Pequeños, medianos y grandes nunca se mezclan en un grupo.' },
              { icon: Siren, t: 'Si algo pasa', d: 'Botón de ayuda para llamar a Policía, Bomberos o SAMU, y «Reportar problema» para el equipo.' },
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
              { t: 'Cancelación', d: `Gratis hasta ${CONFIG.horasCancelacionGratis} horas antes` },
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
          { n: 'San Isidro', d: 'Paseadores que viven o estudian en el distrito, cerca de sus parques.' },
          { n: 'Jesús María', d: 'Paseadores vecinos, con parques cerca de tu casa.' },
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

function ParaPaseadores() {
  return (
    <Seccion id="paseadores" className="relative overflow-hidden bg-brand-700 text-white">
      <PawPattern id="paseadores-huellas" />
      <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Titulo eyebrow="Para paseadores" claro>
            Gana paseando perros de tu <span className="italic text-brand-100">barrio</span>.
          </Titulo>
          <motion.ul {...aparecer} className="mt-8 space-y-3">
            {[
              `Pones tu tarifa: entre S/ ${CONFIG.tarifaMinima} y S/ ${CONFIG.tarifaMaxima} por hora.`,
              'Eliges tus horarios y tus parques.',
              'Para estudiantes mayores de 18 que viven o estudian en San Isidro o Jesús María.',
              TEXTOS_PAGO.honestidadPaseador,
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-[17px] font-semibold">
                <Check size={20} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-100" aria-hidden /> {t}
              </li>
            ))}
          </motion.ul>
          <motion.div {...aparecer} className="mt-9">
            <Link
              href="/paseador"
              className="btn-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[16px] font-extrabold text-white shadow-press-ink"
            >
              <Bike size={19} aria-hidden /> {TEXTO_PORTADA.serPaseador}
            </Link>
          </motion.div>
        </div>
        <motion.div {...aparecer} className="mx-auto grid aspect-square w-full max-w-[320px] place-items-center rounded-full bg-brand-50">
          <ChasquiHead className="h-[78%] w-[78%]" />
        </motion.div>
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
            {NOMBRE_APP} es un piloto: empezamos con pocas familias para hacerlo bien. Una persona hace la web, otra el diseño y otra habla
            con las familias. Todo lo que ves aquí es lo que la app hace hoy.
          </motion.p>
        </div>
      </div>
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
    q: '¿Hay app para el celular?',
    a: 'Hoy funciona desde el navegador de tu celular, sin instalar nada. La app para Google Play y App Store llega pronto.',
  },
]

function Preguntas() {
  return (
    <Seccion id="preguntas" className="bg-paper">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <Titulo eyebrow="Preguntas frecuentes">Lo que nos preguntan las familias.</Titulo>
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

function Final({ onEntrar }: { onEntrar: () => void }) {
  return (
    <Seccion className="bg-canvas pt-0 md:pt-0">
      <motion.div {...aparecer} className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-14 text-center text-white md:px-12 md:py-20">
        <PawPattern id="final-huellas" />
        <div className="relative">
          <Image src="/marca/logo-mark.png" alt="" width={96} height={102} className="mx-auto h-24 w-auto rounded-full bg-brand-50 p-3" />
          <h2 className="font-display mx-auto mt-6 max-w-2xl text-[36px] font-bold leading-[1.05] tracking-tight text-balance md:text-[52px]">
            Tu perro feliz, tú <span className="italic text-brand-300">tranquilo</span>.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={onEntrar} className={btnPrincipal}>
              {TEXTO_PORTADA.reservar} <ArrowRight size={19} strokeWidth={2.6} aria-hidden />
            </button>
            <Link
              href="/paseador"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white/30 px-6 text-[16px] font-extrabold text-white transition hover:border-white/70 active:scale-[0.98]"
            >
              <Bike size={19} aria-hidden /> {TEXTO_PORTADA.serPaseador}
            </Link>
          </div>
          <StoreBadges className="mt-8 flex justify-center" />
        </div>
      </motion.div>
    </Seccion>
  )
}

function Pie({ onEntrar }: { onEntrar: () => void }) {
  return (
    <footer className="bg-ink px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-14 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="cream" size={44} />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/75">
            Paseos de perros con vecinos estudiantes. {TEXTO_PORTADA.piloto}, Lima.
          </p>
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
        <p>
          © {NOMBRE_APP}. Proyecto piloto de estudiantes.
        </p>
        <p>San Isidro · Jesús María · Lima, Perú</p>
      </div>
    </footer>
  )
}

/** Portada pública (la web de la marca). «Entrar» o «Reservar» abre la app. */
export function Landing({ onEntrar }: { onEntrar: () => void }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-canvas text-ink">
        <header className="sticky top-0 z-50 border-b border-ink/5 bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-20">
            <a href="#" aria-label={`${NOMBRE_APP}, inicio`} className="shrink-0">
              <Logo size={40} className="max-[380px]:[&>span:last-child]:hidden" />
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
            <div className="flex items-center gap-2">
              <Link
                href="/paseador"
                className="hidden min-h-11 items-center rounded-full px-4 text-[15px] font-extrabold text-ink transition hover:bg-sand sm:inline-flex"
              >
                Soy paseador
              </Link>
              <button
                type="button"
                onClick={onEntrar}
                className="btn-press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-[15px] font-extrabold text-white shadow-press-ink"
              >
                {TEXTO_PORTADA.entrar}
              </button>
            </div>
          </div>
        </header>
        <main>
          <Portada onEntrar={onEntrar} />
          <ComoFunciona />
          <Confianza />
          <Precios onEntrar={onEntrar} />
          <Cobertura />
          <ParaPaseadores />
          <QuienesSomos />
          <Preguntas />
          <Final onEntrar={onEntrar} />
        </main>
        <Pie onEntrar={onEntrar} />
      </div>
    </MotionConfig>
  )
}
