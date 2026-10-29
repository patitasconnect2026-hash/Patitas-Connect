'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'
import { ArrowRight, Clock, MapPin, Star } from 'lucide-react'
import { CONFIG } from '@/lib/config'
import { textoPaseadores } from '@/lib/ejemplos'
import { DISTRICTS, SPOTS, type LatLng } from '@/lib/geo'
import { nextSlot, hourLabel, dayInfo } from '@/lib/schedule'
import type { Dog, Walker } from '@/lib/types'
import { btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { PortraitAvatar } from './ui/PortraitAvatar'
import { VerMas } from './ui/VerMas'
import { useLeaflet } from './map/useLeaflet'
import { dibujarZona } from './map/zonaCapas'
import { tieneCalificacion } from '@/lib/calificacion'

type Zone = 'all' | 'San Isidro' | 'Jesús María'

const ZONES: Array<{ id: Zone; label: string }> = [
  { id: 'all', label: 'Ambos' },
  { id: 'San Isidro', label: 'San Isidro' },
  { id: 'Jesús María', label: 'Jesús María' },
]

/** Pequeño desplazamiento para que los pines de paseadores del mismo parque no se encimen. */
const JITTER: LatLng[] = [
  [0.0007, -0.0009],
  [-0.0008, 0.0008],
  [0.0009, 0.001],
  [-0.0007, -0.001],
  [0.0003, 0.0016],
  [-0.0012, 0.0002],
]

const PAW_SVG =
  '<svg viewBox="0 0 64 64" width="16" height="16" fill="#fff"><ellipse cx="13" cy="30" rx="5.2" ry="7.4" transform="rotate(-22 13 30)"/><ellipse cx="24.5" cy="16.5" rx="5.6" ry="7.8" transform="rotate(-8 24.5 16.5)"/><ellipse cx="39.5" cy="16.5" rx="5.6" ry="7.8" transform="rotate(8 39.5 16.5)"/><ellipse cx="51" cy="30" rx="5.2" ry="7.4" transform="rotate(22 51 30)"/><path d="M32 58 C23 56 15 50 17 42 C19 35 26 32 32 32 C38 32 45 35 47 42 C49 50 41 56 32 58Z"/></svg>'

function walkersAt(walkers: Walker[], spotId: string) {
  return walkers.filter((w) => w.spots.includes(spotId))
}

export function ZonesMap({
  dog,
  casa,
  walkers,
  onBook,
  onSeeWalkers,
}: {
  dog: Dog | null
  /** Los paseadores que se muestran (sin los de ejemplo si «Mostrar ejemplos» está apagado). */
  walkers: Walker[]
  /** La casa que marcó el dueño (si no la marcó, no se dibuja ninguna). */
  casa: LatLng | null
  onBook: (w: Walker) => void
  onSeeWalkers: (spotId: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useLeaflet(ref, { center: [-12.088, -77.04], zoom: 13, minZoom: 11 })
  const [zone, setZone] = useState<Zone>('all')
  const [selected, setSelected] = useState<{ kind: 'spot' | 'walker'; id: string } | null>(null)
  const overlay = useRef<Leaflet.LayerGroup | null>(null)

  const spots = useMemo(() => SPOTS.filter((s) => zone === 'all' || s.district === zone), [zone])
  const spot = selected?.kind === 'spot' ? SPOTS.find((s) => s.id === selected.id) : undefined
  const walker = selected?.kind === 'walker' ? walkers.find((w) => w.id === selected.id) : undefined

  // La zona (borde claro y lo de afuera atenuado) y el encuadre, con un poco de los alrededores
  useEffect(() => {
    if (!ctx) return
    const { L, map } = ctx
    const group = dibujarZona(L, map, { destacado: zone, etiquetas: true })
    const target = L.latLngBounds(DISTRICTS.filter((d) => zone === 'all' || zone === d.name).flatMap((d) => d.polygon))
    // Arriba queda más margen: ahí va la leyenda. Se vuelve a encuadrar al asentarse el marco (escritorio, hojas).
    const encuadrar = (animate: boolean) => {
      map.invalidateSize()
      map.fitBounds(target, { paddingTopLeft: [26, 56], paddingBottomRight: [26, 26], animate })
    }
    encuadrar(true)
    const t = setTimeout(() => {
      if (map.getZoom() <= 14.5) encuadrar(false)
    }, 700)
    return () => {
      clearTimeout(t)
      group.remove()
    }
  }, [ctx, zone])

  // Parques, paseadores y casa
  useEffect(() => {
    if (!ctx) return
    const { L, map } = ctx
    overlay.current?.remove()
    const g = L.layerGroup().addTo(map)
    overlay.current = g

    for (const s of spots) {
      const on = selected?.kind === 'spot' && selected.id === s.id
      L.marker(s.pos, {
        icon: L.divIcon({
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          html: `<div style="width:30px;height:30px;border-radius:999px;background:${on ? '#0f172a' : '#146c43'};border:3px solid #fff;display:grid;place-items:center;box-shadow:0 6px 14px -4px rgba(0,0,0,.5);transform:scale(${on ? 1.2 : 1})">${PAW_SVG}</div>`,
        }),
      })
        .on('click', () => setSelected({ kind: 'spot', id: s.id }))
        .addTo(g)
    }

    // En la vista general solo se ven los parques; los paseadores aparecen al elegir un distrito
    walkers.forEach((w, i) => {
      const home = SPOTS.find((s) => s.id === w.spots[0])
      if (!home || zone === 'all' || home.district !== zone) return
      const j = JITTER[i % JITTER.length]
      const on = selected?.kind === 'walker' && selected.id === w.id
      L.marker([home.pos[0] + j[0], home.pos[1] + j[1]], {
        zIndexOffset: 500,
        icon: L.divIcon({
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          html: `<div style="width:34px;height:34px;border-radius:999px;background:#ea580c;border:3px solid ${on ? '#0f172a' : '#fff'};display:grid;place-items:center;color:#fff;font:800 13px var(--font-sans);box-shadow:0 6px 14px -4px rgba(0,0,0,.5)">${w.firstName[0]}</div>`,
        }),
      })
        .on('click', () => setSelected({ kind: 'walker', id: w.id }))
        .addTo(g)
    })

    // «Tu casa» es la que marcó la persona (no un punto fijo)
    if (casa) {
      L.marker(casa, {
        interactive: false,
        icon: L.divIcon({
          className: '',
          iconSize: [70, 48],
          iconAnchor: [35, 42],
          html: '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><span style="background:#0f172a;color:#fff;border-radius:999px;padding:2px 8px;font:800 12px var(--font-sans)">Tu casa</span><span style="width:12px;height:12px;border-radius:999px;background:#0f172a;border:3px solid #fff"></span></div>',
        }),
      }).addTo(g)
    }

    return () => {
      g.remove()
    }
  }, [ctx, spots, selected, zone, casa, walkers])

  // Al elegir un parque, el mapa se acerca
  useEffect(() => {
    if (ctx && spot) ctx.map.flyTo(spot.pos, 16, { duration: 0.8 })
  }, [ctx, spot])

  const here = spot ? walkersAt(walkers, spot.id) : []

  return (
    <div className="flex min-h-full flex-col bg-canvas pb-6">
      <header className="px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="eyebrow text-brand-700">Cobertura</p>
        <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">Mapa de zonas</h1>
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">Elige un distrito o toca un parque.</p>
        <VerMas abrir="Qué cubre la zona" cerrar="Ver menos">
          Atendemos San Isidro, Jesús María y hasta {CONFIG.zonaBufferMetros} m alrededor de sus límites. Lo gris queda fuera de la zona.
        </VerMas>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3" role="tablist" aria-label="Distrito">
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            role="tab"
            aria-selected={zone === z.id}
            onClick={() => {
              setZone(z.id)
              setSelected(null)
            }}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-3.5 py-2 text-[14px] font-extrabold transition active:scale-95',
              zone === z.id ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink-soft',
            )}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div className="relative mx-4 h-[340px] shrink-0 overflow-hidden rounded-3xl border border-ink/10 shadow-card">
        <div ref={ref} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-2 top-2 z-[500] flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-3 gap-y-0.5 rounded-2xl bg-paper/95 px-3 py-1.5 text-[12px] font-bold text-ink-soft shadow">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-forest" /> Parques
          </span>
          {/* Los paseadores aparecen al elegir un distrito; sin ninguno (ejemplos apagados), no se nombra en la leyenda */}
          {zone !== 'all' && walkers.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Paseadores{walkers.every((w) => w.esEjemplo) ? ' (ejemplo)' : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-3 rounded-[3px] border-2 border-brand-700 bg-brand-700/15" /> Zona
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-3 rounded-[3px] bg-slate-500/50" /> Fuera
          </span>
        </div>
      </div>

      {/* Detalle del parque o del paseador elegido */}
      <div className="mt-4 px-4">
        {walker ? (
          <div className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
            <div className="flex items-center gap-3">
              <PortraitAvatar portrait={walker.portrait} photo={walker.photo} alt={walker.name} className="h-14 w-14 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[20px] font-bold leading-tight text-ink">
                  {walker.name}
                  {walker.esEjemplo && <EtiquetaEjemplo />}
                </p>
                <p className="flex items-center gap-1 text-[14px] text-ink-soft">
                  {tieneCalificacion(walker) && (
                    <>
                      <Star size={13} className="fill-gold text-gold" /> {walker.rating.toFixed(1)} ·{' '}
                    </>
                  )}
                  {walker.neighbor}
                </p>
              </div>
              <p className="font-display text-[20px] font-bold text-ink">S/ {walker.pricePerHour}</p>
            </div>
            {(() => {
              const n = nextSlot(walker, dog)
              return (
                <p className="mt-2.5 flex items-center gap-1.5 text-[14px] font-semibold text-forest">
                  <Clock size={14} />
                  {n ? `Próximo horario: ${dayInfo(n.dayIdx).label} · ${hourLabel(n.hour)}` : 'Sin horarios compatibles esta semana'}
                </p>
              )
            })()}
            <button type="button" onClick={() => onBook(walker)} className={cn(btnPrimary, 'mt-3 h-12 w-full text-[15px]')}>
              Ver horarios con {walker.firstName} <ArrowRight size={17} strokeWidth={2.6} />
            </button>
          </div>
        ) : spot ? (
          <div className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
            <p className="eyebrow text-forest">{spot.district}</p>
            <p className="font-display text-[22px] font-bold leading-tight text-ink">{spot.name}</p>
            <p className="mt-0.5 text-[14px] text-ink-soft">{spot.note}</p>
            <div className="mt-3 flex -space-x-2">
              {here.map((w) => (
                <PortraitAvatar key={w.id} portrait={w.portrait} photo={w.photo} alt={w.name} className="h-9 w-9 rounded-full ring-2 ring-paper" />
              ))}
            </div>
            <p className="mt-1.5 text-[14px] font-semibold text-ink-soft">
              {textoPaseadores(here)} {here.length === 1 ? 'pasea' : 'pasean'} aquí
            </p>
            <button type="button" onClick={() => onSeeWalkers(spot.id)} className={cn(btnPrimary, 'mt-3 h-12 w-full text-[15px]')}>
              Ver paseadores de {spot.name.replace('Parque ', '').replace('Bosque ', '')} <ArrowRight size={17} strokeWidth={2.6} />
            </button>
          </div>
        ) : (
          <div>
            <p className="eyebrow mb-2 px-1 text-ink-soft">Puntos de paseo</p>
            <div className="space-y-2">
              {spots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected({ kind: 'spot', id: s.id })}
                  className="min-h-11 flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-left shadow-card active:scale-[0.99]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-50 text-forest">
                    <MapPin size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-extrabold text-ink">{s.name}</span>
                    <span className="block truncate text-[12px] text-ink-soft">
                      {s.district} · {textoPaseadores(walkersAt(walkers, s.id))}
                    </span>
                  </span>
                  <ArrowRight size={17} className="shrink-0 text-ink-soft" />
                </button>
              ))}
            </div>
          </div>
        )}
        {selected && (
          <button type="button" onClick={() => setSelected(null)} className="min-h-11 mx-auto mt-3 block text-[14px] font-bold text-ink-soft underline underline-offset-4">
            Ver todos los puntos
          </button>
        )}
      </div>
    </div>
  )
}
