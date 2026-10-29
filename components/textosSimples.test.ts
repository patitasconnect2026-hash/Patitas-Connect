/**
 * Todo lo que la app le dice a una persona cuando algo sale mal o está esperando (y los textos de las pantallas nuevas)
 * está en español simple: nada de palabras de programación, de la base de datos ni en inglés, y ninguna frase larga de
 * más. Sin red, sin cuentas.
 */
import { describe, expect, it } from 'vitest'
import { TEXTO_FOTOS, TEXTO_ERROR_CAMARA } from '@/lib/fotosTextos'
import { TEXTO_CASA, TEXTO_AVISOS, TEXTO_UBICACION, TEXTO_PANTALLA } from '@/lib/zonaTextos'
import { TEXTO_PAGO, TEXTO_COBRO } from '@/lib/pagosTextos'
import { TEXTO_SELFIE } from '@/lib/selfie'
import { TEXTO_ACCESO } from '@/lib/servidor/acceso'
import { TEXTO_BORRAR } from '@/lib/servidor/cuenta'
import { TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { TEXTO_PEDIDO } from '@/lib/pedidosTextos'
import { TEXTO_ALERTAS } from '@/lib/avisosTextos'
import { TEXTO_MAPA } from '@/lib/mapaTextos'
import { TEXTO_IA } from '@/lib/iaTextos'
import { TEXTO_CHAPITA } from '@/lib/chapitaTextos'
import { TEXTO_EN_VIVO, TEXTO_SOSPECHA } from '@/lib/sospechas'
import { TEXTO_EXAMEN } from '@/components/walker/QuizStep'
import { TEXTO_RESPUESTAS_ADMIN } from '@/components/admin/RespuestasDelExamen'
import { TEXTO_SERVIDOR, TEXTO_REVISION_SERVIDOR, TEXTO_PAGO_SERVIDOR, TEXTO_FOTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { TEXTO_ACTIVIDAD } from '@/lib/chatServidor'
import { TEXTO_ADMIN, TEXTO_ENTRADA_ADMIN, TEXTO_PAGOS_ADMIN } from '@/lib/adminTextos'
import { TEXTO_PUNTOS } from '@/lib/puntosControlTextos'
import { TEXTO_PANTALLAS } from '@/components/acceso/FormularioAcceso'
import { TEXTO_CURSO } from '@/components/walker/CursoStep'
import { TEXTO_PORTADA_PASEADOR } from '@/components/walker/WalkerApp'

/** Cada texto con el nombre del grupo (las funciones no se miran: dependen de lo que se les pase). */
const GRUPOS: Record<string, unknown> = {
  TEXTO_FOTOS,
  TEXTO_ERROR_CAMARA,
  TEXTO_CASA,
  TEXTO_AVISOS,
  TEXTO_UBICACION,
  TEXTO_PANTALLA,
  TEXTO_PAGO,
  TEXTO_COBRO,
  TEXTO_SELFIE,
  TEXTO_ACCESO,
  TEXTO_BORRAR,
  TEXTO_SERVIDOR,
  TEXTO_REVISION_SERVIDOR,
  TEXTO_PAGO_SERVIDOR,
  TEXTO_FOTO_SERVIDOR,
  TEXTO_ACTIVIDAD,
  TEXTO_ADMIN,
  TEXTO_ENTRADA_ADMIN,
  TEXTO_PAGOS_ADMIN,
  TEXTO_PUNTOS,
  TEXTO_PANTALLAS,
  TEXTO_CURSO,
  TEXTO_PORTADA_PASEADOR,
  TEXTO_RESERVAS,
  TEXTO_PEDIDO,
  TEXTO_ALERTAS,
  TEXTO_MAPA,
  TEXTO_EXAMEN,
  TEXTO_RESPUESTAS_ADMIN,
  TEXTO_EN_VIVO,
  TEXTO_SOSPECHA,
  TEXTO_IA,
  TEXTO_CHAPITA,
}

function textosDe(valor: unknown, ruta: string, salida: Array<{ ruta: string; texto: string }>): void {
  if (typeof valor === 'string') salida.push({ ruta, texto: valor })
  else if (Array.isArray(valor)) valor.forEach((v, i) => textosDe(v, `${ruta}[${i}]`, salida))
  else if (valor && typeof valor === 'object') for (const [k, v] of Object.entries(valor)) textosDe(v, `${ruta}.${k}`, salida)
}

const TODOS = (() => {
  const salida: Array<{ ruta: string; texto: string }> = []
  for (const [nombre, grupo] of Object.entries(GRUPOS)) textosDe(grupo, nombre, salida)
  return salida
})()

/** Palabras de programación o de la base de datos que una persona no tiene por qué leer. */
const JERGA = /\b(RLS|JWT|token|postgrest|supabase|uuid|SQL|RPC|API|HTTP|status|timeout|null|undefined|NaN|stack|exception|excepci[oó]n|backend|endpoint|payload|constraint|policy|trigger|schema|bucket|cookie|localStorage|sessionStorage|JSON|c[oó]digo de error|error \d{3}|4\d\d|5\d\d)\b/i

/** Palabras sueltas en inglés que se cuelan de los mensajes de las librerías. */
const INGLES = /\b(the|failed|invalid|please|loading|submit|login|password|wrong|not found|denied|forbidden|unauthorized|already|expired|rate limit)\b/i

describe('los textos que ve la gente', () => {
  it('se juntaron los textos de todos los grupos (la prueba no mira un grupo vacío)', () => {
    expect(TODOS.length).toBeGreaterThan(150)
  })

  it('no tienen palabras de programación ni de la base de datos', () => {
    for (const { ruta, texto } of TODOS) expect(texto, `${ruta}: ${texto}`).not.toMatch(JERGA)
  })

  it('no tienen palabras sueltas en inglés', () => {
    for (const { ruta, texto } of TODOS) expect(texto, `${ruta}: ${texto}`).not.toMatch(INGLES)
  })

  it('no prometen lo que no hay ni dicen «seguro» o «100 %», y no muestran el cobro de S/ 3', () => {
    for (const { ruta, texto } of TODOS) {
      expect(texto, `${ruta}: ${texto}`).not.toMatch(/\bseguros?\b|100\s?%|garantiz|escrow|custodia|24\/7|S\/\s?3(?![\d.,])/i)
    }
  })

  it('los avisos de error y de espera son frases cortas (hasta 30 palabras cada una)', () => {
    const avisos = [
      ...Object.entries(TEXTO_SERVIDOR),
      ...Object.entries(TEXTO_PAGO_SERVIDOR),
      ...Object.entries(TEXTO_FOTO_SERVIDOR),
      ...Object.entries(TEXTO_REVISION_SERVIDOR),
    ]
    for (const [clave, texto] of avisos) {
      if (typeof texto === 'string') expect(texto.split(/\s+/).length, `${clave}: ${texto}`).toBeLessThanOrEqual(30)
    }
  })
})
