'use client'

import { lazy, Suspense, useEffect } from 'react'
import { TEXTO_ENTRADA_ADMIN } from '@/lib/adminTextos'
import { vistaDelPanel } from '@/lib/servidor/admin'
import { salir as cerrarSesion } from '@/lib/servidor/acceso'
import { useSesion, type EstadoSesion } from '@/lib/servidor/sesion'
import type { ClienteAcceso } from '@/lib/servidor/tipos'
import { btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Marco } from '../acceso/PantallaAcceso'
import { BotonSalir } from './BotonSalir'
import { EntradaAdmin } from './EntradaAdmin'

// El panel se descarga SOLO cuando hace falta mostrarlo: sin sesión o sin rol «equipo» ni se pide su código.
const AdminPanelPerezoso = lazy(() => import('./AdminPanel').then((m) => ({ default: m.AdminPanel })))

export interface OpcionesPanel {
  /** Con servidor y con una cuenta del equipo dentro: el panel muestra «Salir» y el aviso de «datos en este navegador». */
  equipo?: { onSalir: () => Promise<void> }
}

/**
 * Decide qué se ve en /admin. El panel (`panel`) se pide SOLO en «local» y en «panel»: en cualquier otra vista ni se
 * crea, así que no se lee ni un dato. Es una pieza sin conexión propia (recibe la sesión): las pruebas la usan con
 * sesiones simuladas.
 */
export function PuertaAdmin({
  sesion,
  cliente,
  fallo = false,
  onSalir,
  onEntro,
  onReintentar,
  panel,
}: {
  sesion: EstadoSesion
  cliente: ClienteAcceso | null
  fallo?: boolean
  onSalir: () => Promise<void>
  onEntro: () => void
  onReintentar: () => void
  panel: (opciones: OpcionesPanel) => React.ReactNode
}) {
  const vista = vistaDelPanel(sesion, fallo)

  if (vista === 'local') return <>{panel({})}</>
  if (vista === 'panel') return <>{panel({ equipo: { onSalir } })}</>

  if (vista === 'cargando' || (vista === 'entrada' && !cliente)) {
    return (
      <Marco>
        <p role="status" className="text-[14px] font-semibold text-ink-soft">
          {TEXTO_ENTRADA_ADMIN.espera}
        </p>
      </Marco>
    )
  }
  if (vista === 'entrada' && cliente) {
    return (
      <Marco>
        <EntradaAdmin cliente={cliente} onEntro={onEntro} />
      </Marco>
    )
  }
  if (vista === 'sin_acceso') {
    return (
      <Marco>
        <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">{TEXTO_ENTRADA_ADMIN.sinAcceso}</h1>
        <BotonSalir onSalir={onSalir} className="mt-5 w-full justify-center" />
      </Marco>
    )
  }
  // 'no_se_pudo': hay sesión (o no hubo conexión) y no sabemos el rol: no se muestra nada del panel.
  return (
    <Marco>
      <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">{TEXTO_ENTRADA_ADMIN.noSePudo}</h1>
      <p className="mt-2 text-[14px] leading-snug text-ink-soft">{TEXTO_ENTRADA_ADMIN.noSePudoApoyo}</p>
      <button type="button" onClick={onReintentar} className={cn(btnPrimary, 'mt-5 h-12 w-full text-[14.5px]')}>
        {TEXTO_ENTRADA_ADMIN.reintentar}
      </button>
      {sesion.estado === 'con_sesion' && <BotonSalir onSalir={onSalir} className="mt-2.5 w-full justify-center" />}
    </Marco>
  )
}

/**
 * /admin: con servidor, exige sesión y rol «equipo» leído de la base. Sin servidor configurado (modo local) muestra el
 * panel como siempre. Al volver a la pestaña se vuelve a leer el rol, así que quitarle el acceso a alguien surte
 * efecto cuando vuelve a la pantalla (y la base deja de entregarle datos desde el primer momento).
 */
export function AdminAcceso() {
  const { sesion, cliente, fallo, recomprobar } = useSesion()
  const local = sesion.estado === 'local'

  useEffect(() => {
    if (local) return
    const alVolver = () => {
      if (document.visibilityState === 'visible') recomprobar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [local, recomprobar])

  const onSalir = async () => {
    try {
      if (cliente) await cerrarSesion(cliente)
    } catch {
      // Sin conexión: la sesión local se limpia igual; se vuelve a leer abajo.
      return recomprobar()
    }
    recomprobar()
  }

  return (
    <PuertaAdmin
      sesion={sesion}
      cliente={cliente}
      fallo={fallo}
      onSalir={onSalir}
      onEntro={recomprobar}
      // Si ni siquiera se pudo preparar la conexión no hay nada que volver a leer: se carga la página otra vez.
      onReintentar={fallo ? () => window.location.reload() : recomprobar}
      panel={(opciones) => (
        <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
          <AdminPanelPerezoso {...opciones} />
        </Suspense>
      )}
    />
  )
}
