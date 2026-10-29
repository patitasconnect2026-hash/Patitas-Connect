/**
 * La app principal lee la sesión (paso 4, corregido): a dónde va cada persona. Todo con un cliente SIMULADO: no hay
 * red, no hay claves y no se crea ninguna cuenta.
 */
import { describe, expect, it } from 'vitest'
import { debeMostrarOnboarding, datosDeCuenta, destinoDeRol, llegoPorEnlaceDeCorreo, vistaDeLaApp } from './destino'
import { entrar, registrar, ROLES_DE_REGISTRO, validarRegistro } from './acceso'
import { resolverSesion, type EstadoSesion } from './sesion'
import type { ClienteAcceso, PerfilServidor, UsuarioServidor } from './tipos'

const usuario = (id = 'u1', meta: Record<string, unknown> = {}): UsuarioServidor => ({ id, email: `${id}@ejemplo.pe`, user_metadata: meta })
const conRol = (rol: string, extra: Partial<Extract<EstadoSesion, { estado: 'con_sesion' }>> = {}): EstadoSesion => ({
  estado: 'con_sesion',
  usuario: usuario(),
  perfil: { rol, nombre_pila: 'Valeria' },
  ...extra,
})

describe('qué se ve en la app de la familia (`/`)', () => {
  const ver = (sesion: EstadoSesion, fallo = false) => vistaDeLaApp({ sesion, fallo, seccion: 'familia' })

  it('modo local: «local», idéntico a hoy', () => {
    expect(ver({ estado: 'local' })).toEqual({ vista: 'local' })
    expect(ver({ estado: 'local' }, true)).toEqual({ vista: 'local' })
  })
  it('mientras se lee la sesión: espera, NUNCA la portada', () => {
    expect(ver({ estado: 'cargando' })).toEqual({ vista: 'cargando' })
  })
  it('sin sesión: la entrada', () => {
    expect(ver({ estado: 'sin_sesion' })).toEqual({ vista: 'entrada' })
  })
  it('con sesión de familia: continúa en la app de la familia (no la portada)', () => {
    expect(ver(conRol('familia'))).toEqual({ vista: 'continuar' })
  })
  it('con sesión de paseador: la lleva a su app', () => {
    expect(ver(conRol('paseador'))).toEqual({ vista: 'ir', destino: '/paseador' })
  })
  it('con sesión del equipo: la lleva a /admin', () => {
    expect(ver(conRol('equipo'))).toEqual({ vista: 'ir', destino: '/admin' })
  })
  it('con sesión pero sin poder leer el perfil: «no se pudo», jamás la portada', () => {
    expect(ver(conRol('familia', { perfilNoLeido: true, perfil: null }))).toEqual({ vista: 'no_se_pudo' })
    expect(ver({ estado: 'con_sesion', usuario: usuario(), perfil: null })).toEqual({ vista: 'no_se_pudo' })
    expect(ver(conRol('familia'), true)).toEqual({ vista: 'no_se_pudo' })
    expect(ver(conRol('rol-raro'))).toEqual({ vista: 'no_se_pudo' })
  })
})

describe('qué se ve en la app del paseador (`/paseador`)', () => {
  const ver = (sesion: EstadoSesion) => vistaDeLaApp({ sesion, seccion: 'paseador' })
  it('paseador: sigue con su postulación o su app', () => {
    expect(ver(conRol('paseador'))).toEqual({ vista: 'continuar' })
  })
  it('familia: se le dice claro que la cuenta es de familia (no se la manda de vuelta sin explicar)', () => {
    expect(ver(conRol('familia'))).toEqual({ vista: 'cuenta_de_familia', destino: '/' })
  })
  it('sin sesión: la entrada; local: como hoy', () => {
    expect(ver({ estado: 'sin_sesion' })).toEqual({ vista: 'entrada' })
    expect(ver({ estado: 'local' })).toEqual({ vista: 'local' })
  })
})

