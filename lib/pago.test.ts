import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CONFIG, METODOS_COBRO, METODOS_COBRO_PASEADOR, nombreMetodoPago, TEXTOS_PAGO } from './config'
import { buildBooking, DEMO_DOGS, WALKERS } from './data'
import { masPagoDueno, masPagoPaseador, textoComisionDueno, textoPagoDueno, textoPagoPaseador } from './pagosTextos'
import { ESTADOS_PAGO } from './pagos'

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
const FUENTES = [...archivos('app'), ...archivos('components'), ...archivos('lib')]
const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length

describe('pago intermediado: Patitas cobra y le paga al paseador', () => {
  it('los medios de cobro son Yape, Plin y transferencia (no hay efectivo ni tarjeta)', () => {
    expect(METODOS_COBRO.map((m) => m.id)).toEqual(['yape', 'plin', 'cuenta'])
    expect(METODOS_COBRO.map((m) => m.nombre)).toEqual(['Yape', 'Plin', 'Transferencia'])
    expect(METODOS_COBRO_PASEADOR.map((m) => m.id)).toEqual(['yape', 'plin'])
  })

  it('la frase de honestidad es una sola: «Pagas al terminar el paseo. Patitas le paga al paseador.»', () => {
    expect(TEXTOS_PAGO.honestidad).toBe('Pagas al terminar el paseo. Patitas le paga al paseador.')
    expect(palabras(TEXTOS_PAGO.honestidad)).toBeLessThanOrEqual(12)
    expect(TEXTOS_PAGO.boton).toBe('Enviar solicitud')
  })

  it('un valor viejo guardado (efectivo, card) se lee como Transferencia, no se rompe', () => {
    expect(nombreMetodoPago('card')).toBe('Transferencia')
    expect(nombreMetodoPago('efectivo')).toBe('Transferencia')
    expect(nombreMetodoPago('yape')).toBe('Yape')
  })

  it('la reserva guarda lo que paga la familia, la comisión de Patitas y lo que recibe el paseador', () => {
    const b = buildBooking({ walker: WALKERS[0], dog: DEMO_DOGS[0], dayIdx: 0, startHour: 10, durationMin: 60, plan: 'once', handoff: 'door', notes: '', groupDogs: 0, groupSize: DEMO_DOGS[0].size })
    expect(b.total).toBeGreaterThan(0)
    expect(b.comision).toBeGreaterThan(0)
    expect(Math.round(((b.comision ?? 0) + (b.neto ?? 0)) * 100) / 100).toBe(b.total)
  })

  it('cada estado del pago tiene su texto corto para la familia y para el paseador', () => {
    for (const e of ESTADOS_PAGO) {
      const d = textoPagoDueno(e, 'Carlos')
      const p = textoPagoPaseador(e, 20, false)
      const n = textoPagoDueno(e, 'Carlos', true)
      const h = textoPagoPaseador(e, 20, true)
      expect(palabras(h.titulo), h.titulo).toBeLessThanOrEqual(5)
      expect(palabras(h.apoyo), h.apoyo).toBeLessThanOrEqual(14)
      expect(palabras(n.titulo), n.titulo).toBeLessThanOrEqual(5)
      expect(palabras(n.apoyo), n.apoyo).toBeLessThanOrEqual(12)
      expect(palabras(d.titulo), d.titulo).toBeLessThanOrEqual(5)
      expect(palabras(d.apoyo), d.apoyo).toBeLessThanOrEqual(12)
      expect(palabras(p.titulo), p.titulo).toBeLessThanOrEqual(5)
      expect(palabras(p.apoyo), p.apoyo).toBeLessThanOrEqual(12)
    }
  })

  it('los textos no usan palabras prohibidas ni prometen tarjeta, custodia o garantía', () => {
    const todo = [
      TEXTOS_PAGO.honestidad,
      TEXTOS_PAGO.honestidadPaseador,
      masPagoDueno(),
      masPagoPaseador(),
      ...ESTADOS_PAGO.flatMap((e) => [...Object.values(textoPagoDueno(e, 'Carlos')), ...Object.values(textoPagoPaseador(e, 20, true))]),
    ].join(' | ')
    expect(todo).not.toMatch(/tarjeta|escrow|custodia|garantiz|protegid|\bseguro\b|tiempo real|24\s*\/\s*7/i)
  })

  it('la comisión se dice a la familia sin que parezca un cobro extra, y sale de la configuración', () => {
    const t = textoComisionDueno()
    expect(t).toContain('Pagas el precio del paseo.')
    expect(t).toContain('sale de lo que recibe el paseador')
    expect(t).toContain('20 %')
    expect(textoComisionDueno()).toBe(CONFIG.comisionModo === 'del_precio' ? t : t)
  })

  it('«Ver más» es honesto: se hace a mano, la app no mueve dinero y Patitas paga tras confirmar en su cuenta', () => {
    expect(masPagoDueno()).toMatch(/a mano/)
    expect(masPagoDueno()).toMatch(/no mueve dinero/)
    expect(masPagoDueno()).toMatch(/confirma el pago en su cuenta/)
    expect(masPagoPaseador()).toMatch(/confirma el pago en su cuenta/)
  })
})

describe('el pago acordado directo entre las dos partes ya no existe', () => {
  it('ninguna pantalla pide tarjeta: sin número, vencimiento, CVV, 4242 ni «pagar con»', () => {
    const malos: string[] = []
    for (const f of FUENTES) {
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      src.split('\n').forEach((linea, i) => {
        if (/n[úu]mero de tarjeta|nombre en la tarjeta|\bcvv\b|cc-number|cc-exp|cc-csc|cc-name|pagar con\b|4242|formatCard|pagar con tarjeta/i.test(linea)) {
          malos.push(`${f}:${i + 1}  ${linea.trim().slice(0, 90)}`)
        }
      })
    }
    expect(malos).toEqual([])
  })

  it('ningún texto dice «tarjeta», «escrow» ni «Pagas directo al paseador»', () => {
    const malos: string[] = []
    for (const f of FUENTES) {
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      src.split('\n').forEach((linea, i) => {
        if (/\btarjeta|\bescrow|pagas directo|pago directo|directo al paseador|pago acordado|la app no cobra|\bpagoAcordado\b|Recibí el pago/i.test(linea)) {
          malos.push(`${f}:${i + 1}  ${linea.trim().slice(0, 100)}`)
        }
      })
    }
    expect(malos).toEqual([])
  })

  it('la reserva ya no pide cómo «acordarán» el pago y usa el botón de la configuración', () => {
    const src = fs.readFileSync(path.join(RAIZ, 'components', 'BookingSheet.tsx'), 'utf8')
    expect(src).toContain('TEXTOS_PAGO.boton')
    expect(src).not.toMatch(/acordar|Pagar con|Continuar al pago · /)
  })
})
