'use client'

import { useState } from 'react'
import { ArrowRight, MailCheck } from 'lucide-react'
import { entrar, recuperar, registrar, ROLES_DE_REGISTRO, TEXTO_ACCESO, validarRegistro, type CampoRegistro, type RolDeRegistro } from '@/lib/servidor/acceso'
import type { ClienteAcceso } from '@/lib/servidor/tipos'
import { btnPrimary, inputBase } from '@/lib/ui'
import { cn } from '@/lib/utils'

export type ModoAcceso = 'entrar' | 'registrar' | 'olvide'

/** Textos de las pantallas: título hasta 5 palabras, apoyo hasta 12. */
export const TEXTO_PANTALLAS = {
  entrar: { titulo: 'Iniciar sesión', apoyo: 'Con tu correo y tu contraseña.', boton: 'Entrar' },
  registrar: { titulo: 'Crea tu cuenta', apoyo: 'Elige cómo vas a usar la app.', boton: 'Crear cuenta' },
  olvide: { titulo: 'Recupera tu contraseña', apoyo: 'Te enviamos un enlace a tu correo.', boton: 'Enviar enlace' },
  /** Debajo del inicio de sesión: aquí se elige «familia» o «paseador». */
  sinCuenta: { titulo: '¿No tienes cuenta?', apoyo: 'Elige cómo vas a usar la app.', grupo: 'Crear cuenta' },
  /** El enlace del correo llegó sin sesión (venció o se abrió en otro navegador). */
  enlaceSinSesion: 'Entra con tu correo y contraseña.',
} as const

const ETIQUETA_ROL: Record<RolDeRegistro, string> = { familia: 'Soy familia', paseador: 'Soy paseador' }

