'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { CONFIG, desgloseDePago } from '@/lib/config'
import { TEXTO_PAGO } from '@/lib/pagosTextos'
import { buildBooking, DEMO_DOGS, esCuentaDeEjemplo, newDog, WALKERS } from '@/lib/data'
import { clockLabel, confirmarEntregaJob, makePin, moverPaseo, newId, newMessageId, registrarLecturas, reportarJob, type Job } from '@/lib/bus'
import { textoDeActividad, ultimaActividadDe } from '@/lib/chatServidor'
import { conservarFotosDelPaseo, esperarGuardadoDeLasResenas, esperarGuardadoDeLosPaseos, reiniciarFotos, useAbrirCaso, useAccionesPago, useAhora, useChat, useCuenta, useEstadoServidor, useEventos, useFotosPaseo, useMisResenas, useMostrarEjemplos, usePagos, usePaseadorAprobado, usePaseadorConectado, useAvisoDeNuevos, useUbicacionEnVivo, usePaseadoresReales, usePaseoActivo, usePedidoDeLaFamilia, usePaseos, usePlazos, useRegistrarVistaDni, useServidor, useSincronizarPago, type ResultadoEnvio } from '@/lib/datos'
import { TEXTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { esPaseadorDeEjemplo, paseadoresVisibles } from '@/lib/ejemplos'
import { fotosDe } from '@/lib/fotos'
import { selfieDeHoy } from '@/lib/selfie'
import { necesitaReasignacion, paseadoresCompatibles } from '@/lib/reasignacion'
import { casoDePago, casoDeReporte, type MotivoReporte, type Reporte } from '@/lib/casos'
import { agregarPago, nuevoPago, pagoDe, pagoPendiente, plazoDePagoVencido } from '@/lib/pagos'
import { aplicar, entregaConfirmada, esFinal, nuevoPaseo, recordatorioEnviado, type EstadoPaseo, type Paseo } from '@/lib/paseo'
import { ReportarSheet } from './ReportarSheet'
import { walkerFits } from '@/lib/schedule'
import type { Persisted } from '@/lib/store'
import type { Booking, Dog, EventKind, Review, Walk, Walker } from '@/lib/types'
import { cn, uid } from '@/lib/utils'
import { autoReply, clockAt, newWalk, STEP, TICK_MS, visibleChat, visibleTimeline } from '@/lib/walk'
import { distritoDe } from '@/lib/zona'
import { lecturasDeEscenario, type EscenarioAviso } from '@/lib/zonaDemo'
import { BookingSheet } from './BookingSheet'
import { CasaSheet } from './CasaSheet'
import { BottomNav, type Tab } from './BottomNav'
import { ChatSheet } from './ChatSheet'
import { ConfirmSheet } from './ConfirmSheet'
import { DniSheet } from './DniSheet'
import { DogProfileSheet, DogSheet } from './DogSheets'
import { Explore, type Filter } from './Explore'
import { PedirPaseoSheet } from './PedirPaseoSheet'
import { FichaPedido } from './FichaPedido'
import { TEXTO_PEDIDO } from '@/lib/pedidosTextos'
import { btnInk } from '@/lib/ui'
import { diaDelPedido, type OfertaPedido, type Pedido } from '@/lib/pedidos'
import { estadoEnVivo } from '@/lib/sospechas'
import { LiveWalk } from './LiveWalk'
import { AvisoDeServidor } from './AvisoDeServidor'
import { NotificationBanner, type Toast } from './NotificationBanner'
import { RecordatorioReserva } from './RecordatorioReserva'
import { debeMostrarOnboarding } from '@/lib/servidor/destino'
import { Onboarding } from './Onboarding'
import { BorrarCuentaSheet } from './acceso/BorrarCuentaSheet'
import { PantallaEspera } from './acceso/PantallaEspera'
import { TEXTO_PANTALLAS } from './acceso/FormularioAcceso'
import { useAccesoApp } from './acceso/useAccesoApp'
import { PhoneFrame } from './PhoneFrame'
import { Landing } from './landing/Landing'
import { ProfileView } from './ProfileView'
import { ReviewsSheet } from './ReviewsSheet'
import { SafetyView } from './SafetyView'
import { EmergenciaSheet } from './EmergenciaSheet'
import { SosSheet } from './SosSheet'
import { QuienesSomosSheet } from './QuienesSomosSheet'
import { SiAlgoPasaSheet } from './SiAlgoPasaSheet'
import { ZonesMap } from './ZonesMap'
import { CalificarPorPartes } from './funciones/CalificarPorPartes'
import { PlanesSheet } from './funciones/Planes'
import { CentroAvisosSheet } from './funciones/CentroAvisos'

/** Qué eventos del paseo se muestran como notificación push. */
const TOAST_TITLES: Partial<Record<EventKind, string>> = {
  start: 'Paseo iniciado 🐾',
  water: 'Actualización del paseo',
  photo: 'Foto nueva 📸',
  pee: 'Actualización del paseo',
  poop: 'Actualización del paseo',
  cross: 'Actualización del paseo',
  return: 'Van de regreso a casa 🏠',
  arrived: 'Entrega marcada 🏠',
}

export function PatitasApp() {
  /** null hasta que el navegador carga lo guardado (evita diferencias entre servidor y cliente) */
  const { store, setStore, patch, reiniciar } = useCuenta()
  /** Solo con servidor: la sesión. En modo local es siempre «local» y todo sigue como siempre. */
  const acceso = useAccesoApp('familia')
  const modoApp = acceso.vista.vista
  const [tab, setTab] = useState<Tab>('explore')
  const [walk, setWalk] = useState<Walk | null>(null)
  const [bookingWalker, setBookingWalker] = useState<Walker | null>(null)
  const [reviewsFor, setReviewsFor] = useState<Walker | null>(null)
  const [calificarOpen, setCalificarOpen] = useState(false)
  const [planesOpen, setPlanesOpen] = useState(false)
  const [avisosOpen, setAvisosOpen] = useState(false)
  const [borrarCuentaOpen, setBorrarCuentaOpen] = useState(false)
  const [dogSheet, setDogSheet] = useState<{ dog: Dog; isNew: boolean } | null>(null)
  const [profileDog, setProfileDog] = useState<{ dog: Dog; walkerView: boolean } | null>(null)
  const [dniFor, setDniFor] = useState<Walker | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)
  const [emergenciaOpen, setEmergenciaOpen] = useState(false)
  const [algoPasaOpen, setAlgoPasaOpen] = useState(false)
  const [quienesOpen, setQuienesOpen] = useState(false)
  /** «Marca tu casa»: el mapa para marcar o cambiar el punto de recojo. */
  const [casaOpen, setCasaOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [seenChat, setSeenChat] = useState(0)
  /** Sin servidor: ya reseñó este paseo (la reseña vive en la cuenta de este teléfono). Con servidor manda la base (`reviewedWalk`). */
  const [reviewedLocal, setReviewedLocal] = useState(false)
  const [activeDogId, setActiveDogId] = useState<string | null>(null)
  const [refCode, setRefCode] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [spotFilter, setSpotFilter] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [busChat, setBusChat] = useChat()
  const [busEvents, setBusEvents] = useEventos()
  const [job, setJob] = usePaseoActivo()
  const [, setPaseos] = usePaseos()
  /** Solo con servidor y una sesión de familia: los paseadores salen de la base y los paseos viven en ella. */
  const reales = usePaseadoresReales(acceso.usuarioId)
  const servidor = useServidor()
  const estadoServidor = useEstadoServidor()
  const walkerOnline = usePaseadorConectado()
  const extraWalker = usePaseadorAprobado()
  const registrarVistaDni = useRegistrarVistaDni()
  usePlazos(job, setJob)
  const abrirCaso = useAbrirCaso()
  const [pagos, setPagos] = usePagos()
  const accionPago = useAccionesPago()
  useSincronizarPago(job)
  /** El primer paseo hecho que todavía no se pagó: mientras exista, no se reserva otro. */
  const debePago = pagoPendiente(pagos)
  const fotosPaseo = useFotosPaseo()
  const ahora = useAhora()
  const ahoraEnVivo = useAhora(CONFIG.segundosEnVivo * 1000)
  const [reportar, setReportar] = useState<{ motivo?: MotivoReporte } | null>(null)
  // Con servidor, mientras pasean y con la app abierta, se ve dónde va el paseador (se actualiza cada pocos segundos).
  const ubicacionEnVivo = useUbicacionEnVivo(job?.id ?? null, servidor.activo && !!job && walk?.jobId === job.id && job.paseo.estado === 'en_paseo')
  const prevCount = useRef(0)
  /** El estado del paseo de ESTA reserva (null si el encargo es de otra o ya no está). */
  const estado: EstadoPaseo | null = job && walk?.jobId === job.id ? job.paseo.estado : null
  /** ¿Lo mueve el paseador de ejemplo (botón de demostración)? */
  // (los avisos de ubicación de prueba también llevan la marca, pero no mueven al paseador de ejemplo)
  const simulado = !!job?.paseo.eventos.some((e) => e.demo && e.accion !== 'avisar')

  /* Código de invitación que viene del QR del afiche: /?ref=EDIFICIO */
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setRefCode(ref.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14))
  }, [])
  /* Si recarga la página con un paseo en curso, se recupera desde el encargo guardado (una sola vez por cuenta) */
  const paseoRecuperadoDe = useRef<string | undefined>(undefined)
  /** Sube cada vez que SALE una cuenta: quien vuelve a entrar (la misma u otra) recupera su paseo otra vez. */
  const [epocaDeSesion, setEpocaDeSesion] = useState(0)
  useEffect(() => {
    if (!job) return
    const quien = `${servidor.id ?? ''}#${epocaDeSesion}`
    if (paseoRecuperadoDe.current === quien) return
    paseoRecuperadoDe.current = quien
    if (walk || !job.reserva) return
    const e = job.paseo.estado
    const progress = e === 'entregado' || e === 'cerrado' ? 1 : e === 'en_paseo' ? 0.1 : 0
    const realActuo = job.paseo.eventos.some((ev) => ev.quien === 'paseador' && !ev.demo)
    // Con servidor la reserva trae el perro sin foto: se toma de las fichas de este teléfono, si está.
    const delTelefono = store?.dogs.find((d) => d.id === job.reserva?.dog.id)
    setWalk({
      ...newWalk(delTelefono ? { ...job.reserva, dog: delTelefono } : job.reserva),
      jobId: job.id,
      progress,
      phase: e === 'cerrado' ? 'completed' : e === 'entregado' ? 'arrived' : 'active',
      live: realActuo,
    })
  }, [job, walk, store?.dogs, servidor.id, epocaDeSesion])
  /* Con servidor: si en este teléfono entra otra cuenta, la pantalla no hereda el paseo de la anterior. */
  const [sesionPrevia, setSesionPrevia] = useState(servidor.id)
  if (servidor.id !== sesionPrevia) {
    setSesionPrevia(servidor.id)
    // Solo cuando SALE una cuenta (otra entra, o se cierra la sesión). Cuando la base todavía no había dicho quién es y ahora
    // lo dice (primera lectura, que puede tardar unos segundos), no se resetea nada: antes se cerraba la hoja de reserva que
    // la persona ya había abierto.
    if (sesionPrevia !== null) {
      setEpocaDeSesion((n) => n + 1)
      setWalk(null)
      setBookingWalker(null)
      setChatOpen(false)
      setSosOpen(false)
      setConfirmOpen(false)
      setReportar(null)
    }
  }
  /* Cuando carga lo guardado, el primer perro queda activo (una sola vez) */
  const cuentaIniciada = useRef(false)
  useEffect(() => {
    if (!store || cuentaIniciada.current) return
    cuentaIniciada.current = true
    setActiveDogId(store.dogs[0]?.id ?? null)
  }, [store])

  /* Un paseador aprobado desde el panel interno aparece como "nuevo · en prueba" (usePaseadorAprobado) */
  const account = store?.account ?? null
  /* «Mostrar ejemplos»: encendido en la demostración, apagado en una cuenta real (lib/ejemplos.ts) */
  const [mostrarEjemplos, setMostrarEjemplos] = useMostrarEjemplos(account)
  // Con servidor y sesión de familia, la lista es la de la base: no se mezclan con los de ejemplo ni con los de este teléfono.
  const walkers = useMemo(
    () => (reales.aplica ? reales.paseadores : paseadoresVisibles(extraWalker ? [extraWalker, ...WALKERS] : WALKERS, mostrarEjemplos)),
    [reales.aplica, reales.paseadores, extraWalker, mostrarEjemplos],
  )
  /** El paseador de este paseo es una persona real del servidor: nadie acepta por él y el chat no le llega todavía. */
  const walkerReal = reales.aplica && !!walk && !walk.booking.walker.esEjemplo && walk.booking.walker.deServidor === true
  const dogs = useMemo(() => store?.dogs ?? [], [store])
  const activeDog = dogs.find((d) => d.id === activeDogId) ?? dogs[0] ?? null
  const owner = account?.firstName ?? 'Valeria'
  /** «Pedir paseo»: la familia dice cuánto pagaría y los paseadores de su zona responden. */
  const pedidos = usePedidoDeLaFamilia(acceso.usuarioId, dogs, WALKERS)
  const [pedirOpen, setPedirOpen] = useState(false)
  /** La persona tocó «Entrar» en la portada pública: se muestra la app (alta o inicio de sesión). */
  const [verApp, setVerApp] = useState(false)
  const respuestasNuevas = pedidos.pedido && pedidos.activo ? pedidos.pedido.ofertas.filter((o) => o.estado === 'enviada') : []
  useAvisoDeNuevos(respuestasNuevas.map((o) => o.id))

  /* Reloj del paseo: avanza solo mientras el paseador va paseando (estado «en_paseo») */
  useEffect(() => {
    if (estado !== 'en_paseo') return
    const id = setInterval(() => {
      setWalk((w) => {
        if (!w || w.phase !== 'active') return w
        // Con un paseador real, el mapa llega hasta 0,92; la entrega la marca él. En la demostración llega a 1.
        const tope = w.live ? 0.92 : 1
        return w.progress >= tope ? w : { ...w, progress: Math.min(tope, w.progress + STEP) }
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [estado])

  /* Demostración: el paseador de ejemplo sale, recoge y entrega solo (marcado como demostración en el registro) */
  useEffect(() => {
    if (!simulado || !job) return
    const siguiente = estado === 'aceptado' ? 'salir' : estado === 'en_camino' ? 'recoger' : null
    if (!siguiente) return
    // El pago es al final del paseo: el paseador de ejemplo sale sin esperar ningún pago.
    const t = setTimeout(() => setJob((j) => moverPaseo(j, siguiente, 'paseador', Date.now(), 'Demostración', true)), 1800)
    return () => clearTimeout(t)
  }, [estado, simulado, job, setJob])
  const progresoWalk = walk?.progress ?? 0
  useEffect(() => {
    if (simulado && estado === 'en_paseo' && progresoWalk >= 1) {
      setJob((j) => moverPaseo(j, 'entregar', 'paseador', Date.now(), 'Demostración', true))
    }
  }, [simulado, estado, progresoWalk, setJob])

  /* La fase del paseo sigue al estado: entregado = llegó a casa, cerrado = completado */
  useEffect(() => {
    if (!estado) return
    const fase = estado === 'cerrado' ? 'completed' : estado === 'entregado' ? 'arrived' : null
    if (!fase) return
    setWalk((w) => (w && (w.phase !== fase || w.progress < 1) ? { ...w, phase: fase, progress: 1 } : w))
  }, [estado])

  /* Lo que hace el paseador real (otra pestaña) entra al paseo del cliente */
  useEffect(() => {
    if (!walk || !walk.jobId || job?.id !== walk.jobId) return
    const known = new Set([...walk.extraMessages.map((m) => m.id), ...walk.extraEvents.map((e) => e.id)])
    // Con servidor el chat es de verdad: lo que escribió esta persona antes de recargar también vuelve a la pantalla.
    const newMsgs = busChat.filter((m) => (m.from === 'walker' || servidor.activo) && !known.has(m.id))
    const newEvs = busEvents.filter((e) => !known.has(e.id))
    // Solo cuenta lo que hace una persona (no el paseador de ejemplo de la demostración).
    const realActuo = job.paseo.eventos.some((e) => e.quien === 'paseador' && !e.demo)
    const p = job.paseo.estado
    const statusProgress = !realActuo ? 0 : p === 'entregado' || p === 'cerrado' ? 1 : p === 'en_paseo' ? 0.1 : 0
    const acted = newMsgs.length > 0 || newEvs.length > 0 || statusProgress > 0 || realActuo
    if (!acted && !walk.live) return
    if (newMsgs.length === 0 && newEvs.length === 0 && walk.live && (statusProgress < 1 || walk.phase !== 'active')) return
    setWalk((w) => {
      if (!w || w.jobId !== job.id) return w
      const progress = statusProgress === 1 ? 1 : w.live ? Math.max(w.progress, statusProgress) : statusProgress
      return {
        ...w,
        live: true,
        progress,
        phase: w.phase === 'completed' ? 'completed' : progress >= 1 ? 'arrived' : w.phase,
        extraMessages: [
          ...w.extraMessages,
          ...newMsgs.map((m) =>
            // Con servidor cada mensaje lleva su hora real; en la demostración, la del paseo simulado.
            servidor.activo
              ? { id: m.id, from: m.from, at: m.at, time: clockLabel(m.at), text: m.text, image: m.image }
              : { id: m.id, from: 'walker' as const, at: progress, time: clockAt(w.booking, progress), text: m.text, image: m.image },
          ),
        ],
        extraEvents: [
          ...w.extraEvents,
          ...newEvs.map((e) => ({ id: e.id, at: progress, time: clockAt(w.booking, progress), kind: e.kind, text: e.text })),
        ],
      }
    })
  }, [busChat, busEvents, job, walk, servidor.activo])

  // Antes de que el paseador salga y recoja al perro (solicitado, aceptado, en camino) no hay nada que contar.
  const empezo = !estado || estado === 'en_paseo' || estado === 'entregado' || estado === 'cerrado' || estado === 'en_disputa'
  const timeline = useMemo(() => (walk ? visibleTimeline(walk, empezo) : []), [walk, empezo])
  const chat = useMemo(() => (walk ? visibleChat(walk, owner, empezo) : []), [walk, owner, empezo])

  /* Notificaciones push simuladas cuando llega un evento nuevo */
  useEffect(() => {
    if (!walk) {
      prevCount.current = 0
      return
    }
    const n = timeline.length
    const prev = prevCount.current
    prevCount.current = n
    if (n <= prev || prev === 0) return
    const latest = timeline[0]
    const title = TOAST_TITLES[latest.kind]
    if (title) setToast({ id: `${latest.id}-${n}`, title, body: latest.text })
  }, [timeline, walk])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  /* Con servidor: cuándo hizo algo por última vez el paseador (sus mensajes y sus cambios del paseo). Nunca «en línea». */
  const actividadDelPaseador =
    servidor.activo && walkerReal && job && walk?.jobId === job.id ? textoDeActividad(ultimaActividadDe('walker', busChat, job.paseo), ahora) : null

  /* Mensajes sin leer del paseador */
  const walkerMessages = chat.filter((m) => m.from === 'walker')
  useEffect(() => {
    if (chatOpen) setSeenChat(walkerMessages.length)
  }, [chatOpen, walkerMessages.length])
  const unread = chatOpen ? 0 : Math.max(0, walkerMessages.length - seenChat)
  const lastWalker = walkerMessages[walkerMessages.length - 1]

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [tab])

  /* ---------- Cuenta y perros ---------- */
  const finishOnboarding = (acc: NonNullable<Persisted['account']>, dog: Dog | null) => {
    patch({ account: acc, dogs: dog ? [dog] : [] })
    setActiveDogId(dog?.id ?? null)
    setTab('explore')
  }
  const resetDemo = () => {
    reiniciar()
    void reiniciarFotos()
    setWalk(null)
    setActiveDogId(null)
    setFilter('all')
    setSpotFilter(null)
    setProfileDog(null)
    setDogSheet(null)
    setTab('explore')
  }
  const saveDog = (d: Dog) => {
    setStore((s) => {
      if (!s) return s
      const exists = s.dogs.some((x) => x.id === d.id)
      return { ...s, dogs: exists ? s.dogs.map((x) => (x.id === d.id ? d : x)) : [...s.dogs, d] }
    })
    setActiveDogId(d.id)
    setDogSheet(null)
  }
  const deleteDog = (id: string) => {
    setStore((s) => (s ? { ...s, dogs: s.dogs.filter((x) => x.id !== id) } : s))
    setActiveDogId((cur) => (cur === id ? null : cur))
    setDogSheet(null)
  }

  /* ---------- Paseo ---------- */
  /**
   * Envía la solicitud al paseador. La reserva queda «solicitada» hasta que él acepte (o venza).
   * Con servidor (paseador real) devuelve una promesa: no se dice «enviada» hasta que la base la recibe; si no llega,
   * la solicitud sale de la copia y la hoja de reserva queda como estaba para volver a intentar.
   */
  const enviarSolicitud = (b: Booking, aceptadaPorLaDemo = false, idDelPaseo?: string): void | Promise<{ ok: true } | { ok: false; mensaje: string }> => {
    // Mientras haya un paseo sin pagar no se reserva otro (el pago es al final del paseo anterior).
    if (debePago) {
      setBookingWalker(null)
      setToast({ id: `pago-${debePago.id}`, title: 'Primero paga tu paseo', body: TEXTO_PAGO.sinReservar })
      setTab('live')
      return
    }
    const alServidor = reales.aplica && !aceptadaPorLaDemo && !b.walker.esEjemplo && b.walker.deServidor === true
    // Con servidor, la solicitud solo sale si la base está al otro lado: si no, se explica y no se guarda «a medias».
    if (alServidor && (!servidor.activo || estadoServidor.conexion !== 'conectado')) {
      return Promise.resolve({ ok: false, mensaje: !servidor.activo || estadoServidor.conexion === 'conectando' ? TEXTO_SERVIDOR.envioNoListo : TEXTO_SERVIDOR.envioSinConexion })
    }
    const jobId = idDelPaseo ?? newId()
    const d = b.dog
    const ahora = Date.now()
    const paseo: Paseo = aceptadaPorLaDemo
      ? aplicar(nuevoPaseo(ahora), 'aceptar', 'paseador', ahora + 1, 'Demostración', true)
      : nuevoPaseo(ahora)
    const nuevo: Job = {
      id: jobId,
      walkerFirst: b.walker.firstName,
      walkerId: b.walker.id,
      ownerFirst: owner,
      dog: {
        name: d.name,
        breed: d.breed,
        size: d.size,
        fur: d.fur,
        shape: d.shape,
        photo: d.photo,
        notes: d.notes,
        medical: d.medical,
        vet: d.vet,
        temperament: d.temperament,
        sociable: d.sociable,
        vaccinated: d.vaccinated,
        atributos: d.atributos,
        condiciones: d.condiciones,
      },
      slotLabel: b.slotLabel,
      durationMin: b.durationMin,
      pin: makePin(),
      handoff: b.handoff,
      doormanName: account?.doormanName ?? '',
      address: account ? `${account.street}${account.unit ? ', ' + account.unit : ''} · ${account.district}` : 'San Isidro',
      groupDogs: b.groupDogs,
      groupSize: b.groupSize,
      walkerPay: desgloseDePago(b).neto,
      createdAt: ahora,
      paseo,
      reserva: b,
      emergencia: store?.emergencia ?? undefined,
      distrito: account?.district,
    }
    /** Lo que pasa en la pantalla cuando la solicitud ya salió. */
    const alEnviar = () => {
      if (store && !store.welcomeUsed) patch({ welcomeUsed: true })
      // Empieza otro paseo: las fotos de los paseos anteriores se sueltan para dejar espacio en el teléfono.
      void conservarFotosDelPaseo([jobId])
      setBusChat([])
      setBusEvents([])
      // El pago de este paseo: la foto de los montos de hoy. Patitas cobra y después le paga al paseador.
      setPagos((l) =>
        agregarPago(
          l,
          nuevoPago({
            jobId,
            walkerId: b.walker.id,
            paseador: b.walker.firstName,
            dueno: owner,
            perro: d.name,
            cuando: b.slotLabel,
            reserva: b,
            at: ahora,
            paseo: paseo.estado,
            demo: esPaseadorDeEjemplo(b.walker.id) || esCuentaDeEjemplo(account),
          }),
        ),
      )
      setWalk({ ...newWalk(b), jobId })
      setSeenChat(0)
      setReviewedLocal(false)
      setChatOpen(false)
      setSosOpen(false)
      setConfirmOpen(false)
      setToast(null)
    }
    if (!alServidor) {
      setJob(nuevo)
      alEnviar()
      return
    }
    setJob(nuevo)
    return esperarGuardadoDeLosPaseos().then((r: ResultadoEnvio) => {
      if (r.ok) {
        alEnviar()
        return { ok: true as const }
      }
      // No se envió: la solicitud sale de la copia (nunca queda una «enviada» que la base no tiene).
      setPaseos((l) => l.filter((j) => j.id !== jobId))
      return { ok: false as const, mensaje: r.mensaje }
    })
  }
  /** «Pedir paseo»: manda el pedido a los paseadores de la zona. Nadie paga ahora. */
  const pedirPaseo = async (p: Pedido): Promise<{ ok: true } | { ok: false; mensaje: string }> => {
    if (debePago) return { ok: false, mensaje: TEXTO_PEDIDO.pagoPendiente }
    const r = await pedidos.pedir(p, owner)
    if (r.ok) setPedirOpen(false)
    return r
  }
  /**
   * La familia elige una respuesta: nace el paseo de siempre con el monto de esa oferta (sin pago adelantado) y el pedido se cierra.
   * Con servidor la base pasa el paseo a «aceptado» y descarta las demás respuestas con aviso amable.
   */
  const elegirRespuesta = async (o: OfertaPedido): Promise<{ ok: true } | { ok: false; mensaje: string }> => {
    const p = pedidos.pedido
    if (!p) return { ok: false, mensaje: TEXTO_PEDIDO.yaNo }
    if (debePago) return { ok: false, mensaje: TEXTO_PAGO.sinReservar }
    const w = o.demo ? WALKERS.find((x) => x.id === o.paseadorId) : reales.paseadores.find((x) => x.id === o.paseadorId)
    if (!w) return { ok: false, mensaje: TEXTO_PEDIDO.yaNo }
    const idPaseo = newId()
    const reserva = buildBooking({
      walker: { ...w, pricePerHour: o.monto },
      dog: p.dog,
      dayIdx: diaDelPedido(p),
      startHour: p.startHour,
      durationMin: p.durationMin,
      plan: 'once',
      handoff: account?.doorman ? 'doorman' : 'door',
      notes: '',
      groupDogs: 1,
      groupSize: p.dog.size,
      welcome: !!store && !store.welcomeUsed,
    })
    const envio = enviarSolicitud(reserva, !!o.demo, idPaseo)
    if (envio) {
      const e = await envio
      if (!e.ok) return e
    }
    const r = await pedidos.elegir(o.id, idPaseo)
    if (!r.ok) {
      // La base no dejó elegir: el paseo recién creado se cancela para que no quede una solicitud suelta.
      setJob((j) => (j && j.id === idPaseo ? moverPaseo(j, 'cancelar', 'dueno', Date.now()) : j))
      return r
    }
    verPaseo()
    return { ok: true }
  }
  const verPaseo = () => {
    setBookingWalker(null)
    setTab('live')
  }
  /** «Ver demo del paseo en vivo»: el paseador de ejemplo acepta de inmediato (demostración). */
  const startDemo = () => {
    const carlos = WALKERS[0]
    const dog = activeDog && walkerFits(carlos, activeDog) ? activeDog : DEMO_DOGS[0]
    enviarSolicitud(
      buildBooking({
        walker: carlos,
        dog,
        dayIdx: 0,
        startHour: 10,
        durationMin: 60,
        plan: 'once',
        handoff: account?.doorman ? 'doorman' : 'door',
        notes: '',
        groupDogs: 1,
        groupSize: dog.size,
      }),
      true,
    )
    verPaseo()
  }
  const skipToArrival = () => setWalk((w) => (w && w.phase === 'active' ? { ...w, progress: Math.max(w.progress, 0.95) } : w))
  /** Botón de demostración: el paseador de ejemplo acepta la solicitud. */
  const simularAceptacion = () => setJob((j) => moverPaseo(j, 'aceptar', 'paseador', Date.now(), 'Demostración', true))
  const cancelarPaseo = () => setJob((j) => (j && walk?.jobId === j.id ? moverPaseo(j, 'cancelar', 'dueno', Date.now()) : j))
  /** Solicitud rechazada, vencida o cancelada: se limpia para volver a buscar. */
  const descartarPaseo = () => {
    setJob((j) => (j && walk?.jobId === j.id ? null : j))
    setBusChat([])
    setBusEvents([])
    setWalk(null)
    setTab('explore')
  }

  const sendOwnerMessage = (text: string) => {
    // Con servidor el id lo usa la base para no duplicar el mensaje si hay que reenviarlo.
    const id = servidor.activo ? newMessageId() : newId()
    const ahoraMs = Date.now()
    setBusChat((c) => [...c, { id, from: 'owner', text, at: ahoraMs }])
    setWalk((w) =>
      w && {
        ...w,
        typing: !walkerOnline && !walkerReal && !servidor.activo,
        extraMessages: [
          ...w.extraMessages,
          servidor.activo
            ? { id, from: 'owner', at: ahoraMs, time: clockLabel(ahoraMs), text }
            : { id, from: 'owner', at: w.progress, time: clockAt(w.booking, w.progress), text },
        ],
      },
    )
    // Un paseador real no «contesta» solo: la respuesta de ejemplo es solo de la demostración (con servidor, nunca).
    if (walkerOnline || walkerReal || servidor.activo) return
    window.setTimeout(() => {
      setWalk((w) =>
        w && {
          ...w,
          typing: false,
          extraMessages: [
            ...w.extraMessages,
            { id: uid(), from: 'walker', at: w.progress, time: clockAt(w.booking, w.progress), text: autoReply(text, w.booking, owner) },
          ],
        },
      )
    }, 1500)
  }

  const sendOwnerPhoto = (image: string) => {
    const id = newId()
    setBusChat((c) => [...c, { id, from: 'owner', image, at: Date.now() }])
    setWalk((w) =>
      w && {
        ...w,
        extraMessages: [...w.extraMessages, { id, from: 'owner', at: w.progress, time: clockAt(w.booking, w.progress), image }],
      },
    )
    if (walkerOnline || walkerReal || servidor.activo) return
    window.setTimeout(() => {
      setWalk((w) =>
        w && {
          ...w,
          extraMessages: [
            ...w.extraMessages,
            { id: uid(), from: 'walker', at: w.progress, time: clockAt(w.booking, w.progress), text: `¡Qué linda foto de ${w.booking.dog.name}! 🧡` },
          ],
        },
      )
    }, 1200)
  }

  const setSos = (on: boolean) =>
    setWalk((w) =>
      w && {
        ...w,
        sos: on ? 'on' : 'off',
        extraEvents: [
          ...w.extraEvents,
          {
            id: uid(),
            at: w.progress,
            time: clockAt(w.booking, w.progress),
            kind: 'sos',
            text: on ? 'Alerta SOS anotada. Todavía no avisa a nadie: si es urgente, llama tú 🚨' : 'Alerta SOS cancelada: todo en orden ✅',
          },
        ],
      },
    )

  /** «Recibí a [perro]»: el dueño confirma la entrega y el paseo se cierra. */
  const confirmarEntrega = () => setJob((j) => (j && walk?.jobId === j.id ? confirmarEntregaJob(j, Date.now()) : j))
  /** El pago de ESTE paseo (libro de pagos). */
  const pagoActual = job && walk?.jobId === job.id ? pagoDe(pagos, job.id) : null
  /** Solo en demostración: hace como si el paseador (de ejemplo) hubiera visto el pago. La app no mueve dinero. */
  const simularVisto = () => {
    if (job && walk?.jobId === job.id) void accionPago(job.id, 'ver_pago', 'paseador')
  }
  const demoPago = !!pagoActual?.demo || simulado || esCuentaDeEjemplo(account)
  const entregaOk = !!job && walk?.jobId === job.id && entregaConfirmada(job.paseo)
  /** Pasó el tiempo y el dueño no confirmó: se le recordó y el equipo la mira (no se confirma sola). */
  const sinConfirmar = !!job && walk?.jobId === job.id && job.paseo.estado === 'entregado' && !entregaOk && recordatorioEnviado(job.paseo)
  /** Pasó el plazo de pago (`horasParaPagar`): recordatorio suave. */
  const plazoVencido = !!job && walk?.jobId === job.id && plazoDePagoVencido(pagoActual, ahora, CONFIG.horasParaPagar)
  /** «Enviar reporte»: el paseo pasa a «en disputa» y el caso entra a la cola del equipo (/admin). */
  const enviarReporte = (r: Reporte) => {
    if (!job || walk?.jobId !== job.id) return
    // Un problema con el pago es DESPUÉS del paseo: abre un caso para el equipo sin cambiar el estado del paseo.
    const delPago = pagoDe(pagos, job.id)
    if (r.motivo === 'pago' && delPago) {
      abrirCaso(casoDePago(delPago, r.at, r))
      setReportar(null)
      return
    }
    const nuevo = reportarJob(job, r)
    if (!nuevo || nuevo === job) return
    setJob(nuevo)
    abrirCaso(casoDeReporte(nuevo, r, pagoDe(pagos, nuevo.id)))
    setReportar(null)
  }

  /* ---------- Favoritos y DNI ---------- */
  const toggleFav = (w: Walker) =>
    setStore((st) => (st ? { ...st, favs: st.favs.includes(w.id) ? st.favs.filter((x) => x !== w.id) : [...st.favs, w.id] } : st))
  const goApply = () => router.push('/paseador')

  /* ---------- Reseñas ---------- */
  // Con servidor y una sesión de familia, las reseñas viven en la base (una por paseo) y salen solas: sin internet esperan y no se
  // duplican. Sin servidor, en la cuenta de este teléfono, como siempre.
  const [resenasDelServidor, setResenasDelServidor] = useMisResenas()
  const resenasEnLaBase = reales.aplica
  const misResenas = resenasEnLaBase ? resenasDelServidor : (store?.reviews ?? [])
  const miResena = resenasEnLaBase && walk?.jobId ? misResenas.find((r) => r.paseoId === walk.jobId) : undefined
  const reviewedWalk = resenasEnLaBase ? !!miResena : reviewedLocal
  // Con servidor las estrellas de «Tu reseña está publicada» salen de la reseña guardada (si recargó la página, la de la pantalla ya no está).
  const walkConResena = walk && miResena && walk.rating !== miResena.rating ? { ...walk, rating: miResena.rating } : walk

  const submitReview = (walker: Walker, r: { rating: number; text: string; tags: string[] }) => {
    const review: Review = {
      id: `mine-${uid()}`,
      author: account ? `${account.firstName} ${account.lastName[0] ?? ''}.` : 'Tú',
      district: account?.district ?? 'San Isidro',
      rating: r.rating,
      text: r.text,
      tags: r.tags,
      when: 'Hoy',
      mine: true,
      walkerId: walker.id,
    }
    if (resenasEnLaBase) {
      // Una por paseo: sin paseo, o si ya tiene su reseña, no se escribe otra.
      const paseoId = walk?.jobId
      if (!paseoId || misResenas.some((x) => x.paseoId === paseoId)) return
      setResenasDelServidor((cur) => [{ ...review, id: `resena-${paseoId}`, paseoId }, ...cur])
      // Cuando la base la recibe, la calificación y los comentarios del paseador se vuelven a leer.
      void esperarGuardadoDeLasResenas().then((llego) => {
        if (llego) reales.recargar()
      })
      return
    }
    setStore((s) => (s ? { ...s, reviews: [review, ...s.reviews] } : s))
    setReviewedLocal(true)
  }

  /* ---------- Vistas ---------- */
  const openAddDog = () => setDogSheet({ dog: newDog(), isNew: true })

  const view =
    tab === 'explore' ? (
      <Explore
        account={account}
        dogs={dogs}
        dog={activeDog}
        onPickDog={setActiveDogId}
        onAddDog={openAddDog}
        walk={walk}
        filter={filter}
        onFilter={setFilter}
        spotFilter={spotFilter}
        onSpot={setSpotFilter}
        onClearSpot={() => setSpotFilter(null)}
        onBook={setBookingWalker}
        onReviews={setReviewsFor}
        onGoLive={() => setTab('live')}
        onGoMap={() => setTab('map')}
        onDemo={startDemo}
        onApply={goApply}
        walkers={walkers}
        favs={store?.favs ?? []}
        onFav={toggleFav}
        onDni={setDniFor}
        mostrarEjemplos={reales.aplica ? false : mostrarEjemplos}
        onMostrarEjemplos={reales.aplica ? undefined : setMostrarEjemplos}
        estadoLista={reales.cargando ? 'cargando' : reales.sinConexion ? 'sin_conexion' : undefined}
        onReintentarLista={reales.recargar}
        estado={estado}
        pedido={
          pedidos.pedido ? (
            <FichaPedido pedido={pedidos.pedido} onElegir={elegirRespuesta} onCancelar={() => void pedidos.cancelar()} onCerrar={pedidos.cerrar} />
          ) : (
            <section className="rounded-3xl border border-ink/10 bg-paper p-4">
              <h2 className="font-display text-lg font-extrabold text-ink">{TEXTO_PEDIDO.titulo}</h2>
              <p className="mt-1 text-[14px] text-ink-soft">{TEXTO_PEDIDO.botonApoyo}</p>
              <button type="button" onClick={() => setPedirOpen(true)} className={cn(btnInk, 'mt-3 h-12 w-full text-[15px]')}>
                {TEXTO_PEDIDO.boton}
              </button>
            </section>
          )
        }
      />
    ) : tab === 'map' ? (
      <ZonesMap
        dog={activeDog}
        casa={account?.casa ?? null}
        walkers={walkers}
        onBook={setBookingWalker}
        onSeeWalkers={(id) => {
          setSpotFilter(id)
          setFilter('all')
          setTab('explore')
          setTimeout(() => document.getElementById('paseadores')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
        }}
      />
    ) : tab === 'live' ? (
      <LiveWalk
        walk={walkConResena}
        entries={timeline}
        unread={unread}
        lastWalkerMessage={lastWalker ? { text: lastWalker.text, photo: !!lastWalker.image } : null}
        reviewed={reviewedWalk}
        pin={job && walk?.jobId === job.id ? job.pin : null}
        estado={estado}
        paseo={job && walk?.jobId === job.id ? job.paseo : null}
        simulado={simulado}
        walkerOnline={walkerOnline}
        onSimularAceptacion={simularAceptacion}
        puedeSimular={!walkerReal}
        conServidor={servidor.activo}
        enVivo={ubicacionEnVivo ? { pos: ubicacionEnVivo.pos, reciente: estadoEnVivo(ubicacionEnVivo.en, ahoraEnVivo || ubicacionEnVivo.en).estado === 'reciente', haceSegundos: estadoEnVivo(ubicacionEnVivo.en, ahoraEnVivo || ubicacionEnVivo.en).haceSegundos } : null}
        onCancelar={cancelarPaseo}
        onDescartar={descartarPaseo}
        reasignacion={
          walk && job && walk.jobId === job.id && necesitaReasignacion(job.paseo)
            ? paseadoresCompatibles({ walkers, dog: walk.booking.dog, dayIdx: walk.booking.dayIdx, hour: walk.booking.startHour, excluirId: walk.booking.walker.id })
            : null
        }
        onReservarCon={setBookingWalker}
        pago={pagoActual}
        demoPago={demoPago}
        entregaConfirmada={entregaOk}
        plazoVencido={plazoVencido}
        onSimularVisto={simularVisto}
        reporte={job && walk?.jobId === job.id ? (job.reporte ?? null) : null}
        onReportar={(motivo) => setReportar({ motivo })}
        entregaSinConfirmar={sinConfirmar}
        fotos={fotosDe(fotosPaseo, walk?.jobId)}
        selfie={walk ? selfieDeHoy(fotosPaseo, walk.booking.walker.id, ahora) : null}
        puntos={job && walk?.jobId === job.id ? (job.puntos ?? []) : []}
        ahora={ahora}
        onProbarAvisos={
          // Solo con la cuenta de demostración o con el paseador de ejemplo: a una familia real no se le ofrece.
          simulado || esCuentaDeEjemplo(account)
            ? (escenario: EscenarioAviso) =>
                // Señales inventadas; cada prueba empieza limpia y deja sus avisos en el registro del paseo.
                setJob((j) => registrarLecturas(j, lecturasDeEscenario(escenario, Date.now()), { demo: true, desdeCero: true }))
            : undefined
        }
        onOpenChat={() => setChatOpen(true)}
        onOpenSos={() => setSosOpen(true)}
        onOpenConfirm={() => setConfirmOpen(true)}
        onOpenDog={() => walk && setProfileDog({ dog: walk.booking.dog, walkerView: true })}
        onWriteReview={() => walk && setReviewsFor(walk.booking.walker)}
        onCalificarPorPartes={() => setCalificarOpen(true)}
        distrito={account?.district ?? null}
        onExplore={() => setTab('explore')}
        onRebook={() => walk && setBookingWalker(walk.booking.walker)}
        onDemo={startDemo}
        onSkip={skipToArrival}
      />
    ) : tab === 'safety' ? (
      <SafetyView onExplore={() => setTab('explore')} onApply={goApply} onAlgoPasa={() => setAlgoPasaOpen(true)} onQuienesSomos={() => setQuienesOpen(true)} />
    ) : (
      <ProfileView
        account={account}
        dogs={dogs}
        walk={walk}
        reviews={misResenas}
        welcomeUsed={store?.welcomeUsed ?? false}
        applied={store?.applied ?? false}
        onOpenDog={(d) => setProfileDog({ dog: d, walkerView: false })}
        onAddDog={openAddDog}
        onApply={goApply}
        onReset={resetDemo}
        onOpenAvisos={() => setAvisosOpen(true)}
        onOpenPlanes={() => setPlanesOpen(true)}
        onSalir={modoApp === 'continuar' ? () => void acceso.salir() : undefined}
        onBorrarCuenta={modoApp === 'continuar' ? () => setBorrarCuentaOpen(true) : undefined}
        emergencia={store?.emergencia ?? null}
        onOpenEmergencia={() => setEmergenciaOpen(true)}
        onOpenAyuda={() => setTab('safety')}
        pago={pagoActual && estado && !esFinal(estado) ? pagoActual : null}
        mostrarEjemplos={reales.aplica ? false : mostrarEjemplos}
        onMostrarEjemplos={reales.aplica ? undefined : setMostrarEjemplos}
      />
    )

  const canReviewWalker = !!walk && walk.phase === 'completed' && !reviewedWalk && reviewsFor?.id === walk.booking.walker.id

  /* ---------- Con servidor: la sesión manda ---------- */
  // Mientras se lee la sesión (o se lleva a la persona a la app de su rol) NUNCA se ve la portada.
  // Sin pantalla naranja ni marco de teléfono: al recargar solo se ve el fondo de la web un instante, sin interrumpir.
  if (modoApp === 'cargando' || modoApp === 'ir' || !store) {
    return <div role="status" aria-label="Cargando" className="min-h-dvh bg-canvas" />
  }
  if (modoApp === 'no_se_pudo') {
    return (
      <PhoneFrame>
        <PantallaEspera tipo="no_se_pudo" onReintentar={acceso.recomprobar} onSalir={() => void acceso.salir()} />
      </PhoneFrame>
    )
  }
  // Local: como siempre (sin cuenta, portada). Con servidor: ver `debeMostrarOnboarding` (lib/servidor/destino.ts).
  const mostrarOnboarding = debeMostrarOnboarding({ vista: modoApp, hayCuenta: !!account, cuentaEsDeEjemplo: !!account && esCuentaDeEjemplo(account) })
  // Quien llega sin cuenta ve primero la portada pública (la web de la marca). «Entrar» abre el alta o el inicio de sesión.
  // Si llegó por el enlace del correo, va directo a entrar.
  const desdePortada = mostrarOnboarding && (modoApp === 'local' || modoApp === 'entrada') && !acceso.llegoPorEnlace
  if (desdePortada && !verApp) {
    return <Landing onEntrar={() => setVerApp(true)} />
  }

  return (
    <PhoneFrame>
            <>
              <AvisoDeServidor />
              <div ref={scrollRef} className="no-scrollbar relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="min-h-full"
                  >
                    {view}
                  </motion.div>
                </AnimatePresence>
              </div>

              <BottomNav tab={tab} onChange={setTab} exploreBadge={respuestasNuevas.length} liveBadge={!!walk && walk.phase !== 'completed' && !(estado && esFinal(estado))} />

              <RecordatorioReserva job={job} quien="familia" />
              <AnimatePresence>
                {toast && (
                  <NotificationBanner
                    key={toast.id}
                    toast={toast}
                    onOpen={() => {
                      setToast(null)
                      setTab('live')
                    }}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {bookingWalker && (
                  <BookingSheet
                    key="booking"
                    walker={bookingWalker}
                    account={account}
                    dogs={dogs}
                    initialDogId={activeDog?.id ?? null}
                    welcome={!store.welcomeUsed}
                    onAddDog={openAddDog}
                    onEditDog={(d) => setDogSheet({ dog: d, isNew: false })}
                    onPedirCasa={() => setCasaOpen(true)}
                    onClose={() => setBookingWalker(null)}
                    onConfirmed={enviarSolicitud}
                    onSeeLive={verPaseo}
                    pagoPendiente={debePago ? { perro: debePago.perro } : null}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {pedirOpen && (
                  <PedirPaseoSheet
                    key="pedir"
                    account={account}
                    dogs={dogs}
                    initialDogId={activeDog?.id ?? null}
                    onClose={() => setPedirOpen(false)}
                    onPedir={pedirPaseo}
                    onPedirCasa={() => {
                      setPedirOpen(false)
                      setCasaOpen(true)
                    }}
                    onAddDog={() => {
                      setPedirOpen(false)
                      openAddDog()
                    }}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {casaOpen && account && (
                  <CasaSheet
                    key="casa"
                    valor={account.casa ?? null}
                    onSave={(casa) => {
                      // El distrito sale del punto marcado (la zona manda sobre lo que se escribió antes)
                      patch({ account: { ...account, casa, district: distritoDe(casa) ?? account.district } })
                      setCasaOpen(false)
                    }}
                    onSaveDireccion={(street) => patch({ account: { ...account, street } })}
                    onClose={() => setCasaOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {reviewsFor && (
                  <ReviewsSheet
                    key="reviews"
                    walker={reviewsFor}
                    mine={misResenas.filter((r) => r.walkerId === reviewsFor.id)}
                    canReview={canReviewWalker}
                    dogName={walk?.booking.dog.name ?? 'tu perro'}
                    onReview={(r) => submitReview(reviewsFor, r)}
                    onClose={() => setReviewsFor(null)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {borrarCuentaOpen && <BorrarCuentaSheet key="borrar-cuenta" rol="familia" onBorrar={acceso.borrarCuenta} onClose={() => setBorrarCuentaOpen(false)} />}
              </AnimatePresence>

              <AnimatePresence>
                {calificarOpen && walk && (
                  <CalificarPorPartes
                    key="calificar"
                    quien="familia"
                    paseoId={walk.jobId ?? `paseo-${walk.booking.walker.id}-${walk.booking.dayIdx}-${walk.booking.startMin}`}
                    paseadorId={walk.booking.walker.id}
                    perroId={walk.booking.dog.id}
                    perro={walk.booking.dog.name}
                    paseador={walk.booking.walker.firstName}
                    onClose={() => setCalificarOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>{planesOpen && <PlanesSheet key="planes" onClose={() => setPlanesOpen(false)} />}</AnimatePresence>
              <AnimatePresence>{avisosOpen && <CentroAvisosSheet key="avisos" quien="familia" onClose={() => setAvisosOpen(false)} />}</AnimatePresence>

              <AnimatePresence>
                {chatOpen && walk && (
                  <ChatSheet
                    key="chat"
                    walk={walk}
                    messages={chat}
                    walkerOnline={walkerOnline}
                    actividad={actividadDelPaseador}
                    conServidor={servidor.activo}
                    onSend={sendOwnerMessage}
                    onPhoto={sendOwnerPhoto}
                    onClose={() => setChatOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {emergenciaOpen && (
                  <EmergenciaSheet
                    key="emergencia"
                    actual={store?.emergencia ?? null}
                    onSave={(p) => {
                      patch({ emergencia: p })
                      // El paseo en curso también lo ve (para su SOS).
                      setJob((j) => (j ? { ...j, emergencia: p ?? undefined } : j))
                    }}
                    onClose={() => setEmergenciaOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {algoPasaOpen && (
                  <SiAlgoPasaSheet
                    key="algo-pasa"
                    distrito={account?.district ?? null}
                    paseoEnCurso={!!walk && walk.phase !== 'completed' && !(estado && esFinal(estado))}
                    onOpenSos={() => {
                      setAlgoPasaOpen(false)
                      setSosOpen(true)
                    }}
                    onClose={() => setAlgoPasaOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>{quienesOpen && <QuienesSomosSheet key="quienes" onClose={() => setQuienesOpen(false)} />}</AnimatePresence>

              <AnimatePresence>
                {sosOpen && walk && (
                  <SosSheet
                    key="sos"
                    walk={walk}
                    distrito={account?.district ?? null}
                    onActivate={() => setSos(true)}
                    onCancelAlert={() => setSos(false)}
                    onClose={() => setSosOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {confirmOpen && walk && (
                  <ConfirmSheet
                    key="confirm"
                    walk={walk}
                    reviewed={reviewedWalk}
                    fotos={fotosDe(fotosPaseo, walk.jobId)}
                    jobId={walk.jobId ?? ''}
                    entregaConfirmada={entregaOk}
                    onConfirm={confirmarEntrega}
                    onRate={(n) => setWalk((w) => (w ? { ...w, rating: n } : w))}
                    onReview={(r) => submitReview(walk.booking.walker, r)}
                    onClose={() => setConfirmOpen(false)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {profileDog && (
                  <DogProfileSheet
                    key={`profile-${profileDog.dog.id}`}
                    dog={profileDog.dog}
                    owner={account ? `${account.firstName} ${account.lastName}` : owner}
                    walkerView={profileDog.walkerView}
                    onEdit={
                      profileDog.walkerView
                        ? undefined
                        : () => {
                            setDogSheet({ dog: profileDog.dog, isNew: false })
                            setProfileDog(null)
                          }
                    }
                    onClose={() => setProfileDog(null)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {dogSheet && (
                  <DogSheet
                    key={`dog-${dogSheet.dog.id}`}
                    initial={dogSheet.dog}
                    isNew={dogSheet.isNew}
                    onSave={saveDog}
                    onDelete={deleteDog}
                    onClose={() => setDogSheet(null)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {reportar && walk && (
                  <ReportarSheet key="reportar" quien="dueno" motivoInicial={reportar.motivo} onSend={enviarReporte} onClose={() => setReportar(null)} />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {dniFor && (
                  <DniSheet key="dni" walker={dniFor} onView={() => registrarVistaDni(dniFor.id)} onClose={() => setDniFor(null)} />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {mostrarOnboarding && (
                  <Onboarding
                    key={modoApp === 'continuar' ? 'onboarding-completar' : 'onboarding'}
                    initialReferral={refCode}
                    onFinish={finishOnboarding}
                    onVolverPortada={desdePortada ? () => setVerApp(false) : undefined}
                    servidor={
                      modoApp === 'local'
                        ? undefined
                        : {
                            cliente: acceso.cliente,
                            onListo: acceso.recomprobar,
                            aviso: acceso.llegoPorEnlace ? TEXTO_PANTALLAS.enlaceSinSesion : undefined,
                            completar: modoApp === 'continuar' && acceso.cuenta ? { cuenta: acceso.cuenta, onSalir: () => void acceso.salir() } : null,
                          }
                    }
                  />
                )}
              </AnimatePresence>
            </>
    </PhoneFrame>
  )
}
