import { describe, expect, it } from 'vitest'
import {
  ACCIONES,
  ACTORES,
  accionesPosibles,
  aplicar,
  esCancelacionTardia,
  ESTADOS,
  ESTADOS_FINALES,
  entregaSinConfirmar,
  intentar,
  nuevoPaseo,
  puede,
  solicitudVencida,
  tocaRecordatorio,
  TRANSICIONES,
  TransicionInvalida,
  type AccionPaseo,
  type Actor,
  type EstadoPaseo,
  type Paseo,
} from './paseo'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000

/** Lleva un paseo nuevo hasta un estado, por el camino normal. Cada paso pasa 1 minuto. */
function en(estado: EstadoPaseo): Paseo {
  let t = T0
  let p = nuevoPaseo(t)
  const paso = (a: AccionPaseo, q: Actor, nota?: string) => {
    t += MIN
    p = aplicar(p, a, q, t, nota)
  }
  switch (estado) {
    case 'solicitado':
      return p
    case 'rechazado':
      paso('rechazar', 'paseador')
      return p
    case 'expirado':
      paso('expirar', 'sistema')
      return p
    case 'cancelado':
      paso('cancelar', 'dueno')
      return p
  }
  paso('aceptar', 'paseador')
  if (estado === 'aceptado') return p
  paso('salir', 'paseador')
  if (estado === 'en_camino') return p
  paso('recoger', 'paseador')
  if (estado === 'en_paseo') return p
  if (estado === 'en_disputa') {
    paso('reportar', 'dueno')
    return p
  }
  paso('entregar', 'paseador')
  if (estado === 'entregado') return p
  paso('confirmar_entrega', 'dueno')
  paso('cerrar', 'sistema')
  return p
}

const ultimaHora = (p: Paseo) => p.eventos[p.eventos.length - 1].at

describe('la tabla de transiciones', () => {
  it('solo usa estados, acciones y actores conocidos', () => {
    for (const t of TRANSICIONES) {
      expect(ACCIONES, t.accion).toContain(t.accion)
      expect(ESTADOS, t.a).toContain(t.a)
      for (const d of t.de) if (d !== null) expect(ESTADOS, String(d)).toContain(d)
      for (const q of t.quien) expect(ACTORES, q).toContain(q)
      expect(t.registra.length).toBeGreaterThan(5)
    }
  })

  it('hay diez estados', () => {
    expect([...ESTADOS]).toEqual(['solicitado', 'aceptado', 'rechazado', 'expirado', 'en_camino', 'en_paseo', 'entregado', 'cerrado', 'cancelado', 'en_disputa'])
  })

  it('todo estado se alcanza desde el inicio por el camino normal', () => {
    for (const e of ESTADOS) expect(en(e).estado).toBe(e)
  })
})

describe('estados finales', () => {
  it('son rechazado, expirado, cancelado y cerrado', () => {
    expect([...ESTADOS_FINALES].sort()).toEqual(['cancelado', 'cerrado', 'expirado', 'rechazado'])
  })

  it('ningún estado final tiene salidas: ninguna acción, de ningún actor', () => {
    for (const e of ESTADOS_FINALES) {
      const p = en(e)
      for (const a of ACCIONES) {
        for (const q of ACTORES) {
          const r = intentar(p, a, q, ultimaHora(p) + MIN, 'nota')
          expect(r.ok, `${e} + ${a} + ${q}`).toBe(false)
        }
      }
      expect(accionesPosibles(p, 'dueno')).toEqual([])
      expect(accionesPosibles(p, 'paseador')).toEqual([])
      expect(accionesPosibles(p, 'sistema')).toEqual([])
    }
  })

  it('en_disputa NO es final: tiene salida (la resuelve el equipo)', () => {
    expect(ESTADOS_FINALES).not.toContain('en_disputa')
    expect(accionesPosibles(en('en_disputa'), 'sistema').sort()).toEqual(['anular', 'resolver'])
  })

  it('ningún estado queda sin salida salvo los finales', () => {
    for (const e of ESTADOS) {
      if (ESTADOS_FINALES.includes(e)) continue
      expect(TRANSICIONES.some((t) => t.de.includes(e)), e).toBe(true)
    }
  })
})

