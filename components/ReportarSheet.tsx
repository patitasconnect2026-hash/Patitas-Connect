'use client'

import { useRef, useState } from 'react'
import { Camera, Send, X } from 'lucide-react'
import { MAX_TEXTO_REPORTE, MOTIVOS, validarReporte, type MotivoReporte, type QuienReporta, type Reporte } from '@/lib/casos'
import { shrinkImage } from '@/lib/store'
import { btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Sheet } from './ui/Sheet'

/**
 * «Reportar problema»: lo usan el dueño y el paseador. Un motivo corto, un texto corto y una foto opcional.
 * El paseo pasa a «en disputa» y el equipo lo revisa a mano (la app no guarda dinero: no hay reembolsos automáticos).
 */
export function ReportarSheet({
  quien,
  motivoInicial,
  onSend,
  onClose,
}: {
  quien: QuienReporta
  motivoInicial?: MotivoReporte
  onSend: (r: Reporte) => void
  onClose: () => void
}) {
  const [motivo, setMotivo] = useState<MotivoReporte | null>(motivoInicial ?? null)
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState<string | undefined>()
  const [error, setError] = useState('')
  const [fotoError, setFotoError] = useState('')
  const enviado = useRef(false)
  const archivo = useRef<HTMLInputElement>(null)

  const falta = validarReporte({ motivo, texto })

  const elegirFoto = async (f?: File) => {
    if (!f) return
    try {
      setFotoError('')
      setFoto(await shrinkImage(f, 640))
    } catch {
      setFotoError('No pudimos usar esa foto. Elige otra.')
    }
    if (archivo.current) archivo.current.value = ''
  }

  const enviar = () => {
    // Un doble toque no manda dos reportes.
    if (enviado.current) return
    if (falta || !motivo) {
      setError(falta ?? 'Elige qué pasó.')
      return
    }
    enviado.current = true
    onSend({ quien, motivo, texto: texto.trim(), ...(foto ? { foto } : {}), at: Date.now() })
  }

  return (
    <Sheet label="Reportar problema" onClose={onClose}>
      <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div>
          <p className="eyebrow text-brand-700">Para el equipo</p>
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink">Reportar problema</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 place-items-center rounded-full bg-sand active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        <p className="text-[14px] leading-snug text-ink-soft">Cuéntanos qué pasó. El equipo lo revisa a mano.</p>

        <div role="radiogroup" aria-label="¿Qué pasó?" className="grid grid-cols-2 gap-2">
          {MOTIVOS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={motivo === m.id}
              onClick={() => {
                setMotivo(m.id)
                setError('')
              }}
              className={cn(
                'min-h-11 rounded-2xl border-2 px-3 py-2 text-[14.5px] font-extrabold transition active:scale-[0.97]',
                motivo === m.id ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink',
              )}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-[14px] font-bold text-ink">¿Qué pasó?</span>
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value.slice(0, MAX_TEXTO_REPORTE))
              setError('')
            }}
            rows={3}
            maxLength={MAX_TEXTO_REPORTE}
            placeholder="Escribe en pocas líneas"
            className="w-full resize-none rounded-2xl border border-ink/15 bg-paper p-3.5 text-[16px] outline-hidden focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          />
          <span className="mt-1 block text-right text-[12px] font-semibold text-ink-soft">
            {texto.length}/{MAX_TEXTO_REPORTE}
          </span>
        </label>

        <div>
          <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={(e) => elegirFoto(e.target.files?.[0])} />
          {foto ? (
            <div className="flex items-center gap-3 rounded-2xl bg-sand p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="Foto del reporte" className="h-14 w-14 rounded-xl object-cover" />
              <p className="min-w-0 flex-1 text-[14px] font-bold text-ink">Foto agregada</p>
              <button type="button" onClick={() => setFoto(undefined)} className="min-h-11 rounded-full px-3 text-[14px] font-extrabold text-ink-soft underline underline-offset-2">
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => archivo.current?.click()}
              className="min-h-11 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/30 px-3 py-2.5 text-[14px] font-extrabold text-ink active:scale-[0.98]"
            >
              <Camera size={17} /> Agregar foto (opcional)
            </button>
          )}
          {fotoError && <p className="mt-1.5 text-[14px] font-semibold text-red-700">{fotoError}</p>}
        </div>

        <p className="rounded-2xl bg-sand p-3 text-[14px] leading-snug text-ink-soft">No hay reembolsos automáticos: la app no guarda dinero.</p>

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800">
            {error}
          </p>
        )}

      </div>

      <div className="shrink-0 border-t border-ink/10 bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button type="button" onClick={enviar} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
          <Send size={18} /> Enviar reporte
        </button>
      </div>
    </Sheet>
  )
}
