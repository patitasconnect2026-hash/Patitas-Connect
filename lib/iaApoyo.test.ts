import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ResumenIa } from '../components/admin/ResumenIa'
import { CONFIG } from './config'
import { estadoDeLaIa, pedidoParaLaIa, textoDeMotivoIa } from './iaApoyo'
import { TEXTO_IA } from './iaTextos'
import { PREGUNTAS_EXAMEN, resultadoDeExamenEscrito } from './respuestasEscritas'
import {
  anonimizar,
  atenderPedido,
  INSTRUCCIONES_IA,
  leerRespuestaDeLaIa,
  MODELO_POR_DEFECTO,
  TEXTO_FIJO_IA,
  URL_DE_LA_IA,
  validarPedido,
  type DepsDeLaFuncion,
} from '../supabase/functions/_shared/resumen'

const RAIZ = path.resolve(__dirname, '..')
const PASEADOR = 'bbbbbbbb-0000-4000-8000-000000000001'
const EQUIPO = 'cccccccc-0000-4000-8000-000000000001'

describe('IA de apoyo: apagada por defecto y sin aviso revisado no se enciende', () => {
  it('viene apagada y el aviso de privacidad para el paseador está pendiente', () => {
    expect(CONFIG.iaApoyoActivada).toBe(false)
    expect(CONFIG.iaAvisoRevisado).toBe(false)
    expect(estadoDeLaIa()).toBe('apagada')
  })
  it('encendida sin aviso revisado = pendiente; solo con las dos cosas se enciende', () => {
    expect(estadoDeLaIa({ iaApoyoActivada: true, iaAvisoRevisado: false })).toBe('aviso_pendiente')
    expect(estadoDeLaIa({ iaApoyoActivada: true, iaAvisoRevisado: true })).toBe('encendida')
    expect(estadoDeLaIa({ iaApoyoActivada: false, iaAvisoRevisado: true })).toBe('apagada')
  })
  it('nadie puede dejar la IA encendida en lib/config.ts sin que la abogada haya revisado el aviso', () => {
    expect(CONFIG.iaApoyoActivada && !CONFIG.iaAvisoRevisado).toBe(false)
  })
})

describe('IA de apoyo: se quitan nombre, DNI, teléfono y correo antes de enviar', () => {
  const texto = 'Soy Lucía Quispe, mi DNI es 12345678, mi celular 987 654 321 y +51 912345678. Escríbeme a lucia.quispe@correo.com o al (01) 319 0000.'
  const limpio = anonimizar(texto, ['Lucía', 'Quispe'])
  it('no queda nada de eso', () => {
    expect(limpio).not.toMatch(/Luc[ií]a|Quispe|12345678|987 654 321|912345678|@|319 0000/)
    expect(limpio).toContain('[quitado]')
  })
  it('lo demás queda igual, también con tildes y sin cortar palabras parecidas', () => {
    expect(anonimizar('Lucía me dijo que paseó 10 minutos. Lucíana no.', ['Lucía'])).toBe('[quitado] me dijo que paseó 10 minutos. Lucíana no.')
  })
  it('el pedido para la IA solo lleva respuestas escritas, sin datos personales', () => {
    const quiz = resultadoDeExamenEscrito(
      Object.fromEntries(PREGUNTAS_EXAMEN.map((p) => [p.id, `Soy Lucía y mi celular es 987654321. Respuesta con mucho cuidado sobre ${p.id}, aviso a la familia.`])),
      600,
    )
    const p = pedidoParaLaIa(PASEADOR, quiz, { nombres: ['Lucía', 'Quispe'], dni: '12345678', telefono: '987654321' })!
    expect(Object.keys(p.respuestas)).toEqual(PREGUNTAS_EXAMEN.map((x) => x.id))
    expect(JSON.stringify(p)).not.toMatch(/Luc[ií]a|987654321|12345678/)
    expect(pedidoParaLaIa(PASEADOR, undefined, { nombres: [] })).toBeNull()
    expect(pedidoParaLaIa(PASEADOR, resultadoDeExamenEscrito({}, 600), { nombres: [] })).toBeNull()
  })
})

