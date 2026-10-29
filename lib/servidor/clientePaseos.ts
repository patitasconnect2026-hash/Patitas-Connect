/**
 * `ClientePaseos` armado sobre el cliente de Supabase. Todo va con la sesión de la persona (clave pública): las reglas
 * de acceso de la base deciden qué ve y qué cambia. No hay ninguna llamada con la clave de servicio.
 *
 * Este archivo solo traduce: no decide nada del negocio. La librería de Supabase llega ya creada (`cliente.ts`) y solo
 * se importan sus TIPOS aquí, así que en modo local no se descarga nada.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EstadoPaseo } from '../paseo'
import type { AccionPago } from '../pagos'
import type { CambioDeCaso, FilaCasoNueva } from './casosMapeo'
import type { FilaResenaNueva } from './resenasMapeo'
import {
  ErrorDeBase,
  type CambiosDePaseo,
  type ClientePaseos,
  type FilaBitacoraNueva,
  type FilaCasaNueva,
  type FilaCobroNueva,
  type FilaCruda,
  type FilaEventoNueva,
  type FilaFotoNueva,
  type FilaMensajeNueva,
  type FilaPuntoNueva,
  type FilaPaseoNueva,
  type FilaPerroNueva,
  type RolServidor,
  type SesionDePaseos,
} from './paseosTipos'

/** Cada cuánto se vuelve a leer el rol en la base (si no cambia la sesión). */
const VIGENCIA_DEL_ROL_MS = 60_000
/** Violación de unicidad: ya estaba. Para «crear» no es un error (reintentar no debe fallar). */
const YA_ESTABA = '23505'
// Las lecturas se piden con `.retry(false)`: la librería reintenta sola los GET con espera creciente (varios segundos) y
// aquí quien reintenta es el adaptador (cada pocos segundos, y avisa «sin conexión» enseguida).

export type Respuesta = { data: unknown; error: { message: string; code?: string } | null; status: number }

/** Devuelve los datos o lanza `ErrorDeBase`. `status` 0 = no hubo red. */
export function datos(r: Respuesta): unknown {
  if (r.error) throw new ErrorDeBase(r.error.message, r.status, r.error.code)
  return r.data
}

export function filas(r: Respuesta): FilaCruda[] {
  const d = datos(r)
  return Array.isArray(d) ? (d as FilaCruda[]) : []
}

/** Un error del almacén (storage-js) como el error de la base: `status` 0 = no hubo red. */
function errorDeAlmacen(e: { message: string; status?: number; statusCode?: string }): ErrorDeBase {
  const status = typeof e.status === 'number' ? e.status : 0
  return new ErrorDeBase(e.message, status, e.statusCode)
}
const yaEstabaEnElAlmacen = (e: { message: string; status?: number; statusCode?: string }): boolean => e.statusCode === '409' || e.status === 409 || /already exists|duplicate/i.test(e.message)

function esRol(v: unknown): v is RolServidor {
  return v === 'familia' || v === 'paseador' || v === 'equipo'
}

