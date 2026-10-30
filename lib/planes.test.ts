import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import {
  ahorroClub,
  codigoDeGrupo,
  comisionDeNivel,
  comisionVigente,
  creditoInvitacion,
  descuentoClubMes,
  descuentoPrimerPaseo,
  faltaParaSiguiente,
  margenMembresia,
  mensajeInvitacionGrupo,
  nivelDe,
  planesFamilia,
  promoGrupoVigente,
  puedePedir,
  puedeReservar,
} from './planes'

const activos = { ...CONFIG, planesActivos: true }

describe('niveles del paseador y comisión 20 / 15 / 10', () => {
  it('las comisiones son 20, 15 y 10 y bajan con el nivel', () => {
    expect(CONFIG.comisionPorNivel).toEqual({ nuevo: 20, pro: 15, elite: 10 })
  })
  it('sube de nivel solo si cumple todo', () => {
    expect(nivelDe({ paseos: 0, puntaje: null, faltas30d: 0, cursos: 0 }).id).toBe('nuevo')
    expect(nivelDe({ paseos: 40, puntaje: 8.5, faltas30d: 1, cursos: 3 }).id).toBe('pro')
    expect(nivelDe({ paseos: 200, puntaje: 9.5, faltas30d: 1, cursos: 7 }).id).toBe('pro') // una falta lo deja en Pro
    expect(nivelDe({ paseos: 200, puntaje: 9.5, faltas30d: 0, cursos: 7 }).id).toBe('elite')
    expect(nivelDe({ paseos: 100, puntaje: 8, faltas30d: 0, cursos: 7 }).id).toBe('nuevo') // puntaje bajo
  })
  it('dice qué falta para el siguiente nivel', () => {
    const f = faltaParaSiguiente({ paseos: 10, puntaje: 9, faltas30d: 0, cursos: 1 })!
    expect(f.nivel.id).toBe('pro')
    expect(f.faltan).toEqual(['30 paseos más', '2 cursos de la academia'])
    expect(f.avance).toBeGreaterThan(0)
    expect(f.avance).toBeLessThan(1)
    expect(faltaParaSiguiente({ paseos: 500, puntaje: 10, faltas30d: 0, cursos: 7 })).toBeNull()
  })
  it('la promo de grupo nunca cobra más que Pro, y el cobro real usa la comisión de siempre hasta activarla', () => {
    expect(comisionDeNivel('nuevo', { promoGrupo: true })).toBe(15)
    expect(comisionDeNivel('elite', { promoGrupo: true })).toBe(10)
    expect(comisionVigente('elite')).toBe(CONFIG.comision)
    expect(comisionVigente('elite', {}, { ...CONFIG, comisionPorNivelActiva: true })).toBe(10)
  })
})

describe('membresías: siempre dejan dinero limpio', () => {
  it('el margen del Club nunca es negativo, gaste lo que gaste la familia', () => {
    for (const gasto of [0, 100, 300, 500, 1000, 5000]) {
      for (const rescates of [0, 1, 2, 10]) {
        expect(margenMembresia('club', gasto, rescates)).toBeGreaterThan(0)
        expect(margenMembresia('plus', gasto, rescates)).toBeGreaterThan(0)
      }
    }
  })
  it('el descuento del Club tiene tope', () => {
    expect(descuentoClubMes(100)).toBe(5)
    expect(descuentoClubMes(10000)).toBe(CONFIG.topeDescuentoClubMes)
    expect(ahorroClub(100)).toBeLessThan(0)
  })
  it('el plan Gratis tiene límites y los pagos no', () => {
    const [gratis, plus, club] = planesFamilia()
    expect(gratis.limites.pedidosAbiertos).toBe(1)
    expect(gratis.limites.reservasPorSemana).toBe(3)
    expect(plus.limites.reservasPorSemana).toBeNull()
    expect(club.limites.reemplazoPrioritario).toBe(true)
  })
})

describe('no todo el poder a la familia', () => {
  const base = { plan: 'gratis' as const, pedidosAbiertos: 0, reservasEstaSemana: 0, cancelacionesTardiasMes: 0 }
  it('el plan Gratis permite un pedido abierto y 3 reservas por semana', () => {
    expect(puedePedir(base, 0).ok).toBe(true)
    const r = puedePedir({ ...base, pedidosAbiertos: 1 }, 0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.sugerencia).toBe('plus')
    expect(puedeReservar({ ...base, reservasEstaSemana: 3 }, 0).ok).toBe(false)
    expect(puedeReservar({ ...base, plan: 'plus', reservasEstaSemana: 30 }, 0).ok).toBe(true)
  })
  it('una pausa vigente bloquea; vencida, no', () => {
    expect(puedeReservar({ ...base, pausadaHasta: 1000 }, 500).ok).toBe(false)
    expect(puedeReservar({ ...base, pausadaHasta: 1000 }, 1500).ok).toBe(true)
  })
  it('pasarse de cancelaciones tardías bloquea los pedidos', () => {
    expect(puedePedir({ ...base, cancelacionesTardiasMes: 3 }, 0).ok).toBe(false)
  })
})

describe('promociones', () => {
  it('apagadas mientras no se cobre', () => {
    expect(descuentoPrimerPaseo(25, 20)).toBe(0)
    expect(creditoInvitacion(5)).toBe(0)
  })
  it('el descuento del primer paseo nunca pasa la comisión de ese paseo', () => {
    for (const precio of [8, 12.5, 25, 40, 60]) {
      for (const com of [10, 15, 20]) {
        expect(descuentoPrimerPaseo(precio, com, activos)).toBeLessThanOrEqual(precio * (com / 100) + 1e-9)
      }
    }
    expect(descuentoPrimerPaseo(25, 20, activos)).toBe(5)
  })
  it('el crédito por invitar es la mitad de la comisión como máximo', () => {
    expect(creditoInvitacion(4, activos)).toBe(2)
    expect(creditoInvitacion(40, activos)).toBe(CONFIG.promoInvitaFamilia)
  })
  it('«Trae a tu grupo»: código sin datos personales, mínimo de personas y plazo', () => {
    expect(codigoDeGrupo('Paseadores Lima Ñaña', 7)).toBe('PASEA-007')
    expect(codigoDeGrupo('!!', 1234)).toBe('GRUPO-234')
    expect(promoGrupoVigente(3, 10)).toBe(true)
    expect(promoGrupoVigente(2, 10)).toBe(false)
    expect(promoGrupoVigente(3, 61)).toBe(false)
    expect(mensajeInvitacionGrupo('PASEA-007', 'https://x.pe/paseador')).toMatch(/PASEA-007.*https:\/\/x\.pe\/paseador/)
  })
})
