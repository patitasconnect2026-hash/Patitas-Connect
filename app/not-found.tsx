import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-8 text-center text-ink">
      <p className="eyebrow text-brand-700">Error 404</p>
      <h1 className="font-display mt-2 text-[40px] font-bold leading-tight">Esta calle no existe</h1>
      <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">Ni Chasqui encontró esta página. Volvamos al barrio.</p>
      <Link href="/" className="btn-press mt-6 inline-flex h-12 items-center rounded-full bg-brand-700 px-7 text-[15px] font-extrabold text-white shadow-press">
        Ir al inicio
      </Link>
    </main>
  )
}
