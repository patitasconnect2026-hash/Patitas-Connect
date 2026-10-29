'use client'

import { useState } from 'react'
import { Banknote, Inbox } from 'lucide-react'
import { TEXTO_PAGOS_ADMIN as T } from '@/lib/adminTextos'
import { NOMBRE_CORTO, textoComision } from '@/lib/config'
import { useAbrirCaso, useAccionesPago, useCobrosDeLaBase, useEstadoServidor, usePagos, usePagosEnCola, usePaseoActivo, useSincronizarPago } from '@/lib/datos'
import { casoDePago } from '@/lib/casos'
import { esPaseadorDeEjemplo } from '@/lib/ejemplos'
import { noEncontrados, porPagarAlPaseador, sinPagar, type AccionPago, type Pago, type ResultadoPago } from '@/lib/pagos'
import { textoDesglose } from '@/lib/pagosTextos'
import { celularDeCobro, cobroRegistrado, type CobroPaseador, type WalkerApplication } from '@/lib/walkerStore'
import { TEXTO_PAGO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { cn, soles } from '@/lib/utils'
import { BotonConfirmable } from '../ui/BotonConfirmable'
import { EtiquetaEjemplo } from '../ui/EtiquetaEjemplo'
import { VerMas } from '../ui/VerMas'

function hora(at: number | undefined) {
  return at ? new Date(at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

type Cuenta = { estado: 'demo' | 'falta' } | { estado: 'ok'; cobro: CobroPaseador }

/**
 * Dónde cobra el paseador de un pago: de ejemplo (demostración), con cuenta registrada o sin ella. Con servidor sale de la
 * base (`cobros`: solo el equipo recibe el de cada paseador); sin servidor, de la postulación de este navegador.
 */
function cuentaDelPaseador(pago: Pago, postulacion: WalkerApplication | null, cobros: Record<string, CobroPaseador>): Cuenta {
  if (esPaseadorDeEjemplo(pago.walkerId)) return { estado: 'demo' }
  const delServidor = cobros[pago.walkerId]
  if (delServidor && cobroRegistrado(delServidor)) return { estado: 'ok', cobro: delServidor }
  // La postulación de este navegador es la del paseador de este paseo si su código coincide con el id del paseador.
  const esElDeAqui = !!postulacion && pago.walkerId === `nuevo-${postulacion.code}`
  return esElDeAqui && !!postulacion && cobroRegistrado(postulacion.cobro) ? { estado: 'ok', cobro: postulacion.cobro } : { estado: 'falta' }
}

/** A dónde se le paga al paseador, SOLO para el equipo: el dueño nunca ve este número. */
function CobroDelPaseador({ cuenta }: { cuenta: Cuenta }) {
  if (cuenta.estado === 'demo') return <p className="text-[14px] font-semibold text-ink-soft">{T.sinCuentaDemo}</p>
  if (cuenta.estado !== 'ok') {
    return <p className="rounded-xl bg-amber-50 px-3 py-2 text-[14px] font-semibold text-amber-900">{T.faltaCobroPaseador}</p>
  }
  const c = cuenta.cobro
  return (
    <p className="rounded-xl bg-sand px-3 py-2 text-[14px] text-ink">
      <b>{c.metodo === 'plin' ? 'Plin' : 'Yape'}</b> · <span className="tabular-nums">{celularDeCobro(c)}</span> · {c.titular}
    </p>
  )
}

function FilaPago({ p, children, cuenta, conCobro }: { p: Pago; children: React.ReactNode; cuenta: Cuenta; conCobro?: boolean }) {
  return (
    <li className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[20px] font-bold leading-tight text-ink">
        {p.perro} · {p.paseador}
        {esPaseadorDeEjemplo(p.walkerId) && <EtiquetaEjemplo />}
      </p>
      <p className="text-[14px] text-ink-soft">
        Dueño {p.dueno} · {p.cuando}
      </p>
      {p.demo && <p className="mt-1 text-[14px] font-semibold text-ink-soft">{T.demostracion}</p>}
      <p className="mt-2 text-[14px] leading-snug text-ink">
        <b>{T.paga}</b> <span className="whitespace-nowrap">{soles(p.monto)}</span> · <b>{T.seQueda}</b> <span className="whitespace-nowrap">{soles(p.comision)}</span> · <b>{T.recibe}</b>{' '}
        <span className="whitespace-nowrap">{soles(p.neto)}</span>
      </p>
      {conCobro && <div className="mt-2"><CobroDelPaseador cuenta={cuenta} /></div>}
      {children}
    </li>
  )
}

/**
 * Pagos de /admin con sus datos del libro de pagos. Lee y escribe por `lib/datos` (nada de localStorage aquí).
 */
export function ColaDePagos({ postulacion, mostrarEjemplos = true }: { postulacion: WalkerApplication | null; mostrarEjemplos?: boolean }) {
  const [pagos] = usePagos()
  const accion = useAccionesPago()
  const abrirCaso = useAbrirCaso()
  // Con servidor: dónde cobra cada paseador (la base se lo entrega solo al equipo) y qué acciones esperan a la base.
  const cobros = useCobrosDeLaBase()
  const enCola = usePagosEnCola()
  const { conexion } = useEstadoServidor()
  // Mantiene al día cómo va el paseo en el pago (si hoy no hay ninguna app abierta, igual se entera).
  const [job] = usePaseoActivo()
  useSincronizarPago(job)
  return (
    <PanelDePagos
      pagos={pagos}
      postulacion={postulacion}
      cobros={cobros}
      enCola={enCola.map((e) => e.id)}
      sinConexion={conexion === 'sin_conexion'}
      mostrarEjemplos={mostrarEjemplos}
      onAccion={async (id, a, datos) => {
        const r = await accion(id, a, 'equipo', datos)
        // «No lo encuentro» abre un caso en la cola de reportes, con la nota del equipo. El paseo no se toca.
        if (r.ok && a === 'no_encontrado') {
          abrirCaso({ ...casoDePago(r.pago, Date.now()), reporte: { quien: 'dueno', motivo: 'pago', texto: `El equipo no encontró el pago. ${datos.nota ?? ''}`.trim(), at: Date.now() } })
        }
        return r
      }}
    />
  )
}

/**
 * Pagos de /admin, AL FINAL del paseo: lo que toca pagarle al paseador (el paseador ya vio el pago), lo que el equipo no
 * encontró y las familias que todavía no pagaron. Todo lo hace el equipo a mano: la app no mueve dinero. Los montos
 * salen del pago (que copió CONFIG al reservar). Mientras el equipo no confirme el pago en SU cuenta, no se le paga al paseador.
 */
export function PanelDePagos({
  pagos,
  postulacion,
  cobros = {},
  enCola = [],
  sinConexion = false,
  mostrarEjemplos = true,
  onAccion,
}: {
  pagos: Pago[]
  postulacion: WalkerApplication | null
  /** Con servidor: dónde cobra cada paseador, por id (lo entrega la base solo al equipo). */
  cobros?: Record<string, CobroPaseador>
  /** Pagos con una acción que espera la respuesta de la base (con servidor). */
  enCola?: readonly string[]
  /** Sin conexión con el servidor: lo que esperan las acciones NO está marcado todavía. */
  sinConexion?: boolean
  mostrarEjemplos?: boolean
  /** Con servidor espera a la base: recién cuando contesta que sí, el pago cambia. */
  onAccion: (id: string, accion: AccionPago, datos: { nota?: string }) => ResultadoPago | Promise<ResultadoPago>
}) {
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState<Record<string, boolean>>({})
  const esperando = (id: string) => enviando[id] === true || enCola.includes(id)
  const cuentaDe = (p: Pago) => cuentaDelPaseador(p, postulacion, cobros)

  const visible = (p: Pago) => mostrarEjemplos || !esPaseadorDeEjemplo(p.walkerId)
  const pagar = porPagarAlPaseador(pagos).filter(visible)
  const perdidos = noEncontrados(pagos).filter(visible)
  const faltan = sinPagar(pagos).filter(visible)
  const hechos = pagos.filter((p) => p.estado === 'pagado_paseador' && visible(p))

  const ejecutar = async (id: string, a: 'no_encontrado' | 'pagar_al_paseador', conNota = false) => {
    // Un segundo toque mientras la base contesta no manda otra vez la acción.
    if (enviando[id]) return
    setEnviando((e) => ({ ...e, [id]: true }))
    setErrores((e) => ({ ...e, [id]: '' }))
    const r = await onAccion(id, a, conNota ? { nota: notas[id] ?? '' } : {})
    setEnviando((e) => ({ ...e, [id]: false }))
    setErrores((e) => ({ ...e, [id]: r.ok ? '' : r.motivo }))
  }

  /** Mientras la base no contesta no se marca nada: se dice, y sin internet se dice que sigue sin marcarse. */
  const estadoEnvio = (id: string) =>
    esperando(id) && (
      <p role="status" className="mt-2 text-[14px] font-bold text-ink">
        {sinConexion ? TEXTO_PAGO_SERVIDOR.sinConexionEquipo : TEXTO_PAGO_SERVIDOR.enviando}
      </p>
    )

  const campoNota = (id: string) => (
    <label className="mt-3 block">
      <span className="eyebrow mb-1 block text-ink-soft">{T.nota}</span>
      <textarea
        value={notas[id] ?? ''}
        onChange={(e) => {
          setNotas((n) => ({ ...n, [id]: e.target.value }))
          setErrores((er) => ({ ...er, [id]: '' }))
        }}
        rows={2}
        className="w-full resize-none rounded-2xl border border-ink/15 bg-paper p-3 text-[16px] outline-hidden focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
      />
      {errores[id] && (
        <span role="alert" className="mt-1 block text-[14px] font-bold text-red-700">
          {errores[id]}
        </span>
      )}
    </label>
  )

  const boton = 'min-h-11 rounded-full px-4 py-2 text-[14px] font-extrabold active:scale-95'
  const vacio = (texto: string) => (
    <p className="mt-2 flex items-center gap-2 rounded-2xl bg-sand p-3.5 text-[14px] font-semibold text-ink-soft">
      <Inbox size={16} className="shrink-0" /> {texto}
    </p>
  )
  const contador = (n: number) => (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[14px] font-extrabold', n ? 'bg-amber-100 text-amber-900' : 'bg-sand text-ink-soft')}>{n}</span>
  )

  /** El botón de pagar (pide la cuenta del paseador y un segundo toque). */
  const botonPagar = (p: Pago, etiqueta: string) =>
    cuentaDe(p).estado === 'falta' ? (
      <>
        <button type="button" disabled className={cn(boton, 'bg-ink/15 text-ink-soft')}>
          {etiqueta} · <span className="whitespace-nowrap">{soles(p.neto)}</span>
        </button>
        <p className="mt-1.5 text-[14px] font-semibold text-amber-900">{T.noSePuedePagar}</p>
      </>
    ) : (
      <BotonConfirmable
        onConfirm={() => void ejecutar(p.id, 'pagar_al_paseador')}
        confirmar={T.confirmar}
        className={boton}
        reposoClassName="bg-ink text-white"
        armadoClassName="bg-brand-700 text-white"
      >
        {etiqueta} · <span className="whitespace-nowrap">{soles(p.neto)}</span>
      </BotonConfirmable>
    )

  return (
    <section className="mt-12" aria-labelledby="pagos">
      <h2 id="pagos" className="flex items-center gap-2 font-display text-[28px] font-bold leading-tight">
        <Banknote size={24} className="text-brand-700" /> {T.titulo}
      </h2>
      <p className="mt-1 text-[14px] leading-snug text-ink-soft">{T.apoyo}</p>
      <p className="mt-1 text-[14px] leading-snug text-ink-soft">{textoComision()}</p>
      <VerMas abrir={T.masAbrir}>{T.mas}</VerMas>

      {/* Por pagar al paseador */}
      <h3 className="mt-5 flex items-center gap-2 font-display text-[22px] font-bold leading-tight">
        {T.pagarTitulo}
        {contador(pagar.length)}
      </h3>
      {pagar.length === 0 ? (
        vacio(T.pagarVacio)
      ) : (
        <ul className="mt-2 space-y-3">
          {pagar.map((p) => (
            <FilaPago key={p.id} p={p} cuenta={cuentaDe(p)} conCobro>
              <p className="mt-2 text-[14px] text-ink-soft">
                El paseador vio el pago · {hora(p.vistoAt)}
                {p.horaPago ? ` · hora anotada: ${p.horaPago}` : ''}
              </p>
              <p className="mt-1 text-[14px] font-semibold text-ink">{T.mirarCuenta}</p>
              {campoNota(p.id)}
              <p className="mt-1 text-[12px] text-ink-soft">{T.notaNoEncontrado}</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {botonPagar(p, T.marcarPagado)}
                <button type="button" disabled={esperando(p.id)} onClick={() => void ejecutar(p.id, 'no_encontrado', true)} className={cn(boton, 'border-2 border-amber-400 bg-transparent text-amber-900 disabled:opacity-50')}>
                  {T.noLoEncuentro}
                </button>
              </div>
              {estadoEnvio(p.id)}
            </FilaPago>
          ))}
        </ul>
      )}

      {/* No encontrados */}
      <h3 className="mt-7 flex items-center gap-2 font-display text-[22px] font-bold leading-tight">
        {T.noEncontradosTitulo}
        {contador(perdidos.length)}
      </h3>
      {perdidos.length === 0 ? (
        vacio(T.noEncontradosVacio)
      ) : (
        <ul className="mt-2 space-y-3">
          {perdidos.map((p) => (
            <FilaPago key={p.id} p={p} cuenta={cuentaDe(p)} conCobro>
              <p className="mt-2 text-[14px] text-ink-soft">
                No lo encontraste · {hora(p.noEncontradoAt)}
                {p.nota ? ` · ${p.nota}` : ''}
              </p>
              {errores[p.id] && (
                <p role="alert" className="mt-1 text-[14px] font-bold text-red-700">
                  {errores[p.id]}
                </p>
              )}
              <div className="mt-3">{botonPagar(p, T.yaLoEncontre)}</div>
              {estadoEnvio(p.id)}
            </FilaPago>
          ))}
        </ul>
      )}

      {/* Falta que la familia pague */}
      <h3 className="mt-7 flex items-center gap-2 font-display text-[22px] font-bold leading-tight">
        {T.sinPagarTitulo}
        {contador(faltan.length)}
      </h3>
      {faltan.length === 0 ? (
        vacio(T.sinPagarVacio)
      ) : (
        <ul className="mt-2 space-y-3">
          {faltan.map((p) => (
            <FilaPago key={p.id} p={p} cuenta={cuentaDe(p)}>
              <p className="mt-2 text-[14px] text-ink-soft">El paseo terminó · {hora(p.hechoAt)}. {p.dueno} aún no mostró el pago.</p>
            </FilaPago>
          ))}
        </ul>
      )}

      {hechos.length > 0 && (
        <details className="mt-5">
          <summary className="min-h-11 cursor-pointer text-[14px] font-extrabold text-brand-800">
            {T.historial} ({hechos.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {hechos.map((p) => (
              <li key={p.id} className="rounded-2xl bg-sand p-3 text-[14px] text-ink">
                <b>
                  {p.perro} · {p.paseador}
                </b>{' '}
                · pagado al paseador {soles(p.neto)} · {hora(p.pagadoPaseadorAt)}
                <span className="block text-[12px] text-ink-soft">{textoDesglose(p)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-3 text-[12px] text-ink-soft">{NOMBRE_CORTO} cobra y paga a mano: esta lista es el registro.</p>
    </section>
  )
}
