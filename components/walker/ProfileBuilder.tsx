'use client'

import { Check, Clock, MapPin, Minus, Plus, Star } from 'lucide-react'
import { CONFIG, METODOS_COBRO_PASEADOR, NOMBRE_CORTO, pagoPaseador, textoComision } from '@/lib/config'
import { SPOTS } from '@/lib/geo'
import { ParquesEnMapa } from './ParquesEnMapa'
import { SIZE_INFO } from '@/lib/schedule'
import type { Size } from '@/lib/types'
import { inputBase } from '@/lib/ui'
import { COBRO_VACIO, cobroRegistrado, DAYS, erroresCobro, EXPERIENCE, INCLUDES, STYLES, TIMES, type WalkerApplication } from '@/lib/walkerStore'
import { cn } from '@/lib/utils'
import { parquesEnZona } from '@/lib/zona'
import { VerMas } from '@/components/ui/VerMas'

const BIO_IDEAS = [
  'Estudio en la zona y conozco los parques como mi casa.',
  'Tengo perro y sé lo que es dejarlo en buenas manos.',
  'Te mando fotos y te cuento cómo le fue, sin que me lo pidas.',
  'Con paciencia y correa corta: la seguridad primero.',
]

function Chips({ options, value, onChange, max, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number; label: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o)
        const blocked = !on && max !== undefined && value.length >= max
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            disabled={blocked}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              'min-h-11 flex items-center gap-1 rounded-full border px-3.5 py-2 text-[14px] font-bold transition active:scale-95 disabled:opacity-40',
              on ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink-soft',
            )}
          >
            {on && <Check size={13} strokeWidth={3.5} />}
            {o}
          </button>
        )
      })}
    </div>
  )
}

/** Qué tan completo está el perfil (para animar a llenarlo). */
export function completeness(a: WalkerApplication) {
  const p = a.profile
  const checks = [
    !!a.photo,
    cobroRegistrado(a.cobro),
    p.bio.trim().length >= 60,
    p.includes.length >= 3,
    p.style.length >= 2,
    p.sizes.length >= 1,
    p.days.length >= 1 && p.times.length >= 1,
    p.spots.length >= 1,
    !!p.experience,
  ]
  return { pct: Math.round((checks.filter(Boolean).length / checks.length) * 100), checks }
}

export function profileValid(a: WalkerApplication) {
  const p = a.profile
  // Los puntos de paseo tienen que estar dentro de la zona o en el borde (lib/zona.ts)
  return (
    !!a.photo &&
    p.bio.trim().length >= 30 &&
    p.sizes.length >= 1 &&
    p.days.length >= 1 &&
    p.times.length >= 1 &&
    p.spots.length >= 1 &&
    parquesEnZona(p.spots) &&
    !!p.experience &&
    // Sin dónde cobrar no puede recibir solicitudes
    cobroRegistrado(a.cobro)
  )
}

function Field({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-ink-soft">{title}</p>
      {hint && <div className="mb-2 mt-0.5 text-[14px] leading-snug text-ink-soft">{hint}</div>}
      <div className={hint ? '' : 'mt-1.5'}>{children}</div>
    </div>
  )
}

/** Vista previa: así ve el cliente la tarjeta del paseador. */
export function PreviewCard({ a }: { a: WalkerApplication }) {
  const p = a.profile
  const name = `${a.person.firstName || 'Tu nombre'} ${a.person.lastName.charAt(0) ? a.person.lastName.charAt(0).toUpperCase() + '.' : ''}`
  return (
    <div className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
      <div className="flex gap-4">
        <div className="relative shrink-0">
          {a.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.photo} alt="Tu foto" className="h-[104px] w-[82px] rounded-t-[41px] rounded-b-2xl border border-ink/10 object-cover" />
          ) : (
            <div className="grid h-[104px] w-[82px] place-items-center rounded-t-[41px] rounded-b-2xl border-2 border-dashed border-ink/20 bg-sand text-[12px] font-bold text-ink-soft">Tu foto</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-[21px] font-bold leading-[1.05] text-ink">{name}</h3>
            <p className="font-display text-[21px] font-bold leading-none text-ink">
              S/{p.rate}
              <span className="block text-right font-sans text-[12px] font-semibold text-ink-soft">por hora</span>
            </p>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[14px] font-bold text-forest">
            <MapPin size={12} /> Estudia o vive en {a.person.district}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{[a.person.career, a.person.cycle].filter(Boolean).join(' · ') || 'Tu carrera y ciclo'}</p>
          <p className="mt-1.5 flex items-center gap-1 text-[14px] font-bold text-ink">
            <Star size={13} className="fill-gold text-gold" /> Nuevo en {NOMBRE_CORTO}
          </p>
        </div>
      </div>
      {p.bio && <p className="mt-3 font-display text-[14.5px] italic leading-snug text-ink">“{p.bio}”</p>}
      {p.includes.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow text-ink-soft">Incluye</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {p.includes.slice(0, 4).map((i) => (
              <span key={i} className="rounded-full bg-forest-50 px-2.5 py-1 text-[12px] font-bold text-forest">
                {i}
              </span>
            ))}
            {p.includes.length > 4 && <span className="rounded-full bg-sand px-2.5 py-1 text-[12px] font-bold text-ink-soft">+{p.includes.length - 4}</span>}
          </div>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[14px] text-ink-soft">
        <Clock size={13} /> {p.days.length ? p.days.join(' · ') : 'Tus días'} · {p.times.length ? p.times.map((t) => t.split(' ')[0]).join(', ') : 'tus horarios'}
      </p>
    </div>
  )
}

