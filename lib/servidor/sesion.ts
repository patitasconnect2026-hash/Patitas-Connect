'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fijarPropietario } from '../datos/propietario'
import { configDeLaApp } from './config'
import { clienteDeLaApp } from './cliente'
import { llegoPorEnlaceDeCorreo } from './destino'
import type { ClienteAcceso, ErrorServidor, PerfilServidor, SesionServidor, UsuarioServidor } from './tipos'

export type EstadoSesion =
  | { estado: 'local' }
  | { estado: 'cargando' }
  | { estado: 'sin_sesion' }
  /** `perfilNoLeido`: hay sesión pero la base no respondió (sin conexión u otro fallo): NO es «sin rol». */
  | { estado: 'con_sesion'; usuario: UsuarioServidor; perfil: PerfilServidor | null; perfilNoLeido?: boolean }

/** ¿Este error dice que la sesión ya no vale (token vencido o rechazado)? */
export function esErrorDeSesionVencida(e: ErrorServidor | null | undefined): boolean {
  if (!e) return false
  return e.status === 401 || e.code === 'PGRST301' || e.code === 'PGRST303' || /\bjwt\b/i.test(e.message)
}

/**
 * Convierte la sesión del cliente en un estado, leyendo el perfil (y su rol) DE LA BASE con la propia sesión.
 *  - Sin sesión: no se lee nada.
 *  - La base dice que la sesión venció: se cierra y queda «sin sesión» (vuelve a la entrada).
 *  - La base no respondió: `perfilNoLeido` (quien decide qué mostrar no debe tomarlo por «sin rol» ni por «equipo»).
 * Nunca lanza.
 */
export async function resolverSesion(cliente: ClienteAcceso, sesion: SesionServidor | null): Promise<EstadoSesion> {
  if (!sesion) return { estado: 'sin_sesion' }
  const usuario = sesion.user
  let lectura: Awaited<ReturnType<ClienteAcceso['datos']['leerPerfil']>> | null = null
  try {
    lectura = await cliente.datos.leerPerfil(usuario.id)
  } catch {
    lectura = null
  }
  if (lectura && !lectura.error) return { estado: 'con_sesion', usuario, perfil: lectura.perfil }
  if (lectura && esErrorDeSesionVencida(lectura.error)) {
    try {
      await cliente.auth.signOut()
    } catch {
      // Sin conexión: igual se vuelve a la entrada; la sesión local se limpia la próxima vez que haya red.
      return { estado: 'sin_sesion' }
    }
    return { estado: 'sin_sesion' }
  }
  return { estado: 'con_sesion', usuario, perfil: null, perfilNoLeido: true }
}

/**
 * De quién es lo guardado en este teléfono según la sesión (ver `lib/datos/propietario.ts`): el id de la cuenta, `null`
 * si no hay sesión, y `undefined` mientras todavía no se sabe (no se cambia nada). Sin servidor no se usa.
 */
export function propietarioDeLaSesion(sesion: EstadoSesion): string | null | undefined {
  if (sesion.estado === 'con_sesion') return sesion.usuario.id
  if (sesion.estado === 'sin_sesion') return null
  return undefined
}

/**
 * Si antes sabíamos el perfil de la misma persona y ahora la base no respondió, no la sacamos de donde estaba
 * (un corte de internet al volver a la pestaña no debe cerrarle el panel). Cualquier otra respuesta sí cambia el estado.
 */
export function conservarSiNoSePudoLeer(previo: EstadoSesion, nuevo: EstadoSesion): EstadoSesion {
  if (
    nuevo.estado === 'con_sesion' &&
    nuevo.perfilNoLeido &&
    previo.estado === 'con_sesion' &&
    !previo.perfilNoLeido &&
    previo.usuario.id === nuevo.usuario.id
  ) {
    return previo
  }
  return nuevo
}

/**
 * ¿Se abrió la app desde un enlace de correo? Se lee al cargar el módulo, ANTES de que Supabase (que se crea después,
 * en un efecto) lea y limpie la dirección.
 */
const LLEGO_POR_ENLACE = typeof window !== 'undefined' && llegoPorEnlaceDeCorreo(window.location.search, window.location.hash)

/**
 * La sesión de esta persona. En modo local (sin servidor configurado) es siempre «local»: no descarga nada, no se
 * conecta y no escribe en la consola. La demostración nunca tiene sesión.
 *  - `fallo`: no se pudo ni preparar la conexión (por ejemplo, sin internet al cargar).
 *  - `recomprobar()`: vuelve a leer la sesión y el rol de la base (al volver a la pestaña, al entrar o al salir).
 *  - `llegoPorEnlace`: la app se abrió desde un enlace de correo y (hasta ahora) no hubo sesión: hay que decirle
 *    «Entra con tu correo y contraseña».
 */
export function useSesion(): { sesion: EstadoSesion; cliente: ClienteAcceso | null; fallo: boolean; recomprobar: () => void; llegoPorEnlace: boolean } {
  const activo = configDeLaApp().activo
  const [cliente, setCliente] = useState<ClienteAcceso | null>(null)
  const [sesion, setSesion] = useState<EstadoSesion>(activo ? { estado: 'cargando' } : { estado: 'local' })
  const [fallo, setFallo] = useState(false)
  const [huboSesion, setHuboSesion] = useState(false)
  const volverAComprobar = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!activo) return
    let vivo = true
    let baja: { unsubscribe(): void } | null = null
    const aplicar = (nuevo: EstadoSesion) => {
      if (!vivo) return
      // Primero se dice de quién son los datos: así, cuando la pantalla cambia, ya lee lo de esta cuenta.
      const dueno = propietarioDeLaSesion(nuevo)
      if (dueno !== undefined) fijarPropietario(dueno)
      if (nuevo.estado === 'con_sesion') setHuboSesion(true)
      setSesion((previo) => conservarSiNoSePudoLeer(previo, nuevo))
    }
    void clienteDeLaApp()
      .then(async (c) => {
        if (!vivo) return
        if (!c) return setFallo(true)
        setCliente(c)
        const r = await c.auth.getSession()
        aplicar(await resolverSesion(c, r.data.session))
        if (!vivo) return
        volverAComprobar.current = async () => {
          try {
            const s = await c.auth.getSession()
            aplicar(await resolverSesion(c, s.data.session))
          } catch {
            return
          }
        }
        // «INITIAL_SESSION» repite lo que ya leímos arriba.
        baja = c.auth.onAuthStateChange((evento, s) => {
          if (evento === 'INITIAL_SESSION') return
          void resolverSesion(c, s).then(aplicar)
        })
      })
      .catch(() => {
        if (vivo) setFallo(true)
      })
    return () => {
      vivo = false
      volverAComprobar.current = null
      baja?.unsubscribe()
    }
  }, [activo])

  const recomprobar = useCallback(() => {
    void volverAComprobar.current?.()
  }, [])

  return { sesion, cliente, fallo, recomprobar, llegoPorEnlace: LLEGO_POR_ENLACE && !huboSesion }
}
