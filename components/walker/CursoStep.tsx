'use client'

import { useState } from 'react'
import { ArrowRight, BookOpenCheck, Clock, Phone } from 'lucide-react'
import { CONFIG, NOMBRE_CORTO } from '@/lib/config'
import { ESCENAS_CURSO } from '@/lib/cursoEscenas'
import { estadoDelCurso, MAX_INTENTOS_CURSO, PASS_PCT, puntuarCurso, type CursoResult } from '@/lib/quiz'
import { btnInk, btnPrimary } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { VerMas } from '../ui/VerMas'

/** Los textos del mini curso. Nunca dicen «capacitado», «certificado» ni «preparado»: lo único que se afirma es lo que se hizo. */
export const TEXTO_CURSO = {
  eyebrow: 'Mini curso',
  titulo: 'Ocho escenas: ¿qué harías?',
  demostracion: 'Demostración',
  termino: 'Terminó el mini curso y respondió las escenas',
  noAlcanza: 'Aún no alcanza el mínimo',
  elige: 'Elige lo que más te ayudaría:',
  bien: '¡Eso!',
  mejor: 'Mejor así:',
  queHacer: 'Qué hacer',
  siguiente: 'Siguiente escena',
  verResultado: 'Ver mi resultado',
  emergencia: 'Si pasa algo: calma, avisa a la familia por chat o llamada y escribe a',
  sinContacto: 'Falta configurar el contacto de',
} as const

