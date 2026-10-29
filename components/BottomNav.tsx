'use client'

import { motion } from 'framer-motion'
import { Compass, Footprints, Map as MapIcon, Shield, User, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'explore' | 'map' | 'live' | 'safety' | 'profile'

const SIDE: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'explore', label: 'Explorar', icon: Compass },
  { id: 'map', label: 'Mapa', icon: MapIcon },
  { id: 'safety', label: 'Seguridad', icon: Shield },
  { id: 'profile', label: 'Perfil', icon: User },
]

export function BottomNav({
  tab,
  onChange,
  liveBadge,
  exploreBadge = 0,
}: {
  tab: Tab
  onChange: (t: Tab) => void
  liveBadge: boolean
  /** Cuántas respuestas a «Pedir paseo» esperan en Explorar. */
  exploreBadge?: number
}) {
  const item = (it: (typeof SIDE)[number]) => {
    const active = tab === it.id
    return (
      <li key={it.id} className="flex-1">
        <button
          type="button"
          onClick={() => onChange(it.id)}
          aria-current={active ? 'page' : undefined}
          className="min-h-11 relative flex w-full flex-col items-center gap-0.5 pb-0.5 pt-2.5"
        >
          {active && (
            <motion.span
              layoutId="nav-bar"
              className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-brand-600"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">
            <it.icon size={22} strokeWidth={active ? 2.6 : 2} className={cn('transition-colors', active ? 'text-brand-700' : 'text-ink-soft')} />
            {it.id === 'explore' && exploreBadge > 0 && (
              <span className="absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-brand-700 px-1 text-[12px] font-extrabold leading-4 text-white">
                <span className="sr-only">{exploreBadge} nuevos. </span>
                <span aria-hidden>{exploreBadge}</span>
              </span>
            )}
          </span>
          <span className={cn('text-[12px] font-extrabold', active ? 'text-brand-700' : 'text-ink-soft')}>{it.label}</span>
        </button>
      </li>
    )
  }

  const liveActive = tab === 'live'
  return (
    <nav
      aria-label="Navegación principal"
      className="relative z-30 shrink-0 border-t border-ink/10 bg-paper/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <ul className="flex items-end px-1">
        {item(SIDE[0])}
        {item(SIDE[1])}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => onChange('live')}
            aria-current={liveActive ? 'page' : undefined}
            className="min-h-11 relative -mt-6 flex w-full flex-col items-center gap-0.5"
          >
            <span
              className={cn(
                'relative grid h-[58px] w-[58px] place-items-center rounded-full ring-[5px] ring-canvas transition-colors',
                liveActive ? 'bg-brand-600 shadow-press' : 'bg-ink shadow-press-ink',
              )}
            >
              <Footprints size={25} className="text-white" strokeWidth={2.4} />
              {liveBadge && (
                <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
                </span>
              )}
            </span>
            <span className={cn('text-[12px] font-extrabold', liveActive ? 'text-brand-700' : 'text-ink-soft')}>Paseo</span>
          </button>
        </li>
        {item(SIDE[2])}
        {item(SIDE[3])}
      </ul>
    </nav>
  )
}
