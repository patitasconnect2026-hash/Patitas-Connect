'use client'

import { motion } from 'framer-motion'
import { NOMBRE_APP } from '@/lib/config'
import { LogoMark } from './ui/Logo'

export interface Toast {
  id: string
  title: string
  body: string
}

/** Aviso estilo notificación push de iOS, para los eventos del paseo. */
export function NotificationBanner({ toast, onOpen }: { toast: Toast; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ y: -90, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="absolute inset-x-3 top-3 z-[90] flex items-center gap-3 rounded-3xl border border-ink/10 bg-paper/95 p-3 text-left shadow-pop backdrop-blur-xl"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600">
        <LogoMark size={26} tone="cream" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between">
          <span className="eyebrow text-ink-soft">{NOMBRE_APP}</span>
          <span className="text-[12px] text-ink-soft">ahora</span>
        </span>
        <span className="block truncate text-[14px] font-extrabold text-ink">{toast.title}</span>
        <span className="block truncate text-[14px] text-ink-soft">{toast.body}</span>
      </span>
    </motion.button>
  )
}
