'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BadgeCheck, Bike, Check, LogOut, MapPin, PawPrint, ShieldCheck, Wallet } from 'lucide-react'
import { CONFIG, NOMBRE_APP, NOMBRE_CORTO, partesNombre } from '@/lib/config'
import { newDog, SOURCES } from '@/lib/data'
import type { LatLng } from '@/lib/geo'
import { bloquesParaMostrar, CLIENT_BLOCKS, TERMS_VERSION } from '@/lib/legal'
import type { Account, Dog } from '@/lib/types'
import { btnInk, btnPrimary, inputBase } from '@/lib/ui'
import { textoHastaComprobaciones } from '@/lib/verificacion'
import { ageFrom } from '@/lib/walkerStore'
import { cn } from '@/lib/utils'
import { distritoDe, sePuedeAtender } from '@/lib/zona'
import { TEXTO_CASA } from '@/lib/zonaTextos'
import type { DatosDeCuenta } from '@/lib/servidor/destino'
import type { ClienteAcceso } from '@/lib/servidor/tipos'
import { PantallaEntrada } from './acceso/PantallaEntrada'
import { CasaSheet, ResultadoZona } from './CasaSheet'
import { DogForm } from './DogForm'
import { TermsBlocks } from './TermsBlocks'
import { ChasquiHead } from './ui/Chasqui'
import { DogAvatar } from './ui/Dog'
import { Logo, PawMark } from './ui/Logo'

