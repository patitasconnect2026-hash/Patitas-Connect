'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Medal, Sparkles, X } from 'lucide-react'
import { CONFIG } from '@/lib/config'
import { estadoPlanes, gananciaPorNivel, NIVELES, planesFamilia, precioPlan, type PlanFamiliaId } from '@/lib/planes'
import { cn, solesShort } from '@/lib/utils'
import { Sheet } from '../ui/Sheet'

const ICONO: Record<PlanFamiliaId, typeof Crown> = { gratis: Check, plus: Sparkles, club: Crown }

/** Las tres membresías de las familias, en tarjetas. Mientras no se cobre, lo dice arriba. */
export function PlanesFamilia({ className }: { className?: string }) {
  const planes = planesFamilia()
  return (
    <div className={className}>
      <p className="inline-flex rounded-full bg-sand px-3 py-1 text-[12px] font-extrabold text-ink">{estadoPlanes()}</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {planes.map((p, i) => {
          const Icono = ICONO[p.id]
          const destacado = p.id === 'plus'
          return (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className={cn('flex flex-col rounded-3xl border p-5 shadow-card', destacado ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper')}
            >
              <div className="flex items-center gap-2">
                <span className={cn('grid h-9 w-9 place-items-center rounded-xl', destacado ? 'bg-brand-700 text-white' : 'bg-sand text-ink')}>
                  <Icono size={18} aria-hidden />
                </span>
                <h3 className="font-display text-[22px] font-bold text-ink">{p.nombre}</h3>
              </div>
              <p className="mt-2 font-display text-[30px] font-bold leading-none text-ink">
                {precioPlan(p.id) === 0 ? 'Sin costo' : solesShort(precioPlan(p.id))}
                {precioPlan(p.id) > 0 && <span className="text-[14px] font-semibold text-ink-soft"> / mes</span>}
              </p>
              <p className="mt-1 text-[14px] text-ink-soft">{p.lema}</p>
              <ul className="mt-4 space-y-1.5 text-[14px] text-ink">
                {p.ventajas.map((v) => (
                  <li key={v} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-forest" aria-hidden /> {v}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-ink/10 pt-3 text-[12px] leading-snug text-ink-soft">
                {p.limites.pedidosAbiertos === 1 ? '1 pedido abierto' : `${p.limites.pedidosAbiertos} pedidos abiertos`} ·{' '}
                {p.limites.reservasPorSemana === null ? 'reservas sin límite' : `${p.limites.reservasPorSemana} reservas por semana`} · cancelas gratis hasta{' '}
                {p.limites.horasCancelacionGratis} h antes
              </p>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

/** Niveles del paseador con su comisión y una calculadora: cuánto recibe al mes en cada nivel. */
export function NivelesPaseador({ className, claro = false }: { className?: string; claro?: boolean }) {
  const [bruto, setBruto] = useState(1200)
  const filas = gananciaPorNivel(bruto)
  return (
    <div className={className}>
      <ul className="grid gap-3 md:grid-cols-3">
        {NIVELES.map((n, i) => (
          <motion.li
            key={n.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className={cn('rounded-3xl p-5', claro ? 'bg-white/10 ring-1 ring-white/15' : 'border border-ink/10 bg-paper shadow-card')}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className={cn('flex items-center gap-2 font-display text-[22px] font-bold', claro ? 'text-white' : 'text-ink')}>
                <Medal size={20} aria-hidden /> {n.nombre}
              </h3>
              <span className={cn('rounded-full px-3 py-1 text-[14px] font-extrabold', claro ? 'bg-white text-vino' : 'bg-vino text-white')}>
                {CONFIG.comisionPorNivel[n.id]} % comisión
              </span>
            </div>
            <p className={cn('mt-2 text-[14px]', claro ? 'text-white/80' : 'text-ink-soft')}>
              {n.minPaseos === 0 ? 'Al entrar.' : `${n.minPaseos} paseos, puntaje ${String(n.minPuntaje).replace('.', ',')}+ y ${n.minCursos} cursos.`}
            </p>
            <ul className={cn('mt-3 space-y-1 text-[14px]', claro ? 'text-white' : 'text-ink')}>
              {n.ventajas.map((v) => (
                <li key={v} className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0" aria-hidden /> {v}
                </li>
              ))}
            </ul>
          </motion.li>
        ))}
      </ul>

      <div className={cn('mt-5 rounded-3xl p-5', claro ? 'bg-white text-ink' : 'bg-sand')}>
        <label htmlFor="calc-bruto" className="flex items-baseline justify-between gap-2 text-[14px] font-extrabold text-ink">
          Si tus paseos suman al mes <span className="font-display text-[22px]">{solesShort(bruto)}</span>
        </label>
        <input
          id="calc-bruto"
          type="range"
          min={200}
          max={3000}
          step={100}
          value={bruto}
          onChange={(e) => setBruto(Number(e.target.value))}
          className="barra-deslizador mt-2 h-11 w-full cursor-pointer appearance-none bg-transparent"
          style={{ ['--relleno' as string]: `${((bruto - 200) / 2800) * 100}%` }}
        />
        <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
          {filas.map((f) => (
            <li key={f.nivel.id} className="rounded-2xl bg-paper p-2.5">
              <p className="text-[12px] font-bold text-ink-soft">{f.nivel.nombre}</p>
              <p className="font-display text-[18px] font-bold text-ink">{solesShort(Math.round(f.recibe))}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-ink-soft">{CONFIG.comisionPorNivelActiva ? 'Así se cobra hoy.' : `Simulado: hoy todos pagan ${CONFIG.comision} %.`}</p>
      </div>
    </div>
  )
}

/** Hoja con los planes (desde «Mi perfil» de la familia). */
export function PlanesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Planes y membresías" onClose={onClose} full>
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
        <h2 className="font-display text-[26px] font-bold leading-tight text-ink">Planes</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <PlanesFamilia />
      </div>
    </Sheet>
  )
}
