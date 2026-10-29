'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  Check,
  DoorOpen,
  Info,
  MapPin,
  PawPrint,
  Plus,
  TriangleAlert,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react'
import { CONFIG, NOMBRE_CORTO, precioPaseo, textoPlanLunesViernes, textoRecargoIndividual, TEXTOS_PAGO } from '@/lib/config'
import { buildBooking, DURATIONS, esCuentaDeEjemplo } from '@/lib/data'
import { DAYS_AHEAD, dayInfo, HOURS, hourLabel, isBookable, nextSlot, SIZE_INFO, slotInfo, walkerFits } from '@/lib/schedule'
import type { Account, Booking, Dog, Handoff, Plan, Walker } from '@/lib/types'
import { btnInk, btnPrimary, inputBase } from '@/lib/ui'
import { cn, soles, solesShort } from '@/lib/utils'
import { TEXTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { SPOTS } from '@/lib/geo'
import { TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { bloqueoPorZona, clasificarPunto } from '@/lib/zona'
import { TEXTO_CASA } from '@/lib/zonaTextos'
import { ResultadoZona } from './CasaSheet'
import { TEXTO_PAGO, textoComisionDueno } from '@/lib/pagosTextos'
import { VerMas } from './ui/VerMas'
import { DogAvatar } from './ui/Dog'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { PortraitAvatar } from './ui/PortraitAvatar'
import { Sheet } from './ui/Sheet'

const STEPS = ['Horario', 'Pago', 'Listo']

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progreso de la reserva">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-extrabold transition-colors',
              i < step ? 'bg-forest text-white' : i === step ? 'bg-brand-700 text-white' : 'bg-ink/10 text-ink-soft',
            )}
          >
            {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
          </span>
          <span className={cn('whitespace-nowrap text-[12px] font-bold', i === step ? 'text-ink' : 'text-ink-soft')}>{s}</span>
          {i < STEPS.length - 1 && <span className="h-px min-w-1 flex-1 bg-ink/15" />}
        </li>
      ))}
    </ol>
  )
}

/** Banner que explica el pago: pagas a Patitas y Patitas le paga al paseador (a mano; la app no mueve dinero). */
function PagoPatitasBanner({ walker }: { walker: Walker }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-brand-50 shadow-pop">
      <div className="relative flex items-start gap-3.5">
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-brand-500"
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
          <PawPrint size={26} strokeWidth={2.4} className="relative" />
        </span>
        <div>
          <p className="eyebrow text-brand-300">Pago</p>
          <h3 className="font-display text-[26px] font-bold leading-[1.02]">Pagas a {NOMBRE_CORTO}</h3>
        </div>
      </div>
      <p className="relative mt-3.5 text-[14.5px] leading-relaxed text-brand-50/85">
        {TEXTOS_PAGO.honestidad}
      </p>

      <div className="relative mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 rounded-2xl bg-white/10 p-3 [@media(max-height:700px)]:hidden">
        {[
          { icon: PawPrint, label: 'Se hace el paseo', tone: 'bg-brand-600' },
          { icon: Wallet, label: 'Pagas al terminar', tone: 'bg-white/15' },
          { icon: UserCheck, label: `${walker.firstName} recibe su pago`, tone: 'bg-forest' },
        ].flatMap((n, i) => {
          const node = (
            <div key={n.label} className="flex flex-col items-center gap-1.5 text-center">
              <span className={cn('grid h-9 w-9 place-items-center rounded-full', n.tone)}>
                <n.icon size={17} />
              </span>
              <span className="text-[12px] font-semibold leading-tight text-brand-50/85">{n.label}</span>
            </div>
          )
          if (i === 2) return [node]
          return [
            node,
            <span key={`a${i}`} className="relative mb-5 h-0.5 w-5 overflow-hidden rounded-full bg-white/20">
              <motion.span
                className="absolute inset-y-0 w-2 rounded-full bg-brand-300"
                animate={{ x: [-8, 22] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: i * 0.4 }}
              />
            </span>,
          ]
        })}
      </div>
    </div>
  )
}

