'use client'

import { MapPin, MessageCircle, Phone, TriangleAlert } from 'lucide-react'
import { CONFIG, etiquetaAyuda, NOMBRE_CORTO } from '@/lib/config'
import {
  contactosSos,
  emergenciasSos,
  mensajeSos,
  pasosSos,
  serenazgoSos,
  type ContactoSos,
  type Distrito,
  type FilaServicio,
  type Persona,
  type Posicion,
  type Quien,
} from '@/lib/sos'

export type EstadoUbicacion = 'buscando' | 'lista' | 'sin'

const botonLlamar =
  'flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-[14.5px] font-bold text-white active:scale-[0.97]'
const botonWhatsApp =
  'flex h-12 items-center justify-center gap-2 rounded-2xl bg-forest text-[14.5px] font-bold text-white active:scale-[0.97]'

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3.5 text-[14px] font-semibold leading-snug text-amber-900">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function Botones({ nombre, llamar, whatsapp }: { nombre: string; llamar: string | null; whatsapp: string | null }) {
  return (
    <div className={`mt-2 grid gap-2 ${llamar && whatsapp ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {llamar && (
        <a href={llamar} aria-label={`Llamar a ${nombre}`} className={botonLlamar}>
          <Phone size={17} /> Llamar
        </a>
      )}
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${nombre}`} className={botonWhatsApp}>
          <MessageCircle size={17} /> WhatsApp
        </a>
      )}
    </div>
  )
}

function FilaContacto({ c }: { c: ContactoSos }) {
  return (
    <li className="rounded-2xl border border-ink/10 bg-paper p-3">
      <p className="text-[15px] font-extrabold text-ink">{c.nombre}</p>
      <Botones nombre={c.nombre} llamar={c.llamar} whatsapp={c.whatsapp} />
    </li>
  )
}

/** Una fila de servicio (serenazgo). Si no está configurado, dice «Falta configurar» y no queda muda. */
function FilaServicioUI({ f }: { f: FilaServicio }) {
  return (
    <li className="rounded-2xl border border-ink/10 bg-paper p-3">
      <p className="text-[15px] font-extrabold text-ink">{f.nombre}</p>
      {f.configurado ? (
        <Botones nombre={f.nombre} llamar={f.llamar} whatsapp={f.whatsapp} />
      ) : (
        <p className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[14px] font-semibold text-amber-900">
          <TriangleAlert size={17} className="shrink-0" /> Falta configurar
        </p>
      )}
    </li>
  )
}

/** Los contactos de ayuda de Patitas. Si el equipo aún no los configuró, lo dice claro. */
export function AyudaContactos({ mensaje }: { mensaje: string }) {
  const contactos = contactosSos(CONFIG.contactosAyuda, mensaje)
  if (contactos.length === 0) {
    return <Aviso>Falta configurar el contacto de {NOMBRE_CORTO}.</Aviso>
  }
  return (
    <ul className="space-y-2.5">
      {contactos.map((c) => (
        <FilaContacto key={c.nombre + (c.llamar ?? c.whatsapp ?? '')} c={c} />
      ))}
    </ul>
  )
}

function textoUbicacion(estado: EstadoUbicacion, pos: Posicion | null) {
  if (estado === 'buscando') return 'Buscando tu ubicación…'
  if (estado === 'sin' || !pos) return 'No pudimos obtener la ubicación. El mensaje saldrá sin mapa.'
  return pos.origen === 'simulada' ? 'Ubicación de demostración (no es real).' : 'Ubicación de tu teléfono lista para el mensaje.'
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="eyebrow text-ink-soft">
        {titulo}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/**
 * A quién llamar: serenazgo del distrito (si no se sabe, los dos) → Policía, Bomberos y SAMU → Patitas.
 * Lo usan el SOS del paseo y «Si algo pasa». Nada queda mudo: lo que falta dice «Falta configurar».
 */
export function ContactosSos({ distrito, mensaje }: { distrito: Distrito | null; mensaje: string }) {
  const serenazgo = serenazgoSos(distrito, mensaje)
  const emergencias = emergenciasSos()
  return (
    <>
      <Seccion id="sos-serenazgo" titulo={distrito ? `Serenazgo · ${distrito}` : 'Serenazgo'}>
        <ul className="space-y-2.5">
          {serenazgo.map((f) => (
            <FilaServicioUI key={f.nombre} f={f} />
          ))}
        </ul>
      </Seccion>

      {emergencias.length > 0 && (
        <Seccion id="sos-emergencias" titulo="Emergencias">
          <ul className="space-y-2.5">
            {emergencias.map((e) => (
              <li key={e.numero} className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper p-3">
                <span className="min-w-0 text-[15px] font-extrabold text-ink">
                  {e.nombre} <span className="font-semibold text-ink-soft">· {e.numero}</span>
                </span>
                <a href={e.llamar} aria-label={`Llamar a ${e.nombre}, ${e.numero}`} className={`${botonLlamar} shrink-0 px-5`}>
                  <Phone size={17} /> Llamar
                </a>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion id="sos-patitas" titulo={etiquetaAyuda(NOMBRE_CORTO)}>
        <AyudaContactos mensaje={mensaje} />
      </Seccion>
    </>
  )
}

/**
 * Orden de la pantalla: pasos → serenazgo del distrito del paseo (si no se sabe, los dos) → Policía, Bomberos y SAMU
 * → Patitas → (solo el paseador) el contacto del dueño, por si el dueño no contesta.
 */
export function SosPanel({
  quien,
  perro,
  paseador,
  distrito,
  posicion,
  ubicacion,
  emergencia,
}: {
  quien: Quien
  perro: string
  paseador: string
  /** null = no se sabe el distrito: se muestran los dos serenazgos. */
  distrito: Distrito | null
  posicion: Posicion | null
  ubicacion: EstadoUbicacion
  /** Contacto de emergencia que dejó el dueño. Solo lo usa el SOS del paseador. */
  emergencia: Persona | null
}) {
  const mensaje = mensajeSos({ quien, perro, paseador, posicion, buscando: ubicacion === 'buscando' })
  const pasos = pasosSos({ quien, perro, paseador })
  const contactoDueno = quien === 'paseador' && emergencia ? contactosSos([emergencia], mensaje)[0] : undefined

  return (
    <div className="space-y-5">
      <Seccion id="sos-pasos" titulo="Qué hacer, en orden">
        <ol className="space-y-2">
          {pasos.map((p, i) => (
            <li key={p} className="flex items-start gap-3 rounded-2xl bg-sand p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-extrabold text-white">{i + 1}</span>
              <span className="text-[14.5px] font-semibold leading-snug text-ink">{p}</span>
            </li>
          ))}
        </ol>
      </Seccion>

      <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-soft">
        <MapPin size={16} className="shrink-0" /> {textoUbicacion(ubicacion, posicion)}
      </p>

      <ContactosSos distrito={distrito} mensaje={mensaje} />

      {quien === 'paseador' && (
        <Seccion id="sos-dueno" titulo="Contacto del dueño">
          {contactoDueno ? (
            <>
              <ul>
                <FilaContacto c={contactoDueno} />
              </ul>
              <p className="mt-2 text-[14px] text-ink-soft">Úsalo si el dueño no contesta el chat.</p>
            </>
          ) : (
            <Aviso>El dueño no dejó un contacto. Avísale por el chat.</Aviso>
          )}
        </Seccion>
      )}
    </div>
  )
}
