import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { adaptadorMemoria } from './datos'
import { almacenMemoria, conservarFotosDe, guardarFoto, guardarSelfie, leerFotos } from './datos/fotos'
import { claveSelfie, diaDeLima, esSelfie, horaDeLima, selfieDeHoy, textoSelfie, TEXTO_SELFIE } from './selfie'
import { COMPROBACIONES } from './verificacion'
import { WALKERS } from './data'
import { SelfieEnPaseo, SelfieDelPaseador } from '../components/SelfieDelDia'

const RAIZ = path.resolve(__dirname, '..')
const MANANA = Date.UTC(2026, 9, 14, 13, 41) // 08:41 en Lima
const bytes = (n = 10) => new Uint8Array(n).buffer

describe('foto de hoy: día y hora de Lima', () => {
  it('08:41 de la mañana en Lima, aunque sean las 13:41 UTC', () => {
    expect(horaDeLima(MANANA)).toBe('08:41')
    expect(diaDeLima(MANANA)).toBe('2026-10-14')
  })
  it('de noche en Lima sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    const noche = Date.UTC(2026, 9, 15, 3, 0) // 22:00 del 14 en Lima
    expect(diaDeLima(noche)).toBe('2026-10-14')
  })
})

describe('foto de hoy: guardar y encontrar (una por día)', () => {
  const deps = () => ({ adaptador: adaptadorMemoria(), almacen: almacenMemoria() })

  it('se guarda con la clave del día y se encuentra solo hoy y solo de ese paseador', async () => {
    const d = deps()
    const r = await guardarSelfie(d, { walkerId: 'carlos', bytes: bytes(), t: MANANA })
    expect(r.ok).toBe(true)
    const fotos = leerFotos(d.adaptador)
    expect(fotos).toHaveLength(1)
    expect(fotos[0].jobId).toBe(claveSelfie('carlos', '2026-10-14'))
    expect(esSelfie(fotos[0])).toBe(true)
    expect(selfieDeHoy(fotos, 'carlos', MANANA + 60_000)?.id).toBe(fotos[0].id)
    expect(selfieDeHoy(fotos, 'lucia', MANANA)).toBeNull()
    expect(selfieDeHoy(fotos, 'carlos', MANANA + 24 * 3600_000)).toBeNull() // al día siguiente falta
    expect(selfieDeHoy(fotos, 'carlos', 0)).toBeNull() // cargando
  })

  it('tomar otra el mismo día reemplaza a la anterior; la de ayer se suelta', async () => {
    const d = deps()
    await guardarSelfie(d, { walkerId: 'carlos', bytes: bytes(5), t: MANANA - 24 * 3600_000 })
    await guardarSelfie(d, { walkerId: 'carlos', bytes: bytes(6), t: MANANA })
    await guardarSelfie(d, { walkerId: 'carlos', bytes: bytes(7), t: MANANA + 600_000 })
    const fotos = leerFotos(d.adaptador)
    expect(fotos).toHaveLength(1)
    expect(fotos[0].bytes).toBe(7)
    expect(d.almacen.datos.size).toBe(1)
  })

  it('no estorba a las fotos del paseo y sobrevive cuando empieza otro paseo', async () => {
    const d = deps()
    await guardarFoto(d, { jobId: 'job-1', bytes: bytes(), t: MANANA, codigo: '47', ubicacion: null })
    await guardarSelfie(d, { walkerId: 'carlos', bytes: bytes(), t: MANANA })
    await conservarFotosDe(d, ['job-2'])
    const fotos = leerFotos(d.adaptador)
    expect(fotos.map((f) => f.jobId)).toEqual([claveSelfie('carlos', '2026-10-14')])
    expect(d.almacen.datos.size).toBe(1)
  })

  it('el texto: «Foto de hoy, 08:41» o «Sin foto de hoy»', () => {
    expect(textoSelfie({ t: MANANA })).toBe('Foto de hoy, 08:41')
    expect(textoSelfie(null)).toBe('Sin foto de hoy')
  })
})

describe('foto de hoy: NO es una comprobación y no afirma nada', () => {
  it('lib/verificacion.ts no la menciona y sigue con sus seis comprobaciones', () => {
    expect(COMPROBACIONES.map((c) => c.id)).toEqual(['dni', 'distrito', 'celular', 'consultas', 'examen', 'primerPaseo'])
    expect(fs.readFileSync(path.join(RAIZ, 'lib', 'verificacion.ts'), 'utf8')).not.toMatch(/selfie|foto de hoy/i)
  })

  it('ningún texto dice «verificado», «identidad», «es quien dice ser», «seguro» ni «garantizado»', () => {
    const quitar = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    const fuentes = [
      JSON.stringify(TEXTO_SELFIE),
      quitar(fs.readFileSync(path.join(RAIZ, 'lib', 'selfie.ts'), 'utf8')),
      quitar(fs.readFileSync(path.join(RAIZ, 'components', 'SelfieDelDia.tsx'), 'utf8')),
    ].join(' ')
    expect(fuentes).not.toMatch(/verificad|identidad|quien dice ser|\bseguro\b|garantiz|capacitad|certificad/i)
  })

  it('dice con honestidad que solo se ve en este teléfono mientras no haya servidor', () => {
    expect(TEXTO_SELFIE.soloAqui).toBe('Solo se ve en este teléfono mientras no haya servidor.')
  })
})

describe('foto de hoy: lo que ve la familia', () => {
  const real = { esEjemplo: false }
  const foto = { id: 'f1', jobId: claveSelfie('lucia', '2026-10-14'), t: MANANA, codigo: '', ubicacion: null, bytes: 10, almacen: 'memoria' as const }

  it('sin foto y paseador real: «Sin foto de hoy» (no se bloquea nada)', () => {
    expect(renderToStaticMarkup(createElement(SelfieEnPaseo, { foto: null, walker: real }))).toContain('Sin foto de hoy')
  })
  it('con foto: «Foto de hoy, 08:41» y la nota de que solo se ve en este teléfono', () => {
    const h = renderToStaticMarkup(createElement(SelfieEnPaseo, { foto, walker: real }))
    expect(h).toContain('Foto de hoy, 08:41')
    expect(h).toContain('Solo se ve en este teléfono mientras no haya servidor.')
  })
  it('paseador de ejemplo sin foto: imagen de ejemplo marcada «Demostración»', () => {
    const h = renderToStaticMarkup(createElement(SelfieEnPaseo, { foto: null, walker: WALKERS[0] }))
    expect(h).toContain('Foto de ejemplo')
    expect(h).toContain('Demostración')
    expect(h).not.toContain('Foto de hoy,')
  })
  it('el paseador ve su tarjeta con el botón «Tomar mi foto» (en demostración, «Demostración»)', () => {
    const h = renderToStaticMarkup(createElement(SelfieDelPaseador, { foto: null, demo: true, onTomar: () => undefined }))
    expect(h).toContain('Tomar mi foto')
    expect(h).toContain('Sin foto de hoy')
    expect(h).toContain('Demostración')
  })
})
