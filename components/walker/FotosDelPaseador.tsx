'use client'

import { Camera } from 'lucide-react'
import { clockLabel } from '@/lib/bus'
import { useFotosSinEnviar, useServidor } from '@/lib/datos'
import { codigoDeFotos, lugarDeFoto, type FotoPaseo } from '@/lib/fotos'
import { contadorFotos, TEXTO_ERROR_CAMARA, TEXTO_FOTOS, type ErrorCamara } from '@/lib/fotosTextos'
import { masPaseador, TEXTO_PUNTOS, textoProxima } from '@/lib/puntosControlTextos'
import { TEXTO_FOTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { cn } from '@/lib/utils'
import { btnPrimary } from '@/lib/ui'
import { FotoImg } from '../FotoImg'
import { VerMas } from '../ui/VerMas'

/**
 * «Fotos del paseo» en la pantalla «Hoy» del paseador: cuántas lleva, el código que la app estampa en cada una, el botón
 * de la cámara y las fotos ya sacadas. Si no hay cámara o permiso, lo dice (el paseo sigue).
 */
export function FotosDelPaseador({
  jobId,
  fotos,
  tope,
  errorCamara,
  mensaje,
  onTomar,
  control,
  className,
}: {
  jobId: string
  /** Las fotos de ESTE paseo. */
  fotos: FotoPaseo[]
  tope: number
  /** La cámara no abrió la última vez (permiso negado, sin HTTPS…). */
  errorCamara: ErrorCamara | null
  /** Una frase corta de lo último que pasó al guardar (si hay). */
  mensaje: string | null
  onTomar: () => void
  /**
   * El punto de control: cuántos minutos faltan para la próxima foto de control (0 = ya toca). Un recordatorio suave:
   * solo se ve con la pantalla encendida. null = el paseo todavía no empezó.
   */
  control?: { faltanMin: number | null }
  className?: string
}) {
  const toca = control?.faltanMin === 0
  const llena = fotos.length >= tope
  // Con servidor, la foto queda primero en el teléfono y se envía sola: las que faltan por enviar se marcan.
  const conServidor = useServidor().activo
  const sinEnviar = useFotosSinEnviar()
  const faltanEnviar = fotos.filter((f) => sinEnviar.has(f.id)).length
  const e = errorCamara ? TEXTO_ERROR_CAMARA[errorCamara] : null
  return (
    <section aria-label={TEXTO_FOTOS.titulo} className={cn('rounded-3xl border border-ink/10 bg-paper p-4', className)}>
      <div className="flex items-center gap-2">
        <Camera size={17} className="shrink-0 text-brand-700" />
        <p className="flex-1 text-[14px] font-extrabold text-ink">{TEXTO_FOTOS.titulo}</p>
        <span className="text-[12px] font-extrabold tabular-nums text-ink-soft">{contadorFotos(fotos.length, tope)}</span>
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-soft">
        <span className="rounded-full bg-ink px-3 py-1 font-display text-[18px] font-bold tabular-nums text-white">{codigoDeFotos(jobId)}</span>
        <span>
          <b className="text-ink">{TEXTO_FOTOS.codigoTitulo}.</b> {TEXTO_FOTOS.codigoPaseador}
        </span>
      </p>

      <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{TEXTO_PUNTOS.paseador.guarda}</p>
      {control && control.faltanMin !== null && (
        <p
          role="status"
          className={cn(
            'mt-2 rounded-2xl p-3 text-[14px] font-semibold leading-snug',
            toca ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-300/60' : 'bg-sand text-ink-soft',
          )}
        >
          {textoProxima(control.faltanMin)}
          {toca && <span className="block font-medium">{TEXTO_PUNTOS.paseador.tocaApoyo}</span>}
        </p>
      )}
      <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{conServidor ? TEXTO_FOTOS.servidor.avisoPaseador : TEXTO_FOTOS.avisoPaseador}</p>
      {faltanEnviar > 0 && (
        <p role="status" className="mt-2 rounded-2xl bg-amber-50 p-3 text-[14px] font-semibold leading-snug text-amber-900 ring-1 ring-amber-300/60">
          {faltanEnviar === 1 ? '1 foto sin enviar.' : `${faltanEnviar} fotos sin enviar.`} {TEXTO_FOTO_SERVIDOR.sinEnviarApoyo}
        </p>
      )}

      <button type="button" onClick={onTomar} disabled={llena} className={cn(btnPrimary, 'mt-3 h-14 w-full text-[16px] disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none', toca && !llena && 'ring-4 ring-amber-300')}>
        <Camera size={19} /> {llena ? `Llegaste a las ${tope} fotos` : TEXTO_FOTOS.tomar}
      </button>

      {e && (
        <div role="alert" className="mt-2.5 rounded-2xl bg-amber-50 p-3 text-[14px] leading-snug text-amber-900 ring-1 ring-amber-300/60">
          <p className="font-extrabold">{e.titulo}</p>
          {e.como && <p className="mt-0.5">{e.como}</p>}
        </div>
      )}
      {mensaje && (
        <p role="alert" className="mt-2.5 rounded-2xl bg-red-50 p-3 text-[14px] font-semibold leading-snug text-red-800">
          {mensaje} {TEXTO_FOTOS.paseoSigue}
        </p>
      )}

      {fotos.length === 0 ? (
        <p className="mt-3 text-[14px] font-semibold text-ink-soft">{TEXTO_FOTOS.vacio}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {[...fotos].reverse().map((f) => (
            <li key={f.id}>
              <FotoImg foto={f} alt={`Foto de las ${clockLabel(f.t)}`} className="aspect-[4/3] w-full rounded-xl border border-ink/10" />
              <p className="mt-1 text-[12px] font-bold leading-tight text-ink-soft">
                {clockLabel(f.t)}
                <span className="block truncate font-semibold">{lugarDeFoto(f).corto}</span>
                {sinEnviar.has(f.id) && <span className="block font-extrabold text-amber-900">{sinEnviar.get(f.id) ?? TEXTO_FOTO_SERVIDOR.sinEnviar}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}

      <VerMas abrir={TEXTO_FOTOS.masAbrir}>
        <p>{masPaseador(undefined, conServidor)}</p>
        <p className="mt-2">{conServidor ? TEXTO_FOTOS.servidor.masPaseador : TEXTO_FOTOS.masPaseador}</p>
      </VerMas>
    </section>
  )
}
