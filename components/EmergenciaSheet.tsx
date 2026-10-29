'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { normalizarTelefono, type Persona } from '@/lib/sos'
import { btnPrimary, btnSoft, inputBase } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Sheet } from './ui/Sheet'
import { VerMas } from './ui/VerMas'

/** Una persona de confianza a quien llamar si algo pasa. Se guarda solo en este teléfono. */
export function EmergenciaSheet({
  actual,
  onSave,
  onClose,
}: {
  actual: Persona | null
  onSave: (p: Persona | null) => void
  onClose: () => void
}) {
  const [nombre, setNombre] = useState(actual?.nombre ?? '')
  const [telefono, setTelefono] = useState(actual?.telefono ?? '')
  const [error, setError] = useState('')

  const guardar = () => {
    const n = nombre.trim()
    const t = normalizarTelefono(telefono)
    if (n === '') return setError('Escribe el nombre de la persona.')
    if (!t) return setError('Escribe un teléfono válido, por ejemplo 987 654 321.')
    onSave({ nombre: n.slice(0, 40), telefono: t })
    onClose()
  }

  return (
    <Sheet label="Contacto de emergencia" onClose={onClose}>
      <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-3">
        <div>
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink">Contacto de emergencia</h2>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">Una persona de confianza, por si el paseador no logra comunicarse contigo.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      <form
        className="space-y-3 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          guardar()
        }}
        noValidate
      >
        <label className="block">
          <span className="mb-1 block text-[14px] font-bold text-ink">Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" maxLength={40} placeholder="Nombre" className={inputBase} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[14px] font-bold text-ink">Celular</span>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="987 654 321"
            aria-describedby={error ? 'emergencia-error' : undefined}
            aria-invalid={error ? true : undefined}
            className={inputBase}
          />
        </label>
        {error && (
          <p id="emergencia-error" role="alert" className="rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800">
            {error}
          </p>
        )}
        <div className="text-[14px] leading-snug text-ink-soft">
          <p>
            Se guarda <b className="text-ink">solo en este teléfono</b>.
          </p>
          <p className="mt-1">
            Si no contestas en una emergencia, <b className="text-ink">el paseador podrá llamarlo</b>.
          </p>
          <VerMas>Verá el número al llamar. En la demostración, solo en el mismo navegador.</VerMas>
        </div>
        <button type="submit" className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
          Guardar contacto
        </button>
        {actual && (
          <button
            type="button"
            onClick={() => {
              onSave(null)
              onClose()
            }}
            className={cn(btnSoft, 'h-12 w-full text-[14.5px]')}
          >
            Quitar este contacto
          </button>
        )}
      </form>
    </Sheet>
  )
}
