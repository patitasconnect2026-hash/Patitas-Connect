'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Eye, EyeOff, FileCheck2, MessageCircle, Minus, Plus, ShieldCheck, ShieldX } from 'lucide-react'
import { MAX_INTENTOS_CURSO, PASS_PCT } from '@/lib/quiz'
import { RespuestasDelExamen } from './RespuestasDelExamen'
import { ResumenIa } from './ResumenIa'
import { CONFIG, NOMBRE_APP } from '@/lib/config'
import { enlaceWhatsApp } from '@/lib/telefono'
import { useAhora, useCuentaSoloLectura, useFotosPaseo, useMostrarEjemplos, usePostulacion, usePostulacionesDelEquipo } from '@/lib/datos'
import { TEXTO_REVISION_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { selfieDeHoy } from '@/lib/selfie'
import { SelfieEnPaseo } from '../SelfieDelDia'
import { ageFrom, casillasQueFaltan, type WalkerApplication, celularDeCobro, cincoCasillasMarcadas, cobroRegistrado, CONSULT_ITEMS, estadoVisible, maskDni, type AppStatus } from '@/lib/walkerStore'
import { TEXTO_ADMIN } from '@/lib/adminTextos'
import { cn } from '@/lib/utils'
import { LogoMark } from '../ui/Logo'
import { casillasMarcadas, COMPROBACIONES, llevaEtiquetaNuevo, REGLA_NUEVO, textoCantidadComprobaciones } from '@/lib/verificacion'
import { AvisoAdmin } from './AvisoAdmin'
import { BotonSalir } from './BotonSalir'
import { InterruptorEjemplos } from '../ui/InterruptorEjemplos'
import { ColaDeCasos } from './ColaDeCasos'
import { ColaDePagos } from './ColaDePagos'
import { FotosParaMirar } from './FotosParaMirar'
import { Estadisticas } from './Estadisticas'

const STATUS: Record<AppStatus, { label: string; tone: string }> = {
  borrador: { label: 'Borrador (aún no la envía)', tone: 'bg-sand text-ink-soft' },
  enviada: { label: 'En revisión', tone: 'bg-brand-100 text-brand-800' },
  supervisado: { label: 'Aprobado · paseos acompañados', tone: 'bg-forest-50 text-forest' },
  activo: { label: 'Activo', tone: 'bg-forest text-white' },
  rechazada: { label: 'Rechazada', tone: 'bg-red-100 text-red-700' },
}

function Check2({ on, onChange, disabled, children }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('flex items-center gap-3 rounded-2xl border p-3.5 transition', disabled ? 'cursor-default' : 'cursor-pointer', on ? 'border-forest/30 bg-forest-50' : 'border-ink/10 bg-paper')}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-forest" />
      <span className="text-[14px] font-bold text-ink">{children}</span>
    </label>
  )
}

/**
 * Panel interno de revisión. Sin servidor (modo local) NO está protegido: no hay contraseña ni inicio de sesión
 * (ver `lib/adminTextos.ts`) y lee la postulación guardada en este navegador. Con servidor, `AdminAcceso` solo lo muestra
 * a una cuenta con rol «equipo» y le pasa `equipo` (botón «Salir»): las postulaciones salen de la base (todas las
 * enviadas) y cada decisión se guarda allá. Una postulación solo figura como aprobada si el equipo marcó las casillas
 * (`estadoVisible`).
 */
