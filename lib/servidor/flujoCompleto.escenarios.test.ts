/**
 * El camino completo, de punta a punta y SIN red (parte 2 de la revisión): el cliente de Supabase de verdad habla HTTP con el
 * servidor simulado sobre PGlite con las migraciones REALES, y cada persona entra con SU sesión.
 *
 *   familia (casa y perro) → paseadora (postulación completa con curso, examen y la hora de la videollamada) → el equipo aprueba
 *   con las cinco casillas → la familia ve a la paseadora y pide un paseo → ella acepta, empieza (punto de control), saca una
 *   foto, hay chat, termina → pago al final (la familia paga a Patitas, la paseadora «Vi el pago», el equipo «Pagado al
 *   paseador») → un segundo paseo termina en disputa y el equipo la resuelve → todos salen y vuelven a entrar.
 *
 * También se comprueba que nada se puede hacer dos veces (postular, reservar, pagar), que lo que no le toca a una persona la base
 * lo rechaza y la app lo dice en español simple. Sin PGlite (`npm i --no-save @electric-sql/pglite@0.2.17`) se salta.
 */
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { confirmarEntregaJob, moverPaseo, registrarPunto, reportarJob, resolverJob } from '../bus'
import { abrirCaso, casoDeReporte, resolverCaso, type Caso, type Reporte } from '../casos'
import { CLAVES } from '../datos/claves'
import { WALKERS } from '../data'
import { armarPunto, puntosDelPaseo } from '../puntosControl'
import type { LatLng } from '../geo'
import { WALKER_BLOCKS } from '../legal'
import { pagoPendiente, porPagarAlPaseador } from '../pagos'
import { appFromWalker, estadoVisible, type WalkerApplication } from '../walkerStore'
import { postulacionCompleta } from '../../components/walker/WalkerOnboarding'
import { paseadoresDeVista } from './paseadoresReales'
import { TEXTO_PAGO_SERVIDOR } from './paseosTextos'
import { enviarMiPostulacion, guardarDecision, leerPostulacionesDelEquipo } from './postulaciones'
import { appConEstadoPropio } from './postulacionesMapeo'
import { crearServidorHttp } from './pruebas/servidorHttp'
import type { ServidorDePrueba } from './pruebas/servidorFalso'
import { abrirTelefono, esperar as esperarPoco, jobDeSolicitud, type Telefono } from './pruebas/telefonos'

const RAIZ = path.resolve(__dirname, '..', '..')
const FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000001'
const OTRA_FAMILIA = 'aaaaaaaa-0000-4000-8000-000000000002'
const ANA = 'bbbbbbbb-0000-4000-8000-0000000000a1'
const EQUIPO = 'cccccccc-0000-4000-8000-000000000001'
/** Un punto dentro de San Isidro (el Olivar). */
const OLIVAR: LatLng = [-12.0999, -77.0374]

const probe = await crearServidorHttp(RAIZ)
const hayPglite = probe !== null
await probe?.cerrar()

/** Con HTTP y PGlite cada vuelta a la base tarda más (y más aún con la computadora ocupada): se espera hasta 45 s. */
const esperar = (condicion: () => boolean | Promise<boolean>, descripcion: string) => esperarPoco(condicion, descripcion, 45_000)

const abiertos: Telefono[] = []
const servidoresAbiertos: ServidorDePrueba[] = []
afterEach(async () => {
  abiertos.splice(0).forEach((t) => t.cerrar())
  await Promise.all(servidoresAbiertos.splice(0).map((s) => s.cerrar()))
})

async function nuevoServidor(): Promise<ServidorDePrueba> {
  const s = await crearServidorHttp(RAIZ)
  if (!s) throw new Error('El servidor de prueba no está disponible')
  servidoresAbiertos.push(s)
  await s.persona({ id: FAMILIA, rol: 'familia', nombre: 'Valeria' })
  await s.persona({ id: OTRA_FAMILIA, rol: 'familia', nombre: 'Rosa' })
  // Ana se registró como paseadora (todavía sin postulación ni aprobación).
  await s.persona({ id: ANA, rol: 'paseador', nombre: 'Ana' })
  await s.persona({ id: EQUIPO, rol: 'equipo', nombre: 'Equipo' })
  return s
}

