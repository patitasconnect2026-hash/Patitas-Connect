import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { ClienteAcceso } from '@/lib/servidor/tipos'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }))

import { FormularioAcceso, TEXTO_PANTALLAS } from './FormularioAcceso'
import { PantallaAcceso } from './PantallaAcceso'

const cliente = {} as ClienteAcceso
const palabras = (t: string) => t.split(/\s+/).filter(Boolean).length
const ver = (modoInicial: 'entrar' | 'registrar' | 'olvide') => renderToStaticMarkup(createElement(FormularioAcceso, { cliente, modoInicial }))

describe('pantallas de acceso: textos cortos', () => {
  it('título hasta 5 palabras y apoyo hasta 12, en las tres', () => {
    for (const t of Object.values(TEXTO_PANTALLAS)) {
      if (typeof t === 'string') {
        expect(palabras(t), t).toBeLessThanOrEqual(12)
        continue
      }
      expect(palabras(t.titulo), t.titulo).toBeLessThanOrEqual(5)
      expect(palabras(t.apoyo), t.apoyo).toBeLessThanOrEqual(12)
    }
  })
})

describe('pantallas de acceso: lo que muestran', () => {
  it('registro: solo «Soy familia» y «Soy paseador»; nunca «equipo»; sin DNI', () => {
    const h = ver('registrar')
    expect(h).toContain('Crea tu cuenta')
    expect(h).toContain('Soy familia')
    expect(h).toContain('Soy paseador')
    expect(h).not.toMatch(/equipo|DNI|admin/i)
    expect((h.match(/role="radio"/g) ?? []).length).toBe(2)
    expect(h).toContain('autoComplete="new-password"')
  })
  it('entrada: «Iniciar sesión» arriba y, abajo, «¿No tienes cuenta?» con «Soy familia» y «Soy paseador»', () => {
    const h = ver('entrar')
    expect(h).toContain('Iniciar sesión')
    expect(h).toContain('Olvidé mi contraseña')
    expect(h).toContain('type="password"')
    expect(h).toContain('type="email"')
    expect(h).toContain('¿No tienes cuenta?')
    expect(h).toContain('Crear cuenta')
    expect(h).toContain('Soy familia')
    expect(h).toContain('Soy paseador')
    // Primero se inicia sesión y después se ofrece crear la cuenta: un solo camino, en este orden.
    expect(h.indexOf('Iniciar sesión')).toBeLessThan(h.indexOf('¿No tienes cuenta?'))
    expect(h).not.toMatch(/equipo|DNI|admin/i)
  })
  it('el aviso del enlace sin sesión se ve solo en la entrada', () => {
    const conAviso = renderToStaticMarkup(createElement(FormularioAcceso, { cliente, modoInicial: 'entrar', aviso: TEXTO_PANTALLAS.enlaceSinSesion }))
    expect(conAviso).toContain('Entra con tu correo y contraseña.')
    expect(renderToStaticMarkup(createElement(FormularioAcceso, { cliente, modoInicial: 'entrar' }))).not.toContain('Entra con tu correo y contraseña.')
  })
  it('recuperar: solo el correo', () => {
    const h = ver('olvide')
    expect(h).toContain('Recupera tu contraseña')
    expect(h).not.toContain('type="password"')
    expect(h).toContain('Enviar enlace')
  })
  it('sin servidor, /acceso dice que aún no hay cuentas (y no hay formularios)', () => {
    const h = renderToStaticMarkup(createElement(PantallaAcceso))
    expect(h).toContain('Aún no hay cuentas')
    expect(h).not.toContain('<form')
  })
  it('ya no hay un enlace suelto «Entrar con mi correo» en ninguna parte', () => {
    for (const f of ['components/Onboarding.tsx', 'components/walker/WalkerApp.tsx', 'components/PatitasApp.tsx']) {
      const src = fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8')
      expect(src, f).not.toMatch(/EnlaceAcceso|Entrar con mi correo/)
    }
    expect(fs.existsSync(path.join(__dirname, 'EnlaceAcceso.tsx'))).toBe(false)
  })
})
