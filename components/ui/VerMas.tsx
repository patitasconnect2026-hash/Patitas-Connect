import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Detalle plegable con <details> nativo: sin JavaScript, funciona con teclado y lector de pantalla.
 * Para textos largos: arriba va la frase corta y aquí el detalle.
 */
export function VerMas({
  children,
  className,
  abrir = 'Ver más',
  cerrar = 'Ver menos',
}: {
  children: React.ReactNode
  className?: string
  abrir?: string
  cerrar?: string
}) {
  return (
    <details className={cn('group', className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-[14px] font-extrabold text-brand-800 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{abrir}</span>
        <span className="hidden group-open:inline">{cerrar}</span>
        <ChevronDown size={16} aria-hidden className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-1 text-[14px] leading-snug text-ink-soft">{children}</div>
    </details>
  )
}
