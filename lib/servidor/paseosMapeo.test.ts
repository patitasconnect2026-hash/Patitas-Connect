import { describe, expect, it } from 'vitest'
import { buildBooking, DEMO_ACCOUNT, DEMO_DOGS, WALKERS } from '../data'
import type { Job } from '../bus'
import { nuevoPaseo, type EventoPaseo } from '../paseo'
import {
  bitacoraDeFila,
  direccionDeCasa,
  eventoDeFila,
  filaDeBitacora,
  filaDeCasa,
  filaDeEvento,
  filaDeMensaje,
  filaDePaseoNuevo,
  filaDePerro,
  jobDeFilas,
  mensajeDeFila,
  operacionesDe,
  reservaPublica,
  resumenDePerro,
  uuidDe,
  esUuid,
} from './paseosMapeo'
import type { SesionDePaseos } from './paseosTipos'

const FAMILIA: SesionDePaseos = { id: 'aaaaaaaa-0000-4000-8000-000000000001', rol: 'familia' }
const PASEADOR: SesionDePaseos = { id: 'bbbbbbbb-0000-4000-8000-000000000001', rol: 'paseador' }
const T0 = Date.UTC(2026, 9, 13, 15, 0, 0)

const dog = { ...DEMO_DOGS[0], notes: 'Le asusta el ruido', medical: 'Alergia al pollo', vet: 'Vet Los Pinos', photo: 'data:image/jpeg;base64,AAAA' }
const walker = { ...WALKERS[0], id: PASEADOR.id, photo: 'data:image/jpeg;base64,BBBB', deServidor: true }

function jobBase(extra: Partial<Job> = {}): Job {
  const booking = buildBooking({ walker, dog, dayIdx: 0, startHour: 10, durationMin: 60, plan: 'once', handoff: 'doorman', notes: '', groupDogs: 0, groupSize: dog.size })
  return {
    id: 'job-1',
    familiaId: FAMILIA.id,
    walkerFirst: 'Lucía',
    walkerId: PASEADOR.id,
    ownerFirst: 'Valeria',
    dog: { name: dog.name, breed: dog.breed, size: dog.size, fur: dog.fur, shape: dog.shape, notes: dog.notes, medical: dog.medical, vet: dog.vet, temperament: dog.temperament, sociable: dog.sociable, vaccinated: dog.vaccinated },
    slotLabel: booking.slotLabel,
    durationMin: 60,
    pin: '4827',
    handoff: 'doorman',
    doormanName: 'Don Luis',
    address: 'Calle Lizardo Alzamora, Dpto. 502 · San Isidro',
    groupDogs: 0,
    groupSize: dog.size,
    walkerPay: booking.neto ?? 0,
    createdAt: T0,
    paseo: nuevoPaseo(T0),
    reserva: booking,
    distrito: 'San Isidro',
    ...extra,
  }
}

describe('uuidDe: un identificador estable', () => {
  it('sale igual de la misma semilla, es un uuid válido y cambia con la semilla', () => {
    const a = uuidDe(`${FAMILIA.id}:max`)
    expect(a).toBe(uuidDe(`${FAMILIA.id}:max`))
    expect(esUuid(a)).toBe(true)
    expect(uuidDe(`${FAMILIA.id}:luna`)).not.toBe(a)
    expect(uuidDe(`${PASEADOR.id}:max`)).not.toBe(a)
  })
})

