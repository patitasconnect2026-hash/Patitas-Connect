/**
 * «Pedir paseo» con el cliente de Supabase de verdad por HTTP contra las migraciones reales en PGlite (sin red): la familia pide, el
 * paseador de su zona lo ve (solo la zona aproximada) y responde, la familia ve los números y elige, y el paseo nace aceptado.
 * Solo corre si PGlite está instalado (`npm i --no-save @electric-sql/pglite@0.2.17`).
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_ACCOUNT, DEMO_DOGS } from '../data'
import { crearPedido } from '../pedidos'
import { TEXTO_PEDIDO, textoContadores, textoDeMotivo } from '../pedidosTextos'
import { paseadoresDeVista } from './paseadoresReales'
import { argsDeCrear, ofertaDeFila, pedidoDeFila, pedidoParaPaseador } from './pedidosMapeo'
import { filaDeCasa, filaDePaseoNuevo, filaDePerro, uuidDe } from './paseosMapeo'
import { crearServidorHttp } from './pruebas/servidorHttp'
import { crearServidorPglite } from './pruebas/servidorPglite'
import type { ServidorDePrueba } from './pruebas/servidorFalso'
import { jobDeSolicitud } from './pruebas/telefonos'

const RAIZ = path.resolve(__dirname, '..', '..')
const FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000001'
const OTRA = 'aaaaaaaa-0000-4000-8000-000000000002'
const LUCIA = 'bbbbbbbb-0000-4000-8000-000000000001'
const MATEO = 'bbbbbbbb-0000-4000-8000-000000000002'
const EQUIPO = 'cccccccc-0000-4000-8000-000000000001'

const hayPglite = (await crearServidorPglite(RAIZ).then(
  async (s) => {
    await s?.cerrar()
    return s !== null
  },
  () => false,
)) as boolean

const abiertos: ServidorDePrueba[] = []
afterEach(async () => {
  await Promise.all(abiertos.splice(0).map((s) => s.cerrar()))
})

describe.skipIf(!hayPglite)('«Pedir paseo» · cliente de Supabase por HTTP sobre PGlite', () => {
  async function preparar() {
    const s = (await crearServidorHttp(RAIZ))!
    abiertos.push(s)
    await s.persona({ id: FAMILIA, rol: 'familia', nombre: 'Valeria' })
    await s.persona({ id: OTRA, rol: 'familia', nombre: 'Rosa' })
    await s.persona({ id: EQUIPO, rol: 'equipo', nombre: 'Equipo' })
    await s.paseadorAprobado({ id: LUCIA, nombre: 'Lucía', apellido: 'Quispe', cobro: { metodo: 'yape', celular: '987111222', titular: 'Lucía Quispe' } })
    await s.paseadorAprobado({ id: MATEO, nombre: 'Mateo', apellido: 'Rojas', cobro: { metodo: 'plin', celular: '987333444', titular: 'Mateo Rojas' }, perfil: { rate: 25, sizes: ['small'], spots: ['olivar'], disponible: false } })
    const fam = s.cliente(FAMILIA)
    const dog = DEMO_DOGS[0]
    await fam.guardarCasa(filaDeCasa({ ...DEMO_ACCOUNT, district: 'San Isidro' }, null, FAMILIA))
    await fam.guardarPerro(filaDePerro(dog, FAMILIA, uuidDe(`${FAMILIA}:${dog.id}`)))
    return { s, fam, dog }
  }
  const nuevo = (dog: (typeof DEMO_DOGS)[number], monto = 20) => {
    const r = crearPedido({ id: 'ped-1', dog, dayIdx: 1, startHour: 10, slotLabel: 'Mañana · 10:00 am', durationMin: 60, montoHora: monto, distrito: 'San Isidro', punto: DEMO_ACCOUNT.casa ?? null, ahora: Date.now() })
    if (!r.ok) throw new Error(r.motivo)
    return r.pedido
  }

  it('de punta a punta: pedir, ver (solo zona aproximada), responder, contar, elegir y que nazca el paseo aceptado', async () => {
    const { s, fam, dog } = await preparar()
    const familia = (await s.pedidos!(FAMILIA))!
    const lucia = (await s.pedidos!(LUCIA))!
    const mateo = (await s.pedidos!(MATEO))!
    const pedido = nuevo(dog)
    expect(await familia.crear({ ...argsDeCrear(pedido, FAMILIA, 15), dueno: 'Valeria' })).toMatchObject({ creado: true })
    expect(await familia.crear({ ...argsDeCrear({ ...pedido, id: 'ped-2' }, FAMILIA, 15), dueno: 'Valeria' })).toEqual({ creado: false, motivo: 'ya_tienes_pedido' })
    expect(textoDeMotivo('ya_tienes_pedido')).toBe(TEXTO_PEDIDO.yaTienes)

    // Lucía (San Isidro, disponible) lo ve; Mateo («no disponible») no. De la casa, solo una zona aproximada.
    const visto = (await lucia.abiertos()).map(pedidoParaPaseador)
    expect(visto).toHaveLength(1)
    expect(visto[0]).toMatchObject({ id: 'ped-1', dueno: 'Valeria', distrito: 'San Isidro', montoHora: 20 })
    expect(JSON.stringify(await lucia.abiertos())).not.toContain('punto_lat')
    expect((await mateo.abiertos()).length).toBe(0)
    expect(await mateo.ofertar('ped-1', 20)).toEqual({ ofertado: false, motivo: 'fuera_de_zona' })

    // Ella acepta al monto; no puede ofertar menos ni pasar el tope ni dos veces.
    expect(await lucia.ofertar('ped-1', 19)).toEqual({ ofertado: false, motivo: 'monto' })
    expect(await lucia.ofertar('ped-1', 35)).toEqual({ ofertado: false, motivo: 'monto' })
    expect(await lucia.ofertar('ped-1', 22)).toEqual({ ofertado: true })
    expect(await lucia.ofertar('ped-1', 20)).toEqual({ ofertado: false, motivo: 'ya_ofertaste' })

    // La familia ve la oferta y los números (solo cifras).
    const mio = await familia.miPedido()
    expect(mio.vistos).toBe(1)
    expect(mio.disponibles).toBe(1)
    expect(textoContadores(mio.vistos, mio.disponibles)).toBe('1 paseador lo vio · 1 disponible en tu zona')
    const p = pedidoDeFila(mio.pedido!, mio.ofertas, mio.vistos, mio.disponibles, [dog], FAMILIA)!
    expect(p.estado).toBe('con_ofertas')
    expect(p.ofertas).toHaveLength(1)
    expect(p.ofertas[0]).toMatchObject({ paseadorId: LUCIA, monto: 22, tipo: 'contraoferta', estado: 'enviada' })
    expect(ofertaDeFila(mio.ofertas[0])?.nombre).toBe('Lucía')
    // Otra familia no ve nada de esto.
    expect((await (await s.pedidos!(OTRA))!.miPedido()).pedido).toBeNull()

    // Elige: crea el paseo de siempre con el monto de la oferta y cierra el pedido.
    const w = paseadoresDeVista(await fam.paseadoresPublicos()).find((x) => x.id === LUCIA)!
    const { job } = jobDeSolicitud({ walker: { ...w, pricePerHour: 22 }, dog, hora: 10 })
    await fam.crearPaseo(filaDePaseoNuevo(job, FAMILIA, uuidDe(`${FAMILIA}:${dog.id}`))!)
    expect(await s.estadoDe(job.id)).toBe('solicitado')
    expect(await familia.elegir(p.ofertas[0].id, job.id)).toEqual({ elegido: true })
    expect(await s.estadoDe(job.id)).toBe('aceptado')
    expect(await familia.elegir(p.ofertas[0].id, job.id)).toMatchObject({ elegido: true, repetido: true })
    const despues = await familia.miPedido()
    expect(despues.pedido).toMatchObject({ estado: 'elegido', paseo_id: job.id })
    expect(despues.ofertas[0]).toMatchObject({ estado: 'elegida' })
    // Ya sin pedido activo, puede pedir otro.
    expect(await familia.crear({ ...argsDeCrear({ ...nuevo(dog), id: 'ped-3' }, FAMILIA, 15), dueno: 'Valeria' })).toMatchObject({ creado: true })
  }, 60_000)

  it('un pedido se puede cancelar y las reglas dicen «no» con un motivo (monto, hora, casa)', async () => {
    const { s, dog } = await preparar()
    const familia = (await s.pedidos!(FAMILIA))!
    const pedido = nuevo(dog)
    expect(await familia.crear({ ...argsDeCrear({ ...pedido, montoHora: 15 }, FAMILIA, 15), dueno: 'V' })).toEqual({ creado: false, motivo: 'monto' })
    expect(await familia.crear({ ...argsDeCrear({ ...pedido, inicioAt: Date.now() + 60_000 }, FAMILIA, 15), dueno: 'V' })).toEqual({ creado: false, motivo: 'hora' })
    const sinCasa = (await s.pedidos!(OTRA))!
    expect(await sinCasa.crear({ ...argsDeCrear(pedido, OTRA, 15), perroId: null, dueno: 'R' })).toEqual({ creado: false, motivo: 'sin_casa' })
    expect(await familia.crear({ ...argsDeCrear(pedido, FAMILIA, 15), dueno: 'V' })).toMatchObject({ creado: true })
    await familia.cancelar('ped-1')
    expect((await familia.miPedido()).pedido).toMatchObject({ estado: 'cancelado' })
    const lucia = (await s.pedidos!(LUCIA))!
    expect(await lucia.abiertos()).toEqual([])
  }, 60_000)
})
