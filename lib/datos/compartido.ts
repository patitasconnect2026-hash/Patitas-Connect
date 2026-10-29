import type { Adaptador } from './adaptador'
import { huellaDelPropietario } from './propietario'

const textoDe = (v: unknown): string => JSON.stringify(v) ?? ''

/**
 * Un valor suelto (un ajuste) compartido por todas las pantallas de ESTA pestaña y por las otras pestañas del navegador.
 * El evento «storage» solo avisa a las otras pestañas; aquí quien lo cambia también avisa a las de su propia pestaña.
 * Sirve para `useSyncExternalStore`: `leer` devuelve el mismo objeto mientras nada cambie.
 * Con servidor, si cambia la cuenta con sesión, lo leído se descarta (la clave de cada cuenta es otra; ver `propietario.ts`).
 * Con servidor los datos también pueden llegar ANTES de que una pantalla se suscriba (por ejemplo, el equipo entra a
 * /admin y la lista baja mientras la pantalla todavía se arma): al suscribirse se revisa si lo leído quedó viejo.
 */
export function valorCompartido<T>(a: Adaptador, clave: string, porDefecto: T, normalizar?: (v: unknown) => T) {
  const oyentes = new Set<() => void>()
  /** `crudo` es lo que decía el adaptador al leer (null si lo puso esta pantalla con `poner`: manda hasta el próximo aviso). */
  let guardado: { v: T; dueno: string; crudo: string | null } | null = null
  const leer = (): T => {
    const dueno = huellaDelPropietario()
    if (guardado && guardado.dueno !== dueno) guardado = null
    if (!guardado) {
      const delAdaptador = a.leer<unknown>(clave, porDefecto)
      guardado = { dueno, v: normalizar ? normalizar(delAdaptador) : (delAdaptador as T), crudo: textoDe(delAdaptador) }
    }
    return guardado.v
  }
  const suscribir = (aviso: () => void): (() => void) => {
    oyentes.add(aviso)
    const bajaOtras = a.suscribir(clave, () => {
      guardado = null
      aviso()
    })
    // Si lo guardado cambió después de la última lectura y nadie escuchaba, nadie fue avisado. Se descarta la lectura vieja:
    // al suscribirse, React vuelve a preguntar y la pantalla se entera de lo último.
    if (guardado && guardado.crudo !== null && guardado.crudo !== textoDe(a.leer<unknown>(clave, porDefecto))) guardado = null
    return () => {
      oyentes.delete(aviso)
      bajaOtras()
    }
  }
  const poner = (v: T): void => {
    a.guardar(clave, v)
    guardado = { dueno: huellaDelPropietario(), v, crudo: null }
    oyentes.forEach((f) => f())
  }
  return { leer, suscribir, poner }
}
