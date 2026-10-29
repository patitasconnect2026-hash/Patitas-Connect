/**
 * La portada y los pasos que faltan, con servidor y sin servidor. Todo con un cliente simulado: sin red.
 */
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ClienteAcceso } from '@/lib/servidor/tipos'
import { EMPTY_APP, type WalkerApplication } from '@/lib/walkerStore'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }))

import { Onboarding, type OnboardingServidor } from '../Onboarding'
import { WalkerOnboarding } from '../walker/WalkerOnboarding'
import { PantallaEspera } from './PantallaEspera'
import { PantallaEntrada } from './PantallaEntrada'

const RAIZ = path.resolve(__dirname, '..', '..')
const cliente = {} as ClienteAcceso
const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length
const base = { onFinish: () => undefined }
const servidor = (extra: Partial<OnboardingServidor> = {}): OnboardingServidor => ({ cliente, onListo: () => undefined, completar: null, ...extra })

describe('portada con servidor: un solo camino', () => {
  const html = renderToStaticMarkup(createElement(Onboarding, { ...base, servidor: servidor() }))

  it('un botón principal «Entrar o crear cuenta» (ya no hay botón de demostración)', () => {
    expect(html).toContain('Entrar o crear cuenta')
    expect(html).not.toContain('Usar cuenta de demostración')
  })
  it('no queda el enlace suelto «Entrar con mi correo» ni el botón duplicado «Crear cuenta de paseador»', () => {
    expect(html).not.toContain('Entrar con mi correo')
    expect(html).not.toContain('Crear cuenta de paseador')
    expect(html).not.toContain('href="/paseador"')
    expect(html).not.toContain('Crear mi cuenta')
  })
  it('no dice que todo se guarda solo en el teléfono (el correo y el nombre sí van al servidor)', () => {
    expect(html).not.toContain('Tus datos se guardan solo en este teléfono')
    expect(html).toContain('Tu cuenta se guarda en el servidor; lo demás, solo en este teléfono.')
  })
  it('las tres líneas bajo el lema y el diseño siguen igual', () => {
    expect(html).toContain('Pagas a Patitas, no al paseador')
    expect(html).toContain('Fotos y puntos de control')
  })
  it('si el enlace del correo llegó sin sesión, abre directo la entrada con «Entra con tu correo y contraseña.»', () => {
    const conAviso = renderToStaticMarkup(createElement(Onboarding, { ...base, servidor: servidor({ aviso: 'Entra con tu correo y contraseña.' }) }))
    expect(conAviso).toContain('Entra con tu correo y contraseña.')
    expect(conAviso).toContain('Iniciar sesión')
    expect(conAviso).not.toContain('Entrar o crear cuenta')
  })
})

describe('modo local: la portada es idéntica a hoy', () => {
  const html = renderToStaticMarkup(createElement(Onboarding, base))
  it('«Crear mi cuenta», «Crear cuenta de paseador» y el texto de siempre (ya no hay botón de demostración)', () => {
    expect(html).toContain('Crear mi cuenta')
    expect(html).toContain('Crear cuenta de paseador')
    expect(html).toContain('href="/paseador"')
    expect(html).not.toContain('Usar cuenta de demostración')
    expect(html).toContain('Tus datos se guardan solo en este teléfono.')
  })
  it('no aparece nada del servidor', () => {
    expect(html).not.toMatch(/Entrar o crear cuenta|Iniciar sesión|servidor/)
  })
})

describe('con sesión de familia y sin casa ni perro: va directo a los pasos, con el nombre puesto', () => {
  const cuenta = { nombre: 'Valeria', apellido: 'Quispe', celular: '987 654 321', correo: 'valeria@ejemplo.pe' }
  const html = renderToStaticMarkup(createElement(Onboarding, { ...base, servidor: servidor({ completar: { cuenta, onSalir: () => undefined } }) }))

  it('no muestra la portada ni pide el celular ni el código', () => {
    expect(html).not.toContain('Entrar o crear cuenta')
    expect(html).not.toContain('Usar cuenta de demostración')
    expect(html).not.toContain('¿Cuál es tu celular?')
    expect(html).not.toContain('Ingresa el código')
  })
  it('empieza en «Cuéntanos de ti» con el nombre, el apellido y el correo ya puestos', () => {
    expect(html).toContain('Cuéntanos de ti')
    expect(html).toContain('value="Valeria"')
    expect(html).toContain('value="Quispe"')
    expect(html).toContain('valeria@ejemplo.pe')
  })
  it('cuenta los pasos desde 1 (no «Paso 3 de 6») y ofrece «Salir»', () => {
    expect(html).toContain('Paso 1 de 4')
    expect(html).toContain('Salir')
  })
})

