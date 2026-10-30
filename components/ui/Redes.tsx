import { REDES } from '@/lib/config'
import { cn } from '@/lib/utils'

/* Íconos de las redes, dibujados aquí (la librería de íconos ya no trae logos de marcas). */
const ICONOS: Record<(typeof REDES)[number]['id'], React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
      <path d="M16.5 3c.4 2.3 1.9 3.9 4 4.2v3.3c-1.5 0-2.9-.4-4-1.1v6.1c0 3.3-2.6 5.5-5.6 5.5s-5.6-2.4-5.6-5.5c0-3.3 2.9-5.8 6.3-5.3v3.4c-1.5-.4-3 .6-3 2 0 1.2 1 2.1 2.3 2.1 1.4 0 2.3-1 2.3-2.4V3h3.3z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z" />
    </svg>
  ),
}

/** Botones redondos a Instagram, TikTok y Facebook. Abren en otra pestaña. */
export function Redes({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-3', className)}>
      {REDES.map((r) => (
        <li key={r.id}>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${r.nombre} de ${r.usuario} (abre en otra pestaña)`}
            className={cn(
              'grid h-12 w-12 place-items-center rounded-full ring-1 transition duration-300 hover:-translate-y-1',
              claro ? 'bg-white/10 text-white ring-white/20 hover:bg-white hover:text-vino' : 'bg-paper text-vino ring-vino/15 hover:bg-vino hover:text-white',
            )}
          >
            {ICONOS[r.id]}
          </a>
        </li>
      ))}
    </ul>
  )
}
