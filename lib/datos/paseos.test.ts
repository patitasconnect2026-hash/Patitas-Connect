import { describe, expect, it } from 'vitest'
import { aplicarPaseoActivo, CAPACIDAD_LOCAL, CAPACIDAD_SERVIDOR, deEstePaseo, empaquetarPaseos, marcarConPaseo, normalizarPaseos, paseoActivoDe, paseosDe } from './paseos'
import type { ChatMsg, Job } from '../bus'
import { nuevoPaseo } from '../paseo'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const job = (id: string, extra: Partial<Job> = {}): Job => ({
  id,
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
  ...extra,
})

describe('leer y guardar paseos (el formato de siempre sigue valiendo)', () => {
  it('un Job suelto (como hoy), una lista, nada o basura', () => {
    expect(normalizarPaseos(null)).toEqual([])
    expect(normalizarPaseos('x')).toEqual([])
    expect(normalizarPaseos(job('a')).map((j) => j.id)).toEqual(['a'])
    expect(normalizarPaseos([job('a'), job('b'), null, { sin: 'id' }]).map((j) => j.id)).toEqual(['a', 'b'])
  })

  it('un encargo de antes de la máquina de estados se sigue leyendo', () => {
    const viejo = { ...job('v'), paseo: undefined, status: 'entregado', paid: true } as unknown
    const [j] = normalizarPaseos(viejo)
    expect(j.paseo.estado).toBe('cerrado')
  })

  it('con capacidad 1 se guarda el Job suelto (o null), igual que hoy; con más, la lista', () => {
    expect(empaquetarPaseos([], CAPACIDAD_LOCAL)).toBeNull()
    expect(empaquetarPaseos([job('a')], CAPACIDAD_LOCAL)).toEqual(job('a'))
    expect(empaquetarPaseos([job('a'), job('b')], CAPACIDAD_SERVIDOR)).toHaveLength(2)
  })
})

describe('cada persona ve lo suyo', () => {
  const lista = [
    job('a', { familiaId: 'fam-1', walkerId: 'carlos', createdAt: T0 }),
    job('b', { familiaId: 'fam-2', walkerId: 'carlos', createdAt: T0 + 10 }),
    job('c', { familiaId: 'fam-1', walkerId: 'nuevo-X', createdAt: T0 + 20 }),
  ]

  it('sin identidad (el teléfono de hoy) se ven todos y el activo es el más reciente', () => {
    expect(paseosDe(lista, null)).toHaveLength(3)
    expect(paseoActivoDe(lista, null)?.id).toBe('c')
    expect(paseoActivoDe([], null)).toBeNull()
  })

  it('la familia ve solo sus paseos', () => {
    expect(paseosDe(lista, { rol: 'familia', id: 'fam-1' }).map((j) => j.id)).toEqual(['a', 'c'])
    expect(paseoActivoDe(lista, { rol: 'familia', id: 'fam-2' })?.id).toBe('b')
    expect(paseoActivoDe(lista, { rol: 'familia', id: 'fam-9' })).toBeNull()
  })

  it('el paseador ve solo los suyos, y no el que ya cerró en su app', () => {
    expect(paseosDe(lista, { rol: 'paseador', id: 'carlos' }).map((j) => j.id)).toEqual(['a', 'b'])
    const cerrado = [...lista.slice(0, 1), { ...lista[1], cerradoPaseador: true }]
    expect(paseoActivoDe(cerrado, { rol: 'paseador', id: 'carlos' })?.id).toBe('a')
  })

  it('el equipo ve todos', () => {
    expect(paseosDe(lista, { rol: 'equipo', id: 'eq' })).toHaveLength(3)
  })
})

describe('cambiar el paseo activo', () => {
  it('en el teléfono (capacidad 1) un paseo nuevo REEMPLAZA al anterior, como hoy', () => {
    const r = aplicarPaseoActivo([job('a')], job('a'), job('b'), null, CAPACIDAD_LOCAL)
    expect(r.map((j) => j.id)).toEqual(['b'])
  })

  it('descartarlo lo quita; cambiarlo lo reemplaza', () => {
    expect(aplicarPaseoActivo([job('a')], job('a'), null, null, CAPACIDAD_LOCAL)).toEqual([])
    const r = aplicarPaseoActivo([job('a')], job('a'), { ...job('a'), pin: '1111' }, null, CAPACIDAD_LOCAL)
    expect(r).toHaveLength(1)
    expect(r[0].pin).toBe('1111')
  })

  it('con varios, un paseo nuevo se SUMA y el de otra familia no se toca', () => {
    const lista = [job('a', { familiaId: 'fam-1' }), job('x', { familiaId: 'fam-2', createdAt: T0 + 5 })]
    const quien = { rol: 'familia' as const, id: 'fam-1' }
    const activo = paseoActivoDe(lista, quien)
    const r = aplicarPaseoActivo(lista, activo, job('b', { createdAt: T0 + 50 }), quien, CAPACIDAD_SERVIDOR)
    expect(r.map((j) => j.id)).toEqual(['a', 'x', 'b'])
    expect(r.find((j) => j.id === 'b')?.familiaId).toBe('fam-1')
    expect(r.find((j) => j.id === 'x')?.familiaId).toBe('fam-2')
  })

  it('pasada la capacidad se sueltan los más viejos, nunca el que se guarda', () => {
    const lista = [job('1', { createdAt: 1 }), job('2', { createdAt: 2 }), job('3', { createdAt: 3 })]
    const r = aplicarPaseoActivo(lista, null, job('4', { createdAt: 4 }), null, 3)
    expect(r.map((j) => j.id).sort()).toEqual(['2', '3', '4'])
  })
})

describe('chat y bitácora de varios paseos', () => {
  it('lo nuevo se marca con el paseo; lo que ya traía paseo no cambia', () => {
    const r = marcarConPaseo([{ id: '1', from: 'owner' as const, text: 'hola', at: 1 }, { id: '2', from: 'walker' as const, text: 'ya voy', at: 2, jobId: 'otro' }], 'a')
    expect(r.map((m) => m.jobId)).toEqual(['a', 'otro'])
  })
  it('sin paseo activo no se marca nada', () => {
    expect(marcarConPaseo<ChatMsg>([{ id: '1', from: 'owner', at: 1 }], undefined)[0].jobId).toBeUndefined()
  })
  it('cada paseo ve su chat; lo de antes (sin marca) se ve en el activo, como hoy', () => {
    const todos = [
      { id: '1', from: 'owner' as const, at: 1, jobId: 'a' },
      { id: '2', from: 'owner' as const, at: 2, jobId: 'b' },
      { id: '3', from: 'owner' as const, at: 3 },
    ]
    expect(deEstePaseo(todos, 'a').map((m) => m.id)).toEqual(['1', '3'])
    expect(deEstePaseo(todos, undefined)).toHaveLength(3)
  })
})