describe('con sesión de paseador: la postulación empieza con lo que ya dio', () => {
  const app: WalkerApplication = { ...EMPTY_APP, phone: '987 654 321', person: { ...EMPTY_APP.person, firstName: 'Carlos', lastName: 'Rojas' } }
  const html = renderToStaticMarkup(createElement(WalkerOnboarding, { app, onChange: () => undefined, onSubmit: () => undefined, onExit: () => undefined, cuenta: { correo: 'carlos@ejemplo.pe', onSalir: () => undefined } }))

  it('salta el celular y el código: empieza en «Lo que aceptas» y muestra «Salir»', () => {
    expect(html).toContain('Lo que aceptas')
    expect(html).not.toContain('¿Cuál es tu celular?')
    expect(html).toContain('Salir')
  })
  it('sin sesión (modo local) todo es como antes: sin celular, empieza en el celular y hay «Atrás»', () => {
    const local = renderToStaticMarkup(createElement(WalkerOnboarding, { app: EMPTY_APP, onChange: () => undefined, onSubmit: () => undefined, onExit: () => undefined }))
    expect(local).toContain('¿Cuál es tu celular?')
    expect(local).toContain('aria-label="Atrás"')
    expect(local).not.toContain('Salir')
  })
})

describe('las pantallas de espera: nunca la portada', () => {
  it('cargando: solo el logo', () => {
    const h = renderToStaticMarkup(createElement(PantallaEspera, { tipo: 'cargando' }))
    expect(h).not.toMatch(/Crear|Entrar|cuenta/i)
  })
  it('no se pudo: lo dice y deja reintentar o salir', () => {
    const h = renderToStaticMarkup(createElement(PantallaEspera, { tipo: 'no_se_pudo', onReintentar: () => undefined, onSalir: () => undefined }))
    expect(h).toContain('No pudimos comprobar tu cuenta')
    expect(h).toContain('Reintentar')
    expect(h).toContain('Salir')
    expect(h).not.toContain('Entrar o crear cuenta')
  })
  it('cuenta de familia en la app del paseador: lo dice claro y ofrece volver', () => {
    const h = renderToStaticMarkup(createElement(PantallaEspera, { tipo: 'cuenta_de_familia', onSalir: () => undefined }))
    expect(h).toContain('Esta cuenta es de familia')
    expect(h).toContain('href="/"')
    expect(h).toContain('Volver a la app')
  })
  it('la entrada sin cliente todavía espera y no se rompe', () => {
    const h = renderToStaticMarkup(createElement(PantallaEntrada, { cliente: null, onListo: () => undefined }))
    expect(h).toContain('Un momento')
  })
  it('textos cortos (título hasta 5 palabras, apoyo hasta 12)', async () => {
    const { TEXTO_ACCESO } = await import('@/lib/servidor/acceso')
    for (const t of [TEXTO_ACCESO.noSePudo, TEXTO_ACCESO.esDeFamilia]) expect(palabras(t), t).toBeLessThanOrEqual(5)
    for (const t of [TEXTO_ACCESO.noSePudoApoyo, TEXTO_ACCESO.esDeFamiliaApoyo]) expect(palabras(t), t).toBeLessThanOrEqual(12)
  })
})

describe('la app principal lee la sesión', () => {
  const leer = (f: string) => fs.readFileSync(path.join(RAIZ, f), 'utf8')
  it('la app de la familia y la del paseador usan la misma lectura de sesión', () => {
    expect(leer('components/PatitasApp.tsx')).toMatch(/useAccesoApp\('familia'\)/)
    expect(leer('components/walker/WalkerApp.tsx')).toMatch(/useAccesoApp\('paseador'\)/)
  })
  it('el correo de confirmación vuelve a la app principal, no a /acceso', () => {
    const src = leer('components/acceso/FormularioAcceso.tsx')
    expect(src).toMatch(/registrar\(cliente, r\.datos, \{ volverA: origen \}\)/)
    expect(src).not.toMatch(/volverA: `\$\{origen\}\/acceso`/)
  })
  it('«Salir» está en la app de la familia y en la del paseador', () => {
    expect(leer('components/ProfileView.tsx')).toMatch(/onSalir/)
    expect(leer('components/walker/WalkerHome.tsx')).toMatch(/onSalir/)
    expect(leer('components/walker/WalkerApp.tsx')).toMatch(/onSalir/)
  })
  it('con servidor ni se pide ni se envía el SMS: el celular se pide como dato de contacto, nada más', () => {
    for (const f of ['lib/servidor/acceso.ts', 'lib/servidor/cliente.ts', 'components/acceso/FormularioAcceso.tsx']) {
      expect(leer(f), f).not.toMatch(/signInWithOtp|verifyOtp|phone:|sms/i)
    }
  })
})
