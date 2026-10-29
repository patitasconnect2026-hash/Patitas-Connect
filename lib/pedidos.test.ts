import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { DEMO_DOGS, WALKERS } from './data'
import {
  bajarMonto,
  cancelarPedido,
  conOfertasDeDemostracion,
  crearPedido,
  diaDesdeHoy,
  elegirOferta,
  estadoDe,
  inicioDeSlot,
  inicioValido,
  montoValido,
  ofertaValida,
  ofertasDeDemostracion,
  parquesCerca,
  segundosQueFaltan,
  subirMonto,
  tipoDeOferta,
} from './pedidos'
import { textoContadores, textoDeMotivo, TEXTO_PEDIDO } from './pedidosTextos'
import { SPOTS } from './geo'

// Martes 13 de octubre de 2026, 09:00 en Lima (14:00 UTC)
const AHORA = Date.UTC(2026, 9, 13, 14, 0, 0)
const dog = DEMO_DOGS[0]
const entrada = { id: 'p1', dog, dayIdx: 1, startHour: 10, slotLabel: 'Mañana · 10:00 am', durationMin: 60, montoHora: 20, distrito: 'San Isidro' as const, punto: SPOTS[0].pos, ahora: AHORA }

describe('«Pedir paseo» · montos (siempre desde lib/config.ts)', () => {
  it('el monto vale entre el mínimo y el tope', () => {
    expect(montoValido(CONFIG.tarifaMinima)).toBe(true)
    expect(montoValido(CONFIG.tarifaMaxima)).toBe(true)
    expect(montoValido(CONFIG.tarifaMinima - 1)).toBe(false)
    expect(montoValido(CONFIG.tarifaMaxima + 1)).toBe(false)
    expect(montoValido(Number.NaN)).toBe(false)
  })
  it('subir y bajar de a un sol sin pasar los topes', () => {
    expect(subirMonto(20)).toBe(21)
    expect(subirMonto(CONFIG.tarifaMaxima)).toBe(CONFIG.tarifaMaxima)
    expect(bajarMonto(20)).toBe(19)
    expect(bajarMonto(CONFIG.tarifaMinima)).toBe(CONFIG.tarifaMinima)
  })
  it('los topes de la migración SQL son los de lib/config.ts', () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase', 'migrations', '20261016100000_pedidos.sql'), 'utf8')
    expect(sql).toContain(`between ${CONFIG.tarifaMinima} and ${CONFIG.tarifaMaxima}`)
    expect(sql).toContain(`p_monto < ${CONFIG.tarifaMinima} or p_monto > ${CONFIG.tarifaMaxima}`)
    expect(sql).toContain(`p_monto > ${CONFIG.tarifaMaxima}`)
  })
})

describe('«Pedir paseo» · el día y la hora', () => {
  it('mañana a las 10 en Lima', () => {
    expect(inicioDeSlot(1, 10, AHORA)).toBe(Date.UTC(2026, 9, 14, 15, 0, 0))
    expect(inicioDeSlot(0, 6, AHORA)).toBe(Date.UTC(2026, 9, 13, 11, 0, 0))
  })
  it('cuántos días faltan, contados en hora de Lima', () => {
    expect(diaDesdeHoy(Date.UTC(2026, 9, 14, 15, 0, 0), AHORA)).toBe(1)
    expect(diaDesdeHoy(AHORA + 3600_000, AHORA)).toBe(0)
    // 23:30 en Lima ya es el día siguiente en UTC: sigue siendo «hoy» para quien está en Lima
    expect(diaDesdeHoy(Date.UTC(2026, 9, 14, 4, 30, 0), Date.UTC(2026, 9, 13, 14, 0, 0))).toBe(0)
  })
  it('no puede empezar antes de que venza el pedido ni dentro de más de una semana', () => {
    expect(inicioValido(AHORA + (CONFIG.minutosVidaPedido - 1) * 60_000, AHORA)).toBe(false)
    expect(inicioValido(AHORA + (CONFIG.minutosVidaPedido + 1) * 60_000, AHORA)).toBe(true)
    expect(inicioValido(AHORA + 9 * 24 * 3600_000, AHORA)).toBe(false)
  })
})

