'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, HeartPulse, Pencil, Phone, ShieldCheck, Siren, Syringe, Trash2, Users, X } from 'lucide-react'
import { NOMBRE_CORTO } from '@/lib/config'
import { SIZE_INFO } from '@/lib/schedule'
import type { Dog } from '@/lib/types'
import { btnInk, btnPrimary } from '@/lib/ui'
import { cn, plural } from '@/lib/utils'
import { DogForm } from './DogForm'
import { DogAvatar } from './ui/Dog'
import { QrCode } from './ui/QrCode'
import { Sheet } from './ui/Sheet'

/** Alta y edición de un perro. */
export function DogSheet({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Dog
  isNew: boolean
  onSave: (d: Dog) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const [dog, setDog] = useState(initial)
  const valid = dog.name.trim().length > 0

  return (
    <Sheet label={isNew ? 'Registrar perro' : `Editar a ${initial.name}`} onClose={onClose} full>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3">
        <div>
          <p className="eyebrow text-brand-700">{isNew ? 'Nuevo' : 'Editar'}</p>
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink">
            {isNew ? 'Cuéntanos de tu perro' : dog.name || 'Tu perro'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95"
        >
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-ink/10 px-5 pb-5 pt-5">
        <DogForm dog={dog} onChange={setDog} />
        {!isNew && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(dog.id)}
            className="min-h-11 mt-6 flex items-center gap-2 text-[14px] font-bold text-red-600"
          >
            <Trash2 size={15} /> Quitar a {initial.name || 'este perro'}
          </button>
        )}
      </div>
      <div className="shrink-0 border-t border-ink/10 bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button type="button" disabled={!valid} onClick={() => onSave({ ...dog, name: dog.name.trim() })} className={cn(btnPrimary, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}>
          <Check size={19} strokeWidth={3} /> {isNew ? 'Guardar a ' + (dog.name.trim() || 'mi perro') : 'Guardar cambios'}
        </button>
      </div>
    </Sheet>
  )
}

function Row({ icon: Icon, label, value, ok }: { icon: typeof Syringe; label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon size={18} className={ok ? 'text-forest' : 'text-ink-soft'} />
      <span className="flex-1 text-[14px] text-ink-soft">{label}</span>
      <span className="text-right text-[14px] font-bold text-ink">{value}</span>
    </div>
  )
}

/** Ficha del perro: lo que ve el paseador, más la chapita QR. */
export function DogProfileSheet({
  dog,
  owner,
  walkerView = false,
  onEdit,
  onClose,
}: {
  dog: Dog
  owner: string
  walkerView?: boolean
  onEdit?: () => void
  onClose: () => void
}) {
  const [lost, setLost] = useState(false)
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const info = SIZE_INFO[dog.size]

  return (
    <Sheet label={`Ficha de ${dog.name}`} onClose={onClose} full>
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
        <div className="flex items-center gap-4">
          <DogAvatar dog={dog} className="h-[72px] w-[72px] rounded-[1.4rem] ring-2 ring-ink/10" />
          <div>
            <p className="eyebrow text-brand-700">{walkerView ? 'Ficha para el paseador' : 'Ficha de tu perro'}</p>
            <h2 className="font-display text-[28px] font-bold leading-none text-ink">{dog.name}</h2>
            <p className="mt-1 text-[14px] text-ink-soft">
              {dog.breed} · {plural(dog.ageYears, 'año', 'años')} · {dog.sex === 'M' ? 'Macho' : 'Hembra'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-ink/10 px-5 pb-6 pt-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-extrabold text-white">
            {info.label} · {info.range}
          </span>
          <span className="rounded-full bg-sand px-3 py-1.5 text-[12px] font-bold text-ink">
            {dog.sociable ? 'Va en grupo' : 'Solo paseo individual'}
          </span>
          {dog.temperament.map((t) => (
            <span key={t} className="rounded-full border border-ink/15 px-3 py-1.5 text-[12px] font-bold text-ink-soft">
              {t}
            </span>
          ))}
        </div>

        {dog.notes && (
          <div className="mt-5 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
            <p className="eyebrow text-brand-800">Lo que debes saber</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{dog.notes}</p>
          </div>
        )}

        <div className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/10 px-4">
          <Row icon={Syringe} label="Vacunas" value={dog.vaccinated ? 'Al día' : 'Pendiente'} ok={dog.vaccinated} />
          <Row icon={HeartPulse} label="Alergias o salud" value={dog.medical || 'Ninguna'} />
          <Row icon={ShieldCheck} label="Esterilizado" value={dog.sterilized ? 'Sí' : 'No'} />
          <Row icon={Phone} label="Veterinaria" value={dog.vet || 'No indicada'} />
          <Row icon={Users} label="Dueño" value={owner} />
        </div>

        {!walkerView && (
          <div className="mt-6">
            <p className="eyebrow text-ink-soft">Chapita {NOMBRE_CORTO}</p>
            <div className="mt-2 flex gap-4 rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
              {/* La dirección sale de donde está abierta la app: no se escribe ningún dominio a mano. Hasta saberla no se dibuja un QR que apunte a otra parte. */}
              <div className="grid h-[120px] w-[120px] shrink-0 place-items-center rounded-2xl bg-white p-2 ring-1 ring-ink/10">
                {origin ? <QrCode value={`${origin}/p/${dog.id}`} size={104} /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[18px] font-bold leading-tight text-ink">Si {dog.name} se pierde, el QR lo trae de vuelta</p>
                <p className="mt-1 text-[14px] leading-snug text-ink-soft">
                  Quien lo encuentre escanea la chapita.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLost((v) => !v)}
              aria-pressed={lost}
              className={cn(
                'mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-extrabold transition active:scale-[0.98]',
                lost ? 'bg-red-600 text-white' : 'bg-sand text-ink',
              )}
            >
              <Siren size={17} /> {lost ? `Modo perdido activo para ${dog.name}` : `Marcar a ${dog.name} como perdido`}
            </button>
            <AnimatePresence>
              {lost && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-2 text-[14px] leading-snug text-red-700"
                >
                  Demo: quien escanee la chapita verá “{dog.name} está perdido” y un botón para llamarte.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {onEdit && (
        <div className="shrink-0 border-t border-ink/10 bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={onEdit} className={cn(btnInk, 'h-14 w-full text-[15px]')}>
            <Pencil size={17} /> Editar ficha
          </button>
        </div>
      )}
    </Sheet>
  )
}
