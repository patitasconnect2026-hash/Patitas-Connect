import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import type { LatLng } from './geo'
import { desplazar } from './zona'
import { estadoEnVivo, motivosDeSospecha, SALTO_MINIMO_METROS, TEXTO_EN_VIVO, TEXTO_SOSPECHA, textoDeMotivoSospecha } from './sospechas'

const CASA: LatLng = [-12.0999, -77.0374]
const T0 = Date.UTC(2026, 9, 14, 15, 0, 0)
const foto = (pos: LatLng, precisionM: number | null = 10, t = T0) => ({ pos, precisionM, t })

describe('fotos sospechosas (las mismas reglas que la base)', () => {
  it('una foto cerca de la casa, con poco error y sin saltos no se marca', () => {
    expect(motivosDeSospecha(foto(desplazar(CASA, 50, 0), 20), CASA, null)).toEqual([])
  })
  it('precisión peor que el umbral de config', () => {
    expect(motivosDeSospecha(foto(CASA, CONFIG.sospechaPrecisionMetros), CASA, null)).toEqual([])
    expect(motivosDeSospecha(foto(CASA, CONFIG.sospechaPrecisionMetros + 1), CASA, null)).toEqual(['precision'])
  })
  it('lejos de la casa del paseo (radio de config)', () => {
    expect(motivosDeSospecha(foto(desplazar(CASA, CONFIG.sospechaRadioMetros - 50, 0)), CASA, null)).toEqual([])
    expect(motivosDeSospecha(foto(desplazar(CASA, CONFIG.sospechaRadioMetros + 100, 0)), CASA, null)).toEqual(['lejos'])
    // Sin casa conocida no se puede decir «lejos»
    expect(motivosDeSospecha(foto(desplazar(CASA, 5000, 0)), null, null)).toEqual([])
  })
  it('salto imposible entre dos fotos: más rápido que la velocidad de config', () => {
    const antes = foto(CASA, 10, T0)
    // 3 km en 10 minutos = 18 km/h: normal
    expect(motivosDeSospecha(foto(desplazar(CASA, 0, 3000), 10, T0 + 10 * 60_000), null, antes)).toEqual([])
    // 3 km en 2 minutos = 90 km/h: salto
    expect(motivosDeSospecha(foto(desplazar(CASA, 0, 3000), 10, T0 + 2 * 60_000), null, antes)).toEqual(['salto'])
  })
  it('el error normal del GPS (menos de 100 m) no cuenta como salto aunque pasen pocos segundos', () => {
    expect(SALTO_MINIMO_METROS).toBe(100)
    expect(motivosDeSospecha(foto(desplazar(CASA, 40, 0), 10, T0 + 1000), null, foto(CASA, 10, T0))).toEqual([])
  })
  it('puede tener varios motivos a la vez', () => {
    expect(motivosDeSospecha(foto(desplazar(CASA, 0, 2000), 90, T0 + 1000), CASA, foto(CASA, 10, T0))).toEqual(['precision', 'lejos', 'salto'])
  })
  it('los umbrales de la migración SQL son los de lib/config.ts', () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase', 'migrations', '20261016300000_ubicacion_y_sospechas.sql'), 'utf8')
    expect(sql).toContain(`new.precision_m > ${CONFIG.sospechaPrecisionMetros}`)
    expect(sql).toContain(`> ${CONFIG.sospechaRadioMetros} then`)
    expect(sql).toContain(`/ 3600.0) > ${CONFIG.sospechaVelocidadKmh} then`)
    expect(sql).toContain(`if v_dist >= ${SALTO_MINIMO_METROS} and`)
  })
})

describe('ubicación en vivo', () => {
  it('es reciente hasta 3 intervalos; después deja de presentarse como «en vivo»', () => {
    const cada = CONFIG.segundosEnVivo
    expect(estadoEnVivo(null, T0)).toEqual({ estado: 'ninguna', haceSegundos: null })
    expect(estadoEnVivo(T0 - 2000, T0)).toEqual({ estado: 'reciente', haceSegundos: 2 })
    expect(estadoEnVivo(T0 - cada * 3 * 1000, T0).estado).toBe('reciente')
    expect(estadoEnVivo(T0 - (cada * 3 + 1) * 1000, T0).estado).toBe('vieja')
  })
  it('el texto dice la verdad: funciona con la app abierta y nunca promete que no se pueda falsificar', () => {
    expect(TEXTO_EN_VIVO.funciona).toBe('Funciona con la app abierta.')
    const todo = [JSON.stringify(TEXTO_EN_VIVO), TEXTO_EN_VIVO.hace(CONFIG.segundosEnVivo), JSON.stringify(TEXTO_SOSPECHA)].join(' ')
    expect(todo).toMatch(/se puede falsificar/)
    expect(todo).not.toMatch(/imposible de falsificar|no se puede falsificar|inalterable|a prueba|garantiz|\bseguro\b|100\s?%|tiempo real/i)
  })
  it('cada motivo tiene su frase', () => {
    for (const m of ['precision', 'lejos', 'salto']) expect(textoDeMotivoSospecha(m).length).toBeGreaterThan(10)
  })
})

describe('foto solo con la cámara de la app', () => {
  it('la pantalla de la cámara del paseo usa getUserMedia y no ofrece subir una foto de la galería', () => {
    const fuente = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    expect(fuente('components/walker/useCamara.ts')).toMatch(/getUserMedia/)
    for (const f of ['components/walker/CamaraPaseo.tsx', 'components/walker/useCamara.ts', 'components/walker/capturarFoto.ts']) expect(fuente(f), f).not.toMatch(/type="file"|type='file'|showOpenFilePicker/)
  })
})