describe('la portada (alta) de la familia', () => {
  const m = debeMostrarOnboarding
  it('modo local: la regla de siempre (sin cuenta, portada; con cuenta, no)', () => {
    expect(m({ vista: 'local', hayCuenta: false, cuentaEsDeEjemplo: false })).toBe(true)
    expect(m({ vista: 'local', hayCuenta: true, cuentaEsDeEjemplo: false })).toBe(false)
    expect(m({ vista: 'local', hayCuenta: true, cuentaEsDeEjemplo: true })).toBe(false)
  })
  it('con sesión de familia y con la cuenta (casa y perro) hecha: entra a la app, sin portada', () => {
    expect(m({ vista: 'continuar', hayCuenta: true, cuentaEsDeEjemplo: false })).toBe(false)
  })
  it('con sesión de familia y sin cuenta (o con la de demostración): va directo a los pasos que faltan', () => {
    expect(m({ vista: 'continuar', hayCuenta: false, cuentaEsDeEjemplo: false })).toBe(true)
    expect(m({ vista: 'continuar', hayCuenta: true, cuentaEsDeEjemplo: true })).toBe(true)
  })
  it('sin sesión: la entrada; solo la demostración deja ver la app', () => {
    expect(m({ vista: 'entrada', hayCuenta: false, cuentaEsDeEjemplo: false })).toBe(true)
    expect(m({ vista: 'entrada', hayCuenta: true, cuentaEsDeEjemplo: false })).toBe(true)
    expect(m({ vista: 'entrada', hayCuenta: true, cuentaEsDeEjemplo: true })).toBe(false)
  })
  it('esperando, llevándola a otra app o sin poder comprobar: nunca la portada', () => {
    for (const vista of ['cargando', 'ir', 'no_se_pudo', 'cuenta_de_familia'] as const) {
      expect(m({ vista, hayCuenta: false, cuentaEsDeEjemplo: false }), vista).toBe(false)
    }
  })
})

describe('de la sesión simulada a la pantalla', () => {
  /** Un servidor de mentira con tres cuentas ya hechas. */
  function servidorFalso() {
    const perfiles: Record<string, PerfilServidor> = {
      f1: { rol: 'familia', nombre_pila: 'Valeria' },
      p1: { rol: 'paseador', nombre_pila: 'Carlos' },
      e1: { rol: 'equipo', nombre_pila: 'Equipo' },
    }
    const cuentas = [
      { id: 'f1', correo: 'valeria@ejemplo.pe', clave: 'una-clave-larga' },
      { id: 'p1', correo: 'carlos@ejemplo.pe', clave: 'una-clave-larga' },
      { id: 'e1', correo: 'equipo@ejemplo.pe', clave: 'una-clave-larga' },
    ]
    const llamadas: string[] = []
    const cliente: ClienteAcceso = {
      auth: {
        async signUp(args) {
          llamadas.push(`signUp:${String(args.options?.data?.rol)}`)
          return { data: { user: null, session: null }, error: null }
        },
        async signInWithPassword(args) {
          const c = cuentas.find((x) => x.correo === args.email && x.clave === args.password)
          if (!c) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400 } }
          return { data: { user: usuario(c.id), session: { user: usuario(c.id) } }, error: null }
        },
        async signOut() {
          return { error: null }
        },
        async resetPasswordForEmail() {
          return { error: null }
        },
        async updateUser() {
          return { error: null }
        },
        async getSession() {
          return { data: { session: null }, error: null }
        },
        onAuthStateChange: () => ({ unsubscribe: () => undefined }),
      },
      datos: {
        async leerPerfil(uid) {
          return { perfil: perfiles[uid] ?? null, error: null }
        },
        async tieneDatosPersonales() {
          return { existe: true, error: null }
        },
        async guardarDatosPersonales() {
          return { error: null }
        },
        async borrarMiCuenta() {
          return { motivo: null, error: null }
        },
      },
    }
    return { cliente, llamadas }
  }

  it('sin sesión: se ve la entrada y no se lee nada', async () => {
    const s = servidorFalso()
    const estado = await resolverSesion(s.cliente, null)
    expect(vistaDeLaApp({ sesion: estado, seccion: 'familia' })).toEqual({ vista: 'entrada' })
  })
  it('entra una familia: la app de la familia; entra un paseador: la del paseador', async () => {
    const s = servidorFalso()
    for (const [correo, enFamilia, enPaseador] of [
      ['valeria@ejemplo.pe', { vista: 'continuar' }, { vista: 'cuenta_de_familia', destino: '/' }],
      ['carlos@ejemplo.pe', { vista: 'ir', destino: '/paseador' }, { vista: 'continuar' }],
    ] as const) {
      const r = await entrar(s.cliente, correo, 'una-clave-larga')
      expect(r.ok, correo).toBe(true)
      const user = correo.startsWith('valeria') ? usuario('f1') : usuario('p1')
      const estado = await resolverSesion(s.cliente, { user })
      expect(vistaDeLaApp({ sesion: estado, seccion: 'familia' }), correo).toEqual(enFamilia)
      expect(vistaDeLaApp({ sesion: estado, seccion: 'paseador' }), correo).toEqual(enPaseador)
    }
  })
  it('equipo: no se ofrece al registrarse; si entra por la portada, va a /admin', async () => {
    expect([...ROLES_DE_REGISTRO]).toEqual(['familia', 'paseador'])
    for (const rol of ['equipo', 'admin', 'Equipo']) {
      expect(validarRegistro({ rol, nombre: 'Ana', apellido: 'Paz', celular: '987654321', correo: 'a@b.pe', contrasena: '12345678' }).ok, rol).toBe(false)
    }
    const s = servidorFalso()
    const r = await registrar(s.cliente, { rol: 'equipo' as never, correo: 'x@y.pe', contrasena: '12345678', nombre: 'X', apellido: 'Y', celular: '+51987654321' })
    expect(r.ok).toBe(false)
    expect(s.llamadas).toEqual([])
    const estado = await resolverSesion(s.cliente, { user: usuario('e1') })
    expect(vistaDeLaApp({ sesion: estado, seccion: 'familia' })).toEqual({ vista: 'ir', destino: '/admin' })
  })
  it('a dónde va cada rol', () => {
    expect(destinoDeRol('familia')).toBe('/')
    expect(destinoDeRol('paseador')).toBe('/paseador')
    expect(destinoDeRol('equipo')).toBe('/admin')
    expect(destinoDeRol(null)).toBe('/')
  })
})

