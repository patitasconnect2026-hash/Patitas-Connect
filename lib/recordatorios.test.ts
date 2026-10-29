import { describe, expect, it } from 'vitest'
import type { Job } from './bus'
import { clavesQueQuedanAvisadas, inicioDeReserva, recordatoriosQueTocan } from './recordatorios'
import { recordatorioCuerpo } from './reservasTextos'

// Reserva hecha el 14 de octubre de 2026 a las 08:00 de Lima (13:00 UTC), para HOY a las 10:00 am (dayIdx 0).
const creado = Date.UTC(2026, 9, 14, 13, 0)
const job = (estado: string, extra: Partial<Job['reserva']> = {}): Job =>
  ({
    id: 'j1',
    createdAt: creado,
    paseo: { estado, eventos: [] },
    reserva: { dayIdx: 0, startMin: 600, ...extra },
  }) as unknown as Job
const diezAm = Date.UTC(2026, 9, 14, 15, 0) // 10:00 en Lima

describe('recordatorios de la reserva', () => {
  it('la hora de inicio sale del día de la reserva (Lima) y de la hora elegida', () => {
    expect(inicioDeReserva(job('aceptado'))).toBe(diezAm)
    expect(inicioDeReserva(job('aceptado', { dayIdx: 2 }))).toBe(diezAm + 2 * 24 * 3600_000)
  })
  it('avisa una hora antes, una sola vez, y solo si el paseo está aceptado', () => {
    const ya = new Set<string>()
    expect(recordatoriosQueTocan([job('aceptado')], diezAm - 90 * 60_000, ya)).toEqual([])
    const r = recordatoriosQueTocan([job('aceptado')], diezAm - 59 * 60_000, ya)
    expect(r).toHaveLength(1)
    expect(r[0].minutos).toBe(60)
    clavesQueQuedanAvisadas(r[0]).forEach((c) => ya.add(c))
    expect(recordatoriosQueTocan([job('aceptado')], diezAm - 30 * 60_000, ya)).toEqual([])
    expect(recordatoriosQueTocan([job('solicitado')], diezAm - 30 * 60_000, new Set())).toEqual([])
    expect(recordatoriosQueTocan([job('aceptado')], diezAm + 1, new Set())).toEqual([])
  })
  it('se pueden agregar otros tiempos y no se avisa tres veces de golpe', () => {
    const r = recordatoriosQueTocan([job('aceptado')], diezAm - 10 * 60_000, new Set(), [60, 15, 5])
    expect(r).toHaveLength(1)
    expect(r[0].minutos).toBe(15)
    expect(clavesQueQuedanAvisadas(r[0], [60, 15, 5])).toEqual(['j1|60', 'j1|15'])
  })
  it('el texto es corto y sin tecnicismos', () => {
    expect(recordatorioCuerpo('familia', 'Lucía', 'Max', 60, '10:00 a. m.')).toBe('Tu paseo con Lucía empieza en 1 hora (10:00 a. m.).')
    expect(recordatorioCuerpo('paseador', 'Valeria', 'Max', 60, '10:00 a. m.')).toContain('Max')
  })
})
