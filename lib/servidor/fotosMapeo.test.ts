import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import type { FotoPaseo } from '../fotos'
import { claveSelfie, diaDeLima } from '../selfie'
import { fotoDeFila, fotosDeFilas, fotosPorSubir, filaDeFoto, idRemotoDeFoto, LIMITE_BYTES_ALMACEN, mezclarFotos, rutaDeFoto, SEGUNDOS_DEL_ENLACE, TIPOS_DEL_ALMACEN, ubicacionParaServidor } from './fotosMapeo'

const LUCIA = 'bbbbbbbb-0000-4000-8000-000000000001'
const T = Date.UTC(2026, 9, 14, 15, 30, 0)
const foto = (p: Partial<FotoPaseo> = {}): FotoPaseo => ({ id: 'f1', jobId: 'p-1', t: T, codigo: '47', ubicacion: null, sinUbicacion: 'omitida', bytes: 2048, almacen: 'indexeddb', ...p })
const selfie = (p: Partial<FotoPaseo> = {}): FotoPaseo => foto({ id: 's1', jobId: claveSelfie(LUCIA, diaDeLima(T)), codigo: '', ...p })

describe('el almacén privado: lo que declara la migración y lo que usa la app es lo mismo', () => {
  const sql = readFileSync(join(__dirname, '..', '..', 'supabase', 'migrations', '20261014120200_fotos_almacen.sql'), 'utf8')
  it('el tope de 1 MB', () => {
    expect(LIMITE_BYTES_ALMACEN).toBe(1_048_576)
    expect(sql).toContain(`false, ${LIMITE_BYTES_ALMACEN},`)
  })
  it('es privado y solo recibe imágenes', () => {
    expect(sql).toMatch(/values \('fotos', 'fotos', false,/)
    for (const t of TIPOS_DEL_ALMACEN) expect(sql).toContain(`'${t}'`)
  })
  it('lo que saca la cámara cabe de sobra: los topes de la configuración están por debajo de 1 MB', () => {
    expect(CONFIG.pesoMaximoFotoKB * 1024).toBeLessThan(LIMITE_BYTES_ALMACEN)
  })
  it('los enlaces para ver las fotos duran poco (minutos, no horas ni días)', () => {
    expect(SEGUNDOS_DEL_ENLACE).toBeGreaterThanOrEqual(30)
    expect(SEGUNDOS_DEL_ENLACE).toBeLessThanOrEqual(600)
  })
})

describe('de la foto del teléfono a la fila y a la ruta', () => {
  it('el id de la fila sale siempre igual de la misma foto (subirla dos veces no la duplica) y es un uuid', () => {
    expect(idRemotoDeFoto('f1')).toBe(idRemotoDeFoto('f1'))
    expect(idRemotoDeFoto('f1')).not.toBe(idRemotoDeFoto('f2'))
    expect(idRemotoDeFoto('f1')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('las rutas son las carpetas que piden las reglas: paseo/<paseo>/ y hoy/<paseador>/', () => {
    expect(rutaDeFoto(foto(), LUCIA)).toBe(`paseo/p-1/${idRemotoDeFoto('f1')}.jpg`)
    expect(rutaDeFoto(selfie(), LUCIA)).toBe(`hoy/${LUCIA}/${idRemotoDeFoto('s1')}.jpg`)
  })

  it('una foto del paseo: hora, código, lugar y peso', () => {
    const f = filaDeFoto(foto({ sinUbicacion: undefined, ubicacion: { pos: [-12.1, -77.03], lecturaT: T - 60_000 } }), LUCIA)
    expect(f).toMatchObject({ tipo: 'paseo', paseo_id: 'p-1', paseador_id: LUCIA, dia: null, en: new Date(T).toISOString(), codigo: '47', lat: -12.1, lng: -77.03, sin_ubicacion: null, bytes: 2048 })
    expect(f.ruta).toBe(rutaDeFoto(foto(), LUCIA))
  })

  it('la foto de hoy: tipo «hoy», sin paseo, con el día en hora de Lima y sin código', () => {
    const f = filaDeFoto(selfie(), LUCIA)
    expect(f).toMatchObject({ tipo: 'hoy', paseo_id: null, paseador_id: LUCIA, dia: diaDeLima(T), codigo: '', sin_ubicacion: 'omitida' })
  })

  it('sin ubicación: se anota el motivo (el mismo de siempre)', () => {
    expect(filaDeFoto(foto({ sinUbicacion: 'negada' }), LUCIA)).toMatchObject({ lat: null, lng: null, sin_ubicacion: 'negada' })
    expect(filaDeFoto(foto({ sinUbicacion: undefined }), LUCIA)).toMatchObject({ sin_ubicacion: 'sin_lectura' })
  })

  it('una lectura de ubicación vieja o de demostración NO se sube como lugar de la foto', () => {
    const vieja = ubicacionParaServidor(foto({ sinUbicacion: undefined, ubicacion: { pos: [-12.1, -77.03], lecturaT: T - (CONFIG.minutosUbicacionVieja + 1) * 60_000 } }))
    expect(vieja).toEqual({ lat: null, lng: null, precision_m: null, sin_ubicacion: 'sin_lectura' })
    const demo = ubicacionParaServidor(foto({ sinUbicacion: undefined, ubicacion: { pos: [-12.1, -77.03], lecturaT: T, demo: true } }))
    expect(demo).toEqual({ lat: null, lng: null, precision_m: null, sin_ubicacion: 'sin_lectura' })
    const reciente = ubicacionParaServidor(foto({ sinUbicacion: undefined, ubicacion: { pos: [-12.1, -77.03], lecturaT: T - (CONFIG.minutosUbicacionVieja - 1) * 60_000 } }))
    expect(reciente).toMatchObject({ lat: -12.1, lng: -77.03, sin_ubicacion: null })
  })

  it('la precisión de la lectura (metros) viaja con el lugar; sin ella, null', () => {
    const con = ubicacionParaServidor(foto({ sinUbicacion: undefined, ubicacion: { pos: [-12.1, -77.03], lecturaT: T, precisionM: 18.46 } }))
    expect(con).toMatchObject({ lat: -12.1, lng: -77.03, precision_m: 18.5 })
    expect(ubicacionParaServidor(foto({ sinUbicacion: undefined, ubicacion: { pos: [-12.1, -77.03], lecturaT: T } })).precision_m).toBeNull()
  })
})

describe('de la fila a la foto de la app', () => {
  const fila = { id: idRemotoDeFoto('f1'), tipo: 'paseo', paseo_id: 'p-1', paseador_id: LUCIA, dia: null, en: new Date(T).toISOString(), codigo: '47', lat: -12.1, lng: -77.03, sin_ubicacion: null, bytes: 2048, ruta: 'paseo/p-1/x.jpg' }

  it('trae lo que la pantalla necesita y marca que viene del servidor (sin los bytes)', () => {
    const f = fotoDeFila(fila)!
    expect(f).toMatchObject({ id: fila.id, jobId: 'p-1', t: T, codigo: '47', bytes: 2048, almacen: 'servidor', ruta: 'paseo/p-1/x.jpg' })
    expect(f.ubicacion).toEqual({ pos: [-12.1, -77.03], lecturaT: T })
    expect(JSON.stringify(f)).not.toMatch(/https?:|token|signed/)
  })

  it('la foto de hoy vuelve con el «paseo» propio del paseador y el día (así la lee `selfieDeHoy`)', () => {
    const f = fotoDeFila({ ...fila, tipo: 'hoy', paseo_id: null, dia: diaDeLima(T), codigo: '', lat: null, lng: null, sin_ubicacion: 'omitida', ruta: `hoy/${LUCIA}/x.jpg` })!
    expect(f.jobId).toBe(claveSelfie(LUCIA, diaDeLima(T)))
    expect(f).toMatchObject({ ubicacion: null, sinUbicacion: 'omitida' })
  })

  it('una fila que no se entiende se descarta (nunca lanza)', () => {
    expect(fotoDeFila({ ...fila, ruta: '' })).toBeNull()
    expect(fotoDeFila({ ...fila, en: 'ayer' })).toBeNull()
    expect(fotoDeFila({ ...fila, tipo: 'chat' })).toBeNull()
    expect(fotoDeFila({ ...fila, tipo: 'paseo', paseo_id: '' })).toBeNull()
    expect(fotoDeFila({ ...fila, tipo: 'hoy', paseo_id: null, dia: null })).toBeNull()
    expect(fotosDeFilas([fila, { x: 1 }, { ...fila, ruta: '' }])).toHaveLength(1)
  })

  it('sin coordenadas: dice por qué (o «sin lectura» si la base no lo sabe)', () => {
    expect(fotoDeFila({ ...fila, lat: null, lng: null, sin_ubicacion: 'negada' })).toMatchObject({ ubicacion: null, sinUbicacion: 'negada' })
    expect(fotoDeFila({ ...fila, lat: null, lng: null, sin_ubicacion: null })).toMatchObject({ ubicacion: null, sinUbicacion: 'sin_lectura' })
  })
})

describe('qué se ve y qué falta por enviar', () => {
  const remota = (id: string): FotoPaseo => ({ ...foto({ id, almacen: 'servidor' }), ruta: `paseo/p-1/${id}.jpg` })

  it('una foto que ya subió se ve una sola vez (gana la del teléfono, que se ve sin internet)', () => {
    const locales = [foto({ id: 'f1' })]
    const vistas = mezclarFotos(locales, [remota(idRemotoDeFoto('f1')), remota('otra')])
    expect(vistas.map((f) => f.id)).toEqual(['f1', 'otra'])
    expect(vistas[0].almacen).toBe('indexeddb')
  })

  it('sin fotos del servidor, es la lista de siempre (la misma, sin copiar)', () => {
    const locales = [foto()]
    expect(mezclarFotos(locales, [])).toBe(locales)
  })

  it('por enviar: solo lo que la base no tiene, de la más vieja a la más nueva', () => {
    const a = foto({ id: 'a', t: T + 2 })
    const b = foto({ id: 'b', t: T + 1 })
    const c = foto({ id: 'c', t: T })
    const r = fotosPorSubir([a, b, c], { enBase: new Set([idRemotoDeFoto('c')]), paseosDelPaseador: new Set(['p-1']), paseadorId: LUCIA })
    expect(r.map((f) => f.id)).toEqual(['b', 'a'])
  })

  it('por enviar: solo las de paseos que ya existen en la base y son de esta paseadora; no las de otro paseo ni las de la demostración', () => {
    const suyas = foto({ id: 'suya', jobId: 'p-1' })
    const ajena = foto({ id: 'ajena', jobId: 'p-9' })
    const r = fotosPorSubir([suyas, ajena], { enBase: new Set(), paseosDelPaseador: new Set(['p-1']), paseadorId: LUCIA })
    expect(r.map((f) => f.id)).toEqual(['suya'])
  })

  it('por enviar: la foto de hoy solo es de SU dueña, y las que ya vienen del servidor no se vuelven a subir', () => {
    const miSelfie = selfie({ id: 's-mia' })
    const deOtra = selfie({ id: 's-otra', jobId: claveSelfie('otra-persona', diaDeLima(T)) })
    const r = fotosPorSubir([miSelfie, deOtra, remota('x')], { enBase: new Set(), paseosDelPaseador: new Set(['p-1']), paseadorId: LUCIA })
    expect(r.map((f) => f.id)).toEqual(['s-mia'])
  })
})
