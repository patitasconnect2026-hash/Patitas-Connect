'use client'

import { Camera, UserRound } from 'lucide-react'
import type { FotoPaseo } from '@/lib/fotos'
import { useFotosSinEnviar, useFotoUrl, useServidor } from '@/lib/datos'
import { textoSelfie, TEXTO_SELFIE } from '@/lib/selfie'
import { TEXTO_FOTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { cn } from '@/lib/utils'
import type { Walker } from '@/lib/types'
import { PortraitAvatar } from './ui/PortraitAvatar'

/** La miniatura de la foto de hoy (la imagen vive en este teléfono). */
function Miniatura({ foto, className }: { foto: FotoPaseo; className?: string }) {
  const { url } = useFotoUrl(foto)
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={textoSelfie(foto)} width={56} height={56} className={cn('h-14 w-14 shrink-0 rounded-2xl border border-ink/10 object-cover', className)} />
  ) : (
    <span className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sand text-ink-soft', className)}>
      <UserRound size={22} />
    </span>
  )
}

/**
 * Lo que ve la FAMILIA junto al nombre del paseador: «Foto de hoy, 08:41» o «Sin foto de hoy».
 * Con un paseador de ejemplo y sin foto, una ilustración marcada «Demostración». No dice nada más que eso:
 * una foto no prueba quién es la persona.
 */
export function SelfieEnPaseo({ foto, walker, className }: { foto: FotoPaseo | null; walker: Pick<Walker, 'esEjemplo'> & Partial<Pick<Walker, 'portrait' | 'photo'>>; className?: string }) {
  const conServidor = useServidor().activo
  if (foto) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Miniatura foto={foto} />
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold leading-tight text-ink">{textoSelfie(foto)}</p>
          {walker.esEjemplo && <p className="text-[12px] font-extrabold text-ink-soft">{TEXTO_SELFIE.demostracion}</p>}
          <p className="text-[12px] leading-snug text-ink-soft">{conServidor ? TEXTO_SELFIE.familiaServidor : TEXTO_SELFIE.soloAqui}</p>
        </div>
      </div>
    )
  }
  if (walker.esEjemplo && walker.portrait) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <PortraitAvatar portrait={walker.portrait} photo={walker.photo} alt="" className="h-14 w-11 shrink-0 rounded-t-3xl rounded-b-xl border border-ink/10" />
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold leading-tight text-ink">{TEXTO_SELFIE.ejemplo}</p>
          <p className="text-[12px] font-extrabold text-ink-soft">{TEXTO_SELFIE.demostracion}</p>
        </div>
      </div>
    )
  }
  return (
    <p className={cn('flex items-center gap-2 text-[14px] font-extrabold text-ink-soft', className)}>
      <UserRound size={16} className="shrink-0" /> {TEXTO_SELFIE.sin}
    </p>
  )
}

/** La tarjeta del paseador en «Hoy»: su foto de hoy y el botón. NO bloquea nada. */
export function SelfieDelPaseador({ foto, demo, onTomar }: { foto: FotoPaseo | null; demo: boolean; onTomar: () => void }) {
  const conServidor = useServidor().activo
  const sinEnviar = useFotosSinEnviar()
  const pendiente = !!foto && sinEnviar.has(foto.id)
  return (
    <section aria-label={TEXTO_SELFIE.titulo} className="rounded-3xl border border-ink/10 bg-paper p-4">
      <div className="flex items-center gap-3">
        {foto ? (
          <Miniatura foto={foto} />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sand text-ink-soft">
            <Camera size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[15px] font-extrabold leading-tight text-ink">
            {textoSelfie(foto)}
            {demo && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-extrabold">{TEXTO_SELFIE.demostracion}</span>}
          </p>
          <p className="text-[14px] leading-snug text-ink-soft">{TEXTO_SELFIE.apoyoPaseador}</p>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-ink-soft">{conServidor ? TEXTO_SELFIE.paseadorServidor : TEXTO_SELFIE.soloAqui}</p>
      {pendiente && (
        <p role="status" className="mt-1.5 text-[14px] font-semibold leading-snug text-amber-900">
          {TEXTO_FOTO_SERVIDOR.sinEnviar}. {TEXTO_FOTO_SERVIDOR.sinEnviarApoyo}
        </p>
      )}
      <button type="button" onClick={onTomar} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[14.5px] font-extrabold text-white active:scale-[0.98]">
        <Camera size={17} /> {foto ? TEXTO_SELFIE.otra : TEXTO_SELFIE.tomar}
      </button>
    </section>
  )
}