export function envolverClientePaseos(c: SupabaseClient, ahora: () => number = Date.now): ClientePaseos {
  let rol: { id: string; rol: RolServidor; en: number } | null = null

  const sinDuplicado = async (q: PromiseLike<Respuesta>): Promise<void> => {
    const r = await q
    if (r.error && r.error.code === YA_ESTABA) return
    datos(r)
  }

  return {
    async sesion(): Promise<SesionDePaseos | null> {
      const s = await c.auth.getSession()
      if (s.error) throw new ErrorDeBase(s.error.message, s.error.status, s.error.code)
      const usuario = s.data.session?.user
      if (!usuario) {
        rol = null
        return null
      }
      if (rol && rol.id === usuario.id && ahora() - rol.en < VIGENCIA_DEL_ROL_MS) return { id: rol.id, rol: rol.rol }
      // El rol sale de la base con la propia sesión; lo que diga el navegador no cuenta.
      const r = (await c.from('perfiles').select('rol').eq('id', usuario.id).retry(false).maybeSingle()) as Respuesta
      const d = datos(r)
      const valor = d && typeof d === 'object' ? (d as { rol?: unknown }).rol : null
      if (!esRol(valor)) {
        rol = null
        return null
      }
      rol = { id: usuario.id, rol: valor, en: ahora() }
      return { id: usuario.id, rol: valor }
    },

    alCambiarSesion(aviso) {
      const { data } = c.auth.onAuthStateChange(() => {
        rol = null
        aviso()
      })
      return () => data.subscription.unsubscribe()
    },

    async listarPaseos(limite) {
      return filas((await c.from('paseos').select('*').order('creado_en', { ascending: false }).limit(limite).retry(false)) as Respuesta)
    },
    async listarEventos(paseos) {
      if (paseos.length === 0) return []
      return filas((await c.from('paseo_eventos').select('*').in('paseo_id', [...paseos]).order('id', { ascending: true }).retry(false)) as Respuesta)
    },
    async listarBitacora(paseos) {
      if (paseos.length === 0) return []
      return filas((await c.from('bitacora').select('*').in('paseo_id', [...paseos]).order('en', { ascending: true }).retry(false)) as Respuesta)
    },
    async listarCodigos(paseos) {
      if (paseos.length === 0) return []
      return filas((await c.from('codigos_recojo').select('paseo_id, codigo').in('paseo_id', [...paseos]).retry(false)) as Respuesta)
    },
    async listarMensajes(paseos, limite = 500) {
      if (paseos.length === 0) return []
      // Los más recientes (si hubiera muchísimos), entregados del más viejo al más nuevo.
      const r = filas((await c.from('mensajes').select('*').in('paseo_id', [...paseos]).order('en', { ascending: false }).limit(limite).retry(false)) as Respuesta)
      return r.reverse()
    },
    async listarCasas(familias) {
      if (familias.length === 0) return []
      return filas((await c.from('casas').select('*').in('familia_id', [...familias]).retry(false)) as Respuesta)
    },
    async listarPerros(ids) {
      if (ids.length === 0) return []
      return filas((await c.from('perros').select('*').in('id', [...ids]).retry(false)) as Respuesta)
    },
    async paseadoresPublicos(paseadorId) {
      const q = c.from('paseadores_publicos').select('*')
      return filas((await (paseadorId ? q.eq('paseador_id', paseadorId) : q).retry(false)) as Respuesta)
    },
    async miCobro(id) {
      const d = datos((await c.from('cobros_paseador').select('*').eq('paseador_id', id).retry(false).maybeSingle()) as Respuesta)
      return d && typeof d === 'object' ? (d as FilaCruda) : null
    },

    async guardarCasa(fila: FilaCasaNueva) {
      datos((await c.from('casas').upsert(fila, { onConflict: 'familia_id' })) as Respuesta)
    },
    async guardarPerro(fila: FilaPerroNueva) {
      datos((await c.from('perros').upsert(fila, { onConflict: 'id' })) as Respuesta)
    },
    async crearPaseo(fila: FilaPaseoNueva) {
      await sinDuplicado(c.from('paseos').insert(fila) as unknown as PromiseLike<Respuesta>)
    },
    async crearCodigo(paseo, codigo) {
      await sinDuplicado(c.from('codigos_recojo').insert({ paseo_id: paseo, codigo }) as unknown as PromiseLike<Respuesta>)
    },
    async cambiarPaseo(id: string, cambios: CambiosDePaseo, esperado?: EstadoPaseo) {
      let q = c.from('paseos').update(cambios).eq('id', id)
      if (esperado) q = q.eq('estado', esperado)
      return filas((await q.select('id')) as Respuesta).length
    },
    async crearEvento(fila: FilaEventoNueva) {
      datos((await c.from('paseo_eventos').insert(fila)) as Respuesta)
    },
    async crearBitacora(fila: FilaBitacoraNueva) {
      await sinDuplicado(c.from('bitacora').insert(fila) as unknown as PromiseLike<Respuesta>)
    },
    async crearMensaje(fila: FilaMensajeNueva) {
      // El mismo `id` es el mismo mensaje: un reintento que ya había llegado no lo duplica.
      await sinDuplicado(c.from('mensajes').insert(fila) as unknown as PromiseLike<Respuesta>)
    },
    async verificarCodigo(paseo, codigo) {
      const d = datos((await c.rpc('verificar_codigo_recojo', { p_paseo: paseo, p_codigo: codigo })) as Respuesta)
      return d === true
    },

    async listarPagos(limite) {
      return filas((await c.from('pagos').select('*').order('creado_en', { ascending: false }).limit(limite).retry(false)) as Respuesta)
    },
    async moverPago(paseo: string, accion: AccionPago, datosDelPago = {}) {
      // Todo pago se mueve por aquí: la base decide (quién, estado del pago y del paseo, nota). Sin reintento automático:
      // quien reintenta es la cola de la app, que sabe qué hacer si la respuesta se perdió.
      const d = datos((await c.rpc('mover_pago', { p_paseo: paseo, p_accion: accion, p_nota: datosDelPago.nota ?? null, p_hora: datosDelPago.hora ?? null })) as Respuesta)
      if (!d || typeof d !== 'object' || Array.isArray(d)) throw new ErrorDeBase('La base no devolvió el pago.', 502)
      return d as FilaCruda
    },
    async listarCobros(paseadores) {
      if (paseadores.length === 0) return []
      return filas((await c.from('cobros_paseador').select('*').in('paseador_id', [...paseadores]).retry(false)) as Respuesta)
    },
    async guardarCobro(fila: FilaCobroNueva) {
      datos((await c.from('cobros_paseador').upsert(fila, { onConflict: 'paseador_id' })) as Respuesta)
    },

    async listarFotos(paseos, diaHoy) {
      const [delPaseo, deHoy] = await Promise.all([
        paseos.length === 0 ? Promise.resolve([] as FilaCruda[]) : (async () => filas((await c.from('fotos').select('*').in('paseo_id', [...paseos]).order('en', { ascending: true }).retry(false)) as Respuesta))(),
        (async () => filas((await c.from('fotos').select('*').eq('tipo', 'hoy').eq('dia', diaHoy).retry(false)) as Respuesta))(),
      ])
      return [...delPaseo, ...deHoy]
    },
    async subirFoto(ruta, bytes, tipo) {
      // El almacén es privado y la ruta la piden las reglas (`paseo/<paseo>/…` o `hoy/<paseador>/…`). Sin reemplazar: un
      // archivo que ya estaba es un reintento de una subida que sí llegó.
      const r = await c.storage.from('fotos').upload(ruta, bytes, { contentType: tipo, upsert: false, cacheControl: '3600' })
      if (r.error && !yaEstabaEnElAlmacen(r.error)) throw errorDeAlmacen(r.error)
    },
    async guardarFoto(fila: FilaFotoNueva) {
      const r = (await c.from('fotos').insert(fila)) as Respuesta
      if (r.error && r.error.code === YA_ESTABA) {
        // Puede ser la misma foto (un reintento) o la regla de «una foto de hoy por día»: solo la primera se da por buena.
        const previa = (await c.from('fotos').select('id').eq('id', fila.id).retry(false).maybeSingle()) as Respuesta
        if (previa.data && !previa.error) return
      }
      datos(r)
    },
    async borrarFilaFoto(id) {
      datos((await c.from('fotos').delete().eq('id', id)) as Respuesta)
    },
    async quitarImagenes(rutas) {
      if (rutas.length === 0) return
      const r = await c.storage.from('fotos').remove([...rutas])
      if (r.error) throw errorDeAlmacen(r.error)
    },
    async listarPuntos(paseos) {
      if (paseos.length === 0) return []
      return filas((await c.from('puntos_control').select('*').in('paseo_id', [...paseos]).order('en', { ascending: true }).retry(false)) as Respuesta)
    },
    async crearPunto(fila: FilaPuntoNueva) {
      const r = (await c.from('puntos_control').insert(fila)) as Respuesta
      if (r.error && r.error.code === YA_ESTABA) {
        // El mismo punto (un reintento que sí había llegado) se da por bueno.
        const previo = (await c.from('puntos_control').select('id').eq('id', fila.id).retry(false).maybeSingle()) as Respuesta
        if (previo.data && !previo.error) return
      }
      datos(r)
    },
    async listarCasos() {
      return filas((await c.from('casos').select('*').order('abierto_en', { ascending: true }).retry(false)) as Respuesta)
    },
    async crearCaso(fila: FilaCasoNueva) {
      // El mismo `id` es el mismo caso: un reintento que ya había llegado no lo duplica.
      await sinDuplicado(c.from('casos').insert(fila) as unknown as PromiseLike<Respuesta>)
    },
    async cambiarCaso(id: string, cambios: CambioDeCaso) {
      return filas((await c.from('casos').update(cambios).eq('id', id).select('id')) as Respuesta).length
    },
    async listarMisResenas(familiaId: string) {
      return filas((await c.from('resenas').select('*').eq('familia_id', familiaId).order('creado_en', { ascending: false }).retry(false)) as Respuesta)
    },
    async resenasDePaseadores(paseadores, limite = 200) {
      if (paseadores.length === 0) return []
      return filas((await c.from('resenas').select('*').in('paseador_id', [...paseadores]).order('creado_en', { ascending: false }).limit(limite).retry(false)) as Respuesta)
    },
    async crearResena(fila: FilaResenaNueva) {
      // Una por paseo (el `paseo_id` es la llave): un reintento que ya había llegado no la duplica.
      await sinDuplicado(c.from('resenas').insert(fila) as unknown as PromiseLike<Respuesta>)
    },
    async enlaceDeFoto(ruta, segundos) {
      const r = await c.storage.from('fotos').createSignedUrl(ruta, segundos)
      if (r.error || !r.data?.signedUrl) throw errorDeAlmacen(r.error ?? { message: 'No hay enlace.' })
      return r.data.signedUrl
    },
  }
}
