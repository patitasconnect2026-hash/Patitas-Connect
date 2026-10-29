/**
 * Lo mínimo que la app necesita del servidor para el inicio de sesión. Es una interfaz propia: así las pruebas usan un
 * cliente simulado (sin red) y el resto de la app no depende de la librería de Supabase.
 */
export interface ErrorServidor {
  message: string
  status?: number
  code?: string
}

export interface UsuarioServidor {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

export interface SesionServidor {
  user: UsuarioServidor
}

export interface PerfilServidor {
  rol: string
  nombre_pila: string
}

export interface ClienteAcceso {
  auth: {
    signUp(args: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }): Promise<{
      data: { user: UsuarioServidor | null; session: SesionServidor | null }
      error: ErrorServidor | null
    }>
    signInWithPassword(args: { email: string; password: string }): Promise<{
      data: { user: UsuarioServidor | null; session: SesionServidor | null }
      error: ErrorServidor | null
    }>
    /** `local`: solo este teléfono (sin avisar al servidor); sirve cuando la cuenta ya se borró. */
    signOut(opciones?: { scope?: 'local' | 'global' }): Promise<{ error: ErrorServidor | null }>
    resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: ErrorServidor | null }>
    updateUser(args: { password: string }): Promise<{ error: ErrorServidor | null }>
    getSession(): Promise<{ data: { session: SesionServidor | null }; error: ErrorServidor | null }>
    onAuthStateChange(cb: (evento: string, sesion: SesionServidor | null) => void): { unsubscribe(): void }
  }
  /** Lo que se lee y escribe en las tablas que ya existen (con las reglas de acceso de la base). */
  datos: {
    leerPerfil(uid: string): Promise<{ perfil: PerfilServidor | null; error: ErrorServidor | null }>
    tieneDatosPersonales(uid: string): Promise<{ existe: boolean; error: ErrorServidor | null }>
    guardarDatosPersonales(fila: { id: string; apellido: string; celular: string }): Promise<{ error: ErrorServidor | null }>
    /**
     * Borra la cuenta de quien tiene la sesión y lo personal (`public.borrar_mi_cuenta`). La base se NIEGA si hay un paseo
     * en marcha, un reporte abierto o un pago pendiente: entonces no borra nada y `motivo` dice por qué (no es un error).
     * `motivo` es null si la cuenta se borró; `error` es de verdad un error (sin sesión, sin conexión…).
     */
    borrarMiCuenta(): Promise<{ motivo: string | null; error: ErrorServidor | null }>
  }
}
