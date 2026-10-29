/**
 * SOS sin servidor: solo enlaces del teléfono (tel: y wa.me). La app no llama ni escribe por nadie:
 * abre la llamada o el WhatsApp ya escrito y la persona lo envía.
 * Nunca decimos que alguien responde a toda hora: lo único que prometemos es lo que la app hace.
 */
import { CONFIG, NOMBRE_APP, type Config } from './config'
import { enlaceLlamada, enlaceWhatsApp, esCelularPeru } from './telefono'

export { enlaceLlamada, enlaceWhatsApp, esCelularPeru, normalizarTelefono } from './telefono'

export interface Persona {
  nombre: string
  telefono: string
}

/** De dónde viene la posición: del teléfono (real) o de la demostración (simulada). */
export interface Posicion {
  lat: number
  lng: number
  origen: 'telefono' | 'simulada'
}

export type Distrito = 'San Isidro' | 'Jesús María'

/* ------------------------------------------------------------------ */
/* Mapas                                                                */
/* ------------------------------------------------------------------ */

/** Enlace que abre un punto del mapa en Google Maps (funciona en celular y en computadora). */
export function enlaceMapa(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lng.toFixed(5)}`
}

/* ------------------------------------------------------------------ */
/* Mensaje y pasos                                                      */
/* ------------------------------------------------------------------ */

export type Quien = 'dueno' | 'paseador'

function lineaUbicacion(quien: Quien, pos: Posicion | null, buscando: boolean): string {
  if (!pos) return buscando ? 'Todavía estoy buscando mi ubicación.' : 'No pude obtener la ubicación.'
  const enlace = enlaceMapa(pos.lat, pos.lng)
  if (pos.origen === 'simulada') return `Ubicación de demostración (no es real): ${enlace}`
  return quien === 'paseador' ? `Mi ubicación ahora: ${enlace}` : `Última ubicación del paseo: ${enlace}`
}

/**
 * El mensaje que ya viene escrito en WhatsApp: perro, paseador y enlace al mapa.
 * `buscando` = el teléfono aún está buscando la ubicación: el mensaje no dice «no pude», dice que sigue buscando.
 */
export function mensajeSos(p: { quien: Quien; perro: string; paseador: string; posicion: Posicion | null; buscando?: boolean }): string {
  const inicio =
    p.quien === 'paseador'
      ? `🚨 Ayuda. Soy ${p.paseador}, paseador de ${NOMBRE_APP}. Estoy paseando a ${p.perro} y hay una emergencia.`
      : `🚨 Ayuda. ${p.perro} está de paseo con ${p.paseador} (${NOMBRE_APP}) y necesito ayuda.`
  return `${inicio} ${lineaUbicacion(p.quien, p.posicion, p.buscando ?? false)}`
}

/** Los pasos, en orden, según quién tiene la emergencia. */
export function pasosSos(p: { quien: Quien; perro: string; paseador: string }): string[] {
  if (p.quien === 'paseador') {
    return [
      `Asegura a ${p.perro}: tenlo de la correa corta y aléjalo del peligro.`,
      'Avisa al dueño: por el chat de la app o con los botones de abajo.',
      'Si está herido, llévalo a la veterinaria más cercana.',
    ]
  }
  return [
    `Escríbele a ${p.paseador} por el chat para saber cómo está ${p.perro}.`,
    'Si es grave, usa los botones de abajo para pedir ayuda.',
    `Si ${p.perro} está herido, llévalo a la veterinaria más cercana.`,
  ]
}

/* ------------------------------------------------------------------ */
/* Contactos (los llena el equipo en lib/config.ts)                     */
/* ------------------------------------------------------------------ */

export interface ContactoSos {
  nombre: string
  /** Enlace para llamar. Null si el teléfono no sirve. */
  llamar: string | null
  /** Enlace de WhatsApp con el mensaje escrito. Null si no hay un WhatsApp que sirva. */
  whatsapp: string | null
}

/**
 * Convierte personas en botones. Cada botón existe solo si su número sirve.
 * El teléfono se usa como WhatsApp únicamente si es un celular (un fijo no tiene WhatsApp).
 * Descarta a la persona solo si no tiene ningún enlace que sirva.
 */
export function contactosSos(personas: Array<{ nombre: string; telefono: string; whatsapp?: string }>, mensaje: string): ContactoSos[] {
  const salida: ContactoSos[] = []
  for (const p of personas) {
    const llamar = enlaceLlamada(p.telefono)
    const numeroWhatsApp = p.whatsapp?.trim() ? p.whatsapp : esCelularPeru(p.telefono) ? p.telefono : ''
    const whatsapp = enlaceWhatsApp(numeroWhatsApp, mensaje)
    if (llamar || whatsapp) salida.push({ nombre: p.nombre, llamar, whatsapp })
  }
  return salida
}

/**
 * El distrito sale de un texto como "Calle Los Cedros 245 · San Isidro" (se mira lo que está después del último « · »).
 * Si el texto no dice cuál es, devuelve null (y el SOS muestra el serenazgo de los dos distritos).
 */
export function distritoDe(texto: string): Distrito | null {
  const partes = texto.split(' · ')
  const final = partes[partes.length - 1]
  if (/jes[uú]s mar[ií]a/i.test(final)) return 'Jesús María'
  if (/san isidro/i.test(final)) return 'San Isidro'
  return null
}

export interface FilaServicio {
  nombre: string
  /** null si el equipo todavía no configuró el teléfono. */
  llamar: string | null
  /** null si el equipo todavía no configuró el WhatsApp. */
  whatsapp: string | null
  /** false = «Falta configurar». */
  configurado: boolean
}

/**
 * Serenazgo del distrito del paseo. Si no se sabe el distrito, los dos.
 * Una fila sin número configurado igual se devuelve (con configurado: false): la pantalla dice «Falta configurar».
 */
export function serenazgoSos(distrito: Distrito | null, mensaje: string, c: Config = CONFIG): FilaServicio[] {
  const todos: Array<{ distrito: Distrito; datos: { telefono: string; whatsapp: string } }> = [
    { distrito: 'San Isidro', datos: c.serenazgo.sanIsidro },
    { distrito: 'Jesús María', datos: c.serenazgo.jesusMaria },
  ]
  return todos
    .filter((t) => distrito === null || t.distrito === distrito)
    .map((t) => {
      const llamar = enlaceLlamada(t.datos.telefono)
      const whatsapp = enlaceWhatsApp(t.datos.whatsapp, mensaje)
      return { nombre: `Serenazgo de ${t.distrito}`, llamar, whatsapp, configurado: llamar !== null || whatsapp !== null }
    })
}

export interface Emergencia {
  nombre: string
  numero: string
  llamar: string
}

/** Un número corto de emergencia (105, 116, 106). Null si no son 3 dígitos. */
export function enlaceLlamadaCorta(numero: string): string | null {
  return /^\d{3}$/.test(numero.trim()) ? `tel:${numero.trim()}` : null
}

/** Policía, Bomberos y SAMU, en ese orden. Solo los que estén configurados. */
export function emergenciasSos(c: Config = CONFIG): Emergencia[] {
  const filas: Array<{ nombre: string; numero: string }> = [
    { nombre: 'Policía', numero: c.emergenciasNacionales.policia },
    { nombre: 'Bomberos', numero: c.emergenciasNacionales.bomberos },
    { nombre: 'SAMU (urgencias médicas)', numero: c.emergenciasNacionales.samu },
  ]
  const salida: Emergencia[] = []
  for (const f of filas) {
    const llamar = enlaceLlamadaCorta(f.numero)
    if (llamar) salida.push({ nombre: f.nombre, numero: f.numero.trim(), llamar })
  }
  return salida
}
