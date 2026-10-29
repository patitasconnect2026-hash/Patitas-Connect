'use client'

import { useEffect } from 'react'

/** Pantalla amable si algo falla dentro de la app (en vez de una página en blanco). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-8 text-center text-ink">
      <p className="eyebrow text-brand-700">Algo salió mal</p>
      <h1 className="font-display mt-2 text-[34px] font-bold leading-tight">Tuvimos un tropiezo</h1>
      <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">Tus datos quedan en este teléfono. Intenta de nuevo; si sigue pasando, recarga la página.</p>
      <button type="button" onClick={reset} className="btn-press mt-6 inline-flex h-12 items-center rounded-full bg-brand-700 px-7 text-[15px] font-extrabold text-white shadow-press">
        Reintentar
      </button>
    </main>
  )
}
