// Crea una cuenta del equipo (rol «equipo») sin pasos manuales en el panel.
//
//   read -s SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY   (pega la clave y Enter; no se ve ni queda en el historial)
//   SUPABASE_URL=https://<tu-proyecto>.supabase.co node supabase/scripts/crear_cuenta_equipo.mjs
//
// La clave de servicio se pasa SOLO por la terminal (variable de entorno). NUNCA la escribas en un archivo del proyecto,
// ni en el código, ni en `.env.local`: da acceso a todo y se salta las reglas de acceso.
// El correo y la contraseña se piden aquí mismo (la contraseña no se ve al escribirla y no se acepta como argumento).
//
// Qué hace:
//   1) Muestra a qué proyecto va a apuntar y pide confirmar.
//   2) Crea el usuario por la API de administración (ya confirmado: no gasta uno de los 2 correos por hora).
//   3) Le pone el rol «equipo» en `perfiles` (la clave de servicio no tiene `auth.uid()`, así que el disparador lo permite).
//   4) Comprueba que quedó con ese rol.
// Si el correo ya existe, NO toca nada y dice qué rol tiene hoy.

import readline from 'node:readline'

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
const MINIMO_CONTRASENA = 12

function salir(mensaje, codigo = 1) {
  console.error(mensaje)
  process.exit(codigo)
}

if (!url || !clave) salir('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (variables de entorno, solo en esta terminal).')

let direccion
try {
  direccion = new URL(url)
} catch {
  salir('SUPABASE_URL no es una dirección válida.')
}
const esLocal = ['localhost', '127.0.0.1', '[::1]'].includes(direccion.hostname)
if (direccion.protocol !== 'https:' && !esLocal) salir('SUPABASE_URL tiene que empezar con https://.')

// --- Preguntas en la terminal (la contraseña no se muestra) ---
let oculto = false
const entrada = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: Boolean(process.stdin.isTTY),
})
entrada._writeToOutput = function (texto) {
  if (!oculto) process.stdout.write(texto)
}
const lineas = entrada[Symbol.asyncIterator]()

async function preguntar(texto, { secreto = false } = {}) {
  process.stdout.write(texto)
  oculto = secreto
  const { value, done } = await lineas.next()
  oculto = false
  if (secreto) process.stdout.write('\n')
  if (done) salir('\nSe cerró la entrada antes de terminar. No se creó nada.')
  return String(value).trim()
}

// --- Llamadas a Supabase con la clave de servicio ---
const cabeceras = { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' }

async function pedir(ruta, opciones = {}) {
  const r = await fetch(`${url}${ruta}`, { ...opciones, headers: { ...cabeceras, ...(opciones.headers ?? {}) } })
  const texto = await r.text()
  let cuerpo = null
  try {
    cuerpo = texto ? JSON.parse(texto) : null
  } catch {
    cuerpo = null
  }
  return { ok: r.ok, estado: r.status, cuerpo, texto: texto.slice(0, 200) }
}

function dichoPorSupabase(r) {
  return r.cuerpo?.msg ?? r.cuerpo?.message ?? r.texto
}

async function rolDe(id) {
  const r = await pedir(`/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}&select=rol`)
  if (!r.ok) return null
  return r.cuerpo?.[0]?.rol ?? null
}

/** Busca un usuario por correo recorriendo la lista de administración (el piloto tiene pocas cuentas). */
async function buscarPorCorreo(correo) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const r = await pedir(`/auth/v1/admin/users?page=${pagina}&per_page=200`)
    if (!r.ok) return { error: `${r.estado} ${dichoPorSupabase(r)}` }
    const usuarios = r.cuerpo?.users ?? []
    const hallado = usuarios.find((u) => String(u.email ?? '').toLowerCase() === correo)
    if (hallado) return { usuario: hallado }
    if (usuarios.length < 200) break
  }
  return { usuario: null }
}

/** Dice si la cuenta ya existe (y con qué rol) y termina sin tocar nada. */
async function avisarQueYaExiste() {
  const busqueda = await buscarPorCorreo(correo)
  if (busqueda.error) salir(`Esa cuenta ya existe, pero no pude leer su rol (${busqueda.error}). No se cambió nada.`)
  const rol = busqueda.usuario ? await rolDe(busqueda.usuario.id) : null
  console.log(`Esa cuenta ya existe${rol ? ` y tiene el rol «${rol}»` : ' (no pude leer su rol)'}. No se cambió nada.`)
  if (rol && rol !== 'equipo') console.log('Si quieres darle el rol «equipo», hazlo a mano (supabase/LEEME.md, «Cuentas del equipo»).')
  process.exit(0)
}

// --- Programa ---
console.log(`Proyecto: ${direccion.host}`)
const confirma = (await preguntar('¿Es este el proyecto donde crear la cuenta del equipo? (si/no): ')).toLowerCase()
if (confirma !== 'si' && confirma !== 'sí') salir('No se creó nada.', 0)

const correo = (await preguntar('Correo de la persona del equipo: ')).toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) salir('Ese correo no parece válido. No se creó nada.')
// Si ya existe, no hace falta pedir contraseña.
if ((await buscarPorCorreo(correo)).usuario) await avisarQueYaExiste()

const contrasena = await preguntar(`Contraseña (mínimo ${MINIMO_CONTRASENA} caracteres, no se ve al escribir): `, { secreto: true })
if (contrasena.length < MINIMO_CONTRASENA) salir(`La contraseña necesita al menos ${MINIMO_CONTRASENA} caracteres. No se creó nada.`)
const repetida = await preguntar('Repite la contraseña: ', { secreto: true })
if (repetida !== contrasena) salir('Las contraseñas no son iguales. No se creó nada.')
entrada.close()

const creada = await pedir('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({ email: correo, password: contrasena, email_confirm: true }),
})

if (!creada.ok) {
  const yaExiste = creada.cuerpo?.error_code === 'email_exists' || /already (been )?registered|already exists/i.test(creada.texto)
  if (!yaExiste) salir(`No se pudo crear la cuenta: ${creada.estado} ${dichoPorSupabase(creada)}`)
  await avisarQueYaExiste()
}

const id = creada.cuerpo?.id
if (!id) salir('Supabase dijo que creó la cuenta pero no devolvió su id. Revisa Authentication → Users.')

const puesto = await pedir(`/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ rol: 'equipo' }),
})
const rolFinal = puesto.ok ? puesto.cuerpo?.[0]?.rol : null

if (rolFinal !== 'equipo') {
  console.error(`La cuenta SÍ se creó (id ${id}), pero NO pude ponerle el rol «equipo»: ${puesto.estado} ${dichoPorSupabase(puesto)}`)
  console.error(`Hazlo a mano en el editor de SQL:  update public.perfiles set rol = 'equipo' where id = '${id}';`)
  process.exit(1)
}

console.log(`Listo: ${correo} ya es del equipo (rol «${rolFinal}»). Puede entrar en <dirección de la app>/admin.`)
