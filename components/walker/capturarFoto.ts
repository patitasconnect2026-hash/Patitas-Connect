import { CONFIG } from '@/lib/config'
import { dimensionesFoto } from '@/lib/fotos'

/** Lo que se estampa en la imagen: el código del paseo. */
export function textoDelSello(codigo: string): string {
  return `Código ${codigo}`
}

/** Dibuja el código en la esquina de abajo a la izquierda, sobre un fondo oscuro (se lee con cualquier fondo). */
function estampar(ctx: CanvasRenderingContext2D, w: number, h: number, codigo: string) {
  const tam = Math.max(26, Math.round(h * 0.075))
  const texto = textoDelSello(codigo)
  ctx.font = `800 ${tam}px system-ui, -apple-system, sans-serif`
  const ancho = Math.round(ctx.measureText(texto).width + tam)
  const alto = Math.round(tam * 1.6)
  const margen = Math.round(tam * 0.5)
  const x = margen
  const y = h - alto - margen
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
  ctx.beginPath()
  const r = alto / 2
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, r)
  ctx.arcTo(x + ancho, y + alto, x, y + alto, r)
  ctx.arcTo(x, y + alto, x, y, r)
  ctx.arcTo(x, y, x + ancho, y, r)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, x + tam / 2, y + alto / 2 + 1)
}

function aBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', calidad))
}

/**
 * Saca la foto del video de la cámara: la reduce (lado mayor `ladoMaximoFotoPx`), le estampa el código y la
 * comprime en JPEG; si pesa más de `pesoMaximoFotoKB` la vuelve a comprimir más. Solo viene de la cámara de la app.
 */
export async function capturarFoto(video: HTMLVideoElement, codigo: string | null): Promise<{ bytes: ArrayBuffer; tipo: string }> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) throw new Error('La cámara todavía no tiene imagen')
  const { w, h } = dimensionesFoto(vw, vh)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Sin canvas')
  ctx.drawImage(video, 0, 0, w, h)
  // La foto de hoy del paseador no lleva código: no es de ningún paseo.
  if (codigo !== null) estampar(ctx, w, h, codigo)
  let blob: Blob | null = null
  for (const calidad of [CONFIG.calidadFoto, 0.6, 0.5, 0.4]) {
    blob = await aBlob(canvas, calidad)
    if (blob && blob.size <= CONFIG.pesoMaximoFotoKB * 1024) break
  }
  if (!blob) throw new Error('No se pudo crear la imagen')
  return { bytes: await blob.arrayBuffer(), tipo: 'image/jpeg' }
}