describe('IA de apoyo: nunca dice «apto» ni «no apto» y no decide', () => {
  it('descarta cualquier línea con un veredicto', () => {
    const r = leerRespuestaDeLaIa(
      JSON.stringify({
        resumen: ['Dice que avisaría a la familia.', 'En mi opinión es una persona apta para pasear.', 'No apto: respondió poco.'],
        revisar: ['La respuesta 3 se parece mucho a la 2.', 'Recomiendo rechazar la postulación.', 'Se debería aprobar sin más.'],
        preguntas: ['¿Qué harías si un perro se suelta?'],
      }),
    )!
    expect(r.resumen).toEqual(['Dice que avisaría a la familia.'])
    expect(r.revisar).toEqual(['La respuesta 3 se parece mucho a la 2.'])
    expect(r.preguntas).toHaveLength(1)
    expect(JSON.stringify(r)).not.toMatch(/\bapt[oa]|aprob|rechaz|recomiend/i)
  })
  it('limita el largo y la cantidad: 5 líneas de resumen como máximo', () => {
    const r = leerRespuestaDeLaIa(JSON.stringify({ resumen: Array.from({ length: 9 }, (_, i) => `línea ${i}`), revisar: [], preguntas: [] }))!
    expect(r.resumen).toHaveLength(5)
  })
  it('una respuesta sin la forma pedida no sirve', () => {
    expect(leerRespuestaDeLaIa('hola')).toBeNull()
    expect(leerRespuestaDeLaIa('{"resumen": "x"}')).toBeNull()
    expect(leerRespuestaDeLaIa('{"resumen": [], "revisar": [], "preguntas": []}')).toBeNull()
  })
  it('las instrucciones a la IA lo dicen claro y el texto fijo está en pantalla', () => {
    expect(INSTRUCCIONES_IA).toMatch(/NUNCA digas que la persona es «apta» ni «no apta»/)
    expect(INSTRUCCIONES_IA).toMatch(/No diagnostiques personalidad/)
    expect(INSTRUCCIONES_IA).toMatch(/decide una persona del equipo/)
    expect(TEXTO_FIJO_IA).toBe('Ayuda para el equipo. Decide una persona.')
    expect(TEXTO_IA.fijo).toBe(TEXTO_FIJO_IA)
  })
})

