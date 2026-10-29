'use client'

import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { TEXTO_ERROR_CAMARA, TEXTO_FOTOS } from '@/lib/fotosTextos'
import { cn } from '@/lib/utils'
import { Sheet } from '../ui/Sheet'
import { capturarFoto, textoDelSello } from './capturarFoto'
import { useCamara } from './useCamara'

/** Lo que la pantalla que la usa devuelve al guardar: `mensaje` = una frase corta de por qué no se pudo. */
export type ResultadoGuardado = { ok: true } | { ok: false; mensaje: string }

/**
 * La cámara de la app (vista del paseador). Muestra el video en vivo con el código del paseo (el mismo que se estampa en
 * la imagen) y un solo botón. No se puede elegir una foto de la galería.
 * Si no hay permiso o no hay cámara, lo dice y el paseo sigue.
 */
export function CamaraPaseo({
  codigo,
  frontal = false,
  titulo = TEXTO_FOTOS.titulo,
  tomar = TEXTO_FOTOS.tomar,
  indicacion = TEXTO_FOTOS.camaraIndicacion,
  onFoto,
  onCerrar,
  onError,
}: {
  /** null = la foto de hoy del paseador: sin código estampado. */
  codigo: string | null
  frontal?: boolean
  titulo?: string
  tomar?: string
  indicacion?: string
  /** Recibe la imagen ya reducida y con el código estampado; la guarda y dice si pudo. */
  onFoto: (img: { bytes: ArrayBuffer; tipo: string }) => Promise<ResultadoGuardado>
  onCerrar: () => void
  /** La cámara no abrió (para que «Hoy» lo recuerde después de cerrar). */
  onError?: (e: import('@/lib/fotosTextos').ErrorCamara) => void
}) {
  const { videoRef, estado, error, proporcion } = useCamara({ frontal })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const sacar = async () => {
    // Un doble toque no saca dos fotos.
    if (guardando || estado !== 'lista' || !videoRef.current) return
    setGuardando(true)
    setMensaje(null)
    try {
      const img = await capturarFoto(videoRef.current, codigo)
      const r = await onFoto(img)
      if (r.ok) {
        onCerrar()
        return
      }
      setMensaje(r.mensaje)
    } catch {
      setMensaje('No pudimos sacar la foto. Vuelve a intentar.')
    }
    setGuardando(false)
  }

  const cerrar = () => {
    if (error) onError?.(error)
    onCerrar()
  }
  const e = error ? TEXTO_ERROR_CAMARA[error] : null

  return (
    <Sheet label="Cámara del paseo" onClose={cerrar} full>
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
        <div>
          <p className="eyebrow text-brand-700">{titulo}</p>
          <h2 className="font-display text-[26px] font-bold leading-tight text-ink">{tomar}</h2>
        </div>
        <button type="button" onClick={cerrar} aria-label={TEXTO_FOTOS.cerrar} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="relative mx-5 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl bg-ink">
        {/* La vista previa tiene la forma de la foto: el código se ve donde va a quedar estampado */}
        <div className={cn('relative max-h-full max-w-full', error && 'invisible')} style={{ aspectRatio: proporcion ?? 4 / 3, height: proporcion && proporcion < 1 ? '100%' : undefined, width: proporcion && proporcion >= 1 ? '100%' : undefined }}>
          {/* El video se queda montado para que la cámara pueda abrir; se oculta si hay un error */}
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-contain" />
          {estado === 'lista' && codigo !== null && (
            <p
              aria-label={`${textoDelSello(codigo)}: sale en la foto`}
              className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink/85 px-3.5 py-1.5 font-display text-[20px] font-bold tabular-nums text-white"
            >
              {textoDelSello(codigo)}
            </p>
          )}
        </div>
        {estado === 'abriendo' && <p className="absolute inset-0 grid place-items-center text-[14px] font-bold text-white">{TEXTO_FOTOS.camaraAbriendo}</p>}
        {e && (
          <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-[16px] font-extrabold leading-snug text-white">{e.titulo}</p>
              {e.como && <p className="mt-2 text-[14px] leading-snug text-white/85">{e.como}</p>}
              <p className="mt-3 text-[14px] font-semibold text-white/85">{TEXTO_FOTOS.paseoSigue}</p>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-center">
        {mensaje ? (
          <p role="alert" className="mb-2 rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800">
            {mensaje} {TEXTO_FOTOS.paseoSigue}
          </p>
        ) : (
          !error && <p className="mb-2 text-[14px] font-semibold text-ink-soft">{guardando ? TEXTO_FOTOS.guardando : indicacion}</p>
        )}
        <button
          type="button"
          onClick={sacar}
          disabled={estado !== 'lista' || guardando}
          aria-label={TEXTO_FOTOS.sacar}
          className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-ink/15 bg-brand-700 text-white shadow-press transition active:scale-95 disabled:bg-ink/20 disabled:shadow-none"
        >
          <Camera size={28} />
        </button>
      </div>
    </Sheet>
  )
}
