import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { EMPTY } from '../store'
import { EMPTY_APP, migrarPostulacion } from '../walkerStore'
import {
  adaptadorMemoria,
  borrarCuenta,
  CLAVES,
  guardarCuenta,
  guardarPostulacion,
  leerCuenta,
  leerPaseadorAprobado,
  leerPostulacion,
  leerVistasDni,
  registrarVistaDni,
} from './index'

describe('claves: no cambian (los celulares de prueba conservan sus datos)', () => {
  it('son las de siempre (con servidor, lo que no viaja, lo descartado, dónde cobra cada paseador, las fotos del servidor y las reseñas son nuevas)', () => {
    expect(CLAVES).toEqual({
      cuenta: 'patitas:v2',
      chat: 'patitas:bus:chat',
      paseo: 'patitas:bus:job',
      paseoLocal: 'patitas:bus:job-local',
      descartados: 'patitas:descartados',
      eventos: 'patitas:bus:events',
      presencia: 'patitas:bus:walker-presence',
      vistasDni: 'patitas:bus:dni-views',
      recordados: 'patitas:recordados',
      pedido: 'patitas:pedido',
      avisos: 'patitas:avisos',
      casos: 'patitas:bus:casos',
      resenas: 'patitas:bus:resenas',
      pagos: 'patitas:bus:pagos',
      cobros: 'patitas:bus:cobros',
      fotos: 'patitas:bus:fotos',
      fotosServidor: 'patitas:bus:fotos-servidor',
      ejemplos: 'patitas:ejemplos',
      postulacion: 'patitas:walker:v1',
      demo: 'patitas:walker:demo',
    })
  })
})

describe('adaptador en memoria', () => {
  it('guarda, lee y borra', () => {
    const a = adaptadorMemoria()
    expect(a.leer('x', 5)).toBe(5)
    a.guardar('x', { n: 1 })
    expect(a.leer('x', null)).toEqual({ n: 1 })
    a.borrar('x')
    expect(a.leer('x', 'nada')).toBe('nada')
  })
  it('un valor dañado devuelve el valor por defecto (no revienta)', () => {
    const a = adaptadorMemoria()
    a.datos.set('roto', '{no es json')
    expect(a.leer('roto', 'por defecto')).toBe('por defecto')
  })
})

describe('cuenta del dueño', () => {
  it('sin nada guardado, parte vacía', () => {
    expect(leerCuenta(adaptadorMemoria())).toEqual(EMPTY)
  })
  it('lo guardado se mezcla con lo vacío (campos nuevos no rompen cuentas viejas)', () => {
    const a = adaptadorMemoria({ [CLAVES.cuenta]: { welcomeUsed: true, favs: ['carlos'] } })
    const c = leerCuenta(a)
    expect(c.welcomeUsed).toBe(true)
    expect(c.favs).toEqual(['carlos'])
    expect(c.dogs).toEqual([])
    expect(c.emergencia).toBeNull()
  })
  it('guardar y borrar', () => {
    const a = adaptadorMemoria()
    guardarCuenta(a, { ...EMPTY, applied: true })
    expect(leerCuenta(a).applied).toBe(true)
    borrarCuenta(a)
    expect(leerCuenta(a)).toEqual(EMPTY)
  })
})

describe('postulación del paseador', () => {
  it('sin nada guardado es null', () => {
    expect(leerPostulacion(adaptadorMemoria())).toBeNull()
    expect(migrarPostulacion(null)).toBeNull()
    expect(migrarPostulacion('texto')).toBeNull()
  })
  it('una postulación vieja (casillas docs, refs, videocall) parte de cero sin perder lo demás', () => {
    const vieja = { ...EMPTY_APP, status: 'enviada', person: { ...EMPTY_APP.person, firstName: 'Lucía' }, review: { docs: true, refs: true, videocall: true, notes: 'ok' } }
    const p = migrarPostulacion(vieja)!
    expect(p.person.firstName).toBe('Lucía')
    expect(p.review).toEqual({ comprobaciones: {}, notes: 'ok', supervisedWalks: 0 })
  })
  it('guardar y borrar', () => {
    const a = adaptadorMemoria()
    guardarPostulacion(a, { ...EMPTY_APP, code: 'PAT-TEST' })
    expect(leerPostulacion(a)?.code).toBe('PAT-TEST')
    guardarPostulacion(a, null)
    expect(leerPostulacion(a)).toBeNull()
  })
})