describe('IA de apoyo: la función de Supabase (con fetch de mentira)', () => {
  const pedido = { paseadorId: PASEADOR, respuestas: { q1: 'Respuesta de Lucía, celular 987654321, correo a@b.com', o2: 'Quiero ser paseador por cuidado.' }, preguntas: { q1: 'Pregunta 1', o2: 'Pregunta 2' }, quitar: ['Lucía'] }
  const IA_OK = { content: [{ type: 'text', text: JSON.stringify({ resumen: ['Dice que cuida.'], revisar: ['Respuesta corta.'], preguntas: ['¿Cómo reaccionas?'] }) }] }

  function armar(o: { rol?: string; clave?: string; usuario?: boolean; registroOk?: boolean; iaOk?: boolean; iaTexto?: unknown } = {}) {
    const llamadas: Array<{ url: string; body?: string; headers?: Record<string, string> }> = []
    const deps: DepsDeLaFuncion = {
      secreto: (n) => (n === 'IA_CLAVE' ? (o.clave ?? 'clave-de-prueba') : ''),
      urlDeSupabase: 'https://x.supabase.co',
      claveAnonima: 'anon',
      fetch: async (url, init) => {
        llamadas.push({ url, body: init?.body, headers: init?.headers })
        const r = (ok: boolean, status: number, json: unknown) => ({ ok, status, json: async () => json })
        if (url.endsWith('/auth/v1/user')) return o.usuario === false ? r(false, 401, {}) : r(true, 200, { id: EQUIPO })
        if (url.includes('/rest/v1/perfiles')) return r(true, 200, [{ rol: o.rol ?? 'equipo' }])
        if (url.endsWith('/rest/v1/usos_ia')) return r(o.registroOk !== false, o.registroOk === false ? 500 : 201, {})
        if (url === URL_DE_LA_IA) return o.iaOk === false ? r(false, 500, {}) : r(true, 200, o.iaTexto ?? IA_OK)
        throw new Error(`url inesperada ${url}`)
      },
    }
    return { deps, llamadas }
  }

  it('sin sesión: 401 y no se llama a nada', async () => {
    const { deps, llamadas } = armar()
    expect(await atenderPedido(null, pedido, deps)).toEqual({ status: 401, cuerpo: { error: 'sin_sesion' } })
    expect(llamadas).toHaveLength(0)
    expect((await atenderPedido('jwt', pedido, armar({ usuario: false }).deps)).status).toBe(401)
  })
  it('una cuenta que no es del equipo: 403 y la IA no se llama', async () => {
    const { deps, llamadas } = armar({ rol: 'paseador' })
    expect(await atenderPedido('jwt', pedido, deps)).toEqual({ status: 403, cuerpo: { error: 'sin_permiso' } })
    expect(llamadas.some((l) => l.url === URL_DE_LA_IA)).toBe(false)
  })
  it('sin clave en los secretos: 503 «sin_clave», sin llamar a la IA ni registrar uso', async () => {
    const { deps, llamadas } = armar({ clave: '' })
    expect(await atenderPedido('jwt', pedido, deps)).toEqual({ status: 503, cuerpo: { error: 'sin_clave' } })
    expect(llamadas.some((l) => l.url === URL_DE_LA_IA || l.url.endsWith('/usos_ia'))).toBe(false)
  })
  it('un pedido que no sirve (sin respuestas, demasiadas o con un id raro): 400', async () => {
    const { deps } = armar()
    for (const malo of [null, {}, { ...pedido, respuestas: {} }, { ...pedido, paseadorId: 'x' }, { ...pedido, respuestas: { 'Mala Clave': 'x' } }, { ...pedido, respuestas: { q1: 'a'.repeat(1001) } }]) {
      expect((await atenderPedido('jwt', malo, deps)).status).toBe(400)
    }
    expect(validarPedido({ ...pedido, respuestas: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`q${i}`, 'x'])) })).toBeNull()
  })
  it('éxito: registra quién la usó ANTES de llamar a la IA, manda el texto sin datos personales y devuelve el texto fijo', async () => {
    const { deps, llamadas } = armar()
    const r = await atenderPedido('jwt-del-equipo', pedido, deps)
    expect(r.status).toBe(200)
    if (!('resumen' in r.cuerpo)) throw new Error('debía traer el resumen')
    expect(r.cuerpo.resumen).toEqual(['Dice que cuida.'])
    expect(r.cuerpo.aviso).toBe(TEXTO_FIJO_IA)
    const orden = llamadas.map((l) => l.url)
    expect(orden.indexOf('https://x.supabase.co/rest/v1/usos_ia')).toBeGreaterThan(-1)
    expect(orden.indexOf('https://x.supabase.co/rest/v1/usos_ia')).toBeLessThan(orden.indexOf(URL_DE_LA_IA))
    const registro = llamadas.find((l) => l.url.endsWith('/usos_ia'))!
    expect(JSON.parse(registro.body!)).toEqual({ equipo_id: EQUIPO, paseador_id: PASEADOR })
    expect(registro.headers?.Authorization).toBe('Bearer jwt-del-equipo')
    const aLaIa = llamadas.find((l) => l.url === URL_DE_LA_IA)!
    expect(aLaIa.body).not.toMatch(/Luc[ií]a|987654321|a@b\.com/)
    expect(JSON.parse(aLaIa.body!).model).toBe(MODELO_POR_DEFECTO)
    expect(aLaIa.headers?.['x-api-key']).toBe('clave-de-prueba')
  })
  it('si no se puede registrar el uso, no se llama a la IA', async () => {
    const { deps, llamadas } = armar({ registroOk: false })
    expect(await atenderPedido('jwt', pedido, deps)).toEqual({ status: 500, cuerpo: { error: 'registro' } })
    expect(llamadas.some((l) => l.url === URL_DE_LA_IA)).toBe(false)
  })
  it('si la IA falla o contesta algo raro: 502 con un motivo, sin inventar nada', async () => {
    expect((await atenderPedido('jwt', pedido, armar({ iaOk: false }).deps)).cuerpo).toEqual({ error: 'ia' })
    expect((await atenderPedido('jwt', pedido, armar({ iaTexto: { content: [{ type: 'text', text: 'hola' }] } }).deps)).cuerpo).toEqual({ error: 'respuesta' })
  })
  it('la clave nunca sale en lo que devuelve la función', async () => {
    const { deps } = armar({ clave: 'CLAVE-SECRETA-123' })
    expect(JSON.stringify(await atenderPedido('jwt', pedido, deps))).not.toContain('CLAVE-SECRETA-123')
  })
})

