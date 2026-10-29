'use client'

import { Info, Lock, MapPin, ScreenShare, TriangleAlert, Users } from 'lucide-react'
import { btnPrimary } from '@/lib/ui'
import { TEXTO_PANTALLA, TEXTO_UBICACION } from '@/lib/zonaTextos'
import { cn } from '@/lib/utils'
import { Sheet } from '../ui/Sheet'
import { VerMas } from '../ui/VerMas'
import type { EstadoUbicacion, SensoresPaseo } from './useSensoresPaseo'

const LINEA: Record<EstadoUbicacion, string> = {
  activa: TEXTO_UBICACION.activa,
  esperando: TEXTO_UBICACION.esperando,
  sin_senal: TEXTO_UBICACION.sinSenal,
  negada: TEXTO_UBICACION.negada,
  omitida: TEXTO_UBICACION.omitida,
  no_disponible: TEXTO_UBICACION.noDisponible,
  sin_decidir: TEXTO_UBICACION.sinDecidir,
}

/**
 * La pantalla corta que explica para qué se pide la ubicación, ANTES de que el navegador pida el permiso.
 * Cerrarla es lo mismo que «Ahora no»: el paseo sigue y el registro anota que no hubo ubicación.
 */
export function UbicacionSheet({ onPermitir, onAhoraNo, conServidor = false }: { onPermitir: () => void; onAhoraNo: () => void; conServidor?: boolean }) {
  return (
    <Sheet label={TEXTO_UBICACION.titulo} onClose={onAhoraNo}>
      <div className="px-5 pb-2 pt-4">
        <p className="eyebrow text-brand-700">{TEXTO_UBICACION.eyebrow}</p>
        <h2 className="font-display text-[26px] font-bold leading-tight text-ink">{TEXTO_UBICACION.titulo}</h2>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
        <ul className="space-y-2.5">
          {[
            { icono: MapPin, texto: TEXTO_UBICACION.linea1 },
            { icono: Lock, texto: conServidor ? TEXTO_UBICACION.linea2Servidor : TEXTO_UBICACION.linea2 },
            { icono: Users, texto: conServidor ? TEXTO_UBICACION.linea3Servidor : TEXTO_UBICACION.linea3 },
          ].map((l) => (
            <li key={l.texto} className="flex items-start gap-3 rounded-2xl bg-sand p-3.5">
              <l.icono size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <span className="text-[14.5px] font-bold leading-snug text-ink">{l.texto}</span>
            </li>
          ))}
        </ul>
        <VerMas abrir={TEXTO_UBICACION.masAbrir}>{conServidor ? TEXTO_UBICACION.masServidor : TEXTO_UBICACION.mas}</VerMas>
      </div>
      <div className="shrink-0 space-y-1.5 border-t border-ink/10 bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button type="button" onClick={onPermitir} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
          {TEXTO_UBICACION.permitir}
        </button>
        <button type="button" onClick={onAhoraNo} className="min-h-11 w-full text-[14px] font-extrabold text-ink-soft underline underline-offset-4">
          {TEXTO_UBICACION.ahoraNo}
        </button>
      </div>
    </Sheet>
  )
}

/** Cómo va la ubicación y la pantalla encendida, en la pantalla «Hoy» del paseador durante el paseo. */
export function UbicacionCard({ sensores, onActivar, className }: { sensores: SensoresPaseo; onActivar: () => void; className?: string }) {
  const { ubicacion } = sensores
  const bien = ubicacion === 'activa'
  const linea = LINEA[ubicacion]
  const Icono = bien ? MapPin : ubicacion === 'esperando' || ubicacion === 'sin_senal' ? Info : TriangleAlert

  return (
    <section aria-label={TEXTO_UBICACION.bloque} className={cn('rounded-3xl border border-ink/10 bg-paper p-4', className)}>
      <p className="eyebrow text-ink-soft">{TEXTO_UBICACION.bloque}</p>
      <p className={cn('mt-1 flex items-start gap-2 text-[14.5px] font-extrabold leading-snug', bien ? 'text-forest' : 'text-ink')}>
        <Icono size={16} className="mt-0.5 shrink-0" />
        {linea}
      </p>
      {ubicacion === 'negada' && <p className="mt-1 text-[14px] leading-snug text-ink-soft">{TEXTO_UBICACION.negadaComo}</p>}
      {(ubicacion === 'omitida' || ubicacion === 'sin_decidir') && (
        <button type="button" onClick={onActivar} className="min-h-11 mt-1.5 rounded-full bg-ink px-4 text-[14px] font-extrabold text-white active:scale-95">
          {TEXTO_UBICACION.activar}
        </button>
      )}
      {/* A la vista, no escondido: los avisos de zona son solo una ayuda y con la pantalla apagada no funcionan */}
      <p className="mt-2 flex items-start gap-2 text-[14px] font-bold leading-snug text-ink-soft">
        <ScreenShare size={16} className="mt-0.5 shrink-0" />
        {TEXTO_PANTALLA.avisos}
      </p>
      <VerMas abrir={TEXTO_PANTALLA.masAbrir}>
        <p>{TEXTO_PANTALLA.mas}</p>
        <p className="mt-2">{TEXTO_PANTALLA.https}</p>
      </VerMas>
    </section>
  )
}
