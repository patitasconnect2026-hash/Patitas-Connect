import { describe, expect, it } from 'vitest'
import {
  abiertos,
  abrirCaso,
  casoDePago,
  casoDeReporte,
  casoEntregaSinConfirmar,
  MAX_TEXTO_REPORTE,
  MOTIVOS,
  resolverCaso,
  resueltos,
  validarReporte,
  type Reporte,
} from './casos'
import { confirmarEntregaJob, moverPaseo, reportarJob, resolverJob, type Job } from './bus'
import { nuevoPago } from './pagos'
import { entregaConfirmada, entregaSinConfirmar, esFinal, nuevoPaseo, tocaRecordatorio } from './paseo'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000
const HORA = 60 * MIN

function jobNuevo(): Job {
  return {
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
    walkerPay: 25,
    createdAt: T0,
    paseo: nuevoPaseo(T0),
  }
}

/** El pago de ese paseo en el libro de pagos (lib/pagos.ts): 25 soles que paga la familia, 5 de comisión, 20 para el paseador. */
const pagoDelJob = () =>
  nuevoPago({
    jobId: 'job-1',
    walkerId: 'carlos',
    paseador: 'Carlos',
    dueno: 'Valeria',
    perro: 'Max',
    cuando: 'Hoy · 10:00 am',
    reserva: { walkPrice: 25, discount: 0, total: 25, comision: 5, neto: 20 },
    at: T0,
    paseo: 'solicitado',
  })

/** Lleva el encargo hasta «entregado» (el paseador ya entregó al perro). */
function hastaEntregado(): Job {
  let j: Job | null = jobNuevo()
  let t = T0
  for (const a of ['aceptar', 'salir', 'recoger', 'entregar'] as const) {
    t += MIN
    j = moverPaseo(j, a, 'paseador', t)
  }
  return j!
}

const horaDeEntrega = (j: Job) => j.paseo.eventos.find((e) => e.accion === 'entregar')!.at

describe('reportes', () => {
  it('pide un motivo y un texto corto', () => {
    expect(validarReporte({ motivo: null, texto: 'algo pasó' })).toMatch(/Elige/)
    expect(validarReporte({ motivo: 'pago', texto: '  ' })).toMatch(/pocas palabras/)
    expect(validarReporte({ motivo: 'pago', texto: 'x'.repeat(MAX_TEXTO_REPORTE + 1) })).toMatch(/Máximo/)
    expect(validarReporte({ motivo: 'entrega', texto: 'No me entregaron a Max.' })).toBeNull()
  })

  it('los motivos son pago, entrega, trato y otro', () => {
    expect(MOTIVOS.map((m) => m.id)).toEqual(['pago', 'entrega', 'trato', 'otro'])
  })

  it('un caso no se repite mientras está abierto', () => {
    const r: Reporte = { quien: 'dueno', motivo: 'trato', texto: 'Trato brusco', at: T0 }
    const j = jobNuevo()
    const c = casoDeReporte(j, r)
    const cola = abrirCaso(abrirCaso([], c), c)
    expect(cola).toHaveLength(1)
    expect(abiertos(cola)).toHaveLength(1)
  })

  it('el equipo resuelve con una nota obligatoria', () => {
    const c = casoEntregaSinConfirmar(hastaEntregado(), T0 + 20 * MIN)
    const cola = abrirCaso([], c)
    expect(resolverCaso(cola, c.id, 'cerrado', '  ', T0).ok).toBe(false)
    const r = resolverCaso(cola, c.id, 'cerrado', 'Valeria avisó por WhatsApp que sí lo recibió.', T0 + HORA)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(resueltos(r.casos)).toHaveLength(1)
      expect(abiertos(r.casos)).toHaveLength(0)
      // ya resuelto: no se resuelve dos veces
      expect(resolverCaso(r.casos, c.id, 'cerrado', 'otra nota', T0 + 2 * HORA).ok).toBe(false)
    }
    expect(resolverCaso(cola, 'no-existe', 'cerrado', 'nota', T0).ok).toBe(false)
  })
})