describe('toda transición no permitida se rechaza', () => {
  it('estado × acción × actor: solo pasa lo que está en la tabla', () => {
    for (const e of ESTADOS) {
      const p = en(e)
      for (const a of ACCIONES) {
        for (const q of ACTORES) {
          const enTabla = TRANSICIONES.some((t) => t.accion === a && t.de.includes(e) && t.quien.includes(q))
          const r = intentar(p, a, q, ultimaHora(p) + MIN, 'nota del equipo')
          // «solicitar» nunca se hace sobre un paseo que ya existe; las acciones de una sola vez ya se hicieron en `en(...)`.
          const yaHecha = (a === 'confirmar_entrega' || a === 'recordar') && p.eventos.some((x) => x.accion === a)
          const esperado = enTabla && a !== 'solicitar' && !yaHecha
          expect(r.ok, `${e} + ${a} + ${q}`).toBe(esperado)
        }
      }
    }
  })

  it('el dueño no puede aceptar ni entregar; el paseador no puede confirmar la entrega ni cancelar una solicitud', () => {
    expect(puede(en('solicitado'), 'aceptar', 'dueno')).toBe(false)
    expect(puede(en('en_paseo'), 'entregar', 'dueno')).toBe(false)
    expect(puede(en('entregado'), 'confirmar_entrega', 'paseador')).toBe(false)
    expect(puede(en('solicitado'), 'cancelar', 'paseador')).toBe(false)
    expect(puede(en('solicitado'), 'aceptar', 'sistema')).toBe(false)
  })

  it('no se salta ningún paso', () => {
    expect(intentar(en('solicitado'), 'recoger', 'paseador', T0 + 9 * MIN).ok).toBe(false)
    expect(intentar(en('aceptado'), 'entregar', 'paseador', T0 + 9 * MIN).ok).toBe(false)
    expect(intentar(en('en_camino'), 'entregar', 'paseador', T0 + 9 * MIN).ok).toBe(false)
    expect(intentar(en('en_paseo'), 'cerrar', 'sistema', T0 + 9 * MIN, 'x').ok).toBe(false)
  })

  it('aplicar lanza TransicionInvalida con su código', () => {
    try {
      aplicar(en('solicitado'), 'recoger', 'paseador', T0 + MIN)
      throw new Error('debió lanzar')
    } catch (e) {
      expect(e).toBeInstanceOf(TransicionInvalida)
      expect((e as TransicionInvalida).codigo).toBe('estado')
    }
    expect(() => aplicar(en('solicitado'), 'aceptar', 'dueno', T0 + MIN)).toThrowError(/dueno/)
  })

  it('una acción desconocida se rechaza', () => {
    expect(intentar(en('solicitado'), 'inventada' as AccionPaseo, 'dueno', T0 + MIN).ok).toBe(false)
  })
})

describe('el registro de eventos', () => {
  it('guarda hora, autor y de qué estado a cuál, en orden', () => {
    const p = en('cerrado')
    expect(p.eventos.map((e) => e.accion)).toEqual(['solicitar', 'aceptar', 'salir', 'recoger', 'entregar', 'confirmar_entrega', 'cerrar'])
    expect(p.eventos.map((e) => e.quien)).toEqual(['dueno', 'paseador', 'paseador', 'paseador', 'paseador', 'dueno', 'sistema'])
    expect(p.eventos.map((e) => e.a)).toEqual(['solicitado', 'aceptado', 'en_camino', 'en_paseo', 'entregado', 'entregado', 'cerrado'])
    expect(p.eventos[0].de).toBeNull()
    expect(p.eventos[1].de).toBe('solicitado')
    for (let i = 1; i < p.eventos.length; i++) expect(p.eventos[i].at).toBeGreaterThanOrEqual(p.eventos[i - 1].at)
    // el estado del paseo es el «a» del último evento
    expect(p.estado).toBe(p.eventos[p.eventos.length - 1].a)
  })

  it('rechaza una hora anterior al último evento (el registro nunca queda desordenado)', () => {
    const p = en('aceptado')
    const r = intentar(p, 'salir', 'paseador', ultimaHora(p) - 1)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.codigo).toBe('hora')
    expect(intentar(p, 'salir', 'paseador', ultimaHora(p)).ok).toBe(true)
  })

  it('no modifica el paseo original (inmutable)', () => {
    const p = nuevoPaseo(T0)
    const antes = JSON.stringify(p)
    aplicar(p, 'aceptar', 'paseador', T0 + MIN)
    expect(JSON.stringify(p)).toBe(antes)
  })

  it('guarda la nota y la marca de demostración', () => {
    const p = aplicar(nuevoPaseo(T0), 'aceptar', 'paseador', T0 + MIN, ' acepta en demo ', true)
    const e = p.eventos[1]
    expect(e.nota).toBe('acepta en demo')
    expect(e.demo).toBe(true)
  })
})