describe('privacidad: lo que el paseador puede leer desde la solicitud', () => {
  it('el resumen del perro no trae notas, datos médicos, veterinario ni foto', () => {
    const r = resumenDePerro(dog)
    expect(Object.keys(r).sort()).toEqual(['breed', 'fur', 'id', 'name', 'shape', 'size', 'sociable'])
    expect(JSON.stringify(r)).not.toMatch(/ruido|pollo|Pinos|data:image/)
  })

  it('la reserva que viaja en el paseo no lleva la ficha, la nota libre ni fotos pesadas, pero sí el precio y el horario', () => {
    const r = reservaPublica({ ...jobBase().reserva!, notes: 'Mi casa tiene alarma' })
    const texto = JSON.stringify(r)
    expect(texto).not.toMatch(/ruido|pollo|Pinos|alarma|data:image/)
    expect(r.walkPrice).toBeGreaterThan(0)
    expect(r.total).toBeGreaterThan(0)
    expect(r.slotLabel).toBeTruthy()
    expect((r.dog as { name: string }).name).toBe('Max')
  })

  it('la fila del paseo nuevo lleva solo el resumen del perro y los montos de la reserva', () => {
    const job = jobBase()
    const fila = filaDePaseoNuevo(job, FAMILIA.id, uuidDe(`${FAMILIA.id}:max`))!
    expect(fila.familia_id).toBe(FAMILIA.id)
    expect(fila.paseador_id).toBe(PASEADOR.id)
    expect(fila.entrega).toBe('doorman')
    expect(Math.abs(fila.monto - (fila.comision + fila.neto))).toBeLessThan(0.011)
    expect(fila.pago_paseador).toBe(job.walkerPay)
    expect(JSON.stringify(fila)).not.toMatch(/ruido|pollo|Pinos|Lizardo|Don Luis|4827|data:image/)
  })

  it('sin reserva no se puede crear el paseo (de ahí salen los montos)', () => {
    expect(filaDePaseoNuevo(jobBase({ reserva: undefined }), FAMILIA.id, null)).toBeNull()
  })

  it('la casa y el perro completos sí van a sus tablas (las reglas los muestran solo después de aceptar)', () => {
    const casa = filaDeCasa({ ...DEMO_ACCOUNT, district: 'San Isidro', street: 'Calle Lizardo Alzamora', unit: 'Dpto. 502', casa: [-12.1, -77.03], doorman: true, doormanName: 'Don Luis' }, { nombre: 'Marta', telefono: '999111222' }, FAMILIA.id)
    expect(casa).toMatchObject({ familia_id: FAMILIA.id, calle: 'Calle Lizardo Alzamora', unidad: 'Dpto. 502', distrito: 'San Isidro', lat: -12.1, lng: -77.03, hay_portero: true, nombre_portero: 'Don Luis', emergencia_nombre: 'Marta', emergencia_telefono: '999111222' })
    const perro = filaDePerro(dog, FAMILIA.id, uuidDe('x'))
    expect(perro).toMatchObject({ nombre: 'Max', tamano: 'large', notas: 'Le asusta el ruido', medico: 'Alergia al pollo', veterinario: 'Vet Los Pinos' })
    expect(JSON.stringify(perro)).not.toMatch(/data:image/)
  })
})

