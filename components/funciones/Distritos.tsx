'use client'

import { MapPin, Phone } from 'lucide-react'
import { distritosLima, type EstadoDistrito } from '@/lib/distritos'
import { enlaceLlamada, enlaceWhatsApp } from '@/lib/telefono'
import { cn } from '@/lib/utils'
import { VerMas } from '../ui/VerMas'

const ESTADO: Record<EstadoDistrito, { texto: string; tono: string }> = {
  activo: { texto: 'Hoy', tono: 'bg-forest text-white' },
  siguiente: { texto: 'Pronto', tono: 'bg-brand-700 text-white' },
  despues: { texto: 'Después', tono: 'bg-sand text-ink' },
}

/** Distritos (hoy, pronto, después) con la central de serenazgo de cada uno para llamar con un toque. */
export function DistritosSerenazgo({ soloActivos = false, className }: { soloActivos?: boolean; className?: string }) {
  const lista = distritosLima().filter((d) => !soloActivos || d.estado === 'activo')
  return (
    <div className={className}>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((d) => {
          const llamar = enlaceLlamada(d.serenazgo)
          const wa = enlaceWhatsApp(d.whatsapp, `Hola, escribo por una emergencia con un perro en ${d.nombre}.`)
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-paper p-3">
              <MapPin size={18} className="shrink-0 text-brand-700" aria-hidden />
              <div className="min-w-[10rem] flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-extrabold text-ink">
                  {d.nombre}
                  <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-extrabold', ESTADO[d.estado].tono)}>{ESTADO[d.estado].texto}</span>
                </p>
                <p className="text-[12px] leading-snug text-ink-soft">{d.serenazgo ? `Serenazgo ${d.serenazgo}` : 'Serenazgo: falta confirmar'}</p>
              </div>
              {llamar && (
                <a href={llamar} aria-label={`Llamar al serenazgo de ${d.nombre}`} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-vino px-4 text-[14px] font-extrabold text-white active:scale-95">
                  <Phone size={15} aria-hidden /> Llamar
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-forest px-3 text-[14px] font-extrabold text-white active:scale-95">
                  WhatsApp
                </a>
              )}
            </li>
          )
        })}
      </ul>
      <VerMas className="mt-2">
        Las municipalidades publican una central de serenazgo (no un número por caseta). Copiamos cada número de su página o red oficial el 30 de octubre de 2026; el equipo los confirma llamando.
      </VerMas>
    </div>
  )
}
