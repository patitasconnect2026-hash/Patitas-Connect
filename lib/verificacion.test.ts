import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  casillasMarcadas,
  COMPROBACIONES,
  comprobacionesMarcadas,
  llevaEtiquetaNuevo,
  MAX_PERROS_POR_PASEO,
  primerPaseoHecho,
  reglaNuevoDueno,
  reglaNuevoPaseador,
  REGLA_NUEVO,
  restoComprobaciones,
  resumenComprobaciones,
  textoCantidadComprobaciones,
  textoHastaComprobaciones,
  textoMaxPerros,
} from './verificacion'

const RAIZ = path.resolve(__dirname, '..')

function archivos(dir: string): string[] {
  const salida: string[] = []
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) salida.push(...archivos(rel))
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) salida.push(rel)
  }
  return salida
}
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

describe('las seis comprobaciones (lista provisional aprobada por el equipo)', () => {
  it('son exactamente seis, en este orden', () => {
    expect(COMPROBACIONES.map((c) => c.id)).toEqual(['dni', 'distrito', 'celular', 'consultas', 'examen', 'primerPaseo'])
  })

  it('la redacción completa es la aprobada', () => {
    expect(COMPROBACIONES.map((c) => c.completo)).toEqual([
      'DNI a la vista en videollamada o en persona (el rostro coincide y es mayor de 18)',
      'Vive o estudia en el distrito (constancia o recibo visto)',
      'Celular confirmado por WhatsApp',
      'Consultas oficiales hechas en vivo en la videollamada',
      'Examen aprobado y respuestas críticas revisadas',
      'Primer paseo acompañado hecho',
    ])
  })

  it('los títulos cortos tienen hasta 5 palabras y las líneas de apoyo hasta 12', () => {
    for (const c of COMPROBACIONES) {
      expect(c.titulo.split(/\s+/).length, c.titulo).toBeLessThanOrEqual(5)
      expect(c.apoyo.split(/\s+/).length, c.apoyo).toBeLessThanOrEqual(12)
    }
  })

  it('nunca dicen «verificado» a secas', () => {
    for (const c of COMPROBACIONES) {
      expect(`${c.titulo} ${c.apoyo} ${c.detalle}`).not.toMatch(/verificad/i)
    }
  })
})

describe('comprobacionesMarcadas', () => {
  it('muestra solo las marcadas', () => {
    expect(comprobacionesMarcadas(['dni', 'examen']).map((c) => c.id)).toEqual(['dni', 'examen'])
  })
  it('sin ninguna marcada no afirma nada', () => {
    expect(comprobacionesMarcadas([])).toEqual([])
  })
})

/**
 * «Verificado» a secas: la palabra no debe aparecer para hablar de un PASEADOR (solo se muestran las comprobaciones
 * marcadas). La única excepción son los archivos del PAGO: «pago verificado» es lo que el equipo marca cuando vio que
 * la plata llegó (lib/pagos.ts). Esta lista no crece sin una razón.
 */
const VERIFICADO_PENDIENTE_TAREA_12: Record<string, number> = {
  'components/DniSheet.tsx': 0,
}
/** Archivos donde «verificado» habla del PAGO, no del paseador. */
const VERIFICADO_ES_DEL_PAGO = [
  'lib/pagos.ts',
  'lib/pagosTextos.ts',
  'lib/adminTextos.ts',
  'components/PagoCard.tsx',
  'components/admin/ColaDePagos.tsx',
  'components/admin/ColaDeCasos.tsx',
  'components/walker/WalkerHome.tsx',
  'components/LiveWalk.tsx',
]

describe('«verificado» a secas', () => {
  it('no aparece en archivos nuevos y no sube en los que quedaban', () => {
    const subidas: string[] = []
    for (const f of [...archivos('app'), ...archivos('components'), ...archivos('lib')]) {
      if (f === path.join('lib', 'verificacion.ts') || f === path.join('lib', 'legal.ts')) continue // legal: el equipo lo mantiene tal cual
      const rel = f.split(path.sep).join('/')
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      // Nunca de una persona: «paseador verificado», «perfil verificado», «cuenta verificada»…
      src.split('\n').forEach((l, i) => {
        if (/\b(paseador|paseadora|walker|perfil|cuenta|vecino|estudiante)s?\s+(est[aá]\s+)?verificad[oa]s?\b/i.test(l)) subidas.push(`${f}:${i + 1}  ${l.trim().slice(0, 90)}`)
      })
      if (VERIFICADO_ES_DEL_PAGO.includes(rel)) continue
      const n = src.split('\n').filter((l) => /\bverificad[oa]s?\b/i.test(l)).length
      const permitido = VERIFICADO_PENDIENTE_TAREA_12[rel] ?? 0
      if (n > permitido) subidas.push(`${f}: ${n} (permitido ${permitido})`)
    }
    expect(subidas).toEqual([])
  })
})

