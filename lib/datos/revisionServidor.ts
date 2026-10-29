'use client'

/**
 * Postulaciones con el servidor (paso 7b), del lado de la pantalla:
 *   - `useMiPostulacionEnElServidor`: el paseador. Su postulación completa sale sola a la base (lo que escribe queda PRIMERO
 *     en su teléfono), y ve su estado REAL: en revisión, aprobada o rechazada, y sus casillas. Sin internet espera y reintenta.
 *   - `usePostulacionesDelEquipo`: el equipo en /admin. Lee todas las postulaciones de la base y guarda sus decisiones; lo que
 *     decide se ve al instante pero se avisa si la base NO lo guardó (y vuelve a lo que dice la base).
 * Sin servidor, o sin sesión, nada de esto hace nada y la app sigue como siempre.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WalkerApplication } from '../walkerStore'
import { accesoActivo } from '../servidor/config'
import { clientePostulacionesDeLaApp } from '../servidor/cliente'
import { enviarMiPostulacion, guardarDecision, leerPostulacionesDelEquipo } from '../servidor/postulaciones'
import { cobrosDeFilas } from '../servidor/pagosMapeo'
import { appDesdeLaBase, esCascaron, filaDePostulacion, huellaDeRespuestas, yaEnviadaALaBase, type PostulacionDelEquipo } from '../servidor/postulacionesMapeo'
import { TEXTO_REVISION_SERVIDOR } from '../servidor/paseosTextos'
import type { FilaCruda } from '../servidor/paseosTipos'

const CADA_20_SEGUNDOS_MS = 20_000
const REINTENTO_MS = 15_000
const ESPERA_ANTES_DE_GUARDAR_MS = 600

/* ------------------------------------------------------------------ */
/* El paseador                                                          */
/* ------------------------------------------------------------------ */

export interface PostulacionPropiaDelServidor {
  /** `no_aplica`: no hay servidor o no es un paseador con sesión. */
  estado: 'no_aplica' | 'cargando' | 'listo' | 'sin_conexion'
  post: FilaCruda | null
  comp: FilaCruda | null
  /** Si lo que escribió ya llegó al equipo. `sin_conexion` y `rechazo` no se marcan como enviados. */
  envio: 'ok' | 'sin_conexion' | 'rechazo'
  recargar: () => void
}

type Lectura = { id: string; post: FilaCruda | null; comp: FilaCruda | null } | { fallo: true } | null

/** Si la postulación del teléfono está lista para salir a la base. `sinDniNiFoto`: lo mismo sin pedir el DNI ni la foto. */
export interface EstadoDeLaPostulacion {
  completa: boolean
  sinDniNiFoto: boolean
}

