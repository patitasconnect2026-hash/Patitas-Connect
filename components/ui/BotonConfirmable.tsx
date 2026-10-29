'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Un botón que no se puede tocar sin querer: el primer toque lo «arma» y avisa; el segundo confirma.
 * Si no se toca otra vez en 4 segundos, vuelve a su estado. Para lo que no tiene vuelta atrás (cancelar, rechazar, anular).
 */
export function BotonConfirmable({
  children,
  confirmar = 'Toca otra vez para confirmar',
  onConfirm,
  className,
  reposoClassName = 'bg-sand text-ink',
  armadoClassName = 'bg-red-600 text-white',
}: {
  children: React.ReactNode
  confirmar?: string
  onConfirm: () => void
  /** Tamaño, forma y letra (lo que no cambia entre «en reposo» y «armado»). */
  className?: string
  /** Colores en reposo y armado. No se mezclan: Tailwind no decide por el orden de las clases. */
  reposoClassName?: string
  armadoClassName?: string
}) {
  const [armado, setArmado] = useState(false)

  useEffect(() => {
    if (!armado) return
    const t = setTimeout(() => setArmado(false), 4000)
    return () => clearTimeout(t)
  }, [armado])

  return (
    <button
      type="button"
      aria-live="polite"
      onClick={() => {
        if (armado) {
          setArmado(false)
          onConfirm()
        } else setArmado(true)
      }}
      className={cn('min-h-11 active:scale-[0.98]', className, armado ? armadoClassName : reposoClassName)}
    >
      {armado ? confirmar : children}
    </button>
  )
}
