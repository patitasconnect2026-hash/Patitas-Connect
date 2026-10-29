/**
 * ¿La app trabaja con el servidor (Supabase)? Función PURA: quien la llama le pasa las variables.
 *
 * Solo si `NEXT_PUBLIC_DATOS` es «servidor» Y están la dirección del proyecto y la clave PÚBLICA. Si falta algo, la app
 * funciona como siempre (modo local), sin errores. La clave «service_role» o «secret» NUNCA se usa: si alguien la pone
 * por error, se rechaza y se vuelve a modo local.
 */

export interface EntornoServidor {
  NEXT_PUBLIC_DATOS?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
}

export type MotivoLocal = 'modo_local' | 'faltan_variables' | 'url_invalida' | 'clave_secreta'

export type ConfigServidor = { activo: true; url: string; clave: string } | { activo: false; motivo: MotivoLocal }

/** ¿Esta clave es una clave secreta (de servicio)? Nunca debe llegar al navegador. */
export function esClaveSecreta(clave: string): boolean {
  if (clave.startsWith('sb_secret_')) return true
  const partes = clave.split('.')
  if (partes.length === 3 && clave.startsWith('eyJ')) {
    try {
      const json = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown }
      return json.role === 'service_role'
    } catch {
      return false
    }
  }
  return false
}

export function leerConfigServidor(env: EntornoServidor): ConfigServidor {
  if ((env.NEXT_PUBLIC_DATOS ?? '').trim().toLowerCase() !== 'servidor') return { activo: false, motivo: 'modo_local' }
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const clave = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
  if (!url || !clave) return { activo: false, motivo: 'faltan_variables' }
  if (esClaveSecreta(clave)) return { activo: false, motivo: 'clave_secreta' }
  let ok = false
  try {
    const u = new URL(url)
    ok = u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'))
  } catch {
    ok = false
  }
  if (!ok) return { activo: false, motivo: 'url_invalida' }
  return { activo: true, url, clave }
}

/**
 * La configuración de ESTA app. Las variables `NEXT_PUBLIC_…` se leen con su nombre completo para que Next las deje
 * escritas al compilar.
 */
export function configDeLaApp(): ConfigServidor {
  return leerConfigServidor({
    NEXT_PUBLIC_DATOS: process.env.NEXT_PUBLIC_DATOS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
}

/** ¿Está activo el inicio de sesión con servidor en esta app? */
export const accesoActivo = (): boolean => configDeLaApp().activo
