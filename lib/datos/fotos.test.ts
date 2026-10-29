import { describe, expect, it } from 'vitest'
import { codigoDeFotos } from '../fotos'
import { adaptadorMemoria, type Adaptador } from './adaptador'
import { CLAVES } from './claves'
import {
  alCambiarFotos,
  almacenMemoria,
  borrarTodasLasFotos,
  conservarFotosDe,
  esEspacioLleno,
  guardarFoto,
  leerFotos,
  type AlmacenFotos,
  type EntradaFoto,
} from './fotos'

const bytes = (n: number) => new Uint8Array(n).fill(7).buffer
const entrada = (p: Partial<EntradaFoto> = {}): EntradaFoto => ({
  jobId: 'job1',
  bytes: bytes(1000),
  t: 1_700_000_000_000,
  codigo: codigoDeFotos('job1'),
  ubicacion: null,
  sinUbicacion: 'negada',
  ...p,
})

describe('guardar una foto', () => {
  it('guarda los bytes en el almacén y los datos en la lista', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria()
    const r = await guardarFoto({ adaptador, almacen }, entrada(), { id: 'f1' })
    expect(r.ok).toBe(true)
    expect(almacen.datos.get('f1')?.bytes.byteLength).toBe(1000)
    const lista = leerFotos(adaptador)
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ id: 'f1', jobId: 'job1', sinUbicacion: 'negada', bytes: 1000, almacen: 'memoria' })
    // la imagen NO viaja en la lista de datos (pesa)
    expect(JSON.stringify(adaptador.datos.get(CLAVES.fotos))).not.toMatch(/base64|data:image/)
  })

  it('con ubicación: la guarda; sin ubicación: anota por qué', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria()
    await guardarFoto({ adaptador, almacen }, entrada({ ubicacion: { pos: [-12.1, -77.03], lecturaT: 5 }, sinUbicacion: undefined }), { id: 'a' })
    await guardarFoto({ adaptador, almacen }, entrada({ sinUbicacion: 'omitida' }), { id: 'b' })
    const [a, b] = leerFotos(adaptador)
    expect(a.ubicacion).toEqual({ pos: [-12.1, -77.03], lecturaT: 5 })
    expect(a.sinUbicacion).toBeUndefined()
    expect(b.ubicacion).toBeNull()
    expect(b.sinUbicacion).toBe('omitida')
  })
})

describe('tope de fotos por paseo', () => {
  it('con el tope lleno no se guarda otra y no queda nada a medias', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria()
    for (let i = 0; i < 3; i++) expect((await guardarFoto({ adaptador, almacen }, entrada(), { id: `f${i}`, tope: 3 })).ok).toBe(true)
    const r = await guardarFoto({ adaptador, almacen }, entrada(), { id: 'extra', tope: 3 })
    expect(r).toEqual({ ok: false, error: 'tope' })
    expect(leerFotos(adaptador)).toHaveLength(3)
    expect(almacen.datos.has('extra')).toBe(false)
  })

  it('el tope es por paseo: otro paseo todavía puede sacar fotos', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria()
    for (let i = 0; i < 2; i++) await guardarFoto({ adaptador, almacen }, entrada(), { id: `f${i}`, tope: 2 })
    const r = await guardarFoto({ adaptador, almacen }, entrada({ jobId: 'job2' }), { id: 'g', tope: 2 })
    expect(r.ok).toBe(true)
  })
})

