import { expect, test } from '@playwright/test'

// Prueba de humo: cada página se abre a 390×844 y debe quedar sin errores
// de consola, sin excepciones, sin respuestas con error y sin scroll horizontal.
const PAGINAS = ['/', '/paseador', '/admin', '/afiche', '/marca', '/acceso', '/acceso/nueva-contrasena']

// /afiche es una hoja A4 fija para imprimir (210 mm) y /marca es la hoja de marca del
// equipo de diseño: no son pantallas de celular y tienen scroll horizontal a propósito.
// Se anotan como hallazgo, no fallan. Si cambian, quítalas de esta lista.
const SCROLL_HORIZONTAL_ESPERADO = ['/afiche', '/marca']

for (const ruta of PAGINAS) {
  test(`página ${ruta} sin errores a 390×844`, async ({ page }) => {
    const problemas: string[] = []

    page.on('console', (m) => {
      if (m.type() === 'error') problemas.push(`console.error: ${m.text()}`)
    })
    page.on('pageerror', (e) => problemas.push(`excepción: ${e.message}`))
    page.on('response', (r) => {
      const esLocal = new URL(r.url()).origin === new URL(page.url() || r.url()).origin
      if (esLocal && r.status() >= 400) problemas.push(`respuesta ${r.status()}: ${r.url()}`)
    })

    await page.goto(ruta)
    await page.waitForLoadState('networkidle')

    const ancho = await page.evaluate(() => ({
      contenido: document.documentElement.scrollWidth,
      ventana: window.innerWidth,
    }))
    if (ancho.contenido > ancho.ventana && SCROLL_HORIZONTAL_ESPERADO.includes(ruta)) {
      test.info().annotations.push({
        type: 'hallazgo',
        description: `${ruta}: contenido ${ancho.contenido}px > ventana ${ancho.ventana}px (esperado, no es pantalla de celular)`,
      })
    } else if (ancho.contenido > ancho.ventana) {
      problemas.push(`scroll horizontal: contenido ${ancho.contenido}px > ventana ${ancho.ventana}px`)
    }

    expect(problemas, problemas.join('\n')).toEqual([])
  })
}

test('icono y manifest responden 200', async ({ request }) => {
  for (const ruta of ['/icon', '/manifest.webmanifest']) {
    const r = await request.get(ruta)
    expect(r.status(), ruta).toBe(200)
  }
})
