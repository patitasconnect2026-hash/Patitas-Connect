/**
 * El chat entre dos teléfonos (paso 6b): cuándo estuvo activa la otra persona. Funciones PURAS.
 *
 * Lo único que la base sabe de la otra persona es lo que ella hizo: sus mensajes y los cambios que hizo en el paseo
 * (aceptar, salir, recoger, entregar…). No hay «última vez que abrió la app»: eso pediría una tabla nueva y es una
 * decisión del equipo (ver `supabase/LEEME.md`, «Chat y actividad»). Por eso aquí NUNCA se dice «en línea»: se dice
 * «Activo hace 3 min» y solo cuando se sabe. Si no se sabe, no se escribe nada.
 *
 * La hora de lo que hizo la otra persona la pone la base; la de «ahora» es la de este teléfono: si el reloj de este
 * teléfono está desfasado, el «hace cuánto» se corre. Nunca sale un tiempo negativo.
 */
import type { ChatMsg } from './bus'
import type { Paseo } from './paseo'

/** Los dos lados del chat, como en `ChatMsg.from`: la familia («owner») y el paseador («walker»). */
export type Lado = 'owner' | 'walker'

/** Después de este tiempo ya no se dice nada (no es «reciente»). */
export const MINUTOS_PARA_DECIR_ACTIVO = 60

export const TEXTO_ACTIVIDAD = {
  ahora: 'Activo hace un momento',
  minutos: (n: number) => `Activo hace ${n} min`,
} as const

/**
 * La última vez que `otro` hizo algo en este paseo (hora de la base), o null si no se sabe. Cuenta sus mensajes y sus
 * cambios del paseo; no cuenta los del sistema ni los de demostración.
 */
export function ultimaActividadDe(otro: Lado, mensajes: readonly ChatMsg[], paseo: Paseo | null | undefined): number | null {
  const quien = otro === 'walker' ? 'paseador' : 'dueno'
  let ultima: number | null = null
  const ver = (t: number) => {
    if (Number.isFinite(t) && t > 0 && (ultima === null || t > ultima)) ultima = t
  }
  for (const m of mensajes) if (m.from === otro) ver(m.at)
  for (const e of paseo?.eventos ?? []) if (e.quien === quien && !e.demo) ver(e.at)
  return ultima
}

/**
 * «Activo hace 3 min», o null si no se sabe (o hace más de una hora). `ahora` = 0 significa que todavía no se leyó la
 * hora: no se dice nada.
 */
export function textoDeActividad(ultima: number | null, ahora: number): string | null {
  if (ultima === null || ahora <= 0) return null
  const minutos = Math.floor(Math.max(0, ahora - ultima) / 60_000)
  if (minutos >= MINUTOS_PARA_DECIR_ACTIVO) return null
  return minutos < 2 ? TEXTO_ACTIVIDAD.ahora : TEXTO_ACTIVIDAD.minutos(minutos)
}
