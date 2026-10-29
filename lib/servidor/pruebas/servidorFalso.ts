/**
 * Un servidor de MENTIRA para las pruebas: la base de los paseos en memoria, con las mismas reglas de acceso que el SQL
 * (supabase/migrations) escritas a mano. No hay red, ni claves, ni Supabase. Sirve para probar la lógica de la app.
 * Las reglas de verdad se prueban contra el SQL (supabase/tests/) y, si PGlite está instalado, los mismos escenarios
 * corren también contra la base real simulada (`servidorPglite.ts`).
 */
import type { ClienteUbicacion } from '../clienteUbicacion'
import { TRANSICIONES, type EstadoPaseo } from '../../paseo'
import { TRANSICIONES_PAGO } from '../../pagos'
import { LIMITE_BYTES_ALMACEN, TIPOS_DEL_ALMACEN } from '../fotosMapeo'
import type { CambioDeCaso, FilaCasoNueva } from '../casosMapeo'
import type { ClientePedidos } from '../clientePedidos'
import type { ClientePostulaciones } from '../clientePostulaciones'
import type { FilaResenaNueva } from '../resenasMapeo'
import { ErrorDeBase, type CambiosDePaseo, type ClientePaseos, type FilaBitacoraNueva, type FilaCasaNueva, type FilaCobroNueva, type FilaCruda, type FilaEventoNueva, type FilaFotoNueva, type FilaMensajeNueva, type FilaPuntoNueva, type FilaPaseoNueva, type FilaPerroNueva, type RolServidor } from '../paseosTipos'

export interface PersonaSembrada {
  id: string
  rol: RolServidor
  nombre: string
}

export interface PaseadorAprobado {
  id: string
  nombre: string
  apellido?: string
  perfil?: Record<string, unknown>
  dni?: string
  /** Por defecto las cinco casillas. */
  comprobaciones?: string[]
  paseosAcompanados?: number
  cobro?: { metodo: 'yape' | 'plin'; celular: string; titular: string }
}

/** Lo que una prueba puede hacer con cualquiera de los dos servidores (el falso y el de PGlite). */
export interface ServidorDePrueba {
  /** El cliente de esa persona (su sesión). `null` = sin sesión. */
  cliente(id: string | null): ClientePaseos & { fallarConRed(n: number | 'siempre'): void; conteo(): Record<string, number> }
  /**
   * El cliente de las postulaciones de esa persona (su sesión). Solo lo tiene el servidor de HTTP sobre PGlite (el de verdad
   * de las reglas): los otros dos no simulan las postulaciones.
   */
  postulaciones?(id: string | null): Promise<ClientePostulaciones>
  /** El cliente de «Pedir paseo» de esa persona. Solo el servidor de HTTP sobre PGlite (las reglas de verdad) lo tiene. */
  pedidos?(id: string | null): Promise<ClientePedidos>
  ubicacion?(id: string | null): Promise<ClienteUbicacion>
  persona(p: PersonaSembrada): Promise<void>
  paseadorAprobado(p: PaseadorAprobado): Promise<void>
  /** Cuántas filas hay en una tabla (para comprobar). */
  contar(tabla: 'paseos' | 'paseo_eventos' | 'bitacora' | 'codigos_recojo' | 'casas' | 'perros' | 'mensajes' | 'pagos' | 'cobros_paseador' | 'fotos' | 'puntos_control' | 'casos' | 'postulaciones' | 'resenas' | 'pedidos' | 'ofertas' | 'pedidos_vistos'): Promise<number>
  /** El estado que la base tiene de un paseo. */
  estadoDe(paseoId: string): Promise<string | null>
  /** El pago de un paseo tal como está en la base (sin mirar permisos: para comprobar). */
  pagoDe(paseoId: string): Promise<Record<string, unknown> | null>
  /** Las filas de una tabla tal como están en la base (sin mirar permisos: para comprobar, por ejemplo, que no hay ubicación de más). */
  volcar(tabla: 'paseos' | 'paseo_eventos' | 'bitacora' | 'mensajes' | 'fotos' | 'puntos_control' | 'pagos' | 'casos' | 'postulaciones' | 'comprobaciones' | 'cobros_paseador' | 'datos_dni' | 'casas' | 'perros' | 'resenas'): Promise<Array<Record<string, unknown>>>
  /** Cuántas imágenes hay en el almacén privado de fotos. */
  imagenes(): Promise<number>
  /** ¿Está esa imagen en el almacén? (sin mirar permisos: para comprobar) */
  hayImagen(ruta: string): Promise<boolean>
  /** Lo que devuelve un enlace que vence: la imagen, o null si ya venció o no existe. */
  leerEnlace(enlace: string): Promise<{ bytes: Uint8Array; tipo: string } | null>
  /** Hace vencer todos los enlaces pedidos hasta ahora (para probar que uno vencido no sirve). */
  vencerEnlaces(): Promise<void>
  /** Cambia a mano la hora de creación de un paseo (para probar plazos). */
  envejecer(paseoId: string, minutos: number): Promise<void>
  cerrar(): Promise<void>
}

