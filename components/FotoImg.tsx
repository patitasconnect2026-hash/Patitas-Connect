'use client'

import { useFotoUrl } from '@/lib/datos'
import type { FotoPaseo } from '@/lib/fotos'
import { TEXTO_FOTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { cn } from '@/lib/utils'

/**
 * La imagen de una foto del paseo: sale del almacén de este teléfono o, si la tomó otro teléfono, del almacén privado del
 * servidor con un enlace que vence. Mientras carga, o si falta, lo dice.
 */
export function FotoImg({ foto, alt, className }: { foto: Pick<FotoPaseo, 'id' | 'almacen' | 'ruta'>; alt: string; className?: string }) {
  const { url, estado } = useFotoUrl(foto)
  if (estado === 'lista' && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={cn('object-cover', className)} />
  }
  return (
    <div role="img" aria-label={alt} className={cn('grid place-items-center bg-sand p-2 text-center text-[12px] font-bold leading-tight text-ink-soft', className)}>
      {estado === 'cargando' ? 'Cargando…' : TEXTO_FOTO_SERVIDOR.noCargo}
    </div>
  )
}
