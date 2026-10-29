'use client'

import { useState } from 'react'
import { Inbox, TriangleAlert } from 'lucide-react'
import { resolverJob } from '@/lib/bus'
import { abiertos, abrirCaso, casoDeReporte, etiquetaMotivo, resolverCaso, resueltos, type Caso, type Resolucion } from '@/lib/casos'
import { pagoDe } from '@/lib/pagos'
import { casoEsDeEjemplo } from '@/lib/ejemplos'
import { useCasos, usePagos, usePaseoActivo, usePaseos, useServidor } from '@/lib/datos'
import { ETIQUETA_ESTADO } from '@/lib/paseoTextos'
import { cn, soles } from '@/lib/utils'
import { BotonConfirmable } from '../ui/BotonConfirmable'
import { EtiquetaEjemplo } from '../ui/EtiquetaEjemplo'
import { VerMas } from '../ui/VerMas'

const PAGO: Record<Caso['pagoEstado'], string> = {
  sin_registro: 'No hay un pago registrado.',
  sin_pagar: 'La familia todavía no pagó.',
  visto: 'El paseador vio el pago: falta confirmarlo en la cuenta del equipo.',
  no_encontrado: 'El equipo no encontró el pago.',
  pagado_paseador: 'Ya se le pagó al paseador.',
}

const COMO: Record<Resolucion['como'], string> = {
  cerrado: 'Se cerró el paseo',
  cancelado: 'Se anuló el paseo',
}

