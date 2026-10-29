import type { Persona } from './sos'
import type { Account, Dog, Review } from './types'

/** La cuenta del dueño. Se guarda en el navegador (lib/datos). En producción esto viviría en una base de datos. */
export interface Persisted {
  account: Account | null
  dogs: Dog[]
  reviews: Review[]
  /** Ya usó el descuento de bienvenida */
  welcomeUsed: boolean
  /** Ya postuló como paseador */
  applied: boolean
  /** Paseadores favoritos (ids) */
  favs: string[]
  /** Sellos del "pasaporte" de parques (ids de parques donde ya paseó su perro) */
  stamps: string[]
  /** Contacto de emergencia del dueño. Se guarda solo en este teléfono y es opcional. */
  emergencia: Persona | null
}

export const EMPTY: Persisted = { account: null, dogs: [], reviews: [], welcomeUsed: false, applied: false, favs: [], stamps: [], emergencia: null }

/** Reduce una foto a ~480 px para que quepa en localStorage. */
export function shrinkImage(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la foto'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Foto no válida'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Sin canvas'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
