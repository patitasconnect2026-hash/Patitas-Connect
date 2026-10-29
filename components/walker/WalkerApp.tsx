'use client'

import { etiquetaDeExamen } from '@/lib/respuestasEscritas'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Clock, LogOut, ShieldCheck, Trash2, Video, Wallet } from 'lucide-react'
import { CONFIG, NOMBRE_CORTO, textoComision } from '@/lib/config'
import { casillasMarcadas, COMPROBACIONES } from '@/lib/verificacion'
import { WALKERS } from '@/lib/data'
import { btnInk, btnPrimary } from '@/lib/ui'
import { appConAprobacion, useAprobacionServidor, useMiPostulacionEnElServidor, useModoDemo, usePostulacion } from '@/lib/datos'
import { appConEstadoPropio, yaEnviadaALaBase } from '@/lib/servidor/postulacionesMapeo'
import { TEXTO_REVISION_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { appFromWalker, estadoVisible, type WalkerApplication } from '@/lib/walkerStore'
import { cn } from '@/lib/utils'
import { PawPattern } from '../Onboarding'
import { PhoneFrame } from '../PhoneFrame'
import { LogoMark } from '../ui/Logo'
import { WalkerHome } from './WalkerHome'
import { debeVerLosPasos, postulacionCompleta, postulacionCompletaSinDniNiFoto, WalkerOnboarding } from './WalkerOnboarding'
import { BorrarCuentaSheet } from '../acceso/BorrarCuentaSheet'
import { TEXTO_PANTALLAS } from '../acceso/FormularioAcceso'
import { PantallaEntrada } from '../acceso/PantallaEntrada'
import { PantallaEspera } from '../acceso/PantallaEspera'
import { useAccesoApp } from '../acceso/useAccesoApp'

/** Los textos de la portada del paseador con servidor: quien ya postuló entra a su cuenta, y crear una cuenta queda aparte. */
export const TEXTO_PORTADA_PASEADOR = {
  entrar: 'Entrar a mi cuenta',
  primeraVez: '¿Primera vez?',
  crear: 'Crear cuenta de paseador',
  yaPostulaste: 'Si ya postulaste, entra a tu cuenta: no hace falta postular otra vez.',
} as const

/** Con qué se abre la pantalla de entrada según el botón que se tocó: «Entrar a mi cuenta» o «Crear cuenta de paseador». */
export type OpcionDeEntrada = 'entrar' | 'crear'
export const entradaDelPaseador = (o: OpcionDeEntrada): { modoInicial: 'entrar' | 'registrar'; rolInicial: 'paseador' | null } =>
  o === 'crear' ? { modoInicial: 'registrar', rolInicial: 'paseador' } : { modoInicial: 'entrar', rolInicial: null }

/**
 * La portada del paseador. `servidor`: con servidor, «Entrar a mi cuenta» es la acción principal (así quien ya postuló no cree
 * que debe postular otra vez) y «Crear cuenta de paseador» queda aparte, para la primera vez. Sin servidor no cambia nada.
 */
export function Welcome({ onStart, servidor = false }: { onStart: (opcion: OpcionDeEntrada) => void; servidor?: boolean }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-brand-700 text-white">
      <PawPattern id="wk-paws" />
      <Link
        href="/"
        aria-label="Volver al inicio"
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition active:scale-95"
      >
        <ArrowLeft size={20} aria-hidden />
      </Link>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-7 pb-4 pt-[max(2rem,env(safe-area-inset-top))] text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 13 }} className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-brand-50 shadow-[0_18px_40px_-14px_rgba(0,0,0,.45)]">
          <LogoMark size={80} />
        </motion.div>
        <p className="eyebrow mt-6 text-white">Para paseadores</p>
        <h1 className="font-display mt-1.5 text-[38px] font-bold leading-[1.02] tracking-tight">
          Gana paseando perros del <span className="italic text-brand-100">barrio</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[310px] text-[15px] leading-relaxed text-white">
          Tú eliges tus horarios y tu tarifa, entre S/ {CONFIG.tarifaMinima} y S/ {CONFIG.tarifaMaxima} por hora. {textoComision()}
        </p>

        <ul className="mx-auto mt-6 max-w-[330px] space-y-2.5 text-left">
          {[
            { icon: Wallet, t: `${NOMBRE_CORTO} te paga después del paseo` },
            { icon: BadgeCheck, t: 'Tu DNI a la vista da confianza' },
            { icon: ShieldCheck, t: 'Te acompañamos en tu primer paseo' },
            { icon: Clock, t: 'Postular toma unos 25 minutos' },
          ].map((b) => (
            <li key={b.t} className="flex items-center gap-2.5 text-[14px] font-bold">
              <b.icon size={18} className="shrink-0 text-brand-100" /> {b.t}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-6 max-w-[330px] rounded-3xl bg-black/15 p-4 text-left">
          <p className="text-[14px] font-extrabold">Para postular necesitas</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[14px] leading-snug text-white">
            <li>Tener 18 años o más y tu DNI</li>
            <li>Vivir o estudiar en San Isidro o Jesús María</li>
            <li>Aceptar que los clientes vean los últimos 4 dígitos de tu DNI</li>
            <li>Una verificación en vivo con nosotros, por WhatsApp</li>
          </ul>
          {servidor && <p className="mt-2.5 text-[14px] font-bold leading-snug">{TEXTO_PORTADA_PASEADOR.yaPostulaste}</p>}
        </div>
      </div>
      <div className="relative space-y-2.5 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <button type="button" onClick={() => onStart(servidor ? 'entrar' : 'crear')} className={cn(btnInk, 'h-14 w-full text-[16.5px]')}>
          {servidor ? TEXTO_PORTADA_PASEADOR.entrar : TEXTO_PORTADA_PASEADOR.crear} <ArrowRight size={19} strokeWidth={2.6} />
        </button>
        {servidor && (
          <p className="flex min-h-11 flex-wrap items-center justify-center gap-x-1.5 text-center text-[14px] font-bold text-white">
            {TEXTO_PORTADA_PASEADOR.primeraVez}
            <button type="button" onClick={() => onStart('crear')} className="min-h-11 font-extrabold underline decoration-brand-200/60 underline-offset-4">
              {TEXTO_PORTADA_PASEADOR.crear}
            </button>
          </p>
        )}
        <Link href="/" className="flex min-h-11 items-center justify-center text-center text-[14px] font-extrabold text-white underline decoration-brand-200/60 underline-offset-4">
          Tengo un perro: volver al inicio
        </Link>
      </div>
    </div>
  )
}

export function Status({
  app,
  onDelete,
  onSalir,
  onBorrarCuenta,
  conDemo = true,
}: {
  app: WalkerApplication
  onDelete: () => void
  onSalir?: () => void
  /** Solo con servidor y con sesión: abre «¿Borrar tu cuenta?» (borra en el servidor). Sin esto, se borra lo del teléfono. */
  onBorrarCuenta?: () => void
  conDemo?: boolean
}) {
  const rejected = app.status === 'rechazada'
  const marcadas = casillasMarcadas(app.review.comprobaciones, app.review.supervisedWalks)
  const steps = [
    { ok: true, t: 'Postulación enviada', d: 'Recibimos tus datos y tu examen.' },
    ...COMPROBACIONES.map((c) => ({
      ok: marcadas.includes(c.id),
      t: c.titulo,
      d: c.id === 'dni' && !marcadas.includes(c.id) && app.videoSlot ? `Tu cita: ${app.videoSlot}` : c.apoyo,
    })),
  ]
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-brand-100">
            <LogoMark size={68} />
          </div>
          <p className="eyebrow mt-5 text-brand-700">{rejected ? 'Resultado' : 'En revisión'}</p>
          <h1 className="font-display text-[34px] font-bold leading-[1.05] text-ink">{rejected ? 'Por ahora no podemos aprobarte' : `¡Gracias, ${app.person.firstName}!`}</h1>
          <p className="mt-2 max-w-[310px] text-[14px] leading-relaxed text-ink-soft">
            {rejected
              ? 'Revisamos tu postulación con cuidado y por ahora no avanza. Puedes volver a postular en 3 meses.'
              : 'Revisaremos tu postulación con cuidado. Una persona administradora del equipo la revisará y te avisaremos por WhatsApp al +51 ' + app.phone + '.'}
          </p>
          <p className="mt-4 rounded-full bg-ink px-4 py-2 font-display text-[18px] font-bold tracking-[0.12em] text-white">{app.code}</p>
          <p className="mt-1 text-[12px] text-ink-soft">Tu código de postulación</p>
        </div>

        {!rejected && (
          <ul className="mt-6 space-y-2">
            {steps.map((s) => (
              <li key={s.t} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3">
                <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', s.ok ? 'bg-forest text-white' : 'bg-ink/10 text-ink-soft')}>{s.ok ? <Check size={14} strokeWidth={3.5} /> : <Clock size={13} />}</span>
                <span>
                  <span className="block text-[14px] font-extrabold text-ink">{s.t}</span>
                  <span className="block text-[14px] text-ink-soft">{s.d}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {app.quiz && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-sand p-3.5 text-[14px] font-semibold leading-snug text-ink-soft">
            <Video size={15} className="shrink-0" /> {etiquetaDeExamen(app.quiz)}.
          </p>
        )}

        <div className="mt-5 space-y-2.5">
          {conDemo && (
            <Link href="/admin" className={cn(btnPrimary, 'h-12 w-full text-[14px]')}>
              Demo: abrir panel interno y aprobar <ArrowRight size={17} strokeWidth={2.6} />
            </Link>
          )}
          {onSalir && (
            <button type="button" onClick={onSalir} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink/15 text-[14px] font-extrabold text-ink active:scale-[0.98]">
              <LogOut size={16} /> Salir
            </button>
          )}
          <button type="button" onClick={onBorrarCuenta ?? onDelete} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-bold text-red-700 underline underline-offset-4">
            <Trash2 size={14} /> {onBorrarCuenta ? 'Retirar mi postulación y borrar mi cuenta' : 'Retirar mi postulación y borrar mis datos'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** App del paseador: postulación, estado de revisión y el día a día (paseos, chat, perfil). */
export function WalkerApp() {
  const { app: appLocal, ready, update, reset, set } = usePostulacion()
  /** Solo con servidor: la sesión. En modo local es siempre «local» y todo sigue como siempre. */
  const acceso = useAccesoApp('paseador')
  const modoApp = acceso.vista.vista
  // Con servidor, la base dice si el equipo ya aprobó a esta persona: aunque su postulación todavía no esté allá,
  // su app muestra «Hoy» y recibe solicitudes. Sin servidor (o sin ser paseador con sesión) no cambia nada.
  const aprobacion = useAprobacionServidor(acceso.usuarioId)
  // Con servidor, la postulación COMPLETA sale sola a la base y aquí se ve su estado real (en revisión, aprobada, rechazada).
  const propia = useMiPostulacionEnElServidor(
    acceso.usuarioId,
    appLocal,
    { completa: !!appLocal && postulacionCompleta(appLocal), sinDniNiFoto: !!appLocal && postulacionCompletaSinDniNiFoto(appLocal) },
    set,
  )
  // Si la base ya recibió su postulación, manda la base: no se le vuelven a pedir los pasos (por ejemplo, en otro teléfono).
  const enLaBase = yaEnviadaALaBase(propia.post)
  const app = useMemo(() => appConAprobacion(appConEstadoPropio(appLocal, propia.post, propia.comp), aprobacion), [appLocal, propia.post, propia.comp, aprobacion])
  const { demo, salir: leaveDemo } = useModoDemo()
  const [demoApp, setDemoApp] = useState<WalkerApplication>(() => appFromWalker(WALKERS[0]))
  const [started, setStarted] = useState(false)
  const [verAcceso, setVerAcceso] = useState<OpcionDeEntrada | null>(null)
  const [borrarCuentaOpen, setBorrarCuentaOpen] = useState(false)
  const cuenta = acceso.cuenta
  const salirDeLaCuenta = () => void acceso.salir()
  // Después de borrar la cuenta se vuelve a la portada (no a «Iniciar sesión»: ya no hay cuenta a la que entrar).
  const borrarLaCuenta = async () => {
    const r = await acceso.borrarCuenta()
    if (r.ok) setVerAcceso(null)
    return r
  }
  // Con sesión de paseador: la postulación empieza con lo que ya escribió al registrarse (celular, nombre, apellido),
  // así no se lo pedimos otra vez ni pasa por el celular y el código de demostración.
  const faltaPrefill =
    modoApp === 'continuar' &&
    ready &&
    !!cuenta &&
    (!appLocal || (!appLocal.phone && !!cuenta.celular) || (!appLocal.person.firstName && !!cuenta.nombre) || (!appLocal.person.lastName && !!cuenta.apellido))
  useEffect(() => {
    if (!faltaPrefill || !cuenta) return
    update((a) => ({
      ...a,
      phone: a.phone || cuenta.celular,
      person: { ...a.person, firstName: a.person.firstName || cuenta.nombre, lastName: a.person.lastName || cuenta.apellido },
    }))
  }, [faltaPrefill, cuenta, update])

  let body: React.ReactNode
  let key: string
  if (!ready || modoApp === 'cargando' || modoApp === 'ir' || faltaPrefill || (modoApp === 'continuar' && (aprobacion.estado === 'cargando' || propia.estado === 'cargando'))) {
    key = 'splash'
    body = (
      <div className="flex flex-1 items-center justify-center bg-brand-600">
        <LogoMark size={72} tone="cream" />
      </div>
    )
  } else if (modoApp === 'no_se_pudo') {
    key = 'no-se-pudo'
    body = <PantallaEspera tipo="no_se_pudo" onReintentar={acceso.recomprobar} onSalir={salirDeLaCuenta} />
  } else if (modoApp === 'continuar' && aprobacion.estado === 'sin_conexion' && !(app && (estadoVisible(app) === 'supervisado' || estadoVisible(app) === 'activo'))) {
    // Con servidor y sin internet no se puede saber si ya la aprobaron: se dice, en vez de mostrarle los pasos de nuevo.
    key = 'sin-aprobacion'
    body = <PantallaEspera tipo="no_se_pudo" onReintentar={aprobacion.recargar} onSalir={salirDeLaCuenta} />
  } else if (modoApp === 'cuenta_de_familia') {
    key = 'cuenta-de-familia'
    body = <PantallaEspera tipo="cuenta_de_familia" onSalir={salirDeLaCuenta} />
  } else if (demo) {
    key = 'demo'
    body = <WalkerHome app={demoApp} demo onChange={(fn) => setDemoApp(fn)} onLogout={leaveDemo} onDelete={leaveDemo} />
  } else if (modoApp === 'entrada') {
    // Con servidor y sin sesión: la portada y, de ahí, la MISMA pantalla de entrada que usa la familia.
    key = verAcceso || acceso.llegoPorEnlace ? 'entrada' : 'welcome'
    body =
      verAcceso || acceso.llegoPorEnlace ? (
        <PantallaEntrada
          cliente={acceso.cliente}
          onListo={acceso.recomprobar}
          onVolver={() => setVerAcceso(null)}
          aviso={acceso.llegoPorEnlace ? TEXTO_PANTALLAS.enlaceSinSesion : undefined}
          {...entradaDelPaseador(verAcceso ?? 'entrar')}
        />
      ) : (
        <Welcome servidor onStart={setVerAcceso} />
      )
  } else if (!app && !started && modoApp === 'local') {
    key = 'welcome'
    body = (
      <Welcome
        onStart={() => {
          update((a) => a)
          setStarted(true)
        }}
      />
    )
  } else if (!app || (debeVerLosPasos(app) && !enLaBase)) {
    // «En revisión» solo después de pasar todos los pasos (con el curso y el examen) y enviarla: una postulación que dice
    // «enviada» pero está a medias vuelve a los pasos que le faltan.
    key = 'onboarding'
    body = app ? (
      <WalkerOnboarding
        app={app}
        onChange={update}
        onSubmit={() => undefined}
        cuenta={modoApp === 'continuar' && cuenta ? { correo: cuenta.correo, onSalir: salirDeLaCuenta } : undefined}
        onExit={() => {
          reset()
          setStarted(false)
        }}
      />
    ) : null
  } else if (estadoVisible(app) === 'enviada' || estadoVisible(app) === 'rechazada') {
    key = 'status'
    body = (
      <Status
        app={app}
        conDemo={modoApp !== 'continuar'}
        onSalir={modoApp === 'continuar' ? salirDeLaCuenta : undefined}
        onBorrarCuenta={modoApp === 'continuar' ? () => setBorrarCuentaOpen(true) : undefined}
        onDelete={() => {
          reset()
          setStarted(false)
        }}
      />
    )
  } else {
    key = 'home'
    body = (
      <WalkerHome
        app={app}
        demo={false}
        onChange={update}
        onLogout={() => undefined}
        onSalir={modoApp === 'continuar' ? salirDeLaCuenta : undefined}
        onBorrarCuenta={modoApp === 'continuar' ? () => setBorrarCuentaOpen(true) : undefined}
        onDelete={() => {
          reset()
          setStarted(false)
        }}
      />
    )
  }

  return (
    <PhoneFrame walker>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex min-h-0 flex-1 flex-col">
          {modoApp === 'continuar' && propia.envio !== 'ok' && (
            <p role="status" className="bg-amber-50 px-5 py-2.5 text-[14px] font-semibold leading-snug text-amber-900">
              {propia.envio === 'sin_conexion' ? TEXTO_REVISION_SERVIDOR.paseadorSinConexion : TEXTO_REVISION_SERVIDOR.paseadorRechazo}
            </p>
          )}
          {body}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {borrarCuentaOpen && modoApp === 'continuar' && (
          <BorrarCuentaSheet key="borrar-cuenta" rol="paseador" onBorrar={borrarLaCuenta} onClose={() => setBorrarCuentaOpen(false)} />
        )}
      </AnimatePresence>
    </PhoneFrame>
  )
}