/** Dónde cobra el paseador: Yape o Plin, su celular y el nombre del titular. El número no lo ve nunca el dueño. */
function CobroEditor({ app, onChange }: { app: WalkerApplication; onChange: (fn: (a: WalkerApplication) => WalkerApplication) => void }) {
  const c = app.cobro ?? COBRO_VACIO
  const errores = erroresCobro(c)
  const set = (patch: Partial<typeof c>) => onChange((a) => ({ ...a, cobro: { ...(a.cobro ?? COBRO_VACIO), ...patch } }))
  // Solo se muestra un error después de que la persona empezó a escribir (no al abrir la pantalla)
  const tocado = c.metodo !== '' || c.telefono !== '' || c.titular !== ''
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Dónde cobras">
        {METODOS_COBRO_PASEADOR.map((m) => {
          const on = c.metodo === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ metodo: m.id })}
              className={cn(
                'min-h-11 rounded-2xl border-2 px-3 py-2.5 text-[14px] font-extrabold transition active:scale-95',
                on ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink/10 bg-paper text-ink-soft',
              )}
            >
              {m.nombre}
            </button>
          )
        })}
      </div>
      <label className="block">
        <span className="mb-1 block text-[14px] font-bold text-ink">Celular de tu {c.metodo === 'plin' ? 'Plin' : c.metodo === 'yape' ? 'Yape' : 'Yape o Plin'}</span>
        <input
          value={c.telefono}
          onChange={(e) => set({ telefono: e.target.value.slice(0, 20) })}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="9XX XXX XXX"
          aria-invalid={tocado && errores.telefono ? true : undefined}
          className={inputBase}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[14px] font-bold text-ink">Nombre del titular</span>
        <input
          value={c.titular}
          onChange={(e) => set({ titular: e.target.value.slice(0, 60) })}
          autoComplete="off"
          placeholder="Como sale en tu Yape o Plin"
          aria-invalid={tocado && errores.titular ? true : undefined}
          className={inputBase}
        />
      </label>
      {tocado && !cobroRegistrado(c) && (
        <p role="status" className="rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900">
          {errores.metodo ?? errores.telefono ?? errores.titular}
        </p>
      )}
      {cobroRegistrado(c) && <p className="rounded-2xl bg-forest-50 p-3 text-[14px] font-semibold leading-snug text-forest">Listo: ya puedes recibir solicitudes.</p>}
    </div>
  )
}