describe('jobDeFilas: de la base al paseo de la app', () => {
  const fila = {
    id: 'job-1',
    familia_id: FAMILIA.id,
    paseador_id: PASEADOR.id,
    perro_id: uuidDe('perro'),
    perro: { id: 'max', name: 'Max', breed: 'Labrador', size: 'large', fur: 'dorado', shape: 'floppy', sociable: true },
    dueno_nombre: 'Valeria',
    paseador_nombre: 'Lucía',
    horario: 'Hoy · 10:00 am',
    duracion_min: 60,
    estado: 'solicitado',
    entrega: 'doorman',
    perros_en_grupo: 1,
    tamano_grupo: 'large',
    pago_paseador: '17.60',
    monto: '22.00',
    comision: '4.40',
    neto: '17.60',
    reserva: null,
    distrito: 'San Isidro',
    reporte: null,
    cerrado_paseador: false,
    creado_en: new Date(T0).toISOString(),
  }
  const solicitar = { id: 1, paseo_id: 'job-1', accion: 'solicitar', de: null, a: 'solicitado', quien: 'dueno', en: new Date(T0).toISOString(), nota: null, demo: false, aviso: null }

  it('antes de aceptar: sin dirección, sin ficha completa y sin código para el paseador', () => {
    const j = jobDeFilas(fila, { eventos: [solicitar] })!
    expect(j.id).toBe('job-1')
    expect(j.familiaId).toBe(FAMILIA.id)
    expect(j.walkerId).toBe(PASEADOR.id)
    expect(j.paseo.estado).toBe('solicitado')
    expect(j.paseo.eventos).toHaveLength(1)
    expect(j.walkerPay).toBe(17.6)
    expect(j.address).toBe('')
    expect(j.pin).toBe('')
    expect(j.dog).toMatchObject({ name: 'Max', size: 'large', notes: '', medical: '', vet: '' })
    expect(j.fichaPendiente).toBeUndefined()
  })

  it('después de aceptar, mientras no llegan la casa y la ficha, se dice que están pendientes (no se muestra una ficha vacía como si fuera real)', () => {
    const j = jobDeFilas({ ...fila, estado: 'aceptado' }, { eventos: [solicitar] })!
    expect(j.fichaPendiente).toBe(true)
  })

  it('con la casa y la ficha: dirección, portero, emergencia y datos del perro', () => {
    const casa = { familia_id: FAMILIA.id, calle: 'Calle Lizardo Alzamora', unidad: 'Dpto. 502', distrito: 'San Isidro', hay_portero: true, nombre_portero: 'Don Luis', emergencia_nombre: 'Marta', emergencia_telefono: '999111222' }
    const perro = { id: fila.perro_id, nombre: 'Max', raza: 'Golden', tamano: 'large', temperamento: ['Juguetón'], sociable: false, vacunado: true, notas: 'Le asusta el ruido', medico: 'Alergia al pollo', veterinario: 'Vet Los Pinos' }
    const j = jobDeFilas({ ...fila, estado: 'aceptado' }, { eventos: [solicitar], casa, perro })!
    expect(j.fichaPendiente).toBeUndefined()
    expect(j.address).toBe('Calle Lizardo Alzamora, Dpto. 502 · San Isidro')
    expect(j.doormanName).toBe('Don Luis')
    expect(j.emergencia).toEqual({ nombre: 'Marta', telefono: '999111222' })
    expect(j.dog).toMatchObject({ name: 'Max', breed: 'Golden', sociable: false, vaccinated: true, notes: 'Le asusta el ruido', medical: 'Alergia al pollo', vet: 'Vet Los Pinos', temperament: ['Juguetón'] })
  })

  it('el código de recojo solo está si la base se lo entregó a esta persona', () => {
    expect(jobDeFilas(fila, { eventos: [solicitar], codigo: '4827' })!.pin).toBe('4827')
    expect(jobDeFilas(fila, { eventos: [solicitar], codigo: null })!.pin).toBe('')
  })

  it('una fila rota (sin estado válido, sin fecha) no entra: nunca se inventa un paseo', () => {
    expect(jobDeFilas({ ...fila, estado: 'volando' }, { eventos: [] })).toBeNull()
    expect(jobDeFilas({ ...fila, creado_en: 'ayer' }, { eventos: [] })).toBeNull()
    expect(jobDeFilas({ ...fila, id: '' }, { eventos: [] })).toBeNull()
  })

  it('los eventos se leen con su hora, autor y aviso; los que no sirven se saltan', () => {
    const aviso = { id: 2, paseo_id: 'job-1', accion: 'avisar', de: 'en_paseo', a: 'en_paseo', quien: 'sistema', en: new Date(T0 + 1000).toISOString(), nota: 'Salió de la zona', demo: false, aviso: 'salida' }
    const roto = { id: 3, paseo_id: 'job-1', accion: 'bailar', de: null, a: 'solicitado', quien: 'dueno', en: new Date(T0).toISOString() }
    const j = jobDeFilas({ ...fila, estado: 'en_paseo' }, { eventos: [solicitar, aviso, roto] })!
    expect(j.paseo.eventos).toHaveLength(2)
    expect(j.paseo.eventos[1]).toMatchObject({ accion: 'avisar', quien: 'sistema', aviso: 'salida', nota: 'Salió de la zona', at: T0 + 1000 })
    expect(eventoDeFila(roto)).toBeNull()
  })

  it('la bitácora se lee con el paseo al que pertenece', () => {
    expect(bitacoraDeFila({ id: 'b1', paseo_id: 'job-1', tipo: 'pee', texto: 'Max hizo pipí', en: new Date(T0).toISOString() })).toEqual({ id: 'b1', kind: 'pee', text: 'Max hizo pipí', at: T0, jobId: 'job-1' })
    expect(bitacoraDeFila({ id: 'b2', paseo_id: 'job-1', tipo: 'volar', texto: '', en: new Date(T0).toISOString() })).toBeNull()
    expect(filaDeBitacora({ id: 'b1', kind: 'pee', text: 'x', at: T0 })).toBeNull()
    expect(filaDeBitacora({ id: 'b1', kind: 'pee', text: 'x', at: T0, jobId: 'job-1' })).toMatchObject({ paseo_id: 'job-1', tipo: 'pee', texto: 'x' })
  })

  it('la dirección se escribe como en el paseo local', () => {
    expect(direccionDeCasa({ calle: 'Av. Brasil 1500', unidad: '', distrito: 'Jesús María' })).toBe('Av. Brasil 1500 · Jesús María')
    expect(direccionDeCasa({ calle: '' })).toBe('')
  })
})

