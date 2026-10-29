import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(__dirname, '..')

function archivos(dir: string): string[] {
  const salida: string[] = []
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) salida.push(...archivos(rel))
    else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) salida.push(rel)
  }
  return salida
}

/** Texto escrito a mano entre <tag>…</tag>: sin llaves de JSX, con los espacios juntos. */
function textosDe(src: string, etiqueta: RegExp): string[] {
  const salida: string[] = []
  for (const m of src.matchAll(etiqueta)) {
    const t = m[m.length - 1].replace(/\{[^}]*\}/g, '').split(/\s+/).filter(Boolean)
    salida.push(t.join(' '))
  }
  return salida
}
const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length

const PANTALLAS = [...archivos('app'), ...archivos('components')]

/** Títulos de más de 5 palabras que el equipo dictó tal cual. Cada uno con su razón. */
const TITULOS_PERMITIDOS = new Map([['Cómo se cuida a tu perro', 'Titular de Seguridad: lo dictó el equipo.']])

describe('textos cortos: lo que la auditoría de celular no alcanza a ver', () => {
  it('ningún título (h1 a h3) escrito a mano pasa de 5 palabras', () => {
    const largos: string[] = []
    for (const f of PANTALLAS) {
      const src = fs.readFileSync(path.join(RAIZ, f), 'utf8')
      for (const t of textosDe(src, /<(h[1-3])\b[^>]*>([^<]*)<\/\1>/g)) {
        if (palabras(t) > 5 && !TITULOS_PERMITIDOS.has(t)) largos.push(`${f}: «${t}» (${palabras(t)})`)
      }
    }
    expect(largos).toEqual([])
  })

  /**
   * Líneas de apoyo (<p>) de más de 12 palabras. Esta tabla puede BAJAR, nunca subir:
   * un texto nuevo largo va con «Ver más». Cuando un archivo llegue a 0, quítalo de la lista.
   */
  const LINEAS_LARGAS_PENDIENTES: Record<string, number> = {
    'app/error.tsx': 1,
    'app/afiche/AficheClient.tsx': 1,
    'components/DogSheets.tsx': 1,
    'components/TermsBlocks.tsx': 1, // legal: se queda completo
    'components/SosSheet.tsx': 1,
    'components/SafetyView.tsx': 1,
    'components/Onboarding.tsx': 2,
    'components/Explore.tsx': 1,
    'components/BookingSheet.tsx': 1,
    'components/WalkerCard.tsx': 1,
    'components/ConfirmSheet.tsx': 1,
    'components/admin/AdminPanel.tsx': 3,
    'components/walker/WalkerSosSheet.tsx': 1,
    'components/walker/QuizStep.tsx': 1,
    'components/walker/WalkerApp.tsx': 1,
    'components/walker/WalkerOnboarding.tsx': 4,
    'components/walker/WalkerHome.tsx': 3,
  }

  it('las líneas de apoyo de más de 12 palabras no aumentan', () => {
    const subidas: string[] = []
    for (const f of PANTALLAS) {
      const src = fs.readFileSync(path.join(RAIZ, f), 'utf8')
      const n = textosDe(src, /<p\b[^>]*>([^<]*)<\/p>/g).filter((t) => palabras(t) > 12).length
      const permitido = LINEAS_LARGAS_PENDIENTES[f.split(path.sep).join('/')] ?? 0
      if (n > permitido) subidas.push(`${f}: ${n} (permitido ${permitido})`)
    }
    expect(subidas).toEqual([])
  })
})

describe('VerMas', () => {
  it('es un <details> nativo: cerrado al empezar, con «Ver más» y «Ver menos» y zona táctil de 44 px', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { VerMas } = await import('../components/ui/VerMas')
    const html = renderToStaticMarkup(VerMas({ children: 'Detalle largo' }))
    expect(html).toMatch(/^<details\b/)
    expect(html).not.toMatch(/<details[^>]*\bopen\b/)
    expect(html).toContain('<summary')
    expect(html).toContain('Ver más')
    expect(html).toContain('Ver menos')
    expect(html).toContain('min-h-11')
    expect(html).toContain('Detalle largo')
  })

  it('el texto del botón se puede cambiar', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { VerMas } = await import('../components/ui/VerMas')
    const html = renderToStaticMarkup(VerMas({ children: 'x', abrir: 'Ver reglas', cerrar: 'Ocultar' }))
    expect(html).toContain('Ver reglas')
    expect(html).toContain('Ocultar')
  })
})

/** Quita los comentarios (así no se confunde un comentario con un texto de pantalla). */
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

describe('lo que no se escribe en pantalla', () => {
  /**
   * El equipo pidió que ningún texto diga «prueba» (ni «pruebas»): las fotos y la ubicación son señales. Se mira todo el
   * código que escribe textos (pantallas y módulos de textos), menos lo legal y el examen, que se quedan completos.
   */
  it('ningún texto dice «prueba» ni «pruebas»', () => {
    const fuentes = [...PANTALLAS, ...fs.readdirSync(path.join(RAIZ, 'lib')).filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f)).map((f) => path.join('lib', f))]
    const exentos = new Set([path.join('lib', 'legal.ts'), path.join('lib', 'quiz.ts')])
    const malos: string[] = []
    for (const f of fuentes) {
      if (exentos.has(f)) continue
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      for (const m of src.matchAll(/[^\n]*\bpruebas?\b[^\n]*/gi)) malos.push(`${f}: ${m[0].trim().slice(0, 110)}`)
    }
    expect(malos).toEqual([])
  })
})
