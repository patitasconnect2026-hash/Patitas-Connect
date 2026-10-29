/**
 * Borrar la cuenta con servidor: la hoja de confirmación, dónde se ofrece y dónde NO (modo local y demostración siguen igual).
 * Sin red, sin cuentas.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DEMO_ACCOUNT, DEMO_DOGS } from '@/lib/data'
import { TEXTO_BORRAR } from '@/lib/servidor/cuenta'
import { EMPTY_APP, type WalkerApplication } from '@/lib/walkerStore'
import { ProfileView } from '../ProfileView'
import { Status } from '../walker/WalkerApp'
import { BorrarCuentaSheet } from './BorrarCuentaSheet'

const noop = () => {}
const RAIZ = path.resolve(__dirname, '..', '..')
const leer = (f: string) => fs.readFileSync(path.join(RAIZ, f), 'utf8')

const perfil = (extra: { onBorrarCuenta?: () => void; onSalir?: () => void } = {}) =>
  renderToStaticMarkup(
    <ProfileView
      account={DEMO_ACCOUNT}
      dogs={DEMO_DOGS}
      walk={null}
      reviews={[]}
      welcomeUsed={false}
      applied={false}
      onOpenDog={noop}
      onAddDog={noop}
      onApply={noop}
      onReset={noop}
      emergencia={null}
      onOpenEmergencia={noop}
      onOpenAyuda={noop}
      pago={null}
      mostrarEjemplos={false}
      {...extra}
    />,
  )

const enRevision: WalkerApplication = { ...EMPTY_APP, status: 'enviada', code: 'PAT-ABCD', phone: '987 654 321', person: { ...EMPTY_APP.person, firstName: 'Bea', lastName: 'Soto' } }

describe('la hoja «¿Borrar tu cuenta?»', () => {
  const hoja = (rol: 'familia' | 'paseador') => renderToStaticMarkup(<BorrarCuentaSheet rol={rol} onBorrar={async () => ({ ok: true })} onClose={noop} />)

  it('dice qué se borra, que no se puede deshacer y qué pasa si hay algo pendiente', () => {
    const h = hoja('familia')
    expect(h).toContain(TEXTO_BORRAR.titulo)
    expect(h).toContain(TEXTO_BORRAR.resumen)
    expect(h).toContain(TEXTO_BORRAR.condiciones)
    expect(h).toContain(TEXTO_BORRAR.boton)
    expect(h).toContain(TEXTO_BORRAR.cancelar)
    expect(h).toContain('role="dialog"')
  })

  it('el botón de borrar es rojo y el de cancelar es más discreto (cancelar es fácil de tocar)', () => {
    const h = hoja('familia')
    const botonBorrar = h.slice(h.indexOf(TEXTO_BORRAR.boton) - 400, h.indexOf(TEXTO_BORRAR.boton))
    expect(botonBorrar).toMatch(/bg-red|btnRed|red-/)
    expect(h).toMatch(/Cancelar<\/button>/)
  })

  it('no muestra ningún aviso de error antes de intentar', () => {
    expect(hoja('paseador')).not.toContain('role="alert"')
  })

  it('el detalle de cada rol dice lo suyo: la familia su casa y perros; el paseador su postulación y DNI (en «Ver más»)', () => {
    expect(TEXTO_BORRAR.masFamilia).toMatch(/casa/)
    expect(TEXTO_BORRAR.masFamilia).toMatch(/perros/)
    expect(TEXTO_BORRAR.masFamilia).not.toMatch(/DNI/)
    expect(TEXTO_BORRAR.masPaseador).toMatch(/postulación/)
    expect(TEXTO_BORRAR.masPaseador).toMatch(/DNI/)
    expect(TEXTO_BORRAR.masPaseador).not.toMatch(/perros/)
  })
})

describe('dónde se ofrece borrar la cuenta', () => {
  it('familia: solo con servidor y sesión (el botón «Borrar mi cuenta» sale únicamente si la app lo pide)', () => {
    expect(perfil({ onSalir: noop, onBorrarCuenta: noop })).toContain('Borrar mi cuenta')
    expect(perfil({ onSalir: noop })).not.toContain('Borrar mi cuenta')
    // En modo local y en la demostración todo sigue igual: «Cerrar sesión y reiniciar la demo» y nada más.
    const local = perfil()
    expect(local).toContain('Cerrar sesión y reiniciar la demo')
    expect(local).not.toContain('Borrar mi cuenta')
  })

  it('paseador en revisión: con servidor dice «borrar mi cuenta»; sin servidor sigue diciendo «borrar mis datos»', () => {
    const con = renderToStaticMarkup(<Status app={enRevision} onDelete={noop} onSalir={noop} onBorrarCuenta={noop} conDemo={false} />)
    const sin = renderToStaticMarkup(<Status app={enRevision} onDelete={noop} />)
    expect(con).toContain('Retirar mi postulación y borrar mi cuenta')
    expect(sin).toContain('Retirar mi postulación y borrar mis datos')
    expect(sin).not.toContain('borrar mi cuenta')
  })

  it('el código solo ofrece borrar la cuenta del servidor cuando hay sesión (modo «continuar»)', () => {
    expect(leer('components/PatitasApp.tsx')).toMatch(/onBorrarCuenta=\{modoApp === 'continuar'/)
    expect(leer('components/walker/WalkerApp.tsx')).toMatch(/onBorrarCuenta=\{modoApp === 'continuar'/)
    expect(leer('components/walker/WalkerApp.tsx')).toMatch(/borrarCuentaOpen && modoApp === 'continuar'/)
    // Sin esa propiedad el inicio del paseador usa la hoja de siempre (borrar lo del teléfono).
    expect(leer('components/walker/WalkerHome.tsx')).toMatch(/onBorrarCuenta \?\? \(\(\) => setConfirmDel\(true\)\)/)
  })

  it('después de borrar, el paseador vuelve a la portada y la app borra también lo que quedaba en el teléfono', () => {
    expect(leer('components/walker/WalkerApp.tsx')).toMatch(/if \(r\.ok\) setVerAcceso\(null\)/)
    expect(leer('components/acceso/useAccesoApp.ts')).toMatch(/borrarDatosDeEstaCuenta\(id\)/)
  })
})