describe('caminos completos', () => {
  it('feliz: solicitado → … → cerrado', () => {
    const p = en('cerrado')
    expect(p.estado).toBe('cerrado')
  })

  it('el paseador rechaza', () => {
    expect(en('rechazado').eventos.map((e) => e.accion)).toEqual(['solicitar', 'rechazar'])
  })

  it('vence el plazo', () => {
    expect(en('expirado').eventos.map((e) => e.accion)).toEqual(['solicitar', 'expirar'])
  })

  it('cancelación: el dueño cancela en solicitado, aceptado o en camino; en paseo ya no', () => {
    for (const e of ['solicitado', 'aceptado', 'en_camino'] as const) expect(puede(en(e), 'cancelar', 'dueno'), e).toBe(true)
    for (const e of ['en_paseo', 'entregado'] as const) expect(puede(en(e), 'cancelar', 'dueno'), e).toBe(false)
    const c = aplicar(en('aceptado'), 'cancelar', 'paseador', T0 + 20 * MIN)
    expect(c.estado).toBe('cancelado')
  })

  it('disputa: se reporta mientras hay paseo; el equipo resuelve con nota', () => {
    for (const e of ['aceptado', 'en_camino', 'en_paseo', 'entregado'] as const) {
      expect(puede(en(e), 'reportar', 'dueno'), e).toBe(true)
      expect(puede(en(e), 'reportar', 'paseador'), e).toBe(true)
    }
    for (const e of ['solicitado', 'rechazado', 'expirado', 'cerrado', 'cancelado', 'en_disputa'] as const) expect(puede(en(e), 'reportar', 'dueno'), e).toBe(false)
    const d = en('en_disputa')
    expect(intentar(d, 'resolver', 'sistema', ultimaHora(d) + MIN).ok).toBe(false) // sin nota no
    expect(aplicar(d, 'resolver', 'sistema', ultimaHora(d) + MIN, 'Se habló con las dos partes.').estado).toBe('cerrado')
    expect(aplicar(d, 'anular', 'sistema', ultimaHora(d) + MIN, 'El paseo no ocurrió.').estado).toBe('cancelado')
  })

  it('la entrega se confirma una sola vez y el recordatorio se manda una sola vez', () => {
    const p = en('entregado')
    const c = aplicar(p, 'confirmar_entrega', 'dueno', ultimaHora(p) + MIN)
    expect(c.estado).toBe('entregado')
    expect(intentar(c, 'confirmar_entrega', 'dueno', ultimaHora(c) + MIN).ok).toBe(false)
    const r = aplicar(p, 'recordar', 'sistema', ultimaHora(p) + MIN)
    expect(intentar(r, 'recordar', 'sistema', ultimaHora(r) + MIN).ok).toBe(false)
  })

  it('cerrar sin que el dueño haya confirmado pide una nota (lo decide el equipo)', () => {
    const p = en('entregado')
    expect(intentar(p, 'cerrar', 'sistema', ultimaHora(p) + MIN).ok).toBe(false)
    expect(aplicar(p, 'cerrar', 'sistema', ultimaHora(p) + MIN, 'El dueño avisó por WhatsApp que sí recibió.').estado).toBe('cerrado')
  })
})