describe('operacionesDe: qué hay que hacer en la base', () => {
  const ev = (accion: EventoPaseo['accion'], de: EventoPaseo['de'], a: EventoPaseo['a'], quien: EventoPaseo['quien'], at: number): EventoPaseo => ({ accion, de, a, quien, at })

  it('un paseo que la base no tiene: lo crea la familia (y solo la familia)', () => {
    expect(operacionesDe(jobBase(), undefined, FAMILIA)).toEqual([{ tipo: 'crear' }])
    expect(operacionesDe(jobBase(), undefined, PASEADOR)).toEqual([])
  })

  it('nada nuevo: ninguna operación', () => {
    const j = jobBase()
    expect(operacionesDe(j, j, FAMILIA)).toEqual([])
  })

  it('los eventos nuevos van en orden y separados: «confirmar_entrega» es un evento y «cerrar» un cambio de estado', () => {
    const base = jobBase({
      paseo: {
        estado: 'entregado',
        eventos: [
          ev('solicitar', null, 'solicitado', 'dueno', T0),
          ev('aceptar', 'solicitado', 'aceptado', 'paseador', T0 + 1),
          ev('salir', 'aceptado', 'en_camino', 'paseador', T0 + 2),
          ev('recoger', 'en_camino', 'en_paseo', 'paseador', T0 + 3),
          ev('entregar', 'en_paseo', 'entregado', 'paseador', T0 + 4),
        ],
      },
    })
    const local: Job = {
      ...base,
      paseo: {
        estado: 'cerrado',
        eventos: [...base.paseo.eventos, ev('confirmar_entrega', 'entregado', 'entregado', 'dueno', T0 + 5), ev('cerrar', 'entregado', 'cerrado', 'sistema', T0 + 6)],
      },
    }
    const ops = operacionesDe(local, base, FAMILIA)
    expect(ops.map((o) => o.tipo)).toEqual(['evento', 'estado'])
    expect(ops[0]).toMatchObject({ evento: { accion: 'confirmar_entrega' } })
    expect(ops[1]).toMatchObject({ evento: { accion: 'cerrar', de: 'entregado', a: 'cerrado' } })
  })

  it('el paseador cierra el paseo en su pantalla y la familia cambia su contacto: operaciones propias de cada rol', () => {
    const base = jobBase()
    expect(operacionesDe({ ...base, cerradoPaseador: true }, base, PASEADOR)).toEqual([{ tipo: 'cerrar_para_paseador' }])
    expect(operacionesDe({ ...base, cerradoPaseador: true }, base, FAMILIA)).toEqual([])
    expect(operacionesDe({ ...base, emergencia: { nombre: 'Marta', telefono: '999' } }, base, FAMILIA)).toEqual([{ tipo: 'emergencia' }])
    expect(operacionesDe({ ...base, emergencia: { nombre: 'Marta', telefono: '999' } }, base, PASEADOR)).toEqual([])
  })

  it('los avisos y recordatorios del sistema son eventos; otros eventos del mismo estado no se mandan', () => {
    const base = jobBase({ paseo: { estado: 'en_paseo', eventos: [ev('solicitar', null, 'solicitado', 'dueno', T0)] } })
    const local: Job = {
      ...base,
      paseo: { estado: 'en_paseo', eventos: [...base.paseo.eventos, { ...ev('avisar', 'en_paseo', 'en_paseo', 'sistema', T0 + 1), aviso: 'salida' }, ev('recordar', 'entregado', 'entregado', 'sistema', T0 + 2)] },
    }
    expect(operacionesDe(local, base, PASEADOR).map((o) => o.tipo)).toEqual(['evento', 'evento'])
  })

  it('la fila de un evento lleva la hora en formato de la base', () => {
    const f = filaDeEvento('job-1', { ...ev('avisar', 'en_paseo', 'en_paseo', 'sistema', T0), aviso: 'salto', nota: 'x', demo: true })
    expect(f).toEqual({ paseo_id: 'job-1', accion: 'avisar', de: 'en_paseo', a: 'en_paseo', quien: 'sistema', en: new Date(T0).toISOString(), nota: 'x', demo: true, aviso: 'salto' })
  })
})

