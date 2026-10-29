'use client'

/** Último recurso: si falla incluso la estructura de la página. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fbf6ee', color: '#0f172a' }}>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 32, textAlign: 'center' }}>
          <div>
            <h1 style={{ fontSize: 28, margin: 0 }}>Tuvimos un tropiezo</h1>
            <p style={{ color: '#475569', maxWidth: 360 }}>Tus datos quedan en este teléfono. Recarga la página para continuar.</p>
            <button onClick={reset} style={{ marginTop: 16, height: 48, padding: '0 28px', borderRadius: 999, border: 0, background: '#c2410c', color: '#fff', fontWeight: 800, fontSize: 15 }}>
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
