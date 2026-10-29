import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { registrarPunto, type Job } from './bus'
import { CONFIG } from './config'
import { codigoDeFotos, type FotoPaseo } from './fotos'
import { SPOTS } from './geo'
import { aplicar, nuevoPaseo } from './paseo'
import {
  agregarPunto,
  armarPunto,
  lecturaSirve,
  minutosParaControl,
  posicionesDe,
  puntosDeDemostracion,
  puntosDelPaseo,
  tocaFotoDeControl,
  tienePunto,
  ultimoControl,
  type PuntoControl,
} from './puntosControl'
import { LEMA_SEGUIMIENTO, masDueno, masPaseador, textoProxima, textoSinFoto, textoUltimoControl, TEXTO_PUNTOS } from './puntosControlTextos'
import type { Lectura } from './zona'

const T0 = Date.UTC(2026, 9, 10, 15, 0, 0)
const MIN = 60_000
const olivar = SPOTS.find((s) => s.id === 'olivar')!.pos

const lectura = (p: Partial<Lectura> = {}): Lectura => ({ pos: olivar, precisionM: 20, t: T0, ...p })
const foto = (i: number, t: number, p: Partial<FotoPaseo> = {}): FotoPaseo => ({
  id: `f${i}`,
  jobId: 'job1',
  t,
  codigo: codigoDeFotos('job1'),
  ubicacion: { pos: olivar, lecturaT: t },
  bytes: 90_000,
  almacen: 'indexeddb',
  ...p,
})

describe('puntos de control: el inicio y el fin se guardan una sola vez', () => {
  it('agregarPunto no repite un inicio ni un fin', () => {
    const inicio: PuntoControl = { tipo: 'inicio', t: T0, ubicacion: null, sinUbicacion: 'omitida' }
    const una = agregarPunto(undefined, inicio)
    expect(una).toHaveLength(1)
    const dos = agregarPunto(una, { ...inicio, t: T0 + 5 * MIN })
    expect(dos).toHaveLength(1)
    expect(dos[0].t).toBe(T0)
    expect(agregarPunto(dos, { tipo: 'fin', t: T0 + 30 * MIN, ubicacion: null })).toHaveLength(2)
    expect(tienePunto(dos, 'inicio')).toBe(true)
    expect(tienePunto(dos, 'fin')).toBe(false)
  })

  it('registrarPunto lo deja en el encargo y repetirlo no cambia nada', () => {
    const base = { id: 'j', paseo: nuevoPaseo(T0) } as unknown as Job
    const p = armarPunto('inicio', T0, lectura(), 'activa')
    const a = registrarPunto(base, p)!
    expect(a.puntos).toHaveLength(1)
    expect(registrarPunto(a, { ...p, t: T0 + 1 })).toBe(a)
    expect(registrarPunto(null, p)).toBeNull()
  })
})

describe('qué lleva un punto de control', () => {
  it('con una lectura buena lleva el lugar', () => {
    const p = armarPunto('inicio', T0, lectura(), 'activa')
    expect(p.ubicacion?.pos).toEqual(olivar)
    expect(p.sinUbicacion).toBeUndefined()
  })

  it('una lectura con mucho error no sirve: queda «sin lectura», no un lugar dudoso', () => {
    const mala = lectura({ precisionM: CONFIG.precisionPuntoControlMetros + 1 })
    expect(lecturaSirve(mala)).toBe(false)
    const p = armarPunto('fin', T0, mala, 'activa')
    expect(p.ubicacion).toBeNull()
    expect(p.sinUbicacion).toBe('sin_lectura')
  })

  it('sin ubicación dice por qué: negó el permiso, eligió seguir sin ella o el navegador no la permite', () => {
    expect(armarPunto('inicio', T0, null, 'negada').sinUbicacion).toBe('negada')
    expect(armarPunto('inicio', T0, null, 'omitida').sinUbicacion).toBe('omitida')
    expect(armarPunto('inicio', T0, null, 'no_disponible').sinUbicacion).toBe('no_disponible')
    expect(armarPunto('inicio', T0, null, null).sinUbicacion).toBe('sin_lectura')
  })
})