function Campo({ id, etiqueta, error, children }: { id: string; etiqueta: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-1.5 block text-ink-soft">
        {etiqueta}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-[14px] font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * La entrada de la app, en UNA pantalla (solo con servidor):
 *  - arriba, «Iniciar sesión» (correo, contraseña y «Olvidé mi contraseña»);
 *  - abajo, «¿No tienes cuenta?»: se elige «Soy familia» o «Soy paseador» y se registra.
 * Solo se ofrece «familia» o «paseador»: el rol «equipo» no existe aquí. Los errores no dicen si un correo tiene cuenta.
 * Cuando hay sesión llama a `onListo`: la app principal es la que lee la sesión y decide a dónde va cada rol.
 */
export function FormularioAcceso({
  cliente,
  modoInicial = 'entrar',
  rolInicial = null,
  aviso,
  onListo,
}: {
  cliente: ClienteAcceso
  modoInicial?: ModoAcceso
  rolInicial?: RolDeRegistro | null
  /** Una línea arriba del formulario (por ejemplo, «Entra con tu correo y contraseña.»). */
  aviso?: string
  onListo?: () => void
}) {
  const [modo, setModo] = useState<ModoAcceso>(modoInicial)
  const [rol, setRol] = useState<RolDeRegistro | null>(rolInicial)
  const [v, setV] = useState({ nombre: '', apellido: '', celular: '', correo: '', contrasena: '' })
  const [errores, setErrores] = useState<Partial<Record<CampoRegistro, string>>>({})
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const t = TEXTO_PANTALLAS[modo]
  const poner = (campo: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((x) => ({ ...x, [campo]: e.target.value }))
    setErrores((x) => ({ ...x, [campo]: undefined }))
  }
  const cambiar = (m: ModoAcceso) => {
    setModo(m)
    setErrores({})
    setMensaje(null)
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    // Un doble toque no manda dos solicitudes.
    if (ocupado) return
    setMensaje(null)
    // El enlace del correo vuelve a la app principal (la dirección de la app), que lee la sesión y sigue.
    const origen = typeof window === 'undefined' ? '' : window.location.origin
    setOcupado(true)
    try {
      if (modo === 'registrar') {
        const r = validarRegistro({ rol: rol ?? undefined, ...v })
        if (!r.ok) {
          setErrores({ [r.campo]: r.mensaje })
          return
        }
        const res = await registrar(cliente, r.datos, { volverA: origen })
        if (!res.ok) setMensaje({ tipo: 'error', texto: res.mensaje })
        else if (res.paso === 'confirmar_correo') setMensaje({ tipo: 'ok', texto: TEXTO_ACCESO.revisaCorreo })
        else onListo?.()
      } else if (modo === 'entrar') {
        const res = await entrar(cliente, v.correo, v.contrasena)
        if (!res.ok) setMensaje({ tipo: 'error', texto: res.mensaje })
        else if (res.paso === 'sesion') onListo?.()
      } else {
        const res = await recuperar(cliente, v.correo, `${origen}/acceso/nueva-contrasena`)
        setMensaje({ tipo: res.ok ? 'ok' : 'error', texto: res.mensaje })
      }
    } finally {
      setOcupado(false)
    }
  }

  const enlace = 'min-h-11 text-[14px] font-extrabold text-brand-800 underline underline-offset-4'

  return (
    <div className="space-y-6">
      <form onSubmit={enviar} noValidate className="space-y-4">
        <div>
          <h1 className="font-display text-[34px] font-bold leading-[1.05] text-ink">{t.titulo}</h1>
          <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{t.apoyo}</p>
        </div>

        {aviso && modo === 'entrar' && (
          <p role="status" className="rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900">
            {aviso}
          </p>
        )}

        {mensaje?.tipo === 'ok' ? (
          <div role="status" className="rounded-3xl bg-forest-50 p-4 text-forest">
            <MailCheck size={24} />
            <p className="mt-1.5 text-[15px] font-extrabold leading-snug">{mensaje.texto}</p>
          </div>
        ) : (
          <>
            {modo === 'registrar' && (
              <fieldset>
                <legend className="eyebrow mb-1.5 text-ink-soft">¿Cómo vas a usar la app?</legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Rol">
                  {ROLES_DE_REGISTRO.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={rol === r}
                      onClick={() => {
                        setRol(r)
                        setErrores((x) => ({ ...x, rol: undefined }))
                      }}
                      className={cn('min-h-12 rounded-2xl border-2 px-3 text-[14.5px] font-extrabold active:scale-[0.98]', rol === r ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink/10 text-ink-soft')}
                    >
                      {ETIQUETA_ROL[r]}
                    </button>
                  ))}
                </div>
                {errores.rol && (
                  <p role="alert" className="mt-1.5 text-[14px] font-semibold text-red-700">
                    {errores.rol}
                  </p>
                )}
              </fieldset>
            )}

            {modo === 'registrar' && (
              <>
                <Campo id="ac-nombre" etiqueta="Nombre" error={errores.nombre}>
                  <input id="ac-nombre" className={inputBase} autoComplete="given-name" value={v.nombre} onChange={poner('nombre')} />
                </Campo>
                <Campo id="ac-apellido" etiqueta="Apellido" error={errores.apellido}>
                  <input id="ac-apellido" className={inputBase} autoComplete="family-name" value={v.apellido} onChange={poner('apellido')} />
                </Campo>
                <Campo id="ac-celular" etiqueta="Celular" error={errores.celular}>
                  <input id="ac-celular" className={inputBase} type="tel" inputMode="tel" autoComplete="tel" placeholder="987 654 321" value={v.celular} onChange={poner('celular')} />
                </Campo>
              </>
            )}

            <Campo id="ac-correo" etiqueta="Correo" error={errores.correo}>
              <input id="ac-correo" className={inputBase} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={v.correo} onChange={poner('correo')} />
            </Campo>

            {modo !== 'olvide' && (
              <Campo id="ac-contrasena" etiqueta="Contraseña" error={errores.contrasena}>
                <input
                  id="ac-contrasena"
                  className={inputBase}
                  type="password"
                  autoComplete={modo === 'registrar' ? 'new-password' : 'current-password'}
                  value={v.contrasena}
                  onChange={poner('contrasena')}
                />
                {modo === 'registrar' && <p className="mt-1.5 text-[14px] text-ink-soft">Mínimo 8 caracteres.</p>}
              </Campo>
            )}

            {mensaje?.tipo === 'error' && (
              <p role="alert" className="rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800">
                {mensaje.texto}
              </p>
            )}

            <button type="submit" disabled={ocupado} className={cn(btnPrimary, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}>
              {ocupado ? 'Un momento…' : t.boton} {!ocupado && <ArrowRight size={19} strokeWidth={2.6} />}
            </button>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4">
          {modo === 'entrar' && (
            <button type="button" className={enlace} onClick={() => cambiar('olvide')}>
              Olvidé mi contraseña
            </button>
          )}
          {modo === 'registrar' && (
            <button type="button" className={enlace} onClick={() => cambiar('entrar')}>
              Ya tengo cuenta
            </button>
          )}
          {modo === 'olvide' && (
            <button type="button" className={enlace} onClick={() => cambiar('entrar')}>
              Volver a entrar
            </button>
          )}
        </div>
      </form>

      {modo === 'entrar' && (
        <section aria-labelledby="ac-sin-cuenta" className="border-t border-ink/10 pt-5">
          <h2 id="ac-sin-cuenta" className="font-display text-[24px] font-bold leading-tight text-ink">
            {TEXTO_PANTALLAS.sinCuenta.titulo}
          </h2>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">
            {TEXTO_PANTALLAS.sinCuenta.grupo}. {TEXTO_PANTALLAS.sinCuenta.apoyo}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ROLES_DE_REGISTRO.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRol(r)
                  cambiar('registrar')
                }}
                className="min-h-12 rounded-2xl border-2 border-brand-600/40 bg-brand-50 px-3 text-[14.5px] font-extrabold text-brand-800 active:scale-[0.98]"
              >
                {ETIQUETA_ROL[r]}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
