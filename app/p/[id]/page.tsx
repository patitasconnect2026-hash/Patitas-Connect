import type { Metadata } from 'next'
import { CONFIG, NOMBRE_APP } from '@/lib/config'
import { TEXTO_CHAPITA } from '@/lib/chapitaTextos'
import { enlaceLlamada, enlaceWhatsApp } from '@/lib/telefono'

export const metadata: Metadata = { title: `Chapita · ${NOMBRE_APP}`, robots: { index: false, follow: false } }

/** Lo que ve quien escanea el QR de una chapita. No lee ningún dato del perro: el piloto no tiene dónde guardarlo para mostrarlo a un desconocido. */
export default function Page() {
  const contactos = CONFIG.contactosAyuda.filter((c) => enlaceLlamada(c.telefono) || enlaceWhatsApp(c.whatsapp || c.telefono, ''))
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-canvas px-6 py-10 text-ink">
      <p className="eyebrow text-brand-700">{NOMBRE_APP}</p>
      <h1 className="font-display mt-2 text-[34px] font-bold leading-tight">{TEXTO_CHAPITA.titulo}</h1>
      <p className="mt-3 text-[16px] leading-relaxed">{TEXTO_CHAPITA.gracias}</p>
      <ol className="mt-5 list-decimal space-y-2 pl-5 text-[16px] leading-snug">
        {TEXTO_CHAPITA.pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <section aria-label={TEXTO_CHAPITA.contactos} className="mt-6 space-y-3">
        {contactos.length === 0 ? (
          <p className="rounded-2xl bg-sand p-4 text-[16px] font-bold">{TEXTO_CHAPITA.sinContacto}</p>
        ) : (
          contactos.map((c) => (
            <div key={`${c.nombre}${c.telefono}`} className="rounded-2xl border border-ink/10 bg-paper p-4">
              <p className="text-[16px] font-extrabold">{c.nombre || TEXTO_CHAPITA.contactos}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {enlaceLlamada(c.telefono) && (
                  <a href={enlaceLlamada(c.telefono) ?? undefined} className="inline-flex h-12 items-center rounded-full bg-ink px-5 text-[15px] font-extrabold text-white">
                    {TEXTO_CHAPITA.llamar}
                  </a>
                )}
                {enlaceWhatsApp(c.whatsapp || c.telefono, TEXTO_CHAPITA.mensaje) && (
                  <a href={enlaceWhatsApp(c.whatsapp || c.telefono, TEXTO_CHAPITA.mensaje) ?? undefined} className="inline-flex h-12 items-center rounded-full bg-brand-700 px-5 text-[15px] font-extrabold text-white">
                    {TEXTO_CHAPITA.escribir}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </section>
      <p className="mt-6 text-[14px] leading-snug text-ink-soft">{TEXTO_CHAPITA.limite}</p>
    </main>
  )
}