describe('dos reglas distintas, escritas una sola vez', () => {
  it('regla 1: la comprobación 6 se marca con el primer paseo acompañado, no con los 10 paseos', () => {
    expect(primerPaseoHecho(0)).toBe(false)
    expect(primerPaseoHecho(1)).toBe(true)
    const cinco = { dni: true, distrito: true, celular: true, consultas: true, examen: true }
    expect(casillasMarcadas(cinco, 0)).toHaveLength(5)
    expect(casillasMarcadas(cinco, 1)).toHaveLength(COMPROBACIONES.length)
  })

  it('regla 1: marcar «primerPaseo» a mano no la enciende si no hubo paseo acompañado', () => {
    expect(casillasMarcadas({ primerPaseo: true }, 0)).toEqual([])
  })

  it('regla 2: «Nuevo» dura hasta 10 paseos y lleva máximo 2 perros', () => {
    expect(REGLA_NUEVO).toEqual({ etiqueta: 'Nuevo', paseos: 10, maxPerros: 2 })
    expect(llevaEtiquetaNuevo(9)).toBe(true)
    expect(llevaEtiquetaNuevo(10)).toBe(false)
    expect(MAX_PERROS_POR_PASEO).toBe(3)
  })

  it('las dos reglas son independientes: con las seis comprobaciones se puede seguir siendo «Nuevo»', () => {
    const todas = { dni: true, distrito: true, celular: true, consultas: true, examen: true }
    expect(casillasMarcadas(todas, 1)).toHaveLength(COMPROBACIONES.length)
    expect(llevaEtiquetaNuevo(1)).toBe(true)
  })

  it('al cumplir los 10 paseos, el paseador lee que la etiqueta se quita (no «hasta los 10» con la barra llena)', () => {
    expect(reglaNuevoPaseador(9)).toMatch(/Hasta los 10 paseos llevas la etiqueta/)
    expect(reglaNuevoPaseador(10)).toMatch(/Ya cumpliste los 10 paseos: sin etiqueta «Nuevo»/)
    expect(reglaNuevoPaseador(10)).toContain(`hasta ${MAX_PERROS_POR_PASEO} perros`)
  })

  it('el dueño y el paseador leen la misma regla (solo cambia la persona)', () => {
    expect(reglaNuevoPaseador()).toMatch(/10 paseos.*«Nuevo».*2 perros/)
    expect(reglaNuevoDueno()).toMatch(/10 paseos.*«Nuevo».*2 perros/)
    expect(reglaNuevoDueno()).not.toMatch(/comprobaci/i)
  })

  it('las frases de las reglas son líneas de apoyo: 12 palabras o menos', () => {
    for (const t of [reglaNuevoPaseador(), reglaNuevoPaseador(10), reglaNuevoDueno(), textoMaxPerros(), resumenComprobaciones(), restoComprobaciones()]) {
      expect(t.split(/\s+/).length, t).toBeLessThanOrEqual(12)
    }
  })

  it('los textos de cantidad salen de la lista', () => {
    expect(textoCantidadComprobaciones()).toBe(`${COMPROBACIONES.length} comprobaciones`)
    expect(textoCantidadComprobaciones(3)).toBe(`3 de ${COMPROBACIONES.length} comprobaciones`)
    expect(textoHastaComprobaciones()).toBe(`Hasta ${COMPROBACIONES.length} comprobaciones`)
    expect(textoMaxPerros()).toContain(String(MAX_PERROS_POR_PASEO))
  })

  it('el resumen y el resto juntos nombran las seis, sin repetir ni inventar', () => {
    const junto = `${resumenComprobaciones()} ${restoComprobaciones()}`.toLowerCase()
    for (const c of COMPROBACIONES) expect(junto, c.id).toContain(c.titulo.toLowerCase())
  })
})

describe('esas reglas no se escriben a mano en las pantallas', () => {
  const pantallas = [...archivos('app'), ...archivos('components')]

  it('ninguna pantalla escribe «6 comprobaciones» ni «seis comprobaciones»', () => {
    const malas: string[] = []
    for (const f of pantallas) {
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      if (/\b(6|seis) comprobaciones/i.test(src)) malas.push(f)
    }
    expect(malas).toEqual([])
  })

  it('ninguna pantalla escribe «10 paseos» ni «2 perros»: salen de REGLA_NUEVO', () => {
    const malas: string[] = []
    for (const f of pantallas) {
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      if (/\b(10 paseos|primeros 10|2 perros|dos perros)\b/i.test(src)) malas.push(f)
    }
    expect(malas).toEqual([])
  })

  it('la verificación del paseador no inventa casillas: sin «Avales» ni «Registros públicos»', () => {
    const src = fs.readFileSync(path.join(RAIZ, 'components/walker/WalkerHome.tsx'), 'utf8')
    expect(src).not.toMatch(/Avales|Registros p[uú]blicos/)
  })
})
