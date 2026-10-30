'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, TriangleAlert, X } from 'lucide-react'
import {
  alertaPerro,
  ATRIBUTOS_FAMILIA,
  ATRIBUTOS_PASEADOR,
  ATRIBUTOS_PERRO,
  COMENTARIO_MAX,
  compararPerro,
  puntajeSugerido,
  validarCalificacion,
  valoresIniciales,
  type QuienCalifica,
  type Valores,
} from '@/lib/calificacionDetallada'
import { guardarCalificacion } from '@/lib/calificacionesGuardadas'
import { btnPrimary, inputBase } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { Sheet } from '../ui/Sheet'
import { BarraAtributo, DeslizadorAtributo } from './Barras'

/**
 * Calificar por partes, con barras de 0 a 100. La familia califica al paseador (y le pone el puntaje final de 1 a 10);
 * el paseador califica lo que vio del perro (comparado con la ficha) y a la familia. Comentario opcional en los dos.
 */
export function CalificarPorPartes({
  quien,
  paseoId,
  paseadorId,
  perroId,
  perro,
  paseador,
  fichaPerro,
  onClose,
}: {
  quien: QuienCalifica
  paseoId: string
  paseadorId?: string
  perroId?: string
  perro: string
  paseador: string
  /** Lo que la familia declaró del perro (barras de su ficha). Vacío si no lo llenó. */
  fichaPerro?: Valores
  onClose: () => void
}) {
  const [barrasPaseador, setBarrasPaseador] = useState<Valores>(() => valoresIniciales(ATRIBUTOS_PASEADOR))
  const [barrasPerro, setBarrasPerro] = useState<Valores>(() => ({ ...valoresIniciales(ATRIBUTOS_PERRO), ...(fichaPerro ?? {}) }))
  const [barrasFamilia, setBarrasFamilia] = useState<Valores>(() => valoresIniciales(ATRIBUTOS_FAMILIA))
  const [puntaje, setPuntaje] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const sugerido = useMemo(() => puntajeSugerido(barrasPaseador), [barrasPaseador])
  const difs = useMemo(() => (fichaPerro ? compararPerro(fichaPerro, barrasPerro) : []), [fichaPerro, barrasPerro])
  const alerta = alertaPerro(difs)

  const guardar = () => {
    const datos =
      quien === 'familia'
        ? { paseoId, quien, paseadorId, perroId, paseador: barrasPaseador, puntajeFinal: puntaje ?? undefined, comentario: comentario.trim() }
        : { paseoId, quien, paseadorId, perroId, perro: barrasPerro, familia: barrasFamilia, comentario: comentario.trim() }
    const e = validarCalificacion(datos)
    if (e) return setError(e)
    const ok = guardarCalificacion({ ...datos, id: `${paseoId}-${quien}`, en: Date.now() })
    if (!ok) return setError('No se pudo guardar en este teléfono. Revisa el espacio del navegador.')
    setError(null)
    setGuardado(true)
  }

  return (
    <Sheet label="Calificar por partes" onClose={onClose} full>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <h2 className="font-display text-[24px] font-bold leading-tight text-ink">{quien === 'familia' ? `Califica a ${paseador}` : `¿Cómo fue ${perro}?`}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-6">
        {guardado ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-3xl bg-forest-50 p-5 text-center ring-1 ring-forest/20">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-forest text-white">
                <Check size={22} strokeWidth={3} />
              </span>
              <p className="mt-2.5 font-display text-[20px] font-bold text-ink">Calificación guardada</p>
              <p className="mt-0.5 text-[14px] text-ink-soft">{quien === 'familia' ? `Puntaje final: ${puntaje} de 10.` : 'Gracias: así la próxima ficha es más fiel.'}</p>
            </div>
            {quien === 'paseador' && difs.length > 0 && (
              <section aria-labelledby="comparacion" className="space-y-4">
                <h3 id="comparacion" className="eyebrow text-ink-soft">
                  Lo visto y la ficha
                </h3>
                {difs.map((d) => (
                  <BarraAtributo key={d.atributo.id} atributo={d.atributo} valor={d.observado} comparar={d.declarado} />
                ))}
              </section>
            )}
            <button type="button" onClick={onClose} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
              Listo
            </button>
          </motion.div>
        ) : (
          <>
            {quien === 'familia' ? (
              <>
                <section aria-label="Barras del paseador" className="space-y-5">
                  {ATRIBUTOS_PASEADOR.map((a) => (
                    <DeslizadorAtributo key={a.id} atributo={a} valor={barrasPaseador[a.id]} onChange={(n) => setBarrasPaseador((v) => ({ ...v, [a.id]: n }))} />
                  ))}
                </section>
                <fieldset>
                  <legend className="text-[15px] font-extrabold text-ink">Puntaje final del 1 al 10</legend>
                  <p className="mt-0.5 text-[14px] text-ink-soft">Por tus barras sugerimos {sugerido}. Tú decides.</p>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={puntaje === n}
                        onClick={() => setPuntaje(n)}
                        className={cn(
                          'h-12 rounded-2xl border-2 font-display text-[20px] font-bold transition active:scale-95',
                          puntaje === n ? 'border-brand-700 bg-brand-700 text-white' : n === sugerido ? 'border-brand-600 bg-brand-50 text-ink' : 'border-ink/10 bg-paper text-ink',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : (
              <>
                <section aria-labelledby="barras-perro" className="space-y-5">
                  <div>
                    <h3 id="barras-perro" className="eyebrow text-ink-soft">
                      Lo que viste de {perro}
                    </h3>
                    {fichaPerro && <p className="mt-1 text-[14px] text-ink-soft">La rayita oscura es lo que dice la ficha.</p>}
                  </div>
                  {ATRIBUTOS_PERRO.map((a) => (
                    <DeslizadorAtributo key={a.id} atributo={a} valor={barrasPerro[a.id]} marca={fichaPerro?.[a.id]} onChange={(n) => setBarrasPerro((v) => ({ ...v, [a.id]: n }))} />
                  ))}
                </section>
                {alerta.nivel !== 'ninguna' && (
                  <p role="status" className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800 ring-1 ring-red-200">
                    <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
                    <span>
                      {alerta.motivos.join('. ')}. El equipo lo revisa y puedes no volver a pasearlo sin penalidad.
                    </span>
                  </p>
                )}
                <section aria-labelledby="barras-familia" className="space-y-5">
                  <h3 id="barras-familia" className="eyebrow text-ink-soft">
                    Y la familia
                  </h3>
                  {ATRIBUTOS_FAMILIA.map((a) => (
                    <DeslizadorAtributo key={a.id} atributo={a} valor={barrasFamilia[a.id]} onChange={(n) => setBarrasFamilia((v) => ({ ...v, [a.id]: n }))} />
                  ))}
                </section>
              </>
            )}

            <label className="block">
              <span className="eyebrow mb-1.5 block text-ink-soft">Comentario (opcional)</span>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, COMENTARIO_MAX))}
                rows={3}
                className={cn(inputBase, 'h-auto py-3')}
                placeholder={quien === 'familia' ? 'Qué te gustó o qué mejorarías' : 'Algo que la familia deba saber'}
              />
              <span className="mt-1 block text-right text-[12px] text-ink-soft">
                {comentario.length}/{COMENTARIO_MAX}
              </span>
            </label>

            {error && (
              <p role="alert" className="text-[14px] font-semibold text-red-700">
                {error}
              </p>
            )}
            <button type="button" onClick={guardar} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
              Guardar calificación
            </button>
            <p className="text-center text-[12px] text-ink-soft">Por ahora se guarda en este teléfono.</p>
          </>
        )}
      </div>
    </Sheet>
  )
}
