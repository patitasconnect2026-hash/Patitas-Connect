/**
 * Las pantallas no deben notar si los datos están en el teléfono o en un servidor. Se corre el MISMO recorrido con el
 * adaptador de siempre (en memoria, que hace de localStorage) y con el de prueba (copia + subida con retraso), y se
 * compara lo que se lee en cada paso y lo que queda al final.
 */
import { describe, expect, it } from 'vitest'
import {
  abrirCasoEnCola,
  adaptadorDePrueba,
  adaptadorMemoria,
  CLAVES,
  empaquetarPaseos,
  guardarCuenta,
  guardarPostulacion,
  leerCasos,
  leerCuenta,
  leerPostulacion,
  leerVistasDni,
  normalizarPaseos,
  registrarVistaDni,
  type Adaptador,
} from './index'
import { EMPTY } from '../store'
import { EMPTY_APP } from '../walkerStore'
import { casoEntregaSinConfirmar } from '../casos'
import { nuevoPaseo } from '../paseo'
import { nuevoPago, agregarPago, normalizarPagos, type Pago } from '../pagos'
import type { Job } from '../bus'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const job: Job = {
  id: 'job-1',
  walkerFirst: 'Carlos',
  walkerId: 'carlos',
  ownerFirst: 'Valeria',
  dog: { name: 'Max', breed: 'Golden', size: 'large', fur: '', shape: '', notes: '', medical: '', vet: '', temperament: [], sociable: true, vaccinated: true },
  slotLabel: 'Hoy · 10:00 am',
  durationMin: 60,
  pin: '4827',
  handoff: 'door',
  doormanName: '',
  address: 'Calle · San Isidro',
  groupDogs: 0,
  groupSize: 'large',
  walkerPay: 20,
  createdAt: T0,
  paseo: nuevoPaseo(T0),
}

/** El recorrido: devuelve, paso a paso, lo que «vería» una pantalla. */
function recorrido(a: Adaptador): unknown[] {
  const vistas: unknown[] = []
  vistas.push(leerCuenta(a))
  guardarCuenta(a, { ...EMPTY, applied: true, favs: ['carlos'] })
  vistas.push(leerCuenta(a))
  vistas.push(leerPostulacion(a))
  guardarPostulacion(a, { ...EMPTY_APP, code: 'PAT-AB12', createdAt: '2026-10-10T00:00:00.000Z' })
  vistas.push(leerPostulacion(a)?.code)
  a.guardar(CLAVES.paseo, empaquetarPaseos([job], 1))
  vistas.push(normalizarPaseos(a.leer<unknown>(CLAVES.paseo, null)).map((j) => j.id))
  a.guardar(CLAVES.chat, [{ id: 'm1', from: 'owner', text: 'Hola', at: T0 }])
  a.guardar(CLAVES.chat, [...a.leer<unknown[]>(CLAVES.chat, []), { id: 'm2', from: 'walker', text: 'Ya voy', at: T0 + 1 }])
  vistas.push(a.leer<unknown[]>(CLAVES.chat, []).length)
  const pago: Pago = nuevoPago({ jobId: 'job-1', walkerId: 'carlos', paseador: 'Carlos', dueno: 'Valeria', perro: 'Max', cuando: 'Hoy', reserva: { walkPrice: 25, discount: 0, total: 25, comision: 5, neto: 20 }, at: T0, paseo: 'solicitado' })
  a.guardar(CLAVES.pagos, agregarPago(normalizarPagos(a.leer<unknown>(CLAVES.pagos, [])), pago))
  vistas.push(normalizarPagos(a.leer<unknown>(CLAVES.pagos, [])).map((p) => [p.id, p.estado, p.monto]))
  abrirCasoEnCola(a, casoEntregaSinConfirmar(job, T0 + 5, null))
  vistas.push(leerCasos(a).map((c) => [c.id, c.tipo]))
  registrarVistaDni(a, 'carlos', new Date(T0))
  vistas.push(leerVistasDni(a, 'carlos').length)
  a.borrar(CLAVES.paseo)
  vistas.push(normalizarPaseos(a.leer<unknown>(CLAVES.paseo, null)))
  return vistas
}

describe('local y el adaptador de prueba dan el mismo resultado', () => {
  it('en cada paso, lo que se lee es igual (la copia en memoria responde al instante)', () => {
    const local = adaptadorMemoria()
    const prueba = adaptadorDePrueba({ retrasoMs: 5 })
    expect(recorrido(prueba)).toEqual(recorrido(local))
    prueba.detener()
  })

  it('al final, el servidor de prueba tiene lo mismo que guardó el teléfono', async () => {
    const local = adaptadorMemoria()
    const prueba = adaptadorDePrueba({ retrasoMs: 5 })
    recorrido(local)
    recorrido(prueba)
    expect(await prueba.yaSeGuardo()).toBe('guardado')
    const guardadoLocal: Record<string, unknown> = {}
    for (const [k, v] of local.datos) guardadoLocal[k] = JSON.parse(v)
    expect(prueba.remoto.contenido()).toEqual(guardadoLocal)
    prueba.detener()
  })

  it('una pestaña nueva (otra copia) baja lo mismo que había', async () => {
    const primero = adaptadorDePrueba({ retrasoMs: 5 })
    recorrido(primero)
    await primero.yaSeGuardo()
    const segundo = adaptadorDePrueba({ retrasoMs: 5, inicial: primero.remoto.contenido() })
    await segundo.alEstarListo()
    expect(leerCuenta(segundo)).toEqual(leerCuenta(primero))
    expect(leerCasos(segundo)).toEqual(leerCasos(primero))
    primero.detener()
    segundo.detener()
  })
})
