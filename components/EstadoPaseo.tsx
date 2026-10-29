import { CircleCheck, Clock, Footprints, House, Navigation, PawPrint, Send, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { EstadoPaseo } from '@/lib/paseo'
import { textosPaseo, type Nombres, type Vista } from '@/lib/paseoTextos'
import { cn } from '@/lib/utils'

const ESTILO: Record<EstadoPaseo, { icono: LucideIcon; fondo: string; icon: string }> = {
  solicitado: { icono: Send, fondo: 'border-ink/10 bg-paper', icon: 'bg-sand text-ink' },
  aceptado: { icono: CircleCheck, fondo: 'border-forest/25 bg-forest-50', icon: 'bg-forest text-white' },
  en_camino: { icono: Navigation, fondo: 'border-brand-200 bg-brand-50', icon: 'bg-brand-700 text-white' },
  en_paseo: { icono: Footprints, fondo: 'border-forest/25 bg-forest-50', icon: 'bg-forest text-white' },
  entregado: { icono: House, fondo: 'border-forest/25 bg-forest-50', icon: 'bg-forest text-white' },
  cerrado: { icono: PawPrint, fondo: 'border-forest/25 bg-forest-50', icon: 'bg-forest text-white' },
  rechazado: { icono: X, fondo: 'border-ink/10 bg-sand', icon: 'bg-ink text-white' },
  expirado: { icono: Clock, fondo: 'border-ink/10 bg-sand', icon: 'bg-ink text-white' },
  cancelado: { icono: X, fondo: 'border-ink/10 bg-sand', icon: 'bg-ink text-white' },
  en_disputa: { icono: TriangleAlert, fondo: 'border-amber-200 bg-amber-50', icon: 'bg-amber-600 text-white' },
}

/**
 * El estado del paseo, en una tarjeta. La usan la pantalla del dueño y la del paseador: leen el estado de lib/paseo.ts
 * y el texto de lib/paseoTextos.ts. Lo que cuelga como `children` son las acciones de ese estado.
 */
export function EstadoCard({
  estado,
  vista,
  nombres,
  reporto,
  apoyo,
  children,
  className,
}: {
  estado: EstadoPaseo
  vista: Vista
  nombres: Nombres
  /** Solo en disputa: quién hizo el reporte (la otra persona lee «Reporte recibido»). */
  reporto?: Vista
  /** Cambia la línea de apoyo (por ejemplo, cuando el equipo cerró el paseo). */
  apoyo?: string
  children?: React.ReactNode
  className?: string
}) {
  const e = ESTILO[estado]
  const t = textosPaseo(estado, vista, nombres, reporto)
  return (
    <section role="status" aria-live="polite" aria-label="Estado del paseo" className={cn('rounded-3xl border p-4 shadow-card', e.fondo, className)}>
      <div className="flex items-center gap-3">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', e.icon)}>
          <e.icono size={22} strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-bold leading-tight text-ink">{t.titulo}</p>
          <p className="text-[14px] leading-snug text-ink-soft">{apoyo ?? t.apoyo}</p>
        </div>
      </div>
      {children && <div className="mt-3 space-y-2.5">{children}</div>}
    </section>
  )
}
