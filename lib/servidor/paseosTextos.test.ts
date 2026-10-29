import { describe, expect, it } from 'vitest'
import { ErrorDeBase, RechazoDelServidor } from './paseosTipos'
import { rechazoDe, rechazoDePago, TEXTO_PAGO_SERVIDOR, TEXTO_SERVIDOR } from './paseosTextos'

describe('qué es un «no» de la base y qué es un corte de internet', () => {
  it('sin red, con la base caída, demasiadas peticiones o la sesión vencida: se reintenta (null)', () => {
    expect(rechazoDe(new Error('Failed to fetch'), 'cambiar')).toBeNull()
    expect(rechazoDe(new ErrorDeBase('Failed to fetch', 0), 'cambiar')).toBeNull()
    for (const status of [401, 408, 425, 429, 500, 502, 503]) expect(rechazoDe(new ErrorDeBase('x', status), 'cambiar'), String(status)).toBeNull()
  })

  it('un estado que no existe, un permiso que falta o una regla: rechazo con texto claro', () => {
    expect(rechazoDe(new ErrorDeBase('Ese cambio de estado del paseo no existe (solicitado → cerrado).', 400, '22023'), 'cambiar')?.mensaje).toBe(TEXTO_SERVIDOR.cambioYaNoVale)
    expect(rechazoDe(new ErrorDeBase('A esta persona no le toca ese cambio de estado.', 403, '42501'), 'cambiar')?.mensaje).toBe(TEXTO_SERVIDOR.sinPermiso)
    expect(rechazoDe(new ErrorDeBase('Falta que el dueño confirme la entrega.', 403, '42501'), 'cambiar')?.mensaje).toBe(TEXTO_SERVIDOR.faltaConfirmar)
    expect(rechazoDe(new ErrorDeBase('new row violates row-level security policy', 403, '42501'), 'crear')?.mensaje).toBe(TEXTO_SERVIDOR.solicitudNoSePudo)
    expect(rechazoDe(new ErrorDeBase('algo raro', 400, 'XX000'), 'cambiar')?.mensaje).toBe(TEXTO_SERVIDOR.noSePudoGuardar)
  })

  it('un rechazo ya armado se deja como está', () => {
    const r = new RechazoDelServidor('listo')
    expect(rechazoDe(r, 'cambiar')).toBe(r)
  })
})

describe('los textos del servidor', () => {
  const todos = Object.values(TEXTO_SERVIDOR)
  it('no prometen ni afirman lo que no hay: sin «seguro», «verificado», «garantizado», «24/7», «en vivo» ni «prueba»', () => {
    for (const t of todos) expect(t, t).not.toMatch(/seguro|verificad|garantiz|24\/7|en vivo|\bprueba/i)
  })
  it('son frases cortas y se leen solas (hasta 16 palabras)', () => {
    for (const t of todos) expect(t.split(/\s+/).length, t).toBeLessThanOrEqual(16)
  })
})

describe('un «no» de la base a un pago: texto claro, y un corte de internet se reintenta', () => {
  it('sin red, con la base caída o la sesión vencida: se reintenta (null), no se rechaza', () => {
    expect(rechazoDePago(new Error('Failed to fetch'))).toBeNull()
    expect(rechazoDePago(new ErrorDeBase('Failed to fetch', 0))).toBeNull()
    for (const status of [401, 408, 425, 429, 500, 503]) expect(rechazoDePago(new ErrorDeBase('x', status)), String(status)).toBeNull()
  })

  it('cada regla de mover_pago tiene su frase', () => {
    const e = (msg: string, status: number, code: string) => rechazoDePago(new ErrorDeBase(msg, status, code))?.mensaje
    expect(e('Solo el equipo puede hacer esto.', 403, '42501')).toBe(TEXTO_PAGO_SERVIDOR.soloEquipo)
    expect(e('Solo el paseador de este paseo puede hacer esto.', 403, '42501')).toBe(TEXTO_PAGO_SERVIDOR.soloPaseador)
    expect(e('No se puede «ver_pago» con el paseo «aceptado».', 400, '22023')).toBe(TEXTO_PAGO_SERVIDOR.paseoNoTermino)
    expect(e('No se puede «ver_pago» con el pago «visto».', 400, '22023')).toBe(TEXTO_PAGO_SERVIDOR.yaCambio)
    expect(e('La nota es obligatoria.', 400, '22023')).toBe(TEXTO_PAGO_SERVIDOR.notaObligatoria)
    expect(e('No existe ese pago.', 400, 'P0002')).toBe(TEXTO_PAGO_SERVIDOR.noExiste)
    expect(e('permission denied for table pagos', 403, '42501')).toBe(TEXTO_SERVIDOR.sinPermiso)
    expect(e('algo raro', 400, 'XX000')).toBe(TEXTO_PAGO_SERVIDOR.noSePudo)
  })

  it('los textos de pagos son frases cortas, sin promesas y sin decir «pagado» cuando no lo está', () => {
    for (const t of Object.values(TEXTO_PAGO_SERVIDOR)) {
      expect(t, t).not.toMatch(/seguro|verificad|garantiz|24\/7|en vivo/i)
      expect(t.split(/\s+/).length, t).toBeLessThanOrEqual(20)
    }
    expect(TEXTO_PAGO_SERVIDOR.sinConexionEquipo).toMatch(/NO está marcado/)
  })
})
