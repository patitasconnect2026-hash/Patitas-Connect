'use client'

import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Camera,
  CircleCheck,
  ClipboardList,
  Droplet,
  Droplets,
  FastForward,
  Footprints,
  KeyRound,
  House,
  MessageCircle,
  Navigation,
  PawPrint,
  PenLine,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { TEXTOS_PAGO } from '@/lib/config'
import type { Pago } from '@/lib/pagos'
import { TEXTO_PAGO } from '@/lib/pagosTextos'
import type { EstadoPaseo, Paseo } from '@/lib/paseo'
import { etiquetaMotivo, type MotivoReporte, type Reporte } from '@/lib/casos'
import { PASOS, pasosDelPaseo } from '@/lib/paseoTextos'
import { seHizo } from '@/lib/paseo'
import { SIZE_INFO } from '@/lib/schedule'
import type { EventKind, TimelineEntry, Walk } from '@/lib/types'
import { btnForest, btnInk, btnPrimary, btnRed } from '@/lib/ui'
import { groupNames } from '@/lib/walk'
import type { EscenarioAviso } from '@/lib/zonaDemo'
import { cn, plural } from '@/lib/utils'
import { DogAvatar } from './ui/Dog'
import { FotosPaseo } from './FotosPaseo'
import type { FotoPaseo } from '@/lib/fotos'
import { AvisosPaseo } from './AvisosPaseo'
import { EstadoCard } from './EstadoPaseo'
import { BotonConfirmable } from './ui/BotonConfirmable'
import { LiveMap } from './LiveMap'
import { CONFIG } from '@/lib/config'
import { TEXTO_EN_VIVO } from '@/lib/sospechas'
import { PuntosDeControl } from './PuntosDeControl'
import { PagoCard } from './PagoCard'
import { OtrosPaseadores } from './OtrosPaseadores'
import { SelfieEnPaseo } from './SelfieDelDia'
import type { Walker } from '@/lib/types'
import { posicionesDe, puntosDeDemostracion, puntosDelPaseo, ultimoControl, type PuntoControl } from '@/lib/puntosControl'
import { clockAt } from '@/lib/walk'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { Seal, SelloPaseador } from './ui/Logo'
import { PortraitAvatar } from './ui/PortraitAvatar'
import { Stars } from './ui/Stars'

const KIND_STYLE: Record<EventKind, { icon: LucideIcon; tone: string }> = {
  start: { icon: Footprints, tone: 'bg-forest-50 text-forest' },
  route: { icon: Navigation, tone: 'bg-sand text-ink-soft' },
  cross: { icon: ShieldCheck, tone: 'bg-sand text-ink-soft' },
  pee: { icon: Droplet, tone: 'bg-[#dff0f8] text-sky' },
  water: { icon: Droplets, tone: 'bg-[#dff0f8] text-sky' },
  photo: { icon: Camera, tone: 'bg-brand-50 text-brand-700' },
  poop: { icon: Sparkles, tone: 'bg-sand text-ink-soft' },
  return: { icon: House, tone: 'bg-brand-50 text-brand-700' },
  arrived: { icon: CircleCheck, tone: 'bg-forest text-white' },
  sos: { icon: Siren, tone: 'bg-red-600 text-white' },
}

/* ---------- Estado vacío: aún no hay paseo ---------- */
function EmptyLive({ onExplore, onDemo }: { onExplore: () => void; onDemo: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-canvas px-8 pb-10 pt-12 text-center">
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-200/70" />
        <span className="relative grid h-24 w-24 place-items-center rounded-full bg-brand-600 text-white ring-8 ring-canvas">
          <Footprints size={38} strokeWidth={2} />
        </span>
      </div>
      <h2 className="mt-7 font-display text-[30px] font-bold leading-[1.05] text-ink">Sin paseo en curso</h2>
      <p className="mt-2.5 max-w-[290px] text-[14px] leading-relaxed text-ink-soft">
        Cuando reserves, aquí verás las fotos y el pago.
      </p>
      <button type="button" onClick={onExplore} className={cn(btnPrimary, 'mt-7 h-14 w-full max-w-[320px] text-[16px]')}>
        Encontrar paseador
        <ArrowRight size={19} strokeWidth={2.6} />
      </button>
      <button type="button" onClick={onDemo} className="mt-3 h-12 w-full max-w-[320px] rounded-full border border-ink/15 bg-paper text-[14px] font-bold text-ink active:scale-[0.98]">
        Ver demo del paseo
      </button>
    </div>
  )
}