describe('mensajes del chat', () => {
  it('una fila de la base es un mensaje con su paseo, su autor y su hora', () => {
    const m = mensajeDeFila({ id: 'm1', paseo_id: 'job-1', de: 'walker', texto: 'Ya llegué 👋', imagen_ruta: null, en: new Date(T0).toISOString() })
    expect(m).toEqual({ id: 'm1', jobId: 'job-1', from: 'walker', text: 'Ya llegué 👋', at: T0 })
  })

  it('una fila rota, sin texto (una foto de una versión futura) o de un autor raro no entra', () => {
    const en = new Date(T0).toISOString()
    expect(mensajeDeFila({ id: 'm1', paseo_id: 'job-1', de: 'walker', texto: null, imagen_ruta: 'x/y.jpg', en })).toBeNull()
    expect(mensajeDeFila({ id: 'm1', paseo_id: 'job-1', de: 'equipo', texto: 'hola', en })).toBeNull()
    expect(mensajeDeFila({ id: '', paseo_id: 'job-1', de: 'owner', texto: 'hola', en })).toBeNull()
    expect(mensajeDeFila({ id: 'm1', paseo_id: 'job-1', de: 'owner', texto: 'hola', en: 'ayer' })).toBeNull()
  })

  it('cada persona manda solo lo suyo: la familia como «owner», el paseador como «walker»', () => {
    const delDueno = { id: 'a', from: 'owner' as const, text: '  Hola  ', at: T0, jobId: 'job-1' }
    const delPaseador = { id: 'b', from: 'walker' as const, text: 'Hola', at: T0, jobId: 'job-1' }
    expect(filaDeMensaje(delDueno, 'familia')).toEqual({ id: 'a', paseo_id: 'job-1', de: 'owner', texto: 'Hola' })
    expect(filaDeMensaje(delPaseador, 'paseador')).toEqual({ id: 'b', paseo_id: 'job-1', de: 'walker', texto: 'Hola' })
    expect(filaDeMensaje(delPaseador, 'familia')).toBeNull()
    expect(filaDeMensaje(delDueno, 'paseador')).toBeNull()
    expect(filaDeMensaje(delDueno, 'equipo')).toBeNull()
  })

  it('sin paseo, sin texto (solo foto) o vacío no se manda; el texto largo se corta en 500', () => {
    expect(filaDeMensaje({ id: 'a', from: 'owner', text: 'Hola', at: T0 }, 'familia')).toBeNull()
    expect(filaDeMensaje({ id: 'a', from: 'owner', image: 'data:image/jpeg;base64,AA', at: T0, jobId: 'job-1' }, 'familia')).toBeNull()
    expect(filaDeMensaje({ id: 'a', from: 'owner', text: '   ', at: T0, jobId: 'job-1' }, 'familia')).toBeNull()
    expect(filaDeMensaje({ id: 'a', from: 'owner', text: 'x'.repeat(900), at: T0, jobId: 'job-1' }, 'familia')?.texto).toHaveLength(500)
  })
})
