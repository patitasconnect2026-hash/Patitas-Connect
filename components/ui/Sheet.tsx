'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Bottom sheet nativo. Se monta dentro de un <AnimatePresence> del padre
 * (por eso usa `exit`) y queda confinado al marco del teléfono (absolute).
 */
export function Sheet({
  label,
  onClose,
  full = false,
  children,
}: {
  label: string
  onClose: () => void
  full?: boolean
  children: React.ReactNode
}) {
  const dialogo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // El foco entra a la hoja y, al cerrarla, vuelve al botón que la abrió.
  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogo.current?.focus({ preventScroll: true })
    return () => anterior?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="absolute inset-0 z-[70] m-0! flex items-end">
      <motion.button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-ink/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={dialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-paper shadow-2xl outline-hidden',
          full ? 'h-[94%]' : 'max-h-[92%]',
        )}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 34, stiffness: 340 }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink/15" aria-hidden />
        {children}
      </motion.div>
    </div>
  )
}