describe('un reporte siempre termina (nadie queda esperando para siempre)', () => {
  const r: Reporte = { quien: 'dueno', motivo: 'otro', texto: 'Algo pasó', at: T0 + 10 * MIN }

  it('las dos resoluciones posibles dejan el paseo en un estado final', () => {
    const d = reportarJob(hastaEntregado(), r)!
    const caso = casoDeReporte(d, r)
    for (const como of ['cerrado', 'cancelado'] as const) {
      const j = resolverJob(d, caso, como, 'Se revisó con las dos partes.', T0 + HORA)!
      expect(esFinal(j.paseo.estado), como).toBe(true)
    }
  })

  it('sin la nota del equipo el paseo en disputa no cambia', () => {
    const d = reportarJob(hastaEntregado(), r)!
    expect(resolverJob(d, casoDeReporte(d, r), 'cerrado', '   ', T0 + HORA)).toBe(d)
  })

  it('el caso guarda el monto, cómo iba el pago y el registro para que el equipo decida', () => {
    const d = reportarJob(hastaEntregado(), r)!
    const pago = { ...pagoDelJob(), estado: 'visto' as const }
    const c = casoDeReporte(d, r, pago)
    expect(c.monto).toBe(25)
    expect(c.pagoEstado).toBe('visto')
    expect(c.registro?.map((e) => e.accion)).toContain('reportar')
  })

  it('sin un pago en el libro, el caso lo dice (no inventa un estado)', () => {
    const d = reportarJob(hastaEntregado(), r)!
    expect(casoDeReporte(d, r).pagoEstado).toBe('sin_registro')
  })
})

describe('caminos del paseo', () => {
  it('feliz: entrega con código y «Recibí a» → cerrado (el pago ya se verificó antes y se paga aparte)', () => {
    let j = hastaEntregado()
    expect(j.paseo.estado).toBe('entregado')
    j = confirmarEntregaJob(j, T0 + 10 * MIN)!
    expect(j.paseo.estado).toBe('cerrado')
    expect(j.paseo.eventos.map((e) => e.accion)).toEqual(['solicitar', 'aceptar', 'salir', 'recoger', 'entregar', 'confirmar_entrega', 'cerrar'])
  })

  it('el dueño no confirma: recordatorio, queda «sin confirmar» y NO se cierra solo', () => {
    let j = hastaEntregado()
    const entregada = horaDeEntrega(j)
    expect(tocaRecordatorio(j.paseo, entregada + 14 * MIN, 15)).toBe(false)
    expect(tocaRecordatorio(j.paseo, entregada + 15 * MIN, 15)).toBe(true)
    j = moverPaseo(j, 'recordar', 'sistema', entregada + 15 * MIN)!
    expect(entregaSinConfirmar(j.paseo, entregada + 3 * 24 * HORA, 15)).toBe(true)
    expect(j.paseo.estado).toBe('entregado')
    expect(entregaConfirmada(j.paseo)).toBe(false)
    // aunque pase mucho tiempo, no se cierra sin la confirmación del dueño
    expect(j.paseo.estado).toBe('entregado')
    // el sistema no puede cerrarla sin nota; el equipo sí, dejando una nota
    expect(moverPaseo(j, 'cerrar', 'sistema', entregada + 2 * HORA)).toBe(j)
    const cerrado = resolverJob(j, { tipo: 'entrega_sin_confirmar' }, 'cerrado', 'Se habló con Valeria.', entregada + 2 * HORA)!
    expect(cerrado.paseo.estado).toBe('cerrado')
    expect(cerrado.paseo.eventos[cerrado.paseo.eventos.length - 1].nota).toBe('Se habló con Valeria.')
  })

  it('disputa por pago: la familia dice que pagó, el equipo no lo ve; reporta y el equipo resuelve', () => {
    let j = hastaEntregado()
    j = confirmarEntregaJob(j, T0 + 10 * MIN)!
    const r: Reporte = { quien: 'dueno', motivo: 'pago', texto: 'Ya pagué por Yape y no lo encuentran.', at: T0 + 30 * HORA }
    const d = reportarJob(hastaEntregado(), r)!
    expect(d.paseo.estado).toBe('en_disputa')
    expect(d.reporte).toEqual(r)
    const caso = casoDeReporte(d, r, { ...pagoDelJob(), estado: 'no_encontrado' })
    expect(caso.tipo).toBe('disputa')
    expect(caso.pagoEstado).toBe('no_encontrado')
    const resuelto = resolverJob(d, caso, 'cerrado', 'Valeria pagó por Yape; se vio la captura.', T0 + 32 * HORA)!
    expect(resuelto.paseo.estado).toBe('cerrado')
    expect(j.paseo.estado).toBe('cerrado')
  })

  it('disputa por entrega: el dueño reporta mientras pasea y el equipo anula', () => {
    let j: Job | null = jobNuevo()
    for (const [a, q] of [['aceptar', 'paseador'], ['salir', 'paseador'], ['recoger', 'paseador']] as const) j = moverPaseo(j, a, q, T0 + MIN)
    const r: Reporte = { quien: 'dueno', motivo: 'entrega', texto: 'No me devolvieron a Max.', at: T0 + 2 * MIN }
    const d = reportarJob(j, r)!
    expect(d.paseo.estado).toBe('en_disputa')
    const anulado = resolverJob(d, { tipo: 'disputa' }, 'cancelado', 'El paseo no se completó.', T0 + HORA)!
    expect(anulado.paseo.estado).toBe('cancelado')
  })

  it('no se reporta una solicitud (se cancela) ni un paseo ya cerrado, ni dos veces', () => {
    const r: Reporte = { quien: 'dueno', motivo: 'otro', texto: 'Algo pasó', at: T0 + 10 * MIN }
    const solicitud = jobNuevo()
    expect(reportarJob(solicitud, r)).toBe(solicitud)
    let j = hastaEntregado()
    j = confirmarEntregaJob(j, T0 + 10 * MIN)!
    expect(j.paseo.estado).toBe('cerrado')
    expect(reportarJob(j, { ...r, at: T0 + 13 * MIN })).toBe(j)
    const d = reportarJob(hastaEntregado(), { ...r, at: T0 + 10 * MIN })!
    expect(reportarJob(d, { ...r, quien: 'paseador', at: T0 + 11 * MIN })).toBe(d)
  })

  it('cancelación: el dueño cancela la solicitud; el paseador cancela un paseo aceptado; en paseo ya no', () => {
    expect(moverPaseo(jobNuevo(), 'cancelar', 'dueno', T0 + MIN)!.paseo.estado).toBe('cancelado')
    const aceptado = moverPaseo(jobNuevo(), 'aceptar', 'paseador', T0 + MIN)!
    expect(moverPaseo(aceptado, 'cancelar', 'paseador', T0 + 2 * MIN)!.paseo.estado).toBe('cancelado')
    const enPaseo = moverPaseo(moverPaseo(aceptado, 'salir', 'paseador', T0 + 2 * MIN), 'recoger', 'paseador', T0 + 3 * MIN)!
    expect(moverPaseo(enPaseo, 'cancelar', 'dueno', T0 + 4 * MIN)).toBe(enPaseo)
    // y lo cancelado ya no se mueve
    const cancelado = moverPaseo(jobNuevo(), 'cancelar', 'dueno', T0 + MIN)!
    expect(moverPaseo(cancelado, 'aceptar', 'paseador', T0 + 2 * MIN)).toBe(cancelado)
  })
})

