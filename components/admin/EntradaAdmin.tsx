'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { TEXTO_ENTRADA_ADMIN } from '@/lib/adminTextos'
import { entrarAlPanel } from '@/lib/servidor/admin'
import type { ClienteAcceso } from '@/lib/servidor/tipos'
import { btnPrimary, inputBase } from '@/lib/ui'
import { cn } from '@/lib/utils'

/**
 * La entrada corta de /admin: correo y contraseña, nada más. No hay «Crear cuenta» ni «Olvidé mi contraseña»:
 * las cuentas del equipo no se registran desde la app (ver `supabase/LEEME.md`).
 */
export function EntradaAdmin({ cliente, onEntro }: { cliente: ClienteAcceso; onEntro: () => void }) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    // Un doble toque no manda dos solicitudes.
    if (ocupado) return
    setError(null)
    setOcupado(true)
    try {
      const r = await entrarAlPanel(cliente, correo, contrasena)
      if (r.ok) onEntro()
      else setError(r.mensaje)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div>
        <h1 className="font-display text-[34px] font-bold leading-[1.05] text-ink">{TEXTO_ENTRADA_ADMIN.titulo}</h1>
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{TEXTO_ENTRADA_ADMIN.apoyo}</p>
      </div>

      <div>
        <label htmlFor="ea-correo" className="eyebrow mb-1.5 block text-ink-soft">
          Correo
        </label>
        <input id="ea-correo" className={inputBase} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" value={correo} onChange={(e) => setCorreo(e.target.value)} />
      </div>
      <div>
        <label htmlFor="ea-contrasena" className="eyebrow mb-1.5 block text-ink-soft">
          Contraseña
        </label>
        <input id="ea-contrasena" className={inputBase} type="password" autoComplete="current-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={ocupado} className={cn(btnPrimary, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}>
        {ocupado ? TEXTO_ENTRADA_ADMIN.espera : TEXTO_ENTRADA_ADMIN.boton} {!ocupado && <ArrowRight size={19} strokeWidth={2.6} />}
      </button>
    </form>
  )
}
