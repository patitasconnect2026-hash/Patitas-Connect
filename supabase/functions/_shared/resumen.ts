/**
 * El núcleo de la IA de apoyo del equipo (Bloque 7): funciones puras y SIN dependencias, para que lo mismo corra en la Edge Function
 * de Supabase (Deno) y en las pruebas y la pantalla (Node). Aquí NO hay ninguna clave: la clave de la IA vive solo en los secretos
 * de Supabase (`IA_CLAVE`) y la lee `index.ts` con `Deno.env`; nunca se escribe en el código, ni en el navegador, ni en el chat.
 *
 * Reglas de producto: la IA solo AYUDA al equipo. Resume lo que dijo la persona, señala cosas a revisar y sugiere preguntas para la
 * videollamada. NUNCA dice «apto» ni «no apto», no diagnostica personalidad y no decide: «Ayuda para el equipo. Decide una persona.»
 * Antes de enviar nada se quitan el nombre, el DNI, el teléfono y el correo.
 */

export const TEXTO_FIJO_IA = 'Ayuda para el equipo. Decide una persona.'

export const MAX_RESPUESTAS = 12
export const MAX_LARGO_RESPUESTA = 1000
export const MAX_NOMBRES = 6

const MARCA = '[quitado]'

/** Quita de un texto el DNI, el teléfono, el correo y los nombres dados. Se hace en el navegador Y otra vez en la función. */
export function anonimizar(texto: string, nombres: readonly string[] = []): string {
  let t = texto
  t = t.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, MARCA)
  // Teléfonos: +51 987 654 321, 987654321, (01) 319 0000… (7 a 9 dígitos con separadores) y DNI de 8 dígitos
  t = t.replace(/(\+?51[\s-]?)?(\(?0?\d{1,2}\)?[\s-]?)?\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g, MARCA)
  t = t.replace(/\b\d{8}\b/g, MARCA)
  t = t.replace(/\b\d{3}[\s-]?\d{4}\b/g, MARCA)
  for (const n of nombres) {
    const limpio = n.trim()
    if (limpio.length < 2) continue
    const escapado = limpio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapado}(?![\\p{L}\\p{N}])`, 'giu'), MARCA)
  }
  return t
}

export interface PedidoDeResumen {
  /** El paseador al que se refiere (solo para el registro de uso). */
  paseadorId: string
  /** pregunta → lo que escribió. */
  respuestas: Record<string, string>
  /** Las preguntas, con su texto, para que la IA entienda qué respondió. */
  preguntas: Record<string, string>
  /** Palabras que hay que quitar (su nombre y apellido). */
  quitar: string[]
}

export interface ResumenDeApoyo {
  /** Hasta 5 líneas con lo que dijo la persona. */
  resumen: string[]
  /** Cosas que mirar con atención (respuestas vacías, copiadas, contradicciones, poco cuidado). */
  revisar: string[]
  /** Preguntas para la videollamada. */
  preguntas: string[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Revisa lo que llegó. null = no sirve. Anonimiza otra vez, por si el navegador no lo hizo. */
export function validarPedido(x: unknown): PedidoDeResumen | null {
  const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : null
  if (!o || typeof o.paseadorId !== 'string' || !UUID.test(o.paseadorId)) return null
  const r = o.respuestas && typeof o.respuestas === 'object' && !Array.isArray(o.respuestas) ? (o.respuestas as Record<string, unknown>) : null
  const p = o.preguntas && typeof o.preguntas === 'object' && !Array.isArray(o.preguntas) ? (o.preguntas as Record<string, unknown>) : {}
  const q = Array.isArray(o.quitar) ? o.quitar.filter((v): v is string => typeof v === 'string').slice(0, MAX_NOMBRES) : []
  if (!r) return null
  const claves = Object.keys(r)
  if (claves.length === 0 || claves.length > MAX_RESPUESTAS) return null
  const respuestas: Record<string, string> = {}
  const preguntas: Record<string, string> = {}
  for (const k of claves) {
    const v = r[k]
    if (!/^[a-z0-9_-]{1,40}$/.test(k) || typeof v !== 'string' || v.length > MAX_LARGO_RESPUESTA) return null
    respuestas[k] = anonimizar(v, q)
    const t = p[k]
    preguntas[k] = typeof t === 'string' ? anonimizar(t.slice(0, 400), q) : ''
  }
  return { paseadorId: o.paseadorId, respuestas, preguntas, quitar: q }
}

export const INSTRUCCIONES_IA = [
  'Eres una ayuda para el equipo de Patitas, un servicio de paseo de perros hecho por estudiantes. Lees las respuestas ESCRITAS de una persona que quiere ser paseadora.',
  'Tu trabajo: (1) resumir en 5 líneas como máximo lo que dijo la persona; (2) señalar cosas para revisar: respuestas vacías o muy cortas, copiadas, que se contradicen entre sí o que muestran poco cuidado; (3) sugerir de 3 a 5 preguntas para la videollamada.',
  'REGLAS: NUNCA digas que la persona es «apta» ni «no apta», ni «aprobada» ni «rechazada», ni recomiendes aprobar o rechazar. No diagnostiques personalidad ni salud, no adivines edad, género ni origen. No decides nada: decide una persona del equipo. Si no sabes algo, dilo.',
  'Los datos personales ya fueron quitados y aparecen como [quitado]: no intentes adivinarlos.',
  'Responde SOLO con un JSON válido, sin texto antes ni después, con esta forma exacta: {"resumen": ["..."], "revisar": ["..."], "preguntas": ["..."]}. Español simple y cercano.',
].join('\n')

/** El mensaje con las respuestas, ya sin datos personales. */
export function mensajeParaLaIa(p: PedidoDeResumen): string {
  return Object.keys(p.respuestas)
    .map((k) => `Pregunta (${k}): ${p.preguntas[k] || '(sin texto)'}\nRespuesta: ${p.respuestas[k] || '(vacía)'}`)
    .join('\n\n')
}

/** Lo que la IA no puede decir: un veredicto. Una línea que lo diga se descarta. */
const VEREDICTO = /\b(no\s+)?apt[oa]s?\b|\baprob(ar|ad[oa]s?|aci[oó]n)\b|\brechaz(ar|ad[oa]s?)\b|\brecomiend[oa]\b|\bdebe(r[ií]a)?(n)?\s+(ser\s+)?(acept|contrat|descart)/i

const SOLO_TEXTO = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean) : [])

/**
 * Lo que respondió la IA, convertido en un resumen seguro: solo las tres listas, con largo y cantidad limitados y SIN ninguna línea
 * que diga «apto», «no apto», «aprobar» o «rechazar». null si no vino un JSON con la forma pedida.
 */
export function leerRespuestaDeLaIa(texto: string): ResumenDeApoyo | null {
  const inicio = texto.indexOf('{')
  const fin = texto.lastIndexOf('}')
  if (inicio < 0 || fin <= inicio) return null
  let json: unknown
  try {
    json = JSON.parse(texto.slice(inicio, fin + 1))
  } catch {
    return null
  }
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  if (!o) return null
  const limpiar = (v: unknown, max: number) =>
    SOLO_TEXTO(v)
      .filter((l) => !VEREDICTO.test(l))
      .map((l) => l.slice(0, 300))
      .slice(0, max)
  const r: ResumenDeApoyo = { resumen: limpiar(o.resumen, 5), revisar: limpiar(o.revisar, 8), preguntas: limpiar(o.preguntas, 5) }
  return r.resumen.length === 0 && r.revisar.length === 0 && r.preguntas.length === 0 ? null : r
}

export interface DepsDeLaFuncion {
  /** Lee un secreto de Supabase (`IA_CLAVE`, `IA_MODELO`). Vacío = no está puesto. */
  secreto: (nombre: string) => string
  /** `SUPABASE_URL` y `SUPABASE_ANON_KEY`: los pone Supabase solo en sus funciones. */
  urlDeSupabase: string
  claveAnonima: string
  fetch: (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>
}

export type Motivo = 'sin_sesion' | 'sin_permiso' | 'sin_clave' | 'pedido' | 'registro' | 'ia' | 'respuesta'
export type SalidaDeLaFuncion = { status: 200; cuerpo: ResumenDeApoyo & { aviso: string } } | { status: number; cuerpo: { error: Motivo } }

export const MODELO_POR_DEFECTO = 'claude-haiku-5-5'
export const URL_DE_LA_IA = 'https://api.anthropic.com/v1/messages'

const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/**
 * Atiende un pedido del equipo. Orden: quién es (la sesión de Supabase), si es del equipo, si hay clave, si el pedido sirve, se
 * REGISTRA el uso (quién y cuándo) y recién entonces se llama a la IA. Sin registro no hay llamada. Nada se guarda de lo que dice la IA.
 */
export async function atenderPedido(jwt: string | null, cuerpo: unknown, d: DepsDeLaFuncion): Promise<SalidaDeLaFuncion> {
  if (!jwt) return { status: 401, cuerpo: { error: 'sin_sesion' } }
  const cabecera = { apikey: d.claveAnonima, Authorization: `Bearer ${jwt}` }
  try {
    const quien = await d.fetch(`${d.urlDeSupabase}/auth/v1/user`, { headers: cabecera })
    const usuario = objeto(await quien.json().catch(() => ({})))
    const uid = quien.ok && typeof usuario.id === 'string' && UUID.test(usuario.id) ? usuario.id : null
    if (!uid) return { status: 401, cuerpo: { error: 'sin_sesion' } }

    const perfil = await d.fetch(`${d.urlDeSupabase}/rest/v1/perfiles?id=eq.${uid}&select=rol`, { headers: cabecera })
    const filas = await perfil.json().catch(() => [])
    if (!perfil.ok || !Array.isArray(filas) || objeto(filas[0]).rol !== 'equipo') return { status: 403, cuerpo: { error: 'sin_permiso' } }

    const clave = d.secreto('IA_CLAVE').trim()
    if (!clave) return { status: 503, cuerpo: { error: 'sin_clave' } }

    const pedido = validarPedido(cuerpo)
    if (!pedido) return { status: 400, cuerpo: { error: 'pedido' } }

    // El uso se registra ANTES de llamar a la IA: quién del equipo y cuándo. Si no se puede registrar, no se llama.
    const registro = await d.fetch(`${d.urlDeSupabase}/rest/v1/usos_ia`, {
      method: 'POST',
      headers: { ...cabecera, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ equipo_id: uid, paseador_id: pedido.paseadorId }),
    })
    if (!registro.ok) return { status: 500, cuerpo: { error: 'registro' } }

    const ia = await d.fetch(URL_DE_LA_IA, {
      method: 'POST',
      headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: d.secreto('IA_MODELO').trim() || MODELO_POR_DEFECTO,
        max_tokens: 900,
        system: INSTRUCCIONES_IA,
        messages: [{ role: 'user', content: mensajeParaLaIa(pedido) }],
      }),
    })
    if (!ia.ok) return { status: 502, cuerpo: { error: 'ia' } }
    const salida = objeto(await ia.json().catch(() => ({})))
    const bloques = Array.isArray(salida.content) ? salida.content : []
    const texto = bloques.map((b) => (typeof objeto(b).text === 'string' ? (objeto(b).text as string) : '')).join('')
    const resumen = leerRespuestaDeLaIa(texto)
    if (!resumen) return { status: 502, cuerpo: { error: 'respuesta' } }
    return { status: 200, cuerpo: { ...resumen, aviso: TEXTO_FIJO_IA } }
  } catch {
    return { status: 502, cuerpo: { error: 'ia' } }
  }
}