describe('«Pedir paseo» · crear, vencer, cancelar, elegir', () => {
  it('un pedido nuevo está abierto, vence a los minutos de config y guarda los parques cercanos', () => {
    const r = crearPedido(entrada)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.pedido.estado).toBe('abierto')
    expect(r.pedido.expiraAt - r.pedido.creadoAt).toBe(CONFIG.minutosVidaPedido * 60_000)
    expect(r.pedido.parques).toContain(SPOTS[0].id)
    expect(r.pedido.ofertas).toEqual([])
  })
  it('dice por qué no: monto, hora o perro', () => {
    expect(crearPedido({ ...entrada, montoHora: CONFIG.tarifaMaxima + 1 })).toEqual({ ok: false, motivo: 'monto' })
    expect(crearPedido({ ...entrada, dayIdx: 0, startHour: 9 })).toEqual({ ok: false, motivo: 'hora' })
    expect(crearPedido({ ...entrada, dog: { ...dog, rpp: true } })).toEqual({ ok: false, motivo: 'perro' })
  })
  it('caduca solo', () => {
    const r = crearPedido(entrada)
    if (!r.ok) throw new Error('no')
    const p = r.pedido
    expect(estadoDe(p, p.expiraAt - 1)).toBe('abierto')
    expect(estadoDe(p, p.expiraAt)).toBe('vencido')
    expect(segundosQueFaltan(p, p.creadoAt)).toBe(CONFIG.minutosVidaPedido * 60)
    expect(segundosQueFaltan(p, p.expiraAt + 5000)).toBe(0)
  })
  it('una oferta acepta el monto o pide MÁS dinero hasta el tope (nunca menos)', () => {
    expect(ofertaValida(20, 20)).toBe(true)
    expect(ofertaValida(20, 25)).toBe(true)
    expect(ofertaValida(20, 19)).toBe(false)
    expect(ofertaValida(20, CONFIG.tarifaMaxima + 1)).toBe(false)
    expect(tipoDeOferta(20, 20)).toBe('acepta')
    expect(tipoDeOferta(20, 22)).toBe('contraoferta')
  })
  it('elegir deja una oferta elegida y descarta las demás; cancelar descarta todas', () => {
    const r = crearPedido(entrada)
    if (!r.ok) throw new Error('no')
    const con = conOfertasDeDemostracion(r.pedido, WALKERS, r.pedido.creadoAt + 60_000)
    expect(con.ofertas.length).toBeGreaterThan(1)
    const id = con.ofertas[0].id
    const elegido = elegirOferta(con, id)
    expect(elegido.estado).toBe('elegido')
    expect(elegido.ofertas.filter((o) => o.estado === 'elegida').map((o) => o.id)).toEqual([id])
    expect(elegido.ofertas.filter((o) => o.estado === 'descartada')).toHaveLength(con.ofertas.length - 1)
    expect(elegirOferta(con, 'no-existe')).toBe(con)
    const cancelado = cancelarPedido(con)
    expect(cancelado.estado).toBe('cancelado')
    expect(cancelado.ofertas.every((o) => o.estado === 'descartada')).toBe(true)
    expect(cancelarPedido(elegido)).toBe(elegido)
  })
})

describe('«Pedir paseo» · demostración', () => {
  const r = crearPedido(entrada)
  if (!r.ok) throw new Error('no')
  const p = r.pedido
  it('al principio nadie responde y después los paseadores de ejemplo, siempre marcados «demo»', () => {
    expect(ofertasDeDemostracion(p, WALKERS, p.creadoAt)).toEqual([])
    const luego = ofertasDeDemostracion(p, WALKERS, p.creadoAt + 60_000)
    expect(luego.length).toBeGreaterThan(0)
    expect(luego.every((o) => o.demo === true)).toBe(true)
    expect(luego.every((o) => ofertaValida(p.montoHora, o.monto))).toBe(true)
  })
  it('no repite ofertas ni toca un pedido que ya no está activo', () => {
    const una = conOfertasDeDemostracion(p, WALKERS, p.creadoAt + 60_000)
    expect(conOfertasDeDemostracion(una, WALKERS, p.creadoAt + 61_000).ofertas).toHaveLength(una.ofertas.length)
    expect(una.estado).toBe('con_ofertas')
    expect(conOfertasDeDemostracion(p, WALKERS, p.expiraAt + 1)).toBe(p)
  })
  it('parques cerca de un punto: solo del mismo distrito', () => {
    expect(parquesCerca(SPOTS[0].pos, SPOTS[0].district)).toContain(SPOTS[0].id)
    expect(parquesCerca(SPOTS[0].pos, SPOTS[0].district === 'San Isidro' ? 'Jesús María' : 'San Isidro')).not.toContain(SPOTS[0].id)
  })
})

describe('«Pedir paseo» · textos', () => {
  it('los contadores son solo cifras', () => {
    expect(textoContadores(12, 5)).toBe('12 paseadores lo vieron · 5 disponibles en tu zona')
    expect(textoContadores(1, 1)).toBe('1 paseador lo vio · 1 disponible en tu zona')
    expect(textoContadores(0, 0)).toBe('0 paseadores lo vieron · 0 disponibles en tu zona')
  })
  it('cada motivo de la base tiene su frase', () => {
    for (const m of ['sin_casa', 'ya_tienes_pedido', 'pago_pendiente', 'monto', 'hora', 'perro', 'ya_ofertaste', 'ocupado', 'ya_no', 'fuera_de_zona', 'otro']) expect(textoDeMotivo(m).length).toBeGreaterThan(5)
    expect(textoDeMotivo('ya_tienes_pedido')).toBe(TEXTO_PEDIDO.yaTienes)
  })
})
