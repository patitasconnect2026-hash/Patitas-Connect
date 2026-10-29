import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { etiquetasJsx } from './pruebas/etiquetas'
import { inputBase } from './ui'

/**
 * Guardia de celular: reglas de buena-pagina que se pueden revisar leyendo el código.
 * Lo que depende de verlo en pantalla (contraste real, zonas táctiles) lo mide scripts/auditoria-celular.mjs.
 */

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

const FUENTES = [...archivos('app'), ...archivos('components'), ...archivos('lib')]
const leer = (f: string) => fs.readFileSync(path.join(RAIZ, f), 'utf8')

describe('campos de texto', () => {
  it('inputBase usa letra de 16 px o más (con menos, el iPhone hace zoom al tocar)', () => {
    const m = inputBase.match(/text-\[(\d+(?:\.\d+)?)px\]/)
    expect(m, 'inputBase no define tamaño de letra').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(16)
  })

  it('ningún campo (input, textarea, select) fija una letra menor a 16 px', () => {
    const malos: string[] = []
    for (const f of FUENTES.filter((x) => x.endsWith('.tsx'))) {
      for (const e of etiquetasJsx(leer(f))) {
        if (!['input', 'textarea', 'select'].includes(e.nombre)) continue
        for (const t of e.texto.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
          if (Number(t[1]) < 16) malos.push(`${f}:${e.linea}  text-[${t[1]}px]`)
        }
      }
    }
    expect(malos).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* Contraste (fórmula WCAG), con los colores reales de app/globals.css  */
/* ------------------------------------------------------------------ */

const CSS = fs.readFileSync(path.join(RAIZ, 'app', 'globals.css'), 'utf8')

function color(token: string): string {
  const m = CSS.match(new RegExp(`--color-${token}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`Falta --color-${token} en app/globals.css`)
  return m[1]
}

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const FONDOS_CLAROS = ['canvas', 'paper', 'sand', 'sand-2', 'brand-50', 'brand-100']

describe('contraste de texto', () => {
  it('el gris secundario (ink-soft) llega a 4,5:1 sobre todos los fondos claros del tema', () => {
    for (const f of FONDOS_CLAROS) {
      expect(contraste(color('ink-soft'), color(f)), `ink-soft sobre ${f}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('la letra blanca llega a 4,5:1 sobre el naranja de los botones (brand-700)', () => {
    expect(contraste('#ffffff', color('brand-700'))).toBeGreaterThanOrEqual(4.5)
  })

  it('el estilo del botón principal usa brand-700 y no el naranja claro con letra blanca', () => {
    const ui = leer(path.join('lib', 'ui.ts'))
    const principal = ui.match(/export const btnPrimary =\s*'([^']*)'/)?.[1] ?? ''
    expect(principal).toContain('bg-brand-700')
    expect(principal).not.toContain('bg-brand-600')
  })

  it('no quedan grises claros escritos como text-ink/30 a /65 (usa text-ink-soft)', () => {
    const malos: string[] = []
    for (const f of FUENTES) {
      leer(f)
        .split('\n')
        .forEach((linea, i) => {
          for (const m of linea.matchAll(/(?<![\w-])((?:[a-z0-9-]+:)*)text-ink\/(30|35|40|45|50|55|60|65)(?!\d)/g)) {
            if (!m[1].includes('disabled:')) malos.push(`${f}:${i + 1}  ${m[0]}`)
          }
        })
    }
    expect(malos).toEqual([])
  })

  it('ningún texto con letra blanca va sobre el naranja claro (bg-brand-600) dentro del mismo elemento', () => {
    const malos: string[] = []
    for (const f of FUENTES.filter((x) => x.endsWith('.tsx'))) {
      // Cada cadena de clases (entre comillas) es un elemento: si trae las dos, es un botón o chip con 3,6:1.
      for (const m of leer(f).matchAll(/(["'`])([^"'`\n]*\bbg-brand-600\b[^"'`\n]*)\1/g)) {
        const c = m[2]
        // Un círculo con solo un ícono (centrado y sin tipografía propia) necesita 3:1, no 4,5:1.
        const discoDeIcono = c.includes('place-items-center') && !c.includes('font-') && !c.includes('text-[')
        if (/(?<![\w:-])text-white(?![\w/-])/.test(c) && !discoDeIcono) malos.push(f)
      }
    }
    // Sin excepciones (decisión del equipo): las superficies con letra blanca chica usan bg-brand-700 (5,2:1).
    expect([...malos].sort()).toEqual([])
  })
})

describe('tamaño de letra', () => {
  it('ninguna letra baja de 12 px (ni en clases text-[Npx] ni en la etiqueta eyebrow)', () => {
    const malos: string[] = []
    for (const f of FUENTES.filter((x) => x.endsWith('.tsx'))) {
      leer(f)
        .split('\n')
        .forEach((linea, i) => {
          for (const m of linea.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
            if (Number(m[1]) < 12) malos.push(`${f}:${i + 1}  ${m[0]}`)
          }
        })
    }
    expect(malos).toEqual([])
    const eyebrow = CSS.match(/@utility eyebrow\s*\{[^}]*font-size:\s*(\d+(?:\.\d+)?)px/)
    expect(eyebrow, 'no se encontró @utility eyebrow').not.toBeNull()
    expect(Number(eyebrow![1])).toBeGreaterThanOrEqual(12)
  })

  it('los botones, enlaces y etiquetas tocables no fijan letra de 12 o 12,5 px (se leen para decidir)', () => {
    const malos: string[] = []
    for (const f of FUENTES.filter((x) => x.endsWith('.tsx'))) {
      for (const e of etiquetasJsx(leer(f))) {
        if (!['button', 'a', 'label', 'Link'].includes(e.nombre)) continue
        if (/text-\[(12|12\.5)px\]/.test(e.texto)) malos.push(`${f}:${e.linea}  <${e.nombre}>`)
      }
    }
    expect(malos).toEqual([])
  })
})

describe('zonas táctiles', () => {
  it('ningún botón, enlace o etiqueta tocable fija un tamaño menor a 44 px (h-1 a h-10, w-1 a w-10)', () => {
    const malos: string[] = []
    for (const f of FUENTES.filter((x) => x.endsWith('.tsx'))) {
      for (const e of etiquetasJsx(leer(f))) {
        if (!['button', 'a', 'label', 'Link'].includes(e.nombre)) continue
        // Un label solo cuenta si es tocable (cursor-pointer); los de formulario envuelven al campo.
        if (e.nombre === 'label' && !e.texto.includes('cursor-pointer')) continue
        if (/(?<![\w:-])(?:h|w)-(?:[1-9]|10)(?![\w.[/-])/.test(e.texto)) malos.push(`${f}:${e.linea}  <${e.nombre}>`)
      }
    }
    expect(malos).toEqual([])
  })
})