/** El perfil que se siembra por defecto (la tarifa es un dato de prueba, no un precio de la app). */
export const TARIFA_DE_PRUEBA = 22
export const perfilDePrueba = (): Record<string, unknown> => ({ rate: TARIFA_DE_PRUEBA, sizes: ['small', 'medium', 'large'], times: ['Mañana (6–12)', 'Tarde (12–18)'] })

const ACEPTADOS: EstadoPaseo[] = ['aceptado', 'en_camino', 'en_paseo', 'entregado', 'en_disputa']
const DEFAULT_CASILLAS = ['dni', 'distrito', 'celular', 'consultas', 'examen']

const prohibido = (m = 'new row violates row-level security policy') => new ErrorDeBase(m, 403, '42501')
const noExiste = (a: string, b: string) => new ErrorDeBase(`Ese cambio de estado del paseo no existe (${a} → ${b}).`, 400, '22023')

export function crearServidorFalso(): ServidorDePrueba {
  const personas = new Map<string, PersonaSembrada>()
  const aprobados = new Map<string, PaseadorAprobado>()
  const paseos: FilaCruda[] = []
  const eventos: FilaCruda[] = []
  const bitacora: FilaCruda[] = []
  const mensajes: FilaCruda[] = []
  const codigos = new Map<string, { codigo: string; fallos: number }>()
  const casas = new Map<string, FilaCruda>()
  const perros = new Map<string, FilaCruda>()
  const pagos = new Map<string, FilaCruda>()
  const cobros = new Map<string, FilaCruda>()
  const fotos = new Map<string, FilaCruda>()
  const puntos = new Map<string, FilaCruda>()
  const casos = new Map<string, FilaCruda>()
  /** Las reseñas, por paseo (una por paseo). */
  const resenas = new Map<string, FilaCruda>()
  const imagenes = new Map<string, { bytes: Uint8Array; tipo: string }>()
  const enlaces = new Map<string, { ruta: string; vence: number }>()
  let n = 0

  const paseo = (id: string) => paseos.find((p) => p.id === id)
  const rolDe = (uid: string) => personas.get(uid)?.rol
  const participa = (uid: string, p: FilaCruda) => p.familia_id === uid || p.paseador_id === uid
  const visible = (uid: string, p: FilaCruda) => rolDe(uid) === 'equipo' || participa(uid, p)
  const anotar = (paseoId: string, accion: string, de: string | null, a: string, quien: string, extra: FilaCruda = {}) => {
    eventos.push({ id: ++n, paseo_id: paseoId, accion, de, a, quien, en: new Date().toISOString(), nota: null, demo: false, aviso: null, ...extra })
  }
  /** Como `privado.familia_ve_hoy`: la familia con un paseo aceptado (o más avanzado) con ese paseador. */
  const familiaVeHoy = (uid: string, paseadorId: unknown) =>
    paseos.some((p) => p.paseador_id === paseadorId && p.familia_id === uid && ['aceptado', 'en_camino', 'en_paseo', 'entregado', 'cerrado', 'en_disputa'].includes(String(p.estado)))
  /** Las reglas de `fotos_ver`. */
  const veLaFoto = (uid: string, f: FilaCruda) => {
    if (rolDe(uid) === 'equipo') return true
    if (f.tipo === 'paseo') return participa(uid, paseo(String(f.paseo_id)) ?? {})
    return f.tipo === 'hoy' && (f.paseador_id === uid || familiaVeHoy(uid, f.paseador_id))
  }
  /** Las reglas de `fotos_almacen_ver` (storage.objects). */
  const veLaImagen = (uid: string, ruta: string) => {
    if (rolDe(uid) === 'equipo') return true
    if ([...fotos.values()].some((f) => f.ruta === ruta && veLaFoto(uid, f))) return true
    const [carpeta, paseoId] = ruta.split('/')
    return carpeta === 'chat' && participa(uid, paseo(paseoId) ?? {})
  }
  /** Las reglas de `fotos_almacen_subir`. */
  const puedeSubirImagen = (uid: string, ruta: string) => {
    const [carpeta, id] = ruta.split('/')
    if (carpeta === 'paseo') return rolDe(uid) === 'paseador' && paseo(id)?.paseador_id === uid
    if (carpeta === 'hoy') return rolDe(uid) === 'paseador' && id === uid
    return carpeta === 'chat' && participa(uid, paseo(id) ?? {})
  }
  /** La regla de borrado del paso 8: solo la carpeta `hoy/<su id>/`, y solo un paseador. */
  const puedeBorrarImagen = (uid: string, ruta: string) => {
    const [carpeta, id] = ruta.split('/')
    return carpeta === 'hoy' && id === uid && rolDe(uid) === 'paseador'
  }
  /** Las reglas de `resenas_ver`: su autora, el paseador reseñado, el equipo y cualquiera si el paseador está aprobado. */
  const veLaResena = (uid: string, r: FilaCruda) => rolDe(uid) === 'equipo' || r.familia_id === uid || r.paseador_id === uid || aprobados.has(String(r.paseador_id))
  const vistaDe = (a: PaseadorAprobado): FilaCruda => {
    const suyas = [...resenas.values()].filter((r) => r.paseador_id === a.id)
    const promedio = suyas.reduce((t, r) => t + Number(r.estrellas), 0) / (suyas.length || 1)
    return {
      ...filaDeVista(a),
      // Lo que suma la vista pública: cuántas reseñas, su promedio (una decimal) y los paseos terminados.
      resenas_n: suyas.length,
      calificacion: suyas.length > 0 ? Math.round(promedio * 10) / 10 : null,
      paseos_hechos: paseos.filter((p) => p.paseador_id === a.id && p.estado === 'cerrado').length,
    }
  }
  const filaDeVista = (a: PaseadorAprobado): FilaCruda => ({
    paseador_id: a.id,
    codigo: `PAT-${a.nombre.slice(0, 3).toUpperCase()}`,
    nombre_pila: a.nombre,
    apellido_inicial: (a.apellido ?? '').slice(0, 1),
    universidad: '',
    carrera: 'Psicología',
    ciclo: '5to ciclo',
    distrito: 'San Isidro',
    perfil: a.perfil ?? perfilDePrueba(),
    foto_ruta: null,
    paseos_acompanados: a.paseosAcompanados ?? 0,
    comprobaciones: a.comprobaciones ?? DEFAULT_CASILLAS,
    dni_ultimos3: (a.dni ?? '12345678').slice(-3),
  })

  const servidor: ServidorDePrueba = {
    cliente(uid) {
      let fallos: number | 'siempre' = 0
      const llamadas: Record<string, number> = {}
      const red = (nombre: string) => {
        llamadas[nombre] = (llamadas[nombre] ?? 0) + 1
        if (fallos === 'siempre' || fallos > 0) {
          if (typeof fallos === 'number') fallos -= 1
          throw new ErrorDeBase('Failed to fetch', 0)
        }
      }
      const yo = () => {
        if (!uid) throw new ErrorDeBase('JWT expired', 401, 'PGRST301')
        return uid
      }
      return {
        fallarConRed(k) {
          fallos = k
        },
        conteo: () => ({ ...llamadas }),

        async sesion() {
          red('sesion')
          if (!uid) return null
          const p = personas.get(uid)
          return p ? { id: p.id, rol: p.rol } : null
        },
        alCambiarSesion: () => () => undefined,

        async listarPaseos(limite) {
          red('listarPaseos')
          const me = yo()
          return paseos
            .filter((p) => visible(me, p))
            .sort((a, b) => String(b.creado_en).localeCompare(String(a.creado_en)))
            .slice(0, limite)
            .map((p) => ({ ...p }))
        },
        async listarEventos(ids) {
          red('listarEventos')
          const me = yo()
          return eventos.filter((e) => ids.includes(String(e.paseo_id)) && visible(me, paseo(String(e.paseo_id)) ?? {})).map((e) => ({ ...e }))
        },
        async listarBitacora(ids) {
          red('listarBitacora')
          const me = yo()
          return bitacora.filter((e) => ids.includes(String(e.paseo_id)) && visible(me, paseo(String(e.paseo_id)) ?? {})).map((e) => ({ ...e }))
        },
        async listarMensajes(ids, limite = 500) {
          red('listarMensajes')
          const me = yo()
          return mensajes
            .filter((m) => ids.includes(String(m.paseo_id)) && visible(me, paseo(String(m.paseo_id)) ?? {}))
            .sort((a, b) => String(a.en).localeCompare(String(b.en)))
            .slice(-limite)
            .map((m) => ({ ...m }))
        },
        async listarCodigos(ids) {
          red('listarCodigos')
          const me = yo()
          return ids
            .filter((id) => {
              const p = paseo(id)
              return !!p && (p.familia_id === me || rolDe(me) === 'equipo') && codigos.has(id)
            })
            .map((id) => ({ paseo_id: id, codigo: codigos.get(id)!.codigo }))
        },
        async listarCasas(familias) {
          red('listarCasas')
          const me = yo()
          return familias
            .filter((f) => {
              if (rolDe(me) === 'equipo' || f === me) return true
              return paseos.some((p) => p.familia_id === f && p.paseador_id === me && ACEPTADOS.includes(p.estado as EstadoPaseo))
            })
            .map((f) => casas.get(f))
            .filter((c): c is FilaCruda => !!c)
            .map((c) => ({ ...c }))
        },
        async listarPerros(ids) {
          red('listarPerros')
          const me = yo()
          return ids
            .map((id) => perros.get(id))
            .filter((d): d is FilaCruda => {
              if (!d) return false
              if (rolDe(me) === 'equipo' || d.familia_id === me) return true
              return paseos.some((p) => p.perro_id === d.id && p.paseador_id === me && ACEPTADOS.includes(p.estado as EstadoPaseo))
            })
            .map((d) => ({ ...d }))
        },
        async paseadoresPublicos(id) {
          red('paseadoresPublicos')
          yo()
          return [...aprobados.values()].filter((a) => !id || a.id === id).map(vistaDe)
        },
        async miCobro(id) {
          red('miCobro')
          const c = cobros.get(id)
          if (!c || (yo() !== id && rolDe(yo()) !== 'equipo')) return null
          return { ...c }
        },

        async guardarCasa(f: FilaCasaNueva) {
          red('guardarCasa')
          if (f.familia_id !== yo() || rolDe(yo()) !== 'familia') throw prohibido()
          casas.set(f.familia_id, { ...f })
        },
        async guardarPerro(f: FilaPerroNueva) {
          red('guardarPerro')
          if (f.familia_id !== yo() || rolDe(yo()) !== 'familia') throw prohibido()
          perros.set(f.id, { ...f })
        },
        async crearPaseo(f: FilaPaseoNueva) {
          red('crearPaseo')
          const me = yo()
          if (f.familia_id !== me || rolDe(me) !== 'familia' || !aprobados.has(f.paseador_id)) throw prohibido()
          if (Math.abs(f.monto - (f.comision + f.neto)) >= 0.011) throw new ErrorDeBase('violates check constraint', 400, '23514')
          if (f.perro_id && perros.get(f.perro_id)?.familia_id !== me) throw prohibido()
          if (paseo(f.id)) return
          // Como el disparador de la base: con un paseo ya hecho que todavía se debe, no se pide otro.
          for (const g of pagos.values()) {
            if (g.familia_id === me && (g.estado === 'sin_pagar' || g.estado === 'no_encontrado') && (g.paseo_estado === 'entregado' || g.paseo_estado === 'cerrado')) {
              throw new ErrorDeBase('Tienes un pago pendiente: hasta pagarlo no se puede pedir otro paseo.', 400, '23514')
            }
          }
          paseos.push({
            ...f,
            estado: 'solicitado',
            vigilancia: null,
            ubicacion: null,
            reporte: null,
            cerrado_paseador: false,
            creado_en: new Date().toISOString(),
            aceptado_en: null,
            actualizado_en: new Date().toISOString(),
          })
          anotar(f.id, 'solicitar', null, 'solicitado', 'dueno')
          // Como el disparador de la base: al crear el paseo nace su pago, sin que la app lo escriba.
          pagos.set(f.id, {
            paseo_id: f.id,
            familia_id: f.familia_id,
            paseador_id: f.paseador_id,
            monto: f.monto,
            comision: f.comision,
            neto: f.neto,
            estado: 'sin_pagar',
            paseo_estado: 'solicitado',
            hecho_en: null,
            visto_en: null,
            hora_pago: null,
            no_encontrado_en: null,
            pagado_paseador_en: null,
            nota: null,
            demo: false,
            creado_en: new Date().toISOString(),
          })
        },
        async crearCodigo(id, codigo) {
          red('crearCodigo')
          const p = paseo(id)
          if (!p || p.familia_id !== yo()) throw prohibido()
          if (!codigos.has(id)) codigos.set(id, { codigo, fallos: 0 })
        },
        async cambiarPaseo(id: string, cambios: CambiosDePaseo, esperado?: EstadoPaseo) {
          red('cambiarPaseo')
          const me = yo()
          const p = paseo(id)
          if (!p || !visible(me, p)) return 0
          if (esperado && p.estado !== esperado) return 0
          const equipo = rolDe(me) === 'equipo'
          if (cambios.estado && cambios.estado !== p.estado) {
            const t = TRANSICIONES.find((x) => x.de.includes(p.estado as EstadoPaseo) && x.a === cambios.estado)
            if (!t) throw noExiste(String(p.estado), cambios.estado)
            const esFamilia = me === p.familia_id
            const esPaseador = me === p.paseador_id
            const ok = equipo || (esFamilia && t.quien.some((q) => q === 'dueno' || q === 'sistema')) || (esPaseador && t.quien.some((q) => q === 'paseador' || q === 'sistema'))
            if (!ok) throw prohibido('A esta persona no le toca ese cambio de estado.')
            if (!equipo && p.estado === 'entregado' && cambios.estado === 'cerrado' && !eventos.some((e) => e.paseo_id === id && e.accion === 'confirmar_entrega')) {
              throw prohibido('Falta que el dueño confirme la entrega.')
            }
            const actor = esFamilia && t.quien.includes('dueno') ? 'dueno' : esPaseador && t.quien.includes('paseador') ? 'paseador' : 'sistema'
            anotar(id, t.accion, String(p.estado), cambios.estado, actor)
            p.estado = cambios.estado
            if (cambios.estado === 'aceptado') p.aceptado_en = new Date().toISOString()
            const delPago = pagos.get(id)
            if (delPago) {
              delPago.paseo_estado = cambios.estado
              if (delPago.hecho_en == null && (cambios.estado === 'entregado' || cambios.estado === 'cerrado')) delPago.hecho_en = new Date().toISOString()
            }
          }
          if (cambios.reporte !== undefined) p.reporte = cambios.reporte
          if (cambios.cerrado_paseador !== undefined) p.cerrado_paseador = cambios.cerrado_paseador
          return 1
        },
        async crearEvento(f: FilaEventoNueva) {
          red('crearEvento')
          const me = yo()
          const p = paseo(f.paseo_id)
          if (!p) throw prohibido()
          const okConfirmar = f.accion === 'confirmar_entrega' && f.quien === 'dueno' && p.familia_id === me
          const okSistema = (f.accion === 'avisar' || f.accion === 'recordar') && f.quien === 'sistema' && participa(me, p)
          if (!okConfirmar && !okSistema) throw prohibido()
          anotar(f.paseo_id, f.accion, f.de, f.a, f.quien, { en: f.en, nota: f.nota ?? null, demo: f.demo === true, aviso: f.aviso ?? null })
        },
        async crearBitacora(f: FilaBitacoraNueva) {
          red('crearBitacora')
          const p = paseo(f.paseo_id)
          if (!p || !participa(yo(), p)) throw prohibido()
          if (bitacora.some((b) => b.id === f.id)) return
          bitacora.push({ ...f })
        },
        async crearMensaje(f: FilaMensajeNueva) {
          red('crearMensaje')
          const me = yo()
          const p = paseo(f.paseo_id)
          // Como la regla de la base: la familia escribe como «owner» en SU paseo y la paseadora como «walker» en el suyo.
          const ok = !!p && ((f.de === 'owner' && p.familia_id === me) || (f.de === 'walker' && p.paseador_id === me))
          if (!ok) throw prohibido()
          if (f.texto.trim() === '') throw new ErrorDeBase('violates check constraint', 400, '23514')
          // El mismo `id` ya estaba (un reintento): no se duplica.
          if (mensajes.some((m) => m.id === f.id)) return
          mensajes.push({ ...f, imagen_ruta: null, en: new Date().toISOString() })
        },
        async verificarCodigo(id, codigo) {
          red('verificarCodigo')
          if (!uid) return false
          const p = paseo(id)
          const c = codigos.get(id)
          if (!p || p.paseador_id !== uid || !['aceptado', 'en_camino', 'en_paseo', 'entregado'].includes(String(p.estado)) || !c || c.fallos >= 5) return false
          if (c.codigo === codigo) {
            c.fallos = 0
            return true
          }
          c.fallos += 1
          return false
        },

        async listarPagos(limite) {
          red('listarPagos')
          const me = yo()
          return [...pagos.values()]
            .filter((p) => rolDe(me) === 'equipo' || p.familia_id === me || p.paseador_id === me)
            .sort((a, b) => String(b.creado_en).localeCompare(String(a.creado_en)))
            .slice(0, limite)
            .map((p) => ({ ...p }))
        },
        async moverPago(paseoId, accion, datos = {}) {
          red('moverPago')
          const me = yo()
          // Como `public.mover_pago`: la regla de quién, el estado del pago, el estado del paseo y la nota.
          const t = TRANSICIONES_PAGO.find((x) => x.accion === accion)
          if (!t) throw new ErrorDeBase(`Acción desconocida: ${accion}.`, 400, '22023')
          const pago = pagos.get(paseoId)
          if (!pago) throw new ErrorDeBase('No existe ese pago.', 400, 'P0002')
          if (t.quien === 'equipo' && rolDe(me) !== 'equipo') throw prohibido('Solo el equipo puede hacer esto.')
          if (t.quien === 'paseador' && me !== pago.paseador_id) throw prohibido('Solo el paseador de este paseo puede hacer esto.')
          if (!t.de.some((e) => e === pago.estado)) throw new ErrorDeBase(`No se puede «${accion}» con el pago «${String(pago.estado)}».`, 400, '22023')
          if (t.paseo && !t.paseo.some((e) => e === pago.paseo_estado)) throw new ErrorDeBase(`No se puede «${accion}» con el paseo «${String(pago.paseo_estado)}».`, 400, '22023')
          const nota = (datos.nota ?? '').trim()
          if (t.pideNota && nota.length < 3) throw new ErrorDeBase('La nota es obligatoria.', 400, '22023')
          const ahora = new Date().toISOString()
          pago.estado = t.a
          if (accion === 'ver_pago') {
            pago.visto_en = ahora
            pago.hora_pago = (datos.hora ?? '').trim().slice(0, 20) || null
            pago.nota = null
            pago.no_encontrado_en = null
          }
          if (accion === 'no_encontrado') {
            pago.no_encontrado_en = ahora
            pago.nota = nota
          }
          if (accion === 'pagar_al_paseador') pago.pagado_paseador_en = ahora
          return { ...pago }
        },
        async listarCobros(ids) {
          red('listarCobros')
          const me = yo()
          return ids
            .filter((id) => cobros.has(id) && (rolDe(me) === 'equipo' || id === me))
            .map((id) => ({ ...cobros.get(id)! }))
        },
        async guardarCobro(f: FilaCobroNueva) {
          red('guardarCobro')
          const me = yo()
          if (f.paseador_id !== me || rolDe(me) !== 'paseador') throw prohibido()
          if (f.metodo !== 'yape' && f.metodo !== 'plin') throw new ErrorDeBase('violates check constraint', 400, '23514')
          cobros.set(f.paseador_id, { ...f })
        },

        async listarFotos(ids, diaHoy) {
          red('listarFotos')
          const me = yo()
          return [...fotos.values()]
            .filter((f) => veLaFoto(me, f) && ((f.paseo_id != null && ids.includes(String(f.paseo_id))) || (f.tipo === 'hoy' && f.dia === diaHoy)))
            .sort((a, b) => String(a.en).localeCompare(String(b.en)))
            .map((f) => ({ ...f }))
        },
        async subirFoto(ruta, bytes, tipo) {
          red('subirFoto')
          const me = yo()
          // Como la API del almacén: primero el bucket (tamaño y tipo), después las reglas de fila, al final «ya estaba».
          if (bytes.byteLength > LIMITE_BYTES_ALMACEN) throw new ErrorDeBase('The object exceeded the maximum allowed size', 413, '413')
          if (!TIPOS_DEL_ALMACEN.includes(tipo)) throw new ErrorDeBase(`mime type ${tipo} is not supported`, 415, '415')
          if (!puedeSubirImagen(me, ruta)) throw new ErrorDeBase('new row violates row-level security policy', 403, '403')
          if (imagenes.has(ruta)) return
          imagenes.set(ruta, { bytes: new Uint8Array(bytes.slice(0)), tipo })
        },
        async guardarFoto(f: FilaFotoNueva) {
          red('guardarFoto')
          const me = yo()
          const delPaseo = f.tipo === 'paseo' && paseo(String(f.paseo_id))?.paseador_id === me
          if (f.paseador_id !== me || rolDe(me) !== 'paseador' || !(delPaseo || f.tipo === 'hoy')) throw prohibido()
          if (f.tipo === 'paseo' ? f.paseo_id == null : f.paseo_id != null || f.dia == null) throw new ErrorDeBase('violates check constraint', 400, '23514')
          // `fotos_ruta_coincide`: la ruta de la imagen es la de SU paseo (o de SU carpeta de foto de hoy).
          if (!f.ruta.startsWith(f.tipo === 'paseo' ? `paseo/${f.paseo_id}/` : `hoy/${f.paseador_id}/`)) throw new ErrorDeBase('violates check constraint "fotos_ruta_coincide"', 400, '23514')
          if (fotos.has(f.id)) return
          if (f.tipo === 'hoy' && [...fotos.values()].some((x) => x.tipo === 'hoy' && x.paseador_id === me && x.dia === f.dia)) throw new ErrorDeBase('duplicate key value violates unique constraint', 409, '23505')
          if ([...fotos.values()].some((x) => x.ruta === f.ruta)) throw new ErrorDeBase('duplicate key value violates unique constraint', 409, '23505')
          fotos.set(f.id, { ...f, vence_en: new Date(Date.now() + 7 * 24 * 3600_000).toISOString() })
        },
        async borrarFilaFoto(id) {
          red('borrarFilaFoto')
          const me = yo()
          const f = fotos.get(id)
          // `fotos_borrar_hoy`: solo la foto de hoy propia (si no, la base borra 0 filas sin error).
          if (f && f.tipo === 'hoy' && f.paseador_id === me) fotos.delete(id)
        },
        async quitarImagenes(rutas) {
          red('quitarImagenes')
          const me = yo()
          for (const r of rutas) {
            if (!puedeBorrarImagen(me, r)) continue
            imagenes.delete(r)
            for (const [e, v] of enlaces) if (v.ruta === r) enlaces.delete(e)
          }
        },
        async listarPuntos(ids) {
          red('listarPuntos')
          const me = yo()
          return [...puntos.values()]
            .filter((x) => ids.includes(String(x.paseo_id)) && visible(me, paseo(String(x.paseo_id)) ?? {}))
            .sort((a, b) => String(a.en).localeCompare(String(b.en)))
            .map((x) => ({ ...x }))
        },
        async crearPunto(f: FilaPuntoNueva) {
          red('crearPunto')
          const me = yo()
          // `puntos_crear`: solo el paseador de ese paseo anota el inicio y el fin (la familia y el equipo solo leen).
          if (paseo(f.paseo_id)?.paseador_id !== me) throw prohibido()
          if (f.tipo !== 'inicio' && f.tipo !== 'fin') throw new ErrorDeBase('violates check constraint', 400, '23514')
          if (f.sin_ubicacion !== null && !['negada', 'omitida', 'no_disponible', 'sin_lectura'].includes(f.sin_ubicacion)) throw new ErrorDeBase('violates check constraint', 400, '23514')
          if (puntos.has(f.id)) return
          puntos.set(f.id, { ...f })
        },
        async listarCasos() {
          red('listarCasos')
          const me = yo()
          // `casos_ver`: los de su paseo; el equipo, todos.
          return [...casos.values()]
            .filter((x) => visible(me, paseo(String(x.paseo_id)) ?? {}))
            .sort((a, b) => String(a.abierto_en).localeCompare(String(b.abierto_en)))
            .map((x) => ({ ...x }))
        },
        async crearCaso(f: FilaCasoNueva) {
          red('crearCaso')
          const me = yo()
          const p = paseo(f.paseo_id)
          // `casos_crear`: quien participa del paseo (sin resolución) o el equipo.
          if (!p || !(rolDe(me) === 'equipo' || (participa(me, p) && f.resolucion === null && f.resuelto_en === null))) throw prohibido()
          if (casos.has(f.id)) return
          casos.set(f.id, { ...f })
        },
        async cambiarCaso(id: string, cambios: CambioDeCaso) {
          red('cambiarCaso')
          const me = yo()
          const fila = casos.get(id)
          const p = fila ? paseo(String(fila.paseo_id)) : undefined
          const equipo = rolDe(me) === 'equipo'
          // `casos_cambiar`: quien participa solo mientras no esté resuelto; el equipo siempre.
          if (!fila || !p || !(equipo || (participa(me, p) && fila.resuelto_en === null))) return 0
          // `limitar_caso`: resolver lo hace el equipo.
          if (!equipo && ('resolucion' in cambios || 'resuelto_en' in cambios)) throw prohibido('Resolver un caso lo hace el equipo.')
          casos.set(id, { ...fila, ...cambios })
          return 1
        },
        async listarMisResenas(familiaId) {
          red('listarMisResenas')
          const me = yo()
          return [...resenas.values()]
            .filter((r) => r.familia_id === familiaId && veLaResena(me, r))
            .sort((a, b) => String(b.creado_en).localeCompare(String(a.creado_en)))
            .map((r) => ({ ...r }))
        },
        async resenasDePaseadores(ids, limite = 200) {
          red('resenasDePaseadores')
          const me = yo()
          return [...resenas.values()]
            .filter((r) => ids.includes(String(r.paseador_id)) && veLaResena(me, r))
            .sort((a, b) => String(b.creado_en).localeCompare(String(a.creado_en)))
            .slice(0, limite)
            .map((r) => ({ ...r }))
        },
        async crearResena(f: FilaResenaNueva) {
          red('crearResena')
          const me = yo()
          const p = paseo(f.paseo_id)
          // `resenas_crear`: la familia de ese paseo, de su paseador, con el paseo ya cerrado.
          if (f.familia_id !== me || rolDe(me) !== 'familia' || !p || p.familia_id !== me || p.paseador_id !== f.paseador_id || p.estado !== 'cerrado') throw prohibido()
          // Los límites de la tabla (`check`).
          if (!(f.estrellas >= 1 && f.estrellas <= 5) || f.texto.length > 280 || f.etiquetas.length > 8) throw new ErrorDeBase('violates check constraint', 400, '23514')
          // Una sola por paseo: la llave es el paseo.
          if (resenas.has(f.paseo_id)) return
          // El nombre y el distrito los pone la base (`privado.resena_nueva`), no la app.
          resenas.set(f.paseo_id, { ...f, texto: f.texto.trim(), autor: personas.get(me)?.nombre ?? '', distrito: 'San Isidro', creado_en: new Date().toISOString() })
        },
        async enlaceDeFoto(ruta, segundos) {
          red('enlaceDeFoto')
          const me = yo()
          if (!imagenes.has(ruta) || !veLaImagen(me, ruta)) throw new ErrorDeBase('Object not found', 400, '404')
          const enlace = `memoria://fotos/${ruta}?token=e${++n}`
          enlaces.set(enlace, { ruta, vence: Date.now() + segundos * 1000 })
          return enlace
        },
      }
    },

    async persona(p) {
      personas.set(p.id, p)
    },
    async paseadorAprobado(p) {
      personas.set(p.id, { id: p.id, rol: 'paseador', nombre: p.nombre })
      aprobados.set(p.id, p)
      const c = p.cobro ?? { metodo: 'yape' as const, celular: '987654321', titular: `${p.nombre} ${p.apellido ?? ''}`.trim() }
      cobros.set(p.id, { paseador_id: p.id, metodo: c.metodo, celular: c.celular, titular: c.titular })
    },
    async contar(tabla) {
      switch (tabla) {
        case 'paseos':
          return paseos.length
        case 'paseo_eventos':
          return eventos.length
        case 'bitacora':
          return bitacora.length
        case 'mensajes':
          return mensajes.length
        case 'codigos_recojo':
          return codigos.size
        case 'casas':
          return casas.size
        case 'perros':
          return perros.size
        case 'pagos':
          return pagos.size
        case 'cobros_paseador':
          return cobros.size
        case 'fotos':
          return fotos.size
        case 'puntos_control':
          return puntos.size
        case 'casos':
          return casos.size
        case 'resenas':
          return resenas.size
        default:
          // Las postulaciones solo las simula el servidor de HTTP sobre PGlite (el de verdad de las reglas).
          return 0
      }
    },
    async volcar(tabla) {
      const por: Record<string, Array<Record<string, unknown>>> = {
        paseos: paseos,
        paseo_eventos: eventos,
        bitacora: bitacora,
        mensajes: mensajes,
        fotos: [...fotos.values()],
        puntos_control: [...puntos.values()],
        pagos: [...pagos.values()],
        casos: [...casos.values()],
        resenas: [...resenas.values()],
      }
      return (por[tabla] ?? []).map((f) => ({ ...f }))
    },
    async imagenes() {
      return imagenes.size
    },
    async hayImagen(ruta) {
      return imagenes.has(ruta)
    },
    async leerEnlace(enlace) {
      const e = enlaces.get(enlace)
      const im = e && Date.now() <= e.vence ? imagenes.get(e.ruta) : undefined
      return im ? { bytes: im.bytes, tipo: im.tipo } : null
    },
    async vencerEnlaces() {
      enlaces.forEach((e) => (e.vence = 0))
    },
    async pagoDe(id) {
      const p = pagos.get(id)
      return p ? { ...p } : null
    },
    async estadoDe(id) {
      const p = paseo(id)
      return p ? String(p.estado) : null
    },
    async envejecer(id, minutos) {
      const p = paseo(id)
      if (p) p.creado_en = new Date(Date.now() - minutos * 60_000).toISOString()
    },
    async cerrar() {
      /* nada */
    },
  }
  return servidor
}
