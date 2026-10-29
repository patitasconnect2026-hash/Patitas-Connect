// Un «Supabase de mentira» para ver la app SIN tocar el real: contesta como PostgREST y GoTrue (lo mínimo que usa la
// app) y por dentro corre las migraciones SQL de verdad en PGlite, así que las reglas de acceso y los disparadores son
// los reales. No usa Docker, no usa red y no guarda nada en disco. Todas las claves y contraseñas son inventadas.
//
// Uso:
//   npm i --no-save @electric-sql/pglite@0.2.17          (una sola vez)
//   node supabase/tests/servidor_simulado.mjs            (escucha en http://localhost:54321 con personas de prueba)
//   NEXT_PUBLIC_DATOS=servidor NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=clave-inventada npm run build
//
// Límites: solo contesta las consultas que la app hace (filtros eq, neq, in, is; order; limit; insert, upsert, update, delete y
// rpc) y lo mínimo del almacén de fotos (subir, enlace que vence, ver con el enlace y borrar; ver almacen_simulado.mjs).
// No es PostgREST ni Storage completos: no reemplaza probar contra el proyecto real.
import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { crearBase } from './base_pglite.mjs'
import { crearAlmacenSimulado } from './almacen_simulado.mjs'

const CONTRASENA_DE_PRUEBA = 'prueba-1234'

/** Personas que se siembran al iniciar desde la línea de comandos. */
export const PERSONAS_DE_PRUEBA = [
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'valeria@prueba.local', rol: 'familia', nombre: 'Valeria', apellido: 'Rojas', celular: '987654321' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', email: 'rosa@prueba.local', rol: 'familia', nombre: 'Rosa', apellido: 'Vega', celular: '912345678' },
  { id: 'cccccccc-0000-4000-8000-000000000001', email: 'equipo@prueba.local', rol: 'equipo', nombre: 'Equipo', apellido: 'Patitas', celular: '900000000' },
]
export const PASEADORES_DE_PRUEBA = [
  { id: 'bbbbbbbb-0000-4000-8000-000000000001', email: 'lucia@prueba.local', nombre: 'Lucía', apellido: 'Quispe', celular: '987111222', dni: '12345678', rate: 22 },
  { id: 'bbbbbbbb-0000-4000-8000-000000000002', email: 'mateo@prueba.local', nombre: 'Mateo', apellido: 'Rojas', celular: '987333444', dni: '87654321', rate: 25 },
]

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const leerJwt = (t) => {
  try {
    return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}
const HTTP_DE = { 42501: 403, 23505: 409, 23503: 409, 23514: 400, 22023: 400, '22P02': 400, P0002: 400, P0001: 400 }
const identificador = (x) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(x)) throw Object.assign(new Error(`Nombre no válido: ${x}`), { status: 400 })
  return x
}

