import { describe, expect, it } from 'vitest'
import { bloquesParaMostrar, CLIENT_BLOCKS, WALKER_BLOCKS } from './legal'

const todo = (b: { title: string; summary: string; full: string }) => `${b.title} ${b.summary} ${b.full}`

describe('lib/legal.ts: dónde se guardan los datos (borrador sin revisión legal)', () => {
  it('sin servidor los bloques salen tal cual: es verdad que todo se queda en el teléfono', () => {
    expect(bloquesParaMostrar(CLIENT_BLOCKS, false)).toEqual(CLIENT_BLOCKS)
    expect(bloquesParaMostrar(WALKER_BLOCKS, false)).toEqual(WALKER_BLOCKS)
    const datos = CLIENT_BLOCKS.find((b) => b.id === 'datos')!
    expect(datos.full).toMatch(/se guardan en tu teléfono, no en un servidor/)
  })

  it('con servidor, el bloque de datos de la familia dice la verdad: servidores de Supabase, y sigue marcado como borrador', () => {
    const datos = bloquesParaMostrar(CLIENT_BLOCKS, true).find((b) => b.id === 'datos')!
    expect(datos.full).toMatch(/BORRADOR SIN REVISIÓN LEGAL/)
    expect(datos.full).toMatch(/servidores de Supabase/)
    expect(datos.full).toMatch(/proveedor externo/)
    expect(datos.full).toMatch(/fuera del Perú/)
    expect(datos.full).not.toMatch(/solo en tu teléfono|no en un servidor|se guardan en tu teléfono/)
    // No promete un recorrido continuo ni un borrado que no existe.
    expect(datos.full).toMatch(/No seguimos tu recorrido/)
    expect(datos.full).toMatch(/hoy el equipo lo hace a mano/)
    expect(datos.full).toMatch(/NO borra lo que ya está en el servidor/)
    expect(datos.summary).toMatch(/Supabase/)
    expect(datos.summary).toMatch(/nunca mi celular/)
  })

  it('con servidor, lo del paseador (cobro y DNI) tampoco dice «solo en tu teléfono» ni promete lo que no hace', () => {
    const bloques = bloquesParaMostrar(WALKER_BLOCKS, true)
    const cobro = bloques.find((b) => b.id === 'cobro')!
    expect(cobro.full).toMatch(/servidores de Supabase/)
    expect(cobro.full).not.toMatch(/solo en tu teléfono/)
    expect(cobro.full).toMatch(/El dueño nunca los ve/)
    const dni = bloques.find((b) => b.id === 'dni')!
    // No se decidió si son 3 o 4 dígitos: no se escribe ninguno. Tampoco la foto ni el registro de quién abrió la hoja,
    // que con servidor no viajan entre teléfonos.
    expect(todo(dni)).not.toMatch(/4 dígitos|3 dígitos|\bfoto\b|queda registrado/)
    expect(dni.full).toMatch(/servidores de Supabase/)
    expect(dni.full).toMatch(/lo ve solo el equipo/)
  })

  it('con servidor se conservan los mismos bloques, en el mismo orden y con los mismos ids (lo aceptado se compara por id)', () => {
    expect(bloquesParaMostrar(CLIENT_BLOCKS, true).map((b) => b.id)).toEqual(CLIENT_BLOCKS.map((b) => b.id))
    expect(bloquesParaMostrar(WALKER_BLOCKS, true).map((b) => b.id)).toEqual(WALKER_BLOCKS.map((b) => b.id))
  })

  it('las variantes con servidor no usan palabras prohibidas', () => {
    // Solo los bloques que tienen variante: «en vivo» del bloque de consultas oficiales habla de la videollamada, no del paseo.
    const conVariante = [...CLIENT_BLOCKS, ...WALKER_BLOCKS].filter((b) => b.conServidor)
    expect(conVariante.map((b) => b.id).sort()).toEqual(['cobro', 'datos', 'dni'])
    for (const b of bloquesParaMostrar(conVariante, true)) {
      expect(todo(b), b.id).not.toMatch(/\bseguro\b|custodia|garantiz|100\s*%|escrow|24\s*\/\s*7|en vivo|tiempo real/i)
    }
  })
})