export function useMiPostulacionEnElServidor(sesionId: string | null, local: WalkerApplication | null, lista: EstadoDeLaPostulacion, hidratar: (a: WalkerApplication) => void): PostulacionPropiaDelServidor {
  const aplica = sesionId !== null && accesoActivo()
  const [lectura, setLectura] = useState<Lectura>(null)
  const [envio, setEnvio] = useState<PostulacionPropiaDelServidor['envio']>('ok')
  const [intento, setIntento] = useState(0)
  const [reintentoEnvio, setReintentoEnvio] = useState(0)
  const localRef = useRef(local)
  const hidratarRef = useRef(hidratar)
  const anterior = useRef<{ huella: string; dni: string; respuestas?: string } | null>(null)
  useEffect(() => {
    localRef.current = local
    hidratarRef.current = hidratar
  })

  const recargar = useCallback(() => {
    setLectura(null)
    setIntento((n) => n + 1)
  }, [])

  // Leer el estado real de la base: al entrar, cada 20 segundos y al volver a la pestaña.
  useEffect(() => {
    if (!aplica || !sesionId) return
    let vivo = true
    const leer = async () => {
      try {
        const c = await clientePostulacionesDeLaApp()
        if (!c) throw new Error('sin cliente')
        const { post, comp, cobro } = await c.miPostulacion(sesionId)
        if (!vivo) return
        // Sin postulación en este teléfono (o solo con el cascarón de la cuenta) pero con una ya enviada en la base (otro
        // teléfono): se arma con lo que guardó allá, para no pedirle todo otra vez.
        if (post && yaEnviadaALaBase(post) && esCascaron(localRef.current)) {
          hidratarRef.current(appDesdeLaBase(localRef.current, post, comp, cobro ? (cobrosDeFilas([cobro])[sesionId] ?? null) : null))
        }
        setLectura({ id: sesionId, post, comp })
      } catch {
        if (vivo) setLectura((l) => (l && 'post' in l ? l : { fallo: true }))
      }
    }
    void leer()
    const t = setInterval(() => void leer(), CADA_20_SEGUNDOS_MS)
    const alVolver = () => {
      if (document.visibilityState !== 'hidden') void leer()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [aplica, sesionId, intento])

  // Enviar la postulación COMPLETA (nunca un borrador): en cuanto se terminó de leer, y cada vez que cambia. En un teléfono donde
  // se armó con lo de la base (sin DNI ni foto) también sale, para que lo que cambie allí llegue (nunca un cascarón: borraría datos).
  const leida = lectura !== null && 'post' in lectura
  const enLaBase = leida && yaEnviadaALaBase(lectura.post)
  const completa = lista.completa || (enLaBase && lista.sinDniNiFoto)
  const huellaLocal = useMemo(() => (local && aplica && sesionId ? JSON.stringify(filaDePostulacion(local, sesionId, null)) + local.person.dni + JSON.stringify(local.cobro) + huellaDeRespuestas(local) : ''), [local, aplica, sesionId])
  useEffect(() => {
    if (!aplica || !sesionId || !leida || !completa || !huellaLocal) return
    let vivo = true
    let reintentar: ReturnType<typeof setTimeout> | undefined
    const enviar = setTimeout(async () => {
      const app = localRef.current
      if (!app || app.status === 'borrador') return
      try {
        const c = await clientePostulacionesDeLaApp()
        if (!c) throw new Error('sin cliente')
        const r = await enviarMiPostulacion(c, app, sesionId, anterior.current)
        if (!vivo) return
        if (r.ok) {
          anterior.current = { huella: r.huella, dni: r.dni, respuestas: r.respuestas }
          setEnvio('ok')
          // La base le dio otro código (el que había salido ya era de otra persona): se queda con ese.
          if (r.codigo !== app.code) hidratarRef.current({ ...app, code: r.codigo })
        } else {
          setEnvio(r.sinRed ? 'sin_conexion' : 'rechazo')
          if (r.sinRed) reintentar = setTimeout(() => setReintentoEnvio((n) => n + 1), REINTENTO_MS)
        }
      } catch {
        if (!vivo) return
        setEnvio('sin_conexion')
        reintentar = setTimeout(() => setReintentoEnvio((n) => n + 1), REINTENTO_MS)
      }
    }, ESPERA_ANTES_DE_GUARDAR_MS)
    return () => {
      vivo = false
      clearTimeout(enviar)
      if (reintentar) clearTimeout(reintentar)
    }
  }, [aplica, sesionId, leida, completa, huellaLocal, reintentoEnvio])

  return useMemo((): PostulacionPropiaDelServidor => {
    if (!aplica) return { estado: 'no_aplica', post: null, comp: null, envio: 'ok', recargar }
    if (!lectura) return { estado: 'cargando', post: null, comp: null, envio, recargar }
    if ('fallo' in lectura) return { estado: 'sin_conexion', post: null, comp: null, envio, recargar }
    if (lectura.id !== sesionId) return { estado: 'cargando', post: null, comp: null, envio, recargar }
    return { estado: 'listo', post: lectura.post, comp: lectura.comp, envio, recargar }
  }, [aplica, lectura, sesionId, envio, recargar])
}

/* ------------------------------------------------------------------ */
/* El equipo                                                            */
/* ------------------------------------------------------------------ */

export interface PostulacionesDelEquipo {
  aplica: boolean
  estado: 'cargando' | 'listo' | 'sin_conexion'
  lista: PostulacionDelEquipo[]
  /** Hay algo guardándose ahora mismo. */
  guardando: boolean
  /** Lo último que la base NO aceptó (o que no llegó): ya se volvió a lo que dice la base. */
  error: string | null
  /** El equipo cambia una postulación: se ve al instante y se guarda en la base unos instantes después. */
  cambiar: (id: string, fn: (a: WalkerApplication) => WalkerApplication) => void
  recargar: () => void
}

const sinClave = (o: Record<string, WalkerApplication>, id: string): Record<string, WalkerApplication> => Object.fromEntries(Object.entries(o).filter(([k]) => k !== id))

export function usePostulacionesDelEquipo(activo: boolean): PostulacionesDelEquipo {
  const aplica = activo && accesoActivo()
  const [base, setBase] = useState<PostulacionDelEquipo[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const [optimista, setOptimista] = useState<Record<string, WalkerApplication>>({})
  const [guardando, setGuardando] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const baseRef = useRef<PostulacionDelEquipo[]>([])
  const optimistaRef = useRef<Record<string, WalkerApplication>>({})
  const pendientes = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const guardandoAhora = useRef(0)
  const vivo = useRef(true)

  const leer = useCallback(async () => {
    try {
      const c = await clientePostulacionesDeLaApp()
      if (!c) throw new Error('sin cliente')
      const lista = await leerPostulacionesDelEquipo(c)
      if (!vivo.current) return
      baseRef.current = lista
      setBase(lista)
      setFallo(false)
    } catch {
      if (vivo.current) setFallo(true)
    }
  }, [])

  const volcar = useCallback(
    async (id: string) => {
      const despues = optimistaRef.current[id]
      const antes = baseRef.current.find((p) => p.id === id)?.app
      if (!despues || !antes) return
      guardandoAhora.current += 1
      if (vivo.current) setGuardando(guardandoAhora.current)
      const c = await clientePostulacionesDeLaApp().catch(() => null)
      const r = c ? await guardarDecision(c, id, antes, despues) : ({ ok: false, sinRed: true, motivo: TEXTO_REVISION_SERVIDOR.equipoSinConexion } as const)
      guardandoAhora.current -= 1
      if (r.ok) {
        // Lo que la base aceptó pasa a ser «lo último que dice la base»; si el equipo siguió cambiando, eso sigue pendiente.
        baseRef.current = baseRef.current.map((p) => (p.id === id ? { ...p, app: despues } : p))
        if (optimistaRef.current[id] === despues) optimistaRef.current = sinClave(optimistaRef.current, id)
      } else {
        // La base NO lo guardó: se vuelve a lo que dice la base y se avisa.
        optimistaRef.current = sinClave(optimistaRef.current, id)
      }
      if (!vivo.current) return
      setGuardando(guardandoAhora.current)
      setBase([...baseRef.current])
      setOptimista(optimistaRef.current)
      setError(r.ok ? null : r.motivo)
      if (!r.ok) void leer()
    },
    [leer],
  )

  useEffect(() => {
    vivo.current = true
    if (!aplica) return
    const inicio = setTimeout(() => void leer(), 0)
    const t = setInterval(() => {
      // Mientras el equipo está escribiendo o guardando, no se pisa lo que ve en pantalla.
      if (guardandoAhora.current === 0 && pendientes.current.size === 0) void leer()
    }, CADA_20_SEGUNDOS_MS)
    const alVolver = () => {
      if (document.visibilityState !== 'hidden' && guardandoAhora.current === 0 && pendientes.current.size === 0) void leer()
    }
    document.addEventListener('visibilitychange', alVolver)
    const esperando = pendientes.current
    return () => {
      vivo.current = false
      clearTimeout(inicio)
      clearInterval(t)
      document.removeEventListener('visibilitychange', alVolver)
      // Lo que alcanzó a decidir y todavía no se guardó se guarda al salir de la pantalla.
      for (const [id, reloj] of esperando) {
        clearTimeout(reloj)
        void volcar(id)
      }
      esperando.clear()
    }
  }, [aplica, intento, leer, volcar])

  const cambiar = useCallback(
    (id: string, fn: (a: WalkerApplication) => WalkerApplication) => {
      const actual = optimistaRef.current[id] ?? baseRef.current.find((p) => p.id === id)?.app
      if (!actual) return
      optimistaRef.current = { ...optimistaRef.current, [id]: fn(actual) }
      setOptimista(optimistaRef.current)
      setError(null)
      const previo = pendientes.current.get(id)
      if (previo) clearTimeout(previo)
      pendientes.current.set(
        id,
        setTimeout(() => {
          pendientes.current.delete(id)
          void volcar(id)
        }, ESPERA_ANTES_DE_GUARDAR_MS),
      )
    },
    [volcar],
  )

  const recargar = useCallback(() => setIntento((n) => n + 1), [])

  const lista = useMemo(() => (base ?? []).map((p) => (optimista[p.id] ? { ...p, app: optimista[p.id] } : p)), [base, optimista])
  return {
    aplica,
    estado: !aplica ? 'listo' : base === null ? (fallo ? 'sin_conexion' : 'cargando') : 'listo',
    lista,
    guardando: guardando > 0,
    error,
    cambiar,
    recargar,
  }
}
