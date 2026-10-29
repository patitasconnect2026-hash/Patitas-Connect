import { TEXTO_EJEMPLOS } from '@/lib/ejemplos'
import { cn } from '@/lib/utils'

/**
 * La etiqueta «Ejemplo»: va en todo paseador, reseña o paseo inventado. Borde punteado y letras en mayúscula: no se
 * confunde con una etiqueta real (como «Nuevo»). Una prueba (`lib/ejemplos.test.ts`) vigila que no falte.
 */
export function EtiquetaEjemplo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-dashed border-ink/45 bg-sand px-2 py-0.5 text-[12px] font-extrabold uppercase leading-tight tracking-wide text-ink',
        className,
      )}
    >
      {TEXTO_EJEMPLOS.etiqueta}
    </span>
  )
}
