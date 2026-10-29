/**
 * /admin con inicio de sesión del equipo (paso 5): todo con un cliente SIMULADO. No hay red ni claves reales.
 */
import { describe, expect, it } from 'vitest'
import { TEXTO_ACCESO } from './acceso'
import { entrarAlPanel, ROL_EQUIPO, tieneRolEquipo, vistaDelPanel } from './admin'
import { conservarSiNoSePudoLeer, esErrorDeSesionVencida, resolverSesion, type EstadoSesion } from './sesion'
import type { ClienteAcceso, ErrorServidor, PerfilServidor, SesionServidor, UsuarioServidor } from './tipos'

const usuario = (id: string): UsuarioServidor => ({ id, email: `${id}@ejemplo.pe`, user_metadata: {} })
const sesionDe = (id: string): SesionServidor => ({ user: usuario(id) })

interface Opciones {
  perfiles?: Record<string, PerfilServidor>
  /** Lo que responde la base al leer el perfil. */
  errorPerfil?: ErrorServidor
  lanzaAlLeer?: boolean
  lanzaAlSalir?: boolean
  falloRed?: boolean
}

/** Un servidor de mentira: anota todo lo que se le pide. */
function servidorFalso(o: Opciones = {}) {
  const llamadas: string[] = []
  const usuarios = [{ id: 'eq1', correo: 'equipo@ejemplo.pe', clave: 'clave-del-equipo' }]
  const cliente: ClienteAcceso = {
    auth: {
      async signUp() {
        llamadas.push('signUp')
        return { data: { user: null, session: null }, error: null }
      },
      async signInWithPassword(args) {
        llamadas.push('signIn')
        if (o.falloRed) throw new Error('Failed to fetch')
        const u = usuarios.find((x) => x.correo === args.email && x.clave === args.password)
        if (!u) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400, code: 'invalid_credentials' } }
        return { data: { user: usuario(u.id), session: sesionDe(u.id) }, error: null }
      },
      async signOut() {
        llamadas.push('signOut')
        if (o.lanzaAlSalir) throw new Error('Failed to fetch')
        return { error: null }
      },
      async resetPasswordForEmail() {
        llamadas.push('reset')
        return { error: null }
      },
      async updateUser() {
        llamadas.push('updateUser')
        return { error: null }
      },
      async getSession() {
        return { data: { session: null }, error: null }
      },
      onAuthStateChange: () => ({ unsubscribe: () => undefined }),
    },
    datos: {
      async leerPerfil(uid) {
        llamadas.push(`leerPerfil:${uid}`)
        if (o.lanzaAlLeer) throw new Error('Failed to fetch')
        if (o.errorPerfil) return { perfil: null, error: o.errorPerfil }
        return { perfil: o.perfiles?.[uid] ?? null, error: null }
      },
      async tieneDatosPersonales() {
        llamadas.push('tieneDatosPersonales')
        return { existe: false, error: null }
      },
      async guardarDatosPersonales() {
        llamadas.push('guardarDatosPersonales')
        return { error: null }
      },
      async borrarMiCuenta() {
        llamadas.push('borrarMiCuenta')
        return { motivo: null, error: null }
      },
    },
  }
  return { cliente, llamadas }
}

const conRol = (rol: string): EstadoSesion => ({ estado: 'con_sesion', usuario: usuario('u1'), perfil: { rol, nombre_pila: 'Ana' } })