async function telefono(s: ServidorDePrueba, uid: string | null): Promise<Telefono> {
  // Cada teléfono pregunta cada 80 ms: con cinco teléfonos y la computadora ocupada, menos vueltas a la base de prueba.
  const t = abrirTelefono(s, uid, { intervaloMs: 80 })
  abiertos.push(t)
  await t.copia.alEstarListo()
  return t
}

const guardado = async (t: Telefono, clave: string = CLAVES.paseo) => expect(await t.copia.yaSeGuardo(clave)).toBe('guardado')
const casosDe = (t: Telefono) => t.copia.leer<Caso[]>(CLAVES.casos, [])
const abrirCasoEnCola = (t: Telefono, caso: Caso) => t.copia.guardar(CLAVES.casos, abrirCaso(casosDe(t), caso))

/** La postulación de Ana con TODOS los pasos hechos: datos, perfil, curso, examen, autorización y la hora de la videollamada. */
function postulacionDeAna(extra: Partial<WalkerApplication> = {}): WalkerApplication {
  const base = appFromWalker(WALKERS[0])
  return {
    ...base,
    phone: '987 654 321',
    person: { ...base.person, firstName: 'Ana', lastName: 'Prueba', dni: '45678912' },
    status: 'enviada',
    code: 'PAT-ANA1',
    photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ',
    consent: Object.fromEntries(WALKER_BLOCKS.map((b) => [b.id, true])),
    cobro: { metodo: 'yape', telefono: '987 654 321', titular: 'Ana Prueba' },
    curso: { aciertos: 10, total: 10, pct: 100, aprobado: true, takenAt: '2026-10-13T10:00:00.000Z' },
    quiz: { points: 10, max: 10, pct: 100, danger: [], open: {}, openFlags: [], durationSec: 300, verdict: 'auto', takenAt: '2026-10-13T10:05:00.000Z' },
    consults: { consent: true },
    videoSlot: 'Lun 7:00 pm',
    review: { comprobaciones: {}, notes: '', supervisedWalks: 0 },
    createdAt: '2026-10-13T10:00:00.000Z',
    ...extra,
  }
}

const CINCO = { dni: true, distrito: true, celular: true, consultas: true, examen: true }

/** Un texto es «español simple» si no deja ver nada técnico (códigos, siglas de la base, inglés) y es corto. */
const TECNICO = /\bRLS\b|\bJWT\b|policy|constraint|violat|postgres|\bsql\b|http|\b[45]\d\d\b|undefined|\bnull\b|exception|stack|failed|denied|permission/i
const esEspanolSimple = (t: string) => t.length > 5 && !TECNICO.test(t) && t.split(/\s+/).length <= 30 && /[a-záéíóúñ]/i.test(t)

/** Pide un paseo a Ana (ya aprobada), ella acepta, sale y recoge: queda «en_paseo». */
async function pedirYSalir(familia: Telefono, ana: Telefono, hora: number): Promise<string> {
  const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === ANA)
  if (!w) throw new Error('La familia no ve a Ana entre los paseadores aprobados')
  const { job } = jobDeSolicitud({ walker: w, hora })
  familia.actuar(() => job)
  await guardado(familia)
  await esperar(() => ana.paseos().some((j) => j.id === job.id), 'que Ana vea la solicitud')
  for (const accion of ['aceptar', 'salir', 'recoger'] as const) {
    ana.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
    await guardado(ana)
  }
  await esperar(() => familia.paseos().some((j) => j.id === job.id && j.paseo.estado === 'en_paseo'), 'que la familia vea el paseo en marcha')
  return job.id
}

