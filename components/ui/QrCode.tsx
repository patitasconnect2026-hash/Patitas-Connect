'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Código QR en SVG (se genera en el navegador, sin servicios externos). */
export function QrCode({ value, size = 132, className }: { value: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let alive = true
    QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [value])

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Código QR de la chapita"
      // El SVG lo genera la librería `qrcode` con datos propios, no con texto de terceros.
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg', '<svg width="100%" height="100%"') }}
    />
  )
}
