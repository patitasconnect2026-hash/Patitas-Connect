// Auditoría de celular: recorre las pantallas principales a 390×844 y 360×640 y mide
//   - campos de texto con letra menor a 16 px (el iPhone hace zoom)
//   - zonas táctiles menores a 44×44 px
//   - textos con letra menor a 12 px y entre 12 y 14 px
//   - contraste (axe-core, regla color-contrast) y scroll horizontal
//   - errores de consola
// Solo abre la página LOCAL. Se usa así (con la app ya corriendo):
//   npm run build && npx next start -p 3200 &     y luego     npm run auditoria
// Variables: PUERTO (3200), SALIDA (carpeta para el resumen JSON), CAPTURAS=1 para guardar PNG.
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'

const PUERTO = process.env.PUERTO ?? '3200'
const SALIDA = process.env.SALIDA ?? path.join(process.cwd(), 'test-results', 'auditoria')
const CAPTURAS = process.env.CAPTURAS === '1'
const BASE = `http://localhost:${PUERTO}`
fs.mkdirSync(SALIDA, { recursive: true })

const TAMANOS = [
  { nombre: '390x844', width: 390, height: 844 },
  { nombre: '360x640', width: 360, height: 640 },
]

const informe = { pantallas: [], consola: [] }

/** Mide la pantalla visible en ese momento. Si hay una hoja abierta (z-70), mide solo la hoja. */
async function medir(page) {
  return page.evaluate(() => {
    const hojas = [...document.querySelectorAll('div.absolute.inset-0')].filter((d) => getComputedStyle(d).zIndex === '70')
    const raiz = hojas.length ? hojas[hojas.length - 1] : document.body
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && r.bottom > 0 && r.top < innerHeight + 2000
    }
    const dentroDeMarco = (el) => !el.closest('[aria-hidden="true"]')
    const nombre = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 44)

    const campos = [...raiz.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), textarea, select')]
      .filter(visible)
      .map((el) => ({ n: nombre(el) || el.tagName.toLowerCase(), px: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((c) => c.px < 16)

    const objetivos = [...raiz.querySelectorAll('button, a[href], [role=button], [role=tab], summary')]
      .filter((el) => visible(el) && dentroDeMarco(el))
      .map((el) => {
        const r = el.getBoundingClientRect()
        const sinNombre = nombre(el) === ''
        const pista = sinNombre ? `[sin nombre: ${el.tagName.toLowerCase()} ${String(el.className).slice(0, 60)} | padre: ${(el.parentElement?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24)}]` : nombre(el)
        return { n: pista, w: Math.round(r.width), h: Math.round(r.height), enTexto: !!el.closest('p, li') && el.tagName === 'A' }
      })
      .filter((o) => o.w < 44 || o.h < 44)

    // ---- contraste propio: mezcla las transparencias de abajo hacia arriba hasta tener un fondo opaco
    // Tailwind 4 devuelve colores oklch() o color-mix(): se convierten a RGB con un lienzo del navegador.
    const lienzo = document.createElement('canvas')
    lienzo.width = lienzo.height = 1
    const ctx2d = lienzo.getContext('2d', { willReadFrequently: true })
    const parse = (c) => {
      if (!c || c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
      ctx2d.clearRect(0, 0, 1, 1)
      ctx2d.fillStyle = '#000'
      ctx2d.fillStyle = c
      ctx2d.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx2d.getImageData(0, 0, 1, 1).data
      return { r, g, b, a: a / 255 }
    }
    const mezclar = (sobre, fondo) => ({
      r: sobre.r * sobre.a + fondo.r * (1 - sobre.a),
      g: sobre.g * sobre.a + fondo.g * (1 - sobre.a),
      b: sobre.b * sobre.a + fondo.b * (1 - sobre.a),
      a: 1,
    })
    const lum = ({ r, g, b }) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const fondoDe = (el) => {
      const capas = []
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor)
        if (c && c.a > 0) capas.push(c)
        if (c && c.a >= 1) break
      }
      let fondo = { r: 255, g: 255, b: 255, a: 1 }
      for (const c of capas.reverse()) fondo = mezclar(c, fondo)
      return fondo
    }
    const contrasteDe = (el) => {
      const fg = parse(getComputedStyle(el).color)
      if (!fg) return null
      const bg = fondoDe(el)
      const a = lum(mezclar(fg, bg))
      const b = lum(bg)
      const [x, y] = a > b ? [a, b] : [b, a]
      return (x + 0.05) / (y + 0.05)
    }

    const textos = []
    const bajoContraste = []
    const recorrer = (el) => {
      if (!visible(el) || !dentroDeMarco(el)) return
      const propio = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim() !== '').map((n) => n.textContent.trim()).join(' ')
      if (propio) {
        const cs = getComputedStyle(el)
        const px = parseFloat(cs.fontSize)
        textos.push({ t: propio.slice(0, 48), px, boton: !!el.closest('button, a[href]') })
        const cr = contrasteDe(el)
        const grande = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700)
        if (cr !== null && cr < (grande ? 3 : 4.5)) {
          // Exentos: controles deshabilitados (WCAG) y el logotipo. Ya no hay exención por el naranja de la marca:
          // las superficies con letra blanca chica usan bg-brand-700 (decisión del equipo).
          const tipo = el.closest('button:disabled, [disabled], [aria-disabled="true"]')
            ? 'deshabilitado'
            : propio === 'connect' || propio === 'conectadas'
              ? 'logo'
              : 'falla'
          bajoContraste.push({ t: propio.slice(0, 40), px, cr: Math.round(cr * 100) / 100, tipo })
        }
      }
      for (const h of el.children) recorrer(h)
    }
    recorrer(raiz)
    // ---- títulos (h1 a h3): hasta 5 palabras
    const titulosLargos = [...raiz.querySelectorAll('h1, h2, h3')]
      .filter((el) => visible(el) && dentroDeMarco(el))
      .map((el) => el.textContent.trim().replace(/\s+/g, ' '))
      .filter((t) => t.split(' ').length > 5)
    // ---- contenido cortado: una pantalla (o la página) que oculta lo que se desborda y trae más contenido del que muestra.
    // Es lo que le pasaba a la bienvenida en un celular chico: el botón quedaba fuera y no se podía bajar.
    const cortados = [document.body, ...document.querySelectorAll('div.absolute.inset-0')]
      // El mapa (Leaflet) desborda a propósito: sus teselas son más grandes que el cuadro.
      .filter((el) => !el.classList.contains('leaflet-container'))
      .filter((el) => ['hidden', 'clip'].includes(getComputedStyle(el).overflowY) && visible(el) && el.scrollHeight > el.clientHeight + 2)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).replace(/\s+/g, '.').slice(0, 48)} ${el.scrollHeight}>${el.clientHeight}`)
    return {
      cortados,
      titulosLargos,
      bajoContraste,
      sx: document.documentElement.scrollWidth > innerWidth,
      campos,
      objetivos,
      menosDe12: textos.filter((x) => x.px < 12),
      de12a14: textos.filter((x) => x.px >= 12 && x.px < 14),
      total: textos.length,
    }
  })
}

async function contraste(page) {
  try {
    const r = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
    return r.violations.flatMap((v) => v.nodes.map((n) => ({ t: (n.html.replace(/\s+/g, ' ').match(/>([^<]{2,40})</)?.[1] ?? n.html.slice(0, 50)).trim(), d: n.any?.[0]?.message?.slice(0, 90) ?? '' })))
  } catch (e) {
    return [{ t: 'axe falló', d: String(e).slice(0, 80) }]
  }
}

/**
 * Espera a que terminen las animaciones de entrada: la opacidad de todo el DOM queda igual en 3 lecturas seguidas.
 * Sin esto, una captura a mitad de animación muestra textos «casi invisibles» que en realidad no lo son.
 */
async function esperarFinAnimacion(p, maxMs = 4000) {
  const t0 = Date.now()
  let previo = ''
  let iguales = 0
  while (Date.now() - t0 < maxMs) {
    const ahora = await p.evaluate(() => [...document.querySelectorAll('body *')].map((el) => getComputedStyle(el).opacity).join(','))
    iguales = ahora === previo ? iguales + 1 : 0
    previo = ahora
    if (iguales >= 3) return
    await p.waitForTimeout(150)
  }
}

const browser = await chromium.launch({ channel: 'chrome' })

for (const t of TAMANOS) {
  const ctx = await browser.newContext({
    viewport: { width: t.width, height: t.height },
    hasTouch: true,
    isMobile: true,
    geolocation: { latitude: -12.0979, longitude: -77.0354 },
    permissions: ['geolocation'],
  })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && informe.consola.push(`[${t.nombre}] ${m.text().slice(0, 140)}`))
  page.on('pageerror', (e) => informe.consola.push(`[${t.nombre}] excepción: ${e.message.slice(0, 140)}`))
  const vis = (p, txt) => p.getByText(txt).and(p.locator(':visible')).first()

  const pantalla = async (p, nombre) => {
    await p.waitForTimeout(300)
    await esperarFinAnimacion(p)
    const m = await medir(p)
    const c = await contraste(p)
    informe.pantallas.push({ tam: t.nombre, nombre, ...m, contraste: c })
    if (CAPTURAS) await p.screenshot({ path: path.join(SALIDA, `${t.nombre}-${nombre}.png`) })
  }
  const bajarHoja = async (p) =>
    p.evaluate(() => {
      const hoja = [...document.querySelectorAll('div.absolute.inset-0')].filter((d) => getComputedStyle(d).zIndex === '70').pop()
      const sc = [...(hoja?.querySelectorAll('.overflow-y-auto') ?? [])].pop()
      if (sc) sc.scrollTop = sc.scrollHeight
    })

  // ---- Alta de cuenta
  await page.goto(BASE + '/')
  await vis(page, 'Crear mi cuenta').waitFor()
  await pantalla(page, '01-inicio')
  // La portada anima sus tres líneas con retraso: ya tienen que verse completas (opacidad 1) al terminar.
  const lineasPortada = await page.evaluate(
    () => [...document.querySelectorAll('ul li')].filter((li) => li.getBoundingClientRect().width > 0 && Number(getComputedStyle(li.closest('ul')).opacity) > 0.99).length,
  )
  if (lineasPortada < 3) informe.consola.push(`[${t.nombre}] portada: solo ${lineasPortada} de 3 líneas visibles al terminar la animación`)
  await vis(page, 'Crear mi cuenta').click()
  const tel = page.getByPlaceholder('9XX XXX XXX')
  await tel.waitFor({ timeout: 5000 })
  await pantalla(page, '02-alta-celular')
  await tel.fill('987654321')
  await page.getByRole('button', { name: /Enviar código/ }).click()
  await vis(page, 'Usar código de demostración').waitFor({ timeout: 5000 })
  await pantalla(page, '03-alta-codigo')
  await vis(page, 'Usar código de demostración').click()
  await page.getByPlaceholder('Valeria').waitFor({ timeout: 8000 })
  await pantalla(page, '04-alta-datos')
  // La casa se marca en el mapa: la hoja vacía, con un punto dentro de la zona y con uno fuera
  await page.getByRole('button', { name: 'Marcar mi casa' }).click()
  await page.waitForSelector('.leaflet-container', { timeout: 8000 })
  await page.waitForTimeout(1200)
  await pantalla(page, '05-alta-casa-hoja')
  const mapa = await page.locator('.leaflet-container').boundingBox()
  await page.mouse.click(mapa.x + mapa.width * 0.5, mapa.y + mapa.height * 0.62)
  await vis(page, 'Dentro de la zona').waitFor({ timeout: 4000 })
  await pantalla(page, '05b-alta-casa-dentro')
  const mapa2 = await page.locator('.leaflet-container').boundingBox()
  await page.mouse.click(mapa2.x + mapa2.width * 0.93, mapa2.y + mapa2.height * 0.12)
  await vis(page, 'Aún no llegamos a tu zona.').waitFor({ timeout: 4000 })
  await pantalla(page, '05c-alta-casa-fuera')
  // Tocar afuera mueve el mapa (para que se vea el punto): se cierra y se vuelve a abrir con la vista de siempre.
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Marcar mi casa' }).click()
  await page.waitForSelector('.leaflet-container', { timeout: 8000 })
  await page.waitForTimeout(1200)
  const mapa3 = await page.locator('.leaflet-container').boundingBox()
  await page.mouse.click(mapa3.x + mapa3.width * 0.5, mapa3.y + mapa3.height * 0.62)
  await page.getByRole('button', { name: 'Usar este punto' }).click()
  await vis(page, 'Dentro de la zona').waitFor({ timeout: 4000 })
  await pantalla(page, '05d-alta-datos-con-casa')

  // ---- Cuenta de demostración
  await page.goto(BASE + '/')
  await vis(page, 'usar cuenta de demostración').click()
  await vis(page, 'Ver horarios con').waitFor()
  await pantalla(page, '10-explorar')
  // «Mostrar ejemplos» apagado: sin paseadores reales dice «Aún no hay paseadores en tu zona.» y no se rompe
  await page.getByRole('switch', { name: /Mostrar ejemplos/ }).click()
  await vis(page, 'Aún no hay paseadores en tu zona.').waitFor({ timeout: 5000 })
  await pantalla(page, '10e-explorar-sin-ejemplos')
  await page.getByRole('switch', { name: /Mostrar ejemplos/ }).click()
  await vis(page, 'Ver horarios con').waitFor({ timeout: 5000 })
  await page.evaluate(() => window.scrollTo(0, 0))

  // La reserva exige una casa dentro de la zona o en el borde: sin casa, fuera y en el borde
  const conCasa = async (casa) => {
    await page.evaluate((c) => {
      const s = JSON.parse(localStorage.getItem('patitas:v2'))
      if (c === null) delete s.account.casa
      else s.account.casa = c
      localStorage.setItem('patitas:v2', JSON.stringify(s))
    }, casa)
    await page.reload()
    await vis(page, 'Ver horarios con').waitFor()
    await vis(page, 'Ver horarios con').click()
    await vis(page, /Marcar mi casa|Cambiar mi casa|Revisar y enviar/).waitFor()
  }
  await conCasa(null)
  await vis(page, 'Marca tu casa').waitFor()
  await pantalla(page, '10b-reservar-sin-casa')
  await conCasa([-12.1219, -77.0297])
  await vis(page, 'Aún no llegamos a tu zona.').waitFor()
  await pantalla(page, '10c-reservar-casa-fuera')
  await page.getByRole('button', { name: 'Cambiar mi casa' }).click()
  await page.waitForSelector('.leaflet-container', { timeout: 8000 })
  await page.waitForTimeout(1200)
  await pantalla(page, '10d-casa-hoja-fuera')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await page.waitForTimeout(400)
  await conCasa([-12.09993, -77.03739]) // la casa de la demostración: dentro
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await page.waitForTimeout(400)
  await vis(page, 'Ver horarios con').click()
  await vis(page, 'Revisar y enviar').waitFor()
  await pantalla(page, '11-reservar-horario')
  await vis(page, 'Revisar y enviar').click()
  // La reserva NO pide pago: dice cuándo se paga (al terminar el paseo)
  await vis(page, 'Cuándo pagas').waitFor()
  await pantalla(page, '12-reservar-pago')
  await page.getByRole('button', { name: 'Enviar solicitud' }).click()
  await vis(page, /Falta que .* acepte/).waitFor({ timeout: 8000 })
  await pantalla(page, '13-reservar-listo')
  await page.getByRole('dialog', { name: /Agendar paseo/ }).getByRole('button', { name: /Ver el paseo/ }).click()
  await vis(page, 'Solicitud enviada').waitFor()
  await pantalla(page, '20-paseo')
  // El pago es al final: durante el paseo solo dice cuándo se paga (nada de QR ni «Ya pagué»)
  await vis(page, 'Pagas al terminar el paseo.').first().waitFor({ timeout: 5000 })
  await pantalla(page, '20a-pago-al-final')
  // Demostración: el paseador de ejemplo acepta y sale sin esperar ningún pago
  await page.getByRole('button', { name: /Simular que .* acepta/ }).click()
  await vis(page, 'Paseo aceptado').waitFor({ timeout: 5000 })
  await pantalla(page, '20b-aceptado')
  await vis(page, 'Paseo en curso').waitFor({ timeout: 20000 })
  await pantalla(page, '20d-en-paseo')
  // «Puntos de control»: la lista del dueño (en la demostración, los puntos son inventados y están marcados)
  await page.evaluate(() => [...document.querySelectorAll('h2')].find((h) => /Puntos de control/.test(h.textContent ?? ''))?.scrollIntoView({ block: 'start' }))
  await pantalla(page, '20e-puntos-de-control')
  // Avisos de ubicación (demostración): se prueba una salida de la zona y se mide la lista
  await page.getByText('Probar los avisos').first().click()
  await page.getByRole('button', { name: 'Salida de zona' }).click()
  await vis(page, 'Posible salida de la zona').waitFor({ timeout: 5000 })
  await pantalla(page, '20d-avisos-dueno')

  // ---- Paseador DURANTE el paseo (otra pestaña): la hoja de ubicación, «Fotos del paseo» y la cámara de la app
  const wp = await ctx.newPage()
  wp.on('console', (m) => m.type() === 'error' && informe.consola.push(`[${t.nombre}] paseador en paseo: ${m.text().slice(0, 140)}`))
  wp.on('pageerror', (e) => informe.consola.push(`[${t.nombre}] paseador en paseo excepción: ${e.message.slice(0, 140)}`))
  await wp.goto(BASE + '/paseador')
  await wp.getByText('Entrar como paseador de demostración').click()
  await vis(wp, 'Tu ubicación durante el paseo').waitFor({ timeout: 8000 })
  await pantalla(wp, '61-paseador-ubicacion-hoja')
  await wp.getByRole('button', { name: 'Ahora no' }).click()
  await wp.waitForTimeout(600)
  await wp.locator('section[aria-label="Fotos del paseo"]').scrollIntoViewIfNeeded()
  await pantalla(wp, '61a-paseador-en-paseo')
  // En la auditoría no hay cámara ni permiso: se mide el estado de error, que también es una pantalla
  await wp.getByRole('button', { name: 'Tomar foto' }).click()
  await wp.getByRole('dialog', { name: 'Cámara del paseo' }).waitFor({ timeout: 5000 })
  await wp.waitForTimeout(900)
  await pantalla(wp, '61c-paseador-camara')
  await wp.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  // Se sale del modo demostración del paseador para que más abajo se vea también su pantalla de bienvenida
  await wp.evaluate(() => localStorage.removeItem('patitas:walker:demo'))
  await wp.close()

  await page.locator('button').filter({ hasText: /SOS/ }).first().click()
  await vis(page, '¿Necesitas ayuda?').waitFor()
  await pantalla(page, '21-sos-dueno')
  await bajarHoja(page)
  await pantalla(page, '22-sos-dueno-abajo')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await page.waitForTimeout(400)

  await page.getByText('Modo demo · saltar a la llegada').click().catch(() => {})
  await vis(page, /ya llegó/).waitFor({ timeout: 15000 })
  await pantalla(page, '22b-entregado')
  await page.getByRole('button', { name: /^Recibí a/ }).first().click().catch(() => {})
  await vis(page, /Desliza: recibí a/).waitFor({ timeout: 4000 }).catch(() => {})
  await pantalla(page, '23-confirmar-llegada')
  await page.getByText('Aún no', { exact: true }).click().catch(() => {})
  await page.waitForTimeout(400)

  await page.getByRole('button', { name: /Mapa/ }).first().click()
  await page.waitForTimeout(1200)
  await pantalla(page, '30-mapa')

  await page.getByRole('button', { name: /Perfil/ }).first().click()
  await vis(page, 'Pago del paseo').waitFor()
  await pantalla(page, '40-perfil')
  await vis(page, 'Contacto de emergencia').click()
  await vis(page, 'Una persona de confianza').waitFor().catch(() => {})
  await pantalla(page, '41-contacto-emergencia')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click().catch(() => {})
  await page.waitForTimeout(400)

  await page.getByRole('button', { name: /Seguridad/ }).first().click()
  await vis(page, 'Preguntas frecuentes').waitFor()
  await pantalla(page, '50-seguridad')
  await page.evaluate(() => [...document.querySelectorAll('h2')].find((h) => h.textContent?.includes('Preguntas frecuentes'))?.scrollIntoView({ block: 'start' }))
  await pantalla(page, '51-seguridad-preguntas')
  await page.evaluate(() => document.querySelector('h1')?.scrollIntoView({ block: 'start' }))
  await pantalla(page, '51b-seguridad-arriba')

  // «Si algo pasa» y «Quiénes somos» (Tarea 11): las dos hojas, arriba y abajo
  await page.getByRole('button', { name: 'Si algo pasa' }).click()
  await vis(page, 'A quién llamar').waitFor({ timeout: 5000 })
  await pantalla(page, '52-si-algo-pasa')
  await bajarHoja(page)
  await pantalla(page, '52b-si-algo-pasa-abajo')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Quiénes somos' }).click()
  await vis(page, 'Quién hace qué').waitFor({ timeout: 5000 })
  await pantalla(page, '53-quienes-somos')
  await bajarHoja(page)
  await pantalla(page, '53b-quienes-somos-abajo')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await page.waitForTimeout(400)

  // ---- Paseador (otra pestaña, mismo navegador)
  const w = await ctx.newPage()
  w.on('console', (m) => m.type() === 'error' && informe.consola.push(`[${t.nombre}] paseador: ${m.text().slice(0, 140)}`))
  w.on('pageerror', (e) => informe.consola.push(`[${t.nombre}] paseador excepción: ${e.message.slice(0, 140)}`))
  await w.goto(BASE + '/paseador')
  await w.waitForTimeout(600)
  await pantalla(w, '60-paseador-inicio')
  await w.getByText('Entrar como paseador de demostración').click()
  await w.waitForTimeout(1500)
  // El paseo está en curso: antes de pedir el permiso del navegador sale la explicación
  if (await vis(w, 'Tu ubicación durante el paseo').isVisible().catch(() => false)) {
    await pantalla(w, '61-paseador-ubicacion-hoja')
    await w.getByRole('button', { name: 'Ahora no' }).click()
    await w.waitForTimeout(500)
  }
  await pantalla(w, '61-paseador-hoy')
  const sos = w.locator('button').filter({ hasText: /SOS/ }).first()
  if (await sos.isVisible().catch(() => false)) {
    await sos.click()
    await vis(w, 'Qué hacer, en orden').waitFor({ timeout: 5000 }).catch(() => {})
    await pantalla(w, '62-paseador-sos')
    await w.getByRole('button', { name: 'Cerrar', exact: true }).last().click().catch(() => {})
    await w.waitForTimeout(300)
  }
  await w.getByRole('button', { name: /Mi perfil/ }).first().click().catch(() => {})
  await w.waitForTimeout(600)
  await pantalla(w, '63-paseador-perfil')
  // «Dónde cobras»: Yape o Plin, celular y titular (solo lo ven el paseador y el equipo)
  await w.evaluate(() => [...document.querySelectorAll('p')].find((p) => /Dónde cobras/i.test(p.textContent ?? ''))?.scrollIntoView({ block: 'start' }))
  await pantalla(w, '63b-paseador-cobro')
  await w.getByRole('button', { name: /Verificación/ }).first().click().catch(() => {})
  await w.waitForTimeout(600)
  await pantalla(w, '64-paseador-verificacion')
  // Mini curso (Demostración): intro, una pantalla de lectura, una pregunta y el resultado
  await w.getByRole('button', { name: 'Ver el mini curso' }).click()
  await vis(w, 'Cinco lecturas y un test').waitFor({ timeout: 5000 })
  await pantalla(w, '64a-curso-intro')
  await w.getByRole('button', { name: /^Empezar/ }).click()
  await vis(w, 'Si se lastima').waitFor({ timeout: 5000 })
  await pantalla(w, '64b-curso-lectura')
  for (let k = 0; k < 5; k++) await w.getByRole('button', { name: /^(Siguiente|Ir al test)/ }).click()
  await vis(w, 'Pregunta 1 de 10').waitFor({ timeout: 5000 })
  await pantalla(w, '64c-curso-pregunta')
  for (let k = 0; k < 10; k++) {
    await w.locator('button[aria-pressed]').first().click()
    await w.getByRole('button', { name: /^(Siguiente|Ver mi resultado)/ }).click()
  }
  await vis(w, /Terminó el mini curso|Aún no alcanza/).waitFor({ timeout: 5000 })
  await pantalla(w, '64d-curso-resultado')
  await w.keyboard.press('Escape')
  await w.close()

  // ---- Panel interno
  const a = await ctx.newPage()
  await a.goto(BASE + '/admin')
  await a.waitForTimeout(800)
  await pantalla(a, '70-admin')
  await a.getByRole('heading', { name: /Por pagar al paseador/ }).scrollIntoViewIfNeeded()
  await pantalla(a, '70b-admin-por-pagar')
  // Con una postulación en revisión, y con una «aprobada» a la que le faltan casillas (no debe figurar como aprobada)
  const postulacion = (status) => ({
    status,
    code: 'PAT-AUDI',
    phone: '987654321',
    consentAt: '2026-10-10T10:00:00.000Z',
    person: { firstName: 'Ana', lastName: 'Ejemplo', dni: '12345678', birth: '2003-04-02', district: 'San Isidro', university: 'Universidad de ejemplo', career: 'Psicología', cycle: '5' },
    cobro: { metodo: 'plin', telefono: '912 345 678', titular: 'Ana Ejemplo' },
    review: { comprobaciones: { dni: true }, notes: '', supervisedWalks: 0 },
  })
  await a.evaluate((p) => localStorage.setItem('patitas:walker:v1', JSON.stringify(p)), postulacion('enviada'))
  await a.reload()
  await vis(a, 'Examen de situaciones').waitFor({ timeout: 8000 })
  await pantalla(a, '71-admin-postulacion')
  await a.evaluate(() => [...document.querySelectorAll('h3')].find((h) => /comprobaciones/.test(h.textContent ?? ''))?.scrollIntoView({ block: 'start' }))
  await pantalla(a, '72-admin-casillas')
  await a.evaluate((p) => localStorage.setItem('patitas:walker:v1', JSON.stringify(p)), postulacion('supervisado'))
  await a.reload()
  await vis(a, 'Examen de situaciones').waitFor({ timeout: 8000 })
  await vis(a, 'Aún no aparece como aprobada').waitFor({ timeout: 4000 })
  // El encabezado de la postulación dice «En revisión» (no «Aprobado»): la regla de «aprobado» se ve en pantalla
  await vis(a, 'En revisión').waitFor({ timeout: 4000 })
  await a.evaluate(() => [...document.querySelectorAll('h2')].find((h) => /Ana/.test(h.textContent ?? ''))?.scrollIntoView({ block: 'start' }))
  await pantalla(a, '73a-admin-aprobada-encabezado')
  await a.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await pantalla(a, '73-admin-aprobada-sin-casillas')
  await a.evaluate(() => localStorage.removeItem('patitas:walker:v1'))
  await a.close()

  await ctx.close()
}

// ---- Celular chico (320×568): la portada tiene que poder bajarse hasta el último botón y no ensancharse.
const fallosExtra = []
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && informe.consola.push(`[320x568] ${m.text().slice(0, 140)}`))
  p.on('pageerror', (e) => informe.consola.push(`[320x568] excepción: ${e.message.slice(0, 140)}`))
  await p.goto(BASE + '/')
  await p.getByText('Crear mi cuenta').and(p.locator(':visible')).first().waitFor()
  await esperarFinAnimacion(p)
  await p.locator('div.absolute.inset-0').filter({ has: p.getByText('Crear mi cuenta') }).first().evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await p.waitForTimeout(200)
  const box = await p.getByText('Usar cuenta de demostración').first().boundingBox()
  if (!box || box.y < 0 || box.y + box.height > 568) fallosExtra.push(`[320x568] 01-inicio: el último botón no se alcanza (${JSON.stringify(box)})`)
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fallosExtra.push('[320x568] 01-inicio: scroll horizontal')
  await ctx.close()
}
await browser.close()

// ---- Resumen
const resumen = {}
for (const p of informe.pantallas) {
  const r = (resumen[p.tam] ??= { campos: 0, objetivos: 0, menosDe12: 0, de12a14: 0, contraste: 0, scrollH: 0, pantallas: 0 })
  r.pantallas++
  r.campos += p.campos.length
  r.objetivos += p.objetivos.length
  r.menosDe12 += p.menosDe12.length
  r.de12a14 += p.de12a14.length
  r.contraste += p.contraste.length
  r.contrasteReal = (r.contrasteReal ?? 0) + p.bajoContraste.length
  r.scrollH += p.sx ? 1 : 0
}
fs.writeFileSync(path.join(SALIDA, 'informe.json'), JSON.stringify(informe, null, 1))
console.log('RESUMEN POR TAMAÑO', JSON.stringify(resumen, null, 1))
console.log('CONSOLA:', informe.consola.length ? '\n' + [...new Set(informe.consola)].join('\n') : 'sin errores')
console.log(`Detalle en ${path.join(SALIDA, 'informe.json')}`)

// ---- Falla si hay un problema real (lo exento se informa pero no cuenta)
const EXENTOS_TACTILES = /^Leaflet|leaflet-marker|OpenStreetMap|colaboradores/
// Títulos (h1 a h3) de más de 5 palabras que se aceptan, cada uno con su razón. Si un título se acorta, quítalo de aquí.
const TITULOS_PERMITIDOS = new Map([
  ['El paseo con cuidado que tu mejor amigo merece', 'Lema de la portada: es de marca y lo decide el diseñador.'],
  ['Cómo se cuida a tu perro', 'Titular de Seguridad: lo dictó el equipo (6 palabras).'],
])
const fallos = []
for (const p of informe.pantallas) {
  for (const c of p.campos) fallos.push(`[${p.tam}] ${p.nombre}: campo de ${c.px}px (${c.n})`)
  for (const o of p.objetivos) if (!EXENTOS_TACTILES.test(o.n)) fallos.push(`[${p.tam}] ${p.nombre}: zona táctil ${o.w}x${o.h} (${o.n})`)
  for (const t of p.menosDe12) if (!/^Leaflet|OpenStreetMap|©/.test(t.t)) fallos.push(`[${p.tam}] ${p.nombre}: letra de ${t.px}px («${t.t}»)`)
  for (const c of p.bajoContraste) if (c.tipo === 'falla') fallos.push(`[${p.tam}] ${p.nombre}: contraste ${c.cr}:1 («${c.t}», ${c.px}px)`)
  if (p.sx) fallos.push(`[${p.tam}] ${p.nombre}: scroll horizontal`)
  for (const c of p.cortados ?? []) fallos.push(`[${p.tam}] ${p.nombre}: contenido cortado (${c})`)
  for (const t of p.titulosLargos ?? []) {
    if (!TITULOS_PERMITIDOS.has(t)) fallos.push(`[${p.tam}] ${p.nombre}: título de ${t.split(' ').length} palabras («${t}»)`)
  }
}
for (const c of informe.consola) fallos.push(`consola: ${c}`)
fallos.push(...fallosExtra)
const unicos = [...new Set(fallos)]
const exentos = informe.pantallas.flatMap((p) => p.bajoContraste.filter((c) => c.tipo !== 'falla').map((c) => c.tipo))
console.log('EXENTOS de contraste:', JSON.stringify(exentos.reduce((a, t) => ((a[t] = (a[t] ?? 0) + 1), a), {})))
if (unicos.length) {
  console.log(`\nFALLAN ${unicos.length}:\n` + unicos.slice(0, 60).join('\n'))
  process.exitCode = 1
} else {
  console.log('\nAuditoría OK: sin fallos.')
}
