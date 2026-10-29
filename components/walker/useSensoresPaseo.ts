'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { activarUbicacion, registrarLecturas, registrarPunto, registrarSinUbicacion, type Job } from '@/lib/bus'
import { CONFIG } from '@/lib/config'
import { horaDe } from '@/lib/paseo'
import { armarPunto, tienePunto } from '@/lib/puntosControl'
import { aLectura, esPermisoNegado, puedeUsarUbicacion, tocaProcesar } from '@/lib/ubicacion'
import type { Lectura } from '@/lib/zona'

type PonerEncargo = (fn: (j: Job | null) => Job | null) => void

/** Qué pasa con la ubicación del paseador: `sin_decidir` = todavía no eligió (se le explica y se le pregunta). */
export type EstadoUbicacion = 'sin_decidir' | 'esperando' | 'activa' | 'sin_senal' | 'negada' | 'omitida' | 'no_disponible'

export interface SensoresPaseo {
  ubicacion: EstadoUbicacion
  /** Última lectura real que llegó (para mostrar «hace cuánto»). */
  ultima: Lectura | null
  /** «Permitir ubicación»: se pide el permiso al navegador (o se anota que no se puede). */
  permitir: () => void
  /** «Ahora no»: sigue el paseo sin ubicación y el registro lo anota. */
  seguirSinUbicacion: () => void
  /** Una lectura de ahora, para un punto de control (foto, inicio o fin). null si no hay permiso, señal o tiempo. */
  leerAhora: () => Promise<Lectura | null>
  /** ¿La pantalla está encendida ahora? Los avisos de zona solo van mientras lo está. */
  pantallaEncendida: boolean
}

/** Cuánto se espera una lectura puntual antes de seguir sin ella. */
const ESPERA_LECTURA_MS = 6_000

/**
 * La ubicación del teléfono del paseador MIENTRAS pasea (`en_paseo`).
 *
 *  - **Puntos de control** (lo oficial): una lectura puntual al empezar, al terminar y en cada foto
 *    (`leerAhora`). No dependen de que la pantalla esté encendida todo el rato.
 *  - **Avisos de zona** (solo una ayuda): con permiso y MIENTRAS la pantalla está encendida, una lectura cada
 *    `segundosEntreLecturas` entra al motor de avisos. Con la pantalla apagada la web no sigue la ubicación: se pausa.
 *    Ya no se pide mantener la pantalla encendida: el paseador no tiene que vivir pegado al teléfono.
 *
 * En un celular real hace falta HTTPS (en la computadora sirve `localhost`).
 */
export function useSensoresPaseo(job: Job | null, setJob: PonerEncargo): SensoresPaseo {
  const estado = job?.paseo.estado ?? null
  const enPaseo = estado === 'en_paseo'
  const entregado = estado === 'entregado' || estado === 'cerrado' || estado === 'en_disputa'
  const decision = job?.ubicacion ?? null
  const decisionRef = useRef(decision)
  // La lectura puntual (`leerAhora`) mira siempre la decisión de ahora, sin volver a crearse cuando cambia.
  useEffect(() => {
    decisionRef.current = decision
  }, [decision])
  const [ultima, setUltima] = useState<Lectura | null>(null)
  const [sinSenal, setSinSenal] = useState(false)
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')

  // La pantalla encendida = la página visible. Con la pantalla apagada o en otra app, el navegador pausa la ubicación.
  useEffect(() => {
    const alCambiar = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [])

  /** Una lectura puntual (no un seguimiento). */
  const leerAhora = useCallback((): Promise<Lectura | null> => {
    return new Promise((resolver) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation || decisionRef.current !== 'activa') return resolver(null)
      let listo = false
      const fin = (l: Lectura | null) => {
        if (listo) return
        listo = true
        resolver(l)
      }
      const t = setTimeout(() => fin(null), ESPERA_LECTURA_MS + 1_000)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(t)
          fin(aLectura(pos))
        },
        () => {
          clearTimeout(t)
          fin(null)
        },
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: ESPERA_LECTURA_MS },
      )
    })
  }, [])

  // Avisos de zona (ayuda): solo con permiso, durante el paseo y con la pantalla encendida
  useEffect(() => {
    if (!enPaseo || decision !== 'activa' || !visible || typeof navigator === 'undefined' || !navigator.geolocation) return
    let ultimoTomado: number | null = null
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const l = aLectura(pos)
        if (!l) return
        setUltima(l)
        setSinSenal(false)
        if (!tocaProcesar(ultimoTomado, l.t, CONFIG.segundosEntreLecturas)) return
        ultimoTomado = l.t
        setJob((j) => registrarLecturas(j, [l], { demo: false }))
      },
      (err) => {
        if (esPermisoNegado(err.code)) setJob((j) => registrarSinUbicacion(j, 'negada', Date.now()))
        else setSinSenal(true)
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enPaseo, decision, visible, setJob])

  // Punto de control «inicio»: apenas el paseador eligió qué hacer con su ubicación, durante el paseo
  const hayInicio = tienePunto(job?.puntos, 'inicio')
  const horaInicio = job ? horaDe(job.paseo, 'recoger') : null
  useEffect(() => {
    if (!enPaseo || hayInicio || decision === null) return
    let vivo = true
    void leerAhora().then((l) => {
      if (!vivo) return
      setJob((j) => registrarPunto(j, armarPunto('inicio', horaInicio ?? Date.now(), l, decisionRef.current)))
    })
    return () => {
      vivo = false
    }
  }, [enPaseo, hayInicio, decision, horaInicio, leerAhora, setJob])

  // Punto de control «fin»: cuando el paseador entrega al perro
  const hayFin = tienePunto(job?.puntos, 'fin')
  const horaFin = job ? horaDe(job.paseo, 'entregar') : null
  useEffect(() => {
    if (!entregado || hayFin || horaFin === null) return
    let vivo = true
    void leerAhora().then((l) => {
      if (!vivo) return
      setJob((j) => registrarPunto(j, armarPunto('fin', horaFin, l, decisionRef.current)))
    })
    return () => {
      vivo = false
    }
  }, [entregado, hayFin, horaFin, leerAhora, setJob])

  const permitir = useCallback(() => {
    const entorno = typeof navigator === 'undefined' ? {} : { geolocation: navigator.geolocation, isSecureContext: window.isSecureContext }
    if (puedeUsarUbicacion(entorno)) setJob((j) => activarUbicacion(j))
    else setJob((j) => registrarSinUbicacion(j, 'no_disponible', Date.now()))
  }, [setJob])

  const seguirSinUbicacion = useCallback(() => setJob((j) => registrarSinUbicacion(j, 'omitida', Date.now())), [setJob])

  const ubicacion: EstadoUbicacion =
    decision === null ? 'sin_decidir' : decision !== 'activa' ? decision : sinSenal ? 'sin_senal' : ultima ? 'activa' : 'esperando'

  return { ubicacion, ultima, permitir, seguirSinUbicacion, leerAhora, pantallaEncendida: visible }
}
