/**
 * Inicio de sesión (paso 4): todo con un cliente SIMULADO. No hay red, no hay claves reales y nada se conecta a Supabase.
 */
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { accesoActivo, esClaveSecreta, leerConfigServidor } from './config'
import { cambiarContrasena, completarDatosPersonales, destinoDe, entrar, esRolDeRegistro, MIN_CONTRASENA, recuperar, registrar, ROLES_DE_REGISTRO, TEXTO_ACCESO, validarRegistro, type DatosRegistro } from './acceso'
import { borrarCuenta, mensajeDeBorrado, TEXTO_BORRAR } from './cuenta'
import { crearClienteAcceso } from './cliente'
import type { ClienteAcceso, ErrorServidor, UsuarioServidor } from './tipos'
import { adaptadorMemoria, elegirAdaptador } from '../datos'

const RAIZ = path.resolve(__dirname, '..', '..')

/** Un servidor de mentira: guarda usuarios en memoria y anota todo lo que se le pide. */
function servidorFalso(opciones: { confirmarCorreo?: boolean; falloGuardar?: boolean; falloRed?: boolean; limite?: boolean; borrado?: ErrorServidor | { motivo: string } | 'red' } = {}) {
  const usuarios = new Map<string, { id: string; email: string; password: string; confirmado: boolean; user_metadata: Record<string, unknown> }>()
  const perfiles = new Map<string, { rol: string; nombre_pila: string }>()
  const datosPersonales = new Map<string, { id: string; apellido: string; celular: string }>()
  const llamadas: Array<{ metodo: string; args: unknown }> = []
  let n = 0
  const sesion = (u: { id: string; email: string; user_metadata: Record<string, unknown> }) => ({ user: { id: u.id, email: u.email, user_metadata: u.user_metadata } as UsuarioServidor })
  const err = (message: string, status = 400, code?: string): ErrorServidor => ({ message, status, code })

  const cliente: ClienteAcceso = {
    auth: {
      async signUp(args) {
        llamadas.push({ metodo: 'signUp', args })
        if (opciones.falloRed) throw new Error('Failed to fetch')
        if (opciones.limite) return { data: { user: null, session: null }, error: err('email rate limit exceeded', 429, 'over_email_send_rate_limit') }
        if ([...usuarios.values()].some((u) => u.email === args.email)) return { data: { user: null, session: null }, error: err('User already registered', 422, 'user_already_exists') }
        const meta = args.options?.data ?? {}
        const u = { id: `u${++n}`, email: args.email, password: args.password, confirmado: !opciones.confirmarCorreo, user_metadata: meta }
        usuarios.set(u.id, u)
        // El disparador de la base: SOLO «familia» o «paseador».
        perfiles.set(u.id, { rol: meta.rol === 'paseador' ? 'paseador' : 'familia', nombre_pila: String(meta.nombre_pila ?? '') })
        return { data: { user: sesion(u).user, session: u.confirmado ? sesion(u) : null }, error: null }
      },
      async signInWithPassword(args) {
        llamadas.push({ metodo: 'signIn', args })
        if (opciones.falloRed) throw new Error('Failed to fetch')
        const u = [...usuarios.values()].find((x) => x.email === args.email && x.password === args.password)
        if (!u) return { data: { user: null, session: null }, error: err('Invalid login credentials', 400, 'invalid_credentials') }
        if (!u.confirmado) return { data: { user: null, session: null }, error: err('Email not confirmed', 400, 'email_not_confirmed') }
        return { data: { user: sesion(u).user, session: sesion(u) }, error: null }
      },
      async signOut(opciones) {
        llamadas.push({ metodo: 'signOut', args: opciones ?? null })
        return { error: null }
      },
      async resetPasswordForEmail(email, options) {
        llamadas.push({ metodo: 'reset', args: { email, options } })
        if (opciones.limite) return { error: err('rate limit', 429, 'over_email_send_rate_limit') }
        return { error: null }
      },
      async updateUser(args) {
        llamadas.push({ metodo: 'updateUser', args })
        return { error: null }
      },
      async getSession() {
        return { data: { session: null }, error: null }
      },
      onAuthStateChange: () => ({ unsubscribe: () => undefined }),
    },
    datos: {
      async leerPerfil(uid) {
        return { perfil: perfiles.get(uid) ?? null, error: null }
      },
      async tieneDatosPersonales(uid) {
        return { existe: datosPersonales.has(uid), error: null }
      },
      async guardarDatosPersonales(fila) {
        llamadas.push({ metodo: 'datos_personales.insert', args: fila })
        if (opciones.falloGuardar) return { error: err('new row violates row-level security policy', 403, '42501') }
        datosPersonales.set(fila.id, fila)
        return { error: null }
      },
      async borrarMiCuenta() {
        llamadas.push({ metodo: 'borrarMiCuenta', args: null })
        if (opciones.borrado === 'red') throw new Error('Failed to fetch')
        if (opciones.borrado && 'motivo' in opciones.borrado) return { motivo: opciones.borrado.motivo, error: null }
        if (opciones.borrado) return { motivo: null, error: opciones.borrado }
        return { motivo: null, error: null }
      },
    },
  }
  return { cliente, llamadas, usuarios, perfiles, datosPersonales }
}