/** Editor del perfil público del paseador. */
export function ProfileBuilder({ app, onChange }: { app: WalkerApplication; onChange: (fn: (a: WalkerApplication) => WalkerApplication) => void }) {
  const p = app.profile
  const set = (patch: Partial<WalkerApplication['profile']>) => onChange((a) => ({ ...a, profile: { ...a.profile, ...patch } }))
  const c = completeness(app)
  // Primero los parques de su distrito
  const spots = [...SPOTS].sort((a, b) => Number(b.district === app.person.district) - Number(a.district === app.person.district))

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-brand-50 p-3.5 ring-1 ring-brand-200">
        <div className="flex items-center justify-between text-[12.5px] font-extrabold text-brand-800">
          <span>Tu perfil está al {c.pct} %</span>
          <span>{c.pct >= 100 ? '¡Listo para destacar!' : 'Mientras más completo, más reservas'}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${c.pct}%` }} />
        </div>
      </div>

      <Field title="Sobre ti" hint="Dos o tres líneas con tu estilo. Lo primero que leen los dueños. (mín. 30 caracteres)">
        <textarea
          value={p.bio}
          onChange={(e) => set({ bio: e.target.value.slice(0, 280) })}
          rows={4}
          placeholder="Ej. Estudio Veterinaria en la UPCH y vivo a 5 cuadras del Bosque El Olivar..."
          className={cn(inputBase, 'h-auto resize-none py-3 leading-snug')}
        />
        <div className="mt-1.5 flex items-center justify-between text-[12px] text-ink-soft">
          <span>Ideas: toca una para agregarla</span>
          <span>{p.bio.length}/280</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {BIO_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => set({ bio: (p.bio ? p.bio.trim() + ' ' : '') + idea })}
              className="min-h-11 rounded-full bg-sand px-3 py-1.5 text-left text-[14px] font-semibold text-ink-soft active:scale-95"
            >
              + {idea}
            </button>
          ))}
        </div>
      </Field>

      <Field title="¿Qué incluye tu paseo?" hint="Opcional, pero es lo que más capta la atención. Marca solo lo que de verdad cumplirás.">
        <Chips label="Qué incluye" options={INCLUDES} value={p.includes} onChange={(v) => set({ includes: v })} />
      </Field>

      <Field title="Tu estilo" hint="Elige hasta 3.">
        <Chips label="Estilo" options={STYLES} value={p.style} onChange={(v) => set({ style: v })} max={3} />
      </Field>

      <Field title="Tamaños de perro que aceptas" hint="Nunca mezclas tamaños: elige solo los que manejas con confianza.">
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as Size[]).map((s) => {
            const on = p.sizes.includes(s)
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => set({ sizes: on ? p.sizes.filter((x) => x !== s) : [...p.sizes, s] })}
                className={cn('min-h-11 flex-1 rounded-2xl border-2 px-2 py-2.5 text-center transition active:scale-95', on ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper')}
              >
                <span className="block text-[14px] font-extrabold text-ink">{SIZE_INFO[s].label}</span>
                <span className="block text-[12px] text-ink-soft">{SIZE_INFO[s].range}</span>
              </button>
            )
          })}
        </div>
      </Field>

      <Field title="Tus días y horarios">
        <Chips label="Días" options={DAYS} value={p.days} onChange={(v) => set({ days: v })} />
        <div className="mt-2">
          <Chips label="Horarios" options={TIMES} value={p.times} onChange={(v) => set({ times: v })} />
        </div>
      </Field>

      <Field title="¿Dónde sueles pasear?" hint="Elige hasta 3 parques.">
        <Chips
          label="Parques"
          options={spots.map((s) => s.name)}
          value={p.spots.map((id) => SPOTS.find((s) => s.id === id)?.name ?? '').filter(Boolean)}
          max={3}
          onChange={(names) => set({ spots: names.map((n) => SPOTS.find((s) => s.name === n)?.id ?? '').filter(Boolean) })}
        />
        <div className="mt-3">
          <ParquesEnMapa elegidos={p.spots} max={3} onChange={(ids) => set({ spots: ids })} />
        </div>
      </Field>

      <Field title="Tu tarifa por hora, por perro" hint={
        <>
          <p>
            Referencia: San Isidro S/ {CONFIG.referenciaMercado.sanIsidro.min}–{CONFIG.referenciaMercado.sanIsidro.max} · Jesús María S/ {CONFIG.referenciaMercado.jesusMaria.min}–
            {CONFIG.referenciaMercado.jesusMaria.max}. {textoComision()}
          </p>
          <VerMas>Por perro en grupo. Fuente: {CONFIG.referenciaMercado.fuente}.</VerMas>
        </>
      }>
        <div className="flex h-12 items-center justify-between rounded-2xl border border-ink/15 bg-paper px-1.5">
          <button type="button" aria-label="Bajar tarifa" onClick={() => set({ rate: Math.max(CONFIG.tarifaMinima, p.rate - 1) })} className="grid h-11 w-11 place-items-center rounded-xl bg-sand active:scale-90">
            <Minus size={16} />
          </button>
          <span className="text-[16px] font-extrabold text-ink">
            S/ {p.rate} <span className="text-[14px] font-semibold text-ink-soft">→ recibes S/ {pagoPaseador(p.rate).toFixed(2)}</span>
          </span>
          <button type="button" aria-label="Subir tarifa" onClick={() => set({ rate: Math.min(CONFIG.tarifaMaxima, p.rate + 1) })} className="grid h-11 w-11 place-items-center rounded-xl bg-sand active:scale-90">
            <Plus size={16} />
          </button>
        </div>
      </Field>

      <Field
        title="Dónde cobras"
        hint={
          <>
            <p>
              {NOMBRE_CORTO} te paga aquí. Solo lo ves tú y el equipo.
            </p>
            <p className="mt-0.5">
              De cada S/ {app.profile.rate} recibes S/ {pagoPaseador(app.profile.rate).toFixed(2)}.
            </p>
            <VerMas>Sin esto no puedes recibir solicitudes. El dueño nunca ve tu número.</VerMas>
          </>
        }
      >
        <CobroEditor app={app} onChange={onChange} />
      </Field>

      <Field title="Tu experiencia con perros">
        <Chips label="Experiencia" options={EXPERIENCE} value={p.experience ? [p.experience] : []} onChange={(v) => set({ experience: v[v.length - 1] ?? '' })} />
      </Field>

      <div>
        <p className="eyebrow mb-2 text-ink-soft">Así te verán los clientes</p>
        <PreviewCard a={app} />
      </div>
    </div>
  )
}