describe('almacenamiento lleno', () => {
  it('si no cabe la imagen: «lleno», lo anterior sigue y el paseo no se toca', async () => {
    const paseo = { id: 'job1', paseo: { estado: 'en_paseo', eventos: [] } }
    const adaptador = adaptadorMemoria({ [CLAVES.paseo]: paseo })
    const almacen = almacenMemoria({ capacidadBytes: 1500 })
    expect((await guardarFoto({ adaptador, almacen }, entrada(), { id: 'f1' })).ok).toBe(true)
    const r = await guardarFoto({ adaptador, almacen }, entrada(), { id: 'f2' })
    expect(r).toEqual({ ok: false, error: 'lleno' })
    expect(leerFotos(adaptador).map((f) => f.id)).toEqual(['f1'])
    expect(almacen.datos.has('f2')).toBe(false)
    expect(almacen.datos.has('f1')).toBe(true)
    // el encargo quedó exactamente igual
    expect(adaptador.leer(CLAVES.paseo, null)).toEqual(paseo)
  })

  it('si lo que no cabe es la lista de datos (localStorage lleno): se deshace y dice «lleno»', async () => {
    const base = adaptadorMemoria()
    // un localStorage que se llenó: escribe todo menos la lista de fotos, sin avisar
    const lleno: Adaptador = { ...base, guardar: (clave, valor) => (clave === CLAVES.fotos ? undefined : base.guardar(clave, valor)) }
    const almacen = almacenMemoria()
    const r = await guardarFoto({ adaptador: lleno, almacen }, entrada(), { id: 'f1' })
    expect(r).toEqual({ ok: false, error: 'lleno' })
    expect(almacen.datos.size).toBe(0) // no quedó la imagen huérfana
    expect(leerFotos(lleno)).toEqual([])
  })

  it('un error del almacén que no es «lleno» se dice como «error»', async () => {
    const roto: AlmacenFotos = { ...almacenMemoria(), guardar: async () => ({ ok: false, motivo: 'error' }) }
    const r = await guardarFoto({ adaptador: adaptadorMemoria(), almacen: roto }, entrada())
    expect(r).toEqual({ ok: false, error: 'error' })
  })

  it('reconoce «no hay espacio» con los nombres que usan los navegadores', () => {
    expect(esEspacioLleno(new DOMException('lleno', 'QuotaExceededError'))).toBe(true)
    expect(esEspacioLleno({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true)
    expect(esEspacioLleno({ code: 22 })).toBe(true)
    expect(esEspacioLleno(new Error('otra cosa'))).toBe(false)
    expect(esEspacioLleno(null)).toBe(false)
  })
})

describe('limpiar', () => {
  it('al empezar otro paseo solo quedan las fotos de los paseos que se conservan', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria()
    await guardarFoto({ adaptador, almacen }, entrada({ jobId: 'viejo' }), { id: 'v1' })
    await guardarFoto({ adaptador, almacen }, entrada({ jobId: 'nuevo' }), { id: 'n1' })
    await conservarFotosDe({ adaptador, almacen }, ['nuevo'])
    expect(leerFotos(adaptador).map((f) => f.id)).toEqual(['n1'])
    expect([...almacen.datos.keys()]).toEqual(['n1'])
  })

  it('reiniciar la demostración deja todo vacío', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria()
    await guardarFoto({ adaptador, almacen }, entrada(), { id: 'a' })
    await borrarTodasLasFotos({ adaptador, almacen })
    expect(leerFotos(adaptador)).toEqual([])
    expect(almacen.datos.size).toBe(0)
  })
})

describe('avisar de un cambio en esta pestaña', () => {
  it('guardar, limpiar y borrar avisan a quien mira la lista (el evento «storage» no avisa a la propia pestaña)', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria()
    let avisos = 0
    const baja = alCambiarFotos(() => avisos++)
    await guardarFoto({ adaptador, almacen }, entrada(), { id: 'a' })
    expect(avisos).toBe(1)
    await conservarFotosDe({ adaptador, almacen }, ['job1'])
    expect(avisos).toBe(2)
    await borrarTodasLasFotos({ adaptador, almacen })
    expect(avisos).toBe(3)
    baja()
    await guardarFoto({ adaptador, almacen }, entrada(), { id: 'b' })
    expect(avisos).toBe(3)
  })

  it('una foto que no se pudo guardar no avisa de nada', async () => {
    const adaptador = adaptadorMemoria()
    const almacen = almacenMemoria({ capacidadBytes: 10 })
    let avisos = 0
    const baja = alCambiarFotos(() => avisos++)
    const r = await guardarFoto({ adaptador, almacen }, entrada(), { id: 'x' })
    expect(r.ok).toBe(false)
    expect(avisos).toBe(0)
    baja()
  })
})