const datos = (extra: Partial<DatosRegistro> = {}): DatosRegistro => ({
  rol: 'familia',
  correo: 'valeria@ejemplo.pe',
  contrasena: 'una-clave-larga',
  nombre: 'Valeria',
  apellido: 'Quispe',
  celular: '+51987654321',
  ...extra,
})

describe('sin variables la app sigue en modo local', () => {
  it('sin nada, o con otro valor, es local y no pide nada', () => {
    expect(leerConfigServidor({})).toEqual({ activo: false, motivo: 'modo_local' })
    expect(leerConfigServidor({ NEXT_PUBLIC_DATOS: 'local', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' }).activo).toBe(false)
    expect(leerConfigServidor({ NEXT_PUBLIC_DATOS: 'prueba' }).activo).toBe(false)
  })
  it('«servidor» sin la dirección o sin la clave: local', () => {
    expect(leerConfigServidor({ NEXT_PUBLIC_DATOS: 'servidor' })).toEqual({ activo: false, motivo: 'faltan_variables' })
    expect(leerConfigServidor({ NEXT_PUBLIC_DATOS: 'servidor', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }).activo).toBe(false)
    expect(leerConfigServidor({ NEXT_PUBLIC_DATOS: 'servidor', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' }).activo).toBe(false)
  })
  it('con todo y la clave pública («anon» o «publishable»): activo', () => {
    const c = leerConfigServidor({ NEXT_PUBLIC_DATOS: ' Servidor ', NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave-publica' })
    expect(c).toEqual({ activo: true, url: 'https://abc.supabase.co', clave: 'clave-publica' })
    expect(leerConfigServidor({ NEXT_PUBLIC_DATOS: 'servidor', NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' }).activo).toBe(true)
  })
  it('una clave secreta («service_role» o «secret») se rechaza: nunca llega al navegador', () => {
    const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.firma`
    expect(esClaveSecreta(jwt('service_role'))).toBe(true)
    expect(esClaveSecreta(jwt('anon'))).toBe(false)
    expect(esClaveSecreta('sb_secret_abc')).toBe(true)
    const c = leerConfigServidor({ NEXT_PUBLIC_DATOS: 'servidor', NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('service_role') })
    expect(c).toEqual({ activo: false, motivo: 'clave_secreta' })
  })
  it('una dirección que no es https (salvo localhost) se rechaza', () => {
    const base = { NEXT_PUBLIC_DATOS: 'servidor', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' }
    expect(leerConfigServidor({ ...base, NEXT_PUBLIC_SUPABASE_URL: 'http://abc.supabase.co' }).activo).toBe(false)
    expect(leerConfigServidor({ ...base, NEXT_PUBLIC_SUPABASE_URL: 'no es una url' }).activo).toBe(false)
    expect(leerConfigServidor({ ...base, NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321' }).activo).toBe(true)
  })
  it('en esta app (sin .env) el inicio de sesión está apagado y no se crea ningún cliente', async () => {
    expect(accesoActivo()).toBe(false)
    const fabrica = vi.fn()
    expect(await crearClienteAcceso({ activo: false, motivo: 'modo_local' }, fabrica as never)).toBeNull()
    expect(fabrica).not.toHaveBeenCalled()
  })
  it('los datos siguen locales y sin avisos en la consola', () => {
    const registrar = vi.fn()
    const e = elegirAdaptador({ valor: undefined, local: adaptadorMemoria(), esDemo: () => false, enNavegador: true, registrar })
    expect(e.modo).toBe('local')
    expect(e.avisos).toEqual([])
    expect(registrar).not.toHaveBeenCalled()
  })
  it('con «servidor» los datos todavía son locales y lo dice con el aviso del paso 6', () => {
    const e = elegirAdaptador({ valor: 'servidor', local: adaptadorMemoria(), esDemo: () => false, enNavegador: true, servidor: () => null, avisoServidorSinDatos: 'aviso' })
    expect(e.modo).toBe('local')
    expect(e.avisos).toEqual(['aviso'])
  })
})

describe('registro: solo «familia» o «paseador», nunca «equipo»', () => {
  it('los únicos roles que se pueden pedir', () => {
    expect([...ROLES_DE_REGISTRO]).toEqual(['familia', 'paseador'])
    expect(esRolDeRegistro('equipo')).toBe(false)
    expect(esRolDeRegistro('Equipo')).toBe(false)
    expect(esRolDeRegistro(undefined)).toBe(false)
  })
  it('validar rechaza «equipo» y cualquier otro rol', () => {
    for (const rol of ['equipo', 'admin', '', undefined]) {
      const r = validarRegistro({ rol, nombre: 'Ana', apellido: 'Paz', celular: '987654321', correo: 'a@b.pe', contrasena: '12345678' })
      expect(r.ok, String(rol)).toBe(false)
    }
  })
  it('si alguien fuerza «equipo» al llamar registrar, no se envía nada', async () => {
    const s = servidorFalso()
    const r = await registrar(s.cliente, datos({ rol: 'equipo' as unknown as DatosRegistro['rol'] }))
    expect(r.ok).toBe(false)
    expect(s.llamadas).toHaveLength(0)
  })
  it('con otros datos que pidan «equipo» en la base, la cuenta queda como familia (el disparador)', async () => {
    const s = servidorFalso()
    // Aunque el rol de la petición viniera cambiado, el disparador de la base lo reduce: se comprueba el modelo.
    await s.cliente.auth.signUp({ email: 'x@y.pe', password: '12345678', options: { data: { rol: 'equipo', nombre_pila: 'X' } } })
    expect([...s.perfiles.values()][0].rol).toBe('familia')
  })
  it('valida nombre, apellido, celular, correo y contraseña con mensajes sencillos', () => {
    const base = { rol: 'paseador', nombre: 'Ana', apellido: 'Paz', celular: '987 654 321', correo: 'Ana@Correo.pe', contrasena: '12345678' }
    expect(validarRegistro({ ...base, nombre: ' ' })).toMatchObject({ ok: false, campo: 'nombre', mensaje: TEXTO_ACCESO.nombre })
    expect(validarRegistro({ ...base, apellido: '' })).toMatchObject({ ok: false, campo: 'apellido' })
    expect(validarRegistro({ ...base, celular: '12345' })).toMatchObject({ ok: false, campo: 'celular', mensaje: TEXTO_ACCESO.celular })
    expect(validarRegistro({ ...base, correo: 'sin-arroba' })).toMatchObject({ ok: false, campo: 'correo' })
    expect(validarRegistro({ ...base, contrasena: '1234567' })).toMatchObject({ ok: false, campo: 'contrasena', mensaje: TEXTO_ACCESO.contrasena })
    expect(MIN_CONTRASENA).toBe(8)
  })
  it('normaliza el correo (minúsculas) y el celular (+51)', () => {
    const r = validarRegistro({ rol: 'paseador', nombre: ' Ana ', apellido: 'Paz', celular: '987 654 321', correo: ' Ana@Correo.PE ', contrasena: '12345678' })
    expect(r.ok && r.datos).toMatchObject({ correo: 'ana@correo.pe', celular: '+51987654321', nombre: 'Ana' })
  })
})

describe('registro y entrada con el cliente simulado', () => {
  it('registrar manda rol y nombre_pila como espera el disparador y guarda los datos personales sin DNI', async () => {
    const s = servidorFalso()
    const r = await registrar(s.cliente, datos({ rol: 'paseador' }), { volverA: 'https://app.pe/acceso' })
    expect(r).toEqual({ ok: true, paso: 'sesion', rol: 'paseador', datosPendientes: false })
    const signUp = s.llamadas.find((l) => l.metodo === 'signUp')!.args as { options: { data: Record<string, unknown>; emailRedirectTo: string } }
    expect(signUp.options.data).toEqual({ rol: 'paseador', nombre_pila: 'Valeria', apellido: 'Quispe', celular: '+51987654321' })
    expect(signUp.options.emailRedirectTo).toBe('https://app.pe/acceso')
    expect(JSON.stringify(s.llamadas)).not.toMatch(/dni/i)
    expect([...s.datosPersonales.values()]).toEqual([{ id: 'u1', apellido: 'Quispe', celular: '+51987654321' }])
    expect([...s.perfiles.values()][0]).toEqual({ rol: 'paseador', nombre_pila: 'Valeria' })
  })

  it('con confirmación de correo: pide revisar el correo y todavía no escribe datos personales', async () => {
    const s = servidorFalso({ confirmarCorreo: true })
    const r = await registrar(s.cliente, datos())
    expect(r).toEqual({ ok: true, paso: 'confirmar_correo' })
    expect(s.datosPersonales.size).toBe(0)
    // al entrar después de confirmar, se completan (una sola vez)
    s.usuarios.get('u1')!.confirmado = true
    const e = await entrar(s.cliente, 'valeria@ejemplo.pe', 'una-clave-larga')
    expect(e).toEqual({ ok: true, paso: 'sesion', rol: 'familia', datosPendientes: false })
    expect(s.datosPersonales.get('u1')).toEqual({ id: 'u1', apellido: 'Quispe', celular: '+51987654321' })
    await entrar(s.cliente, 'valeria@ejemplo.pe', 'una-clave-larga')
    expect(s.llamadas.filter((l) => l.metodo === 'datos_personales.insert')).toHaveLength(1)
  })

  it('si no se pueden guardar los datos (reglas de la base), entra igual y lo avisa', async () => {
    const s = servidorFalso({ falloGuardar: true })
    const r = await registrar(s.cliente, datos())
    expect(r).toMatchObject({ ok: true, paso: 'sesion', datosPendientes: true })
  })

  it('entrar devuelve el rol de la base para decidir a dónde ir', async () => {
    const s = servidorFalso()
    await registrar(s.cliente, datos({ rol: 'paseador', correo: 'p@ejemplo.pe' }))
    const r = await entrar(s.cliente, 'P@Ejemplo.pe', 'una-clave-larga')
    expect(r).toMatchObject({ ok: true, rol: 'paseador' })
    expect(destinoDe('paseador')).toBe('/paseador')
    expect(destinoDe('familia')).toBe('/')
    expect(destinoDe(null)).toBe('/')
  })

  it('completarDatosPersonales no repite lo que ya existe', async () => {
    const s = servidorFalso()
    const u: UsuarioServidor = { id: 'z', user_metadata: { apellido: 'A', celular: '1' } }
    expect(await completarDatosPersonales(s.cliente, u)).toBe(true)
    expect(await completarDatosPersonales(s.cliente, u)).toBe(true)
    expect(s.llamadas.filter((l) => l.metodo === 'datos_personales.insert')).toHaveLength(1)
  })
})

describe('los errores no revelan si un correo existe', () => {
  it('entrar: correo inexistente y contraseña equivocada dicen lo mismo', async () => {
    const s = servidorFalso()
    await registrar(s.cliente, datos())
    const a = await entrar(s.cliente, 'nadie@ejemplo.pe', 'una-clave-larga')
    const b = await entrar(s.cliente, 'valeria@ejemplo.pe', 'otra-clave-larga')
    expect(a).toEqual({ ok: false, mensaje: TEXTO_ACCESO.credenciales })
    expect(b).toEqual(a)
  })
  it('registrar con un correo que ya tiene cuenta: mensaje neutro, sin decir «ya existe»', async () => {
    const s = servidorFalso()
    await registrar(s.cliente, datos())
    const r = await registrar(s.cliente, datos())
    expect(r).toEqual({ ok: false, mensaje: TEXTO_ACCESO.registroNeutro })
    expect(TEXTO_ACCESO.registroNeutro).not.toMatch(/ya existe|ya est[aá] registrad|ya fue/i)
  })
  it('recuperar dice lo mismo haya o no cuenta', async () => {
    const s = servidorFalso()
    await registrar(s.cliente, datos())
    const con = await recuperar(s.cliente, 'valeria@ejemplo.pe', 'https://app.pe/acceso/nueva-contrasena')
    const sin = await recuperar(s.cliente, 'nadie@ejemplo.pe', 'https://app.pe/acceso/nueva-contrasena')
    expect(con).toEqual({ ok: true, mensaje: TEXTO_ACCESO.recuperarListo })
    expect(sin).toEqual(con)
  })
  it('«muchos intentos» y «sin conexión» sí se dicen, en español', async () => {
    const limite = servidorFalso({ limite: true })
    expect(await recuperar(limite.cliente, 'a@b.pe', 'x')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.muchosIntentos })
    expect(await registrar(limite.cliente, datos())).toEqual({ ok: false, mensaje: TEXTO_ACCESO.muchosIntentos })
    const red = servidorFalso({ falloRed: true })
    expect(await entrar(red.cliente, 'a@b.pe', '12345678')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.sinConexion })
    expect(await registrar(red.cliente, datos())).toEqual({ ok: false, mensaje: TEXTO_ACCESO.sinConexion })
  })
  it('correo sin confirmar: lo dice (solo después de acertar la contraseña)', async () => {
    const s = servidorFalso({ confirmarCorreo: true })
    await registrar(s.cliente, datos())
    expect(await entrar(s.cliente, 'valeria@ejemplo.pe', 'una-clave-larga')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.sinConfirmar })
    expect(await entrar(s.cliente, 'valeria@ejemplo.pe', 'mal')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.credenciales })
  })
  it('ningún texto está en inglés ni dice «seguro», «verificado» o «garantizado»', () => {
    const todo = JSON.stringify(TEXTO_ACCESO)
    expect(todo).not.toMatch(/invalid|credentials|rate limit|password|\bseguro\b|verificad|garantiz/i)
  })
})

describe('contraseña nueva', () => {
  it('pide al menos 8 caracteres y la cambia', async () => {
    const s = servidorFalso()
    expect(await cambiarContrasena(s.cliente, '1234567')).toEqual({ ok: false, mensaje: TEXTO_ACCESO.contrasena })
    expect((await cambiarContrasena(s.cliente, '12345678')).ok).toBe(true)
    expect(s.llamadas.filter((l) => l.metodo === 'updateUser')).toHaveLength(1)
  })
})

describe('la demostración no usa sesión ni servidor y no se pide el DNI', () => {
  const leer = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8')
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

  it('la cuenta de demostración y el paseador de ejemplo siguen yendo a localStorage (el enrutado de datos no cambió)', () => {
    const index = leer('lib/datos/index.ts')
    expect(index).toMatch(/clave === CLAVES\.demo \|\| clave === CLAVES\.ejemplos/)
    expect(index).toMatch(/esCuentaDeEjemplo\(\(valor as Partial<Persisted>/)
  })
  it('el registro y la entrada no escriben el DNI ni usan «upsert»', () => {
    for (const f of ['lib/servidor/acceso.ts', 'lib/servidor/cliente.ts', 'components/acceso/FormularioAcceso.tsx', 'components/acceso/PantallaAcceso.tsx']) {
      const src = sinComentarios(leer(f))
      expect(src, f).not.toMatch(/datos_dni|\bdni\b/i)
      expect(src, f).not.toMatch(/\.upsert\(/)
    }
  })
  it('ningún archivo lee la clave de servicio ni la escribe', () => {
    for (const f of ['lib/servidor/config.ts', 'lib/servidor/cliente.ts', 'lib/servidor/sesion.ts', 'lib/servidor/acceso.ts']) {
      expect(sinComentarios(leer(f)), f).not.toMatch(/process\.env\.\w*(SERVICE|SECRET)\w*/i)
    }
  })
  it('la librería de Supabase solo se carga si el inicio de sesión está activo (import dinámico)', () => {
    const src = leer('lib/servidor/cliente.ts')
    expect(src).toMatch(/await import\('@supabase\/supabase-js'\)/)
    expect(src).not.toMatch(/^import \{[^}]*\} from '@supabase\/supabase-js'/m)
  })
  it('el archivo de ejemplo solo trae nombres de variables, sin valores, y no pide la clave secreta', () => {
    const ej = leer('.env.local.ejemplo')
    const lineas = ej.split('\n').filter((l) => /^[A-Z_]+=/.test(l))
    expect(lineas.length).toBeGreaterThanOrEqual(3)
    for (const l of lineas) expect(l.split('=')[1]).toBe('')
    expect(ej).not.toMatch(/^[A-Z_]*(SERVICE|SECRET)[A-Z_]*=/m)
  })
})

describe('borrar mi cuenta (cliente simulado, sin red)', () => {
  const falla = (message: string, status = 400, code = '22023'): ErrorServidor => ({ message, status, code })

  it('si la base la borra, la sesión de este teléfono se cierra SIN avisar al servidor (ya no la conoce)', async () => {
    const s = servidorFalso()
    expect(await borrarCuenta(s.cliente)).toEqual({ ok: true })
    expect(s.llamadas.map((l) => l.metodo)).toEqual(['borrarMiCuenta', 'signOut'])
    expect(s.llamadas[1].args).toEqual({ scope: 'local' })
  })

  it('cada motivo por el que la base se niega sale en una frase corta, y no se cierra la sesión ni se borra nada', async () => {
    const casos: Array<[string, string]> = [
      ['paseo_pendiente', TEXTO_BORRAR.paseoPendiente],
      ['reporte_abierto', TEXTO_BORRAR.reporteAbierto],
      ['pago_pendiente', TEXTO_BORRAR.pagoPendiente],
      ['equipo', TEXTO_BORRAR.esDelEquipo],
      ['algo_nuevo_que_la_app_no_conoce', TEXTO_BORRAR.noSePudo],
    ]
    for (const [motivo, esperado] of casos) {
      const s = servidorFalso({ borrado: { motivo } })
      expect(await borrarCuenta(s.cliente), motivo).toEqual({ ok: false, mensaje: esperado })
      expect(s.llamadas.map((l) => l.metodo), motivo).toEqual(['borrarMiCuenta'])
    }
  })

  it('sin conexión o con la base caída: se dice, no se cierra la sesión y se puede volver a pedir', async () => {
    for (const borrado of ['red' as const, falla('x', 0, ''), falla('x', 503, ''), falla('Failed to fetch', 0, '')]) {
      const s = servidorFalso({ borrado })
      expect(await borrarCuenta(s.cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.sinConexion })
      expect(s.llamadas.map((l) => l.metodo)).toEqual(['borrarMiCuenta'])
    }
  })

  it('con la sesión vencida pide entrar de nuevo', async () => {
    const s = servidorFalso({ borrado: falla('JWT expired', 401, 'PGRST301') })
    expect(await borrarCuenta(s.cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.entrar })
    const sinSesion = servidorFalso({ borrado: falla('Entra a tu cuenta para borrarla.', 403, '42501') })
    expect(await borrarCuenta(sinSesion.cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.entrar })
  })

  it('si la cuenta ya no existía (la respuesta de un intento anterior se perdió) cuenta como hecho', async () => {
    const s = servidorFalso({ borrado: falla('No encontramos tu cuenta.', 404, 'P0002') })
    expect(await borrarCuenta(s.cliente)).toEqual({ ok: true })
    expect(s.llamadas.map((l) => l.metodo)).toEqual(['borrarMiCuenta', 'signOut'])
  })

  it('un error que no se entiende da una frase simple: nunca el texto de la base ni palabras en inglés', async () => {
    const s = servidorFalso({ borrado: falla('update or delete on table "users" violates foreign key constraint', 409, '23503') })
    expect(await borrarCuenta(s.cliente)).toEqual({ ok: false, mensaje: TEXTO_BORRAR.noSePudo })
    expect(mensajeDeBorrado({ message: 'permission denied for table users', status: 403, code: '42501' })).toBe(TEXTO_BORRAR.noSePudo)
  })

  it('si cerrar la sesión de este teléfono falla, la cuenta igual quedó borrada', async () => {
    const s = servidorFalso()
    s.cliente.auth.signOut = async () => {
      throw new Error('Failed to fetch')
    }
    expect(await borrarCuenta(s.cliente)).toEqual({ ok: true })
  })

  it('las frases son cortas, sin promesas y no nombran la app a mano', () => {
    for (const [clave, texto] of Object.entries(TEXTO_BORRAR)) {
      expect(texto, clave).not.toMatch(/seguro|garantiz|100\s?%|escrow|custodia/i)
      expect(texto.split(/\s+/).length, clave).toBeLessThanOrEqual(34)
    }
    expect(TEXTO_BORRAR.masFamilia).toMatch(/sin tu nombre/)
    expect(TEXTO_BORRAR.masPaseador).toMatch(/DNI/)
  })
})