describe('la lista que ve el dueño: inicio, cada foto y fin, en orden', () => {
  const puntos: PuntoControl[] = [
    { tipo: 'fin', t: T0 + 40 * MIN, ubicacion: null, sinUbicacion: 'negada' },
    { tipo: 'inicio', t: T0, ubicacion: { pos: olivar, lecturaT: T0 } },
  ]
  const fotos = [foto(2, T0 + 25 * MIN), foto(1, T0 + 10 * MIN)]
  const lista = puntosDelPaseo(puntos, fotos)

  it('inicio primero, las fotos por hora y el fin al final, con sus nombres', () => {
    expect(lista.map((p) => p.etiqueta)).toEqual(['Inicio', 'Foto 1', 'Foto 2', 'Fin'])
    expect(lista.map((p) => p.t)).toEqual([T0, T0 + 10 * MIN, T0 + 25 * MIN, T0 + 40 * MIN])
  })

  it('dice el lugar sin coordenadas y, si no hay ubicación, lo dice', () => {
    expect(lista[0].lugar.texto).toMatch(/^En San Isidro/)
    expect(lista[3].lugar.texto).toBe('Sin ubicación')
    for (const p of lista) expect(p.lugar.texto).not.toMatch(/-?\d{1,3}\.\d{3,}/)
  })

  it('las fotos llevan su código; el inicio y el fin no', () => {
    expect(lista[1].codigo).toBe(codigoDeFotos('job1'))
    expect(lista[0].codigo).toBeUndefined()
  })

  it('al mapa solo van los que tienen ubicación', () => {
    expect(posicionesDe(lista).map((p) => p.etiqueta)).toEqual(['Inicio', 'Foto 1', 'Foto 2'])
  })

  it('sin nada guardado, la lista está vacía', () => {
    expect(puntosDelPaseo(undefined, [])).toEqual([])
  })
})

describe('el recordatorio suave de la foto de control', () => {
  const recogio = aplicar(aplicar(aplicar(nuevoPaseo(T0 - 5 * MIN), 'aceptar', 'paseador', T0 - 4 * MIN), 'salir', 'paseador', T0 - 3 * MIN), 'recoger', 'paseador', T0)

  it('el último control es el más nuevo entre recoger al perro, el inicio y la última foto', () => {
    expect(ultimoControl(recogio, undefined, [])).toBe(T0)
    expect(ultimoControl(recogio, [{ tipo: 'inicio', t: T0 + 1 * MIN, ubicacion: null }], [])).toBe(T0 + 1 * MIN)
    expect(ultimoControl(recogio, undefined, [foto(1, T0 + 8 * MIN), foto(2, T0 + 3 * MIN)])).toBe(T0 + 8 * MIN)
    expect(ultimoControl(nuevoPaseo(T0), undefined, [])).toBeNull()
  })

  it('toca a los `minutosPuntoControl` (10 por defecto) sin foto, ni un minuto antes', () => {
    expect(CONFIG.minutosPuntoControl).toBe(10)
    expect(tocaFotoDeControl(T0, T0 + 9 * MIN + 59_000)).toBe(false)
    expect(tocaFotoDeControl(T0, T0 + 10 * MIN)).toBe(true)
    expect(tocaFotoDeControl(null, T0 + 99 * MIN)).toBe(false)
  })

  it('una foto reinicia la cuenta', () => {
    const ultimo = ultimoControl(recogio, undefined, [foto(1, T0 + 9 * MIN)])
    expect(tocaFotoDeControl(ultimo, T0 + 12 * MIN)).toBe(false)
    expect(minutosParaControl(ultimo, T0 + 12 * MIN)).toBe(7)
    expect(minutosParaControl(ultimo, T0 + 30 * MIN)).toBe(0)
    expect(minutosParaControl(null, T0)).toBeNull()
  })

  it('los minutos salen de la configuración, no de un número escrito', () => {
    expect(tocaFotoDeControl(T0, T0 + 5 * MIN, 5)).toBe(true)
    expect(textoProxima(7)).toBe('Próxima foto de control en 7 min.')
    expect(textoProxima(0)).toBe(TEXTO_PUNTOS.paseador.toca)
    expect(masDueno(15)).toContain('cada 15 minutos')
    expect(masPaseador(15)).toContain('Cada 15 minutos')
  })
})

describe('la demostración marca sus puntos y no inventa un recorrido', () => {
  const hora = (f: number) => `${f}`
  it('antes de empezar no hay puntos', () => {
    expect(puntosDeDemostracion({ empezo: false, llego: false, fotosAt: [], hora })).toEqual([])
  })

  it('con el paseo en marcha: inicio y cada foto; al llegar, el fin; todos de demostración', () => {
    const enCurso = puntosDeDemostracion({ empezo: true, llego: false, fotosAt: [0.63], hora })
    expect(enCurso.map((p) => p.etiqueta)).toEqual(['Inicio', 'Foto 1'])
    const llego = puntosDeDemostracion({ empezo: true, llego: true, fotosAt: [0.63], hora })
    expect(llego.map((p) => p.etiqueta)).toEqual(['Inicio', 'Foto 1', 'Fin'])
    for (const p of llego) {
      expect(p.ubicacion?.demo).toBe(true)
      expect(p.lugar.nota).toMatch(/demostración/i)
    }
  })
})

