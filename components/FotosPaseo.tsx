'use client'

import { Camera, TriangleAlert } from 'lucide-react'
import { clockLabel } from '@/lib/bus'
import { useServidor } from '@/lib/datos'
import { codigoCoincide, codigoDeFotos, lugarDeFoto, type FotoPaseo } from '@/lib/fotos'
import { contadorFotos, TEXTO_FOTOS } from '@/lib/fotosTextos'
import { CONFIG } from '@/lib/config'
import { cn } from '@/lib/utils'
import { FotoImg } from './FotoImg'
import { VerMas } from './ui/VerMas'

/** Una foto del paseo con su hora, su lugar (nunca coordenadas) y el código que salió en ella. */
export function FotoTarjeta({ foto, perro, className }: { foto: FotoPaseo; perro: string; className?: string }) {
  const lugar = lugarDeFoto(foto)
  const coincide = codigoCoincide(foto)
  return (
    <figure className={cn('overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-card', className)}>
      <FotoImg foto={foto} alt={`Foto de ${perro} a las ${clockLabel(foto.t)}`} className="aspect-[4/3] w-full" />
      <figcaption className="space-y-0.5 p-2.5">
        <p className="flex flex-wrap items-center gap-x-2 text-[14px] font-extrabold leading-snug text-ink">
          <span className="tabular-nums">{clockLabel(foto.t)}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-display text-[14px] tabular-nums',
              coincide ? 'bg-ink text-white' : 'bg-red-100 text-red-800',
            )}
          >
            Código {foto.codigo}
          </span>
        </p>
        <p className={cn('text-[14px] leading-snug', lugar.conLugar ? 'font-semibold text-ink' : 'text-ink-soft')}>{lugar.texto}</p>
        {lugar.nota && <p className="text-[12px] font-semibold leading-snug text-ink-soft">{lugar.nota}</p>}
        {!coincide && (
          <p className="flex items-start gap-1.5 text-[12px] font-bold leading-snug text-red-800">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" /> {TEXTO_FOTOS.codigoNoCoincide}
          </p>
        )}
      </figcaption>
    </figure>
  )
}

/**
 * «Fotos del paseo» en la pantalla del dueño: las fotos reales que sacó el paseador con la cámara de la app, con su
 * hora y su lugar, y el código del paseo para compararlo con el que sale en cada foto. Sin fotos: «Aún no hay fotos.»
 * Son señales, no una garantía: lo dice «Qué son estas fotos». Entre dos celulares hace falta servidor.
 */
export function FotosPaseo({
  fotos,
  perro,
  jobId,
  className,
  compacto = false,
}: {
  /** Las fotos de ESTE paseo, de la más vieja a la más nueva. */
  fotos: FotoPaseo[]
  perro: string
  jobId: string
  className?: string
  /** En la hoja de confirmar la entrega: las dos últimas, título chico y sin la explicación larga. */
  compacto?: boolean
}) {
  // Con servidor las fotos llegan de verdad al teléfono de la familia: los textos de «solo el mismo navegador» no aplican.
  const conServidor = useServidor().activo
  const recientes = [...fotos].reverse()
  const visibles = compacto ? recientes.slice(0, 2) : recientes
  const anteriores = compacto ? recientes.slice(2) : []
  const grilla = cn('grid gap-3', compacto ? 'grid-cols-2' : 'grid-cols-1 min-[420px]:grid-cols-2')
  return (
    <section aria-label={TEXTO_FOTOS.titulo} className={className}>
      <div className="flex items-end justify-between px-1">
        <h2 className={cn('flex items-center gap-2 font-display font-bold leading-tight text-ink', compacto ? 'text-[20px]' : 'text-[26px]')}>
          <Camera size={compacto ? 18 : 22} className="text-brand-700" /> {TEXTO_FOTOS.titulo}
        </h2>
        <span className="pb-1 text-[12px] font-bold tabular-nums text-ink-soft">{contadorFotos(fotos.length, CONFIG.maxFotosPorPaseo)}</span>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[14px] text-ink-soft">
        <span className="rounded-full bg-ink px-3 py-1 font-display text-[18px] font-bold tabular-nums text-white">{codigoDeFotos(jobId)}</span>
        <span>
          <b className="text-ink">{TEXTO_FOTOS.codigoTitulo}.</b> {TEXTO_FOTOS.codigoDueno}
        </span>
      </p>
      {/* A la vista (no solo en «Ver más»): quién pone la hora y el lugar, y que hoy solo llegan en el mismo navegador */}
      <p className="mt-1.5 px-1 text-[14px] leading-snug text-ink-soft">{compacto ? TEXTO_FOTOS.avisoDuenoCorto : conServidor ? TEXTO_FOTOS.servidor.avisoDueno : TEXTO_FOTOS.avisoDueno}</p>

      {fotos.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-sand p-3.5 text-[14px] font-semibold text-ink-soft">{TEXTO_FOTOS.vacio}</p>
      ) : (
        <ul className={cn('mt-3', grilla)} aria-live="polite">
          {visibles.map((f) => (
            <li key={f.id}>
              <FotoTarjeta foto={f} perro={perro} />
            </li>
          ))}
        </ul>
      )}
      {anteriores.length > 0 && (
        <VerMas abrir={`Ver las ${anteriores.length} anteriores`} cerrar="Ver menos">
          <ul className={cn('mt-1', grilla)}>
            {anteriores.map((f) => (
              <li key={f.id}>
                <FotoTarjeta foto={f} perro={perro} />
              </li>
            ))}
          </ul>
        </VerMas>
      )}

      <VerMas abrir={TEXTO_FOTOS.masAbrir}>{conServidor ? TEXTO_FOTOS.servidor.masDueno : TEXTO_FOTOS.masDueno}</VerMas>
    </section>
  )
}
