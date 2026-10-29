/**
 * Elegir con qué adaptador trabaja la app (variable `NEXT_PUBLIC_DATOS`) y mandar SIEMPRE a `localStorage` lo de la
 * demostración (la cuenta de demostración y el paseador de ejemplo). Funciones puras: no leen el entorno ni el navegador;
 * quien las llama (`index.ts`) les pasa todo.
 *
 *   NEXT_PUBLIC_DATOS = local        (o vacío)  → todo en el teléfono, como hoy.
 *   NEXT_PUBLIC_DATOS = servidor     → el servidor real. TODAVÍA NO EXISTE: se vuelve a local y se dice en la consola.
 *   NEXT_PUBLIC_DATOS = prueba       → servidor de PRUEBA (lib/datos/adaptadorPrueba.ts); la demostración sigue local.
 *   NEXT_PUBLIC_DATOS = prueba-todo  → igual, pero también la demostración pasa por él (solo para probar pantallas).
 */
import { esConCopia, crearAdaptadorConCopia, type Adaptador, type AdaptadorConCopia, type Remoto } from './adaptador'

export type ModoDatos = 'local' | 'servidor' | 'prueba' | 'prueba-todo'

/** Un adaptador que reparte cada lectura y escritura entre el local (demostración) y el de copia (servidor). */
export interface AdaptadorEnrutado extends Adaptador {
  readonly enrutado: true
  /** El que atiende ahora a esta persona. */
  actual(): Adaptador
  readonly local: Adaptador
  readonly copia: AdaptadorConCopia
}

export function esEnrutado(a: Adaptador): a is AdaptadorEnrutado {
  return (a as { enrutado?: boolean }).enrutado === true
}

/**
 * `esDemo()`: ¿esta persona está en la demostración? Si sí, todo va a `local`.
 * `siempreLocal(clave, valor)`: claves (o valores) que NUNCA salen del teléfono aunque todavía no se sepa que es demostración
 * (la marca de demostración misma, «Mostrar ejemplos», la cuenta de demostración al crearla, el paseo con un paseador de ejemplo).
 */
export function enrutar(
  local: Adaptador,
  copia: AdaptadorConCopia,
  regla: {
    esDemo(): boolean
    siempreLocal?(clave: string, valor?: unknown): boolean
    /** Si se da, solo estas claves pueden ir al servidor; el resto se queda en el teléfono (lo que todavía no viaja). */
    enServidor?(clave: string): boolean
  },
): AdaptadorEnrutado {
  const siempre = (clave: string, valor?: unknown) => regla.siempreLocal?.(clave, valor) === true
  const delServidor = (clave: string) => regla.enServidor?.(clave) !== false
  const actual = (): Adaptador => (regla.esDemo() ? local : copia)
  return {
    enrutado: true,
    local,
    copia,
    actual,
    leer<T>(clave: string, porDefecto: T): T {
      return (siempre(clave) || !delServidor(clave) ? local : actual()).leer(clave, porDefecto)
    },
    guardar(clave, valor) {
      ;(siempre(clave, valor) || !delServidor(clave) ? local : actual()).guardar(clave, valor)
    },
    borrar(clave) {
      if (!delServidor(clave)) return local.borrar(clave)
      if (siempre(clave)) local.borrar(clave)
      actual().borrar(clave)
    },
    suscribir(clave, aviso, opciones) {
      const a = local.suscribir(clave, aviso, opciones)
      const b = copia.suscribir(clave, aviso, opciones)
      return () => {
        a()
        b()
      }
    },
  }
}

export interface EleccionDeAdaptador {
  modo: ModoDatos
  adaptador: Adaptador
  /** Mensajes para la consola (por ejemplo, que `servidor` no está configurado). */
  avisos: string[]
}

/** Elige el adaptador según `valor` (el contenido de NEXT_PUBLIC_DATOS). Nunca lanza: ante la duda, local. */
export function elegirAdaptador(o: {
  valor: string | undefined
  local: Adaptador
  /** Devuelve el servidor real si está configurado; null si no. */
  servidor?: () => Remoto | null
  /** Devuelve el servidor de prueba. */
  prueba?: () => Remoto
  esDemo: () => boolean
  siempreLocal?: (clave: string, valor?: unknown) => boolean
  /** false en el servidor de Next (no hay navegador): ahí siempre local. */
  enNavegador: boolean
  /** Dónde decir los avisos (la consola). */
  registrar?: (mensaje: string) => void
  /** Qué decir cuando piden «servidor» y los DATOS todavía no están listos (por defecto, que no está configurado). */
  avisoServidorSinDatos?: string
  /** Con `servidor`: las únicas claves que van al servidor. Las demás siguen en el teléfono. Sin esto, todas. */
  clavesDelServidor?: readonly string[]
}): EleccionDeAdaptador {
  const pedido = (o.valor ?? '').trim().toLowerCase()
  const avisos: string[] = []
  const decir = (m: string) => {
    avisos.push(m)
    o.registrar?.(m)
  }
  const local = (): EleccionDeAdaptador => ({ modo: 'local', adaptador: o.local, avisos })
  if (pedido === '' || pedido === 'local') return local()
  if (!o.enNavegador) return local()
  const con = (remoto: Remoto, modo: ModoDatos, demoTambien: boolean, claves?: readonly string[]): EleccionDeAdaptador => {
    const copia = crearAdaptadorConCopia(remoto, { avisar: decir })
    if (demoTambien) return { modo, adaptador: copia, avisos }
    return {
      modo,
      adaptador: enrutar(o.local, copia, { esDemo: o.esDemo, siempreLocal: o.siempreLocal, ...(claves ? { enServidor: (k: string) => claves.includes(k) } : {}) }),
      avisos,
    }
  }
  if (pedido === 'servidor') {
    const remoto = o.servidor?.() ?? null
    if (!remoto) {
      decir(o.avisoServidorSinDatos ?? '[datos] NEXT_PUBLIC_DATOS=servidor, pero el servidor no está configurado. Se usan los datos del teléfono (local).')
      return local()
    }
    return con(remoto, 'servidor', false, o.clavesDelServidor)
  }
  if ((pedido === 'prueba' || pedido === 'prueba-todo') && o.prueba) return con(o.prueba(), pedido, pedido === 'prueba-todo')
  decir(`[datos] NEXT_PUBLIC_DATOS="${o.valor}" no se reconoce. Se usan los datos del teléfono (local).`)
  return local()
}

/** El adaptador con copia que hay detrás de `a`, si lo hay y es el que atiende ahora (no la demostración). */
export function copiaEnUso(a: Adaptador): AdaptadorConCopia | null {
  if (esEnrutado(a)) {
    const x = a.actual()
    return esConCopia(x) ? x : null
  }
  return esConCopia(a) ? a : null
}