describe.skipIf(!hayPglite)('el camino completo con el servidor (cliente de Supabase real, reglas SQL reales)', () => {
  it(
    'familia, paseadora y equipo: de la postulación al pago, con foto, chat, punto de control y una disputa; y todos salen y vuelven a entrar',
    async () => {
      const s = await nuevoServidor()
      const postulaciones = s.postulaciones
      if (!postulaciones) throw new Error('El servidor de prueba no tiene el cliente de postulaciones')
      const delEquipo = await postulaciones(EQUIPO)

      /* ---- 1. Ana postula: curso, examen y la hora de la videollamada; sale sola a la base, con dónde cobra ---- */
      const app = postulacionDeAna()
      expect(postulacionCompleta(app)).toBe(true)
      const deAna = await postulaciones(ANA)
      const envio = await enviarMiPostulacion(deAna, app, ANA)
      expect(envio).toMatchObject({ ok: true, codigo: 'PAT-ANA1' })
      // Postular dos veces es lo mismo que una: sigue habiendo una sola postulación, un solo DNI y un solo cobro.
      expect((await enviarMiPostulacion(deAna, app, ANA)).ok).toBe(true)
      expect(await s.contar('postulaciones')).toBe(1)
      expect(await s.contar('cobros_paseador')).toBe(1)
      expect((await s.volcar('postulaciones'))[0]).toMatchObject({ paseador_id: ANA, estado: 'enviada', codigo: 'PAT-ANA1', cita_videollamada: 'Lun 7:00 pm' })

      /* ---- 2. Todavía no la aprobaron: la familia no la ve ---- */
      const familia = await telefono(s, FAMILIA)
      expect(paseadoresDeVista(await familia.cliente.paseadoresPublicos()).map((w) => w.id)).not.toContain(ANA)

      /* ---- 3. El equipo revisa (ve su DNI, su celular y dónde cobra) y la aprueba con las cinco casillas ---- */
      const [pendiente] = await leerPostulacionesDelEquipo(delEquipo)
      expect(pendiente.app.person.dni).toBe('45678912')
      expect(pendiente.app.cobro).toMatchObject({ metodo: 'yape', titular: 'Ana Prueba' })
      expect(estadoVisible(pendiente.app)).toBe('enviada')
      const aprobada = { ...pendiente.app, status: 'supervisado' as const, review: { ...pendiente.app.review, comprobaciones: CINCO } }
      expect(await guardarDecision(delEquipo, ANA, pendiente.app, aprobada)).toEqual({ ok: true })

      // Ana ve su estado real en la base (aprobada, con sus casillas) sin haber abierto nada más.
      const { post, comp } = await deAna.miPostulacion(ANA)
      expect(estadoVisible(appConEstadoPropio(app, post, comp)!)).toBe('supervisado')
      // Y la familia ya la ve: su cobro salió junto con la postulación (no hizo falta que abriera la pantalla «Hoy»).
      expect(paseadoresDeVista(await familia.cliente.paseadoresPublicos()).map((w) => w.id)).toContain(ANA)

      /* ---- 4. La familia pide un paseo (con su casa y su perro); tocar dos veces no lo duplica ---- */
      const ana = await telefono(s, ANA)
      const equipo = await telefono(s, EQUIPO)
      const w = paseadoresDeVista(await familia.cliente.paseadoresPublicos()).find((x) => x.id === ANA)!
      const { job } = jobDeSolicitud({ walker: w, hora: 10 })
      familia.actuar(() => job)
      familia.actuar(() => job)
      await guardado(familia)
      expect(await s.contar('paseos')).toBe(1)
      expect(await s.contar('casas')).toBe(1)
      expect(await s.contar('perros')).toBe(1)
      expect(await s.contar('pagos')).toBe(1)
      expect(await s.contar('paseo_eventos')).toBe(1)
      const id = job.id

      /* ---- 5. Ana acepta, sale, recoge; anota el inicio, saca una foto, hay chat, entrega y anota el fin ---- */
      await esperar(() => ana.paseos().some((j) => j.id === id), 'que Ana vea la solicitud')
      for (const accion of ['aceptar', 'salir', 'recoger'] as const) {
        ana.actuar((j) => moverPaseo(j, accion, 'paseador', Date.now()))
        await guardado(ana)
      }
      const t0 = Date.now()
      ana.actuar((j) => registrarPunto(j, armarPunto('inicio', t0, { pos: OLIVAR, precisionM: 10, t: t0 - 5000 }, 'activa')))
      await guardado(ana)
      expect((await ana.tomarFoto({ jobId: id, t: t0 + 1000, ubicacion: { pos: OLIVAR, lecturaT: t0 } })).ok).toBe(true)
      await esperar(() => familia.paseos().some((j) => j.id === id && j.paseo.estado === 'en_paseo'), 'que la familia vea el paseo en marcha')
      familia.escribir('Hola Ana, Max se asusta con las motos.')
      ana.escribir('Tranquila, voy por el parque.')
      await guardado(familia, CLAVES.chat)
      await guardado(ana, CLAVES.chat)
      await esperar(() => familia.chat().length === 2 && ana.chat().length === 2, 'que los dos vean los dos mensajes')

      ana.actuar((j) => moverPaseo(j, 'entregar', 'paseador', Date.now() + 5000))
      await guardado(ana)
      ana.actuar((j) => registrarPunto(j, armarPunto('fin', t0 + 6000, null, 'negada')))
      await guardado(ana)
      await esperar(() => familia.paseos().some((j) => j.id === id && j.paseo.estado === 'entregado'), 'que la familia vea la entrega')
      await esperar(() => familia.fotos().filter((f) => f.jobId === id).length === 1 && (familia.paseos().find((j) => j.id === id)?.puntos?.length ?? 0) === 2, 'que la familia vea la foto y los dos puntos')
      const vistos = puntosDelPaseo(familia.paseos().find((j) => j.id === id)?.puntos ?? [], familia.fotos().filter((f) => f.jobId === id))
      expect(vistos.map((p) => p.etiqueta)).toEqual(['Inicio', 'Foto 1', 'Fin'])

      /* ---- 6. Pago al final: la familia paga a Patitas, Ana marca «Vi el pago», el equipo «Pagado al paseador» ---- */
      await esperar(() => pagoPendiente(familia.pagos())?.id === id, 'que la familia vea que le toca pagar')
      // Mientras tanto la app no la deja pedir otro paseo (el pago es al final del anterior).
      familia.actuar((j) => confirmarEntregaJob(j, Date.now()))
      await guardado(familia)
      await esperar(() => ana.pagos().some((p) => p.id === id && p.paseo === 'cerrado'), 'que el pago sepa que el paseo se cerró')
      // Quien no es la paseadora no puede marcar «Vi el pago»; la paseadora no puede pagarse sola. Los textos son simples.
      const sinPermisoFamilia = await familia.remoto.moverPago(id, 'ver_pago')
      expect(sinPermisoFamilia).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.soloPaseador })
      const sinPermisoAna = await ana.remoto.moverPago(id, 'pagar_al_paseador')
      expect(sinPermisoAna).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.soloEquipo })
      for (const r of [sinPermisoFamilia, sinPermisoAna]) if (!r.ok) expect(esEspanolSimple(r.motivo), r.motivo).toBe(true)

      expect((await ana.remoto.moverPago(id, 'ver_pago', { hora: '10:45' })).ok).toBe(true)
      // Marcar dos veces «Vi el pago» no cambia nada ni lo repite.
      await ana.remoto.moverPago(id, 'ver_pago')
      expect((await s.pagoDe(id))?.estado).toBe('visto')
      expect(await s.contar('pagos')).toBe(1)
      await esperar(() => porPagarAlPaseador(equipo.pagos()).length === 1, 'que el equipo vea el pago por pagar')
      expect(equipo.cobros()[ANA]).toMatchObject({ metodo: 'yape', titular: 'Ana Prueba' })
      expect((await equipo.remoto.moverPago(id, 'pagar_al_paseador')).ok).toBe(true)
      expect((await s.pagoDe(id))?.estado).toBe('pagado_paseador')
      await esperar(() => familia.pagos().some((p) => p.id === id && p.estado === 'pagado_paseador') && ana.pagos().some((p) => p.id === id && p.estado === 'pagado_paseador'), 'que los dos vean que ya se le pagó')
      expect(pagoPendiente(familia.pagos())).toBeNull()

      /* ---- 7. Segundo paseo: ya no hay pago pendiente; termina en disputa y el equipo la resuelve ---- */
      const id2 = await pedirYSalir(familia, ana, 15)
      expect(await s.contar('paseos')).toBe(2)
      // Todavía no terminó: «Vi el pago» no vale y el texto lo explica.
      const aunNo = await ana.remoto.moverPago(id2, 'ver_pago')
      expect(aunNo).toEqual({ ok: false, motivo: TEXTO_PAGO_SERVIDOR.paseoNoTermino })
      expect(esEspanolSimple(TEXTO_PAGO_SERVIDOR.paseoNoTermino)).toBe(true)

      const reporte: Reporte = { quien: 'dueno', motivo: 'trato', texto: 'Max volvió con la correa suelta.', at: Date.now(), foto: 'data:image/jpeg;base64,AAAA' }
      familia.actuar((j) => reportarJob(j, reporte))
      abrirCasoEnCola(familia, casoDeReporte(familia.activo()!, reporte))
      await guardado(familia, CLAVES.casos)
      await guardado(familia)
      // Reportar dos veces es un solo caso.
      abrirCasoEnCola(familia, casoDeReporte(familia.activo()!, reporte))
      await esperar(() => casosDe(equipo).length === 1 && casosDe(ana).length === 1, 'que el equipo y Ana vean el caso')
      expect(await s.contar('casos')).toBe(1)
      expect(await s.estadoDe(id2)).toBe('en_disputa')
      const caso = casosDe(equipo)[0]
      const r = resolverCaso(casosDe(equipo), caso.id, 'cerrado', 'Hablamos con las dos partes y se cerró el paseo.', Date.now())
      expect(r.ok).toBe(true)
      if (!r.ok) return
      equipo.copia.guardar(CLAVES.casos, r.casos)
      equipo.actuar((j) => resolverJob(j, caso, 'cerrado', 'Hablamos con las dos partes y se cerró el paseo.', Date.now() + 1))
      await guardado(equipo, CLAVES.casos)
      await guardado(equipo)
      expect(await s.estadoDe(id2)).toBe('cerrado')
      await esperar(() => casosDe(familia)[0]?.resolucion?.como === 'cerrado' && familia.paseos().some((j) => j.id === id2 && j.paseo.estado === 'cerrado'), 'que la familia vea la resolución')

      /* ---- 8. Todos salen y vuelven a entrar: cada uno ve lo mismo que antes, y nadie ve lo de otra persona ---- */
      abiertos.splice(0).forEach((t) => t.cerrar())
      const familia2 = await telefono(s, FAMILIA)
      const ana2 = await telefono(s, ANA)
      const equipo2 = await telefono(s, EQUIPO)
      const otra = await telefono(s, OTRA_FAMILIA)
      await esperar(() => familia2.paseos().length === 2 && ana2.paseos().length === 2 && equipo2.paseos().length === 2, 'que vuelvan a verse los dos paseos')
      const estadoDe = (t: Telefono, pid: string) => t.paseos().find((j) => j.id === pid)?.paseo.estado
      for (const t of [familia2, ana2, equipo2]) {
        expect(estadoDe(t, id)).toBe('cerrado')
        expect(estadoDe(t, id2)).toBe('cerrado')
      }
      await esperar(() => familia2.pagos().length === 2 && familia2.pagos().find((p) => p.id === id)?.estado === 'pagado_paseador', 'que la familia vea sus pagos')
      expect(familia2.chat().map((m) => m.text)).toEqual(['Hola Ana, Max se asusta con las motos.', 'Tranquila, voy por el parque.'])
      expect(ana2.chat()).toHaveLength(2)
      await esperar(() => familia2.fotos().filter((f) => f.jobId === id).length === 1 && (familia2.paseos().find((j) => j.id === id)?.puntos?.length ?? 0) === 2, 'que vuelvan la foto y los puntos')
      await esperar(() => casosDe(familia2).length === 1 && casosDe(ana2).length === 1 && casosDe(equipo2).length === 1, 'que vuelva el caso')
      expect(casosDe(familia2)[0].resolucion?.nota).toMatch(/Hablamos con las dos partes/)
      // La otra familia no ve nada de esto.
      await new Promise((x) => setTimeout(x, 300))
      expect(otra.paseos()).toEqual([])
      expect(otra.pagos()).toEqual([])
      expect(casosDe(otra)).toEqual([])
      expect(otra.chat()).toEqual([])
      // Y sin sesión, nada.
      const anonimo = await telefono(s, null)
      expect(anonimo.paseos()).toEqual([])
    },
    240_000,
  )

  it('una paseadora que ya envió su postulación y entra otra vez desde otro teléfono ve su estado real, no empieza de cero', async () => {
    const s = await nuevoServidor()
    const postulaciones = s.postulaciones!
    const deAna = await postulaciones(ANA)
    expect((await enviarMiPostulacion(deAna, postulacionDeAna(), ANA)).ok).toBe(true)
    const delEquipo = await postulaciones(EQUIPO)
    const [pendiente] = await leerPostulacionesDelEquipo(delEquipo)
    await guardarDecision(delEquipo, ANA, pendiente.app, { ...pendiente.app, status: 'rechazada' })

    // Otro teléfono: solo tiene el nombre y el celular de la cuenta (sin curso, examen ni perfil).
    const otroTelefono = await postulaciones(ANA)
    const { post, comp, cobro } = await otroTelefono.miPostulacion(ANA)
    expect(post).not.toBeNull()
    expect(estadoVisible(appConEstadoPropio(null, post, comp)!)).toBe('rechazada')
    // La base le devuelve su postulación y dónde cobra; el DNI no (ya no lo puede leer).
    expect(cobro).toMatchObject({ titular: 'Ana Prueba' })
    expect(await otroTelefono.listarDnis()).toEqual([])
  })

  it('un error de la base nunca llega a la pantalla con letras técnicas', async () => {
    const s = await nuevoServidor()
    const postulaciones = s.postulaciones!
    const deAna = await postulaciones(ANA)
    await enviarMiPostulacion(deAna, postulacionDeAna(), ANA)
    // Ana intenta aprobarse a sí misma: la base lo rechaza y el aviso es simple.
    const { post } = await deAna.miPostulacion(ANA)
    expect(post).not.toBeNull()
    const antes = postulacionDeAna()
    const intento = await guardarDecision(deAna, ANA, antes, { ...antes, status: 'activo', review: { ...antes.review, comprobaciones: CINCO } })
    expect(intento.ok).toBe(false)
    if (!intento.ok) expect(esEspanolSimple(intento.motivo), intento.motivo).toBe(true)
    expect((await s.volcar('postulaciones'))[0].estado).toBe('enviada')
    // Sin sesión, también.
    const sinRed = await guardarDecision(await postulaciones(null), ANA, antes, { ...antes, status: 'supervisado' })
    expect(sinRed.ok).toBe(false)
    if (!sinRed.ok) expect(esEspanolSimple(sinRed.motivo), sinRed.motivo).toBe(true)
  })
})
