import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import type { TipoAviso } from './zona'
import { notaAviso, TEXTO_AVISOS, TEXTO_CASA, TEXTO_PANTALLA, TEXTO_UBICACION, textoAviso, textoZona } from './zonaTextos'

const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length
const PROHIBIDAS = /\bseguro\b|tiempo real|24\/7|100 ?%|garantiz/i
/** Frases de más de 5 palabras que el equipo dictó tal cual (como «Cómo se cuida a tu perro» en lib/textos.test.ts). */
const DICTADOS = new Set(['Aún no llegamos a tu zona.'])

describe('textos de la zona', () => {
  const clases = ['dentro', 'borde', 'fuera'] as const

  it('título de hasta 5 palabras y apoyo de hasta 12', () => {
    for (const c of clases) {
      const t = textoZona(c)
      if (!DICTADOS.has(t.titulo)) expect(palabras(t.titulo), `${c}: ${t.titulo}`).toBeLessThanOrEqual(5)
      expect(palabras(t.apoyo), `${c}: ${t.apoyo}`).toBeLessThanOrEqual(12)
    }
    expect(palabras(TEXTO_CASA.titulo)).toBeLessThanOrEqual(5)
    expect(palabras(TEXTO_CASA.apoyo)).toBeLessThanOrEqual(12)
    for (const boton of [TEXTO_CASA.marcar, TEXTO_CASA.cambiar, TEXTO_CASA.usar]) expect(palabras(boton)).toBeLessThanOrEqual(3)
  })

  it('«fuera» dice lo que pidió el equipo', () => {
    expect(textoZona('fuera').titulo).toBe('Aún no llegamos a tu zona.')
  })

  it('el margen del detalle sale de la configuración', () => {
    expect(textoZona('borde').detalle).toContain(`${CONFIG.zonaBufferMetros} m`)
    expect(textoZona('fuera').detalle).toContain(`${CONFIG.zonaBufferMetros} m`)
  })

  it('no promete lo que no existe', () => {
    for (const c of clases) {
      const t = textoZona(c)
      expect(`${t.titulo} ${t.apoyo} ${t.detalle ?? ''}`).not.toMatch(PROHIBIDAS)
    }
    expect(Object.values(TEXTO_CASA).join(' ')).not.toMatch(PROHIBIDAS)
  })
})

describe('textos de los avisos del paseo', () => {
  const tipos: TipoAviso[] = ['borde', 'salida', 'regreso', 'salto', 'quieto']

  it('título de hasta 5 palabras y apoyo de hasta 12', () => {
    for (const t of tipos) {
      const x = textoAviso(t)
      expect(palabras(x.titulo), `${t}: ${x.titulo}`).toBeLessThanOrEqual(5)
      expect(palabras(x.apoyo), `${t}: ${x.apoyo}`).toBeLessThanOrEqual(12)
    }
  })

  it('los números salen de la configuración, no están escritos a mano', () => {
    expect(textoAviso('quieto').titulo).toContain(String(CONFIG.minutosQuietoParaAviso))
    expect(textoAviso('borde').apoyo).toContain(`${CONFIG.avisoBordeMetros} m`)
    expect(textoAviso('salto').apoyo).toContain(`${CONFIG.velocidadMaximaKmh} km/h`)
    expect(textoAviso('salida').apoyo).toContain(String(CONFIG.lecturasFueraParaAlerta))
  })

  it('no promete lo que no existe', () => {
    for (const t of tipos) {
      const x = textoAviso(t)
      expect(`${x.titulo} ${x.apoyo}`).not.toMatch(PROHIBIDAS)
    }
    expect(Object.values(TEXTO_AVISOS).join(' ')).not.toMatch(PROHIBIDAS)
  })

  it('la nota del registro dice «Demostración» cuando es de prueba', () => {
    for (const t of tipos) {
      expect(notaAviso(t, true)).toMatch(/^Demostración · /)
      expect(notaAviso(t, false)).not.toContain('Demostración')
    }
  })

  it('para el dueño dice que entre dos celulares hace falta un servidor; no habla de tiempo real', () => {
    expect(TEXTO_AVISOS.servidorDueno).toMatch(/dos celulares/)
    expect(TEXTO_AVISOS.servidorDueno).toMatch(/servidor/)
    expect(TEXTO_AVISOS.alcance).toMatch(/solo señales/i)
  })
})

describe('los textos de zona y de ubicación no son jerga ni prometen de más', () => {
  const todo = () =>
    [
      ...(['dentro', 'borde', 'fuera'] as const).flatMap((c) => Object.values(textoZona(c))),
      ...(['borde', 'salida', 'regreso', 'salto', 'quieto', 'sin_ubicacion'] as const).flatMap((t) => Object.values(textoAviso(t))),
      ...Object.values(TEXTO_AVISOS),
      ...Object.values(TEXTO_CASA),
      ...Object.values(TEXTO_UBICACION),
      ...Object.values(TEXTO_PANTALLA),
    ].join(' | ')

  it('dicen «señales», no «lecturas» (es jerga)', () => {
    expect(todo()).not.toMatch(/lectura/i)
  })

  it('la hoja del paseador no promete que el dueño recibe los avisos: hoy no llegan a otro celular', () => {
    expect(TEXTO_UBICACION.linea3).toMatch(/no llega a otro celular/)
    expect(TEXTO_UBICACION.linea3).toMatch(/servidor/)
    expect(TEXTO_UBICACION.mas).toMatch(/pantalla apagada/)
  })

  it('con servidor la hoja del paseador dice la verdad: se envía cada pocos segundos con la app abierta, no se guarda el recorrido, y la ven la familia del paseo y el equipo', () => {
    expect(TEXTO_UBICACION.linea2Servidor).toBe('Se envía cada pocos segundos, con la app abierta.')
    expect(TEXTO_UBICACION.linea3Servidor).toBe('La ven la familia del paseo y el equipo.')
    // Ya no dice que la ubicación se queda en el teléfono: no es verdad con servidor.
    expect([TEXTO_UBICACION.linea2Servidor, TEXTO_UBICACION.linea3Servidor, TEXTO_UBICACION.masServidor].join(' ')).not.toMatch(/se queda en este teléfono|no se guarda en el servidor|no llegan a otro celular/i)
    expect(TEXTO_UBICACION.masServidor).toMatch(/cada pocos segundos/)
    expect(TEXTO_UBICACION.masServidor).toMatch(/con la app cerrada o la pantalla apagada no se envía/)
    expect(TEXTO_UBICACION.masServidor).toMatch(/No guardamos tu recorrido/)
    expect(TEXTO_UBICACION.masServidor).toMatch(/se borra/)
    // Cada línea visible es corta (hasta 12 palabras).
    for (const l of [TEXTO_UBICACION.linea2Servidor, TEXTO_UBICACION.linea3Servidor]) expect(l.split(/\s+/).length, l).toBeLessThanOrEqual(12)
  })

  it('el título de la alerta de salida dice «posible»: es una señal, no un hecho', () => {
    expect(textoAviso('salida').titulo).toMatch(/^Posible/)
  })

  it('la hoja de la casa dice para qué es y que el paseador no la ve', () => {
    expect(TEXTO_CASA.privacidad).toMatch(/teléfono/)
    expect(TEXTO_CASA.privacidad).toMatch(/paseador no la ve/)
  })
})
