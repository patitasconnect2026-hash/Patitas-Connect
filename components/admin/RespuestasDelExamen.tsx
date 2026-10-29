import { AlertTriangle } from 'lucide-react'
import type { QuizResult } from '@/lib/quiz'
import { PREGUNTAS_EXAMEN } from '@/lib/respuestasEscritas'
import { PASS_PCT } from '@/lib/quiz'

/** Textos de la pantalla del equipo con las respuestas escritas. */
export const TEXTO_RESPUESTAS_ADMIN = {
  titulo: 'Examen de situaciones',
  aun: 'Aún no la rindió.',
  lectura: 'Respuestas escritas: las lee una persona del equipo.',
  sinRespuesta: 'Sin respuesta.',
  alertas: 'Cosas para mirar',
  nota: 'Se puede copiar con IA: se repasa en la videollamada.',
  viejo: 'Examen anterior, con opciones.',
} as const

/**
 * Lo que escribió una persona en el examen, pregunta por pregunta, en una pantalla simple. Solo la ve el equipo (/admin).
 * Con servidor, los textos vienen de la tabla `respuestas_escritas` (solo el equipo la lee).
 */
export function RespuestasDelExamen({ quiz, intento, ia }: { quiz?: QuizResult; intento: number; /** El botón «Resumen de apoyo con IA» (lo pone el panel del equipo). */ ia?: React.ReactNode }) {
  const detalle = quiz ? `${quiz.max > 0 ? `${TEXTO_RESPUESTAS_ADMIN.viejo} ${quiz.pct} % (mínimo ${PASS_PCT} %) · ` : `${TEXTO_RESPUESTAS_ADMIN.lectura} `}${Math.round(quiz.durationSec / 60)} min ${quiz.durationSec % 60} s · intento ${intento}.` : ''
  return (
    <section className="rounded-3xl border border-ink/10 bg-paper p-5" aria-label={TEXTO_RESPUESTAS_ADMIN.titulo}>
      <h3 className="font-display text-[24px] font-bold">{TEXTO_RESPUESTAS_ADMIN.titulo}</h3>
      {!quiz ? (
        <p className="mt-2 text-[14px] text-ink-soft">{TEXTO_RESPUESTAS_ADMIN.aun}</p>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-ink-soft">{detalle}</p>
          {(quiz.danger.length > 0 || quiz.openFlags.length > 0) && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4">
              <p className="flex items-center gap-2 text-[14px] font-extrabold text-red-800">
                <AlertTriangle size={16} /> {TEXTO_RESPUESTAS_ADMIN.alertas}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] leading-snug text-red-900">
                {quiz.danger.map((id) => (
                  <li key={id}>Respuesta de riesgo en la pregunta {id}</li>
                ))}
                {quiz.openFlags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          <ol className="mt-4 space-y-3">
            {PREGUNTAS_EXAMEN.map((p, i) => {
              const txt = (quiz.open[p.id] ?? '').trim()
              return (
                <li key={p.id} className="rounded-2xl bg-sand p-4">
                  <p className="text-[13px] font-extrabold text-ink-soft">
                    {i + 1}. {p.texto}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-snug text-ink">{txt || TEXTO_RESPUESTAS_ADMIN.sinRespuesta}</p>
                </li>
              )
            })}
          </ol>
          <p className="mt-3 text-[14px] leading-snug text-ink-soft">{TEXTO_RESPUESTAS_ADMIN.nota}</p>
          {ia}
        </>
      )}
    </section>
  )
}
