'use client'

import { useEffect, useState } from 'react'
import { Lock, X } from 'lucide-react'
import { avisosPara, cambiar, CANALES, encendido, guardarPreferencias, leerPreferencias, NOMBRE_GRUPO, type Grupo, type Para, type Preferencias } from '@/lib/notificaciones'
import { cn } from '@/lib/utils'
import { Sheet } from '../ui/Sheet'

const ORDEN: Grupo[] = ['seguridad', 'paseo', 'pedidos', 'pagos', 'cuenta']

/** Qué avisos llegan. Los de seguridad no se apagan (candado). Se guardan en este teléfono. */
export function CentroAvisos({ quien }: { quien: Para }) {
  const [prefs, setPrefs] = useState<Preferencias>({})
  const [error, setError] = useState(false)
  // Lo guardado se lee después de pintar (no en el primer render) para no romper la hidratación.
  useEffect(() => {
    const t = setTimeout(() => setPrefs(leerPreferencias()), 0)
    return () => clearTimeout(t)
  }, [])
  const tipos = avisosPara(quien)

  return (
    <div className="space-y-6">
      <section aria-labelledby="canales" className="rounded-2xl bg-sand p-4">
        <h3 id="canales" className="text-[14px] font-extrabold text-ink">
          Cómo llegan
        </h3>
        <ul className="mt-2 space-y-1.5 text-[14px] leading-snug text-ink">
          {CANALES.map((c) => (
            <li key={c.id}>
              <b>{c.nombre}:</b> <span className="text-ink-soft">{c.estado}</span>
            </li>
          ))}
        </ul>
      </section>
      {ORDEN.map((g) => {
        const delGrupo = tipos.filter((t) => t.grupo === g)
        if (delGrupo.length === 0) return null
        return (
          <section key={g} aria-labelledby={`grupo-${g}`}>
            <h3 id={`grupo-${g}`} className="eyebrow text-ink-soft">
              {NOMBRE_GRUPO[g]}
            </h3>
            <ul className="mt-2 divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-paper">
              {delGrupo.map((t) => {
                const on = encendido(t, prefs)
                return (
                  <li key={t.id}>
                    <label className={cn('flex min-h-11 items-center gap-3 px-4 py-3', t.obligatorio ? 'cursor-default' : 'cursor-pointer')}>
                      <span className="flex-1 text-[14px] font-bold text-ink">{t.titulo}</span>
                      {t.obligatorio ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-soft">
                          <Lock size={13} aria-hidden /> Siempre
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          role="switch"
                          checked={on}
                          onChange={(e) => {
                            const nuevas = cambiar(prefs, t, e.target.checked)
                            setPrefs(nuevas)
                            setError(!guardarPreferencias(nuevas))
                          }}
                          className="h-6 w-6 shrink-0 accent-brand-700"
                        />
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {error && (
        <p role="alert" className="text-[14px] font-semibold text-red-700">
          No se pudo guardar en este teléfono.
        </p>
      )}
    </div>
  )
}

export function CentroAvisosSheet({ quien, onClose }: { quien: Para; onClose: () => void }) {
  return (
    <Sheet label="Avisos" onClose={onClose} full>
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
        <h2 className="font-display text-[26px] font-bold leading-tight text-ink">Avisos</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <CentroAvisos quien={quien} />
      </div>
    </Sheet>
  )
}
