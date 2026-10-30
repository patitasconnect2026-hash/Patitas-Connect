'use client'

import { useEffect, useState } from 'react'
import { Check, GraduationCap, Medal, Share2, Users } from 'lucide-react'
import { CONFIG, NOMBRE_CORTO } from '@/lib/config'
import { rankingPaseador } from '@/lib/calificacionDetallada'
import { puntajesDe } from '@/lib/calificacionesGuardadas'
import { estadoPorFaltas } from '@/lib/penalizaciones'
import { codigoDeGrupo, comisionVigente, faltaParaSiguiente, mensajeInvitacionGrupo, nivelDe } from '@/lib/planes'
import { ACADEMIA } from '@/lib/servicios'
import { cn } from '@/lib/utils'
import { guardarEnTelefono, leerDelTelefono } from '@/lib/datos'
import { CLAVES } from '@/lib/datos/claves'

function leerCursos(): string[] {
  const v = leerDelTelefono<unknown>(CLAVES.academia, [])
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/**
 * Nivel del paseador (Nuevo, Pro, Élite): comisión, qué le falta, la academia y el código para traer a su grupo de
 * Facebook o WhatsApp. Las faltas y los cursos aún no llegan del servidor: se simulan en este teléfono.
 */
export function MiNivel({ walkerId, nombre, paseos }: { walkerId: string; nombre: string; paseos: number }) {
  const [cursos, setCursos] = useState<string[]>([])
  const [puntajes, setPuntajes] = useState<number[]>([])
  const [grupo, setGrupo] = useState('')
  const [copiado, setCopiado] = useState(false)
  // Lo guardado se lee después de pintar, para no romper la hidratación.
  useEffect(() => {
    const t = setTimeout(() => {
      setCursos(leerCursos())
      setPuntajes(puntajesDe(walkerId))
    }, 0)
    return () => clearTimeout(t)
  }, [walkerId])

  const puntaje = rankingPaseador(puntajes)
  const historial = { paseos, puntaje, faltas30d: 0, cursos: cursos.length }
  const nivel = nivelDe(historial)
  const siguiente = faltaParaSiguiente(historial)
  const faltas = estadoPorFaltas(historial.faltas30d)
  const codigo = codigoDeGrupo(grupo || nombre, walkerId.length * 37 + paseos)
  const enlace = typeof window === 'undefined' ? '' : `${window.location.origin}/?paseador=1&grupo=${codigo}`
  const invitacion = mensajeInvitacionGrupo(codigo, enlace)

  const marcar = (id: string) => {
    const nuevos = cursos.includes(id) ? cursos.filter((c) => c !== id) : [...cursos, id]
    setCursos(nuevos)
    guardarEnTelefono(CLAVES.academia, nuevos)
  }

  const compartir = async () => {
    try {
      if (navigator.share) await navigator.share({ text: invitacion })
      else {
        await navigator.clipboard.writeText(invitacion)
        setCopiado(true)
      }
    } catch {
      /* la persona cerró el menú de compartir */
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-vino p-5 text-white">
        <p className="eyebrow text-white/70">Tu nivel</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-[30px] font-bold leading-none">
            <Medal size={26} aria-hidden /> {nivel.nombre}
          </p>
          <span className="rounded-full bg-white px-3 py-1 text-[14px] font-extrabold text-vino">{comisionVigente(nivel.id)} % comisión</span>
        </div>
        <p className="mt-2 text-[14px] text-white/80">{puntaje === null ? 'Aún sin puntaje de familias.' : `Puntaje ${puntaje.toFixed(1).replace('.', ',')} de 10.`}</p>
        {siguiente && (
          <div className="mt-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.round(siguiente.avance * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[14px] leading-snug text-white/90">
              Para {siguiente.nivel.nombre} ({CONFIG.comisionPorNivel[siguiente.nivel.id]} %): {siguiente.faltan.join(', ') || 'ya cumples'}.
            </p>
          </div>
        )}
        {!CONFIG.comisionPorNivelActiva && <p className="mt-2 text-[12px] text-white/70">Simulado: hoy todos pagan {CONFIG.comision} %.</p>}
      </section>

      <section className="rounded-3xl border border-ink/10 bg-paper p-4">
        <p className="text-[14px] font-extrabold text-ink">Faltas en 30 días</p>
        <p className="mt-1 text-[14px] leading-snug text-ink-soft">{faltas.texto}</p>
      </section>

      <section aria-labelledby="academia" className="rounded-3xl border border-ink/10 bg-paper p-4">
        <h3 id="academia" className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
          <GraduationCap size={18} aria-hidden /> Academia {NOMBRE_CORTO}
        </h3>
        <p className="mt-1 text-[14px] text-ink-soft">Marca los cursos que terminaste (simulado).</p>
        <ul className="mt-2 space-y-1.5">
          {ACADEMIA.map((c) => {
            const hecho = cursos.includes(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={hecho}
                  onClick={() => marcar(c.id)}
                  className={cn('flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left active:scale-[0.99]', hecho ? 'border-forest bg-forest/10' : 'border-ink/10')}
                >
                  <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', hecho ? 'bg-forest text-white' : 'bg-ink/10')}>{hecho && <Check size={14} strokeWidth={3.5} />}</span>
                  <span className="flex-1 text-[14px] font-bold text-ink">{c.nombre}</span>
                  <span className="text-[12px] font-bold text-ink-soft">{c.minutos} min</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="trae-grupo" className="rounded-3xl bg-sand p-4">
        <h3 id="trae-grupo" className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
          <Users size={18} aria-hidden /> Trae a tu grupo
        </h3>
        <p className="mt-1 text-[14px] text-ink-soft">Si entran {CONFIG.minimoGrupo} o más, todos pagan como Pro.</p>
        <label className="mt-3 block">
          <span className="eyebrow mb-1.5 block text-ink-soft">Nombre de tu grupo</span>
          <input value={grupo} onChange={(e) => setGrupo(e.target.value.slice(0, 40))} placeholder="Paseadores San Isidro" className="h-12 w-full rounded-2xl border border-ink/15 bg-paper px-4 text-[16px] text-ink" />
        </label>
        <p className="mt-3 font-display text-[26px] font-bold tracking-wider text-ink">{codigo}</p>
        <button type="button" onClick={compartir} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-vino px-4 text-[14.5px] font-extrabold text-white active:scale-[0.98]">
          <Share2 size={16} aria-hidden /> {copiado ? 'Copiado' : 'Compartir invitación'}
        </button>
      </section>
    </div>
  )
}