export async function iniciarServidorSimulado({ puerto = 54321, sembrar = true, silencioso = false } = {}) {
  const db = await crearBase()
  const claves = new Map() // email → contraseña
  const sesiones = new Map() // refresh_token → id
  let n = 0

  const usuarioDe = async (id) => {
    const r = await db.query(`select id, email, raw_user_meta_data from auth.users where id = $1`, [id])
    return r.rows[0] ?? null
  }
  const sesionDe = async (id) => {
    const u = await usuarioDe(id)
    const ahora = Math.floor(Date.now() / 1000)
    const expira = ahora + 3600
    const meta = u.raw_user_meta_data ?? {}
    const usuario = {
      id,
      aud: 'authenticated',
      role: 'authenticated',
      email: u.email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: meta,
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const acceso = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, role: 'authenticated', aud: 'authenticated', email: u.email, iat: ahora, exp: expira, user_metadata: meta })}.firma-inventada`
    const refresco = `r-${++n}-${id.slice(0, 8)}`
    sesiones.set(refresco, id)
    return { access_token: acceso, token_type: 'bearer', expires_in: 3600, expires_at: expira, refresh_token: refresco, user: usuario }
  }

  /* ---- siembra ---- */
  async function crearUsuario({ id, email, contrasena = CONTRASENA_DE_PRUEBA, meta }) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data, aud, role) values ($1, $2, $3::jsonb, 'authenticated', 'authenticated')`, [id, email, JSON.stringify(meta)])
    claves.set(email, contrasena)
  }
  async function sembrarPersona(p) {
    await crearUsuario({ id: p.id, email: p.email, meta: { rol: p.rol === 'paseador' ? 'paseador' : 'familia', nombre_pila: p.nombre, apellido: p.apellido, celular: p.celular } })
    if (p.rol === 'equipo') await db.query(`update public.perfiles set rol = 'equipo' where id = $1`, [p.id])
    await db.query(`insert into public.datos_personales (id, apellido, celular) values ($1, $2, $3)`, [p.id, p.apellido ?? '', p.celular ?? ''])
  }
  async function sembrarPaseadorAprobado(p) {
    await sembrarPersona({ ...p, rol: 'paseador' })
    const perfil = p.perfil ?? { rate: p.rate, sizes: ['small', 'medium', 'large'], times: ['Mañana (6–12)', 'Tarde (12–18)', 'Noche (18–21)'], spots: ['olivar'], includes: ['Agua y bolsas', 'Fotos durante el paseo'], style: ['Tranquilo', 'Puntual'], experience: 'Tengo perro', bio: `Soy ${p.nombre}, estudio en el barrio y me encantan los perros.` }
    await db.query(`insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, distrito, carrera, ciclo, perfil, paseos_acompanados) values ($1, $2, 'activo', $3, $4, 'San Isidro', 'Psicología', '5to ciclo', $5::jsonb, $6)`, [
      p.id,
      `PAT-${p.nombre.slice(0, 3).toUpperCase()}`,
      p.nombre,
      p.apellido,
      JSON.stringify(perfil),
      p.paseosAcompanados ?? 0,
    ])
    const marcas = new Set(p.comprobaciones ?? ['dni', 'distrito', 'celular', 'consultas', 'examen'])
    await db.query(`insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ($1, $2, $3, $4, $5, $6)`, [
      p.id,
      marcas.has('dni'),
      marcas.has('distrito'),
      marcas.has('celular'),
      marcas.has('consultas'),
      marcas.has('examen'),
    ])
    await db.query(`insert into public.datos_dni (paseador_id, dni) values ($1, $2)`, [p.id, p.dni])
    const cobro = p.cobro ?? { metodo: 'yape', celular: p.celular, titular: `${p.nombre} ${p.apellido}`.trim() }
    await db.query(`insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ($1, $2, $3, $4)`, [p.id, cobro.metodo, cobro.celular, cobro.titular])
  }
  if (sembrar) {
    for (const p of PERSONAS_DE_PRUEBA) await sembrarPersona(p)
    for (const p of PASEADORES_DE_PRUEBA) await sembrarPaseadorAprobado(p)
  }

  /* ---- una petición con la sesión de quien la manda ---- */
  async function ejecutar(claims, f) {
    return db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [claims ? JSON.stringify({ sub: claims.sub, role: 'authenticated' }) : ''])
      await tx.exec(`set local role ${claims ? 'authenticated' : 'anon'}`)
      return f(tx)
    })
  }

  const almacen = crearAlmacenSimulado({ db, ejecutar: (uid, f) => ejecutar(uid ? { sub: uid } : null, f) })

  /* ---- filtros de PostgREST ---- */
  const RESERVADOS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])
  function filtrosDe(params, valores) {
    const partes = []
    for (const [clave, crudo] of params) {
      if (RESERVADOS.has(clave)) continue
      const col = `x.${identificador(clave)}`
      const punto = crudo.indexOf('.')
      const op = crudo.slice(0, punto)
      const v = crudo.slice(punto + 1)
      if (op === 'eq' || op === 'neq') {
        valores.push(v)
        partes.push(`${col}::text ${op === 'eq' ? '=' : '<>'} $${valores.length}::text`)
      } else if (op === 'in') {
        const lista = v.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''))
        valores.push(lista)
        partes.push(`${col}::text = any($${valores.length}::text[])`)
      } else if (op === 'is') {
        partes.push(v === 'null' ? `${col} is null` : v === 'true' ? `${col} is true` : `${col} is false`)
      } else {
        throw Object.assign(new Error(`Filtro no soportado: ${crudo}`), { status: 400 })
      }
    }
    return partes.length ? `where ${partes.join(' and ')}` : ''
  }
  const ordenDe = (orden) => {
    if (!orden) return ''
    const cols = orden.split(',').map((o) => {
      const [c, d = 'asc'] = o.split('.')
      return `x.${identificador(c)} ${d === 'desc' ? 'desc' : 'asc'}`
    })
    return `order by ${cols.join(', ')}`
  }
  const columnasDe = (select) => {
    if (!select || select === '*') return 'x.*'
    return select
      .split(',')
      .map((c) => `x.${identificador(c.trim())}`)
      .join(', ')
  }

  /* ---- manejo de la petición ---- */
  async function atender(req, res, cuerpoBinario) {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
    const ruta = url.pathname
    const esAlmacen = ruta.startsWith('/storage/v1/')
    const cuerpoTexto = esAlmacen && !/json/.test(String(req.headers['content-type'] ?? '')) ? '' : cuerpoBinario.toString('utf8')
    const cuerpo = cuerpoTexto ? JSON.parse(cuerpoTexto) : null
    const json = (estado, dato, extra = {}) => {
      res.writeHead(estado, { 'content-type': 'application/json', ...extra })
      res.end(dato === undefined ? '' : JSON.stringify(dato))
    }
    const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    const claims = bearer ? leerJwt(bearer) : null
    const sesion = claims && claims.sub && claims.role === 'authenticated' ? claims : null

    /* GoTrue */
    if (ruta === '/auth/v1/token') {
      const tipo = url.searchParams.get('grant_type')
      if (tipo === 'password') {
        const email = String(cuerpo?.email ?? '').toLowerCase()
        const r = await db.query(`select id from auth.users where lower(email) = $1`, [email])
        if (!r.rows[0] || claves.get(email) !== cuerpo?.password) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
        return json(200, await sesionDe(r.rows[0].id))
      }
      if (tipo === 'refresh_token') {
        const id = sesiones.get(cuerpo?.refresh_token)
        if (!id) return json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
        return json(200, await sesionDe(id))
      }
    }
    if (ruta === '/auth/v1/signup') {
      const email = String(cuerpo?.email ?? '').toLowerCase()
      const ya = await db.query(`select 1 from auth.users where lower(email) = $1`, [email])
      if (ya.rows.length) return json(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
      const id = `dddddddd-0000-4000-8000-${String(++n).padStart(12, '0')}`
      await crearUsuario({ id, email, contrasena: cuerpo?.password, meta: cuerpo?.data ?? {} })
      return json(200, await sesionDe(id))
    }
    if (ruta === '/auth/v1/user') {
      if (!sesion) return json(401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' })
      return json(200, (await sesionDe(sesion.sub)).user)
    }
    if (ruta === '/auth/v1/logout') {
      res.writeHead(204)
      return res.end()
    }

    /* Almacén de fotos (Storage) */
    if (esAlmacen) {
      const quien = sesion ? sesion.sub : null
      const resto = decodeURIComponent(ruta.slice('/storage/v1/'.length))
      const error = (e) => json(e.status ?? 400, { statusCode: e.statusCode ?? '400', error: e.error ?? 'Error', message: String(e.message ?? e) })
      try {
        let m2
        if (req.method === 'POST' && (m2 = resto.match(/^object\/sign\/fotos\/(.+)$/))) {
          const senal = await almacen.firmar({ uid: quien, ruta: m2[1], segundos: cuerpo?.expiresIn ?? 60 })
          return json(200, { signedURL: `/object/sign/fotos/${m2[1]}?token=${senal}` })
        }
        if (req.method === 'GET' && (m2 = resto.match(/^object\/sign\/fotos\/(.+)$/))) {
          const objeto = almacen.leerConEnlace(url.searchParams.get('token') ?? '')
          if (!objeto) return json(400, { statusCode: '400', error: 'InvalidJWT', message: 'invalid or expired token' })
          res.writeHead(200, { 'content-type': objeto.tipo, 'content-length': objeto.bytes.length })
          return res.end(objeto.bytes)
        }
        if (req.method === 'POST' && (m2 = resto.match(/^object\/fotos\/(.+)$/))) {
          await almacen.subir({ uid: quien, ruta: m2[1], bytes: cuerpoBinario, tipo: String(req.headers['content-type'] ?? '').split(';')[0] })
          return json(200, { Id: m2[1], Key: `fotos/${m2[1]}` })
        }
        if (req.method === 'DELETE' && resto === 'object/fotos') {
          const borradas = await almacen.borrar({ uid: quien, rutas: cuerpo?.prefixes ?? [] })
          return json(200, borradas.map((name) => ({ name })))
        }
      } catch (e) {
        return error(e)
      }
      return json(404, { statusCode: '404', error: 'not_found', message: `No existe ${ruta}` })
    }

    /* PostgREST */
    const m = ruta.match(/^\/rest\/v1\/(rpc\/)?([a-z_]+)$/)
    if (!m) return json(404, { message: `No existe ${ruta}` })
    const esRpc = !!m[1]
    const nombre = identificador(m[2])
    const prefer = String(req.headers.prefer ?? '')
    const quiereFilas = /return=representation/.test(prefer)
    const unSolo = /vnd\.pgrst\.object\+json/.test(String(req.headers.accept ?? ''))

    try {
      const resultado = await ejecutar(sesion, async (tx) => {
        if (esRpc) {
          const args = Object.entries(cuerpo ?? {})
          const llamada = args.map(([k], i) => `${identificador(k)} := $${i + 1}`).join(', ')
          const r = await tx.query(`select to_json(public.${nombre}(${llamada})) as r`, args.map(([, v]) => v))
          return { estado: 200, dato: r.rows[0]?.r ?? null }
        }
        const valores = []
        if (req.method === 'GET') {
          const filtros = filtrosDe(url.searchParams, valores)
          const limite = url.searchParams.get('limit')
          const r = await tx.query(
            `select coalesce(json_agg(to_jsonb(t)), '[]'::json) as r from (select ${columnasDe(url.searchParams.get('select'))} from public.${nombre} as x ${filtros} ${ordenDe(url.searchParams.get('order'))} ${limite ? `limit ${Number(limite) | 0}` : ''}) t`,
            valores,
          )
          const filas = r.rows[0].r
          if (unSolo) return filas.length === 1 ? { estado: 200, dato: filas[0] } : { estado: 406, dato: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: null, hint: null } }
          return { estado: 200, dato: filas }
        }
        if (req.method === 'POST') {
          const filas = Array.isArray(cuerpo) ? cuerpo : [cuerpo]
          const cols = [...new Set(filas.flatMap((f) => Object.keys(f)))].map(identificador)
          let alFinal = ''
          if (/resolution=merge-duplicates/.test(prefer)) {
            const objetivo = (url.searchParams.get('on_conflict') ?? '').split(',').map((c) => identificador(c.trim()))
            const sets = cols.filter((c) => !objetivo.includes(c)).map((c) => `${c} = excluded.${c}`)
            alFinal = sets.length ? `on conflict (${objetivo.join(', ')}) do update set ${sets.join(', ')}` : `on conflict (${objetivo.join(', ')}) do nothing`
          } else if (/resolution=ignore-duplicates/.test(prefer)) alFinal = 'on conflict do nothing'
          const r = await tx.query(
            `insert into public.${nombre} as x (${cols.join(', ')}) select ${cols.join(', ')} from jsonb_populate_recordset(null::public.${nombre}, $1::jsonb) ${alFinal} ${quiereFilas ? 'returning to_jsonb(x) as r' : ''}`,
            [JSON.stringify(filas)],
          )
          return quiereFilas ? { estado: 201, dato: r.rows.map((x) => x.r) } : { estado: 201, dato: undefined }
        }
        if (req.method === 'PATCH') {
          const cols = Object.keys(cuerpo).map(identificador)
          valores.push(JSON.stringify(cuerpo))
          const filtros = filtrosDe(url.searchParams, valores)
          const r = await tx.query(
            `update public.${nombre} as x set (${cols.join(', ')}) = (select ${cols.join(', ')} from jsonb_populate_record(null::public.${nombre}, $1::jsonb)) ${filtros} returning to_jsonb(x) as r`,
            valores,
          )
          return quiereFilas ? { estado: 200, dato: r.rows.map((x) => x.r) } : { estado: 204, dato: undefined }
        }
        if (req.method === 'DELETE') {
          const filtros = filtrosDe(url.searchParams, valores)
          const r = await tx.query(`delete from public.${nombre} as x ${filtros} returning to_jsonb(x) as r`, valores)
          return quiereFilas ? { estado: 200, dato: r.rows.map((x) => x.r) } : { estado: 204, dato: undefined }
        }
        return { estado: 405, dato: { message: 'Método no soportado' } }
      })
      return json(resultado.estado, resultado.dato)
    } catch (e) {
      const code = typeof e.code === 'string' ? e.code : undefined
      let estado = e.status ?? (code && HTTP_DE[code]) ?? 400
      if (code === '42501' && !sesion) estado = 401
      return json(estado, { code: code ?? 'PGRST000', message: String(e.message ?? e), details: null, hint: null })
    }
  }

  const servidor = http.createServer((req, res) => {
    const origen = req.headers.origin ?? '*'
    res.setHeader('access-control-allow-origin', origen)
    res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers'] ?? '*')
    res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
    res.setHeader('access-control-expose-headers', 'Content-Range')
    res.setHeader('vary', 'Origin')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      return res.end()
    }
    const trozos = []
    req.on('data', (c) => trozos.push(c))
    req.on('end', () => {
      atender(req, res, Buffer.concat(trozos)).catch((e) => {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ message: String(e.message ?? e) }))
      })
    })
  })
  await new Promise((resolver) => servidor.listen(puerto, '127.0.0.1', resolver))
  const escuchando = servidor.address().port
  if (!silencioso) console.log(`Supabase de mentira en http://localhost:${escuchando} (contraseña de todas las personas de prueba: ${CONTRASENA_DE_PRUEBA})`)

  return {
    url: `http://localhost:${escuchando}`,
    db,
    contrasena: CONTRASENA_DE_PRUEBA,
    sembrarPersona,
    sembrarPaseadorAprobado,
    /** El almacén de fotos de mentira (para comprobar en las pruebas: cuántos archivos hay, de qué tamaño…). */
    almacen,
    /** Para las capturas: cambia la hora en que se pidió un paseo. */
    async envejecer(paseoId, minutos) {
      await db.query(`update public.paseos set creado_en = now() - ($2::int * interval '1 minute') where id = $1`, [paseoId, minutos])
    },
    async cerrar() {
      await new Promise((r) => servidor.close(r))
      await db.close()
    },
  }
}

// Si se llama directo con node, queda escuchando hasta que se corte.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const puerto = Number(process.argv[2] ?? 54321)
  iniciarServidorSimulado({ puerto }).catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
}