describe('los textos del seguimiento son honestos', () => {
  const todos = () => [
    LEMA_SEGUIMIENTO,
    masDueno(),
    masPaseador(),
    textoProxima(5),
    textoUltimoControl(3),
    textoSinFoto(14),
    TEXTO_PUNTOS.titulo,
    TEXTO_PUNTOS.dueno.apoyo,
    TEXTO_PUNTOS.dueno.vacio,
    TEXTO_PUNTOS.paseador.guarda,
    TEXTO_PUNTOS.paseador.toca,
    TEXTO_PUNTOS.paseador.tocaApoyo,
    TEXTO_PUNTOS.mapaDemo,
    TEXTO_PUNTOS.mapaSin,
  ]

  it('el «Ver más» dice la frase exacta: el seguimiento es por puntos de control con foto', () => {
    expect(LEMA_SEGUIMIENTO).toBe('El seguimiento es por puntos de control con foto.')
    expect(masDueno()).toContain(LEMA_SEGUIMIENTO)
    expect(masPaseador()).toContain(LEMA_SEGUIMIENTO)
  })

  it('con servidor ya no dice «solo en el mismo navegador»: dice qué llega, a quién y que no es un recorrido', () => {
    expect(masDueno(undefined, true)).not.toMatch(/mismo navegador|hace falta servidor/)
    expect(masDueno(undefined, true)).toMatch(/Esos puntos llegan/)
    expect(masDueno(undefined, true)).toMatch(/con la app cerrada no se actualiza/)
    expect(masDueno(undefined, true)).toMatch(/No guardamos su recorrido/)
    expect(masPaseador(undefined, true)).toMatch(/esos puntos se envían/)
    expect(masPaseador(undefined, true)).toMatch(/mientras pasas con la app abierta/)
    expect(masPaseador(undefined, true)).toMatch(/al entregar al perro se borra/)
    expect(masPaseador(undefined, true)).toMatch(/familia del paseo y el equipo/)
    expect(masPaseador(undefined, true)).toMatch(/No guardamos tu recorrido/)
    for (const t of [masDueno(undefined, true), masPaseador(undefined, true)]) expect(t).toContain(LEMA_SEGUIMIENTO)
  })

  it('dice que con la pantalla apagada no se sigue la ubicación y que hace falta servidor entre celulares', () => {
    expect(masDueno()).toMatch(/pantalla apagada/)
    expect(masDueno()).toMatch(/servidor/)
    expect(masPaseador()).toMatch(/pantalla apagada/)
  })

  it('no promete seguimiento continuo ni palabras prohibidas', () => {
    for (const t of todos()) {
      expect(t, t).not.toMatch(/en vivo|tiempo real|cada 45|45 segundos|24\s*\/\s*7|100\s*%|garantiz|\bseguro\b|protegid|custodia|\bprueba/i)
    }
  })

  it('las líneas visibles son cortas (hasta 12 palabras)', () => {
    const lineas = [TEXTO_PUNTOS.dueno.apoyo, TEXTO_PUNTOS.paseador.guarda, TEXTO_PUNTOS.paseador.toca, TEXTO_PUNTOS.paseador.tocaApoyo, textoProxima(5), textoUltimoControl(3), textoSinFoto(14)]
    for (const l of lineas) expect(l.split(/\s+/).length, l).toBeLessThanOrEqual(12)
  })
})

describe('la app ya no promete seguimiento continuo (ni mapa que se mueve)', () => {
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

  it('ningún texto dice «En vivo», «cada 45 segundos» ni «tiempo real»', () => {
    const hallazgos: string[] = []
    for (const f of FUENTES) {
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      src.split('\n').forEach((l, i) => {
        // «consultas oficiales en vivo» y «verificación en vivo» son la cita con el equipo por WhatsApp, no seguimiento del paseo
        if (/consulta|videollamada|verificaci/i.test(l)) return
        if (/\ben vivo\b|\bEN VIVO\b|cada 45|45 segundos|tiempo real/i.test(l)) hallazgos.push(`${f}:${i + 1}  ${l.trim().slice(0, 100)}`)
      })
    }
    expect(hallazgos).toEqual([])
  })

  it('la pestaña se llama «Paseo»', () => {
    const src = fs.readFileSync(path.join(RAIZ, 'components', 'BottomNav.tsx'), 'utf8')
    expect(src).toMatch(/>Paseo<\/span>/)
    expect(src).not.toMatch(/En vivo/)
  })

  it('no se pide mantener la pantalla encendida (el paseador no vive pegado al teléfono)', () => {
    for (const f of ['components/walker/useSensoresPaseo.ts', 'components/walker/WalkerHome.tsx', 'components/walker/UbicacionPaseo.tsx']) {
      const src = sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))
      expect(src, f).not.toMatch(/wakeLock/)
    }
  })

  it('el mapa del dueño no dibuja una ruta ni mueve puntos inventados: el único punto que se mueve es la última ubicación que manda el paseador (solo con servidor y la app abierta)', () => {
    const src = sinComentarios(fs.readFileSync(path.join(RAIZ, 'components', 'LiveMap.tsx'), 'utf8'))
    expect(src).not.toMatch(/WALK_ROUTE|pathUntil|pointAt|polyline/)
    expect(src).toMatch(/enVivo/)
  })
})
