/**
 * Todos los avisos del paseo, en un solo lugar (pedido de Yahrod, 30 de octubre de 2026: «todas las notificaciones sí o sí»).
 *
 * Hoy llegan con la página abierta (sonido, vibración e insignia: lib/avisos.ts). Con la página cerrada todavía no hay
 * aviso: hace falta Web Push o WhatsApp (docs/PUBLICAR.md, «Avisos con la app cerrada»). Los avisos de seguridad no se
 * pueden apagar. Las preferencias se guardan en este teléfono.
 */
import { CLAVES } from './datos/claves'
import { guardarEnTelefono, leerDelTelefono } from './datos'

export type Para = 'familia' | 'paseador'
export type Grupo = 'pedidos' | 'paseo' | 'seguridad' | 'pagos' | 'cuenta'

export interface TipoAviso {
  id: string
  para: Para[]
  grupo: Grupo
  titulo: string
  /** Los avisos de seguridad no se apagan. */
  obligatorio: boolean
}

export const TIPOS_AVISO: TipoAviso[] = [
  { id: 'pedido_nuevo', para: ['paseador'], grupo: 'pedidos', titulo: 'Pedido nuevo en tu zona', obligatorio: false },
  { id: 'oferta', para: ['familia'], grupo: 'pedidos', titulo: 'Un paseador respondió tu pedido', obligatorio: false },
  { id: 'aceptado', para: ['familia'], grupo: 'pedidos', titulo: 'Tu paseo fue aceptado', obligatorio: true },
  { id: 'recordatorio', para: ['familia', 'paseador'], grupo: 'paseo', titulo: 'Tu paseo es en una hora', obligatorio: false },
  { id: 'en_camino', para: ['familia'], grupo: 'paseo', titulo: 'El paseador va en camino', obligatorio: false },
  { id: 'recogido', para: ['familia'], grupo: 'paseo', titulo: 'Recogió a tu perro', obligatorio: true },
  { id: 'foto', para: ['familia'], grupo: 'paseo', titulo: 'Foto nueva del paseo', obligatorio: false },
  { id: 'mensaje', para: ['familia', 'paseador'], grupo: 'paseo', titulo: 'Mensaje nuevo en el chat', obligatorio: false },
  { id: 'entregado', para: ['familia'], grupo: 'paseo', titulo: 'Tu perro fue entregado', obligatorio: true },
  { id: 'senal', para: ['familia', 'paseador'], grupo: 'seguridad', titulo: 'Sin ubicación del paseo', obligatorio: true },
  { id: 'zona', para: ['familia', 'paseador'], grupo: 'seguridad', titulo: 'El paseo salió de la zona', obligatorio: true },
  { id: 'vehiculo', para: ['familia'], grupo: 'seguridad', titulo: 'Se mueve como un auto', obligatorio: true },
  { id: 'sos', para: ['familia', 'paseador'], grupo: 'seguridad', titulo: 'Alguien tocó SOS', obligatorio: true },
  { id: 'cancelado', para: ['familia', 'paseador'], grupo: 'seguridad', titulo: 'Paseo cancelado y reemplazo', obligatorio: true },
  { id: 'pago', para: ['familia', 'paseador'], grupo: 'pagos', titulo: 'Pago pendiente o confirmado', obligatorio: true },
  { id: 'calificacion', para: ['familia', 'paseador'], grupo: 'cuenta', titulo: 'Te calificaron', obligatorio: false },
  { id: 'nivel', para: ['paseador'], grupo: 'cuenta', titulo: 'Subiste de nivel', obligatorio: false },
  { id: 'falta', para: ['paseador'], grupo: 'cuenta', titulo: 'Se anotó una falta', obligatorio: true },
]

export const NOMBRE_GRUPO: Record<Grupo, string> = {
  pedidos: 'Pedidos',
  paseo: 'Durante el paseo',
  seguridad: 'Seguridad',
  pagos: 'Pagos',
  cuenta: 'Tu cuenta',
}

export function avisosPara(quien: Para): TipoAviso[] {
  return TIPOS_AVISO.filter((t) => t.para.includes(quien))
}

export type Preferencias = Record<string, boolean>

/** ¿Este aviso está encendido? Los obligatorios siempre; los demás, encendidos salvo que la persona los apague. */
export function encendido(tipo: TipoAviso, prefs: Preferencias): boolean {
  return tipo.obligatorio || prefs[tipo.id] !== false
}

/** Cambia una preferencia; un aviso obligatorio no cambia. */
export function cambiar(prefs: Preferencias, tipo: TipoAviso, valor: boolean): Preferencias {
  if (tipo.obligatorio) return prefs
  return { ...prefs, [tipo.id]: valor }
}

export function leerPreferencias(): Preferencias {
  const v = leerDelTelefono<unknown>(CLAVES.avisosPreferencias, {})
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Preferencias) : {}
}

/** Guarda. Devuelve false si el navegador no dejó (modo privado o sin espacio) para avisar en pantalla. */
export function guardarPreferencias(p: Preferencias): boolean {
  try {
    guardarEnTelefono(CLAVES.avisosPreferencias, p)
    return true
  } catch {
    return false
  }
}

/** Canales: lo que funciona hoy y lo que falta conectar. */
export const CANALES = [
  { id: 'app', nombre: 'Con la página abierta', estado: 'Funciona hoy: sonido, vibración y número en el ícono.' },
  { id: 'push', nombre: 'Con la página cerrada', estado: 'Falta conectar (Web Push).' },
  { id: 'whatsapp', nombre: 'WhatsApp', estado: 'Falta conectar.' },
] as const
