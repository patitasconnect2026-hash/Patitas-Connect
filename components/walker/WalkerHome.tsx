'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Check,
  Clock,
  Droplet,
  Droplets,
  Footprints,
  HeartPulse,
  House,
  KeyRound,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  ShieldCheck,
  Siren,
  Sparkles,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { CONFIG, comisionPatitas, montoFamilia, NOMBRE_CORTO, pagoPaseador, precioPaseo, TEXTOS_PAGO } from '@/lib/config'
import { DEMO_DOGS } from '@/lib/data'
import { cerrarParaPaseador, clockLabel, makePin, moverPaseo, newId, newMessageId, registrarLecturas, reportarJob, visibleParaPaseador, type Job } from '@/lib/bus'
import { textoDeActividad, ultimaActividadDe } from '@/lib/chatServidor'
import { casoDePago, casoDeReporte, etiquetaMotivo, type MotivoReporte, type Reporte } from '@/lib/casos'
import { agregarPago, nuevoPago, pagoDe, PASEO_HECHO, resumenDelPaseador } from '@/lib/pagos'
import { textoPagoPaseador, textoRecibes } from '@/lib/pagosTextos'
import { RecordatorioReserva } from '../RecordatorioReserva'
import { DisponibleAhora } from './DisponibleAhora'
import { PedidosDeLaZona } from './PedidosDeLaZona'
import { MapaZona } from '../map/MapaZona'
import { TEXTO_MAPA } from '@/lib/mapaTextos'
import { AperturasDelDni } from './AperturasDelDni'
import { CobroDelPaseo } from './CobroDelPaseo'
import { useAbrirCaso, useAccionesPago, usePublicarUbicacionEnVivo, useAhora, useChat, useEstadoServidor, useEventos, useFotosPaseo, useGuardarFoto, useGuardarSelfie, useLatidoPaseador, usePagos, usePagosEnCola, usePaseoActivo, usePlazos, useServidor, useSincronizarCobro, useSincronizarPago, useVerificarCodigo, useVistasDni, type ResultadoCodigo } from '@/lib/datos'
import { TEXTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { SPOTS } from '@/lib/geo'
import { TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { AvisoDeServidor } from '../AvisoDeServidor'
import { codigoDeFotos, fotosDe, ubicacionParaFoto } from '@/lib/fotos'
import { lecturaSirve, minutosParaControl, ubicacionDeLectura, ultimoControl } from '@/lib/puntosControl'
import { textoErrorGuardado, type ErrorCamara } from '@/lib/fotosTextos'
import { entregaConfirmada, nuevoPaseo, recordatorioEnviado, type AccionPaseo, type EstadoPaseo } from '@/lib/paseo'
import { ReportarSheet } from '../ReportarSheet'
import { CursoStep } from './CursoStep'
import { SelfieDelPaseador } from '../SelfieDelDia'
import { selfieDeHoy, TEXTO_SELFIE } from '@/lib/selfie'
import { PASOS, pasosDelPaseo } from '@/lib/paseoTextos'
import type { Paseo } from '@/lib/paseo'
import { AvisosPaseo } from '../AvisosPaseo'
import { CamaraPaseo, type ResultadoGuardado } from './CamaraPaseo'
import { FotosDelPaseador } from './FotosDelPaseador'
import { UbicacionCard, UbicacionSheet } from './UbicacionPaseo'
import { useSensoresPaseo } from './useSensoresPaseo'
import { EstadoCard } from '../EstadoPaseo'
import { BotonConfirmable } from '../ui/BotonConfirmable'
import { SIZE_INFO } from '@/lib/schedule'
import type { EventKind } from '@/lib/types'
import { btnForest, btnInk, btnPrimary, btnRed, inputBase } from '@/lib/ui'
import { cn, plural, soles } from '@/lib/utils'
import { cobroRegistrado, type WalkerApplication } from '@/lib/walkerStore'
import { lecturasDeEscenario } from '@/lib/zonaDemo'
import { ChatThread, type ThreadMsg } from '../ChatThread'
import { Sheet } from '../ui/Sheet'
import { casillasMarcadas, COMPROBACIONES, llevaEtiquetaNuevo, REGLA_NUEVO, reglaNuevoPaseador, textoCantidadComprobaciones } from '@/lib/verificacion'
import { WalkerSosSheet } from './WalkerSosSheet'
import { VerMas } from '../ui/VerMas'
import { EtiquetaEjemplo } from '../ui/EtiquetaEjemplo'
import { Logo } from '../ui/Logo'
import { ProfileBuilder } from './ProfileBuilder'

type Tab = 'hoy' | 'perfil' | 'verificacion'

function Pipeline({ paseo }: { paseo: Paseo }) {
  const hechos = pasosDelPaseo(paseo)
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Estado del paseo">
      {PASOS.map((p, i) => (
        <li key={p.id} className="text-center">
          <span className={cn('mb-1 block h-1.5 rounded-full', i < hechos ? 'bg-forest' : 'bg-ink/10')} />
          <span className={cn('block text-[12px] font-extrabold leading-tight', i < hechos ? 'text-ink' : 'text-ink-soft')}>{p.etiqueta}</span>
        </li>
      ))}
    </ol>
  )
}

/** Hoy: el paseo asignado y todo lo que el paseador hace durante él. */
function TodayTab({
  app,
  demo,
  onChat,
  onOpenSos,
  onReportar,
  onIrAPerfil,
  unread,
}: {
  app: WalkerApplication
  demo: boolean
  onChat: () => void
  onOpenSos: () => void
  onReportar: (motivo?: MotivoReporte) => void
  /** Lleva a «Mi perfil» (para registrar dónde cobra). */
  onIrAPerfil: () => void
  unread: number
}) {
  const [encargo, setJob] = usePaseoActivo()
  const job = visibleParaPaseador(encargo)
  const [, setChat] = useChat()
  const [, setEvents] = useEventos()
  const [pagos, setPagos] = usePagos()
  const [pinTry, setPinTry] = useState('')
  const [puntoOpen, setPuntoOpen] = useState(false)
  const [pinErr, setPinErr] = useState(false)
  const [entTry, setEntTry] = useState('')
  const [entErr, setEntErr] = useState(false)
  // Con servidor el código lo compara la base (el paseador nunca lo lee) y puede tardar o no haber internet.
  const servidor = useServidor()
  const conServidor = servidor.activo && !demo
  const verificarCodigo = useVerificarCodigo()
  const [verificando, setVerificando] = useState(false)
  const [codigoSinRed, setCodigoSinRed] = useState(false)
  const [intentosMalos, setIntentosMalos] = useState(0)
  usePlazos(encargo, setJob)
  useSincronizarPago(encargo)
  // Ubicación y pantalla encendida durante el paseo. Viven aquí (no en la raíz) porque este es el encargo al día; esta
  // pestaña se queda montada aunque el paseador mire otra (ver `WalkerHome`), así que siguen mientras pasea.
  const sensores = useSensoresPaseo(job, setJob)
  const ahora = useAhora()
  const estado: EstadoPaseo | null = job?.paseo.estado ?? null
  // Con servidor, mientras pasea y con la app abierta, la familia ve su ubicación cada pocos segundos (se borra al entregar).
  usePublicarUbicacionEnVivo(job?.id ?? null, conServidor && estado === 'en_paseo' && sensores.ubicacion === 'activa' && sensores.pantallaEncendida, sensores.ultima)
  // Antes de aceptar (y si no se hizo) el paseador no ve la dirección ni la ficha completa del perro.
  const activo = estado === 'aceptado' || estado === 'en_camino' || estado === 'en_paseo' || estado === 'entregado' || estado === 'en_disputa'
  const etiquetaPaseo = activo ? 'Paseo asignado' : estado === 'cerrado' ? 'Paseo cerrado' : estado === 'cancelado' ? 'Paseo cancelado' : 'Solicitud de paseo'
  // Fotos del paseo: solo con la cámara de la app (lib/fotos.ts, lib/datos/fotos.ts)
  const guardarFoto = useGuardarFoto()
  const fotosDelPaseo = fotosDe(useFotosPaseo(), job?.id)
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  // La foto de hoy del paseador (una por día): no bloquea nada.
  const guardarSelfie = useGuardarSelfie()
  const [selfieAbierta, setSelfieAbierta] = useState(false)
  // Con servidor, el paseador es su cuenta (la misma que figura en sus paseos); sin servidor, su código de siempre.
  const idDelPaseador = demo ? 'carlos' : conServidor && servidor.id ? servidor.id : `nuevo-${app.code}`
  const selfieHoy = selfieDeHoy(useFotosPaseo(), idDelPaseador, ahora)
  const [errorCamara, setErrorCamara] = useState<ErrorCamara | null>(null)
  const [mensajeFoto, setMensajeFoto] = useState<string | null>(null)

  const me = app.person.firstName
  // En los avisos usamos el nombre con el que el dueño reservó, para que ambas apps cuenten la misma historia
  const first = job?.walkerFirst ?? me
  const emit = (kind: EventKind, text: string) => setEvents((e) => [...e, { id: newId(), kind, text, at: Date.now() }])
  /** El paseador hace una transición del paseo (si ya no corresponde, no pasa nada). */
  const mover = (accion: AccionPaseo, nota?: string) => {
    // El pago es al terminar el paseo: salir no espera ningún pago.
    setJob((j) => moverPaseo(j, accion, 'paseador', Date.now(), nota))
  }

  // La plata: lo que el equipo ya le pagó y lo que le toca (pagos que viste). Todo sale del libro de pagos.
  const resumen = resumenDelPaseador(pagos, idDelPaseador)
  const pago = job ? pagoDe(pagos, job.id) : null
  const accionPago = useAccionesPago()
  // Con servidor, «Vi el pago» espera a la base: mientras tanto no se marca nada. Y dónde cobra se guarda en la base.
  const pagosEnCola = usePagosEnCola()
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const sinInternet = useEstadoServidor().conexion === 'sin_conexion'
  useSincronizarCobro(app.cobro, demo)
  const pagoVisto = pago?.estado === 'visto' || pago?.estado === 'pagado_paseador'
  const paseoHecho = !!pago && PASEO_HECHO.includes(pago.paseo)
  const textoPago = textoPagoPaseador(pago?.estado ?? 'sin_registro', pago?.neto ?? job?.walkerPay ?? 0, paseoHecho)
  /** Sin dónde cobrar no puede recibir solicitudes (en la demostración no hace falta: no hay plata real). */
  const sinCobro = !demo && !cobroRegistrado(app.cobro)

  const demoJob = () => {
    const d = DEMO_DOGS[0]
    const jobId = newId()
    const at = Date.now()
    const precio = precioPaseo(CONFIG.tarifaSugerida, 60, false)
    setChat([])
    setEvents([])
    setJob({
      id: jobId,
      walkerFirst: me,
      walkerId: idDelPaseador,
      ownerFirst: 'Valeria',
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
      },
      slotLabel: 'Hoy · 10:00 am',
      durationMin: 60,
      pin: makePin(),
      handoff: 'doorman',
      doormanName: 'Don Julio',
      address: 'Calle Los Cedros 245 · San Isidro',
      groupDogs: 1,
      groupSize: d.size,
      walkerPay: pagoPaseador(precio), // Paseo de demostración (simulado): 60 min a la tarifa sugerida
      createdAt: Date.now(),
      paseo: nuevoPaseo(at),
    })
    // Demostración: el pago nace «sin pagar» como cualquiera; se paga al terminar. Lo marca «Demostración».
    setPagos((l) =>
      agregarPago(
        l,
        nuevoPago({
          jobId,
          walkerId: idDelPaseador,
          paseador: me,
          dueno: 'Valeria',
          perro: d.name,
          cuando: 'Hoy · 10:00 am',
          reserva: { walkPrice: precio, discount: 0, total: montoFamilia(precio), comision: comisionPatitas(precio), neto: pagoPaseador(precio) },
          at,
          paseo: 'solicitado',
          demo: true,
        }),
      ),
    )
  }

  const recogio = (job: Job) => {
    setPinErr(false)
    setCodigoSinRed(false)
    setIntentosMalos(0)
    setPinTry('')
    mover('recoger')
    emit('start', `${first} recogió a ${job.dog.name} · código de recojo correcto ✅`)
  }
  const confirmPin = async () => {
    if (!job || verificando) return
    if (!conServidor) {
      if (pinTry === job.pin) recogio(job)
      else setPinErr(true)
      return
    }
    setVerificando(true)
    const r = await verificarCodigo(job, pinTry)
    setVerificando(false)
    if (r === 'ok') recogio(job)
    else if (r === 'mal') {
      setPinErr(true)
      setCodigoSinRed(false)
      setIntentosMalos((n) => n + 1)
    } else setCodigoSinRed(true)
  }
  /** Con servidor, el código de entrega también lo compara la base. */
  const comprobarEntregaEnServidor = async (j: Job): Promise<ResultadoCodigo> => {
    setVerificando(true)
    const r = await verificarCodigo(j, entTry)
    setVerificando(false)
    return r
  }

  /**
   * Guarda la foto que salió de la cámara: hora del teléfono, la ubicación de ESTE momento (cada foto es un punto de
   * control; si no hay una lectura buena, la última válida o «Sin ubicación») y el código del paseo.
   */
  const guardarDeLaCamara = async (img: { bytes: ArrayBuffer; tipo: string }): Promise<ResultadoGuardado> => {
    if (!job) return { ok: false, mensaje: 'No hay un paseo en curso.' }
    const lectura = await sensores.leerAhora()
    const lugar = lecturaSirve(lectura)
      ? { ubicacion: ubicacionDeLectura(lectura) }
      : ubicacionParaFoto({ vigilancia: job.vigilancia, ubicacion: job.ubicacion })
    const r = await guardarFoto({
      jobId: job.id,
      bytes: img.bytes,
      tipo: img.tipo,
      t: Date.now(),
      codigo: codigoDeFotos(job.id),
      ...lugar,
    })
    if (!r.ok) {
      const mensaje = textoErrorGuardado(r.error, CONFIG.maxFotosPorPaseo)
      setMensajeFoto(mensaje)
      return { ok: false, mensaje }
    }
    setMensajeFoto(null)
    // El dueño lo ve en su bitácora (la imagen está en «Fotos del paseo», con su hora y su lugar)
    emit('photo', `Foto de ${job.dog.name} a las ${clockLabel(Date.now())}`)
    return { ok: true }
  }

  const abrirCamara = () => {
    setErrorCamara(null)
    setMensajeFoto(null)
    setCamaraAbierta(true)
  }

  /** Cierra el paseo en la pantalla del paseador. El encargo sigue para el dueño (estado final, pago, reporte). */
  const closeJob = () => setJob((j) => cerrarParaPaseador(j))

  return (
    <div className="space-y-4 px-4 pb-6 pt-4">

      {/* La cámara de la app: la foto sale solo de aquí (no hay galería) */}
      <AnimatePresence>
        {camaraAbierta && job && (
          <CamaraPaseo
            key="camara"
            codigo={codigoDeFotos(job.id)}
            onFoto={guardarDeLaCamara}
            onCerrar={() => setCamaraAbierta(false)}
            onError={setErrorCamara}
          />
        )}
      </AnimatePresence>

      {/* La foto de hoy: cámara frontal, sin código, y se guarda en este teléfono */}
      <AnimatePresence>
        {selfieAbierta && (
          <CamaraPaseo
            key="selfie"
            codigo={null}
            frontal
            titulo={TEXTO_SELFIE.titulo}
            tomar={TEXTO_SELFIE.camara}
            indicacion={TEXTO_SELFIE.camaraIndicacion}
            onFoto={async (img) => {
              const r = await guardarSelfie({ walkerId: idDelPaseador, bytes: img.bytes, tipo: img.tipo, t: Date.now() })
              return r.ok ? { ok: true } : { ok: false, mensaje: textoErrorGuardado(r.error, 1) }
            }}
            onCerrar={() => setSelfieAbierta(false)}
          />
        )}
      </AnimatePresence>

      {/* Antes de que el navegador pida el permiso: para qué se usa la ubicación. Cerrarla = «Ahora no». */}
      <AnimatePresence>
        {job?.paseo.estado === 'en_paseo' && sensores.ubicacion === 'sin_decidir' && (
          <UbicacionSheet key="ubicacion" onPermitir={sensores.permitir} onAhoraNo={sensores.seguirSinUbicacion} conServidor={conServidor} />
        )}
      </AnimatePresence>

      {job && job.paseo.estado === 'solicitado' && (
        <EstadoCard estado="solicitado" vista="paseador" nombres={{ paseador: first, perro: job.dog.name, dueno: job.ownerFirst }}>
          {sinCobro && (
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-900">
              <p className="text-[14px] font-extrabold leading-snug">Falta registrar dónde cobras.</p>
              <p className="text-[14px] leading-snug">Sin eso no puedes recibir solicitudes.</p>
              <button type="button" onClick={onIrAPerfil} className="mt-2 min-h-11 w-full rounded-full bg-amber-600 px-4 text-[14.5px] font-extrabold text-white active:scale-[0.98]">
                Registrar mi Yape o Plin
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={sinCobro} onClick={() => mover('aceptar')} className={cn(btnPrimary, 'h-14 text-[15px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}>
              <Check size={18} strokeWidth={3} /> Aceptar
            </button>
            <BotonConfirmable
              onConfirm={() => mover('rechazar')}
              confirmar="Otra vez: rechazar"
              className="h-14 rounded-full text-[15px] font-extrabold"
            >
              Rechazar
            </BotonConfirmable>
          </div>
        </EstadoCard>
      )}

      <SelfieDelPaseador foto={selfieHoy} demo={demo} onTomar={() => setSelfieAbierta(true)} />

      {/* Ganancias */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-ink p-4 text-brand-50">
          <p className="eyebrow flex items-center gap-1.5 text-brand-200">
            <Wallet size={13} /> Recibido
          </p>
          <p className="mt-1 font-display text-[30px] font-bold leading-none tabular-nums">{soles(resumen.recibido)}</p>
          <p className="mt-1 text-[12px] text-brand-50/60">{plural(resumen.pagos, 'paseo pagado', 'paseos pagados')}</p>
        </div>
        <div className="rounded-3xl border border-ink/10 bg-paper p-4">
          <p className="eyebrow flex items-center gap-1.5 text-ink-soft">
            <Clock size={13} /> Por recibir
          </p>
          <p className="mt-1 font-display text-[30px] font-bold leading-none tabular-nums text-ink">{soles(resumen.porRecibir)}</p>
          <p className="mt-1 text-[14px] text-ink-soft">{NOMBRE_CORTO} te paga.</p>
        </div>
      </section>

      {!job ? (
        <section className="rounded-3xl border-2 border-dashed border-ink/20 p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sand text-ink-soft">
            <Footprints size={26} />
          </span>
          <h2 className="mt-3 font-display text-[24px] font-bold leading-tight text-ink">Sin paseos asignados</h2>
          <p className="mx-auto mt-1.5 max-w-[280px] text-[14px] leading-relaxed text-ink-soft">Aquí verás el próximo paseo, con la ficha del perro.</p>
          <VerMas className="mx-auto max-w-[280px]">Mantén esta pestaña abierta para verlo aquí.</VerMas>
          {conServidor ? null : (
            <>
              <button type="button" onClick={demoJob} className={cn(btnInk, 'mt-5 h-12 w-full text-[14.5px]')}>
                <Plus size={17} /> Simular una solicitud (demo)
              </button>
              <p className="mt-2 text-[12px] leading-snug text-ink-soft">O reserva en la app del cliente, en otra pestaña (demo).</p>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-brand-700">{etiquetaPaseo}</p>
                <h2 className="font-display text-[28px] font-bold leading-tight text-ink">{job.dog.name}</h2>
                <p className="text-[14px] text-ink-soft">
                  {job.dog.breed} · {SIZE_INFO[job.dog.size].label}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[26px] font-bold leading-none text-forest">{soles(job.walkerPay)}</p>
                <p className="text-[12px] font-semibold text-ink-soft">{textoRecibes(job.walkerPay).split(' ')[0]}</p>
              </div>
            </div>
            <div className="mt-3">
              <Pipeline paseo={job.paseo} />
            </div>
            <ul className="mt-3 space-y-1.5 text-[14px] text-ink-soft">
              <li className="flex items-center gap-2">
                <Clock size={14} className="shrink-0 text-ink-soft" /> {job.slotLabel} · {job.durationMin} min
              </li>
              {job.reserva?.spotId && (
                <li className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-ink-soft" /> {TEXTO_RESERVAS.lugarFila}: {SPOTS.find((s) => s.id === job.reserva?.spotId)?.name ?? job.reserva.spotId}
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0 text-ink-soft" /> {activo ? job.address || TEXTO_SERVIDOR.direccionCargando : estado === 'solicitado' ? 'La dirección se ve al aceptar.' : 'La dirección ya no se muestra.'}
              </li>
              {activo && job.punto && (
                <li>
                  <button type="button" aria-expanded={puntoOpen} onClick={() => setPuntoOpen((v) => !v)} className="min-h-11 text-[14px] font-extrabold text-brand-700 underline underline-offset-4">
                    {puntoOpen ? TEXTO_MAPA.ocultarZona : TEXTO_MAPA.verPunto}
                  </button>
                  {puntoOpen && (
                    <div className="mt-1">
                      <MapaZona centro={job.punto} modo="exacta" />
                    </div>
                  )}
                </li>
              )}
              <li className="flex items-center gap-2">
                <House size={14} className="shrink-0 text-ink-soft" />
                {!activo ? (estado === 'solicitado' ? 'La entrega se ve al aceptar.' : 'La entrega ya no se muestra.') : job.handoff === 'doorman' ? `Entrega con portería${job.doormanName ? ` (${job.doormanName})` : ''}` : `En la puerta con ${job.ownerFirst}`}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="shrink-0 text-ink-soft" />
                {job.groupDogs === 0 ? 'Paseo individual' : `Grupo de ${job.groupDogs + 1} perros ${SIZE_INFO[job.groupSize].plural}`}
              </li>
            </ul>
          </section>

          {/* Ficha del perro (después de aceptar): con servidor, la base la entrega al aceptar y puede tardar un momento */}
          {activo && job.fichaPendiente && (
            <section className="rounded-3xl border border-ink/10 bg-paper p-4">
              <p className="eyebrow text-ink-soft">Ficha de {job.dog.name}</p>
              <p className="mt-2 text-[14px] leading-snug text-ink">{TEXTO_SERVIDOR.fichaCargando}</p>
              <p className="mt-1 text-[14px] leading-snug text-ink-soft">{TEXTO_SERVIDOR.fichaNoLlega}</p>
            </section>
          )}
          {activo && !job.fichaPendiente && (
          <section className="rounded-3xl border border-ink/10 bg-paper p-4">
            <p className="eyebrow text-ink-soft">Ficha de {job.dog.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.dog.temperament.map((t) => (
                <span key={t} className="rounded-full bg-sand px-2.5 py-1 text-[12px] font-bold text-ink-soft">
                  {t}
                </span>
              ))}
              <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold', job.dog.sociable ? 'bg-forest-50 text-forest' : 'bg-red-50 text-red-700')}>
                {job.dog.sociable ? 'Va en grupo' : 'Solo individual'}
              </span>
              <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold', job.dog.vaccinated ? 'bg-forest-50 text-forest' : 'bg-red-50 text-red-700')}>
                {job.dog.vaccinated ? 'Vacunas al día' : 'Sin vacunas al día'}
              </span>
            </div>
            {job.dog.notes && <p className="mt-2.5 text-[14px] leading-snug text-ink-soft">“{job.dog.notes}”</p>}
            {job.dog.medical && (
              <p className="mt-2 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800">
                <HeartPulse size={15} className="mt-0.5 shrink-0" /> {job.dog.medical}
                {job.dog.vet ? ` · Vet: ${job.dog.vet}` : ''}
              </p>
            )}
          </section>
          )}

          {/* Acciones según el estado */}

          {job.paseo.estado === 'aceptado' && (
            <EstadoCard estado="aceptado" vista="paseador" nombres={{ paseador: first, perro: job.dog.name, dueno: job.ownerFirst }}>
              <p role="status" className="rounded-2xl bg-sand p-3 text-[14px] font-semibold leading-snug text-ink">
                <b>{textoPago.titulo}.</b> {textoPago.apoyo}
              </p>
              <button type="button" onClick={() => mover('salir')} className={cn(btnPrimary, 'h-14 w-full text-[16px]')}>
                <Navigation size={19} /> Voy en camino
              </button>
              <BotonConfirmable onConfirm={() => mover('cancelar')} confirmar="Toca otra vez para cancelar" className="w-full rounded-full text-[14px] font-extrabold">
                Cancelar el paseo
              </BotonConfirmable>
            </EstadoCard>
          )}

          {job.paseo.estado === 'en_camino' && (
            <section className="rounded-3xl border border-brand-200 bg-brand-50 p-4">
              <p className="flex items-center gap-2 text-[14px] font-extrabold text-brand-800">
                <KeyRound size={17} /> Código de recojo
              </p>
              <p className="mt-1 text-[14px] leading-snug text-brand-800">Pídele a {job.ownerFirst} (o a portería) el código de 4 dígitos antes de llevarte a {job.dog.name}.</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={pinTry}
                  onChange={(e) => {
                    setPinErr(false)
                    setPinTry(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }}
                  inputMode="numeric"
                  placeholder="0000"
                  aria-label="Código de recojo"
                  className={cn(inputBase, 'h-14 text-center font-display text-[26px] tracking-[0.4em]', pinErr && 'border-red-500')}
                />
                <button type="button" disabled={pinTry.length < 4 || verificando} onClick={() => void confirmPin()} className={cn(btnPrimary, 'h-14 shrink-0 px-6 text-[15px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}>
                  Verificar
                </button>
              </div>
              {pinErr && <p className="mt-2 text-[14px] font-bold text-red-700">Código incorrecto. No te lleves al perro hasta que coincida.</p>}
              {codigoSinRed && <p role="alert" className="mt-2 text-[14px] font-bold text-red-700">{TEXTO_SERVIDOR.codigoSinConexion}</p>}
              {intentosMalos >= 3 && <p className="mt-2 text-[14px] font-semibold text-brand-800">{TEXTO_SERVIDOR.codigoVariasVeces}</p>}
              {demo && <p className="mt-2 text-[14px] text-brand-800">Demo: el código está en la app del cliente, pestaña «Paseo».</p>}
              <BotonConfirmable onConfirm={() => mover('cancelar')} confirmar="Toca otra vez para cancelar" reposoClassName="bg-white/70 text-ink" className="mt-3 w-full rounded-full text-[14px] font-extrabold">
                Cancelar el paseo
              </BotonConfirmable>
            </section>
          )}

          {job.paseo.estado === 'en_paseo' && (
            <section className="space-y-3">
              <UbicacionCard sensores={sensores} onActivar={sensores.permitir} />
              <AvisosPaseo
                paseo={job.paseo}
                vista="paseador"
                conServidor={conServidor}
                onProbar={
                  // Solo con el paseador de demostración: a un paseador real no se le ofrece.
                  demo
                    ? (escenario) =>
                        // Señales inventadas; cada prueba empieza limpia y deja sus avisos en el registro del paseo.
                        setJob((j) => registrarLecturas(j, lecturasDeEscenario(escenario, Date.now()), { demo: true, desdeCero: true }))
                    : undefined
                }
              />
              <p className="eyebrow px-1 text-ink-soft">Avisos rápidos al dueño</p>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { k: 'pee', icon: Droplet, label: 'Hizo pipí', text: `${job.dog.name} hizo pipí 💦` },
                    { k: 'poop', icon: Sparkles, label: 'Recogí todo', text: `${first} recogió todo y dejó el parque impecable ✅` },
                    { k: 'water', icon: Droplets, label: 'Tomó agua', text: 'Pausa para tomar agua 💧' },
                    { k: 'cross', icon: ShieldCheck, label: 'Crucé con cuidado', text: 'Cruzando la avenida con correa corta 🚦' },
                  ] as Array<{ k: EventKind; icon: typeof Droplet; label: string; text: string }>
                ).map((b) => (
                  <button key={b.label} type="button" onClick={() => emit(b.k, b.text)} className="flex h-14 items-center gap-2.5 rounded-2xl border border-ink/10 bg-paper px-3.5 text-left text-[14px] font-extrabold text-ink active:scale-[0.97]">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-sand text-ink-soft">
                      <b.icon size={16} />
                    </span>
                    {b.label}
                  </button>
                ))}
              </div>

              <FotosDelPaseador
                jobId={job.id}
                fotos={fotosDelPaseo}
                tope={CONFIG.maxFotosPorPaseo}
                errorCamara={errorCamara}
                mensaje={mensajeFoto}
                onTomar={abrirCamara}
                control={{ faltanMin: minutosParaControl(ultimoControl(job.paseo, job.puntos, fotosDelPaseo), ahora) }}
              />

              {CONFIG.entregaPideCodigo && (
                <div className="rounded-3xl border border-brand-200 bg-brand-50 p-4">
                  <p className="flex items-center gap-2 text-[14px] font-extrabold text-brand-800">
                    <KeyRound size={17} /> Código de entrega
                  </p>
                  <p className="mt-1 text-[14px] leading-snug text-brand-800">El mismo código del recojo: {job.ownerFirst} te lo dice al recibir a {job.dog.name}.</p>
                  <input
                    value={entTry}
                    onChange={(e) => {
                      setEntErr(false)
                      setEntTry(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }}
                    inputMode="numeric"
                    placeholder="0000"
                    aria-label="Código de entrega"
                    className={cn(inputBase, 'mt-3 h-14 text-center font-display text-[26px] tracking-[0.4em]', entErr && 'border-red-500')}
                  />
                  {entErr && <p className="mt-2 text-[14px] font-bold text-red-700">Código incorrecto. Pídeselo de nuevo a {job.ownerFirst}.</p>}
                  {codigoSinRed && <p role="alert" className="mt-2 text-[14px] font-bold text-red-700">{TEXTO_SERVIDOR.codigoSinConexion}</p>}
                  {intentosMalos >= 3 && <p className="mt-2 text-[14px] font-semibold text-brand-800">{TEXTO_SERVIDOR.codigoVariasVeces}</p>}
                </div>
              )}
              <button
                type="button"
                disabled={(CONFIG.entregaPideCodigo && entTry.length < 4) || verificando}
                onClick={async () => {
                  if (CONFIG.entregaPideCodigo) {
                    // Sin servidor se compara al instante, como siempre; con servidor lo compara la base.
                    const r: ResultadoCodigo = conServidor ? await comprobarEntregaEnServidor(job) : entTry === job.pin ? 'ok' : 'mal'
                    if (r !== 'ok') {
                      setEntErr(r === 'mal')
                      setCodigoSinRed(r === 'sin_conexion')
                      if (r === 'mal' && conServidor) setIntentosMalos((n) => n + 1)
                      return
                    }
                  }
                  setCodigoSinRed(false)
                  mover('entregar', CONFIG.entregaPideCodigo ? 'Con el código de recojo.' : undefined)
                  setEntTry('')
                  emit('arrived', `${first} marcó la entrega de ${job.dog.name}.`)
                }}
                className={cn(btnForest, 'h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none')}
              >
                <House size={19} /> Entregué a {job.dog.name}
              </button>
              {CONFIG.entregaPideCodigo && entTry.length < 4 && (
                <p className="text-center text-[14px] font-semibold text-ink-soft">Escribe el código de 4 dígitos para poder entregar.</p>
              )}
            </section>
          )}

          {/* El cobro es AL FINAL: la familia paga a Patitas, le muestra el pago y el paseador toca «Vi el pago». */}
          {PASEO_HECHO.includes(job.paseo.estado) && pago && (
            <CobroDelPaseo
              pago={pago}
              dueno={job.ownerFirst}
              onVi={async (hora) => {
                setErrorPago(null)
                const r = await accionPago(pago.id, 'ver_pago', 'paseador', { hora })
                if (!r.ok) setErrorPago(r.motivo)
                return r.ok
              }}
              enviando={pagosEnCola.some((e) => e.id === pago.id)}
              sinConexion={sinInternet}
              error={errorPago}
              onReportar={() => onReportar('pago')}
            />
          )}

          {job.paseo.estado === 'entregado' && (
            <EstadoCard estado="entregado" vista="paseador" nombres={{ paseador: first, perro: job.dog.name, dueno: job.ownerFirst }}>
              {recordatorioEnviado(job.paseo) && !entregaConfirmada(job.paseo) && (
                <p className="rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900">
                  {job.ownerFirst} todavía no confirma la entrega. El equipo la revisará.
                </p>
              )}
            </EstadoCard>
          )}

          {job.paseo.estado === 'en_disputa' && (
            <EstadoCard estado="en_disputa" vista="paseador" nombres={{ paseador: first, perro: job.dog.name, dueno: job.ownerFirst }} reporto={job.reporte?.quien}>
              {job.reporte && (
                <p className="rounded-2xl bg-sand p-3 text-[14px] leading-snug text-ink">
                  <b>{etiquetaMotivo(job.reporte.motivo)}:</b> {job.reporte.texto}
                </p>
              )}
            </EstadoCard>
          )}

          {(job.paseo.estado === 'rechazado' || job.paseo.estado === 'expirado' || job.paseo.estado === 'cancelado') && (
            <EstadoCard estado={job.paseo.estado} vista="paseador" nombres={{ paseador: first, perro: job.dog.name, dueno: job.ownerFirst }}>
              <button type="button" onClick={closeJob} className={cn(btnInk, 'h-12 w-full text-[14.5px]')}>
                Cerrar
              </button>
            </EstadoCard>
          )}

          {job.paseo.estado === 'cerrado' && (
            <section className="rounded-3xl bg-forest p-5 text-center text-white">
              <Wallet size={30} className="mx-auto" />
              <p className="mt-1.5 font-display text-[26px] font-bold leading-tight">Paseo cerrado</p>
              <p className="mt-1 text-[14px] text-white/80">{TEXTOS_PAGO.honestidadPaseador}</p>
              {pagoVisto ? (
                <button type="button" onClick={closeJob} className="mt-4 h-12 w-full rounded-full bg-white text-[14.5px] font-extrabold text-forest active:scale-[0.98]">
                  Listo
                </button>
              ) : (
                <BotonConfirmable
                  onConfirm={closeJob}
                  confirmar="Otra vez: aún no viste el pago"
                  className="mt-4 h-12 w-full rounded-full text-[14.5px] font-extrabold"
                  reposoClassName="bg-white text-forest"
                  armadoClassName="bg-amber-100 text-amber-900"
                >
                  Listo
                </BotonConfirmable>
              )}
            </section>
          )}

          {/* Chat y SOS */}
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-2.5">
            <button type="button" onClick={onChat} className={cn(btnInk, 'relative h-14 text-[15px]')}>
              <MessageCircle size={19} /> Chat con {job.ownerFirst}
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[12px] ring-2 ring-canvas">{unread}</span>}
            </button>
            <button
              type="button"
              onClick={onOpenSos}
              className={cn(btnRed, 'h-14 text-[15px]')}
            >
              <Siren size={19} /> SOS
            </button>
          </div>
          {(job.paseo.estado === 'aceptado' || job.paseo.estado === 'en_camino' || job.paseo.estado === 'en_paseo' || job.paseo.estado === 'entregado') && (
            <button type="button" onClick={() => onReportar()} className="min-h-11 w-full rounded-2xl border border-ink/15 px-3 py-2 text-[14px] font-extrabold text-ink active:scale-[0.98]">
              Reportar problema
            </button>
          )}
        </>
      )}
    </div>
  )
}

/** Verificación: en qué va el paseador y qué ven los clientes. */
function VerificationTab({ app, walkerId, demo }: { app: WalkerApplication; walkerId: string; demo: boolean }) {
  const views = useVistasDni(walkerId)
  // Con servidor, quién abrió el DNI no llega entre teléfonos: se avisa en vez de mostrar una lista vacía.
  const servidor = useServidor()
  const conServidor = servidor.activo && !demo
  const [cursoAbierto, setCursoAbierto] = useState(false)
  // Solo las seis comprobaciones de lib/verificacion.ts. La 6 se deduce de los paseos acompañados (regla 1);
  // la etiqueta «Nuevo» es otra cosa (regla 2).
  const paseos = app.review.supervisedWalks
  const marcadas = casillasMarcadas(app.review.comprobaciones, paseos)
  const checks = COMPROBACIONES.map((c) => ({
    ok: marcadas.includes(c.id),
    t: c.titulo,
    d: c.id === 'dni' && !marcadas.includes(c.id) && app.videoSlot ? `Tu cita: ${app.videoSlot}` : c.apoyo,
  }))
  const walks = Math.min(REGLA_NUEVO.paseos, paseos)
  // Los paseos acompañados son los primeros; si ya pasó los 10, se dice cuántos lleva en total (no «10 de 10»).
  const paseosTotales = Math.max(app.review.paseosHechos ?? paseos, paseos)
  const sinEtiqueta = !llevaEtiquetaNuevo(paseos)
  return (
    <div className="space-y-4 px-4 pb-6 pt-4">
      <section className="rounded-3xl bg-ink p-5 text-brand-50">
        <p className="eyebrow text-brand-200">Tu código</p>
        <p className="mt-1 font-display text-[40px] font-bold leading-none tracking-[0.1em]">{app.code}</p>
        <p className="mt-2 text-[14px] leading-snug text-brand-50/70">Los clientes lo ven en tu perfil.</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50/10 px-3 py-1.5 text-[14px] font-extrabold">
          <ShieldCheck size={14} /> {textoCantidadComprobaciones(marcadas.length)}
          {llevaEtiquetaNuevo(paseos) ? ` · ${REGLA_NUEVO.etiqueta}` : ''}
        </p>
      </section>

      <section className="rounded-3xl border border-ink/10 bg-paper p-4">
        <p className="text-[14px] font-extrabold text-ink">{sinEtiqueta ? 'Tus paseos' : `Etiqueta «${REGLA_NUEVO.etiqueta}»`}</p>
        {sinEtiqueta ? (
          // Ya pasó los primeros paseos acompañados: se dice cuántos lleva en total (el mismo número que ve el dueño)
          <p className="mt-1 font-display text-[28px] font-bold leading-tight text-ink">{plural(paseosTotales, 'paseo', 'paseos')}</p>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${(walks / REGLA_NUEVO.paseos) * 100}%` }} />
            </div>
            <span className="text-[14px] font-extrabold tabular-nums text-ink">{walks} / {REGLA_NUEVO.paseos}</span>
          </div>
        )}
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{reglaNuevoPaseador(paseos)}</p>
      </section>

      {demo && (
        <section className="rounded-3xl border border-ink/10 bg-paper p-4">
          <p className="text-[14px] font-extrabold text-ink">Mini curso</p>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">Demostración: se ve completo y no guarda nada.</p>
          <button type="button" onClick={() => setCursoAbierto(true)} className={cn(btnInk, 'mt-3 h-12 w-full text-[14.5px]')}>
            Ver el mini curso
          </button>
        </section>
      )}
      {cursoAbierto && (
        <Sheet label="Mini curso" onClose={() => setCursoAbierto(false)} full>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">
            <CursoStep demostracion intentos={0} onDone={() => undefined} onContinue={() => setCursoAbierto(false)} />
          </div>
        </Sheet>
      )}

      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.t} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3">
            <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', c.ok ? 'bg-forest text-white' : 'bg-ink/10 text-ink-soft')}>{c.ok ? <Check size={14} strokeWidth={3.5} /> : <Clock size={13} />}</span>
            <span>
              <span className="block text-[14px] font-extrabold text-ink">{c.t}</span>
              <span className="block text-[14px] text-ink-soft">{c.d}</span>
            </span>
          </li>
        ))}
      </ul>

      <AperturasDelDni conServidor={conServidor} views={views} />
    </div>
  )
}

export function WalkerHome({
  app,
  demo,
  onChange,
  onLogout,
  onSalir,
  onBorrarCuenta,
  onDelete,
}: {
  app: WalkerApplication
  demo: boolean
  onChange: (fn: (a: WalkerApplication) => WalkerApplication) => void
  onLogout: () => void
  /** Solo con servidor y con sesión: cierra la sesión (no borra lo que hay en el teléfono). */
  onSalir?: () => void
  /** Solo con servidor y con sesión: abre «¿Borrar tu cuenta?» (la hoja que borra en el servidor). Sin esto, se borra lo del teléfono. */
  onBorrarCuenta?: () => void
  onDelete: () => void
}) {
  const [tab, setTab] = useState<Tab>('hoy')
  const [chatOpen, setChatOpen] = useState(false)
  const [seen, setSeen] = useState(0)
  const [encargo, setJob] = usePaseoActivo()
  const job = visibleParaPaseador(encargo)
  const [chat, setChat] = useChat()
  const [confirmDel, setConfirmDel] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)
  const [reportar, setReportar] = useState<{ motivo?: MotivoReporte } | null>(null)
  const abrirCaso = useAbrirCaso()
  const [pagosLibro] = usePagos()
  /** «Enviar reporte»: el paseo pasa a «en disputa» y el caso entra a la cola del equipo (/admin). */
  const enviarReporte = (r: Reporte) => {
    if (!job) return
    // Un problema con el pago es DESPUÉS del paseo: abre un caso para el equipo sin cambiar el estado del paseo.
    const delPago = pagoDe(pagosLibro, job.id)
    if (r.motivo === 'pago' && delPago) {
      abrirCaso(casoDePago(delPago, r.at, r))
      setReportar(null)
      return
    }
    const nuevo = reportarJob(job, r)
    if (!nuevo || nuevo === job) return
    setJob(nuevo)
    abrirCaso(casoDeReporte(nuevo, r))
    setReportar(null)
  }
  const [events, setEvents] = useEventos()
  const walkerId = demo ? 'carlos' : `nuevo-${app.code}`
  const servidor = useServidor()
  const conServidor = servidor.activo && !demo
  const estadoServidor = useEstadoServidor()
  const ahoraChat = useAhora()
  useLatidoPaseador(true)

  const ownerMsgs = chat.filter((m) => m.from === 'owner')
  useEffect(() => {
    if (chatOpen) setSeen(ownerMsgs.length)
  }, [chatOpen, ownerMsgs.length])
  const unread = chatOpen ? 0 : Math.max(0, ownerMsgs.length - seen)

  const thread: ThreadMsg[] = chat.map((m) => ({ id: m.id, mine: m.from === 'walker', text: m.text, image: m.image, time: clockLabel(m.at) }))
  // Con servidor el id lo usa la base para no duplicar el mensaje si hay que reenviarlo.
  const nuevoId = () => (conServidor ? newMessageId() : newId())
  const sendText = (text: string) => setChat((c) => [...c, { id: nuevoId(), from: 'walker', text, at: Date.now() }])
  const sendImage = (image: string) => setChat((c) => [...c, { id: nuevoId(), from: 'walker', image, at: Date.now() }])
  /** Con servidor: lo último que hizo la familia en este paseo (sus mensajes y sus cambios). Nunca «en línea». */
  const actividadDeLaFamilia = conServidor && job ? textoDeActividad(ultimaActividadDe('owner', chat, job.paseo), ahoraChat) : null

  const tabs: Array<{ id: Tab; label: string; icon: typeof User }> = [
    { id: 'hoy', label: 'Hoy', icon: Footprints },
    { id: 'perfil', label: 'Mi perfil', icon: User },
    { id: 'verificacion', label: 'Verificación', icon: ShieldCheck },
  ]

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-canvas">
      <RecordatorioReserva job={job} quien="paseador" />
      <header className="flex items-center gap-3 border-b border-ink/10 bg-paper px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
        {app.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.photo} alt="" className="h-11 w-11 rounded-full border border-ink/10 object-cover" />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-700 font-display text-[19px] font-bold text-white">{app.person.firstName.charAt(0)}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[20px] font-bold leading-tight text-ink">Hola, {app.person.firstName}</p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] font-bold text-forest">
            <span className={cn('h-1.5 w-1.5 rounded-full', conServidor && estadoServidor.conexion !== 'conectado' ? 'bg-amber-600' : 'bg-forest')} />{' '}
            {/* Con servidor se dice lo que de verdad pasa con la conexión; en el teléfono (demostración) sigue igual. */}
            {conServidor ? (estadoServidor.conexion === 'conectado' ? 'Conectado' : estadoServidor.conexion === 'conectando' ? 'Conectando…' : 'Sin conexión') : 'Conectado'}
            {demo && <EtiquetaEjemplo />}
          </p>
        </div>
        {/* En pantallas angostas solo el sello: con el nombre completo el saludo se parte en dos líneas. */}
        <Logo size={22} className="shrink-0 max-[400px]:[&>span:last-child]:hidden" />
      </header>
      <AvisoDeServidor />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* «Hoy» no se desmonta al cambiar de pestaña: así la ubicación y la pantalla encendida siguen durante el paseo. */}
        <div hidden={tab !== 'hoy'}>
          {conServidor && <PedidosDeLaZona sesionId={servidor.id} activo={tab === 'hoy' && app.profile.disponible !== false} />}
          <TodayTab
            app={app}
            demo={demo}
            onChat={() => setChatOpen(true)}
            onOpenSos={() => setSosOpen(true)}
            onReportar={(motivo) => setReportar({ motivo })}
            onIrAPerfil={() => setTab('perfil')}
            unread={unread}
          />
        </div>
        {tab === 'perfil' && (
          <div className="space-y-5 px-4 pb-8 pt-4">
            <div>
              <p className="eyebrow text-brand-700">Mi perfil público</p>
              <h2 className="font-display text-[28px] font-bold leading-tight text-ink">Así te eligen</h2>
              <p className="mt-1 text-[14px] leading-snug text-ink-soft">
                {conServidor ? TEXTO_SERVIDOR.perfilSoloTelefono : 'Los cambios se guardan solos y los clientes los ven al instante.'}
              </p>
            </div>
            <DisponibleAhora
              disponible={app.profile.disponible !== false}
              onChange={(v) => onChange((a) => ({ ...a, profile: { ...a.profile, disponible: v } }))}
            />
            <ProfileBuilder app={app} onChange={onChange} />
            <div className="space-y-2.5 border-t border-ink/10 pt-5">
              {demo && (
                <button type="button" onClick={onLogout} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink/15 text-[14px] font-extrabold text-ink active:scale-[0.98]">
                  <LogOut size={16} /> Salir de la demo
                </button>
              )}
              {!demo && onSalir && (
                <button type="button" onClick={onSalir} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink/15 text-[14px] font-extrabold text-ink active:scale-[0.98]">
                  <LogOut size={16} /> Salir
                </button>
              )}
              {!demo && (
                <button type="button" onClick={onBorrarCuenta ?? (() => setConfirmDel(true))} className="flex h-12 w-full items-center justify-center gap-2 text-[14px] font-bold text-red-700 underline underline-offset-4">
                  <Trash2 size={15} /> Borrar mi cuenta y mis datos
                </button>
              )}
            </div>
          </div>
        )}
        {tab === 'verificacion' && <VerificationTab app={app} walkerId={walkerId} demo={demo} />}
      </div>

      <nav aria-label="Navegación del paseador" className="shrink-0 border-t border-ink/10 bg-paper pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        <ul className="flex">
          {tabs.map((t) => {
            const on = tab === t.id
            return (
              <li key={t.id} className="flex-1">
                <button type="button" onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined} className="min-h-11 relative flex w-full flex-col items-center gap-0.5 pb-0.5 pt-2.5">
                  {on && <motion.span layoutId="walker-nav" className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-brand-600" />}
                  <t.icon size={22} strokeWidth={on ? 2.6 : 2} className={on ? 'text-brand-700' : 'text-ink-soft'} />
                  <span className={cn('text-[12px] font-extrabold', on ? 'text-brand-700' : 'text-ink-soft')}>{t.label}</span>
                  {t.id === 'hoy' && job && <span className="absolute right-[28%] top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-paper" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <AnimatePresence>
        {chatOpen && job && (
          <Sheet label={`Chat con ${job.ownerFirst}`} onClose={() => setChatOpen(false)} full>
            <header className="flex items-center gap-3 border-b border-ink/10 px-5 pb-3 pt-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-[19px] font-bold leading-tight text-ink">{job.ownerFirst}</p>
                <p className="text-[14px] font-bold text-ink-soft">{actividadDeLaFamilia ?? `Reservó el paseo de ${job.dog.name}`}</p>
              </div>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="Cerrar chat" className="grid h-11 w-11 place-items-center rounded-full bg-sand text-ink active:scale-95">
                <X size={18} />
              </button>
            </header>
            {conServidor && (
              <p className="flex items-start gap-2 bg-brand-50 px-5 py-2.5 text-[12px] font-semibold leading-snug text-brand-800">
                <Camera size={15} className="mt-0.5 shrink-0" />
                {TEXTO_SERVIDOR.chatSinFotos}
              </p>
            )}
            {conServidor && <AvisoDeServidor className="px-0" />}
            <ChatThread
              messages={thread}
              peer={job.ownerFirst}
              quick={['Ya llegué 👋', 'Todo en orden 🐾', 'Llego en 5 minutos']}
              onSend={sendText}
              onPhoto={sendImage}
              sinFotos={conServidor}
              vacio={conServidor ? TEXTO_SERVIDOR.chatVacio : undefined}
            />
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sosOpen && job && (
          <WalkerSosSheet
            key="sos"
            job={job}
            walkerName={job.walkerFirst || app.person.firstName}
            noted={events.some((e) => e.kind === 'sos')}
            onNote={() =>
              setEvents((e) => [...e, { id: newId(), kind: 'sos', text: `${job.walkerFirst || app.person.firstName} necesita ayuda: alerta SOS del paseador 🚨`, at: Date.now() }])
            }
            onClose={() => setSosOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportar && job && <ReportarSheet key="reportar" quien="paseador" motivoInicial={reportar.motivo} onSend={enviarReporte} onClose={() => setReportar(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDel && (
          <Sheet label="Borrar mi cuenta" onClose={() => setConfirmDel(false)}>
            <div className="space-y-4 px-5 pb-6 pt-4">
              <h2 className="font-display text-[26px] font-bold leading-tight text-ink">¿Borrar tu cuenta?</h2>
              <p className="text-[14px] font-semibold leading-relaxed text-ink">Borra tus datos de este teléfono. No se puede deshacer.</p>
              <VerMas>Se elimina tu postulación, tu foto, tu DNI y tus datos de este teléfono.</VerMas>
              <button type="button" onClick={onDelete} className={cn(btnRed, 'h-14 w-full text-[15.5px]')}>
                Sí, borrar todo
              </button>
              <button type="button" onClick={() => setConfirmDel(false)} className="h-12 w-full text-[14px] font-bold text-ink-soft">
                Cancelar
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}

