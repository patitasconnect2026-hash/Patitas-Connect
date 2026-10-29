import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CONFIG, type Config } from './config'
import { buildBooking, DEMO_DOGS, WALKERS } from './data'

/**
 * Guardia de precios: todo el dinero vive en lib/config.ts.
 * Si alguien escribe un precio, un descuento o una comisión a mano en una pantalla o en una cuenta,
 * estas pruebas fallan. Para cambiar un valor se edita lib/config.ts, nada más.
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

/** Código sin comentarios (los comentarios pueden dar ejemplos como "S/ 28.00"). */
function sinComentarios(src: string) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

const TODOS = [...archivos('app'), ...archivos('components'), ...archivos('lib')].filter((f) => f !== path.join('lib', 'config.ts'))

/** Archivos donde se calcula o se muestra dinero. Ahí no se permiten multiplicadores ni porcentajes a mano. */
const CON_DINERO = TODOS.filter(
  (f) =>
    f === path.join('lib', 'data.ts') ||
    f === path.join('lib', 'walkerStore.ts') ||
    f === path.join('app', 'afiche', 'AficheClient.tsx') ||
    ['BookingSheet', 'ConfirmSheet', 'ProfileView', 'LiveWalk', 'Onboarding', 'Explore', 'WalkerCard', 'ZonesMap', 'PatitasApp'].some((n) => f === path.join('components', `${n}.tsx`)) ||
    f.startsWith(path.join('components', 'walker') + path.sep),
)

/** Texto legal (borrador sin revisión legal): tampoco lleva cifras de dinero escritas a mano. */
const LEGAL = path.join('lib', 'legal.ts')

function encontrar(archivosAMirar: string[], patron: RegExp) {
  const hallazgos: string[] = []
  for (const f of archivosAMirar) {
    const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
    src.split('\n').forEach((linea, i) => {
      if (patron.test(linea)) hallazgos.push(`${f}:${i + 1}  ${linea.trim().slice(0, 110)}`)
    })
  }
  return hallazgos
}

describe('ningún precio escrito a mano fuera de lib/config.ts', () => {
  it('no hay montos en soles escritos (S/ 25, S/ 10, S/ 34…)', () => {
    expect(encontrar(TODOS, /S\/\s?\d/)).toEqual([])
  })

  it('no hay multiplicadores de precio (× 1,4, × 0,8…)', () => {
    expect(encontrar(CON_DINERO, /[*?]\s*1\.4\b|\*\s*0\.8\b|\*\s*0\.9\b|\*\s*1\.1\b|\*\s*1\.2\b/)).toEqual([])
  })

  it('no hay porcentajes de dinero escritos (cualquier "NN %" de 1 a 99)', () => {
    // En los textos se escribe "20 %" (con espacio) o "20% de descuento"; en CSS va "50%" pegado a una comilla.
    // El lookbehind evita "100 %" y "2.50 %". Sin excepciones: también se revisa lib/legal.ts.
    expect(encontrar([...CON_DINERO, LEGAL], /(?<![\d.])\d{1,2}( %|%(?=\s))/)).toEqual([])
  })

  it('el texto legal no promete retención, comisión escrita a mano ni pago semanal', () => {
    expect(encontrar([LEGAL], /pago semanal|cada semana|(?<!no )retiene|\bretenid|custodia|escrow|garantizad/i)).toEqual([])
  })

  it('las constantes viejas ya no existen', () => {
    expect(encontrar(TODOS, /\b(PROTECTION_FEE|WELCOME_DISCOUNT|WEEKDAYS_DISCOUNT)\b/)).toEqual([])
  })

  it('la tarifa de partida no está escrita en el perfil del paseador', () => {
    expect(encontrar(TODOS, /\brate:\s*\d/)).toEqual([])
  })

  it('las tarifas de los paseadores de ejemplo son datos, solo en lib/data.ts', () => {
    const fuera = encontrar(
      TODOS.filter((f) => f !== path.join('lib', 'data.ts')),
      /pricePerHour:\s*\d/,
    )
    expect(fuera).toEqual([])
  })
})

describe('buildBooking lee el config', () => {
  const original: Config = { ...CONFIG }
  afterEach(() => Object.assign(CONFIG, original))

  const walker = WALKERS[0]
  const dog = DEMO_DOGS[0]
  const base = {
    walker,
    dayIdx: 0,
    startHour: 10,
    durationMin: 60,
    handoff: 'door' as const,
    notes: '',
    groupDogs: 0,
    groupSize: dog.size,
  }

  it('sin descuentos el total es el precio del paseo', () => {
    const b = buildBooking({ ...base, dog: { ...dog, sociable: true }, plan: 'weekdays', welcome: true })
    expect(b.discount).toBe(0)
    expect(b.total).toBe(b.walkPrice)
  })

  it('el recargo individual sale de CONFIG', () => {
    const grupo = buildBooking({ ...base, dog: { ...dog, sociable: true }, plan: 'once' })
    CONFIG.recargoIndividualPct = 100
    const solo = buildBooking({ ...base, dog: { ...dog, sociable: false }, plan: 'once' })
    expect(solo.walkPrice).toBe(Math.round(grupo.walkPrice * 2 * 2) / 2)
  })

  it('los descuentos salen de CONFIG cuando se encienden', () => {
    CONFIG.descuentoBienvenida = 10
    CONFIG.descuentoLunesViernesPct = 10
    const b = buildBooking({ ...base, dog: { ...dog, sociable: true }, plan: 'weekdays', welcome: true })
    expect(b.discount).toBeGreaterThan(10)
    expect(b.total).toBe(Math.max(b.walkPrice - b.discount, 0))
  })

  it('el total nunca es negativo', () => {
    CONFIG.descuentoBienvenida = 500
    const b = buildBooking({ ...base, dog: { ...dog, sociable: true }, plan: 'once', welcome: true })
    expect(b.total).toBe(0)
  })
})