describe('plazos (las cifras vienen de la configuración)', () => {
  it('la solicitud vence pasados los minutos para aceptar', () => {
    const p = nuevoPaseo(T0)
    expect(solicitudVencida(p, T0 + 119 * MIN, 120)).toBe(false)
    expect(solicitudVencida(p, T0 + 120 * MIN, 120)).toBe(true)
    expect(solicitudVencida(en('aceptado'), T0 + 999 * MIN, 120)).toBe(false)
  })

  it('«Entrega sin confirmar»: pasado el tiempo sin que el dueño confirme (no se confirma sola)', () => {
    const p = en('entregado')
    const entregada = p.eventos.find((e) => e.accion === 'entregar')!.at
    expect(entregaSinConfirmar(p, entregada + 14 * MIN, 15)).toBe(false)
    expect(entregaSinConfirmar(p, entregada + 15 * MIN, 15)).toBe(true)
    expect(tocaRecordatorio(p, entregada + 15 * MIN, 15)).toBe(true)
    // después del recordatorio sigue «sin confirmar», pero ya no toca otro recordatorio
    const r = aplicar(p, 'recordar', 'sistema', entregada + 15 * MIN)
    expect(entregaSinConfirmar(r, entregada + 60 * MIN, 15)).toBe(true)
    expect(tocaRecordatorio(r, entregada + 60 * MIN, 15)).toBe(false)
    expect(r.estado).toBe('entregado')
  })

  it('con la entrega confirmada ya no está «sin confirmar»', () => {
    const p = aplicar(en('entregado'), 'confirmar_entrega', 'dueno', T0 + 99 * MIN)
    expect(entregaSinConfirmar(p, T0 + 999 * MIN, 15)).toBe(false)
  })

  it('cancelación tardía: menos de 2 horas antes del paseo', () => {
    const inicio = T0 + 10 * 60 * MIN
    expect(esCancelacionTardia(inicio, inicio - 3 * 60 * MIN, 2)).toBe(false)
    expect(esCancelacionTardia(inicio, inicio - 119 * MIN, 2)).toBe(true)
  })
})

describe('«avisar»: los avisos de ubicación del paseo', () => {
  it('solo el sistema puede avisar y solo mientras el paseo está en curso', () => {
    expect(puede(en('en_paseo'), 'avisar', 'sistema')).toBe(true)
    expect(puede(en('en_paseo'), 'avisar', 'dueno')).toBe(false)
    expect(puede(en('en_paseo'), 'avisar', 'paseador')).toBe(false)
    for (const e of ESTADOS.filter((x) => x !== 'en_paseo')) expect(puede(en(e), 'avisar', 'sistema'), e).toBe(false)
  })

  it('no cambia el estado y queda en el registro con hora, quién y qué se avisó', () => {
    const p = en('en_paseo')
    const r = aplicar(p, 'avisar', 'sistema', ultimaHora(p) + MIN, 'Salió de la zona', true, 'salida')
    expect(r.estado).toBe('en_paseo')
    expect(r.eventos).toHaveLength(p.eventos.length + 1)
    const e = r.eventos[r.eventos.length - 1]
    expect(e).toMatchObject({ accion: 'avisar', quien: 'sistema', de: 'en_paseo', a: 'en_paseo', demo: true, aviso: 'salida', nota: 'Salió de la zona' })
    expect(e.at).toBe(ultimaHora(p) + MIN)
  })

  it('se puede avisar varias veces (no es una acción de una sola vez)', () => {
    let p = en('en_paseo')
    for (let i = 1; i <= 3; i++) p = aplicar(p, 'avisar', 'sistema', ultimaHora(p) + MIN, undefined, false, 'borde')
    expect(p.eventos.filter((e) => e.accion === 'avisar')).toHaveLength(3)
    expect(p.estado).toBe('en_paseo')
  })

  it('después de avisar, el paseo sigue su camino normal (entregar, confirmar, cerrar)', () => {
    let p = aplicar(en('en_paseo'), 'avisar', 'sistema', T0 + 10 * MIN, undefined, false, 'quieto')
    p = aplicar(p, 'entregar', 'paseador', T0 + 11 * MIN)
    expect(p.estado).toBe('entregado')
  })

  it('un aviso con una hora anterior al registro se rechaza', () => {
    const p = en('en_paseo')
    expect(intentar(p, 'avisar', 'sistema', ultimaHora(p) - 1).ok).toBe(false)
  })
})
