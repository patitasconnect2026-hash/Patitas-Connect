'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Check, LogOut, MapPin, ShieldCheck } from 'lucide-react'
import { NOMBRE_APP } from '@/lib/config'
import { UNIVERSITIES } from '@/lib/data'
import { bloquesParaMostrar, WALKER_BLOCKS, TERMS_VERSION } from '@/lib/legal'
import { shrinkImage } from '@/lib/store'
import type { District } from '@/lib/types'
import { btnInk, btnPrimary, inputBase } from '@/lib/ui'
import { ageFrom, estadoVisible, type WalkerApplication } from '@/lib/walkerStore'
import { cn } from '@/lib/utils'
import { TermsBlocks } from '../TermsBlocks'
import { Logo } from '../ui/Logo'
import { profileValid, ProfileBuilder } from './ProfileBuilder'
import { etiquetaDeExamen } from '@/lib/respuestasEscritas'
import { QuizStep } from './QuizStep'
import { CursoStep } from './CursoStep'
import { estadoDelCurso } from '@/lib/quiz'
import { VerMas } from '../ui/VerMas'
import { reglaNuevoPaseador, reglaPrimerPaseoPaseador } from '@/lib/verificacion'

const DEMO_CODE = '482913'
// Eran 7: la autorización de consultas ahora va junto a los acuerdos (pedido de Yahrod, 30 de octubre de 2026).
const TOTAL = 6

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 9)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ')
}

const off = 'disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none'
const slide = { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -28 }, transition: { duration: 0.22 } }

/** En qué paso debe retomar quien dejó la postulación a medias. */
export function firstOpenStep(a: WalkerApplication): number {
  const termsOk = WALKER_BLOCKS.every((b) => a.consent[b.id])
  if (!a.phone) return 1
  if (!termsOk || !a.consults.consent) return 2
  if (!a.person.dni) return 3
  if (!profileValid(a)) return 4
  if (!a.curso?.aprobado) return 5
  if (!a.quiz || a.quiz.verdict === 'fail') return 5
  return 6
}

/**
 * ¿La postulación pasó TODOS los pasos (teléfono, términos, datos, perfil, curso, examen y autorización de consultas)?
 * Solo entonces se puede enviar y solo entonces la pantalla «En revisión» tiene sentido.
 */
export const postulacionCompleta = (a: WalkerApplication): boolean => firstOpenStep(a) === TOTAL

/**
 * Lo mismo que `postulacionCompleta`, sin pedir el DNI ni la foto. Sirve en un teléfono donde la postulación se armó con lo que
 * guardó la base: la base no devuelve el DNI (solo lo lee el equipo) ni la foto (se queda en el teléfono donde se tomó), y la
 * persona ya los dio al postular.
 */
export const postulacionCompletaSinDniNiFoto = (a: WalkerApplication): boolean =>
  postulacionCompleta({ ...a, person: { ...a.person, dni: a.person.dni || '00000000' }, photo: a.photo ?? 'foto-en-otro-telefono' })

/**
 * Con una postulación guardada, ¿toca mostrar los pasos? Sí si es un borrador o si dice «enviada» pero le faltan pasos
 * (por ejemplo, una que quedó guardada a medias). «En revisión» solo se ve cuando está completa y enviada.
 */
export const debeVerLosPasos = (a: WalkerApplication): boolean => estadoVisible(a) === 'borrador' || (estadoVisible(a) === 'enviada' && !postulacionCompleta(a))

