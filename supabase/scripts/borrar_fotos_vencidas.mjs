// Borra las fotos vencidas (a los 7 días), salvo las de un paseo con un caso abierto o en disputa.
//
//   SUPABASE_URL=https://<tu-proyecto>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clave> node supabase/scripts/borrar_fotos_vencidas.mjs
//   (agrega --hacerlo para borrar de verdad; sin eso solo muestra qué borraría)
//
// La clave de servicio se pasa SOLO por la terminal (variable de entorno). NUNCA la escribas en un archivo del proyecto,
// ni en el código, ni en `.env.local`: da acceso a todo y se salta las reglas de acceso.
// Supabase pide borrar los archivos por su API (no por SQL): este script usa la API y después borra las filas.
//
// Qué borra:
//   1) Las fotos del paseo y la «foto de hoy» (tabla `fotos`, función `fotos_para_borrar`): primero la imagen, luego la fila.
//   2) Las imágenes del CHAT (`chat/<paseo>/<mensaje>.jpg`): no tienen fila ni fecha de vencimiento, así que se recorre el almacén
//      y se borran las que llevan más de 7 días allí. Hoy la app no sube imágenes de chat (con servidor el chat es solo texto):
//      esto cubre las que se subieran más adelante o por otra vía. Si el paseo tiene un caso abierto o está en disputa, se conservan.
//   3) Los archivos de las CUENTAS BORRADAS (tabla `archivos_por_borrar`): `borrar_mi_cuenta()` ya borró las filas y anotó la ruta de
//      cada imagen; aquí se borra el archivo por la API y después la anotación. Estos no esperan 7 días.
//   Un archivo sin fecha NO se borra.

import { rutasDeCuentasBorradas, filtroDeRutas } from './archivos_de_cuentas.mjs'
import { imagenDeChat, imagenesDeChatVencidas, paseosAConservar } from './vencimiento_chat.mjs'

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
const hacerlo = process.argv.includes('--hacerlo')

if (!url || !clave) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (variables de entorno, solo en esta terminal).')
  process.exit(1)
}

const cabeceras = { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' }

async function pedir(ruta, opciones = {}) {
  const r = await fetch(`${url}${ruta}`, { ...opciones, headers: { ...cabeceras, ...(opciones.headers ?? {}) } })
  if (!r.ok) throw new Error(`${opciones.method ?? 'GET'} ${ruta}: ${r.status} ${(await r.text()).slice(0, 200)}`)
  return r.status === 204 ? null : r.json().catch(() => null)
}

/** Todo lo que hay dentro de una carpeta del almacén (con paginación). */
async function listar(prefijo) {
  const todos = []
  for (let desplazamiento = 0; ; desplazamiento += 100) {
    const pagina = (await pedir('/storage/v1/object/list/fotos', { method: 'POST', body: JSON.stringify({ prefix: prefijo, limit: 100, offset: desplazamiento, sortBy: { column: 'name', order: 'asc' } }) })) ?? []
    todos.push(...pagina)
    if (pagina.length < 100) return todos
  }
}

const vencidas = (await pedir('/rest/v1/rpc/fotos_para_borrar', { method: 'POST', body: '{}' })) ?? []

// Las imágenes del chat: se recorre `chat/<paseo>/` y se deja lo de los paseos con caso abierto o en disputa.
const conservar = paseosAConservar({
  casosAbiertos: (await pedir('/rest/v1/casos?resuelto_en=is.null&select=paseo_id')) ?? [],
  paseosEnDisputa: (await pedir('/rest/v1/paseos?estado=eq.en_disputa&select=id')) ?? [],
})
const imagenesDeChat = []
for (const carpeta of await listar('chat')) {
  if (!carpeta || typeof carpeta.name !== 'string') continue
  for (const item of await listar(`chat/${carpeta.name}`)) {
    const imagen = imagenDeChat(carpeta.name, item)
    if (imagen) imagenesDeChat.push(imagen)
  }
}
const chatVencido = imagenesDeChatVencidas({ imagenes: imagenesDeChat, ahora: Date.now(), conservar })

// Los archivos de cuentas borradas.
const deCuentas = rutasDeCuentasBorradas((await pedir('/rest/v1/archivos_por_borrar?select=ruta')) ?? [])

console.log(`${vencidas.length} foto(s) vencida(s) sin caso abierto.`)
console.log(`${chatVencido.length} imagen(es) de chat vencida(s) sin caso abierto (de ${imagenesDeChat.length} en el almacén).`)
console.log(`${deCuentas.length} archivo(s) de cuentas borradas.`)
if (!hacerlo || (vencidas.length === 0 && chatVencido.length === 0 && deCuentas.length === 0)) {
  if (vencidas.length + chatVencido.length + deCuentas.length > 0) console.log('Sin --hacerlo no se borra nada.')
  process.exit(0)
}

for (let i = 0; i < vencidas.length; i += 100) {
  const lote = vencidas.slice(i, i + 100)
  // 1) los archivos, por la API del almacén
  await pedir('/storage/v1/object/fotos', { method: 'DELETE', body: JSON.stringify({ prefixes: lote.map((f) => f.ruta) }) })
  // 2) las filas
  await pedir(`/rest/v1/fotos?id=in.(${lote.map((f) => f.id).join(',')})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
  console.log(`Fotos borradas: ${Math.min(i + 100, vencidas.length)} de ${vencidas.length}.`)
}
// Las imágenes del chat no tienen fila: solo se borra el archivo.
for (let i = 0; i < chatVencido.length; i += 100) {
  await pedir('/storage/v1/object/fotos', { method: 'DELETE', body: JSON.stringify({ prefixes: chatVencido.slice(i, i + 100) }) })
  console.log(`Imágenes de chat borradas: ${Math.min(i + 100, chatVencido.length)} de ${chatVencido.length}.`)
}
// Los archivos de cuentas borradas: primero el archivo (por la API) y después la anotación.
for (let i = 0; i < deCuentas.length; i += 100) {
  const lote = deCuentas.slice(i, i + 100)
  await pedir('/storage/v1/object/fotos', { method: 'DELETE', body: JSON.stringify({ prefixes: lote }) })
  await pedir(`/rest/v1/archivos_por_borrar?${filtroDeRutas(lote)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
  console.log(`Archivos de cuentas borradas: ${Math.min(i + 100, deCuentas.length)} de ${deCuentas.length}.`)
}
