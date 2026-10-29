/**
 * La puerta única a los datos de la app.
 *
 * Hoy solo existe el adaptador LOCAL: todo vive en el navegador (localStorage) y las dos apps (cliente y
 * paseador) se hablan por el evento «storage», que solo existe entre pestañas del MISMO navegador.
 * Un servidor compartido (Tarea 13, solo si el equipo lo pide) sería otro adaptador con esta misma forma.
 * Este archivo no guarda ni envía datos personales a ningún servidor.
 */
export interface Adaptador {
  /** Lee y decodifica una clave. Si no existe, no se puede leer o está dañada, devuelve `porDefecto`. */
  leer<T>(clave: string, porDefecto: T): T
  /** Guarda un valor. Si no hay espacio, la app sigue funcionando en memoria. */
  guardar<T>(clave: string, valor: T): void
  borrar(clave: string): void
  /**
   * Avisa cuando OTRA pestaña cambia algo. `clave = null` avisa por cualquier clave.
   * `alEnfocar` también avisa cuando la ventana vuelve a tener el foco.
   */
  suscribir(clave: string | null, aviso: () => void, opciones?: { alEnfocar?: boolean }): () => void
}

function leerLocal<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

export const adaptadorLocal: Adaptador = {
  leer: leerLocal,

  guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor))
    } catch {
      // Sin espacio (por las fotos): se intenta otra vez sin las imágenes más antiguas.
      if (Array.isArray(valor)) {
        try {
          const liviano = (valor as Array<{ image?: string }>).map((v, i, a) => (i < a.length - 3 ? { ...v, image: undefined } : v))
          localStorage.setItem(clave, JSON.stringify(liviano))
        } catch {
          /* sin espacio: la demostración sigue funcionando en memoria */
        }
      }
    }
  },

  borrar(clave) {
    try {
      localStorage.removeItem(clave)
    } catch {
      /* noop */
    }
  },

  suscribir(clave, aviso, opciones) {
    if (typeof window === 'undefined') return () => undefined
    const alAlmacenar = (e: StorageEvent) => {
      if (clave === null || e.key === null || e.key === clave) aviso()
    }
    window.addEventListener('storage', alAlmacenar)
    if (opciones?.alEnfocar) window.addEventListener('focus', aviso)
    return () => {
      window.removeEventListener('storage', alAlmacenar)
      if (opciones?.alEnfocar) window.removeEventListener('focus', aviso)
    }
  },
}

