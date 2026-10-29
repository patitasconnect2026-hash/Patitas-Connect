'use client'

import { Bike, Footprints, ShieldCheck, Users } from 'lucide-react'
import { usePaseos } from '@/lib/datos'
import { estadoVisible, type WalkerApplication } from '@/lib/walkerStore'

function Tile({ icon, numero, etiqueta }: { icon: React.ReactNode; numero: number; etiqueta: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">{icon}</span>
      <div className="min-w-0">
        <p className="font-display text-[26px] font-bold leading-none tabular-nums">{numero}</p>
        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-ink-soft">{etiqueta}</p>
      </div>
    </div>
  )
}

/**
 * Resumen rápido para el equipo: cuántas cuentas de paseador hay, cuántas ya están activas, a cuántas familias
 * distintas les llegó un paseo y cuántos paseos se concretaron de verdad. Solo tiene sentido con servidor (el
 * equipo ve todas las postulaciones y todos los paseos de la base); en modo local no se muestra.
 */
export function Estadisticas({ postulaciones }: { postulaciones: ReadonlyArray<{ app: WalkerApplication }> }) {
  const [paseos] = usePaseos()

  const paseadoresActivos = postulaciones.filter((p) => estadoVisible(p.app) === 'activo').length
  const familiasUnicas = new Set(paseos.map((j) => j.familiaId || j.ownerFirst)).size
  const concretados = paseos.filter((j) => j.paseo.estado === 'entregado' || j.paseo.estado === 'cerrado').length

  return (
    <section className="mt-6" aria-label="Estadísticas del equipo">
      <h2 className="font-display text-[22px] font-bold leading-tight">Estadísticas</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={<Bike size={20} />} numero={postulaciones.length} etiqueta="Cuentas de paseador creadas" />
        <Tile icon={<ShieldCheck size={20} />} numero={paseadoresActivos} etiqueta="Paseadores activos (pueden trabajar)" />
        <Tile icon={<Users size={20} />} numero={familiasUnicas} etiqueta="Familias que ya pidieron un paseo" />
        <Tile icon={<Footprints size={20} />} numero={concretados} etiqueta="Paseos concretados" />
      </div>
    </section>
  )
}