const DEMO_CODE = '482913'
const TOTAL_STEPS = 6

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 9)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ')
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="min-h-11 flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-ink">{label}</span>
        {hint && <span className="block text-[14px] text-ink-soft">{hint}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-forest' : 'bg-ink/15')}>
        <motion.span
          className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow"
          animate={{ x: on ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  )
}

/** Patrón de huellas de fondo para las pantallas naranjas. */
export function PawPattern({ id }: { id: string }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.08]" aria-hidden>
      <defs>
        <pattern id={id} width="84" height="84" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
          <g transform="scale(.5)">
            <ellipse cx="12" cy="31" rx="6.4" ry="8" transform="rotate(-24 12 31)" fill="currentColor" />
            <ellipse cx="24" cy="15" rx="7" ry="8.8" transform="rotate(-8 24 15)" fill="currentColor" />
            <ellipse cx="40" cy="15" rx="7" ry="8.8" transform="rotate(8 40 15)" fill="currentColor" />
            <ellipse cx="52" cy="31" rx="6.4" ry="8" transform="rotate(24 52 31)" fill="currentColor" />
            <path d="M32 29 C22 29 13 38 14 47 C15 56 24 58 32 58 C40 58 49 56 50 47 C51 38 42 29 32 29Z" fill="currentColor" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/**
 * Solo con servidor (`NEXT_PUBLIC_DATOS=servidor`): la portada abre «Entrar o crear cuenta» y, con sesión de familia
 * pero sin casa ni perro en este teléfono, `completar` empieza en «Cuéntanos de ti» con lo que ya dio al registrarse
 * (no se vuelve a pedir el celular ni el código). Sin esto, la alta es la de siempre.
 */
export interface OnboardingServidor {
  cliente: ClienteAcceso | null
  /** Hubo inicio de sesión o registro con sesión: la app principal vuelve a leer la sesión. */
  onListo: () => void
  /** Una línea para la entrada (por ejemplo, el enlace del correo llegó sin sesión). */
  aviso?: string
  completar: { cuenta: DatosDeCuenta; onSalir: () => void } | null
}

/** Alta de cuenta en 6 pasos cortos. Todo se guarda solo en este navegador (demo). */
export function Onboarding({
  initialReferral = '',
  onFinish,
  servidor,
}: {
  initialReferral?: string
  onFinish: (account: Account, dog: Dog | null) => void
  servidor?: OnboardingServidor
}) {
  const completar = servidor?.completar ?? null
  // En «completar» ya se tienen el celular y el nombre: se salta el celular y el código (pasos 1 y 2).
  const base = completar ? 2 : 0
  const [step, setStep] = useState(completar ? 3 : 0)
  const [verAcceso, setVerAcceso] = useState(() => !!servidor?.aviso)
  const [phone, setPhone] = useState(completar?.cuenta.celular ?? '')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [secs, setSecs] = useState(30)

  const [firstName, setFirstName] = useState(completar?.cuenta.nombre ?? '')
  const [lastName, setLastName] = useState(completar?.cuenta.apellido ?? '')
  const [birth, setBirth] = useState('')
  // Dónde vive: se marca en el mapa. El distrito sale de ese punto, no se pregunta aparte.
  const [casa, setCasa] = useState<LatLng | null>(null)
  const [casaOpen, setCasaOpen] = useState(false)
  const [street, setStreet] = useState('')
  const [unit, setUnit] = useState('')
  const [doorman, setDoorman] = useState(true)
  const [doormanName, setDoormanName] = useState('')
  const [source, setSource] = useState(initialReferral ? 'Afiche en mi edificio' : '')
  const [referral, setReferral] = useState(initialReferral)
  const [terms, setTerms] = useState<Record<string, boolean>>({})
  // El código puede llegar un instante después de montar (viene de la dirección)
  useEffect(() => {
    if (initialReferral) {
      setReferral(initialReferral)
      setSource((s) => s || 'Afiche en mi edificio')
    }
  }, [initialReferral])

  const [dog, setDog] = useState<Dog>(() => newDog())

  // Cuenta regresiva para reenviar el código
  useEffect(() => {
    if (step !== 2 || secs <= 0) return
    const t = setTimeout(() => setSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, secs])

  // Verificación automática al completar el código
  useEffect(() => {
    if (step !== 2 || code.length < 6) return
    setVerifying(true)
    const t = setTimeout(() => {
      setVerifying(false)
      setStep(3)
    }, 1000)
    return () => clearTimeout(t)
  }, [code, step])

  const phoneOk = phone.replace(/\D/g, '').length === 9
  const age = ageFrom(birth)
  const adult = age >= 18
  const district = (casa && distritoDe(casa)) || 'San Isidro'
  const casaOk = !!casa && sePuedeAtender(casa)
  const aboutOk = !!(firstName.trim() && lastName.trim() && street.trim() && adult && casaOk)
  /** Lo primero que falta en el paso 3 (para decirlo bajo el botón apagado). */
  const falta = !firstName.trim()
    ? 'tu nombre'
    : !lastName.trim()
      ? 'tu apellido'
      : !adult
        ? 'tu fecha de nacimiento'
        : !casaOk
          ? 'marcar tu casa'
          : !street.trim()
            ? 'tu calle o avenida'
            : ''
  const termsOk = CLIENT_BLOCKS.every((b) => terms[b.id])
  const dogOk = dog.name.trim().length > 0
  const maxBirth = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().slice(0, 10)
  }, [])

  const finish = (withDog: boolean) => {
    const now = new Date().toISOString()
    const account: Account = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      district,
      street: street.trim(),
      unit: unit.trim(),
      ...(casa ? { casa } : {}),
      birth,
      termsVersion: TERMS_VERSION,
      termsAt: now,
      doorman,
      doormanName: doormanName.trim(),
      source,
      referral: referral.trim(),
      createdAt: now.slice(0, 10),
    }
    onFinish(account, withDog && dogOk ? { ...dog, name: dog.name.trim() } : null)
  }

  const back = () => setStep((s) => Math.max(completar ? 3 : 0, s - 1))
  const paso = (n: number) => `Paso ${n - base} de ${TOTAL_STEPS - base}`
  const slide = { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -28 }, transition: { duration: 0.22 } }
  const disabledBtn = 'disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none'

  /* ---------- Entrar o crear cuenta (solo con servidor) ---------- */
  if (step === 0 && servidor && verAcceso) {
    return (
      <div className="absolute inset-0 z-[80] flex flex-col bg-canvas">
        <PantallaEntrada cliente={servidor.cliente} onListo={servidor.onListo} onVolver={() => setVerAcceso(false)} aviso={servidor.aviso} />
      </div>
    )
  }

  /* ---------- Bienvenida ---------- */
  if (step === 0) {
    return (
      <div className="absolute inset-0 z-[80] flex flex-col overflow-y-auto overflow-x-hidden bg-brand-700 text-white">
        <PawPattern id="ob-paws" />
        <div className="relative flex flex-1 flex-col items-center justify-center px-7 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 13 }}
            className="grid h-36 w-36 place-items-center rounded-full bg-brand-50 shadow-[0_18px_40px_-14px_rgba(0,0,0,.45)]"
          >
            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
              <ChasquiHead className="h-28 w-28" />
            </motion.div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="font-display mt-7 text-[34px] font-bold leading-[1] tracking-tight min-[400px]:text-[42px]"
          >
            {partesNombre()[0]} <span className="italic text-brand-100">{partesNombre()[1]}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-3 max-w-[300px] text-[16px] leading-relaxed text-white">
            El paseo con cuidado que tu mejor amigo merece, con vecinos estudiantes de San Isidro y Jesús María.
          </motion.p>
          {initialReferral && CONFIG.descuentoBienvenida > 0 && (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-5 rounded-full bg-brand-50 px-4 py-2 text-[14px] font-extrabold text-brand-800">
              Código {initialReferral} aplicado · S/ {CONFIG.descuentoBienvenida} en tu primer paseo
            </motion.p>
          )}
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-6 space-y-2.5 text-left">
            {[
              { icon: BadgeCheck, t: `Paseadores con ${textoHastaComprobaciones().toLowerCase()}` },
              { icon: Wallet, t: `Pagas a ${NOMBRE_CORTO}, no al paseador` },
              { icon: MapPin, t: 'Fotos y puntos de control (demostración)' },
            ].map((b) => (
              <li key={b.t} className="flex items-center gap-2.5 text-[14px] font-bold">
                <b.icon size={18} className="shrink-0" /> {b.t}
              </li>
            ))}
          </motion.ul>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="relative space-y-2.5 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {servidor ? (
            // Con servidor: UN solo camino. «Entrar o crear cuenta» abre iniciar sesión arriba y crear cuenta abajo
            // (ahí se elige «Soy familia» o «Soy paseador»).
            <button type="button" onClick={() => setVerAcceso(true)} className={cn(btnInk, 'h-14 w-full text-[16.5px]')}>
              Entrar o crear cuenta <ArrowRight size={19} strokeWidth={2.6} />
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setStep(1)} className={cn(btnInk, 'h-14 w-full text-[16.5px]')}>
                Crear mi cuenta <ArrowRight size={19} strokeWidth={2.6} />
              </button>
              <Link
                href="/paseador"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-brand-50/70 text-[15.5px] font-extrabold text-white transition active:scale-[0.98]"
              >
                <Bike size={19} /> Crear cuenta de paseador
              </Link>
            </>
          )}
          <p className="text-center text-[12px] leading-snug text-white">
            {servidor ? 'Tu cuenta se guarda en el servidor; lo demás, solo en este teléfono.' : 'Tus datos se guardan solo en este teléfono.'}
          </p>
        </motion.div>
      </div>
    )
  }

  /* ---------- Pasos 1 a 6 ---------- */
  return (
    <div className="absolute inset-0 z-[80] flex flex-col bg-canvas">
      <header className="flex items-center gap-3 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        {completar && step === 3 ? (
          // Con sesión no hay paso anterior (el celular y el código ya están): aquí lo que se puede hacer es salir.
          <button type="button" onClick={completar.onSalir} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sand px-3.5 text-[14px] font-extrabold text-ink active:scale-95">
            <LogOut size={15} aria-hidden /> Salir
          </button>
        ) : step < TOTAL_STEPS ? (
          <button type="button" onClick={back} aria-label="Atrás" className="grid h-11 w-11 place-items-center rounded-full bg-sand text-ink active:scale-95">
            <ArrowLeft size={18} />
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
        <div className="flex flex-1 gap-1.5" aria-label={paso(step)}>
          {Array.from({ length: TOTAL_STEPS - base }, (_, k) => k + 1 + base).map((i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <motion.span className="block h-full rounded-full bg-brand-600" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
            </span>
          ))}
        </div>
        <Logo size={22} className="opacity-0" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
            <motion.div key="p1" {...slide}>
              <p className="eyebrow text-brand-700">{paso(1)}</p>
              <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">¿Cuál es tu celular?</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">Lo usamos para avisarte del paseo. Por ahora el código es de demostración.</p>
              <div className="mt-6 flex items-center gap-2">
                <span className="grid h-12 shrink-0 place-items-center rounded-2xl border border-ink/15 bg-paper px-3.5 text-[15px] font-extrabold text-ink">🇵🇪 +51</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="9XX XXX XXX"
                  className={cn(inputBase, 'tracking-wide')}
                  autoFocus
                />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[14px] text-ink-soft">
                <ShieldCheck size={14} className="text-forest" /> Nunca compartimos tu número con paseadores.
              </p>
              <p className="mt-2 text-[14px] text-ink-soft">Un celular = una cuenta. Así evitamos cuentas falsas y bromas.</p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="p2" {...slide}>
              <p className="eyebrow text-brand-700">{paso(2)}</p>
              <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Ingresa el código</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">Todavía no enviamos SMS. Usa el código de demostración.</p>
              <div className="relative mt-6">
                <div className="grid grid-cols-6 gap-2" aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'grid h-14 place-items-center rounded-2xl border-2 bg-paper font-display text-[26px] font-bold text-ink',
                        i === code.length ? 'border-brand-600' : 'border-ink/12',
                      )}
                    >
                      {code[i] ?? ''}
                    </span>
                  ))}
                </div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Código de 6 dígitos"
                  className="absolute inset-0 h-full w-full cursor-text text-[16px] opacity-0"
                  autoFocus
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-[14px]">
                <span className="font-semibold text-ink-soft">Demostración: no se envía SMS</span>
                <button type="button" onClick={() => setCode(DEMO_CODE)} className="min-h-11 font-extrabold text-brand-700 underline underline-offset-4">
                  Usar código de demostración
                </button>
              </div>
              {verifying && (
                <p className="mt-5 flex items-center gap-2 text-[14px] font-bold text-forest">
                  <motion.span className="h-4 w-4 rounded-full border-2 border-forest/30 border-t-forest" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  Verificando…
                </p>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="p3" {...slide} className="space-y-5">
              <div>
                <p className="eyebrow text-brand-700">{paso(3)}</p>
                <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Cuéntanos de ti</h2>
                {completar?.cuenta.correo && <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">Tu cuenta: {completar.cuenta.correo}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Nombre</span>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" className={inputBase} placeholder="Valeria" maxLength={30} />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Apellido</span>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" className={inputBase} placeholder="Rojas" maxLength={30} />
                </label>
              </div>

              <label className="block">
                <span className="eyebrow mb-1.5 block text-ink-soft">Fecha de nacimiento</span>
                <input type="date" value={birth} max={maxBirth} onChange={(e) => setBirth(e.target.value)} className={inputBase} autoComplete="bday" />
                <span className={cn('mt-1.5 block text-[14px] font-semibold', birth && !adult ? 'text-red-600' : 'text-ink-soft')}>
                  {birth && !adult ? `Debes tener 18 años o más para usar ${NOMBRE_APP}.` : 'Debes tener 18 años o más.'}
                </span>
              </label>

              <fieldset>
                <legend className="eyebrow mb-1.5 text-ink-soft">¿Dónde vives?</legend>
                <button
                  type="button"
                  onClick={() => setCasaOpen(true)}
                  className="min-h-11 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-600/40 bg-brand-50/60 px-3.5 py-3.5 text-left active:scale-[0.99]"
                >
                  <MapPin size={18} className="shrink-0 text-brand-700" />
                  <span className="text-[14.5px] font-extrabold text-ink">{casa ? TEXTO_CASA.cambiar : TEXTO_CASA.marcar}</span>
                </button>
                {casa && <ResultadoZona punto={casa} className="mt-2.5" />}
              </fieldset>

              <div className="grid grid-cols-[1.6fr_1fr] gap-3">
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Calle o avenida</span>
                  <input value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="address-line1" className={inputBase} placeholder="Av. / Calle" maxLength={60} />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Dpto. / casa</span>
                  <input value={unit} onChange={(e) => setUnit(e.target.value)} autoComplete="address-line2" className={inputBase} placeholder="502" maxLength={12} />
                </label>
              </div>

              <div className="space-y-2.5">
                <Toggle on={doorman} onChange={setDoorman} label="Mi edificio tiene portería" hint="El paseador recoge y entrega a tu perro con el portero." />
                {doorman && <input value={doormanName} onChange={(e) => setDoormanName(e.target.value)} className={inputBase} placeholder="Nombre del portero (opcional)" maxLength={40} />}
              </div>

              <fieldset>
                <legend className="eyebrow mb-2 text-ink-soft">¿Cómo nos conociste?</legend>
                <div className="flex flex-wrap gap-2">
                  {SOURCES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSource(s)}
                      aria-pressed={source === s}
                      className={cn(
                        'min-h-11 rounded-full border px-3.5 py-2 text-[14px] font-bold transition active:scale-95',
                        source === s ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink-soft',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="eyebrow mb-1.5 block text-ink-soft">Código de invitación (opcional)</span>
                <input value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} className={cn(inputBase, 'tracking-wider')} placeholder="Ej. LUIS10" maxLength={14} />
              </label>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="p4" {...slide} className="space-y-4">
              <div>
                <p className="eyebrow text-brand-700">{paso(4)}</p>
                <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Lo que aceptas</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  Seis acuerdos cortos, uno por uno. Así todos sabemos las reglas desde el inicio.
                </p>
              </div>
              <TermsBlocks blocks={bloquesParaMostrar(CLIENT_BLOCKS, !!servidor)} value={terms} onChange={setTerms} />
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="p5" {...slide} className="space-y-5">
              <div>
                <p className="eyebrow text-brand-700">{paso(5)}</p>
                <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Ahora, tu perro</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">El paseador verá esta ficha. Puedes agregar más perros después.</p>
              </div>
              <DogForm dog={dog} onChange={setDog} />
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="p6" {...slide} className="flex flex-col items-center pt-4 text-center">
              <div className="relative">
                {Array.from({ length: 7 }, (_, i) => (
                  <motion.span
                    key={i}
                    aria-hidden
                    className="absolute left-1/2 top-1/2 text-brand-600"
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                    animate={{ opacity: [0, 1, 0], x: Math.cos((i / 7) * Math.PI * 2) * 100, y: Math.sin((i / 7) * Math.PI * 2) * 100, scale: [0.4, 1, 0.8], rotate: i * 40 }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 1.2, ease: 'easeOut' }}
                  >
                    <PawMark className="h-6 w-6 -translate-x-1/2 -translate-y-1/2" />
                  </motion.span>
                ))}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                  className="grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-brand-100"
                >
                  {dogOk && dog.photo ? <DogAvatar dog={dog} className="h-full w-full rounded-full" /> : <ChasquiHead className="h-28 w-28" />}
                </motion.div>
              </div>
              <h2 className="font-display mt-7 text-[36px] font-bold leading-[1.03] text-ink">¡Hola, {firstName.trim()}!</h2>
              <p className="mt-2 max-w-[300px] text-[14.5px] leading-relaxed text-ink-soft">Tu cuenta está lista. Esto es lo que ya tienes:</p>
              <ul className="mt-5 w-full space-y-2.5 text-left">
                {[
                  { ok: true, t: `Cuenta en ${district}` },
                  { ok: dogOk, t: dogOk ? `${dog.name} registrado (${dog.size === 'small' ? 'pequeño' : dog.size === 'medium' ? 'mediano' : 'grande'})` : 'Tu perro: lo agregas cuando quieras' },
                  ...(CONFIG.descuentoBienvenida > 0 ? [{ ok: true, t: `S/ ${CONFIG.descuentoBienvenida} de descuento en tu primer paseo` }] : []),
                ].map((r) => (
                  <li key={r.t} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-[14px] font-bold text-ink">
                    <span className={cn('grid h-6 w-6 place-items-center rounded-full', r.ok ? 'bg-forest text-white' : 'bg-ink/10 text-ink-soft')}>
                      {r.ok ? <Check size={14} strokeWidth={3.5} /> : <PawPrint size={13} />}
                    </span>
                    {r.t}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {casaOpen && (
          <CasaSheet
            key="casa"
            valor={casa}
            onSave={(p) => {
              setCasa(p)
              setCasaOpen(false)
            }}
            onClose={() => setCasaOpen(false)}
          />
        )}
      </AnimatePresence>

      <footer className="space-y-2 border-t border-ink/10 bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {step === 1 && (
          <button type="button" disabled={!phoneOk} onClick={() => { setSecs(30); setStep(2) }} className={cn(btnPrimary, 'h-14 w-full text-[16px]', disabledBtn)}>
            Enviar código <ArrowRight size={19} strokeWidth={2.6} />
          </button>
        )}
        {step === 3 && (
          <>
            {!aboutOk && falta && <p className="text-center text-[14px] font-semibold text-ink-soft">Falta: {falta}.</p>}
            <button type="button" disabled={!aboutOk} onClick={() => setStep(4)} className={cn(btnPrimary, 'h-14 w-full text-[16px]', disabledBtn)}>
              Continuar <ArrowRight size={19} strokeWidth={2.6} />
            </button>
          </>
        )}
        {step === 4 && (
          <button type="button" disabled={!termsOk} onClick={() => setStep(5)} className={cn(btnPrimary, 'h-14 w-full text-[16px]', disabledBtn)}>
            {termsOk ? 'Acepto y continúo' : 'Acepta los 6 acuerdos para seguir'} {termsOk && <ArrowRight size={19} strokeWidth={2.6} />}
          </button>
        )}
        {step === 5 && (
          <>
            <button type="button" disabled={!dogOk} onClick={() => setStep(6)} className={cn(btnPrimary, 'h-14 w-full text-[16px]', disabledBtn)}>
              Guardar a {dog.name.trim() || 'mi perro'} <ArrowRight size={19} strokeWidth={2.6} />
            </button>
            <button type="button" onClick={() => { setDog(newDog()); setStep(6) }} className="h-11 w-full text-[14px] font-bold text-ink-soft underline underline-offset-4">
              Lo haré después
            </button>
          </>
        )}
        {step === 6 && (
          <button type="button" onClick={() => finish(true)} className={cn(btnInk, 'h-14 w-full text-[16px]')}>
            Ver paseadores <ArrowRight size={19} strokeWidth={2.6} />
          </button>
        )}
      </footer>
    </div>
  )
}