describe('quién ve qué en /admin: la vista sale del rol que dice la base', () => {
  it('modo local: el panel sigue como hoy (aunque algo falle)', () => {
    expect(vistaDelPanel({ estado: 'local' })).toBe('local')
    expect(vistaDelPanel({ estado: 'local' }, true)).toBe('local')
  })
  it('sin sesión: solo la entrada; mientras carga: espera', () => {
    expect(vistaDelPanel({ estado: 'sin_sesion' })).toBe('entrada')
    expect(vistaDelPanel({ estado: 'cargando' })).toBe('cargando')
  })
  it('con rol familia o paseador: «sin acceso»', () => {
    expect(vistaDelPanel(conRol('familia'))).toBe('sin_acceso')
    expect(vistaDelPanel(conRol('paseador'))).toBe('sin_acceso')
  })
  it('con rol «equipo»: el panel', () => {
    expect(ROL_EQUIPO).toBe('equipo')
    expect(vistaDelPanel(conRol('equipo'))).toBe('panel')
  })
  it('solo vale exactamente «equipo»: mayúsculas, espacios, «admin» o sin perfil no entran', () => {
    for (const rol of ['Equipo', 'EQUIPO', ' equipo', 'equipo ', 'admin', 'equipo\n', '']) {
      expect(vistaDelPanel(conRol(rol)), JSON.stringify(rol)).toBe('sin_acceso')
      expect(tieneRolEquipo({ rol, nombre_pila: '' })).toBe(false)
    }
    expect(vistaDelPanel({ estado: 'con_sesion', usuario: usuario('u1'), perfil: null })).toBe('sin_acceso')
    expect(tieneRolEquipo(null)).toBe(false)
    expect(tieneRolEquipo(undefined)).toBe(false)
  })
  it('si la base no respondió no se sabe el rol: nada de panel (ni siquiera con un perfil de equipo en memoria)', () => {
    const noLeido: EstadoSesion = { estado: 'con_sesion', usuario: usuario('u1'), perfil: { rol: 'equipo', nombre_pila: '' }, perfilNoLeido: true }
    expect(vistaDelPanel(noLeido)).toBe('no_se_pudo')
    expect(vistaDelPanel({ estado: 'con_sesion', usuario: usuario('u1'), perfil: null, perfilNoLeido: true })).toBe('no_se_pudo')
    expect(vistaDelPanel({ estado: 'sin_sesion' }, true)).toBe('no_se_pudo')
    expect(vistaDelPanel(conRol('equipo'), true)).toBe('no_se_pudo')
  })
})

describe('el rol se lee de la base con la sesión (no del navegador)', () => {
  it('sin sesión no se pregunta nada a la base', async () => {
    const s = servidorFalso()
    expect(await resolverSesion(s.cliente, null)).toEqual({ estado: 'sin_sesion' })
    expect(s.llamadas).toEqual([])
  })
  it('lee SOLO el perfil de quien tiene la sesión y entrega el rol que dice la base', async () => {
    const s = servidorFalso({ perfiles: { eq1: { rol: 'equipo', nombre_pila: 'Eq' }, fa1: { rol: 'familia', nombre_pila: 'Fa' }, pa1: { rol: 'paseador', nombre_pila: 'Pa' } } })
    const eq = await resolverSesion(s.cliente, sesionDe('eq1'))
    const fa = await resolverSesion(s.cliente, sesionDe('fa1'))
    const pa = await resolverSesion(s.cliente, sesionDe('pa1'))
    expect(s.llamadas).toEqual(['leerPerfil:eq1', 'leerPerfil:fa1', 'leerPerfil:pa1'])
    expect([vistaDelPanel(eq), vistaDelPanel(fa), vistaDelPanel(pa)]).toEqual(['panel', 'sin_acceso', 'sin_acceso'])
  })
  it('un usuario que dice ser «equipo» en sus propios datos NO entra: solo cuenta la fila de perfiles', async () => {
    const s = servidorFalso({ perfiles: { fa1: { rol: 'familia', nombre_pila: 'Fa' } } })
    const sesion: SesionServidor = { user: { id: 'fa1', user_metadata: { rol: 'equipo', role: 'equipo', app_role: 'equipo' } } }
    expect(vistaDelPanel(await resolverSesion(s.cliente, sesion))).toBe('sin_acceso')
  })
  it('una cuenta sin fila en perfiles queda «sin acceso»', async () => {
    const s = servidorFalso()
    expect(vistaDelPanel(await resolverSesion(s.cliente, sesionDe('fantasma')))).toBe('sin_acceso')
  })
  it('sesión vencida (401): se cierra y se vuelve a la entrada, sin lanzar', async () => {
    const s = servidorFalso({ errorPerfil: { message: 'JWT expired', status: 401, code: 'PGRST301' } })
    const r = await resolverSesion(s.cliente, sesionDe('eq1'))
    expect(r).toEqual({ estado: 'sin_sesion' })
    expect(vistaDelPanel(r)).toBe('entrada')
    expect(s.llamadas).toContain('signOut')
  })
  it('sesión vencida y sin internet para cerrarla: igual vuelve a la entrada y no lanza', async () => {
    const s = servidorFalso({ errorPerfil: { message: 'JWT expired', status: 401 }, lanzaAlSalir: true })
    await expect(resolverSesion(s.cliente, sesionDe('eq1'))).resolves.toEqual({ estado: 'sin_sesion' })
  })
  it('sin conexión o error de la base: «no se pudo», sin cerrar la sesión y sin lanzar', async () => {
    for (const o of [{ lanzaAlLeer: true }, { errorPerfil: { message: 'Failed to fetch', status: 0 } }, { errorPerfil: { message: 'boom', status: 500 } }]) {
      const s = servidorFalso(o)
      const r = await resolverSesion(s.cliente, sesionDe('eq1'))
      expect(r).toMatchObject({ estado: 'con_sesion', perfil: null, perfilNoLeido: true })
      expect(vistaDelPanel(r)).toBe('no_se_pudo')
      expect(s.llamadas).not.toContain('signOut')
    }
  })
  it('reconoce los errores de sesión vencida', () => {
    expect(esErrorDeSesionVencida({ message: 'x', status: 401 })).toBe(true)
    expect(esErrorDeSesionVencida({ message: 'JWT expired' })).toBe(true)
    expect(esErrorDeSesionVencida({ message: 'x', code: 'PGRST301' })).toBe(true)
    expect(esErrorDeSesionVencida({ message: 'Failed to fetch', status: 0 })).toBe(false)
    expect(esErrorDeSesionVencida({ message: 'permission denied', status: 403 })).toBe(false)
    expect(esErrorDeSesionVencida(null)).toBe(false)
  })
  it('un corte de internet al volver a la pestaña no cierra el panel; cualquier otra respuesta sí cambia el estado', () => {
    const dentro = conRol('equipo')
    const noLeido: EstadoSesion = { estado: 'con_sesion', usuario: usuario('u1'), perfil: null, perfilNoLeido: true }
    expect(conservarSiNoSePudoLeer(dentro, noLeido)).toBe(dentro)
    // si se le quitó el acceso, sí se cierra
    expect(vistaDelPanel(conservarSiNoSePudoLeer(dentro, conRol('familia')))).toBe('sin_acceso')
    expect(conservarSiNoSePudoLeer(dentro, { estado: 'sin_sesion' })).toEqual({ estado: 'sin_sesion' })
    // otra persona: no se hereda nada
    const otra: EstadoSesion = { estado: 'con_sesion', usuario: usuario('u2'), perfil: null, perfilNoLeido: true }
    expect(conservarSiNoSePudoLeer(dentro, otra)).toBe(otra)
    // la primera vez no hay nada que conservar
    expect(conservarSiNoSePudoLeer({ estado: 'cargando' }, noLeido)).toBe(noLeido)
  })
})