/* ---------- Código de recojo ---------- */
function PinCard({ pin, walker }: { pin: string; walker: string }) {
  return (
    <section className="flex items-center gap-3 rounded-3xl border border-ink/10 bg-paper p-3.5 shadow-card" aria-label="Código de recojo">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-brand-50">
        <KeyRound size={21} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-ink-soft">Código de recojo</p>
        <p className="font-display text-[26px] font-bold leading-none tracking-[0.18em] text-ink tabular-nums">{pin}</p>
      </div>
      <p className="max-w-[128px] text-[14px] font-semibold leading-snug text-ink-soft">Dáselo a {walker} al entregarle a tu perro y al recibirlo.</p>
    </section>
  )
}

/* ---------- Bitácora ---------- */
function Timeline({ entries, simulado }: { entries: TimelineEntry[]; simulado: boolean }) {
  return (
    <section aria-label="Bitácora">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="eyebrow text-brand-700">Durante el paseo</p>
          <h2 className="flex items-center gap-2 font-display text-[26px] font-bold leading-tight text-ink">
            Bitácora
            {simulado && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-extrabold text-ink">Demostración</span>}
          </h2>
        </div>
        <span className="pb-1 text-[12px] font-bold text-ink-soft">{plural(entries.length, 'evento', 'eventos')}</span>
      </div>

      <ul className="mt-5" aria-live="polite">
        <AnimatePresence initial={false}>
          {entries.map((e, idx) => {
            const s = KIND_STYLE[e.kind]
            const isLast = idx === entries.length - 1
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className={cn('relative flex gap-3 pb-4', !isLast && 'after:absolute after:bottom-0 after:left-[17px] after:top-10 after:w-px after:bg-ink/12')}>
                  <span className={cn('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full', s.tone)}>
                    <s.icon size={17} strokeWidth={2.3} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[12px] font-extrabold tabular-nums text-brand-700">{e.time}</p>
                    <p className="text-[14px] font-semibold leading-snug text-ink">{e.text}</p>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </section>
  )
}

/* ---------- Paseo terminado ---------- */
function CompletedCard({
  walk,
  reviewed,
  porEquipo,
  onRebook,
  onWriteReview,
}: {
  walk: Walk
  reviewed: boolean
  /** Lo cerró el equipo (hubo un reporte o el dueño no confirmó): no se dice que todo salió bien. */
  porEquipo: boolean
  onRebook: () => void
  onWriteReview: () => void
}) {
  const b = walk.booking
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-forest/25 bg-paper p-5 text-center shadow-card">
      <Seal size={56} className="mx-auto" />
      <h2 className="mt-3 font-display text-[28px] font-bold leading-tight text-ink">{porEquipo ? 'Paseo cerrado' : '¡Paseo completado!'}</h2>
      <p className="mx-auto mt-1 max-w-[280px] text-[14px] leading-relaxed text-ink-soft">
        {porEquipo ? 'El equipo cerró el paseo.' : `${b.dog.name} llegó a casa.`} {TEXTOS_PAGO.honestidad}
      </p>
      {reviewed ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Stars value={walk.rating} size={18} />
          <span className="text-[12px] font-bold text-ink-soft">Tu reseña está publicada</span>
        </div>
      ) : (
        <button type="button" onClick={onWriteReview} className={cn(btnInk, 'mt-4 h-12 w-full text-[14.5px]')}>
          <PenLine size={16} /> Escribir reseña de {b.walker.firstName}
        </button>
      )}
      <button type="button" onClick={onRebook} className={cn(btnPrimary, 'mt-3 h-14 w-full text-[16px]')}>
        Reservar otra vez con {b.walker.firstName}
        <ArrowRight size={19} strokeWidth={2.6} />
      </button>
    </motion.section>
  )
}

/** La línea de la ubicación en vivo: dice que funciona con la app abierta y cuándo fue la última lectura. No promete que sea imposible de falsificar. */
function EnVivoDelPaseo({ enVivo }: { enVivo: { reciente: boolean; haceSegundos: number | null } | null }) {
  return (
    <section aria-label={TEXTO_EN_VIVO.titulo} className="mb-3 rounded-2xl border border-ink/10 bg-paper p-3.5">
      <p className="text-[14px] font-extrabold text-ink">
        {TEXTO_EN_VIVO.titulo}. {TEXTO_EN_VIVO.funciona}
      </p>
      <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">
        {!enVivo ? TEXTO_EN_VIVO.sinSenal : enVivo.reciente ? TEXTO_EN_VIVO.hace(CONFIG.segundosEnVivo) : TEXTO_EN_VIVO.hace_un_rato}
      </p>
    </section>
  )
}

export function LiveWalk({
  walk,
  entries,
  unread,
  lastWalkerMessage,
  reviewed,
  pin,
  onOpenChat,
  onOpenSos,
  onOpenConfirm,
  onOpenDog,
  onWriteReview,
  onExplore,
  onRebook,
  onDemo,
  onSkip,
  estado,
  paseo,
  simulado,
  walkerOnline,
  onSimularAceptacion,
  onCancelar,
  onDescartar,
  reasignacion,
  onReservarCon,
  pago,
  demoPago,
  entregaConfirmada,
  plazoVencido,
  onSimularVisto,
  reporte,
  onReportar,
  entregaSinConfirmar,
  fotos,
  selfie,
  onProbarAvisos,
  puntos,
  ahora,
  puedeSimular = true,
  conServidor = false,
  enVivo = null,
}: {
  walk: Walk | null
  entries: TimelineEntry[]
  unread: number
  lastWalkerMessage: { text?: string; photo?: boolean } | null
  reviewed: boolean
  /** Código que el dueño le da al paseador al entregar al perro */
  pin: string | null
  onOpenChat: () => void
  onOpenSos: () => void
  onOpenConfirm: () => void
  onOpenDog: () => void
  onWriteReview: () => void
  onExplore: () => void
  onRebook: () => void
  onDemo: () => void
  onSkip: () => void
  /** Estado del paseo (lib/paseo.ts). null = no hay encargo: se lee de la fase del paseo. */
  estado: EstadoPaseo | null
  paseo: Paseo | null
  /** El paseador es el de ejemplo y lo mueve la demostración. */
  simulado: boolean
  /** Hay un paseador conectado en otra pestaña (si no, se ofrece el botón de demostración). */
  walkerOnline: boolean
  onSimularAceptacion: () => void
  onCancelar: () => void
  onDescartar: () => void
  /** Reasignación: hasta 3 paseadores libres a la misma hora, o null si este paseo no la necesita. */
  reasignacion: Walker[] | null
  onReservarCon: (w: Walker) => void
  /** El pago de este paseo en el libro de pagos (lib/pagos.ts). null = todavía no se registró. */
  pago: Pago | null
  /** Demostración: el paseador es de ejemplo o la cuenta es de demostración (se pueden simular los pasos del equipo). */
  demoPago: boolean
  /** El dueño ya tocó «Recibí a [perro]». */
  entregaConfirmada: boolean
  /** Pasó el plazo de pago (`horasParaPagar`): recordatorio suave. */
  plazoVencido: boolean
  /** Solo en demostración: hace como si el paseador hubiera visto el pago. */
  onSimularVisto: () => void
  /** Lo que se reportó (si el paseo está en disputa) */
  reporte: Reporte | null
  /** Abre «Reportar problema». */
  onReportar: (motivo?: MotivoReporte) => void
  /** Pasó el tiempo y el dueño no confirmó: el equipo la mira (no se confirma sola). */
  entregaSinConfirmar: boolean
  /** Solo en demostración: corre una prueba de los avisos de ubicación (señales inventadas) y la deja en el registro. */
  onProbarAvisos?: (escenario: EscenarioAviso) => void
  /** Las fotos reales de ESTE paseo (las sacó el paseador con la cámara de la app). */
  fotos: FotoPaseo[]
  /** La foto de hoy del paseador (lib/selfie.ts), o null si falta. */
  selfie: FotoPaseo | null
  /** El inicio y el fin del paseo con su ubicación (lib/puntosControl.ts). */
  puntos: PuntoControl[]
  /** La hora de ahora (0 mientras carga). */
  ahora: number
  /** false con un paseador real del servidor: nadie puede aceptar por él (el botón de demostración no se ofrece). */
  puedeSimular?: boolean
  /** Con servidor: los avisos de zona del paseador le llegan al dueño por internet (solo el aviso, no la ubicación). */
  conServidor?: boolean
  /** Con servidor y solo mientras pasea: la última ubicación en vivo del paseador (con la app abierta). */
  enVivo?: { pos: [number, number]; reciente: boolean; haceSegundos: number | null } | null
}) {
  // Los puntos de control: los reales (inicio, fotos y fin) o, en la demostración, los inventados por el guion.
  const empezoGuion = !!walk && (estado === null ? true : estado === 'en_paseo' || estado === 'entregado' || estado === 'cerrado' || estado === 'en_disputa')
  const listaPuntos = useMemo(() => {
    if (simulado && walk) {
      const fotosAt = entries.filter((x) => x.kind === 'photo').map((x) => x.at).sort((a, c) => a - c)
      return puntosDeDemostracion({
        empezo: empezoGuion,
        llego: walk.phase !== 'active',
        fotosAt,
        hora: (f) => clockAt(walk.booking, f),
      })
    }
    return puntosDelPaseo(puntos, fotos)
  }, [simulado, walk, entries, empezoGuion, puntos, fotos])
  const puntosMapa = useMemo(() => posicionesDe(listaPuntos), [listaPuntos])

  // Al tocar «Recibí a [perro]» la pantalla baja sola hasta «Paga a Patitas» (solo ese momento: no cada vez que cambia algo).
  const bloquePago = useRef<HTMLDivElement>(null)
  const yaConfirmada = useRef(entregaConfirmada)
  useEffect(() => {
    if (entregaConfirmada && !yaConfirmada.current) {
      const reducir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      bloquePago.current?.scrollIntoView({ block: 'start', behavior: reducir ? 'auto' : 'smooth' })
    }
    yaConfirmada.current = entregaConfirmada
  }, [entregaConfirmada])

  if (!walk) return <EmptyLive onExplore={onExplore} onDemo={onDemo} />

  const { booking: b } = walk
  const arrived = walk.phase === 'arrived'
  const completed = walk.phase === 'completed'
  const e: EstadoPaseo = estado ?? (completed ? 'cerrado' : arrived ? 'entregado' : 'en_paseo')
  /** Rechazada, vencida o cancelada: el paseo no se hizo. */
  const sinPaseo = e === 'rechazado' || e === 'expirado' || e === 'cancelado'
  const nombres = { paseador: b.walker.firstName, perro: b.dog.name, dueno: '' }
  const hechos = paseo ? pasosDelPaseo(paseo) : 0
  /** El paseador solo ve la ficha y la dirección si aceptó. */
  const fichaVisible = paseo ? seHizo(paseo, 'aceptar') : e !== 'solicitado'
  const cierreDelEquipo = e === 'cerrado' && (!!reporte || !entregaConfirmada)
  const names = groupNames(b)

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      {!sinPaseo && (
        <LiveMap puntos={puntosMapa} demo={simulado} enVivo={enVivo ? { pos: enVivo.pos, reciente: enVivo.reciente } : null} />
      )}

      <div className={cn('relative z-10 flex-1 bg-canvas px-4 pt-5', !sinPaseo && '-mt-7 rounded-t-[2rem]')}>
        <div className="mb-3">
          <EstadoCard estado={e} vista="dueno" nombres={nombres} reporto={reporte?.quien} apoyo={cierreDelEquipo ? 'El equipo lo cerró.' : undefined}>
            <ol className="grid grid-cols-5 gap-1" aria-label="Avance del paseo">
              {PASOS.map((p, i) => (
                <li key={p.id} className="text-center">
                  <span className={cn('mb-1 block h-1.5 rounded-full', i < hechos ? 'bg-forest' : 'bg-ink/10')} />
                  <span className={cn('block text-[12px] font-bold leading-tight', i < hechos ? 'text-ink' : 'text-ink-soft')}>{p.etiqueta}</span>
                </li>
              ))}
            </ol>
            {e === 'solicitado' && !walkerOnline && puedeSimular && (
              <button
                type="button"
                onClick={onSimularAceptacion}
                className="min-h-11 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink/30 px-3 py-2 text-[14px] font-extrabold text-ink active:scale-[0.98]"
              >
                <CircleCheck size={16} /> Simular que {b.walker.firstName} acepta · demostración
              </button>
            )}
            {(e === 'solicitado' || e === 'aceptado' || e === 'en_camino') && (
              <BotonConfirmable
                onConfirm={onCancelar}
                confirmar="Toca otra vez para cancelar"
                className="w-full rounded-2xl px-3 py-2 text-[14px] font-extrabold"
              >
                {e === 'solicitado' ? 'Cancelar la solicitud' : 'Cancelar el paseo'}
              </BotonConfirmable>
            )}
            {sinPaseo && (
              <button type="button" onClick={onDescartar} className={cn(btnPrimary, 'h-12 w-full text-[14.5px]')}>
                Buscar otro paseador <ArrowRight size={18} strokeWidth={2.6} />
              </button>
            )}
            {e === 'entregado' && entregaSinConfirmar && !entregaConfirmada && (
              <p className="rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900">
                Recordatorio: confirma que recibiste a {b.dog.name}. Si no, el equipo la revisará.
              </p>
            )}
            {e === 'en_disputa' && reporte && (
              <p className="rounded-2xl bg-sand p-3 text-[14px] leading-snug text-ink">
                <b>{etiquetaMotivo(reporte.motivo)}:</b> {reporte.texto}
              </p>
            )}
            {(e === 'aceptado' || e === 'en_camino' || e === 'en_paseo' || e === 'entregado') && (
              <button type="button" onClick={() => onReportar()} className="min-h-11 w-full rounded-2xl border border-ink/15 px-3 py-2 text-[14px] font-extrabold text-ink active:scale-[0.98]">
                Reportar problema
              </button>
            )}
          </EstadoCard>
        </div>

        {conServidor && e === 'en_paseo' && <EnVivoDelPaseo enVivo={enVivo} />}
        {paseo && (
          <AvisosPaseo paseo={paseo} vista="dueno" conServidor={conServidor} onProbar={e === 'en_paseo' ? onProbarAvisos : undefined} className="mb-3" />
        )}

        {/* El código de recojo aparece apenas el paseador acepta: el pago es al final del paseo y no lo condiciona. */}
        {pin && (e === 'aceptado' || e === 'en_camino' || e === 'en_paseo') && (
          <div className="mb-3">
            <PinCard pin={pin} walker={b.walker.firstName} />
          </div>
        )}

        {/* Paseador */}
        <section className="rounded-3xl border border-ink/10 bg-paper p-3 shadow-card">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <PortraitAvatar portrait={b.walker.portrait} photo={b.walker.photo} alt={`Foto de ${b.walker.name}`} className="h-[62px] w-[50px] rounded-t-3xl rounded-b-xl border border-ink/10" />
              <SelloPaseador comprobaciones={b.walker.comprobaciones} size={22} className="absolute -bottom-1 -right-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-display text-[19px] font-bold leading-tight text-ink">
                <span className="truncate">{b.walker.name}</span>
                {b.walker.esEjemplo && <EtiquetaEjemplo />}
              </p>
              <p className="line-clamp-2 text-[14px] text-ink-soft">
                {simulado && <span className="mr-1 rounded-full bg-sand px-1.5 py-0.5 text-[12px] font-extrabold text-ink">DEMOSTRACIÓN</span>}
                {e === 'en_paseo' ? 'Paseando a' : e === 'entregado' || e === 'cerrado' || e === 'en_disputa' ? 'Paseó a' : sinPaseo ? 'Iba a pasear a' : 'Paseará a'}{' '}
                <b className="text-ink">{b.dog.name}</b>
                {names.length > 1 ? ` · grupo de ${names.length} ${SIZE_INFO[b.groupSize].plural}` : ' · paseo individual'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={onOpenChat} aria-label="Abrir chat" className="relative grid h-11 w-11 place-items-center rounded-full bg-ink text-white active:scale-95">
                <MessageCircle size={18} />
                <AnimatePresence>
                  {unread > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[12px] font-extrabold ring-2 ring-canvas"
                    >
                      {unread}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
          {!sinPaseo && <SelfieEnPaseo foto={selfie} walker={b.walker} className="mt-3" />}
          <button
            type="button"
            onClick={onOpenDog}
            className="min-h-11 mt-3 flex w-full items-center gap-3 rounded-2xl bg-sand px-3 py-2.5 text-left active:scale-[0.99]"
          >
            <DogAvatar dog={b.dog} className="h-9 w-9 rounded-full" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-extrabold text-ink">Ficha de {b.dog.name}</span>
              <span className="block truncate text-[12px] text-ink-soft">
                {fichaVisible
                  ? `Lo que ve ${b.walker.firstName}: la ficha completa`
                  : e === 'solicitado'
                    ? `${b.walker.firstName} la ve cuando acepte`
                    : `${b.walker.firstName} no llegó a verla`}
              </span>
            </span>
            <ClipboardList size={17} className="shrink-0 text-ink-soft" />
          </button>
        </section>

        {/* Alerta SOS activa */}
        <AnimatePresence>
          {walk.sos === 'on' && (
            <motion.button
              type="button"
              onClick={onOpenSos}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 block w-full overflow-hidden text-left"
            >
              <span className="flex items-center gap-3 rounded-3xl bg-red-600 p-3.5 text-white shadow-pop">
                <ShieldAlert size={22} className="shrink-0" />
                <span className="text-[14px] font-bold leading-snug">Alerta SOS anotada. Todavía no llama ni avisa a nadie: si es urgente, llama tú.</span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>



        {sinPaseo && reasignacion && (
          <OtrosPaseadores className="mt-3" opciones={reasignacion} slot={b.slotLabel} onReservar={onReservarCon} onOtroHorario={onDescartar} />
        )}

        {/* El pago es AL FINAL: antes de «Recibí a [perro]» solo se avisa cuándo se paga; después, a dónde y a nombre de quién. */}
        {!sinPaseo && (
          <div ref={bloquePago} className="mt-3 scroll-mt-4">
            {entregaConfirmada && (e === 'entregado' || e === 'cerrado') ? (
              <PagoCard
                pago={pago}
                monto={b.total}
                paseador={b.walker.firstName}
                demo={demoPago}
                hecho
                plazoVencido={plazoVencido}
                onSimularVisto={onSimularVisto}
                onReportar={() => onReportar('pago')}
              />
            ) : (
              <p className="flex items-center gap-2 rounded-2xl bg-sand p-3.5 text-[14px] font-semibold leading-snug text-ink">
                <Wallet size={17} className="shrink-0" /> {TEXTO_PAGO.lema}
              </p>
            )}
          </div>
        )}

        {/* Último mensaje del paseador */}
        {lastWalkerMessage && !completed && (
          <button
            type="button"
            onClick={onOpenChat}
            className="min-h-11 mt-3 flex w-full items-center gap-3 rounded-3xl border border-ink/10 bg-paper p-3 text-left shadow-card active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              {lastWalkerMessage.photo ? <Camera size={18} /> : <MessageCircle size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-bold text-ink-soft">Último mensaje de {b.walker.firstName}</span>
              <span className="block truncate text-[14px] font-semibold text-ink">
                {lastWalkerMessage.photo && '📸 '}
                {lastWalkerMessage.text}
              </span>
            </span>
            <ArrowRight size={17} className="shrink-0 text-ink-soft" />
          </button>
        )}

        {completed && (
          <div className="mt-4">
            <CompletedCard walk={walk} reviewed={reviewed} porEquipo={cierreDelEquipo} onRebook={onRebook} onWriteReview={onWriteReview} />
          </div>
        )}

        {(e === 'en_paseo' || e === 'entregado' || e === 'cerrado' || e === 'en_disputa') && (
          <div className="mt-7">
            <PuntosDeControl
              puntos={listaPuntos}
              demo={simulado}
              enCurso={e === 'en_paseo' && !simulado}
              ahora={ahora}
              ultimoT={simulado ? null : ultimoControl(paseo, puntos, fotos)}
              className="mb-6"
            />
            {walk.jobId && <FotosPaseo fotos={fotos} perro={b.dog.name} jobId={walk.jobId} className="mb-6" />}
            <Timeline entries={entries} simulado={simulado} />
          </div>
        )}

        {simulado && e === 'en_paseo' && (
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 mx-auto mt-5 flex items-center gap-1.5 rounded-full border border-dashed border-ink/25 px-3.5 py-2 text-[14px] font-bold text-ink-soft active:scale-95"
          >
            <FastForward size={13} /> Modo demo · saltar a la llegada
          </button>
        )}

        {/* Acciones fijas */}
        {!completed && !sinPaseo && (
          <div className="pointer-events-none sticky bottom-0 z-20 -mx-4 mt-4 bg-linear-to-t from-canvas via-canvas/95 to-transparent px-4 pb-3 pt-7">
            <div className="pointer-events-auto grid grid-cols-[0.8fr_1.2fr] gap-2.5">
              <button type="button" onClick={onOpenSos} className={cn(btnRed, 'h-16 rounded-2xl')}>
                <Siren size={24} strokeWidth={2.4} />
                <span className="text-left leading-none">
                  <span className="block text-[20px] font-black tracking-tight">SOS</span>
                  <span className="block text-[12px] font-bold">Emergencia</span>
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenConfirm}
                disabled={e !== 'entregado' || entregaConfirmada}
                className={cn(btnForest, 'relative h-16 overflow-hidden rounded-2xl px-3 disabled:bg-sand-2 disabled:text-ink-soft disabled:shadow-none')}
              >
                {e === 'entregado' && (
                  <motion.span aria-hidden className="absolute inset-0 rounded-2xl bg-white/25" animate={{ opacity: [0.35, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />
                )}
                {e === 'entregado' && !entregaConfirmada ? <ShieldCheck size={23} className="relative shrink-0" /> : <PawPrint size={21} className="relative shrink-0" />}
                <span className="relative text-left leading-tight">
                  <span className="block truncate text-[14px] font-extrabold">
                    {e === 'en_disputa' ? 'Reporte enviado' : entregaConfirmada ? `Recibiste a ${b.dog.name}` : `Recibí a ${b.dog.name}`}
                  </span>
                  <span className="block text-[12px] font-semibold">
                    {e === 'en_disputa' ? 'El equipo lo revisa' : entregaConfirmada ? 'Ya lo confirmaste' : e === 'entregado' ? 'Confirma que lo recibiste' : 'Cuando llegue a casa'}
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
