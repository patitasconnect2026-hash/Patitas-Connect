'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bell, Footprints, MapPin, Play, Plus, ShieldCheck, X } from 'lucide-react'
import { CONFIG, NOMBRE_CORTO, textoPlanLargo, TEXTOS_PAGO } from '@/lib/config'
import { TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { TEXTO_PEDIDO } from '@/lib/pedidosTextos'
import { ETIQUETA_ESTADO } from '@/lib/paseoTextos'
import type { EstadoPaseo } from '@/lib/paseo'
import { TEXTO_EJEMPLOS } from '@/lib/ejemplos'
import { DISTRICTS, SPOTS } from '@/lib/geo'
import { TEXTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { SIZE_INFO, walkerFits } from '@/lib/schedule'
import type { Account, Dog, Walk, Walker } from '@/lib/types'
import { btnInk, btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { reglaNuevoDueno, restoComprobaciones, resumenComprobaciones, textoHastaComprobaciones, textoMaxPerros } from '@/lib/verificacion'
import { HeroHighFive, PawTrail } from './HeroHighFive'
import { WalkerCard } from './WalkerCard'
import { DogAvatar } from './ui/Dog'
import { InterruptorEjemplos } from './ui/InterruptorEjemplos'
import { Logo } from './ui/Logo'
import { VerMas } from './ui/VerMas'

export type Filter = 'all' | 'San Isidro' | 'Jesús María' | 'fits' | 'favs' | 'ahora'

const RULES: Array<{ n: string; title: string; text: string; mas?: string }> = [
  {
    n: '01',
    title: textoHastaComprobaciones(),
    text: resumenComprobaciones(),
    mas: `${restoComprobaciones()} ${reglaNuevoDueno()}`,
  },
  {
    n: '02',
    title: `Pago a ${NOMBRE_CORTO}`,
    text: TEXTOS_PAGO.honestidad,
    mas: 'Pagas el precio del paseo al terminar. El equipo confirma el pago en su cuenta y le paga al paseador.',
  },
  {
    n: '03',
    title: 'Fotos y puntos de control',
    text: 'Fotos con hora y lugar, y avisos.',
    mas: 'El seguimiento es por puntos de control con foto: la ubicación se registra al empezar, al terminar y en cada foto.',
  },
  {
    n: '04',
    title: 'Mismo tamaño, siempre',
    text: textoMaxPerros(),
    mas: 'Un perro grande puede arrastrar a uno pequeño.',
  },
]

const MORE = [
  { tag: 'Nuevo', title: 'Ficha y chapita QR', text: 'Ficha digital de tu perro y una chapita con QR para encontrarlo si se pierde.' },
  { tag: 'Nuevo', title: 'Plan lunes a viernes', text: textoPlanLargo() },
  { tag: 'Pronto', title: 'Álbum del paseo', text: 'Las fotos del paseo, listas para compartir.' },
  { tag: 'Pronto', title: 'Baño al volver', text: 'Tu perro regresa paseado y limpio. Con tu mismo paseador.' },
  { tag: 'Pronto', title: 'Cuidado en casa', text: 'Cuando viajes, un paseador de confianza lo cuida en tu casa.' },
]

/** Los dos distritos dibujados con sus límites reales (de OpenStreetMap). */
function ZoneThumb() {
  const { paths, spots } = useMemo(() => {
    const all = DISTRICTS.flatMap((d) => d.polygon)
    const lats = all.map((p) => p[0])
    const lngs = all.map((p) => p[1])
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const kx = Math.cos((-12.09 * Math.PI) / 180)
    const W = 320
    const H = 150
    const s = Math.min((W - 24) / ((maxLng - minLng) * kx), (H - 24) / (maxLat - minLat))
    const ox = (W - (maxLng - minLng) * kx * s) / 2
    const oy = (H - (maxLat - minLat) * s) / 2
    const proj = (la: number, ln: number): [number, number] => [ox + (ln - minLng) * kx * s, oy + (maxLat - la) * s]
    return {
      paths: DISTRICTS.map((d) => ({
        id: d.id,
        name: d.name,
        d: d.polygon.map((p, i) => `${i ? 'L' : 'M'}${proj(p[0], p[1]).map((n) => n.toFixed(1)).join(' ')}`).join(' ') + 'Z',
        c: proj(d.center[0], d.center[1]),
      })),
      spots: SPOTS.map((sp) => ({ id: sp.id, p: proj(sp.pos[0], sp.pos[1]) })),
    }
  }, [])
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden>
      {paths.map((p) => (
        <g key={p.id}>
          <path d={p.d} fill="#cd4f27" fillOpacity=".14" stroke="#cd4f27" strokeWidth="1.6" strokeDasharray="5 4" strokeLinejoin="round" />
          <text x={p.c[0]} y={p.c[1]} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#8a2f16" letterSpacing=".5" style={{ textTransform: 'uppercase' }}>
            {p.name}
          </text>
        </g>
      ))}
      {spots.map((s) => (
        <circle key={s.id} cx={s.p[0]} cy={s.p[1]} r="3.4" fill="#146c43" stroke="#fff" strokeWidth="1.4" />
      ))}
    </svg>
  )
}

export function Explore({
  account,
  dogs,
  dog,
  onPickDog,
  onAddDog,
  walk,
  filter,
  onFilter,
  spotFilter,
  onSpot,
  onClearSpot,
  walkers,
  favs,
  onFav,
  onDni,
  onBook,
  onReviews,
  onGoLive,
  onGoMap,
  onDemo,
  onApply,
  mostrarEjemplos,
  onMostrarEjemplos,
  estadoLista,
  onReintentarLista,
  pedido,
  estado = null,
}: {
  account: Account | null
  dogs: Dog[]
  dog: Dog | null
  onPickDog: (id: string) => void
  onAddDog: () => void
  walk: Walk | null
  filter: Filter
  onFilter: (f: Filter) => void
  spotFilter: string | null
  /** Elige un parque o zona para filtrar la lista (null = todos). */
  onSpot?: (id: string | null) => void
  onClearSpot: () => void
  walkers: Walker[]
  favs: string[]
  onFav: (w: Walker) => void
  onDni: (w: Walker) => void
  onBook: (w: Walker) => void
  onReviews: (w: Walker) => void
  onGoLive: () => void
  onGoMap: () => void
  onDemo: () => void
  onApply: () => void
  /** «Mostrar ejemplos»: paseadores y reseñas inventados (encendido en la demostración). */
  mostrarEjemplos: boolean
  /** Sin esto no se ofrece el interruptor (con servidor y sesión no hay ejemplos). */
  onMostrarEjemplos?: (v: boolean) => void
  /** Con servidor: la lista todavía se está pidiendo, o no se pudo pedir (se dice en vez de «aún no hay paseadores»). */
  estadoLista?: 'cargando' | 'sin_conexion'
  onReintentarLista?: () => void
  /** «Pedir paseo»: la tarjeta del pedido activo, o el botón para pedir uno. */
  pedido?: React.ReactNode
  /** Estado del paseo de la familia (el mismo con «Pedir paseo» o con una reserva). */
  estado?: EstadoPaseo | null
}) {
  const listRef = useRef<HTMLElement>(null)
  const spot = spotFilter ? SPOTS.find((s) => s.id === spotFilter) : null

  const list = useMemo(() => {
    const base = walkers.filter((w) => {
      if (spotFilter && !w.spots.includes(spotFilter)) return false
      if (filter === 'favs') return favs.includes(w.id)
      if (filter === 'San Isidro' || filter === 'Jesús María') return w.district === filter
      if (filter === 'fits') return walkerFits(w, dog)
      if (filter === 'ahora') return w.disponible !== false
      return true
    })
    // Primero los disponibles ahora y, entre ellos, los compatibles con tu perro
    return [...base].sort((a, b) => Number(b.disponible !== false) - Number(a.disponible !== false) || Number(walkerFits(b, dog)) - Number(walkerFits(a, dog)))
  }, [walkers, filter, spotFilter, dog, favs])

  // La lista sale por tandas («Ver más»). Al cambiar un filtro vuelve a la primera tanda.
  const [tandas, setTandas] = useState({ clave: '', n: 1 })
  const claveFiltro = `${filter}|${spotFilter ?? ''}`
  const n = tandas.clave === claveFiltro ? tandas.n : 1
  const visibles = list.slice(0, n * CONFIG.paseadoresPorTanda)
  const faltan = list.length - visibles.length

  const walking = walk && walk.phase !== 'completed'
  /** El paseo ya empezó (o no se sabe: demostración). Antes de eso es una solicitud o un paseo aceptado, no uno «en curso». */
  const enMarcha = !estado || estado === 'en_camino' || estado === 'en_paseo' || estado === 'entregado'
  const initials = account ? `${account.firstName[0] ?? ''}${account.lastName[0] ?? ''}` : ''

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'ahora', label: TEXTO_RESERVAS.filtroDisponibles },
    { id: 'San Isidro', label: 'San Isidro' },
    { id: 'Jesús María', label: 'Jesús María' },
    ...(dog ? [{ id: 'fits' as Filter, label: `Para ${dog.name}` }] : []),
    ...(favs.length ? [{ id: 'favs' as Filter, label: `♥ Favoritos (${favs.length})` }] : []),
  ]

  return (
    <div className="pb-8">
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-700 px-5 pt-[max(1.1rem,env(safe-area-inset-top))] text-white">
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.07]" aria-hidden>
          <defs>
            <pattern id="paws" width="74" height="74" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
              <g transform="scale(.42)">
                <ellipse cx="13" cy="30" rx="5.2" ry="7.4" transform="rotate(-22 13 30)" fill="currentColor" />
                <ellipse cx="24.5" cy="16.5" rx="5.6" ry="7.8" transform="rotate(-8 24.5 16.5)" fill="currentColor" />
                <ellipse cx="39.5" cy="16.5" rx="5.6" ry="7.8" transform="rotate(8 39.5 16.5)" fill="currentColor" />
                <ellipse cx="51" cy="30" rx="5.2" ry="7.4" transform="rotate(22 51 30)" fill="currentColor" />
                <path d="M32 58 C23 56 15 50 17 42 C19 35 26 32 32 32 C38 32 45 35 47 42 C49 50 41 56 32 58Z" fill="currentColor" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#paws)" />
        </svg>

        <div className="relative flex items-center justify-between">
          <Logo tone="cream" size={34} animated />
          {account ? (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-[14px] font-extrabold text-brand-800" aria-label={`Cuenta de ${account.firstName}`}>
              {initials}
            </span>
          ) : (
            <button type="button" aria-label="Notificaciones" className="grid h-11 w-11 place-items-center rounded-full bg-white/15">
              <Bell size={18} />
            </button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-7"
        >
          <p className="eyebrow flex items-center gap-1.5 text-white">
            <MapPin size={13} /> San Isidro y Jesús María, Lima
          </p>
          <h1 className="font-display mt-2.5 text-[40px] font-bold leading-[1.02] tracking-tight text-balance">
            El paseo{' '}
            <span className="relative inline-block italic">
              con cuidado
              <svg viewBox="0 0 120 12" className="absolute -bottom-1.5 left-0 h-3 w-full text-gold" aria-hidden preserveAspectRatio="none">
                <motion.path
                  d="M2 8 Q 12 1 22 7 T 42 7 T 62 7 T 82 7 T 102 7 T 118 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.9, ease: 'easeInOut' }}
                />
              </svg>
            </span>{' '}
            que tu mejor amigo merece
          </h1>
          <p className="mt-4 max-w-[330px] text-[15px] leading-relaxed text-white">
            Paseadores del barrio, con fotos y puntos de control. Piloto en San Isidro y Jesús María.
          </p>
        </motion.div>

        {/* Pantallas bajas: de 700 a 820 px de alto se achica; bajo 700 px se oculta (si no, tapa «Encontrar paseador»). */}
        <div className="relative mt-3 [@media(max-height:820px)]:-mb-[86px] [@media(max-height:820px)]:mt-1 [@media(max-height:700px)]:hidden">
          <div className="[@media(max-height:820px)]:origin-top [@media(max-height:820px)]:scale-[0.6]">
            <HeroHighFive />
          </div>
        </div>

        <div className="relative pb-7 pt-1">
          <div className="relative">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-ink"
              animate={{ scale: [1, 1.08], opacity: [0.5, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
            <button
              type="button"
              onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={cn(btnInk, 'relative h-[58px] w-full text-[16.5px]')}
            >
              <ShieldCheck size={21} strokeWidth={2.5} />
              Encontrar paseador
            </button>
          </div>
          <button
            type="button"
            onClick={onDemo}
            className="min-h-11 mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[14px] font-bold text-white underline decoration-brand-200/60 underline-offset-4"
          >
            <Play size={14} className="fill-current" />
            Ver demo del paseo
          </button>
        </div>

        <PawTrail className="pointer-events-none absolute inset-x-0 bottom-9 h-12" />
        <svg viewBox="0 0 400 36" preserveAspectRatio="none" className="relative -mb-px block h-9 w-full text-canvas" aria-hidden>
          <path d="M0 36V14C40 2 82 0 128 8s96 24 150 14 82-22 122-14v28Z" fill="currentColor" />
        </svg>
      </section>

      {/* PASEO EN CURSO */}
      <AnimatePresence>
        {walking && (
          <motion.button
            type="button"
            onClick={onGoLive}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-1 block w-[calc(100%-2rem)] overflow-hidden text-left"
          >
            <span className="flex items-center gap-3 rounded-3xl border border-brand-200 bg-brand-50 p-3 shadow-card">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white">
                <Footprints size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[16px] font-bold text-ink">
                  {enMarcha ? 'Paseo en curso con' : 'Tu paseo con'} {walk.booking.walker.firstName}
                </span>
                <span className="block text-[12px] text-ink-soft">
                  {walk.booking.dog.name} · {estado && !enMarcha ? ETIQUETA_ESTADO[estado] : walk.phase === 'arrived' ? 'Llegó a casa, confirma' : 'Ver el paseo'}
                </span>
              </span>
              <ArrowRight size={18} className="text-brand-700" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* TU PERRO */}
      <section className="mt-5 px-4" aria-label="Tu perro">
        {dogs.length === 0 ? (
          <button
            type="button"
            onClick={onAddDog}
            className="min-h-11 flex w-full items-center gap-3.5 rounded-3xl border-2 border-dashed border-brand-600/40 bg-brand-50/60 p-4 text-left"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
              <Plus size={22} strokeWidth={2.6} />
            </span>
            <span>
              <span className="block font-display text-[18px] font-bold text-ink">Registra a tu perro</span>
              <span className="block text-[14px] leading-snug text-ink-soft">Con su foto y tamaño te mostramos solo horarios con perros de su mismo tamaño.</span>
            </span>
          </button>
        ) : (
          <div>
            <p className="eyebrow mb-2 px-1 text-ink-soft">¿Quién pasea hoy?</p>
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
              {dogs.map((d) => {
                const on = dog?.id === d.id
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onPickDog(d.id)}
                    aria-pressed={on}
                    className={cn(
                      'min-h-11 flex shrink-0 items-center gap-2.5 rounded-full border-2 py-1.5 pl-1.5 pr-4 transition active:scale-95',
                      on ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink',
                    )}
                  >
                    <DogAvatar dog={d} className="h-10 w-10 rounded-full" />
                    <span className="text-left leading-tight">
                      <span className="block text-[14px] font-extrabold">{d.name}</span>
                      <span className={cn('block text-[12px] font-semibold', on ? 'text-white/65' : 'text-ink-soft')}>{SIZE_INFO[d.size].label}</span>
                    </span>
                  </button>
                )
              })}
              <button
                type="button"
                onClick={onAddDog}
                aria-label="Agregar otro perro"
                className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full border-2 border-dashed border-ink/25 text-ink-soft active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* DOS FORMAS DE PEDIR: «Pedir paseo» (tú pones el monto) o reservar con un paseador. Las dos terminan en el mismo paseo y el mismo pago. */}
      {pedido && (
        <section className="mt-5 px-4" aria-label="Cómo pedir tu paseo">
          {pedido}
          <p className="mt-2 px-1 text-[14px] leading-snug text-ink-soft">{TEXTO_PEDIDO.dosFormas}</p>
          <button
            type="button"
            onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="min-h-11 mt-1 px-1 text-[14px] font-extrabold text-brand-700 underline underline-offset-4"
          >
            {TEXTO_PEDIDO.reservaLink}
          </button>
        </section>
      )}

      {/* LAS REGLAS */}
      <section className="mt-7" aria-labelledby="reglas">
        <div className="px-5">
          <p className="eyebrow text-brand-700">Reglas del piloto</p>
          <h2 id="reglas" className="font-display text-[28px] font-bold leading-tight text-ink">
            Así funciona cada paseo
          </h2>
        </div>
        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
          {RULES.map((r, i) => (
            <motion.div
              key={r.n}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="w-[236px] shrink-0 snap-start rounded-3xl border border-ink/10 bg-paper p-5 shadow-card"
            >
              <span className="font-display text-[44px] font-bold italic leading-none text-brand-600/90">{r.n}</span>
              <h3 className="mt-3 font-display text-[19px] font-bold leading-tight text-ink">{r.title}</h3>
              <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{r.text}</p>
              {r.mas && <VerMas>{r.mas}</VerMas>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* MAPA */}
      <section className="mt-6 px-4">
        <button
          type="button"
          onClick={onGoMap}
          className="min-h-11 block w-full overflow-hidden rounded-3xl border border-ink/10 bg-paper text-left shadow-card active:scale-[0.99]"
        >
          <span className="block h-[150px] bg-sand">
            <ZoneThumb />
          </span>
          <span className="flex items-center justify-between gap-3 p-4">
            <span>
              <span className="block font-display text-[20px] font-bold leading-tight text-ink">Mira los dos distritos completos</span>
              <span className="mt-0.5 block text-[14px] text-ink-soft">12 parques de paseo y los paseadores de cada zona.</span>
            </span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white">
              <ArrowRight size={18} />
            </span>
          </span>
        </button>
      </section>

      {/* PASEADORES */}
      <section ref={listRef} className="mt-8 scroll-mt-4 px-4" aria-labelledby="paseadores">
        <div className="px-1">
          <p className="eyebrow text-brand-700">Reserva una hora</p>
          <h2 id="paseadores" className="font-display text-[28px] font-bold leading-tight text-ink">
            Paseadores del barrio
          </h2>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">
            Estudiantes del barrio. Comprueba su DNI en la puerta.
          </p>
        </div>
        {onMostrarEjemplos && <InterruptorEjemplos activo={mostrarEjemplos} onChange={onMostrarEjemplos} className="mt-3" />}

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Filtrar paseadores">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => onFilter(f.id)}
              className={cn(
                'min-h-11 shrink-0 rounded-full border px-4 py-2 text-[14px] font-extrabold transition active:scale-95',
                filter === f.id ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink-soft',
              )}
            >
              {f.label}
            </button>
          ))}
          {spot && (
            <button
              type="button"
              onClick={onClearSpot}
              className="min-h-11 flex shrink-0 items-center gap-1.5 rounded-full border border-forest bg-forest-50 px-3.5 py-2 text-[14px] font-extrabold text-forest"
            >
              <MapPin size={13} /> {spot.name.replace('Parque ', '')} <X size={13} />
            </button>
          )}
        </div>

        {onSpot && (
          <label className="mt-3 block">
            <span className="eyebrow text-ink-soft">{TEXTO_RESERVAS.filtroParque}</span>
            <select
              value={spotFilter ?? ''}
              onChange={(e) => onSpot(e.target.value || null)}
              className="mt-1 h-11 w-full rounded-2xl border border-ink/15 bg-paper px-3 text-[16px] font-semibold text-ink"
            >
              <option value="">{TEXTO_RESERVAS.todosLosParques}</option>
              {SPOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4 space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibles.map((w, i) => (
              <WalkerCard key={w.id} walker={w} index={i} dog={dog} fav={favs.includes(w.id)} onFav={onFav} onDni={onDni} onBook={onBook} onReviews={onReviews} />
            ))}
          </AnimatePresence>
          {faltan > 0 && (
            <button
              type="button"
              onClick={() => setTandas({ clave: claveFiltro, n: n + 1 })}
              className="min-h-11 w-full rounded-full border border-ink/15 bg-paper px-4 py-2 text-[14px] font-extrabold text-ink active:scale-95"
            >
              {TEXTO_RESERVAS.verMas} ({faltan})
            </button>
          )}
          {list.length === 0 && walkers.length === 0 && estadoLista === 'cargando' && (
            <p className="rounded-2xl bg-sand p-4 text-center text-[14px] font-semibold text-ink-soft">{TEXTO_SERVIDOR.buscandoPaseadores}</p>
          )}
          {list.length === 0 && walkers.length === 0 && estadoLista === 'sin_conexion' && (
            <div className="rounded-2xl bg-amber-50 p-4 text-center text-amber-900">
              <p className="text-[15px] font-extrabold">{TEXTO_SERVIDOR.noCargaronPaseadores}</p>
              <p className="mt-1 text-[14px] leading-snug">{TEXTO_SERVIDOR.noCargoApoyo}</p>
              {onReintentarLista && (
                <button type="button" onClick={onReintentarLista} className="mt-2 min-h-11 rounded-full bg-amber-600 px-5 text-[14px] font-extrabold text-white active:scale-95">
                  {TEXTO_SERVIDOR.reintentar}
                </button>
              )}
            </div>
          )}
          {list.length === 0 &&
            !(walkers.length === 0 && estadoLista) &&
            (walkers.length === 0 ? (
              <div className="rounded-2xl bg-sand p-4 text-center">
                <p className="text-[15px] font-extrabold text-ink">{TEXTO_EJEMPLOS.sinPaseadores}</p>
                <p className="mt-1 text-[14px] leading-snug text-ink-soft">{TEXTO_EJEMPLOS.sinPaseadoresApoyo}</p>
              </div>
            ) : (
              <p className="rounded-2xl bg-sand p-4 text-center text-[14px] font-semibold text-ink-soft">No hay paseadores con ese filtro todavía.</p>
            ))}
        </div>
      </section>

      {/* MÁS QUE UN PASEO */}
      <section className="mt-9" aria-labelledby="mas">
        <div className="px-5">
          <p className="eyebrow text-brand-700">Más que un paseo</p>
          <h2 id="mas" className="font-display text-[28px] font-bold leading-tight text-ink">
            Más para tu perro
          </h2>
        </div>
        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
          {MORE.map((m) => (
            <div key={m.title} className="w-[220px] shrink-0 snap-start rounded-3xl border border-ink/10 bg-paper p-5 shadow-card">
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-1 text-[12px] font-extrabold uppercase tracking-wider',
                  m.tag === 'Nuevo' ? 'bg-forest text-white' : 'bg-sand text-ink-soft',
                )}
              >
                {m.tag}
              </span>
              <h3 className="mt-3 font-display text-[19px] font-bold leading-tight text-ink">{m.title}</h3>
              <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RECLUTAMIENTO */}
      <section className="mx-4 mt-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-brand-50">
          <p className="eyebrow text-brand-300">Para estudiantes</p>
          <h2 className="font-display mt-1.5 text-[26px] font-bold leading-[1.08]">Gana paseando en tu barrio.</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-brand-50/70">Elige tus horarios y pasea cerca de tu universidad.</p>
          <p className="mt-1 text-[14px] leading-relaxed text-brand-50/70">{TEXTOS_PAGO.honestidadPaseador}</p>
          <button type="button" onClick={onApply} className={cn(btnPrimary, 'mt-5 h-[52px] w-full text-[15.5px]')}>
            Postular como paseador <ArrowRight size={18} strokeWidth={2.6} />
          </button>
        </div>
      </section>
    </div>
  )
}