describe('la entrada de /admin', () => {
  it('entra con correo y contraseña y no escribe nada más en la base', async () => {
    const s = servidorFalso()
    const r = await entrarAlPanel(s.cliente, ' Equipo@Ejemplo.pe ', 'clave-del-equipo')
    expect(r).toEqual({ ok: true })
    expect(s.llamadas).toEqual(['signIn'])
  })
  it('correo inexistente y contraseña equivocada dicen lo mismo', async () => {
    const s = servidorFalso()
    const a = await entrarAlPanel(s.cliente, 'nadie@ejemplo.pe', 'clave-del-equipo')
    const b = await entrarAlPanel(s.cliente, 'equipo@ejemplo.pe', 'otra-clave')
    expect(a).toEqual({ ok: false, mensaje: TEXTO_ACCESO.credenciales })
    expect(b).toEqual(a)
  })
  it('sin correo o sin contraseña ni siquiera se llama al servidor', async () => {
    const s = servidorFalso()
    expect(await entrarAlPanel(s.cliente, '', 'x')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.credenciales })
    expect(await entrarAlPanel(s.cliente, 'a@b.pe', '')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.credenciales })
    expect(s.llamadas).toEqual([])
  })
  it('sin conexión: lo dice en español y no lanza', async () => {
    const s = servidorFalso({ falloRed: true })
    expect(await entrarAlPanel(s.cliente, 'equipo@ejemplo.pe', 'clave-del-equipo')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.sinConexion })
  })
  it('nunca registra a nadie ni manda correos', async () => {
    const s = servidorFalso()
    await entrarAlPanel(s.cliente, 'nadie@ejemplo.pe', 'x')
    await entrarAlPanel(s.cliente, 'equipo@ejemplo.pe', 'clave-del-equipo')
    expect(s.llamadas).not.toContain('signUp')
    expect(s.llamadas).not.toContain('reset')
    expect(s.llamadas).not.toContain('guardarDatosPersonales')
  })
})
