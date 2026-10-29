/**
 * De quién es lo que se guarda en ESTE teléfono cuando la app trabaja con servidor (`NEXT_PUBLIC_DATOS=servidor`).
 *
 * El problema: en un mismo navegador pueden entrar varias cuentas (una familia, un paseador, otra familia…). Si la
 * cuenta, la casa, el perro o la postulación se guardaran bajo una sola clave, la cuenta nueva heredaría lo de la
 * anterior. Por eso, CON SESIÓN, lo personal se guarda bajo `clave@idDeLaCuenta`:
 *
 *   - una cuenta no ve lo de otra (ni lo puede escribir);
 *   - una cuenta nueva empieza vacía;
 *   - lo que había antes SIN dueño (la clave suelta de siempre) no se le asigna a nadie y NO se borra: queda para el
 *     modo local y la demostración, que sigue leyendo y escribiendo esas claves como hoy.
 *
 * Sin servidor (modo local, prueba) este archivo no hace nada: las claves son las de siempre.
 * Sin sesión (la portada, la demostración) tampoco: son las claves de siempre.
 * Mientras todavía no se sabe si hay sesión (unos instantes al abrir) no se lee ni se escribe lo personal: así una
 * pantalla que carga rápido no mezcla lo suelto con lo de una cuenta ni lo escribe donde no debe.
 */
import type { Adaptador } from './adaptador'
import { CLAVES } from './claves'

/**
 * Lo que es de una persona y, con sesión, se guarda aparte por cuenta. Lo demás (chat y fotos de un paseo, por ejemplo)
 * ya va marcado con el id del paseo y no se mezcla.
 */
export const CLAVES_DE_CUENTA: readonly string[] = [CLAVES.cuenta, CLAVES.postulacion, CLAVES.pagos, CLAVES.demo, CLAVES.ejemplos]

/** Entre la clave y el id de la cuenta. Ninguna clave de la app lleva «@». */
const SEPARADOR = '@'

let porCuenta = false
let pendiente = true
let dueno: string | null = null
const oyentes = new Set<() => void>()

/** Con servidor: a partir de aquí lo personal se guarda por cuenta (y no se toca hasta saber la sesión). */
export function activarPorCuenta(): void {
  porCuenta = true
  pendiente = true
  dueno = null
}

/**
 * Dice quién tiene la sesión: su id, o null si no hay sesión. Lo llama quien lee la sesión (`useSesion`). Avisa a las
 * pantallas para que vuelvan a leer lo suyo. Si no cambió, no hace nada.
 */
export function fijarPropietario(id: string | null): void {
  if (!porCuenta) return
  if (!pendiente && dueno === id) return
  pendiente = false
  dueno = id
  for (const f of [...oyentes]) f()
}

/** Avisa cada vez que cambia de quién son los datos (entra, sale o cambia la cuenta). */
export function alCambiarPropietario(f: () => void): () => void {
  oyentes.add(f)
  return () => {
    oyentes.delete(f)
  }
}

/** Cambia mientras cambie de quién son los datos. Sirve para saber si una lectura guardada en memoria quedó vieja. */
export function huellaDelPropietario(): string {
  if (!porCuenta) return ''
  return pendiente ? '?' : dueno === null ? '-' : SEPARADOR + dueno
}

/** La cuenta dueña de los datos ahora (null: nadie, o todavía no se sabe). */
export function propietarioActual(): string | null {
  return porCuenta && !pendiente ? dueno : null
}

/**
 * La clave con la que se guarda `clave` ahora. `null` = todavía no se sabe la sesión: no se lee ni se escribe.
 * Sin servidor, sin sesión o para una clave que no es de cuenta, es la clave de siempre.
 */
export function claveDeLaCuenta(clave: string): string | null {
  if (!porCuenta || !CLAVES_DE_CUENTA.includes(clave)) return clave
  if (pendiente) return null
  return dueno === null ? clave : clave + SEPARADOR + dueno
}

/**
 * Borra del teléfono lo personal de una cuenta (lo que se guardó bajo `clave@idDeLaCuenta`): se usa después de borrar la
 * cuenta en el servidor. Lo suelto, sin dueño (modo local y demostración), no se toca.
 */
export function borrarLoDeLaCuenta(base: Adaptador, id: string): void {
  for (const clave of CLAVES_DE_CUENTA) base.borrar(clave + SEPARADOR + id)
}

/** Solo para las pruebas: vuelve al estado de «sin servidor». */
export function reiniciarPropietario(): void {
  porCuenta = false
  pendiente = true
  dueno = null
  oyentes.clear()
}

/**
 * Envuelve un adaptador para que lo personal (`CLAVES_DE_CUENTA`) quede atado a la cuenta con sesión. Mientras no hay
 * servidor, es transparente: lee y escribe exactamente las mismas claves.
 */
export function adaptadorPorCuenta(base: Adaptador): Adaptador {
  return {
    leer<T>(clave: string, porDefecto: T): T {
      const k = claveDeLaCuenta(clave)
      return k === null ? porDefecto : base.leer(k, porDefecto)
    },
    guardar(clave, valor) {
      const k = claveDeLaCuenta(clave)
      if (k !== null) base.guardar(k, valor)
    },
    borrar(clave) {
      const k = claveDeLaCuenta(clave)
      if (k !== null) base.borrar(k)
    },
    suscribir(clave, aviso, opciones) {
      const suscribirAhora = () => base.suscribir(clave === null ? null : (claveDeLaCuenta(clave) ?? clave), aviso, opciones)
      let baja = suscribirAhora()
      // Al cambiar la cuenta se escucha la clave nueva y se avisa: la pantalla vuelve a leer lo de la cuenta nueva.
      const bajaDueno = alCambiarPropietario(() => {
        baja()
        baja = suscribirAhora()
        aviso()
      })
      return () => {
        baja()
        bajaDueno()
      }
    },
  }
}
