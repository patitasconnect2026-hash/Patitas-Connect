'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, MapPin, Printer, Wallet } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { QrCode } from '@/components/ui/QrCode'
import { CONFIG, NOMBRE_CORTO, TEXTOS_PAGO } from '@/lib/config'
import { MAX_PERROS_POR_PASEO, resumenComprobaciones, textoHastaComprobaciones } from '@/lib/verificacion'

export function AficheClient({ building, code }: { building: string; code: string }) {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const url = `${origin || 'https://patitas-connect.vercel.app'}/?ref=${code}`

  return (
    <main className="min-h-dvh bg-[#d9cfbd] py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 0 } @media print { body { background: #fff } .no-print { display: none !important } }`}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4">
        <p className="text-[14px] leading-snug text-ink-soft">
          Cambia el edificio y el código en la dirección: <code className="rounded bg-white/70 px-1.5 py-0.5">/afiche?e=Torre Los Olivos&amp;c=OLIVOS</code>
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-extrabold text-white"
        >
          <Printer size={17} /> Imprimir
        </button>
      </div>

      {/* Hoja A4 */}
      <article className="relative mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-brand-600 text-brand-50 shadow-2xl print:shadow-none">
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.08]" aria-hidden>
          <defs>
            <pattern id="ap" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
              <g transform="scale(.7)">
                <ellipse cx="13" cy="30" rx="5.2" ry="7.4" transform="rotate(-22 13 30)" fill="currentColor" />
                <ellipse cx="24.5" cy="16.5" rx="5.6" ry="7.8" transform="rotate(-8 24.5 16.5)" fill="currentColor" />
                <ellipse cx="39.5" cy="16.5" rx="5.6" ry="7.8" transform="rotate(8 39.5 16.5)" fill="currentColor" />
                <ellipse cx="51" cy="30" rx="5.2" ry="7.4" transform="rotate(22 51 30)" fill="currentColor" />
                <path d="M32 58 C23 56 15 50 17 42 C19 35 26 32 32 32 C38 32 45 35 47 42 C49 50 41 56 32 58Z" fill="currentColor" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ap)" />
        </svg>

        <header className="relative flex items-center justify-between px-[16mm] pt-[14mm]">
          <Logo tone="cream" size={52} />
          <span className="rounded-full bg-brand-50 px-5 py-2 text-[13pt] font-extrabold text-brand-800">San Isidro · Jesús María</span>
        </header>

        <section className="relative px-[16mm] pt-[18mm]">
          <p className="eyebrow text-[11pt] text-brand-100">Para vecinos de {building}</p>
          <h1 className="font-display mt-3 text-[54pt] font-bold leading-[0.98] tracking-tight">
            El paseo <span className="italic underline decoration-gold decoration-[5px] underline-offset-[10px]">con cuidado</span> que tu mejor amigo merece.
          </h1>
          <p className="mt-6 max-w-[150mm] text-[16pt] leading-snug text-brand-50/90">
            Estudiantes que viven o estudian en tu distrito. Con fotos y puntos de control (demostración) y pago a {NOMBRE_CORTO}.
          </p>
        </section>

        <ul className="relative mt-[10mm] space-y-4 px-[16mm]">
          {[
            { icon: BadgeCheck, t: textoHastaComprobaciones(), d: resumenComprobaciones() },
            { icon: MapPin, t: `Mismo tamaño, máx. ${MAX_PERROS_POR_PASEO} perros`, d: 'Tu perro nunca se mezcla con perros de otro tamaño.' },
            { icon: Wallet, t: `Pago a ${NOMBRE_CORTO}`, d: TEXTOS_PAGO.honestidad },
          ].map((b) => (
            <li key={b.t} className="flex items-center gap-4">
              <span className="grid h-[15mm] w-[15mm] shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                <b.icon size={26} />
              </span>
              <span>
                <span className="block font-display text-[19pt] font-bold leading-tight">{b.t}</span>
                <span className="block text-[12.5pt] text-brand-50/85">{b.d}</span>
              </span>
            </li>
          ))}
        </ul>

        <footer className="relative mt-auto flex items-end justify-between gap-6 bg-ink px-[16mm] py-[12mm]">
          <div>
            <p className="eyebrow text-[10pt] text-brand-300">{CONFIG.descuentoBienvenida > 0 ? 'Primer paseo' : 'Piloto en tu edificio'}</p>
            <p className="font-display text-[44pt] font-bold leading-none">
              {CONFIG.descuentoBienvenida > 0 ? `S/ ${CONFIG.descuentoBienvenida} dscto.` : 'Reserva tu primer paseo'}
            </p>
            <p className="mt-3 text-[13pt] text-brand-50/80">
              Escanea el QR o usa el código <b className="rounded bg-brand-600 px-2 py-0.5 tracking-wider">{code}</b>
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white p-3">
            <QrCode value={url} size={150} />
          </div>
        </footer>
      </article>
    </main>
  )
}
