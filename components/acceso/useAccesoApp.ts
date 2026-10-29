'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { borrarDatosDeEstaCuenta } from '@/lib/datos'
import { completarDatosPersonales, salir as cerrarSesion } from '@/lib/servidor/acceso'
import { borrarCuenta as borrarLaCuenta, TEXTO_BORRAR, type ResultadoBorrado } from '@/lib/servidor/cuenta'
import { datosDeCuenta, vistaDeLaApp, type DatosDeCuenta, type SeccionApp, type VistaApp } from '@/lib/servidor/destino'
import { useSesion } from '@/lib/servidor/sesion'
import type { ClienteAcceso } from '@/lib/servidor/tipos'

export interface AccesoApp {
  /** Qué mostrar (ver `lib/servidor/destino.ts`). En modo local siempre es «local»: nada cambia. */
  vista: VistaApp
  cliente: ClienteAcceso | null
  /** Lo que la persona escribió al registrarse (null si no hay sesión). */
  cuenta: DatosDeCuenta | null
  /**
   * El id de la cuenta cuando esta app es la de su rol y la base ya dijo cuál es (si no, null). De aquí salen los datos
   * del servidor: así la pantalla no espera a que los paseos terminen de bajar para saber que hay una sesión.
   */
  usuarioId: string | null
  /** Se abrió desde un enlace de correo y todavía no hay sesión. */
  llegoPorEnlace: boolean
  /** Vuelve a leer la sesión y el rol de la base. */
  recomprobar: () => void
  /** Cierra la sesión en este navegador (no borra lo que hay en el teléfono). */
  salir: () => Promise<void>
  /**
   * Borra la cuenta en el servidor (que se niega si hay un paseo en marcha, un reporte abierto o un pago pendiente) y,
   * si se borró, lo que quedaba de ella en este teléfono. Al terminar la sesión ya no existe y la app vuelve a la portada.
   */
  borrarCuenta: () => Promise<ResultadoBorrado>
}

/**
 * La sesión del servidor leída por la app principal (`/` y `/paseador`). Con una cuenta de otra app, la lleva a la
 * suya. Al tener sesión completa, una sola vez, `datos_personales` (apellido y celular): si la persona confirmó el
 * correo desde el enlace nunca pasó por «Entrar», así que sin esto esos datos no se guardarían.
 */
export function useAccesoApp(seccion: SeccionApp): AccesoApp {
  const router = useRouter()
  const { sesion, cliente, fallo, recomprobar, llegoPorEnlace } = useSesion()
  const vista = vistaDeLaApp({ sesion, fallo, seccion })
  const destino = vista.vista === 'ir' ? vista.destino : null

  useEffect(() => {
    if (destino) router.replace(destino)
  }, [destino, router])

  const completadoPara = useRef<string | null>(null)
  useEffect(() => {
    if (!cliente || sesion.estado !== 'con_sesion' || sesion.perfilNoLeido) return
    const rol = sesion.perfil?.rol
    if (rol !== 'familia' && rol !== 'paseador') return
    if (completadoPara.current === sesion.usuario.id) return
    completadoPara.current = sesion.usuario.id
    void completarDatosPersonales(cliente, sesion.usuario).catch(() => false)
  }, [cliente, sesion])

  const salir = useCallback(async () => {
    try {
      if (cliente) await cerrarSesion(cliente)
    } catch {
      // Sin conexión: igual se vuelve a leer la sesión abajo.
      return recomprobar()
    }
    recomprobar()
  }, [cliente, recomprobar])

  const borrarCuenta = useCallback(async (): Promise<ResultadoBorrado> => {
    if (!cliente || sesion.estado !== 'con_sesion') return { ok: false, mensaje: TEXTO_BORRAR.entrar }
    const id = sesion.usuario.id
    const r = await borrarLaCuenta(cliente)
    if (r.ok) {
      // En el teléfono tampoco queda nada de esa cuenta. Si esto fallara, la cuenta igual ya no existe: se sigue.
      await borrarDatosDeEstaCuenta(id).catch(() => undefined)
      recomprobar()
    }
    return r
  }, [cliente, sesion, recomprobar])

  const cuenta = sesion.estado === 'con_sesion' ? datosDeCuenta(sesion.usuario, sesion.perfil) : null
  const usuarioId = vista.vista === 'continuar' && sesion.estado === 'con_sesion' ? sesion.usuario.id : null
  return { vista, cliente, cuenta, usuarioId, llegoPorEnlace, recomprobar, salir, borrarCuenta }
}
