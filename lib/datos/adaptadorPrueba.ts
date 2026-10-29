/**
 * El servidor de PRUEBA. NO es el real y no sale del teléfono: sirve para comprobar que las pantallas no notan la
 * diferencia entre «guardar al instante» (navegador) y «guardar después» (servidor), con un retraso simulado.
 *
 * Dos formas:
 *   - `almacen: 'memoria'` (por defecto): todo en un `Map`. Para las pruebas automáticas; permite simular lo que
 *     hace otra persona (`simularCambioAjeno`) y que falle el guardado (`fallar`).
 *   - `almacen: 'navegador'`: guarda en `localStorage` con un prefijo propio (`patitas:prueba:`) para que sobreviva a
 *     recargar la página y se entere de otras pestañas. Es lo que usa `NEXT_PUBLIC_DATOS=prueba`.
 */
import { crearAdaptadorConCopia, type AdaptadorConCopia, type Identidad, type Remoto } from './adaptador'

export interface RemotoDePrueba extends Remoto {
  /** Lo que «hay en el servidor» (para comprobar en las pruebas). */
  contenido(): Record<string, unknown>
  /** Simula que OTRA persona cambió algo (`undefined` = lo borró). */
  simularCambioAjeno(clave: string, valor: unknown, despuesDeMs?: number): void
  /** Hace que los próximos `n` guardados fallen (o todos, con `Infinity`). */
  fallar(n: number): void
  /** Cuántas veces se subió algo (para saber si se junta lo repetido). */
  readonly subidas: number
}

export function crearRemotoDePrueba(
  opciones: { retrasoMs?: number; almacen?: 'memoria' | 'navegador'; prefijo?: string; identidad?: Identidad | null; inicial?: Record<string, unknown> } = {},
): RemotoDePrueba {
  const retrasoMs = opciones.retrasoMs ?? 150
  const prefijo = opciones.prefijo ?? 'patitas:prueba:'
  const enNavegador = opciones.almacen === 'navegador' && typeof window !== 'undefined'
  const memoria = new Map<string, unknown>(Object.entries(opciones.inicial ?? {}))
  const oyentes = new Set<(clave: string, valor: unknown) => void>()
  let fallos = 0
  let subidas = 0
  const esperar = () => new Promise<void>((r) => setTimeout(r, retrasoMs))

  const leerTodo = (): Record<string, unknown> => {
    if (!enNavegador) return Object.fromEntries(memoria)
    const salida: Record<string, unknown> = {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || !k.startsWith(prefijo)) continue
        const crudo = localStorage.getItem(k)
        if (crudo !== null) salida[k.slice(prefijo.length)] = JSON.parse(crudo)
      }
    } catch {
      /* sin acceso: queda lo que haya */
    }
    return salida
  }
  const poner = (clave: string, valor: unknown) => {
    if (!enNavegador) {
      if (valor === undefined) memoria.delete(clave)
      else memoria.set(clave, valor)
      return
    }
    try {
      if (valor === undefined) localStorage.removeItem(prefijo + clave)
      else localStorage.setItem(prefijo + clave, JSON.stringify(valor))
    } catch {
      /* sin espacio */
    }
  }

  if (enNavegador) {
    // Cambios que hizo otra pestaña del mismo navegador (hace de «otra persona»).
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith(prefijo)) return
      const clave = e.key.slice(prefijo.length)
      let valor: unknown
      try {
        valor = e.newValue === null ? undefined : JSON.parse(e.newValue)
      } catch {
        return
      }
      oyentes.forEach((f) => f(clave, valor))
    })
  }

  return {
    async bajar() {
      await esperar()
      return leerTodo()
    },
    async subir(clave, valor) {
      await esperar()
      if (fallos > 0) {
        fallos -= 1
        throw new Error('Falla simulada')
      }
      subidas += 1
      poner(clave, valor)
    },
    async quitar(clave) {
      await esperar()
      if (fallos > 0) {
        fallos -= 1
        throw new Error('Falla simulada')
      }
      subidas += 1
      poner(clave, undefined)
    },
    escuchar(aviso) {
      oyentes.add(aviso)
      return () => oyentes.delete(aviso)
    },
    identidad: () => opciones.identidad ?? null,
    contenido: leerTodo,
    simularCambioAjeno(clave, valor, despuesDeMs) {
      setTimeout(() => {
        poner(clave, valor)
        oyentes.forEach((f) => f(clave, valor))
      }, despuesDeMs ?? retrasoMs)
    },
    fallar(n) {
      fallos = n
    },
    get subidas() {
      return subidas
    },
  }
}

/** El adaptador con copia armado sobre el servidor de prueba. */
export function adaptadorDePrueba(
  opciones: Parameters<typeof crearRemotoDePrueba>[0] & { reintentoMs?: number } = {},
): AdaptadorConCopia & { remoto: RemotoDePrueba } {
  const remoto = crearRemotoDePrueba(opciones)
  const adaptador = crearAdaptadorConCopia(remoto, { reintentoMs: opciones.reintentoMs ?? 50 })
  return Object.assign(adaptador, { remoto })
}
