import { Eye, IdCard } from 'lucide-react'
import type { VistaDni } from '@/lib/datos'
import { TEXTO_REVISION_SERVIDOR } from '@/lib/servidor/paseosTextos'

/**
 * «Quién abrió tu DNI» (pestaña Verificación del paseador). En el teléfono, cada vez que una familia abre la hoja del DNI queda
 * anotado aquí. Con servidor esa anotación vive en el teléfono de la familia y NO llega al del paseador: una lista vacía parecería
 * «nadie lo abrió», que no es verdad. Por eso, con servidor, se dice que todavía no se puede avisar.
 */
export function AperturasDelDni({ conServidor, views }: { conServidor: boolean; views: readonly VistaDni[] }) {
  return (
    <section className="rounded-3xl border border-ink/10 bg-paper p-4">
      <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
        <IdCard size={17} className="text-brand-700" /> Quién abrió tu DNI
      </p>
      <p className="mt-1 text-[14px] leading-snug text-ink-soft">{conServidor ? TEXTO_REVISION_SERVIDOR.dniAperturasApoyo : 'Ven solo los últimos 4 dígitos. Cada apertura queda aquí.'}</p>
      {conServidor ? (
        <p className="mt-3 rounded-2xl bg-sand p-3 text-[14px] font-semibold text-ink-soft">{TEXTO_REVISION_SERVIDOR.dniAperturasAviso}</p>
      ) : views.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-sand p-3 text-[14px] font-semibold text-ink-soft">Nadie lo ha abierto todavía.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {views.map((v, i) => (
            <li key={i} className="flex items-center gap-2 rounded-2xl bg-sand px-3 py-2.5 text-[14px] font-semibold text-ink-soft">
              <Eye size={14} className="shrink-0" /> Un cliente vio los últimos 4 dígitos · {new Date(v.at).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
