import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { cancelacionFamilia, estadoPorFaltas, faltaPorCancelar, leerReporte, pausaPorReportesSinSustento, planDeRescate } from './penalizaciones'

describe('faltas del paseador', () => {
  it('cancelar con tiempo no suma; tarde suma; no presentarse es grave', () => {
    expect(faltaPorCancelar({ horasAntes: 24, motivo: 'personal', conPrueba: false }).puntos).toBe(0)
    expect(faltaPorCancelar({ horasAntes: 5, motivo: 'personal', conPrueba: false }).puntos).toBe(1)
    expect(faltaPorCancelar({ horasAntes: 1, motivo: 'personal', conPrueba: false }).puntos).toBe(2)
    expect(faltaPorCancelar({ horasAntes: 48, motivo: 'no_se_presento', conPrueba: true }).puntos).toBe(3)
  })
  it('una emergencia con prueba no suma, pero el equipo la mira', () => {
    const f = faltaPorCancelar({ horasAntes: 0.5, motivo: 'emergencia', conPrueba: true })
    expect(f.puntos).toBe(0)
    expect(f.revisarPrueba).toBe(true)
  })
  it('los puntos de 30 días llevan a aviso, pausa y revisión', () => {
    expect(estadoPorFaltas(2).estado).toBe('al_dia')
    expect(estadoPorFaltas(3).estado).toBe('aviso')
    expect(estadoPorFaltas(5).diasPausa).toBe(7)
    expect(estadoPorFaltas(9).estado).toBe('revision')
  })
})

describe('reemplazo tipo InDrive', () => {
  it('el bono nunca pasa la comisión del paseo', () => {
    for (const precio of [5, 8, 12.5, 25, 40]) {
      for (const com of [10, 15, 20]) {
        for (const plan of ['gratis', 'plus', 'club'] as const) {
          expect(planDeRescate({ precio, comisionPct: com, plan, minutosParaPaseo: 120 }).bono).toBeLessThanOrEqual(precio * (com / 100) + 1e-9)
        }
      }
    }
  })
  it('Plus y Club tienen prioridad y un bono mayor; a menos de una hora es urgente', () => {
    const g = planDeRescate({ precio: 50, comisionPct: 20, plan: 'gratis', minutosParaPaseo: 120 })
    const p = planDeRescate({ precio: 50, comisionPct: 20, plan: 'plus', minutosParaPaseo: 30 })
    expect(g.bono).toBe(CONFIG.bonoRescate)
    expect(p.bono).toBe(CONFIG.bonoRescatePlan)
    expect(p.prioritario).toBe(true)
    expect(p.urgencia).toBe('urgente')
    expect(p.minutosEspera).toBeLessThan(g.minutosEspera)
    expect(p.pasos.length).toBe(4)
  })
})

describe('la familia también cumple', () => {
  it('la ventana gratis depende del plan', () => {
    expect(cancelacionFamilia({ horasAntes: 1.5, plan: 'gratis' }).tardia).toBe(true)
    expect(cancelacionFamilia({ horasAntes: 1.5, plan: 'plus' }).tardia).toBe(false)
  })
  it('no estar en casa cuenta como tardía', () => {
    const c = cancelacionFamilia({ horasAntes: 10, plan: 'club', noEstaba: true })
    expect(c.tardia).toBe(true)
    expect(c.pagoAlPaseadorPct).toBe(CONFIG.cancelacionTardiaPct)
  })
})

describe('reportes: nadie acusa sin pruebas', () => {
  const documentado = { fotoRecojo: true, fotoEntrega: true, entregaConfirmada: true, puntosControl: 3, pruebasDelReporte: 0 }
  it('un reporte sin pruebas contra un paseo documentado queda a favor del paseador', () => {
    expect(leerReporte(documentado, 2).lectura).toBe('a_favor_del_paseador')
  })
  it('con pruebas y a tiempo se revisa (o va a favor si no hubo entrega confirmada)', () => {
    expect(leerReporte({ ...documentado, pruebasDelReporte: 2 }, 2).lectura).toBe('revisar')
    expect(leerReporte({ ...documentado, entregaConfirmada: false, pruebasDelReporte: 2 }, 2).lectura).toBe('a_favor_del_reporte')
  })
  it('fuera de plazo se revisa con cuidado', () => {
    expect(leerReporte({ ...documentado, fotoEntrega: false }, 100).lectura).toBe('revisar')
  })
  it('dos reportes sin sustento pausan a la familia', () => {
    expect(pausaPorReportesSinSustento(1)).toBe(false)
    expect(pausaPorReportesSinSustento(2)).toBe(true)
  })
})
