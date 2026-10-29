'use client'

import { useRef, useState } from 'react'
import { ArrowRight, Clock, Eye, PenLine, ShieldCheck } from 'lucide-react'
import { CONFIG } from '@/lib/config'
import type { QuizResult } from '@/lib/quiz'
import { detalleDeRespuesta, PREGUNTAS_EXAMEN, resultadoDeExamenEscrito, TEXTO_RESPUESTA } from '@/lib/respuestasEscritas'
import { btnInk, btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { VerMas } from '../ui/VerMas'

/** Los textos del examen escrito. */
export const TEXTO_EXAMEN = {
  eyebrow: 'Examen de situaciones',
  titulo: 'Cuéntanos qué harías',
  enviado: 'Examen enviado',
  resultadoTitulo: 'Pasa a revisión',
  resultadoTexto: 'Una persona del equipo leerá tus respuestas y lo repasamos en la videollamada. No hay puntaje: queremos conocer cómo piensas.',
  privacidad: 'Solo las lee el equipo de Patitas.',
} as const

/**
 * Examen de situaciones con respuestas ESCRITAS: cada pregunta se contesta con las palabras de la persona, con contador de letras y
 * un mensaje amable si todavía es corta. No hay puntaje automático: las lee una persona del equipo. No es un test psicológico.
 */
export function QuizStep({
  result,
  onDone,
  onContinue,
}: {
  result?: QuizResult
  onDone: (r: QuizResult) => void
  onContinue: () => void
}) {
  const [fase, setFase] = useState<'intro' | 'preguntas' | 'resultado'>(result ? 'resultado' : 'intro')
  const [i, setI] = useState(0)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [ultimo, setUltimo] = useState<QuizResult | undefined>(result)
  const t0 = useRef(0)
  const total = PREGUNTAS_EXAMEN.length

  const empezar = () => {
    setRespuestas({})
    setI(0)
    t0.current = Date.now()
    setFase('preguntas')
  }

  if (fase === 'intro') {
    return (
      <div className="space-y-4">
        <div>
          <p className="eyebrow text-brand-700">{TEXTO_EXAMEN.eyebrow}</p>
          <h2 className="font-display text-[32px] font-bold leading-[1.05] text-ink">{TEXTO_EXAMEN.titulo}</h2>
        </div>
        <ul className="space-y-2.5">
          {([
            { icon: PenLine, t: `${total} situaciones. Contestas con tus palabras, entre ${CONFIG.respuestaMinima} y ${CONFIG.respuestaMaxima} letras.` },
            { icon: Clock, t: 'Unos 10 minutos. Respóndelo tú solo.', mas: 'Lo repasamos contigo en la videollamada.' },
            { icon: Eye, t: `No hay puntaje: una persona lee tus respuestas. ${TEXTO_EXAMEN.privacidad}` },
            { icon: ShieldCheck, t: 'No hay respuestas «correctas»: importa cómo piensas y cuidas.' },
          ] as Array<{ icon: typeof Clock; t: string; mas?: string }>).map((r) => (
            <li key={r.t} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-3.5 text-[14px] leading-snug text-ink">
              <r.icon size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <div>
                {r.t}
                {r.mas && <VerMas>{r.mas}</VerMas>}
              </div>
            </li>
          ))}
        </ul>
        <p className="rounded-2xl bg-sand p-3.5 text-[14px] leading-snug text-ink-soft">
          Esto <b>no es un test psicológico</b>: nos ayuda a conocer tu criterio con casos reales.
        </p>
        <button type="button" onClick={empezar} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
          Empezar examen <ArrowRight size={19} strokeWidth={2.6} />
        </button>
      </div>
    )
  }

  if (fase === 'preguntas') {
    const p = PREGUNTAS_EXAMEN[i]
    const texto = respuestas[p.id] ?? ''
    const d = detalleDeRespuesta(texto)
    const ultima = i + 1 === total
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-[12px] font-extrabold text-ink-soft">
            <span>
              Pregunta {i + 1} de {total}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={i} aria-label="Progreso del examen">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(i / total) * 100}%` }} />
          </div>
        </div>
        <label htmlFor={`resp-${p.id}`} className="block font-display text-[22px] font-bold leading-[1.15] text-ink">
          {p.texto}
        </label>
        <div>
          <textarea
            id={`resp-${p.id}`}
            value={texto}
            onChange={(e) => setRespuestas((r) => ({ ...r, [p.id]: e.target.value.slice(0, CONFIG.respuestaMaxima + 50) }))}
            rows={6}
            aria-describedby={`ayuda-${p.id}`}
            className="w-full resize-none rounded-2xl border border-ink/15 bg-paper p-3.5 text-[16px] leading-snug text-ink outline-hidden placeholder:text-ink-soft focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
            placeholder="Escribe aquí con tus palabras…"
          />
          <div id={`ayuda-${p.id}`} className="mt-1 flex items-start justify-between gap-3 text-[13px]" aria-live="polite">
            <span className={cn('font-bold', d.estado === 'ok' ? 'text-forest' : 'text-ink')}>{d.mensaje || (d.estado === 'ok' ? 'Listo.' : `Mínimo ${d.min} letras.`)}</span>
            <span className={cn('shrink-0 tabular-nums', d.estado === 'larga' ? 'font-bold text-red-700' : 'text-ink-soft')}>{TEXTO_RESPUESTA.contador(d.largo, d.max)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="h-14 shrink-0 rounded-full bg-sand px-5 text-[15px] font-extrabold text-ink">
              Atrás
            </button>
          )}
          <button
            type="button"
            disabled={d.estado !== 'ok'}
            onClick={() => {
              if (!ultima) return setI(i + 1)
              const r = resultadoDeExamenEscrito(respuestas, Math.round((Date.now() - t0.current) / 1000))
              setUltimo(r)
              onDone(r)
              setFase('resultado')
            }}
            className={cn(btnInk, 'h-14 flex-1 text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
          >
            {ultima ? 'Enviar mi examen' : 'Siguiente'} <ArrowRight size={19} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    )
  }

  /* resultado */
  const r = ultimo ?? result
  if (!r) return null
  return (
    <div className="space-y-4 text-center">
      <div className="rounded-3xl bg-brand-50 p-6">
        <Eye size={38} className="mx-auto text-brand-800" />
        <h2 className="mt-3 font-display text-[26px] font-bold leading-tight text-brand-800">{TEXTO_EXAMEN.resultadoTitulo}</h2>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[14px] leading-snug text-ink-soft">{TEXTO_EXAMEN.resultadoTexto}</p>
      </div>
      <button type="button" onClick={onContinue} className={cn(btnInk, 'h-14 w-full text-[16px]')}>
        Continuar <ArrowRight size={19} strokeWidth={2.6} />
      </button>
    </div>
  )
}