const STATE_TEXT = {
  free: 'Libre',
  join: '',
  full: 'Lleno',
  size: 'Otro tamaño',
  solo: 'Con grupo',
  off: '—',
  past: '',
  noaccept: '—',
} as const

export function BookingSheet({
  walker,
  account,
  dogs,
  initialDogId,
  welcome,
  onAddDog,
  onEditDog,
  onPedirCasa,
  onClose,
  onConfirmed,
  onSeeLive,
  pagoPendiente = null,
}: {
  walker: Walker
  account: Account | null
  dogs: Dog[]
  initialDogId: string | null
  welcome: boolean
  onAddDog: () => void
  onEditDog: (d: Dog) => void
  /** Abre el mapa para marcar o cambiar la casa (el punto de recojo). */
  onPedirCasa: () => void
  onClose: () => void
  /**
   * Se envió la solicitud al paseador (todavía falta que acepte). Con servidor devuelve una promesa: hasta que la base
   * la recibe no se dice «enviada»; si falla, se explica y lo elegido se queda como estaba para reintentar.
   */
  onConfirmed: (b: Booking) => void | Promise<{ ok: true } | { ok: false; mensaje: string }>
  /** «Ver el paseo»: cierra la hoja y abre la pestaña Paseo. */
  onSeeLive: () => void
  /** Hay un paseo hecho que todavía no se pagó: no se puede reservar otro hasta pagarlo. */
  pagoPendiente?: { perro: string } | null
}) {
  const [step, setStep] = useState(0)
  const enviada = useRef(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [dogId, setDogId] = useState(initialDogId ?? dogs[0]?.id ?? '')
  const [dayIdx, setDayIdx] = useState(0)
  const [hour, setHour] = useState<number | null>(null)
  const [duration, setDuration] = useState(60)
  const [plan, setPlan] = useState<Plan>('once')
  const [handoff, setHandoff] = useState<Handoff>(account?.doorman ? 'doorman' : 'door')
  const [notes, setNotes] = useState('')
  // El lugar: uno de los parques o zonas que marcó el paseador (por defecto, el primero).
  const [spotId, setSpotId] = useState<string>(walker.spots[0] ?? '')

  // Si se registra un perro con la reserva abierta, se selecciona solo
  useEffect(() => {
    if (!dogs.some((d) => d.id === dogId)) setDogId(dogs[0]?.id ?? '')
  }, [dogs, dogId])

  const dog = dogs.find((d) => d.id === dogId) ?? null
  const fits = walkerFits(walker, dog)

  // Al cambiar de perro o de día, se elige el primer horario compatible
  useEffect(() => {
    if (!dog || !fits) {
      setHour(null)
      return
    }
    const first = HOURS.find((h) => isBookable(slotInfo(walker, dayIdx, h, dog).state))
    setHour((cur) => (cur !== null && isBookable(slotInfo(walker, dayIdx, cur, dog).state) ? cur : first ?? null))
  }, [walker, dog, fits, dayIdx])

  // Si el primer día no tiene horarios, salta al siguiente que sí
  useEffect(() => {
    if (!dog || !fits) return
    const hasToday = HOURS.some((h) => isBookable(slotInfo(walker, 0, h, dog).state))
    if (!hasToday) {
      const n = nextSlot(walker, dog)
      if (n) setDayIdx(n.dayIdx)
    }
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const info = dog && hour !== null ? slotInfo(walker, dayIdx, hour, dog) : null
  const booking: Booking | null = useMemo(() => {
    if (!dog || hour === null || !info) return null
    return buildBooking({
      walker,
      dog,
      dayIdx,
      startHour: hour,
      durationMin: duration,
      plan,
      handoff,
      notes,
      groupDogs: info.dogs,
      groupSize: info.dogs === 0 ? dog.size : info.size,
      welcome,
      spotId: spotId || undefined,
    })
  }, [walker, dog, hour, info, dayIdx, duration, plan, handoff, notes, welcome, spotId])

  // La casa (punto de recojo) tiene que estar dentro de la zona o en el borde
  const bloqueoZona = account ? bloqueoPorZona(account.casa) : null
  const claseCasa = account?.casa ? clasificarPunto(account.casa) : null
  const blocked = (pagoPendiente ? 'pago' : null) ?? bloqueoZona ?? (!dog ? 'dog' : dog.rpp ? 'rpp' : !fits ? 'size' : !dog.vaccinated ? 'vax' : hour === null ? 'slot' : null)
  const weekly = plan === 'weekdays' && booking ? booking.total * 5 : 0

  return (
    <Sheet label={`Agendar paseo con ${walker.name}`} onClose={onClose} full>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3">
        <div className="min-w-0">
          <p className="eyebrow text-brand-700">Reservar</p>
          <h2 className="truncate font-display text-[26px] font-bold leading-tight text-ink">
            {step === 2 ? 'Solicitud enviada' : `Con ${walker.name}`}
          </h2>
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
      <div className="px-5 pb-3">
        <Stepper step={step} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-ink/10 px-5 pb-4 pt-5">
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="space-y-6"
            >
              {/* Paseador */}
              <div className="flex items-center gap-3 rounded-3xl bg-sand p-3">
                <PortraitAvatar portrait={walker.portrait} photo={walker.photo} alt={`Foto de ${walker.name}`} className="h-14 w-12 rounded-t-3xl rounded-b-xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[18px] font-bold leading-tight text-ink">{walker.name}</p>
                  {walker.esEjemplo && <EtiquetaEjemplo className="mt-1" />}
                  <p className="flex items-center gap-1 text-[14px] font-bold text-forest">
                    <MapPin size={12} /> {walker.neighbor}
                  </p>
                  <p className="text-[14px] text-ink-soft">
                    Pasea perros {walker.accepts.map((s) => SIZE_INFO[s].plural).join(' y ')} · máx. {walker.maxDogs}
                  </p>
                </div>
                <p className="font-display text-[20px] font-bold text-ink">S/{walker.pricePerHour}</p>
              </div>

              {/* Perro */}
              <fieldset>
                <legend className="eyebrow mb-2 text-ink-soft">¿Quién sale a pasear?</legend>
                {dogs.length === 0 ? (
                  <button
                    type="button"
                    onClick={onAddDog}
                    className="min-h-11 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-600/40 bg-brand-50/60 p-4 text-left"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white">
                      <Plus size={20} />
                    </span>
                    <span className="text-[14px] font-extrabold text-ink">Registra a tu perro para continuar</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {dogs.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDogId(d.id)}
                        aria-pressed={dogId === d.id}
                        className={cn(
                          'min-h-11 flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition active:scale-[0.98]',
                          dogId === d.id ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper',
                        )}
                      >
                        <DogAvatar dog={d} className="h-12 w-12 shrink-0 rounded-xl" />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-extrabold text-ink">{d.name}</span>
                          <span className="block truncate text-[12px] text-ink-soft">{SIZE_INFO[d.size].label} · {d.breed}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>

              {bloqueoZona === 'casa' && (
                <div className="rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-300/60">
                  <p className="flex items-center gap-2 text-[14.5px] font-extrabold text-amber-900">
                    <MapPin size={17} className="shrink-0" /> {TEXTO_CASA.titulo}
                  </p>
                  <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">{TEXTO_CASA.apoyo}</p>
                </div>
              )}
              {account?.casa && claseCasa && claseCasa !== 'dentro' && (
                <div>
                  <ResultadoZona punto={account.casa} />
                  {/* En el borde se puede reservar: cambiar la casa es opcional. Fuera, el botón de abajo es la salida. */}
                  {claseCasa === 'borde' && (
                    <button type="button" onClick={onPedirCasa} className="min-h-11 mt-1.5 text-[14px] font-extrabold text-brand-800 underline underline-offset-4">
                      {TEXTO_CASA.cambiar}
                    </button>
                  )}
                </div>
              )}
              {blocked === 'pago' && pagoPendiente && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-[14px] leading-snug text-amber-900 ring-1 ring-amber-300/60">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <span>
                    Falta pagar el paseo de {pagoPendiente.perro}. {TEXTO_PAGO.sinReservar} Está en «Paseo».
                  </span>
                </div>
              )}
              {blocked === 'rpp' && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-[14px] leading-snug text-amber-900 ring-1 ring-amber-300/60">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <span>
                    Por ahora no atendemos razas potencialmente peligrosas.
                  </span>
                </div>
              )}
              {blocked === 'size' && dog && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-[14px] leading-snug text-amber-900 ring-1 ring-amber-300/60">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <span>
                    {walker.firstName} solo pasea perros {walker.accepts.map((s) => SIZE_INFO[s].plural).join(' y ')}. {dog.name} es{' '}
                    {SIZE_INFO[dog.size].label.toLowerCase()}. Elige otro paseador u otro perro.
                  </span>
                </div>
              )}
              {blocked === 'vax' && dog && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-[14px] leading-snug text-amber-900 ring-1 ring-amber-300/60">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <span>
                    Para reservar necesitamos que las vacunas de {dog.name} estén al día.{' '}
                    <button type="button" onClick={() => onEditDog(dog)} className="min-h-11 font-extrabold underline">
                      Actualizar ficha
                    </button>
                  </span>
                </div>
              )}

              {dog && fits && !dog.rpp && (
                <>
                  {/* Día */}
                  <fieldset>
                    <legend className="eyebrow mb-2 text-ink-soft">Día</legend>
                    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
                      {Array.from({ length: DAYS_AHEAD }, (_, i) => {
                        const d = dayInfo(i)
                        const on = dayIdx === i
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setDayIdx(i)}
                            aria-pressed={on}
                            className={cn(
                              'min-h-11 flex w-[58px] shrink-0 flex-col items-center rounded-2xl border-2 py-2 transition active:scale-95',
                              on ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-paper text-ink',
                            )}
                          >
                            <span className={cn('text-[12px] font-bold', on ? 'text-white/70' : 'text-ink-soft')}>{d.short}</span>
                            <span className="font-display text-[22px] font-bold leading-none">{d.date}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>

                  {/* Horas */}
                  <fieldset>
                    <legend className="eyebrow mb-2 text-ink-soft">Hora de recojo · de 6:00 am a 9:00 pm</legend>
                    <div className="grid grid-cols-4 gap-2">
                      {HOURS.map((h) => {
                        const s = slotInfo(walker, dayIdx, h, dog)
                        const ok = isBookable(s.state)
                        const on = hour === h
                        const sub = s.state === 'join' ? `${s.dogs + 1}/${walker.maxDogs}` : STATE_TEXT[s.state]
                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={!ok}
                            onClick={() => setHour(h)}
                            aria-pressed={on}
                            className={cn(
                              'min-h-11 rounded-xl border-2 px-1 py-2 text-center transition active:scale-95',
                              on
                                ? 'border-brand-600 bg-brand-700 text-white'
                                : ok
                                  ? 'border-ink/15 bg-paper text-ink'
                                  : 'border-transparent bg-ink/[0.04] text-ink-soft line-through',
                            )}
                          >
                            <span className="block text-[12.5px] font-extrabold leading-tight">{hourLabel(h).replace(':00 ', ' ')}</span>
                            <span className={cn('block text-[12px] font-bold leading-tight', on ? 'text-white' : ok ? 'text-forest' : 'text-ink-soft')}>
                              {sub || ' '}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 flex gap-2.5 rounded-2xl bg-sand p-3 text-[14px] leading-snug text-ink-soft">
                      <Info size={16} className="mt-0.5 shrink-0 text-brand-700" />
                      <span>
                        Los horarios en gris ya tienen un grupo de <b>otro tamaño</b>, están llenos o fuera del horario de {walker.firstName}. Nunca
                        mezclamos tamaños: un perro grande podría arrastrar a uno pequeño.
                      </span>
                    </div>
                    {info && hour !== null && (
                      <p className="mt-3 text-[14px] font-bold text-ink">
                        {dayInfo(dayIdx).label} · {hourLabel(hour)} ·{' '}
                        <span className="text-forest">
                          {info.dogs === 0
                            ? `grupo nuevo`
                            : `grupo de ${info.dogs} perro${info.dogs > 1 ? 's' : ''} ${SIZE_INFO[info.size].plural}`}
                        </span>
                        <span className="font-semibold text-ink-soft"> ({info.dogs + 1}/{walker.maxDogs} contigo)</span>
                      </p>
                    )}
                  </fieldset>

                  {/* Duración */}
                  <fieldset>
                    <legend className="eyebrow mb-2 text-ink-soft">Duración</legend>
                    <div className="grid grid-cols-3 gap-2.5">
                      {DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          aria-pressed={duration === d}
                          className={cn(
                            'min-h-11 rounded-2xl border-2 py-2.5 text-center transition active:scale-[0.98]',
                            duration === d ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper',
                          )}
                        >
                          <span className="block text-[15px] font-extrabold text-ink">{d} min</span>
                          <span className="block text-[12px] text-ink-soft">
                            {solesShort(precioPaseo(walker.pricePerHour, d, !dog.sociable))}
                          </span>
                        </button>
                      ))}
                    </div>
                    {!dog.sociable && (
                      <p className="mt-2 text-[14px] leading-snug text-ink-soft">{dog.name} va solo: paseo individual ({textoRecargoIndividual()}).</p>
                    )}
                  </fieldset>

                  {/* Plan */}
                  <fieldset>
                    <legend className="eyebrow mb-2 text-ink-soft">¿Cada cuánto?</legend>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(
                        [
                          { id: 'once', title: 'Solo esta vez', text: 'Sin compromiso' },
                          { id: 'weekdays', title: 'Lunes a viernes', text: textoPlanLunesViernes() },
                        ] as Array<{ id: Plan; title: string; text: string }>
                      ).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlan(p.id)}
                          aria-pressed={plan === p.id}
                          className={cn(
                            'min-h-11 rounded-2xl border-2 p-3 text-left transition active:scale-[0.98]',
                            plan === p.id ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper',
                          )}
                        >
                          <span className="block text-[14px] font-extrabold text-ink">{p.title}</span>
                          <span className={cn('block text-[12px] font-bold', p.id === 'weekdays' ? 'text-forest' : 'text-ink-soft')}>{p.text}</span>
                        </button>
                      ))}
                    </div>
                    {plan === 'weekdays' && (
                      <p className="mt-2 text-[14px] leading-snug text-ink-soft">
                        Repite todos los días hábiles a esta hora. Cada paseo se paga por separado: cancelas cuando quieras.
                      </p>
                    )}
                  </fieldset>

                  {/* Lugar: los parques o zonas del paseador */}
                  {walker.spots.length > 0 && (
                    <fieldset>
                      <legend className="eyebrow mb-1 text-ink-soft">{TEXTO_RESERVAS.lugarTitulo}</legend>
                      <p className="mb-2 text-[14px] text-ink-soft">{TEXTO_RESERVAS.lugarApoyo}</p>
                      <div className="flex flex-wrap gap-2">
                        {walker.spots.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSpotId(id)}
                            aria-pressed={spotId === id}
                            className={cn('min-h-11 rounded-full border-2 px-4 py-2 text-[14px] font-extrabold transition active:scale-95', spotId === id ? 'border-brand-600 bg-brand-50 text-ink' : 'border-ink/10 bg-paper text-ink-soft')}
                          >
                            {SPOTS.find((s) => s.id === id)?.name ?? id}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {/* Entrega */}
                  <fieldset>
                    <legend className="eyebrow mb-2 text-ink-soft">¿Cómo lo entregas?</legend>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(
                        [
                          { id: 'door', icon: DoorOpen, title: 'En mi puerta', text: account ? `${account.street}` : 'Tú lo entregas' },
                          { id: 'doorman', icon: Building2, title: 'Con portería', text: account?.doorman ? account.doormanName || 'Con el portero' : 'Si tu edificio tiene' },
                        ] as Array<{ id: Handoff; icon: typeof DoorOpen; title: string; text: string }>
                      ).map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setHandoff(h.id)}
                          aria-pressed={handoff === h.id}
                          className={cn(
                            'min-h-11 flex items-start gap-2.5 rounded-2xl border-2 p-3 text-left transition active:scale-[0.98]',
                            handoff === h.id ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper',
                          )}
                        >
                          <h.icon size={18} className="mt-0.5 shrink-0 text-brand-700" />
                          <span className="min-w-0">
                            <span className="block text-[14px] font-extrabold text-ink">{h.title}</span>
                            <span className="block truncate text-[12px] text-ink-soft">{h.text}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Algo para esta vez (opcional). Ej. Tiene la pata sensible, evitar el pasto mojado."
                      className={cn(inputBase, 'mt-3 h-auto resize-none py-3 leading-snug')}
                    />
                  </fieldset>
                </>
              )}
            </motion.div>
          )}

          {step === 1 && booking && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              <PagoPatitasBanner walker={walker} />

              <section aria-label="Cuándo pagas">
                <p className="eyebrow mb-1.5 text-ink-soft">Cuándo pagas</p>
                {(walker.esEjemplo || esCuentaDeEjemplo(account)) && <p className="mb-2 text-[14px] font-extrabold text-ink">{TEXTO_PAGO.demoNoEsReal}</p>}
                <p className="rounded-2xl bg-sand p-3.5 text-[14px] leading-relaxed text-ink">
                  <b>{TEXTO_PAGO.lema}</b> Cuando termine, en «Paseo» te mostramos a dónde pagar.
                </p>
                {textoComisionDueno() && <p className="mt-3 rounded-2xl bg-sand p-3.5 text-[14px] leading-snug text-ink-soft">{textoComisionDueno()}</p>}
                <VerMas>{NOMBRE_CORTO} le paga al paseador después de confirmar el pago en su cuenta.</VerMas>
              </section>
            </motion.div>
          )}

          {step === 2 && booking && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center pb-2 pt-2 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                className="relative grid h-24 w-24 place-items-center rounded-full bg-forest text-white"
              >
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-forest"
                  animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <svg viewBox="0 0 24 24" className="relative h-12 w-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.45 }} />
                </svg>
              </motion.div>
              <h3 className="mt-5 font-display text-[28px] font-bold leading-tight text-ink">Falta que {walker.firstName} acepte</h3>
              <p className="mt-1.5 max-w-[300px] text-[14px] leading-relaxed text-ink-soft">
                {TEXTOS_PAGO.honestidad}
              </p>

              <dl className="mt-5 w-full space-y-2.5 rounded-3xl bg-sand p-4 text-left text-[14px]">
                {[
                  ['Paseador', walker.name],
                  ['Perro', `${booking.dog.name} · ${SIZE_INFO[booking.dog.size].label}`],
                  ['Cuándo', `${booking.slotLabel} · ${booking.durationMin} min`],
                  ...(booking.spotId ? [[TEXTO_RESERVAS.lugarFila, SPOTS.find((s) => s.id === booking.spotId)?.name ?? booking.spotId]] : []),
                  ['Plan', booking.plan === 'weekdays' ? 'Lunes a viernes' : 'Solo esta vez'],
                  ['Entrega', booking.handoff === 'doorman' ? `Con portería${account?.doormanName ? ` (${account.doormanName})` : ''}` : 'En tu puerta'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-ink-soft">{k}</dt>
                    <dd className="text-right font-bold text-ink">{v}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-ink/10 pt-2.5">
                  <dt className="flex items-center gap-1.5 font-bold text-forest">
                    <Wallet size={14} /> Total del paseo
                  </dt>
                  <dd className="font-display text-[20px] font-bold text-forest">{soles(booking.total)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[14px] text-ink-soft">
                {walker.esEjemplo || esCuentaDeEjemplo(account) || !walker.deServidor
                  ? `Demostración: en «Paseo» puedes simular que ${walker.firstName} acepta.`
                  : `Cuando ${walker.firstName} acepte, lo verás en «Paseo».`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pie fijo: resumen + acción */}
      <div className="shrink-0 border-t border-ink/10 bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {step < 2 && booking && !bloqueoZona && (
          <div className="mb-3">
            <div className="flex items-end justify-between">
              <span className="text-[14px] font-extrabold text-ink">Total del paseo</span>
              <span className="font-display text-[26px] font-bold leading-none text-ink">{soles(booking.total)}</span>
            </div>
            {(booking.discount > 0 || !dog?.sociable || (plan === 'weekdays' && weekly > 0) || CONFIG.comisionModo === 'sobre_el_precio') && (
              <p className="mt-1 text-[12px] leading-snug text-ink-soft">
                Paseo {soles(booking.walkPrice)} {!dog?.sociable ? '(individual) ' : ''}
                {booking.discount > 0 ? ` − descuento ${soles(booking.discount)}` : ''}
                {CONFIG.comisionModo === 'sobre_el_precio' ? ` + comisión ${soles(booking.comision ?? 0)}` : ''}
                {plan === 'weekdays' && weekly > 0 ? ` · ≈ ${soles(weekly)} por semana` : ''}
              </p>
            )}
          </div>
        )}

        {step === 0 && bloqueoZona && (
          // Sin una casa dentro de la zona no se puede reservar: la salida es el botón principal (marcarla o cambiarla).
          <button type="button" onClick={onPedirCasa} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
            <MapPin size={19} /> {bloqueoZona === 'casa' ? TEXTO_CASA.marcar : TEXTO_CASA.cambiar}
          </button>
        )}
        {step === 0 && !bloqueoZona && (
          <button
            type="button"
            disabled={!!blocked}
            onClick={() => setStep(1)}
            className={cn(btnPrimary, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
          >
            {blocked === 'slot' ? 'Elige un horario libre' : blocked === 'pago' ? 'Primero paga tu paseo' : blocked ? 'No se puede reservar' : 'Revisar y enviar'}
            {!blocked && <ArrowRight size={19} strokeWidth={2.6} />}
          </button>
        )}
        {step === 1 && errorEnvio && (
          <p role="alert" className="mb-3 rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900 ring-1 ring-amber-300/60">
            {errorEnvio}
          </p>
        )}
        {step === 1 && (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="h-14 shrink-0 rounded-full bg-sand px-5 text-[14px] font-bold text-ink active:scale-95"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => {
                // Un doble toque no envía dos solicitudes.
                if (!booking || enviada.current) return
                enviada.current = true
                setErrorEnvio(null)
                const resultado = onConfirmed(booking)
                // Sin servidor la solicitud queda enviada al instante (como siempre).
                if (!resultado) {
                  setStep(2)
                  return
                }
                setEnviando(true)
                void resultado.then((r) => {
                  setEnviando(false)
                  if (r.ok) setStep(2)
                  else {
                    // No se envió: se explica y se puede volver a intentar sin perder lo elegido.
                    enviada.current = false
                    setErrorEnvio(r.mensaje)
                  }
                })
              }}
              className={cn(btnPrimary, 'h-14 flex-1 text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
            >
              <PawPrint size={18} strokeWidth={2.6} />
              {enviando ? TEXTO_SERVIDOR.enviando : TEXTOS_PAGO.boton}
            </button>
          </div>
        )}
        {step === 2 && booking && (
          <button type="button" onClick={onSeeLive} className={cn(btnInk, 'h-14 w-full text-[16px]')}>
            Ver el paseo
            <ArrowRight size={19} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </Sheet>
  )
}