describe('IA de apoyo: la clave no está en el código', () => {
  function archivos(dir: string): string[] {
    const salida: string[] = []
    for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name)
      if (e.isDirectory()) salida.push(...archivos(rel))
      else if (/\.(ts|tsx|mjs|json|md|sql)$/.test(e.name)) salida.push(rel)
    }
    return salida
  }
  it('ningún archivo del proyecto lleva una clave de IA, y la app nunca lee IA_CLAVE (solo la función, con Deno.env)', () => {
    const malos: string[] = []
    for (const f of [...archivos('app'), ...archivos('components'), ...archivos('lib'), ...archivos('supabase'), ...archivos('docs'), 'package.json']) {
      const src = fs.readFileSync(path.join(RAIZ, f), 'utf8')
      if (/sk-ant-[\w-]{10,}|sk-[A-Za-z0-9]{20,}/.test(src)) malos.push(`${f}: parece una clave`)
      if (/IA_CLAVE/.test(src) && !/^supabase[\\/]functions[\\/]|^docs[\\/]|\.test\.tsx?$|^supabase[\\/]LEEME/.test(f)) malos.push(`${f}: nombra IA_CLAVE fuera de la función`)
    }
    expect(malos).toEqual([])
    expect(fs.readFileSync(path.join(RAIZ, 'supabase/functions/resumen-ia/index.ts'), 'utf8')).toMatch(/Deno\.env\.get/)
    expect(fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8')).toMatch(/\.env/)
  })
})

describe('IA de apoyo: la pantalla', () => {
  it('el botón está siempre y dice que se quitan los datos personales; el mensaje de «apagado» sale al apretarlo', () => {
    const h = renderToStaticMarkup(createElement(ResumenIa, { paseadorId: null, quiz: undefined, persona: { nombres: [] } }))
    expect(h).toContain('Resumen de apoyo con IA')
    expect(h).toContain('Antes de enviar se quitan el nombre, el DNI, el teléfono y el correo.')
    // Al principio no muestra ningún resultado ni mensaje: solo el botón y lo que se quita
    expect(h).not.toContain(TEXTO_FIJO_IA)
  })
  it('cada «no» de la función tiene su frase', () => {
    expect(textoDeMotivoIa('sin_clave')).toBe(TEXTO_IA.sinClave)
    expect(textoDeMotivoIa('sin_permiso')).toBe(TEXTO_IA.sinPermiso)
    expect(textoDeMotivoIa('sin_conexion')).toBe(TEXTO_IA.sinConexion)
    expect(textoDeMotivoIa('cualquier otra cosa')).toBe(TEXTO_IA.fallo)
  })
})
