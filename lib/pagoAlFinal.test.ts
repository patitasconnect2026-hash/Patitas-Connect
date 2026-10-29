/**
 * Guardia: el pago es AL FINAL del paseo (decisión del equipo). Estas pruebas fallan si alguien vuelve a pedir el
 * pago en la reserva, a bloquear la salida del paseador por un pago o a poner «Ya pagué» antes del paseo.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CONFIG } from './config'
import { PASEO_HECHO, TRANSICIONES_PAGO } from './pagos'

const RAIZ = path.resolve(__dirname, '..')
const leer = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8')
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

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

describe('el pago es al final del paseo', () => {
  it('ninguna pantalla ni texto habla de pagar antes o de que el paseo espere el pago', () => {
    const malos: string[] = []
    const prohibido = /Ya pagué|ya pagué|no sale hasta|verifique tu pago|verifica(r|do)? (tu|el) pago|Simular verificación|puedeEmpezar|pagoVerificado|Pago en revisión|Falta verificar el pago|paga y toca|pagas? antes|pago antes|antes de que empiece/
    for (const f of FUENTES) {
      sinComentarios(leer(f))
        .split('\n')
        .forEach((l, i) => {
          if (prohibido.test(l)) malos.push(`${f}:${i + 1}  ${l.trim().slice(0, 100)}`)
        })
    }
    expect(malos).toEqual([])
  })

  it('la reserva no pide pago: no muestra el QR ni los números, ni «A dónde pagas»', () => {
    const src = sinComentarios(leer('components/BookingSheet.tsx'))
    expect(src).not.toMatch(/CobroDelEquipo|PagoCard|A dónde pagas|cobroConfigurado/)
    expect(src).toContain('Cuándo pagas')
  })

  it('la salida del paseador no depende de ningún pago (ni en la app del paseador ni en la demostración)', () => {
    const paseador = sinComentarios(leer('components/walker/WalkerHome.tsx'))
    expect(paseador).not.toMatch(/accion === 'salir'/)
    expect(paseador).not.toMatch(/disabled=\{!pago/)
    const dueno = sinComentarios(leer('components/PatitasApp.tsx'))
    expect(dueno).not.toMatch(/siguiente === 'salir' &&/)
  })

  it('el código de recojo del dueño no espera el pago', () => {
    const src = sinComentarios(leer('components/LiveWalk.tsx'))
    expect(src).toMatch(/\{pin && \(e === 'aceptado'/)
    expect(src).not.toMatch(/pin && pago/)
  })

  it('en la tabla de pagos, nada se hace antes de que el paseo termine y la familia no marca nada', () => {
    expect(TRANSICIONES_PAGO.map((t) => t.accion).sort()).toEqual(['no_encontrado', 'pagar_al_paseador', 'ver_pago'])
    expect(TRANSICIONES_PAGO.some((t) => (t.quien as string) === 'dueno')).toBe(false)
    const verPago = TRANSICIONES_PAGO.find((t) => t.accion === 'ver_pago')!
    expect(verPago.paseo).toEqual(PASEO_HECHO)
    // pagarle al paseador exige que el paseo ya se hizo y que el equipo vea el pago
    const pagar = TRANSICIONES_PAGO.find((t) => t.accion === 'pagar_al_paseador')!
    expect(pagar.quien).toBe('equipo')
    expect(pagar.paseo).toEqual(PASEO_HECHO)
    expect(pagar.de).not.toContain('sin_pagar')
  })

  it('el plazo de pago sale de la configuración y es de 24 horas por defecto', () => {
    expect(CONFIG.horasParaPagar).toBe(24)
  })

  it('los documentos del negocio dicen que se paga al terminar el paseo', () => {
    for (const f of ['docs/CONTEXTO.md', '.claude/skills/patitas-connect/SKILL.md', 'docs/skills-para-instalar/patitas-connect/SKILL.md']) {
      if (!fs.existsSync(path.join(RAIZ, f))) continue
      const t = leer(f)
      expect(t, f).not.toMatch(/Ya pagué|«en revisión»|Recién ahí el paseador puede salir/)
      expect(t, f).toMatch(/al terminar el paseo|al final del paseo/i)
    }
  })

  it('el texto legal (borrador) no dice que se paga antes ni «Ya pagué»', () => {
    const legal = leer('lib/legal.ts')
    expect(legal).not.toMatch(/Ya pagué|verifica a mano que el pago haya|empieza cuando está verificado/)
    expect(legal).toMatch(/al terminar el paseo/)
  })
})
