'use client'

import { useEffect, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'
import { Check, Search, TriangleAlert, X } from 'lucide-react'
import { DISTRICTS, type LatLng } from '@/lib/geo'
import { clasificarPunto, distritoDe } from '@/lib/zona'
import { TEXTO_CASA, textoZona } from '@/lib/zonaTextos'
import { buscarDireccion, type Lugar } from '@/lib/direcciones'
import { TEXTO_MAPA } from '@/lib/mapaTextos'
import { btnPrimary, btnSoft, inputBase } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { useLeaflet, type LeafletLib } from './map/useLeaflet'
import { dibujarZona } from './map/zonaCapas'
import { Sheet } from './ui/Sheet'
import { VerMas } from './ui/VerMas'

/** Resultado de la zona para un punto: ícono y texto corto (el detalle va en «Ver más»). */
export function ResultadoZona({ punto, className }: { punto: LatLng; className?: string }) {
  const clase = clasificarPunto(punto)
  const t = textoZona(clase)
  const distrito = distritoDe(punto)
  const fuera = clase === 'fuera'
  return (
    <div
      className={cn(
        'rounded-2xl p-3.5',
        fuera ? 'bg-red-50 ring-1 ring-red-200' : clase === 'borde' ? 'bg-amber-50 ring-1 ring-amber-300/60' : 'bg-forest-50 ring-1 ring-forest/20',
        className,
      )}
    >
      <p className={cn('flex items-center gap-2 text-[14.5px] font-extrabold', fuera ? 'text-red-800' : clase === 'borde' ? 'text-amber-900' : 'text-forest')}>
        {clase === 'dentro' ? <Check size={17} strokeWidth={3} /> : <TriangleAlert size={17} />}
        {t.titulo}
        {distrito && clase === 'dentro' && <span className="font-bold text-ink-soft">· {distrito}</span>}
      </p>
      {t.apoyo && <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">{t.apoyo}</p>}
      {t.detalle && <VerMas>{t.detalle}</VerMas>}
    </div>
  )
}

function iconoCasa(L: LeafletLib) {
  return L.divIcon({
    className: '',
    iconSize: [70, 48],
    iconAnchor: [35, 42],
    html: '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><span style="background:#0f172a;color:#fff;border-radius:999px;padding:2px 8px;font:800 12px var(--font-sans)">Tu casa</span><span style="width:12px;height:12px;border-radius:999px;background:#0f172a;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></span></div>',
  })
}

/**
 * «Marca tu casa»: un mapa con la zona donde se toca (o se arrastra el punto) para marcar dónde vives.
 * Solo se puede usar un punto dentro de la zona o en el borde; uno de afuera dice «Aún no llegamos a tu zona.»
 * y no se guarda. El punto se queda en este teléfono.
 */
export function CasaSheet({
  valor,
  onSave,
  onClose,
  onSaveDireccion,
}: {
  valor: LatLng | null
  onSave: (casa: LatLng) => void
  onClose: () => void
  /** Si el mapa no carga, la persona puede escribir su dirección a mano (no reemplaza marcar la casa). */
  onSaveDireccion?: (direccion: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inicial = useRef(valor)
  const [mapaFalla, setMapaFalla] = useState(false)
  const ctx = useLeaflet(ref, { center: valor ?? [-12.088, -77.04], zoom: valor ? 16 : 13, minZoom: 11 }, () => setMapaFalla(true))
  const [punto, setPunto] = useState<LatLng | null>(valor)
  const guardado = useRef(false)
  const [consulta, setConsulta] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [lugares, setLugares] = useState<Lugar[]>([])
  /** El lugar real que encontró el buscador (se borra si la persona mueve el punto). */
  const [lugar, setLugar] = useState<string | null>(null)
  const [aMano, setAMano] = useState('')
  const [aManoOk, setAManoOk] = useState(false)

  const buscar = async () => {
    if (buscando) return
    setBuscando(true)
    setAviso(null)
    setLugares([])
    const r = await buscarDireccion(consulta)
    setBuscando(false)
    if (!r.ok) setAviso(r.motivo === 'corta' ? TEXTO_MAPA.corta : TEXTO_MAPA.sinConexion)
    else if (r.lugares.length === 0) setAviso(TEXTO_MAPA.sinResultados)
    else setLugares(r.lugares)
  }
  const elegirLugar = (l: Lugar) => {
    setPunto(l.punto)
    setLugar(l.nombre)
    setLugares([])
    ctx?.map.setView(l.punto, 17, { animate: false })
  }

  // La zona se dibuja una vez; si no hay punto todavía, el mapa muestra los dos distritos
  useEffect(() => {
    if (!ctx) return
    const { L, map } = ctx
    const zona = dibujarZona(L, map)
    map.invalidateSize()
    if (!inicial.current) map.fitBounds(L.latLngBounds(DISTRICTS.flatMap((d) => d.polygon)), { padding: [20, 20], animate: false })
    const alTocar = (e: Leaflet.LeafletMouseEvent) => {
      setPunto([e.latlng.lat, e.latlng.lng])
      setLugar(null)
    }
    map.on('click', alTocar)
    return () => {
      map.off('click', alTocar)
      zona.remove()
    }
  }, [ctx])

  // El punto marcado (se puede arrastrar)
  useEffect(() => {
    if (!ctx || !punto) return
    const { L, map } = ctx
    const marca = L.marker(punto, { draggable: true, icon: iconoCasa(L), zIndexOffset: 1000, keyboard: false })
    marca.on('dragend', () => {
      const p = marca.getLatLng()
      setPunto([p.lat, p.lng])
      setLugar(null)
    })
    marca.addTo(map)
    // El punto y su rótulo tienen que verse enteros aunque se toque cerca del borde del mapa
    map.panInside(punto, { paddingTopLeft: [50, 64], paddingBottomRight: [50, 24] })
    return () => {
      marca.remove()
    }
  }, [ctx, punto])

  const clase = punto ? clasificarPunto(punto) : null
  const puedeUsar = !!punto && clase !== 'fuera'

  const usar = () => {
    // Un doble toque no guarda dos veces.
    if (guardado.current || !punto || !puedeUsar) return
    guardado.current = true
    onSave(punto)
  }

  return (
    <Sheet label="Marca tu casa" onClose={onClose} full>
      <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
        <div>
          <p className="eyebrow text-brand-700">Tu casa</p>
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink">Marca tu casa</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>
      {/* Lo del medio se desliza (con el buscador y el aviso del mapa cabe en un celular chico); el botón de abajo queda siempre a la vista */}
      <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="px-5 text-[14px] leading-snug text-ink-soft">{TEXTO_CASA.indicacion}</p>

      <form
        className="px-5 pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          void buscar()
        }}
      >
        <label htmlFor="buscar-direccion" className="text-[13px] font-bold text-ink-soft">
          {TEXTO_MAPA.buscarEtiqueta}
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="buscar-direccion"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder={TEXTO_MAPA.buscarEjemplo}
            className={cn(inputBase, 'min-w-0 flex-1')}
          />
          <button type="submit" disabled={buscando} className={cn(btnSoft, 'h-12 shrink-0 gap-1.5 px-4 text-[14px] disabled:opacity-50')}>
            <Search size={16} aria-hidden /> {buscando ? TEXTO_MAPA.buscando : TEXTO_MAPA.buscar}
          </button>
        </div>
        <div aria-live="polite">
          {aviso && <p className="mt-2 text-[14px] font-bold text-ink">{aviso}</p>}
          {lugares.length > 0 && (
            <ul className="mt-2 divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-paper" aria-label={TEXTO_MAPA.resultados}>
              {lugares.map((l) => (
                <li key={`${l.punto[0]},${l.punto[1]}`}>
                  <button type="button" onClick={() => elegirLugar(l)} className="min-h-11 w-full px-3 py-2 text-left text-[14px] font-semibold text-ink active:bg-sand">
                    {l.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {lugar && (
            <p className="mt-2 text-[14px] text-ink">
              <span className="font-extrabold">{TEXTO_MAPA.lugarEncontrado}:</span> {lugar}. {TEXTO_MAPA.arrastra}
            </p>
          )}
        </div>
      </form>

      {mapaFalla && (
        <div role="alert" className="mx-5 mt-3 space-y-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-300/60">
          <p className="text-[14px] font-extrabold text-amber-900">{TEXTO_MAPA.mapaFalla}</p>
          {onSaveDireccion && (
            <>
              <p className="text-[14px] text-ink">{TEXTO_MAPA.aMano}</p>
              <label htmlFor="direccion-a-mano" className="block text-[13px] font-bold text-ink-soft">
                {TEXTO_MAPA.aManoEtiqueta}
              </label>
              <div className="flex gap-2">
                <input id="direccion-a-mano" autoComplete="street-address" value={aMano} onChange={(e) => setAMano(e.target.value)} className={cn(inputBase, 'min-w-0 flex-1')} />
                <button
                  type="button"
                  disabled={aMano.trim().length < 4}
                  onClick={() => {
                    onSaveDireccion(aMano.trim())
                    setAManoOk(true)
                  }}
                  className={cn(btnSoft, 'h-12 shrink-0 px-4 text-[14px] disabled:opacity-50')}
                >
                  {TEXTO_MAPA.aManoGuardar}
                </button>
              </div>
              <p className="text-[13px] text-ink-soft">{aManoOk ? TEXTO_MAPA.aManoGuardada : TEXTO_MAPA.aManoAviso}</p>
            </>
          )}
        </div>
      )}

      <div className="relative mx-5 mt-3 h-[200px] overflow-hidden rounded-3xl border border-ink/10 [@media(min-height:720px)]:h-[260px]">
        <div ref={ref} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-2 top-2 z-[500] flex items-center gap-3 rounded-full bg-paper/95 px-3 py-1.5 text-[12px] font-bold text-ink-soft shadow">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-3 rounded-[3px] border-2 border-brand-700 bg-brand-700/15" /> Zona
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-3 rounded-[3px] bg-slate-500/50" /> Fuera
          </span>
        </div>
      </div>
      </div>

      <div className="shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {/* Alto reservado: el mapa no cambia de tamaño al pasar de «dentro» a «fuera» (los toques no se corren) */}
        <div className="mb-3 min-h-[6.5rem]" aria-live="polite">
          {punto ? (
            <ResultadoZona punto={punto} />
          ) : (
            // Antes de marcar: para qué es y quién lo ve (el lugar del resultado está libre)
            <p className="rounded-2xl bg-sand p-3.5 text-[14px] font-semibold leading-snug text-ink">{TEXTO_CASA.privacidad}</p>
          )}
        </div>
        <button
          type="button"
          onClick={usar}
          disabled={!puedeUsar}
          className={cn(btnPrimary, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
        >
          {TEXTO_CASA.usar}
        </button>
      </div>
    </Sheet>
  )
}