describe('lo que ya escribió al registrarse no se vuelve a pedir', () => {
  it('toma nombre, apellido, celular y correo de la cuenta', () => {
    const d = datosDeCuenta(usuario('v', { apellido: 'Quispe', celular: '+51987654321' }), { rol: 'familia', nombre_pila: 'Valeria' })
    expect(d).toEqual({ nombre: 'Valeria', apellido: 'Quispe', celular: '987 654 321', correo: 'v@ejemplo.pe' })
  })
  it('sin celular o sin apellido: vacíos, sin inventar nada', () => {
    const d = datosDeCuenta({ id: 'x' }, null)
    expect(d).toEqual({ nombre: '', apellido: '', celular: '', correo: '' })
  })
  it('si el nombre del perfil falta, usa el que viajó al registrarse', () => {
    expect(datosDeCuenta(usuario('v', { nombre_pila: 'Ana' }), null).nombre).toBe('Ana')
  })
})

describe('el enlace del correo', () => {
  it('lo reconoce en la dirección (con sesión, vencido o con error)', () => {
    expect(llegoPorEnlaceDeCorreo('', '#access_token=abc&refresh_token=def&type=signup')).toBe(true)
    expect(llegoPorEnlaceDeCorreo('?code=123', '')).toBe(true)
    expect(llegoPorEnlaceDeCorreo('', '#error=access_denied&error_code=otp_expired&error_description=vencido')).toBe(true)
    expect(llegoPorEnlaceDeCorreo('?token_hash=x&type=signup', '')).toBe(true)
  })
  it('no confunde el código del afiche ni una visita normal', () => {
    expect(llegoPorEnlaceDeCorreo('', '')).toBe(false)
    expect(llegoPorEnlaceDeCorreo('?ref=EDIFICIO', '')).toBe(false)
    expect(llegoPorEnlaceDeCorreo('?e=torre&c=LUIS10', '#seccion')).toBe(false)
  })
})