describe('paseador aprobado (para la app del cliente)', () => {
  const base = { ...EMPTY_APP, code: 'PAT-ABCD', person: { ...EMPTY_APP.person, firstName: 'Lucía', lastName: 'Quispe' } }
  it('solo aparece si el equipo lo aprobó', () => {
    for (const status of ['borrador', 'enviada', 'rechazada'] as const) {
      const a = adaptadorMemoria({ [CLAVES.postulacion]: { ...base, status } })
      expect(leerPaseadorAprobado(a)).toBeNull()
    }
  })
  it('aprobado con las cinco casillas del equipo: sale como «Nuevo» con esas comprobaciones, máximo 2 perros', () => {
    const cinco = { dni: true, distrito: true, celular: true, consultas: true, examen: true }
    const cobro = { metodo: 'yape', telefono: '987 654 321', titular: 'Lucía Quispe' }
    const a = adaptadorMemoria({ [CLAVES.postulacion]: { ...base, status: 'supervisado', cobro, review: { comprobaciones: cinco, notes: '', supervisedWalks: 0 } } })
    const w = leerPaseadorAprobado(a)!
    expect(w.name).toBe('Lucía Q.')
    expect(w.probation).toBe(true)
    expect(w.maxDogs).toBe(2)
    expect(w.comprobaciones).toEqual(['dni', 'distrito', 'celular', 'consultas', 'examen'])
  })
  it('aprobado con las cinco casillas pero SIN dónde cobrar: no recibe solicitudes (no sale en la app del cliente)', () => {
    const cinco = { dni: true, distrito: true, celular: true, consultas: true, examen: true }
    const a = adaptadorMemoria({ [CLAVES.postulacion]: { ...base, status: 'supervisado', review: { comprobaciones: cinco, notes: '', supervisedWalks: 0 } } })
    expect(leerPaseadorAprobado(a)).toBeNull()
  })
  it('aprobado pero con casillas sin marcar: NO sale en la app del cliente', () => {
    const a = adaptadorMemoria({ [CLAVES.postulacion]: { ...base, status: 'supervisado', review: { comprobaciones: { dni: true, examen: true }, notes: '', supervisedWalks: 0 } } })
    expect(leerPaseadorAprobado(a)).toBeNull()
  })
})

describe('quién abrió el DNI', () => {
  it('lo escribe el dueño y lo lee el paseador por un canal propio (no por la cuenta del dueño)', () => {
    const a = adaptadorMemoria()
    registrarVistaDni(a, 'carlos', new Date('2026-10-10T15:00:00Z'))
    registrarVistaDni(a, 'otro', new Date('2026-10-10T16:00:00Z'))
    registrarVistaDni(a, 'carlos', new Date('2026-10-11T09:00:00Z'))
    expect(leerVistasDni(a, 'carlos').map((v) => v.at)).toEqual(['2026-10-10T15:00:00.000Z', '2026-10-11T09:00:00.000Z'])
    expect(a.datos.has(CLAVES.cuenta)).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/* Las pantallas no tocan el almacenamiento                              */
/* ------------------------------------------------------------------ */

const RAIZ = path.resolve(__dirname, '..', '..')
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

describe('una sola puerta a los datos', () => {
  it('fuera de lib/datos nadie usa localStorage, IndexedDB ni el evento «storage»', () => {
    const malos: string[] = []
    for (const f of [...archivos('app'), ...archivos('components'), ...archivos('lib')]) {
      if (f.startsWith(path.join('lib', 'datos') + path.sep)) continue
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      if (/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bIDBFactory\b|addEventListener\(\s*['"]storage['"]/.test(src)) malos.push(f)
    }
    expect(malos).toEqual([])
  })

  it('walkerStore ya no conoce la clave de la cuenta del dueño', () => {
    const src = sinComentarios(fs.readFileSync(path.join(RAIZ, 'lib', 'walkerStore.ts'), 'utf8'))
    expect(src).not.toContain('patitas:v2')
    expect(src).not.toMatch(/readDniViews/)
  })
})
