'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { errorDeCamara } from '@/lib/fotos'
import type { ErrorCamara } from '@/lib/fotosTextos'

export type EstadoCamara = 'abriendo' | 'lista' | 'error'

/**
 * Abre la cámara de ESTE teléfono (`getUserMedia`) mientras la pantalla que lo usa esté montada, y la apaga al salir.
 * No hay forma de elegir una foto de la galería: la imagen solo sale del video en vivo.
 * Hace falta HTTPS (en la computadora sirve localhost).
 */
export function useCamara({ frontal = false }: { frontal?: boolean } = {}): {
  videoRef: RefObject<HTMLVideoElement | null>
  estado: EstadoCamara
  error: ErrorCamara | null
  /** Ancho / alto de la imagen de la cámara (para que la vista previa tenga la misma forma que la foto). */
  proporcion: number | null
} {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [resultado, setResultado] = useState<{ estado: EstadoCamara; error: ErrorCamara | null; proporcion: number | null }>({
    estado: 'abriendo',
    error: null,
    proporcion: null,
  })

  useEffect(() => {
    let cancelado = false
    let flujo: MediaStream | null = null
    const video = videoRef.current
    const abrir = async () => {
      await Promise.resolve()
      if (!window.isSecureContext) {
        setResultado({ estado: 'error', error: 'sin_https', proporcion: null })
        return
      }
      const md = navigator.mediaDevices
      if (!md?.getUserMedia) {
        setResultado({ estado: 'error', error: 'sin_camara', proporcion: null })
        return
      }
      try {
        flujo = await md.getUserMedia({ audio: false, video: { facingMode: { ideal: frontal ? 'user' : 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } } })
        if (cancelado) {
          flujo.getTracks().forEach((t) => t.stop())
          return
        }
        if (video) {
          video.srcObject = flujo
          await video.play().catch(() => undefined)
        }
        const proporcion = video && video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : null
        setResultado({ estado: 'lista', error: null, proporcion })
      } catch (e) {
        if (!cancelado) setResultado({ estado: 'error', error: errorDeCamara(e), proporcion: null })
      }
    }
    void abrir()
    return () => {
      cancelado = true
      flujo?.getTracks().forEach((t) => t.stop())
      if (video) video.srcObject = null
    }
  }, [frontal])

  return { videoRef, ...resultado }
}