/** Adaptador en memoria: para las pruebas (no toca el navegador). */
export function adaptadorMemoria(inicial: Record<string, unknown> = {}): Adaptador & { datos: Map<string, string> } {
  const datos = new Map<string, string>(Object.entries(inicial).map(([k, v]) => [k, JSON.stringify(v)]))
  return {
    datos,
    leer<T>(clave: string, porDefecto: T): T {
      const crudo = datos.get(clave)
      if (!crudo) return porDefecto
      try {
        return JSON.parse(crudo) as T
      } catch {
        return porDefecto
      }
    },
    guardar(clave, valor) {
      datos.set(clave, JSON.stringify(valor))
    },
    borrar(clave) {
      datos.delete(clave)
    },
    suscribir: () => () => undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Adaptador «con copia en memoria y subida en segundo plano»           */
/* ------------------------------------------------------------------ */
/**
 * Un servidor responde DESPUÉS, no al instante como el navegador. Para que las pantallas no lo noten, el adaptador con
 * copia funciona así:
 *   - `leer` lee de la copia en memoria (al instante);
 *   - `guardar` cambia la copia al instante y sube el cambio en segundo plano;
 *   - lo que cambian otras personas baja después y avisa por `suscribir` (igual que el evento «storage» de hoy).
 * Quien quiera saber si «ya se guardó» pregunta por `estadoGuardado` o espera `yaSeGuardo`.
 *
 * Una regla importante: ANTES de bajar lo del servidor por primera vez, lo que se guarda (por ejemplo, una pantalla que
 * lee «vacío» y lo escribe de vuelta) es PROVISIONAL: se ve en la copia pero no se sube, y si el servidor ya tenía algo
 * en esa clave, gana el servidor. Así una pantalla que carga rápido nunca borra lo que había.
 *
 * Aquí NO hay ningún servidor: este archivo solo define la forma. El servidor real será un `Remoto` más adelante;
 * hoy el único es el de prueba (`adaptadorPrueba.ts`). Si dos personas cambian lo mismo, gana el último en llegar.
 */

/** Cómo va el guardado: «guardado» (ya está en el servidor), «subiendo» o «error» (se reintenta solo). */
export type EstadoGuardado = 'guardado' | 'subiendo' | 'error'

export type EstadoConexion = 'conectando' | 'conectado' | 'sin_conexion'

/** Quién es la persona que usa la app (lo sabe el servidor por su sesión). */
export interface Identidad {
  rol: 'familia' | 'paseador' | 'equipo'
  id: string
}

/**
 * El servidor respondió que NO a un cambio (una regla de acceso, un estado que ya no existe…). A diferencia de un corte de
 * internet, reintentar no lo arregla: el cambio se descarta, la copia vuelve a lo que dice el servidor y se avisa con
 * `mensaje` (un texto claro para la persona). Un `Remoto` lo lanza desde `subir` o `quitar`.
 */
export class RechazoDelServidor extends Error {
  constructor(
    public readonly mensaje: string,
    public readonly codigo?: string,
  ) {
    super(mensaje)
    this.name = 'RechazoDelServidor'
  }
}

/** Lo que un servidor tiene que saber hacer. Todo es asíncrono. */
export interface Remoto {
  /** Baja lo que le corresponde a esta persona: clave → valor. */
  bajar(): Promise<Record<string, unknown>>
  /** Sube un cambio. Un corte de internet lanza un error común (se reintenta); un «no» lanza `RechazoDelServidor`. */
  subir(clave: string, valor: unknown): Promise<void>
  quitar(clave: string): Promise<void>
  /** Avisa cuando OTRA persona cambia algo (`valor` undefined = lo borró). Devuelve cómo dejar de escuchar. */
  escuchar(aviso: (clave: string, valor: unknown) => void): () => void
  /** Quién es esta persona (null = sin sesión). */
  identidad(): Identidad | null
  /**
   * Opcional: ¿el último intento de hablar con el servidor (también el de preguntar por cambios) falló por falta de
   * conexión? Así el aviso «sin conexión» no depende de que haya algo pendiente por subir.
   */
  sinConexion?(): boolean
  /** Opcional: avisa cuando lo anterior cambia. Devuelve cómo dejar de escuchar. */
  alCambiarConexion?(aviso: () => void): () => void
}

export interface AdaptadorConCopia extends Adaptador {
  readonly tipo: 'copia'
  /** ¿Ya bajó lo del servidor por primera vez? Antes de eso, las lecturas devuelven el valor por defecto. */
  listo(): boolean
  /** Resuelve cuando ya bajó lo del servidor. */
  alEstarListo(): Promise<void>
  /** «guardado» si ya no queda nada por subir (de esa clave, o de todas si no se da una). */
  estadoGuardado(clave?: string): EstadoGuardado
  /** Resuelve cuando ya se guardó (o con «error» si falló y quedó reintentando). Nunca se queda colgada. */
  yaSeGuardo(clave?: string): Promise<EstadoGuardado>
  /** Avisa cada vez que cambia el estado del guardado (para mostrar «Guardando…»). */
  suscribirGuardado(aviso: () => void): () => void
  /**
   * Cómo está la conexión con el servidor: «conectando» (todavía no bajó nada), «conectado» o «sin_conexion» (no se pudo
   * bajar o hay cambios que no se pudieron subir; se reintenta solo). Cambia junto con `suscribirGuardado`.
   */
  estadoConexion(): EstadoConexion
  /** Avisa cuando el servidor dijo que NO a un cambio (ya se volvió a lo que dice el servidor). */
  suscribirRechazos(aviso: (rechazo: { clave: string; mensaje: string; codigo?: string }) => void): () => void
  identidad(): Identidad | null
  /** Vuelve a intentar ahora lo que falló. */
  reintentar(): void
  /** Deja de subir y de escuchar (para las pruebas y al cerrar sesión). */
  detener(): void
}

/** ¿Este adaptador es de los que tienen copia y subida en segundo plano? */
export function esConCopia(a: Adaptador): a is AdaptadorConCopia {
  return (a as { tipo?: string }).tipo === 'copia'
}

export function crearAdaptadorConCopia(
  remoto: Remoto,
  opciones: { reintentoMs?: number; avisar?: (mensaje: string) => void } = {},
): AdaptadorConCopia {
  const reintentoMs = opciones.reintentoMs ?? 5000
  const copia = new Map<string, string>()
  /** Lo que falta subir (JSON; null = borrar). Si la misma clave cambia dos veces, queda solo lo último. */
  const pendientes = new Map<string, string | null>()
  const enVuelo = new Set<string>()
  const conError = new Set<string>()
  /** Lo guardado antes de estar listo: espera a saber qué tiene el servidor (null = borrar). */
  const provisionales = new Map<string, string | null>()
  let fallóBajar = false
  const oyentes = new Set<{ clave: string | null; aviso: () => void }>()
  const oyentesGuardado = new Set<() => void>()
  const oyentesRechazo = new Set<(r: { clave: string; mensaje: string; codigo?: string }) => void>()
  /** Para no repetir el mismo aviso en la consola en cada reintento (solo cuando algo empieza a fallar). */
  const avisados = new Set<string>()
  const esperas: Array<{ clave?: string; resolver: (e: EstadoGuardado) => void }> = []
  let estaListo = false
  let detenido = false
  let vaciando = false
  let temporizador: ReturnType<typeof setTimeout> | null = null
  let resolverListo: () => void = () => undefined
  const promesaListo = new Promise<void>((r) => {
    resolverListo = r
  })

  const estadoDe = (clave?: string): EstadoGuardado => {
    const claves = clave === undefined ? [...pendientes.keys(), ...enVuelo, ...conError] : [clave]
    // Mientras un reintento va en camino ya no es «error»: se está subiendo (y quien espera, espera el resultado).
    if (claves.some((k) => conError.has(k) && !enVuelo.has(k))) return 'error'
    if (provisionales.size > 0 && fallóBajar && (clave === undefined || provisionales.has(clave))) return 'error'
    if (claves.some((k) => pendientes.has(k) || enVuelo.has(k) || provisionales.has(k))) return 'subiendo'
    if (clave === undefined && provisionales.size > 0) return 'subiendo'
    return 'guardado'
  }
  const avisarGuardado = () => {
    oyentesGuardado.forEach((f) => f())
    for (let i = esperas.length - 1; i >= 0; i--) {
      const e = estadoDe(esperas[i].clave)
      if (e !== 'subiendo') {
        esperas[i].resolver(e)
        esperas.splice(i, 1)
      }
    }
  }
  const avisarCambio = (clave: string | null) => {
    oyentes.forEach((o) => {
      if (o.clave === null || clave === null || o.clave === clave) o.aviso()
    })
  }
  const programarReintento = () => {
    if (temporizador || detenido) return
    temporizador = setTimeout(() => {
      temporizador = null
      if (estaListo) void vaciar()
      else void bajar()
    }, reintentoMs)
  }
  async function vaciar(): Promise<void> {
    if (vaciando || detenido) return
    vaciando = true
    try {
      while (pendientes.size > 0 && !detenido) {
        const [clave, json] = pendientes.entries().next().value as [string, string | null]
        pendientes.delete(clave)
        enVuelo.add(clave)
        avisarGuardado()
        try {
          if (json === null) await remoto.quitar(clave)
          else await remoto.subir(clave, JSON.parse(json))
          conError.delete(clave)
          avisados.delete(clave)
        } catch (e) {
          if (e instanceof RechazoDelServidor) {
            // El servidor dijo que NO: reintentar no lo arregla. Se descarta el cambio, la copia vuelve a lo que dice
            // el servidor y se avisa. Lo que la persona hizo DESPUÉS (si hay algo pendiente) sigue su camino.
            conError.delete(clave)
            enVuelo.delete(clave)
            avisados.delete(clave)
            // Primero el aviso (quien esperaba «ya se guardó» se entera de que fue un «no») y luego el estado.
            oyentesRechazo.forEach((f) => f({ clave, mensaje: e.mensaje, codigo: e.codigo }))
            avisarGuardado()
            void bajar()
            continue
          }
          // Si mientras tanto cambió otra vez, manda lo nuevo; si no, se reintenta lo mismo.
          if (!pendientes.has(clave)) pendientes.set(clave, json)
          conError.add(clave)
          enVuelo.delete(clave)
          if (!avisados.has(clave)) {
            avisados.add(clave)
            opciones.avisar?.(`[datos] No se pudo guardar «${clave}». Se reintenta solo.`)
          }
          avisarGuardado()
          programarReintento()
          return
        }
        enVuelo.delete(clave)
        avisarGuardado()
      }
    } finally {
      vaciando = false
    }
  }

  const bajar = async () => {
    try {
      const datos = await remoto.bajar()
      if (detenido) return
      for (const [clave, valor] of Object.entries(datos)) {
        // Lo que esta persona acaba de cambiar y todavía no subió manda sobre lo que baja.
        if (pendientes.has(clave) || enVuelo.has(clave)) continue
        // Lo provisional (guardado antes de estar listo) cede ante lo que ya tenía el servidor.
        provisionales.delete(clave)
        copia.set(clave, JSON.stringify(valor))
      }
      // Lo provisional que el servidor no tenía es lo primero que se sube.
      for (const [clave, json] of provisionales) pendientes.set(clave, json)
      provisionales.clear()
      fallóBajar = false
      avisados.delete('')
      estaListo = true
      resolverListo()
      avisarCambio(null)
      avisarGuardado()
      void vaciar()
    } catch {
      fallóBajar = true
      if (!avisados.has('')) {
        avisados.add('')
        opciones.avisar?.('[datos] No se pudo bajar lo del servidor. Se reintenta solo.')
      }
      avisarGuardado()
      programarReintento()
    }
  }

  const bajaConexion = remoto.alCambiarConexion?.(() => avisarGuardado())
  const bajaEscucha = remoto.escuchar((clave, valor) => {
    if (detenido || pendientes.has(clave) || enVuelo.has(clave)) return
    provisionales.delete(clave)
    if (valor === undefined) copia.delete(clave)
    else copia.set(clave, JSON.stringify(valor))
    avisarCambio(clave)
  })
  void bajar()

  return {
    tipo: 'copia',
    leer<T>(clave: string, porDefecto: T): T {
      const crudo = copia.get(clave)
      if (crudo === undefined) return porDefecto
      try {
        return JSON.parse(crudo) as T
      } catch {
        return porDefecto
      }
    },
    guardar(clave, valor) {
      const json = JSON.stringify(valor)
      if (json === undefined) return
      // Guardar lo mismo que ya hay no sube nada (así dos pantallas que se escriben de vuelta no hacen un ciclo).
      if (estaListo && copia.get(clave) === json && !pendientes.has(clave) && !enVuelo.has(clave)) return
      copia.set(clave, json)
      if (!estaListo) {
        provisionales.set(clave, json)
        return
      }
      pendientes.set(clave, json)
      avisarGuardado()
      void vaciar()
    },
    borrar(clave) {
      copia.delete(clave)
      if (!estaListo) {
        provisionales.set(clave, null)
        return
      }
      pendientes.set(clave, null)
      avisarGuardado()
      void vaciar()
    },
    suscribir(clave, aviso, opcionesSuscripcion) {
      const oyente = { clave, aviso }
      oyentes.add(oyente)
      const alEnfocar = typeof window !== 'undefined' && opcionesSuscripcion?.alEnfocar
      if (alEnfocar) window.addEventListener('focus', aviso)
      return () => {
        oyentes.delete(oyente)
        if (alEnfocar) window.removeEventListener('focus', aviso)
      }
    },
    listo: () => estaListo,
    alEstarListo: () => promesaListo,
    estadoGuardado: estadoDe,
    yaSeGuardo(clave) {
      const e = estadoDe(clave)
      if (e !== 'subiendo') return Promise.resolve(e)
      return new Promise<EstadoGuardado>((resolver) => esperas.push({ clave, resolver }))
    },
    suscribirGuardado(aviso) {
      oyentesGuardado.add(aviso)
      return () => oyentesGuardado.delete(aviso)
    },
    estadoConexion() {
      if (fallóBajar || conError.size > 0 || remoto.sinConexion?.() === true) return 'sin_conexion'
      return estaListo ? 'conectado' : 'conectando'
    },
    suscribirRechazos(aviso) {
      oyentesRechazo.add(aviso)
      return () => oyentesRechazo.delete(aviso)
    },
    identidad: () => remoto.identidad(),
    reintentar() {
      if (temporizador) {
        clearTimeout(temporizador)
        temporizador = null
      }
      if (estaListo) void vaciar()
      else void bajar()
    },
    detener() {
      detenido = true
      if (temporizador) clearTimeout(temporizador)
      temporizador = null
      bajaEscucha()
      bajaConexion?.()
      // Nadie se queda esperando.
      esperas.splice(0).forEach((e) => e.resolver(estadoDe(e.clave)))
    },
  }
}