export function WalkerOnboarding({
  app,
  onChange,
  onSubmit,
  onExit,
  cuenta,
}: {
  app: WalkerApplication
  onChange: (fn: (a: WalkerApplication) => WalkerApplication) => void
  onSubmit: () => void
  onExit: () => void
  /** Solo con servidor y con sesión: ya hay celular y nombre (no se piden otra vez) y en vez de «Atrás» hay «Salir». */
  cuenta?: { correo: string; onSalir: () => void }
}) {
  const [step, setStep] = useState(() => firstOpenStep(app))
  const [phone, setPhone] = useState(app.phone)
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [secs, setSecs] = useState(30)
  const [photoErr, setPhotoErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const p = app.person
  const setPerson = (patch: Partial<WalkerApplication['person']>) => onChange((a) => ({ ...a, person: { ...a.person, ...patch } }))

  useEffect(() => {
    if (step !== 1 || !codeSent || secs <= 0) return
    const t = setTimeout(() => setSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, codeSent, secs])

  useEffect(() => {
    if (step !== 1 || !codeSent || code.length < 6) return
    setVerifying(true)
    const t = setTimeout(() => {
      setVerifying(false)
      onChange((a) => ({ ...a, phone }))
      setStep(2)
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step, codeSent])

  const phoneOk = phone.replace(/\D/g, '').length === 9
  const termsOk = WALKER_BLOCKS.every((b) => app.consent[b.id])
  const age = ageFrom(p.birth)
  const maxBirth = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().slice(0, 10)
  }, [])
  const dniOk = /^\d{8}$/.test(p.dni)
  const dataOk = !!(p.firstName.trim() && p.lastName.trim() && dniOk && age >= 18 && p.university && p.career.trim() && app.photo)
  const consentOk = app.consults.consent
  const paso2Ok = termsOk && consentOk
  const cursoOk = !!app.curso?.aprobado
  // El resultado del curso se ve antes de pasar al examen (si ya lo había aprobado al volver, sigue de largo).
  const [cursoListo, setCursoListo] = useState(() => !!app.curso?.aprobado)
  const quizOk = cursoOk && !!app.quiz && app.quiz.verdict !== 'fail'

  const back = () => (step <= 1 ? onExit() : setStep((s) => s - 1))

  const pickPhoto = async (f?: File) => {
    if (!f) return
    try {
      setPhotoErr('')
      const img = await shrinkImage(f, 520)
      onChange((a) => ({ ...a, photo: img }))
    } catch {
      setPhotoErr('No pudimos usar esa foto. Elige otra.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const acceptTerms = () => {
    onChange((a) => ({ ...a, consentAt: new Date().toISOString(), consentVersion: TERMS_VERSION }))
    setStep(3)
  }

  const submit = () => {
    onChange((a) => ({ ...a, status: 'enviada' }))
    onSubmit()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <header className="flex items-center gap-3 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        {cuenta && step <= (app.phone ? 2 : 1) ? (
          <button type="button" onClick={cuenta.onSalir} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-sand px-3.5 text-[14px] font-extrabold text-ink active:scale-95">
            <LogOut size={15} aria-hidden /> Salir
          </button>
        ) : (
          <button type="button" onClick={back} aria-label="Atrás" className="grid h-11 w-11 place-items-center rounded-full bg-sand text-ink active:scale-95">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex flex-1 gap-1" aria-label={`Paso ${step} de ${TOTAL}`}>
          {Array.from({ length: TOTAL }, (_, k) => k + 1).map((i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <motion.span className="block h-full rounded-full bg-brand-600" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
            </span>
          ))}
        </div>
        <Logo size={22} className="opacity-0" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
            <motion.div key="s1" {...slide}>
              <p className="eyebrow text-brand-700">Paso 1 de {TOTAL}</p>
              <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">{codeSent ? 'Ingresa el código' : '¿Cuál es tu celular?'}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                {codeSent ? 'Todavía no enviamos SMS. Usa el código de demostración.' : 'Un celular = una cuenta. Por ahora el código es de demostración.'}
              </p>
              {!codeSent ? (
                <div className="mt-6 flex items-center gap-2">
                  <span className="grid h-12 shrink-0 place-items-center rounded-2xl border border-ink/15 bg-paper px-3.5 text-[15px] font-extrabold text-ink">🇵🇪 +51</span>
                  <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="9XX XXX XXX" className={cn(inputBase, 'tracking-wide')} autoFocus />
                </div>
              ) : (
                <>
                  <div className="relative mt-6">
                    <div className="grid grid-cols-6 gap-2" aria-hidden>
                      {Array.from({ length: 6 }, (_, i) => (
                        <span key={i} className={cn('grid h-14 place-items-center rounded-2xl border-2 bg-paper font-display text-[26px] font-bold text-ink', i === code.length ? 'border-brand-600' : 'border-ink/12')}>
                          {code[i] ?? ''}
                        </span>
                      ))}
                    </div>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-label="Código de 6 dígitos"
                      className="absolute inset-0 h-full w-full cursor-text text-[16px] opacity-0"
                      autoFocus
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[14px]">
                    <span className="font-semibold text-ink-soft">Demostración: no se envía SMS</span>
                    <button type="button" onClick={() => setCode(DEMO_CODE)} className="min-h-11 font-extrabold text-brand-700 underline underline-offset-4">
                      Usar código de demostración
                    </button>
                  </div>
                  {verifying && <p className="mt-5 text-[14px] font-bold text-forest">Verificando…</p>}
                </>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" {...slide} className="space-y-4">
              <div>
                <p className="eyebrow text-brand-700">Paso 2 de {TOTAL}</p>
                <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Lo que aceptas</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  Siete acuerdos cortos, uno por uno. Incluye que tu DNI se muestre a los clientes: léelo con calma.
                </p>
              </div>
              <TermsBlocks blocks={bloquesParaMostrar(WALKER_BLOCKS, !!cuenta)} value={app.consent} onChange={(v) => onChange((a) => ({ ...a, consent: v }))} />
              <div className="space-y-2 rounded-2xl bg-sand p-3.5">
                <p className="text-[14px] font-extrabold text-ink">Verificación en vivo</p>
                <p className="text-[14px] leading-snug text-ink-soft">Hacemos las consultas oficiales contigo, por WhatsApp.</p>
                <VerMas>No subes capturas ni documentos. Ten tu DNI a la mano. El equipo te escribe para coordinar el horario (llamada o videollamada).</VerMas>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/15 bg-paper p-3.5">
                  <input
                    type="checkbox"
                    checked={consentOk}
                    onChange={(e) => onChange((a) => ({ ...a, consults: { ...a.consults, consent: e.target.checked } }))}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                  />
                  <span className="text-[14px] font-semibold leading-snug text-ink">
                    Autorizo a {NOMBRE_APP} a consultar registros oficiales con mi DNI, en vivo por WhatsApp, solo para decidir mi ingreso.
                  </span>
                </label>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" {...slide} className="space-y-5">
              <div>
                <p className="eyebrow text-brand-700">Paso 3 de {TOTAL}</p>
                <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Tus datos</h2>
                {cuenta?.correo && <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">Tu cuenta: {cuenta.correo}</p>}
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">Nombre y DNI deben coincidir con tu documento. Los cotejamos en la videollamada.</p>
              </div>

              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 relative shrink-0 active:scale-95" aria-label="Subir foto de perfil">
                  {app.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.photo} alt="Tu foto" className="h-[112px] w-[88px] rounded-t-[44px] rounded-b-2xl border border-ink/10 object-cover" />
                  ) : (
                    <span className="grid h-[112px] w-[88px] place-items-center rounded-t-[44px] rounded-b-2xl border-2 border-dashed border-brand-600/50 bg-brand-50 text-brand-700">
                      <Camera size={26} />
                    </span>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                <div>
                  <p className="text-[14px] font-extrabold text-ink">Tu foto de perfil</p>
                  <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">De frente, sonriendo, con buena luz y sin lentes de sol. Es lo primero que ve el cliente.</p>
                  {photoErr && <p className="mt-1 text-[14px] font-semibold text-red-600">{photoErr}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Nombre</span>
                  <input value={p.firstName} onChange={(e) => setPerson({ firstName: e.target.value })} className={inputBase} maxLength={30} autoComplete="given-name" />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Apellido</span>
                  <input value={p.lastName} onChange={(e) => setPerson({ lastName: e.target.value })} className={inputBase} maxLength={30} autoComplete="family-name" />
                </label>
              </div>

              <label className="block">
                <span className="eyebrow mb-1.5 block text-ink-soft">DNI (8 dígitos)</span>
                <input value={p.dni} onChange={(e) => setPerson({ dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} inputMode="numeric" className={cn(inputBase, 'tracking-[0.2em]')} placeholder="00000000" />
                <span className="mt-1.5 block text-[12px] text-ink-soft">Se mostrará oculto (••••1234) y los clientes con cuenta podrán abrirlo, con registro de acceso.</span>
              </label>

              <label className="block">
                <span className="eyebrow mb-1.5 block text-ink-soft">Fecha de nacimiento</span>
                <input type="date" value={p.birth} max={maxBirth} onChange={(e) => setPerson({ birth: e.target.value })} className={inputBase} />
                <span className={cn('mt-1.5 block text-[14px] font-semibold', p.birth && age < 18 ? 'text-red-600' : 'text-ink-soft')}>
                  {p.birth && age < 18 ? 'Debes tener 18 años o más para ser paseador.' : 'Debes tener 18 años o más.'}
                </span>
              </label>

              <fieldset>
                <legend className="eyebrow mb-1.5 text-ink-soft">¿En qué distrito vives o estudias?</legend>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['San Isidro', 'Jesús María'] as District[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPerson({ district: d })}
                      aria-pressed={p.district === d}
                      className={cn('min-h-11 flex items-center gap-2 rounded-2xl border-2 px-3.5 py-3.5 text-left transition active:scale-[0.98]', p.district === d ? 'border-brand-600 bg-brand-50' : 'border-ink/10 bg-paper')}
                    >
                      <MapPin size={17} className="text-brand-700" />
                      <span className="text-[14.5px] font-extrabold text-ink">{d}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="eyebrow mb-1.5 block text-ink-soft">Universidad o instituto</span>
                <select value={p.university} onChange={(e) => setPerson({ university: e.target.value })} className={inputBase}>
                  <option value="">Elige una opción</option>
                  {UNIVERSITIES.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Carrera</span>
                  <input value={p.career} onChange={(e) => setPerson({ career: e.target.value })} className={inputBase} placeholder="Ej. Veterinaria" maxLength={40} />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1.5 block text-ink-soft">Ciclo</span>
                  <input value={p.cycle} onChange={(e) => setPerson({ cycle: e.target.value })} className={inputBase} placeholder="3.º ciclo" maxLength={14} />
                </label>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" {...slide} className="space-y-4">
              <div>
                <p className="eyebrow text-brand-700">Paso 4 de {TOTAL}</p>
                <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Tu perfil público</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">Así te eligen los dueños. Un perfil completo recibe más reservas.</p>
              </div>
              <ProfileBuilder app={app} onChange={onChange} />
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" {...slide}>
              {cursoOk && cursoListo ? (
                <QuizStep
                  result={app.quiz}
                  onDone={(r) => onChange((a) => ({ ...a, quiz: r, quizAttempts: a.quizAttempts + 1 }))}
                  onContinue={() => setStep(6)}
                />
              ) : (
                <CursoStep
                  curso={app.curso}
                  intentos={app.cursoAttempts ?? 0}
                  onDone={(r) =>
                    onChange((a) => ({
                      ...a,
                      curso: r,
                      // Un ciclo nuevo (primer intento o ya pasaron los 3 meses) vuelve a contar desde 1.
                      cursoAttempts: estadoDelCurso(a.curso, a.cursoAttempts ?? 0, new Date()).estado === 'pendiente' ? 1 : (a.cursoAttempts ?? 0) + 1,
                    }))
                  }
                  onContinue={() => setCursoListo(true)}
                />
              )}
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="s6" {...slide} className="space-y-4">
              <div>
                <p className="eyebrow text-brand-700">Paso 6 de {TOTAL}</p>
                <h2 className="font-display text-[34px] font-bold leading-[1.05] text-ink">Revisa y envía</h2>
              </div>
              <ul className="space-y-2">
                {[
                  { ok: true, t: `Celular: +51 ${app.phone}` },
                  { ok: termsOk, t: 'Acuerdos aceptados' },
                  { ok: dataOk, t: `Datos y foto de ${p.firstName || 'ti'}` },
                  { ok: profileValid(app), t: 'Perfil público completo' },
                  { ok: quizOk, t: app.quiz ? etiquetaDeExamen(app.quiz) : 'Examen pendiente' },
                  { ok: consentOk, t: 'Autorización de consultas en vivo' },
                ].map((r) => (
                  <li key={r.t} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-[14px] font-bold text-ink">
                    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', r.ok ? 'bg-forest text-white' : 'bg-red-100 text-red-600')}>{r.ok ? <Check size={14} strokeWidth={3.5} /> : '!'}</span>
                    {r.t}
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
                <p className="flex items-center gap-2 text-[14px] font-extrabold text-brand-800">
                  <ShieldCheck size={17} /> Qué pasa ahora
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] leading-snug text-brand-800">
                  <li>Te escribimos por WhatsApp para coordinar la verificación en vivo.</li>
                  <li>Hacemos las consultas oficiales contigo, por WhatsApp.</li>
                  <li>{reglaPrimerPaseoPaseador()}</li>
                  <li>{reglaNuevoPaseador()}</li>
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="space-y-2 border-t border-ink/10 bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {step === 1 && !codeSent && (
          <button
            type="button"
            disabled={!phoneOk}
            onClick={() => {
              setSecs(30)
              setCodeSent(true)
            }}
            className={cn(btnPrimary, 'h-14 w-full text-[16px]', off)}
          >
            Enviar código <ArrowRight size={19} strokeWidth={2.6} />
          </button>
        )}
        {step === 2 && (
          <button type="button" disabled={!paso2Ok} onClick={acceptTerms} className={cn(btnPrimary, 'h-14 w-full text-[16px]', off)}>
            {paso2Ok ? 'Acepto y continúo' : termsOk ? 'Marca la autorización' : `Acepta los ${WALKER_BLOCKS.length} acuerdos para seguir`} {paso2Ok && <ArrowRight size={19} strokeWidth={2.6} />}
          </button>
        )}
        {step === 3 && (
          <button type="button" disabled={!dataOk} onClick={() => setStep(4)} className={cn(btnPrimary, 'h-14 w-full text-[16px]', off)}>
            {dataOk ? 'Continuar' : app.photo ? 'Completa todos los datos' : 'Falta tu foto de perfil'} {dataOk && <ArrowRight size={19} strokeWidth={2.6} />}
          </button>
        )}
        {step === 4 && (
          <button type="button" disabled={!profileValid(app)} onClick={() => setStep(5)} className={cn(btnPrimary, 'h-14 w-full text-[16px]', off)}>
            {profileValid(app) ? 'Guardar perfil y seguir' : 'Completa lo obligatorio del perfil'} {profileValid(app) && <ArrowRight size={19} strokeWidth={2.6} />}
          </button>
        )}
        {step === 6 && (
          <button type="button" disabled={!(paso2Ok && dataOk && profileValid(app) && quizOk)} onClick={submit} className={cn(btnInk, 'h-14 w-full text-[16px]', off)}>
            Enviar mi postulación <ArrowRight size={19} strokeWidth={2.6} />
          </button>
        )}
        {step === 5 && quizOk && app.quiz && app.quiz.verdict !== 'fail' && null}
      </footer>
    </div>
  )
}