/** El contacto de Patitas para una emergencia, tal como lo llenó el equipo en `lib/config.ts` (vacío = «Falta configurar»). */
export function ContactoDeEmergencia() {
  const contactos = CONFIG.contactosAyuda.filter((c) => c.nombre.trim() || c.telefono.trim())
  return (
    <div className="space-y-1.5 rounded-2xl bg-sand p-3.5 text-left text-[14px] leading-snug text-ink">
      <p className="font-extrabold">
        {TEXTO_CURSO.emergencia} {NOMBRE_CORTO}.
      </p>
      {contactos.length === 0 ? (
        <p className="text-ink-soft">
          {TEXTO_CURSO.sinContacto} {NOMBRE_CORTO}.
        </p>
      ) : (
        <ul className="space-y-1">
          {contactos.map((c) => (
            <li key={`${c.nombre}${c.telefono}`} className="flex items-center gap-2">
              <Phone size={14} className="shrink-0 text-ink-soft" aria-hidden />
              <span>
                {c.nombre} {c.telefono && <a href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`} className="font-extrabold underline underline-offset-4">{c.telefono}</a>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Mini curso: ocho escenas «¿Qué harías si…?» (lib/cursoEscenas.ts). En cada una se elige una opción y enseguida se ve una
 * explicación corta y el cierre de qué hacer. Hasta 2 intentos y reintento a los 3 meses. NO bloquea el avance (decisión de la
 * usuaria): que el contenido aún lo lea una persona de confianza es un recordatorio SOLO para el equipo (`/admin`, `CONFIG.cursoRevisado`).
 * `demostracion`: se ve completo con el rótulo «Demostración» y no guarda nada.
 */
export function CursoStep({
  curso,
  intentos,
  demostracion = false,
  ahora,
  onDone,
  onContinue,
}: {
  curso?: CursoResult
  intentos: number
  demostracion?: boolean
  ahora?: Date
  onDone: (r: CursoResult) => void
  onContinue: () => void
}) {
  const [fase, setFase] = useState<'intro' | 'escenas' | 'resultado'>(curso && !demostracion ? 'resultado' : 'intro')
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState<Record<string, number>>({})
  const [ultimo, setUltimo] = useState<CursoResult | undefined>(demostracion ? undefined : curso)

  const estado = estadoDelCurso(demostracion ? undefined : curso, demostracion ? 0 : intentos, ahora ?? new Date())
  const rotulo = demostracion ? <span className="rounded-full bg-sand px-2.5 py-1 text-[12px] font-extrabold text-ink">{TEXTO_CURSO.demostracion}</span> : null

  if (estado.estado === 'espera' && fase !== 'resultado') {
    const fecha = new Date(estado.desde).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    return (
      <div className="space-y-3">
        <p className="eyebrow text-brand-700">{TEXTO_CURSO.eyebrow}</p>
        <p className="rounded-2xl bg-sand p-3.5 text-[14px] leading-snug text-ink">
          Agotaste tus {MAX_INTENTOS_CURSO} intentos. Puedes volver a intentarlo el {fecha}.
        </p>
      </div>
    )
  }

  const empezar = () => {
    setPicks({})
    setI(0)
    setFase('escenas')
  }

  if (fase === 'intro') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow text-brand-700">{TEXTO_CURSO.eyebrow}</p>
          {rotulo}
        </div>
        <h2 className="font-display text-[32px] font-bold leading-[1.05] text-ink">{TEXTO_CURSO.titulo}</h2>
        <ul className="space-y-2.5">
          {[
            { icon: BookOpenCheck, t: `${ESCENAS_CURSO.length} escenas de un paseo de verdad. Eliges y ves qué conviene.` },
            { icon: Clock, t: `Unos 5 minutos. Se muestra cómo te fue con ${PASS_PCT} % o más.` },
          ].map((r) => (
            <li key={r.t} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-3.5 text-[14px] leading-snug text-ink">
              <r.icon size={18} className="mt-0.5 shrink-0 text-brand-700" />
              {r.t}
            </li>
          ))}
        </ul>
        <VerMas>
          Es una lectura guiada, no un título. Tienes {MAX_INTENTOS_CURSO} intentos y, si se acaban, puedes volver a los 3 meses.
        </VerMas>
        <button type="button" onClick={empezar} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
          Empezar <ArrowRight size={19} strokeWidth={2.6} />
        </button>
      </div>
    )
  }

  if (fase === 'escenas') {
    const e = ESCENAS_CURSO[i]
    const elegido = picks[e.id]
    const respondida = elegido !== undefined
    const ultima = i + 1 === ESCENAS_CURSO.length
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-[12px] font-extrabold text-ink-soft">
            <span>
              Escena {i + 1} de {ESCENAS_CURSO.length}
            </span>
            {rotulo}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={ESCENAS_CURSO.length} aria-valuenow={i + (respondida ? 1 : 0)} aria-label="Progreso del curso">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((i + (respondida ? 1 : 0)) / ESCENAS_CURSO.length) * 100}%` }} />
          </div>
        </div>
        <h2 className="font-display text-[26px] font-bold leading-[1.1] text-ink">{e.titulo}</h2>
        <p className="text-[15px] font-semibold leading-snug text-ink">{e.situacion}</p>
        {!respondida && <p className="text-[13px] font-bold text-ink-soft">{TEXTO_CURSO.elige}</p>}
        {e.opciones.map((o, k) => (
          <button
            key={o}
            type="button"
            disabled={respondida}
            aria-pressed={elegido === k}
            onClick={() => setPicks((p) => (p[e.id] === undefined ? { ...p, [e.id]: k } : p))}
            className={cn(
              'min-h-11 flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left active:scale-[0.99]',
              respondida && k === e.correcta ? 'border-forest bg-forest-50' : elegido === k ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper',
            )}
          >
            <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[12px] font-extrabold', elegido === k ? 'border-brand-600 bg-brand-700 text-white' : 'border-ink/25 text-ink-soft')}>
              {String.fromCharCode(65 + k)}
            </span>
            <span className="text-[14.5px] font-semibold leading-snug text-ink">{o}</span>
          </button>
        ))}
        {respondida && (
          <div className="space-y-3 rounded-2xl bg-sand p-3.5" aria-live="polite">
            <p className="text-[14.5px] leading-snug text-ink">
              <span className="font-extrabold">{elegido === e.correcta ? TEXTO_CURSO.bien : TEXTO_CURSO.mejor}</span> {e.explicacion}
            </p>
            <div>
              <p className="text-[13px] font-extrabold text-ink-soft">{TEXTO_CURSO.queHacer}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[14.5px] leading-snug text-ink">
                {e.queHacer.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <button
          type="button"
          disabled={!respondida}
          onClick={() => {
            if (!ultima) return setI(i + 1)
            const r = puntuarCurso(picks)
            setUltimo(r)
            if (!demostracion) onDone(r)
            setFase('resultado')
          }}
          className={cn(btnInk, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
        >
          {ultima ? TEXTO_CURSO.verResultado : TEXTO_CURSO.siguiente} <ArrowRight size={19} strokeWidth={2.6} />
        </button>
      </div>
    )
  }

  /* resultado */
  const r = ultimo ?? curso
  if (!r) return null
  const puedeOtra = !r.aprobado && (demostracion || estado.estado === 'pendiente' || estado.estado === 'reintentar')
  const numeroIntento = estado.estado === 'reintentar' ? estado.intento : 1
  return (
    <div className="space-y-4 text-center">
      <div className={cn('rounded-3xl p-6', r.aprobado ? 'bg-forest-50' : 'bg-brand-50')}>
        <div className="flex justify-center">{rotulo}</div>
        <p className={cn('mt-2 font-display text-[44px] font-bold leading-none tabular-nums', r.aprobado ? 'text-forest' : 'text-brand-800')}>{r.pct} %</p>
        <p className="mt-1 text-[14px] font-bold text-ink-soft">
          {r.aciertos} de {r.total} respuestas
        </p>
        <h2 className={cn('mt-3 font-display text-[26px] font-bold leading-tight', r.aprobado ? 'text-forest' : 'text-brand-800')}>
          {r.aprobado ? 'Terminó el mini curso' : TEXTO_CURSO.noAlcanza}
        </h2>
        {r.aprobado && <p className="mx-auto mt-1.5 max-w-[300px] text-[14px] leading-snug text-ink-soft">{TEXTO_CURSO.termino}.</p>}
        {!r.aprobado && <p className="mx-auto mt-1.5 max-w-[300px] text-[14px] leading-snug text-ink-soft">Necesitas {PASS_PCT} %. Repasa las escenas e inténtalo de nuevo.</p>}
      </div>
      <ContactoDeEmergencia />
      {demostracion && <p className="text-[14px] font-semibold text-ink-soft">{TEXTO_CURSO.demostracion}: este resultado no se guarda.</p>}
      {!demostracion && r.aprobado ? (
        <button type="button" onClick={onContinue} className={cn(btnInk, 'h-14 w-full text-[16px]')}>
          Continuar <ArrowRight size={19} strokeWidth={2.6} />
        </button>
      ) : puedeOtra ? (
        <button type="button" onClick={empezar} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
          Intentar de nuevo{demostracion ? '' : ` (intento ${numeroIntento} de ${MAX_INTENTOS_CURSO})`}
        </button>
      ) : demostracion ? null : (
        <p className="rounded-2xl bg-sand p-3.5 text-[14px] leading-snug text-ink-soft">
          Agotaste tus {MAX_INTENTOS_CURSO} intentos. Puedes volver a intentarlo en 3 meses.
        </p>
      )}
    </div>
  )
}