function hora(at: number) {
  return new Date(at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Cola de reportes y entregas sin confirmar. El equipo resuelve a mano y deja una nota (obligatoria).
 * La app no guarda dinero: no hay reembolsos automáticos.
 */
export function ColaDeCasos({ mostrarEjemplos = true }: { /** Sin «Mostrar ejemplos», no salen los casos de paseadores de ejemplo. */ mostrarEjemplos?: boolean }) {
  const [guardados, setCasos] = useCasos()
  const [job, setJob] = usePaseoActivo()
  // Con servidor el equipo ve TODOS los paseos de la base: cada caso se resuelve en SU paseo, no solo en el último.
  const [paseos, setPaseos] = usePaseos()
  const conServidor = useServidor().activo
  const [pagos] = usePagos()
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})

  // Un paseo que sigue «en disputa» sin un caso abierto (por ejemplo, de una versión vieja) no puede quedar sin salida:
  // se agrega a la cola para que el equipo lo cierre o lo anule.
  const huerfano = job && job.paseo.estado === 'en_disputa' && !guardados.some((c) => c.jobId === job.id && !c.resolucion)
  const casos = huerfano
    ? abrirCaso(guardados, casoDeReporte(job, job.reporte ?? { quien: 'dueno', motivo: 'otro', texto: '(No quedó el texto del reporte.)', at: job.paseo.eventos[job.paseo.eventos.length - 1].at }))
    : guardados

  // El estado del paseo y del pago se muestran como están AHORA (no como estaban al abrir el caso).
  const vivo = (c: Caso): Caso => {
    const pago = pagoDe(pagos, c.jobId)
    const delPaseo = (conServidor ? paseos.find((p) => p.id === c.jobId) : undefined) ?? (job && job.id === c.jobId ? job : undefined)
    return {
      ...c,
      ...(delPaseo ? { estadoPaseo: delPaseo.paseo.estado } : {}),
      ...(pago ? { pagoEstado: pago.estado, monto: pago.monto } : {}),
    }
  }

  const sePuedeVer = (c: Caso) => mostrarEjemplos || !casoEsDeEjemplo(c)
  const abiertosAhora = abiertos(casos).map(vivo).filter(sePuedeVer)
  const hechos = resueltos(casos).filter(sePuedeVer)

  const resolver = (c: Caso, como: Resolucion['como'], ahora: number) => {
    const nota = notas[c.id] ?? ''
    const r = resolverCaso(casos, c.id, como, nota, ahora)
    if (!r.ok) {
      setErrores((e) => ({ ...e, [c.id]: r.motivo }))
      return
    }
    setCasos(r.casos)
    if (conServidor) {
      if (paseos.some((p) => p.id === c.jobId)) setPaseos(paseos.map((p) => (p.id === c.jobId ? (resolverJob(p, c, como, nota, ahora + 1) ?? p) : p)))
    } else if (job && job.id === c.jobId) setJob(resolverJob(job, c, como, nota, ahora + 1))
    setErrores((e) => ({ ...e, [c.id]: '' }))
  }

  const boton = 'min-h-11 rounded-full px-4 py-2 text-[14px] font-extrabold active:scale-95'

  return (
    <section className="mt-8" aria-labelledby="cola">
      <div className="flex items-end justify-between gap-3">
        <h2 id="cola" className="font-display text-[28px] font-bold leading-tight">
          Cola de reportes
        </h2>
        <span className={cn('rounded-full px-3 py-1 text-[14px] font-extrabold', abiertosAhora.length ? 'bg-amber-100 text-amber-900' : 'bg-sand text-ink-soft')}>
          {abiertosAhora.length} {abiertosAhora.length === 1 ? 'abierto' : 'abiertos'}
        </span>
      </div>

      {abiertosAhora.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-sand p-4 text-[14px] font-semibold text-ink-soft">
          <Inbox size={17} className="shrink-0" /> No hay reportes ni entregas sin confirmar.
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {abiertosAhora.map((c) => (
            <li key={c.id} className="rounded-3xl border-2 border-amber-300 bg-paper p-5">
              <p className="flex items-center gap-2 text-[14px] font-extrabold text-amber-900">
                <TriangleAlert size={16} /> {c.tipo === 'disputa' ? 'Reporte' : c.tipo === 'pago' ? 'Pago no encontrado' : 'Entrega sin confirmar'}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[22px] font-bold leading-tight">
                {c.perro} · paseador {c.paseador} · dueño {c.dueno}
                {casoEsDeEjemplo(c) && <EtiquetaEjemplo />}
              </p>
              <p className="text-[14px] text-ink-soft">Abierto el {hora(c.abiertoAt)}</p>

              {c.reporte && (
                <div className="mt-3 rounded-2xl bg-sand p-3.5">
                  <p className="text-[14px] font-extrabold text-ink">
                    {etiquetaMotivo(c.reporte.motivo)} · lo reportó {c.reporte.quien === 'dueno' ? 'el dueño' : 'el paseador'}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-snug text-ink">{c.reporte.texto}</p>
                  {c.reporte.foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.reporte.foto} alt="Foto del reporte" className="mt-2 aspect-[4/3] w-48 rounded-2xl border border-ink/10 object-cover" />
                  )}
                </div>
              )}
              {c.tipo === 'entrega_sin_confirmar' && (
                <p className="mt-3 rounded-2xl bg-sand p-3.5 text-[14px] leading-snug text-ink">
                  Pasó el tiempo sin que el dueño confirme. No se confirma sola.
                </p>
              )}

              <p className="mt-3 text-[14px] text-ink-soft">
                Estado del paseo: <b className="text-ink">{ETIQUETA_ESTADO[c.estadoPaseo]}</b>. {PAGO[c.pagoEstado]}
              </p>
              {c.monto !== undefined && (
                <p className="mt-1 text-[14px] text-ink-soft">
                  Pago: <b className="text-ink">{soles(c.monto)}</b>.
                </p>
              )}
              {c.registro && c.registro.length > 0 && (
                <VerMas abrir="Ver el registro" cerrar="Ocultar el registro">
                  <ul className="mt-1 space-y-1">
                    {c.registro.map((ev, i) => (
                      <li key={i}>
                        {hora(ev.at)} · {ev.quien === 'dueno' ? 'dueño' : ev.quien === 'paseador' ? 'paseador' : 'sistema'} · {ev.accion === 'avisar' ? 'aviso de ubicación' : ev.accion.replace('_', ' ')}
                        {ev.nota ? ` · ${ev.nota}` : ''}
                        {ev.demo ? ' · demostración' : ''}
                      </li>
                    ))}
                  </ul>
                </VerMas>
              )}

              <label className="mt-4 block">
                <span className="eyebrow mb-1.5 block text-ink-soft">Nota del equipo (obligatoria)</span>
                <textarea
                  value={notas[c.id] ?? ''}
                  onChange={(e) => {
                    setNotas((n) => ({ ...n, [c.id]: e.target.value }))
                    setErrores((er) => ({ ...er, [c.id]: '' }))
                  }}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-ink/15 bg-paper p-3.5 text-[16px] outline-hidden focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
                  placeholder="Qué hablaron, qué se decidió…"
                />
              </label>
              {errores[c.id] && (
                <p role="alert" className="mt-2 text-[14px] font-bold text-red-700">
                  {errores[c.id]}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2.5">
                <button type="button" onClick={() => resolver(c, 'cerrado', Date.now())} className={cn(boton, 'bg-forest text-white')}>
                  {c.tipo === 'disputa' ? 'Cerrar el paseo' : 'Cerrar con nota'}
                </button>
                {c.tipo === 'disputa' && (
                  <BotonConfirmable
                    onConfirm={() => resolver(c, 'cancelado', Date.now())}
                    confirmar="Otra vez: anular"
                    className={cn(boton, 'border-2')}
                    reposoClassName="border-red-300 bg-transparent text-red-700"
                    armadoClassName="border-red-600 bg-red-600 text-white"
                  >
                    Anular el paseo
                  </BotonConfirmable>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hechos.length > 0 && (
        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer text-[14px] font-extrabold text-brand-800">Resueltos ({hechos.length})</summary>
          <ul className="mt-2 space-y-2">
            {hechos.map((c) => (
              <li key={c.id} className="rounded-2xl border border-ink/10 bg-paper p-3.5 text-[14px] leading-snug">
                <b>
                  {c.perro} · {c.paseador}
                </b>{' '}
                {casoEsDeEjemplo(c) && <EtiquetaEjemplo />} · {COMO[c.resolucion!.como] ?? 'Se anotó'} el {hora(c.resolucion!.at)}
                <span className="block text-ink-soft">{c.resolucion!.nota}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