export function AdminPanel({ equipo }: { equipo?: { onSalir: () => Promise<void> } } = {}) {
  const local = usePostulacion()
  // Con servidor y sesión del equipo: las postulaciones salen de la base y el equipo elige cuál revisar.
  const revision = usePostulacionesDelEquipo(!!equipo)
  const [elegida, setElegida] = useState<string | null>(null)
  const delServidor = revision.aplica ? (revision.lista.find((p) => p.id === elegida) ?? revision.lista[0] ?? null) : null
  const app = revision.aplica ? (delServidor?.app ?? null) : local.app
  const ready = revision.aplica || local.ready
  const update = (fn: (a: WalkerApplication) => WalkerApplication) => (revision.aplica ? (delServidor ? revision.cambiar(delServidor.id, fn) : undefined) : local.update(fn))
  const fotosDelDia = useFotosPaseo()
  const ahoraAdmin = useAhora()
  const [showDni, setShowDni] = useState(false)
  // «Mostrar ejemplos»: el mismo ajuste de la app del cliente (apagado en una cuenta real)
  const [mostrarEjemplos, setMostrarEjemplos] = useMostrarEjemplos(useCuentaSoloLectura())

  if (!ready) return <div className="min-h-dvh bg-canvas" />

  // Las seis comprobaciones (lib/verificacion.ts). La 6 se deduce de los paseos acompañados.
  const marcadas = app ? casillasMarcadas(app.review.comprobaciones, app.review.supervisedWalks) : []
  const cincoPrimeras = app ? cincoCasillasMarcadas(app) : false
  // El estado que se muestra: «aprobada» solo con las casillas marcadas.
  const visible: AppStatus = app ? estadoVisible(app) : 'borrador'

  return (
    <main className="min-h-dvh bg-canvas px-4 pb-16 pt-6 text-ink">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/paseador" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sand px-4 py-2.5 text-[14px] font-extrabold active:scale-95">
            <ArrowLeft size={16} /> App del paseador
          </Link>
          <div className="flex items-center gap-3">
            {equipo && <BotonSalir onSalir={equipo.onSalir} />}
            <LogoMark size={34} />
          </div>
        </header>

        <p className="eyebrow mt-8 text-brand-700">{equipo ? TEXTO_ADMIN.eyebrowEquipo : TEXTO_ADMIN.eyebrow}</p>
        <h1 className="font-display text-[40px] font-bold leading-[1.02] tracking-tight">{TEXTO_ADMIN.titulo}</h1>
        <AvisoAdmin conSesion={!!equipo} />

        {revision.aplica && <Estadisticas postulaciones={revision.lista} />}

        <InterruptorEjemplos activo={mostrarEjemplos} onChange={setMostrarEjemplos} className="mt-5" />

        <ColaDePagos postulacion={app} mostrarEjemplos={mostrarEjemplos} />

        <ColaDeCasos mostrarEjemplos={mostrarEjemplos} />

        <div className="mt-6">
          <FotosParaMirar />
        </div>

        <h2 className="mt-12 font-display text-[28px] font-bold leading-tight">Postulaciones</h2>
        {!CONFIG.cursoRevisado && <p className="mt-2 rounded-2xl bg-amber-50 p-3.5 text-[14px] font-semibold leading-snug text-amber-900">{TEXTO_ADMIN.cursoSinRevisar}</p>}

        {revision.aplica && (
          <div className="mt-4" aria-live="polite">
            {revision.estado === 'cargando' && <p className="text-[14px] font-semibold text-ink-soft">{TEXTO_REVISION_SERVIDOR.equipoCargando}</p>}
            {revision.estado === 'sin_conexion' && (
              <p role="alert" className="rounded-2xl bg-amber-50 p-3.5 text-[14px] font-semibold leading-snug text-amber-900">
                {TEXTO_REVISION_SERVIDOR.equipoLeerFallo}{' '}
                <button type="button" onClick={revision.recargar} className="min-h-11 font-extrabold underline underline-offset-4">
                  Reintentar
                </button>
              </p>
            )}
            {revision.error && (
              <p role="alert" className="mt-2 rounded-2xl bg-red-50 p-3.5 text-[14px] font-semibold leading-snug text-red-900">
                {revision.error}
              </p>
            )}
            {revision.guardando && <p className="mt-2 text-[14px] font-semibold text-ink-soft">{TEXTO_REVISION_SERVIDOR.equipoGuardando}</p>}
            {revision.lista.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Postulaciones enviadas">
                {revision.lista.map((p) => {
                  const estado = STATUS[estadoVisible(p.app)]
                  const activa = p.id === delServidor?.id
                  const nombre = [p.app.person.firstName, p.app.person.lastName].filter(Boolean).join(' ')
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={activa}
                        onClick={() => setElegida(p.id)}
                        className={cn(
                          'flex min-h-11 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-left active:scale-95',
                          activa ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-paper text-ink'
                        )}
                      >
                        {p.app.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.app.photo} alt="" className="h-9 w-9 shrink-0 rounded-full border border-ink/10 object-cover" />
                        ) : (
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-extrabold', activa ? 'bg-white/15 text-white' : 'bg-sand text-ink-soft')}>
                            {nombre ? nombre[0].toUpperCase() : '?'}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[11rem] truncate text-[14px] font-extrabold">{nombre || `Sin nombre · código ${p.app.code}`}</span>
                          <span className={cn('block text-[12px] font-bold', activa ? 'text-white/75' : 'text-ink-soft')}>{estado.label}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {!app || app.status === 'borrador' ? (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
            <p className="font-display text-[24px] font-bold">{app ? 'La postulación aún no fue enviada' : revision.aplica ? TEXTO_REVISION_SERVIDOR.equipoNinguna : 'No hay postulaciones'}</p>
            {!revision.aplica && (
              <>
                <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-ink-soft">Crea una cuenta de paseador y vuelve a revisarla aquí.</p>
                <Link href="/paseador" className="mt-5 inline-flex h-12 items-center rounded-full bg-brand-700 px-6 text-[14.5px] font-extrabold text-white shadow-press">
                  Ir a crear cuenta de paseador
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Candidato */}
            <section className="rounded-3xl border border-ink/10 bg-paper p-5 shadow-card">
              <div className="flex flex-wrap items-start gap-5">
                {app.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.photo} alt="" className="h-[120px] w-[94px] rounded-t-[47px] rounded-b-2xl border border-ink/10 object-cover" />
                ) : (
                  <span className="grid h-[120px] w-[94px] place-items-center rounded-t-[47px] rounded-b-2xl bg-sand text-ink-soft">Sin foto</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[30px] font-bold leading-none">
                      {app.person.firstName} {app.person.lastName}
                    </h2>
                    <span className={cn('rounded-full px-3 py-1 text-[12px] font-extrabold', STATUS[visible].tone)}>{STATUS[visible].label}</span>
                  </div>
                  <p className="mt-2 text-[14px] text-ink-soft">
                    {ageFrom(app.person.birth)} años · {app.person.district} · {[app.person.career, app.person.cycle ? `ciclo ${app.person.cycle}` : ''].filter(Boolean).join(' · ')} · {app.person.university}
                  </p>
                  <p className="mt-1 text-[14px] text-ink-soft">
                    {app.phone ? <>Celular +51 {app.phone}</> : 'Celular: no disponible'} · código <b>{app.code}</b>
                  </p>
                  <p className="mt-1 text-[14px] text-ink-soft">
                    {cobroRegistrado(app.cobro) ? (
                      <>
                        Cobra por <b>{app.cobro.metodo === 'plin' ? 'Plin' : 'Yape'}</b> · {celularDeCobro(app.cobro)} · {app.cobro.titular}
                      </>
                    ) : (
                      TEXTO_ADMIN.sinCobro
                    )}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] font-bold">
                    DNI <span className="tabular-nums tracking-[0.12em]">{showDni ? app.person.dni : maskDni(app.person.dni)}</span>
                    <button type="button" onClick={() => setShowDni((v) => !v)} className="min-h-11 inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-1 text-[14px] font-extrabold active:scale-95">
                      {showDni ? <EyeOff size={13} /> : <Eye size={13} />} {showDni ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </p>
                  <SelfieEnPaseo className="mt-3" foto={selfieDeHoy(fotosDelDia, delServidor?.id ?? `nuevo-${app.code}`, ahoraAdmin)} walker={{ esEjemplo: false }} />
                  <p className="mt-1 text-[14px] text-ink-soft">Términos {app.consentVersion} aceptados el {app.consentAt ? new Date(app.consentAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</p>
                </div>
              </div>
            </section>

            {/* Mini curso (Tarea 8): se muestra al lado del examen; la casilla «Examen aprobado» la marca el equipo */}
            <section className="rounded-3xl border border-ink/10 bg-paper p-5">
              <h3 className="font-display text-[24px] font-bold">Mini curso</h3>
              {app.curso ? (
                <p className="mt-2 text-[14px] leading-snug text-ink">
                  {app.curso.aprobado ? 'Terminó el mini curso y respondió el test' : 'Respondió el test y no alcanzó el mínimo'}: <b className="tabular-nums">{app.curso.pct} %</b> (mínimo {PASS_PCT} %) · intento{' '}
                  {app.cursoAttempts ?? 1} de {MAX_INTENTOS_CURSO}.
                </p>
              ) : (
                <p className="mt-2 rounded-2xl bg-sand p-3 text-[14px] font-semibold text-ink-soft">Todavía no lo hizo.</p>
              )}
              {!CONFIG.cursoRevisado && <p className="mt-2 text-[14px] font-semibold text-amber-900">{TEXTO_ADMIN.cursoSinRevisar}</p>}
            </section>

            {/* Examen: las respuestas escritas, por pregunta */}
            <RespuestasDelExamen
              quiz={app.quiz}
              intento={app.quizAttempts}
              ia={<ResumenIa paseadorId={delServidor?.id ?? null} quiz={app.quiz} persona={{ nombres: [app.person.firstName, app.person.lastName], dni: app.person.dni, telefono: app.phone }} />}
            />

            {/* Consultas en vivo, coordinadas por WhatsApp (ya no se agenda una videollamada en sala) */}
            <section className="rounded-3xl border border-ink/10 bg-paper p-5">
              <h3 className="font-display text-[24px] font-bold">Verificación en vivo</h3>
              <p className="mt-1 text-[14px] text-ink-soft">Autorización de consulta: {app.consults.consent ? 'sí, otorgada' : 'no otorgada'}.</p>
              <ul className="mt-3 space-y-2">
                {CONSULT_ITEMS.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-sand px-4 py-3 text-[14px]">
                    <FileCheck2 size={17} className="text-ink-soft" />
                    <span className="min-w-0 flex-1">
                      <b>{c.title}</b>
                    </span>
                    <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[14px] font-extrabold text-brand-800 underline underline-offset-2">
                      Consultar
                    </a>
                  </li>
                ))}
              </ul>

              {app.consults.consent &&
                (() => {
                  const enlace = app.phone
                    ? enlaceWhatsApp(app.phone, `Hola ${app.person.firstName}, somos del equipo de ${NOMBRE_APP}. Te escribimos para coordinar la verificación en vivo de tu postulación (DNI y consultas oficiales). ¿Tienes un momento?`)
                    : null
                  return enlace ? (
                    <a href={enlace} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest-50 px-4 py-2 text-[14px] font-extrabold text-forest active:scale-95">
                      <MessageCircle size={16} /> Escribirle por WhatsApp para verificar
                    </a>
                  ) : (
                    <p className="mt-3 text-[14px] font-semibold text-ink-soft">Sin celular válido para escribirle por WhatsApp.</p>
                  )
                })()}
            </section>

            {/* Decisión */}
            <section className="rounded-3xl border-2 border-ink p-5">
              <h3 className="font-display text-[24px] font-bold">{textoCantidadComprobaciones(marcadas.length)}</h3>
              <p className="mt-1 text-[14px] text-ink-soft">Son las mismas que ven el paseador y el dueño. Solo se muestran las marcadas.</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {COMPROBACIONES.map((c) => {
                  const derivada = c.id === 'primerPaseo'
                  return (
                    <Check2
                      key={c.id}
                      on={marcadas.includes(c.id)}
                      disabled={derivada}
                      onChange={(v) => update((a) => ({ ...a, review: { ...a.review, comprobaciones: { ...a.review.comprobaciones, [c.id]: v } } }))}
                    >
                      {c.completo}
                      {derivada && <span className="block text-[14px] font-medium text-ink-soft">Se marca sola con el primer paseo.</span>}
                    </Check2>
                  )
                })}
              </div>
              <label className="mt-4 block">
                <span className="eyebrow mb-1.5 block text-ink-soft">Notas internas</span>
                <textarea
                  value={app.review.notes}
                  onChange={(e) => update((a) => ({ ...a, review: { ...a.review, notes: e.target.value } }))}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-ink/15 bg-paper p-3.5 text-[16px] outline-hidden focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
                  placeholder="Qué notaste en la videollamada, dudas, acuerdos…"
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[14px] font-extrabold">Paseos hechos:</span>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Menos" onClick={() => update((a) => ({ ...a, review: { ...a.review, supervisedWalks: Math.max(0, a.review.supervisedWalks - 1) } }))} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand active:scale-90">
                    <Minus size={16} />
                  </button>
                  <span className="w-10 text-center font-display text-[24px] font-bold tabular-nums">{app.review.supervisedWalks}</span>
                  <button type="button" aria-label="Más" onClick={() => update((a) => ({ ...a, review: { ...a.review, supervisedWalks: Math.min(REGLA_NUEVO.paseos, a.review.supervisedWalks + 1) } }))} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand active:scale-90">
                    <Plus size={16} />
                  </button>
                  <span className="whitespace-nowrap text-[14px] text-ink-soft">de {REGLA_NUEVO.paseos}</span>
                </div>
              </div>

              {!cincoPrimeras && (
                <p className="mt-5 text-[14px] font-semibold leading-snug text-ink-soft">{TEXTO_ADMIN.paraAprobar(casillasQueFaltan(app).map((c) => c.titulo))}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!cincoPrimeras || app.quiz?.verdict === 'fail'}
                  onClick={() => update((a) => ({ ...a, status: 'supervisado' }))}
                  className="btn-press inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 text-[14.5px] font-extrabold text-white shadow-press-forest disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none"
                >
                  <ShieldCheck size={18} /> Aprobar paseos acompañados
                </button>
                <button
                  type="button"
                  disabled={!cincoPrimeras || llevaEtiquetaNuevo(app.review.supervisedWalks) || app.status === 'activo'}
                  onClick={() => update((a) => ({ ...a, status: 'activo' }))}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14.5px] font-extrabold text-white disabled:bg-ink/15 disabled:text-ink-soft"
                >
                  <Check size={18} /> Pasar a activo (con {REGLA_NUEVO.paseos} paseos)
                </button>
                <button type="button" onClick={() => update((a) => ({ ...a, status: 'rechazada' }))} className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-red-300 px-6 text-[14.5px] font-extrabold text-red-700 active:scale-95">
                  <ShieldX size={18} /> Rechazar
                </button>
                <button type="button" onClick={() => update((a) => ({ ...a, status: 'enviada' }))} className="inline-flex h-12 items-center rounded-full px-4 text-[14px] font-bold text-ink-soft underline underline-offset-4">
                  Volver a &quot;en revisión&quot;
                </button>
              </div>
              {visible !== app.status && (
                <p role="status" className="mt-4 rounded-2xl bg-amber-50 p-3.5 text-[14px] font-semibold leading-snug text-amber-900">
                  {TEXTO_ADMIN.faltanCasillas}
                </p>
              )}
              {visible === 'supervisado' && (
                <p className="mt-4 rounded-2xl bg-forest-50 p-3.5 text-[14px] font-semibold leading-snug text-forest">
                  Aprobado. {app.person.firstName} ya aparece en la app del cliente con la etiqueta «{REGLA_NUEVO.etiqueta}» y puede usar la app del paseador.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
