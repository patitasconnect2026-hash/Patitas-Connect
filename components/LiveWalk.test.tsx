import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CONFIG, type Config } from '@/lib/config'
import { buildBooking, DEMO_DOGS, WALKERS } from '@/lib/data'
import { aplicar, nuevoPaseo } from '@/lib/paseo'
import { nuevoPago, type EstadoPago, type Pago } from '@/lib/pagos'
import type { PuntoControl } from '@/lib/puntosControl'
import { newWalk } from '@/lib/walk'
import { LiveWalk } from './LiveWalk'

const original: Config['cobroEquipo'] = { ...CONFIG.cobroEquipo }
afterEach(() => {
  CONFIG.cobroEquipo = { ...original }
})

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000
const booking = buildBooking({ walker: WALKERS[0], dog: DEMO_DOGS[0], dayIdx: 0, startHour: 10, durationMin: 60, plan: 'once', handoff: 'door', notes: '', groupDogs: 0, groupSize: DEMO_DOGS[0].size })
const pago = (estado: EstadoPago, extra: Partial<Pago> = {}): Pago => ({
  ...nuevoPago({ jobId: 'j1', walkerId: WALKERS[0].id, paseador: 'Carlos', dueno: 'Valeria', perro: 'Max', cuando: 'Hoy · 10:00 am', reserva: booking, at: T0, paseo: 'aceptado', demo: true }),
  estado,
  ...extra,
})
const aceptado = aplicar(nuevoPaseo(T0), 'aceptar', 'paseador', T0 + MIN)

const vista = (extra: Partial<Parameters<typeof LiveWalk>[0]> = {}) =>
  renderToStaticMarkup(
    <LiveWalk
      walk={{ ...newWalk(booking), jobId: 'j1' }}
      entries={[]}
      unread={0}
      lastWalkerMessage={null}
      reviewed={false}
      pin="4827"
      onOpenChat={() => {}}
      onOpenSos={() => {}}
      onOpenConfirm={() => {}}
      onOpenDog={() => {}}
      onWriteReview={() => {}}
      onExplore={() => {}}
      onRebook={() => {}}
      onDemo={() => {}}
      onSkip={() => {}}
      estado="aceptado"
      paseo={aceptado}
      simulado={false}
      walkerOnline={false}
      onSimularAceptacion={() => {}}
      onCancelar={() => {}}
      onDescartar={() => {}}
      reasignacion={null}
      onReservarCon={() => {}}
      pago={pago('sin_pagar')}
      demoPago={false}
      entregaConfirmada={false}
      plazoVencido={false}
      onSimularVisto={() => {}}
      reporte={null}
      onReportar={() => {}}
      entregaSinConfirmar={false}
      fotos={[]}
      selfie={null}
      puntos={[] as PuntoControl[]}
      ahora={T0}
      {...extra}
    />,
  )

const entregado = aplicar(aplicar(aplicar(aceptado, 'salir', 'paseador', T0 + 2 * MIN), 'recoger', 'paseador', T0 + 3 * MIN), 'entregar', 'paseador', T0 + 60 * MIN)

describe('la pestaña «Paseo» del dueño', () => {
  it('desde que el paseador acepta, el código de recojo se ve: el paseo NO espera ningún pago', () => {
    for (const e of ['sin_pagar', 'visto', 'no_encontrado'] as const) {
      const h = vista({ pago: pago(e) })
      expect(h, e).toContain('Código de recojo')
      expect(h, e).toContain('4827')
      expect(h, e).not.toMatch(/no sale hasta|verifique tu pago|Ya pagué/)
    }
  })

  it('antes de terminar, solo dice cuándo se paga: «Pagas al terminar el paseo.» (sin QR ni números)', () => {
    CONFIG.cobroEquipo = { titular: 'Equipo Patitas Piloto', yape: '987 654 321', plin: '', cuenta: '', qr: '' }
    const h = vista({ pago: pago('sin_pagar') })
    expect(h).toContain('Pagas al terminar el paseo.')
    expect(h).not.toContain('987 654 321')
    expect(h).not.toContain('Paga a Patitas')
  })

  it('después de «Recibí a [perro]» aparece «Paga a Patitas» con el nombre de la cuenta a la vista', () => {
    CONFIG.cobroEquipo = { titular: 'Equipo Patitas Piloto', yape: '987 654 321', plin: '', cuenta: '', qr: '' }
    const h = vista({ estado: 'entregado', paseo: entregado, entregaConfirmada: true, pago: pago('sin_pagar', { paseo: 'entregado' }) })
    expect(h).toContain('Paga a Patitas')
    expect(h).toContain('Paga a Patitas y muéstrale el pago a Carlos.')
    expect(h).toContain('987 654 321')
    expect(h).toContain('Equipo Patitas Piloto')
    expect(h).toContain('S/ ')
  })

  it('sin configurar el cobro dice «Falta configurar» (no queda mudo)', () => {
    const h = vista({ estado: 'entregado', paseo: entregado, entregaConfirmada: true, pago: pago('sin_pagar', { paseo: 'entregado' }) })
    expect(h).toContain('Falta configurar el medio de cobro.')
  })

  it('no dice «En vivo» ni «Recorrido»: el seguimiento es por puntos de control', () => {
    const h = vista({ pago: pago('sin_pagar') })
    expect(h).not.toMatch(/en vivo|EN VIVO|recorrido|km/i)
  })

  it('con el paseo en marcha muestra «Puntos de control» y el último control', () => {
    const enPaseo = aplicar(aplicar(aceptado, 'salir', 'paseador', T0 + 2 * MIN), 'recoger', 'paseador', T0 + 3 * MIN)
    const h = vista({ estado: 'en_paseo', paseo: enPaseo, pago: pago('sin_pagar', { paseo: 'en_paseo' }), ahora: T0 + 8 * MIN })
    expect(h).toContain('Puntos de control')
    expect(h).toContain('Último punto de control: hace 5 min.')
    expect(h).toContain('Pagas al terminar el paseo.')
  })

  it('si el paseo se rechazó no hay nada que pagar (y no se ofrece pagar)', () => {
    const rechazado = aplicar(nuevoPaseo(T0), 'rechazar', 'paseador', T0 + MIN)
    const h = vista({ estado: 'rechazado', paseo: rechazado, pago: pago('sin_pagar', { paseo: 'rechazado' }) })
    expect(h).not.toContain('Paga a Patitas')
    expect(h).not.toContain('Pagas al terminar')
  })
})
