'use client'

import { useState } from 'react'
import { MapPinned, MessageCircle, Phone, Share2, ShieldAlert, Signal } from 'lucide-react'
import { CONFIG, NOMBRE_CORTO } from '@/lib/config'
import { botonesSerenazgo } from '@/lib/distritos'
import { enlaceUltimaUbicacion, estadoSenal, mensajeUltimaUbicacion, RECOMENDACIONES_SENAL, type Escalon, type Lectura } from '@/lib/protocoloSenal'
import { contactoPrincipal } from '@/lib/config'
import { enlaceLlamada } from '@/lib/telefono'
import { cn } from '@/lib/utils'
import { VerMas } from '../ui/VerMas'

const TONO: Record<Escalon, string> = {
  normal: 'border-forest/25 bg-forest-50',
  debil: 'border-gold/50 bg-sand',
  perdida: 'border-brand-300 bg-brand-50',
  llamada: 'border-brand-600 bg-brand-50',
  alerta: 'border-red-400 bg-red-50',
}

const enlaceBoton = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[14px] font-extrabold active:scale-95'

/**
 * El protocolo si la ubicación del paseo deja de llegar (o se mueve como un auto): en qué escalón está, qué hacer y los
 * botones de cada escalón. Siempre ofrece abrir y compartir la última ubicación en Google Maps.
 */
export function PanelSenal({
  lecturas,
  ahora,
  modo,
  perro,
  paseador,
  distrito,
  onChat,
}: {
  lecturas: Lectura[]
  ahora: number
  modo: 'en_vivo' | 'puntos'
  perro: string
  paseador: string
  distrito: string | null
  onChat: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const e = estadoSenal(lecturas, ahora, CONFIG, modo)
  const mapa = enlaceUltimaUbicacion(lecturas)
  const mensaje = mensajeUltimaUbicacion({ perro, paseador, lecturas, ahora })
  const serenazgo = botonesSerenazgo(mensaje).find((b) => b.distrito === distrito) ?? botonesSerenazgo(mensaje, CONFIG, true)[0]
  const patitas = contactoPrincipal()
  const policia = enlaceLlamada(CONFIG.emergenciasNacionales.policia) ?? `tel:${CONFIG.emergenciasNacionales.policia}`

  const compartir = async () => {
    try {
      if (navigator.share) await navigator.share({ text: mensaje })
      else {
        await navigator.clipboard.writeText(mensaje)
        setCopiado(true)
      }
    } catch {
      // La persona cerró el menú de compartir: no es un error que mostrar.
    }
  }

  return (
    <section aria-labelledby="senal-titulo" aria-live="polite" className={cn('mb-3 rounded-2xl border-2 p-3.5', TONO[e.escalon])}>
      <div className="flex items-start gap-2.5">
        {e.escalon === 'alerta' ? <ShieldAlert size={20} className="mt-0.5 shrink-0 text-red-700" aria-hidden /> : <Signal size={20} className="mt-0.5 shrink-0 text-forest" aria-hidden />}
        <div className="min-w-0">
          <h3 id="senal-titulo" className="text-[15px] font-extrabold leading-tight text-ink">
            {e.titulo}
          </h3>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            {lecturas.length === 0 ? 'Aún sin ubicación.' : e.minutos === 0 ? 'Última ubicación: ahora.' : `Última ubicación: hace ${e.minutos} min.`}
          </p>
        </div>
      </div>

      {e.queHacer.length > 0 && (
        <ol className="mt-2.5 list-decimal space-y-1 pl-5 text-[14px] leading-snug text-ink">
          {e.queHacer.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {e.botones.includes('chat') && (
          <button type="button" onClick={onChat} className={cn(enlaceBoton, 'bg-paper text-ink ring-1 ring-ink/15')}>
            <MessageCircle size={16} aria-hidden /> Chat
          </button>
        )}
        {e.botones.includes('serenazgo') &&
          (serenazgo?.llamar ? (
            <a href={serenazgo.llamar} className={cn(enlaceBoton, 'bg-vino text-white')}>
              <Phone size={16} aria-hidden /> Serenazgo
            </a>
          ) : (
            <span className={cn(enlaceBoton, 'bg-sand text-ink-soft')}>Serenazgo: falta confirmar</span>
          ))}
        {e.botones.includes('policia') && (
          <a href={policia} className={cn(enlaceBoton, 'bg-red-600 text-white')}>
            <Phone size={16} aria-hidden /> Policía {CONFIG.emergenciasNacionales.policia}
          </a>
        )}
        {e.botones.includes('patitas') &&
          (patitas && enlaceLlamada(patitas.telefono) ? (
            <a href={enlaceLlamada(patitas.telefono) ?? undefined} className={cn(enlaceBoton, 'bg-brand-700 text-white')}>
              <Phone size={16} aria-hidden /> {NOMBRE_CORTO}
            </a>
          ) : (
            <span className={cn(enlaceBoton, 'bg-sand text-ink-soft')}>{NOMBRE_CORTO}: falta configurar</span>
          ))}
        {mapa && (
          <a href={mapa} target="_blank" rel="noopener noreferrer" className={cn(enlaceBoton, 'bg-paper text-ink ring-1 ring-ink/15')}>
            <MapPinned size={16} aria-hidden /> Google Maps
          </a>
        )}
        {mapa && (
          <button type="button" onClick={() => void compartir()} className={cn(enlaceBoton, 'bg-paper text-ink ring-1 ring-ink/15')}>
            <Share2 size={16} aria-hidden /> {copiado ? 'Copiado' : 'Compartir'}
          </button>
        )}
      </div>

      <VerMas>
        {modo === 'puntos' ? `Sin servidor, la ubicación llega con cada foto de control (cada ${CONFIG.minutosPuntoControl} minutos). ` : 'Funciona con la app del paseador abierta. '}
        {RECOMENDACIONES_SENAL.familia.join(' ')}
      </VerMas>
    </section>
  )
}
