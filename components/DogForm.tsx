'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ChevronDown, Dog as DogIcon, Minus, Plus, TriangleAlert } from 'lucide-react'
import { BREEDS, FURS, TEMPERAMENTS } from '@/lib/data'
import { SIZE_INFO } from '@/lib/schedule'
import { shrinkImage } from '@/lib/store'
import type { Dog, FurKey, Size } from '@/lib/types'
import { inputBase } from '@/lib/ui'
import { cn, plural } from '@/lib/utils'
import { DogAvatar } from './ui/Dog'
import { FichaCuidado } from './funciones/FichaCuidado'

const SIZES: Size[] = ['small', 'medium', 'large']

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="min-h-11 flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-ink">{label}</span>
        {hint && <span className="block text-[14px] leading-snug text-ink-soft">{hint}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-forest' : 'bg-ink/15')}>
        <motion.span
          className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  )
}

/** Formulario para registrar a tu perro. Lo básico arriba; los detalles opcionales se despliegan. */
export function DogForm({ dog, onChange }: { dog: Dog; onChange: (d: Dog) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [more, setMore] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const set = (patch: Partial<Dog>) => onChange({ ...dog, ...patch })

  const onPhoto = async (f?: File) => {
    if (!f) return
    try {
      setPhotoError('')
      set({ photo: await shrinkImage(f) })
    } catch {
      setPhotoError('No pudimos usar esa foto. Elige otra.')
    }
  }

  const onBreed = (name: string) => {
    const b = BREEDS.find((x) => x.name === name)
    if (!b) return
    set({ breed: name, size: b.size, shape: b.shape, rpp: !!b.rpp, sociable: b.rpp ? false : dog.sociable })
  }

  const toggleTemper = (t: string) =>
    set({ temperament: dog.temperament.includes(t) ? dog.temperament.filter((x) => x !== t) : [...dog.temperament, t] })

  return (
    <div className="space-y-5">
      {/* Foto y nombre */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-brand-600/50 bg-brand-50"
          aria-label={dog.photo ? 'Cambiar foto' : 'Agregar foto'}
        >
          {dog.photo ? (
            <DogAvatar dog={dog} className="h-full w-full" />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-brand-700">
              <Camera size={24} />
              <span className="text-[12px] font-extrabold">Foto</span>
            </span>
          )}
          {dog.photo && (
            <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-0.5 text-center text-[12px] font-bold text-white">Cambiar</span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        <label className="block flex-1">
          <span className="eyebrow mb-1.5 block text-ink-soft">Nombre</span>
          <input
            value={dog.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Ej. Max"
            autoComplete="off"
            className={inputBase}
          />
        </label>
      </div>
      {photoError && <p className="-mt-3 text-[14px] font-semibold text-red-600">{photoError}</p>}

      {/* Raza */}
      <label className="block">
        <span className="eyebrow mb-1.5 block text-ink-soft">Raza</span>
        <span className="relative block">
          <select value={dog.breed} onChange={(e) => onBreed(e.target.value)} className={cn(inputBase, 'appearance-none pr-11')}>
            {BREEDS.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft" />
        </span>
      </label>

      {/* Tamaño */}
      <fieldset>
        <legend className="eyebrow mb-1.5 text-ink-soft">Tamaño</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {SIZES.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => set({ size: s })}
              aria-pressed={dog.size === s}
              className={cn(
                'min-h-11 flex flex-col items-center rounded-2xl border-2 px-2 py-3 transition active:scale-[0.97]',
                dog.size === s ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper',
              )}
            >
              <DogIcon size={20 + i * 8} className={dog.size === s ? 'text-brand-700' : 'text-ink-soft'} strokeWidth={2} />
              <span className="mt-1.5 text-[14px] font-extrabold text-ink">{SIZE_INFO[s].label}</span>
              <span className="text-[12px] text-ink-soft">{SIZE_INFO[s].range}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[14px] leading-snug text-ink-soft">
          Por seguridad, un perro solo pasea con otros de su mismo tamaño.
        </p>
      </fieldset>

      {/* Edad y sexo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="eyebrow mb-1.5 block text-ink-soft">Edad</span>
          <div className="flex h-12 items-center justify-between rounded-2xl border border-ink/15 bg-paper px-1.5">
            <button
              type="button"
              aria-label="Menos años"
              onClick={() => set({ ageYears: Math.max(0, dog.ageYears - 1) })}
              className="grid h-11 w-11 place-items-center rounded-xl bg-sand active:scale-90"
            >
              <Minus size={16} />
            </button>
            <span className="text-[15px] font-extrabold text-ink">
              {plural(dog.ageYears, 'año', 'años')}
            </span>
            <button
              type="button"
              aria-label="Más años"
              onClick={() => set({ ageYears: Math.min(25, dog.ageYears + 1) })}
              className="grid h-11 w-11 place-items-center rounded-xl bg-sand active:scale-90"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div>
          <span className="eyebrow mb-1.5 block text-ink-soft">Sexo</span>
          <div className="grid h-12 grid-cols-2 gap-1 rounded-2xl border border-ink/15 bg-paper p-1">
            {(['M', 'F'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ sex: s })}
                aria-pressed={dog.sex === s}
                className={cn(
                  'min-h-11 rounded-xl text-[14px] font-extrabold transition',
                  dog.sex === s ? 'bg-ink text-white' : 'text-ink-soft',
                )}
              >
                {s === 'M' ? 'Macho' : 'Hembra'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dog.rpp && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-[14px] leading-snug text-amber-900 ring-1 ring-amber-300/60">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            Por ahora no atendemos razas potencialmente peligrosas.
          </span>
        </div>
      )}

      {/* Más detalles */}
      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        aria-expanded={more}
        className="min-h-11 flex w-full items-center justify-between rounded-2xl bg-sand px-4 py-3 text-[14px] font-extrabold text-ink"
      >
        Más detalles para el paseador <span className="text-[12px] font-semibold text-ink-soft">(opcional)</span>
        <ChevronDown size={18} className={cn('transition-transform', more && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {more && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-5 pb-1 pt-1">
              <fieldset>
                <legend className="eyebrow mb-2 text-ink-soft">Color del pelaje</legend>
                <div className="flex gap-3">
                  {(Object.keys(FURS) as FurKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-label={FURS[k].label}
                      aria-pressed={dog.fur === k}
                      onClick={() => set({ fur: k })}
                      className={cn(
                        'h-11 w-11 rounded-full border-2 transition',
                        dog.fur === k ? 'scale-110 border-brand-600 ring-4 ring-brand-600/20' : 'border-ink/15',
                      )}
                      style={{ background: FURS[k].fur }}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="eyebrow mb-2 text-ink-soft">¿Cómo es?</legend>
                <div className="flex flex-wrap gap-2">
                  {TEMPERAMENTS.map((t) => {
                    const on = dog.temperament.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTemper(t)}
                        aria-pressed={on}
                        className={cn(
                          'min-h-11 rounded-full border px-3.5 py-2 text-[14px] font-bold transition active:scale-95',
                          on ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink-soft',
                        )}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div className="space-y-2.5">
                <Toggle
                  label="Puede pasear en grupo"
                  hint="Si lo apagas, solo hará paseos individuales (con otro precio)."
                  checked={dog.sociable}
                  onChange={(v) => set({ sociable: v })}
                />
                <Toggle label="Vacunas al día" hint="Se pide para reservar." checked={dog.vaccinated} onChange={(v) => set({ vaccinated: v })} />
                <Toggle label="Esterilizado" checked={dog.sterilized} onChange={(v) => set({ sterilized: v })} />
              </div>

              <label className="block">
                <span className="eyebrow mb-1.5 block text-ink-soft">Lo que debe saber el paseador</span>
                <textarea
                  value={dog.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  rows={3}
                  placeholder="Ej. Se emociona con otros perros. No darle premios. Responde a “quieto”."
                  className={cn(inputBase, 'h-auto resize-none py-3 leading-snug')}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Alergias o salud</span>
                  <input value={dog.medical} onChange={(e) => set({ medical: e.target.value })} className={inputBase} placeholder="Ninguna" />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Veterinaria</span>
                  <input value={dog.vet} onChange={(e) => set({ vet: e.target.value })} className={inputBase} placeholder="Nombre" />
                </label>
              </div>
              <FichaCuidado dog={dog} onChange={set} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
