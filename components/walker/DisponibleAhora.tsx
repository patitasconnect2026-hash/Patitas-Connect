import { TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { cn } from '@/lib/utils'

/** Interruptor «Disponible ahora» del perfil del paseador (apagado = las familias lo ven como no disponible). */
export function DisponibleAhora({ disponible, onChange }: { disponible: boolean; onChange: (v: boolean) => void }) {
  return (
    <section className="flex items-center gap-3 rounded-3xl border border-ink/10 bg-paper p-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-extrabold text-ink">{TEXTO_RESERVAS.disponibleTitulo}</span>
        <span className="block text-[14px] leading-snug text-ink-soft">{disponible ? TEXTO_RESERVAS.disponibleApoyoSi : TEXTO_RESERVAS.disponibleApoyoNo}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={disponible}
        aria-label={TEXTO_RESERVAS.disponibleTitulo}
        onClick={() => onChange(!disponible)}
        className="flex h-11 w-16 shrink-0 items-center justify-center"
      >
        <span className={cn('relative block h-8 w-14 rounded-full transition', disponible ? 'bg-forest' : 'bg-ink/25')}>
          <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', disponible ? 'left-7' : 'left-1')} />
        </span>
      </button>
    </section>
  )
}