describe('caso por un problema con el pago (el pago es después del paseo)', () => {
  const pagoVisto = { ...pagoDelJob(), estado: 'no_encontrado' as const, paseo: 'cerrado' as const }
  const reporte: Reporte = { quien: 'dueno', motivo: 'pago', texto: 'Pagué por Yape a la cuenta que me mostraron.', at: T0 + HORA }

  it('se arma desde el pago, sin tocar el estado del paseo', () => {
    const c = casoDePago(pagoVisto, T0 + HORA)
    expect(c.tipo).toBe('pago')
    expect(c.jobId).toBe(pagoVisto.id)
    expect(c.pagoEstado).toBe('no_encontrado')
    expect(c.estadoPaseo).toBe('cerrado')
    expect(c.monto).toBe(25)
  })

  it('el reporte de la familia se suma al caso que abrió el equipo (no se duplica)', () => {
    const delEquipo = casoDePago(pagoVisto, T0)
    const lista = abrirCaso([], delEquipo)
    const con = abrirCaso(lista, casoDePago(pagoVisto, T0 + HORA, reporte))
    expect(con).toHaveLength(1)
    expect(con[0].reporte?.texto).toBe(reporte.texto)
    expect(abrirCaso(con, casoDePago(pagoVisto, T0 + 2 * HORA, reporte))).toBe(con)
  })

  it('resolverlo no cambia el paseo', () => {
    const j = confirmarEntregaJob(hastaEntregado(), T0 + 10 * MIN)!
    const c = casoDePago(pagoVisto, T0)
    expect(resolverJob(j, c, 'cerrado', 'Se encontró en el banco.', T0 + HORA)).toBe(j)
    expect(resolverJob(j, c, 'cancelado', 'No era.', T0 + HORA)).toBe(j)
  })
})
