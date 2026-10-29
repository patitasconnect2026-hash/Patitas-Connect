'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cambiarContrasena, TEXTO_ACCESO } from '@/lib/servidor/acceso'
import { vistaDeLaApp } from '@/lib/servidor/destino'
import { useSesion } from '@/lib/servidor/sesion'
import { btnPrimary, inputBase } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { FormularioAcceso, TEXTO_PANTALLAS } from './FormularioAcceso'

/** El marco de las pantallas de acceso (también lo usa la entrada de /admin). */
export function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[460px] bg-canvas px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link href="/" className="mb-5 inline-flex min-h-11 items-center gap-2 text-[14px] font-extrabold text-ink-soft">
        <ArrowLeft size={17} /> Volver a la app
      </Link>
      {children}
    </main>
  )
}

/**
 * /acceso: la misma entrada que abre la portada (iniciar sesión arriba, crear cuenta abajo). Existe para los enlaces
 * de correos anteriores y para quien la escribe a mano: con sesión NO muestra «Hola / Seguir», lleva a la app de la
 * cuenta. Sin servidor configurado, lo dice y no hace nada más.
 */
export function PantallaAcceso() {
  const { sesion, cliente, fallo, recomprobar, llegoPorEnlace } = useSesion()
  const router = useRouter()
  const v = vistaDeLaApp({ sesion, fallo, seccion: 'familia' })
  const destino = v.vista === 'ir' || v.vista === 'cuenta_de_familia' ? v.destino : v.vista === 'continuar' ? '/' : null

  useEffect(() => {
    if (destino) router.replace(destino)
  }, [destino, router])

  if (v.vista === 'local') {
    return (
      <Marco>
        <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">Aún no hay cuentas</h1>
        <p className="mt-2 text-[14px] leading-snug text-ink-soft">Por ahora la app guarda todo en este teléfono.</p>
      </Marco>
    )
  }
  if (v.vista === 'no_se_pudo') {
    return (
      <Marco>
        <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">{TEXTO_ACCESO.noSePudo}</h1>
        <p className="mt-2 text-[14px] leading-snug text-ink-soft">{TEXTO_ACCESO.noSePudoApoyo}</p>
        <button type="button" onClick={fallo ? () => window.location.reload() : recomprobar} className={cn(btnPrimary, 'mt-5 h-14 w-full text-[16px]')}>
          {TEXTO_ACCESO.reintentar}
        </button>
      </Marco>
    )
  }
  if (v.vista === 'entrada' && cliente) {
    return (
      <Marco>
        <FormularioAcceso cliente={cliente} onListo={recomprobar} aviso={llegoPorEnlace ? TEXTO_PANTALLAS.enlaceSinSesion : undefined} />
      </Marco>
    )
  }
  return (
    <Marco>
      <p role="status" className="text-[14px] font-semibold text-ink-soft">
        {TEXTO_ACCESO.espera}
      </p>
    </Marco>
  )
}

/** /acceso/nueva-contrasena: el enlace del correo abre una sesión corta para elegir la contraseña nueva. */
export function PantallaNuevaContrasena() {
  const { sesion, cliente } = useSesion()
  const [valor, setValor] = useState('')
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  if (sesion.estado === 'local') {
    return (
      <Marco>
        <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">Aún no hay cuentas</h1>
      </Marco>
    )
  }
  if (sesion.estado === 'cargando' || !cliente) {
    return (
      <Marco>
        <p role="status" className="text-[14px] font-semibold text-ink-soft">
          Un momento…
        </p>
      </Marco>
    )
  }
  if (sesion.estado === 'sin_sesion') {
    return (
      <Marco>
        <h1 className="font-display text-[30px] font-bold leading-[1.05] text-ink">El enlace venció</h1>
        <p className="mt-2 text-[14px] leading-snug text-ink-soft">Pide uno nuevo desde «Olvidé mi contraseña».</p>
        <Link href="/acceso" className={cn(btnPrimary, 'mt-5 h-14 w-full text-[16px]')}>
          Ir a entrar
        </Link>
      </Marco>
    )
  }
  return (
    <Marco>
      <form
        noValidate
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (ocupado) return
          setOcupado(true)
          const r = await cambiarContrasena(cliente, valor)
          setEstado({ ok: r.ok, texto: r.mensaje })
          setOcupado(false)
        }}
      >
        <div>
          <h1 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Elige una contraseña nueva</h1>
          <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label htmlFor="nc-contrasena" className="eyebrow mb-1.5 block text-ink-soft">
            Contraseña nueva
          </label>
          <input id="nc-contrasena" className={inputBase} type="password" autoComplete="new-password" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        {estado && (
          <p role={estado.ok ? 'status' : 'alert'} className={cn('rounded-2xl p-3 text-[14px] font-semibold leading-snug', estado.ok ? 'bg-forest-50 text-forest' : 'bg-red-50 text-red-800')}>
            {estado.texto}
          </p>
        )}
        {estado?.ok ? (
          <Link href="/acceso" className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
            Entrar
          </Link>
        ) : (
          <button type="submit" disabled={ocupado} className={cn(btnPrimary, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}>
            {ocupado ? 'Un momento…' : 'Guardar contraseña'}
          </button>
        )}
      </form>
    </Marco>
  )
}
