import { readFileSync } from 'node:fs'
import { join } from 'node:path'
/**
 * Lo que se ve cuando los paseos viven en el servidor (paso 6a): el aviso de conexión, el botón de demostración que no
 * se ofrece con un paseador real y el chat que dice que todavía no llega.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildBooking, DEMO_DOGS, WALKERS } from '@/lib/data'
import { nuevoPaseo } from '@/lib/paseo'
import { TEXTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import { newWalk } from '@/lib/walk'
import { AvisoDeServidorVista } from './AvisoDeServidor'
import { ChatSheet } from './ChatSheet'
import { LiveWalk } from './LiveWalk'

const nada = () => {}

describe('aviso de conexión con el servidor', () => {
  it('conectado y sin nada que avisar: no se ve nada (ni siquiera un espacio)', () => {
    expect(renderToStaticMarkup(<AvisoDeServidorVista conexion="conectado" rechazo={null} onReintentar={nada} onCerrar={nada} />)).toBe('')
  })

  it('sin conexión y con cambios esperando: dice que se envían solos y ofrece «Reintentar» de 44 px', () => {
    const h = renderToStaticMarkup(<AvisoDeServidorVista conexion="sin_conexion" pendientes rechazo={null} onReintentar={nada} onCerrar={nada} />)
    expect(h).toContain(TEXTO_SERVIDOR.sinConexion)
    expect(h).toContain(TEXTO_SERVIDOR.sinConexionApoyo)
    expect(h).toContain(TEXTO_SERVIDOR.reintentar)
    expect(h).toContain('min-h-11')
    expect(h).toContain('role="status"')
  })

  it('sin conexión y sin nada pendiente: no promete enviar nada, solo que se sigue intentando', () => {
    const h = renderToStaticMarkup(<AvisoDeServidorVista conexion="sin_conexion" rechazo={null} onReintentar={nada} onCerrar={nada} />)
    expect(h).not.toContain(TEXTO_SERVIDOR.sinConexionApoyo)
    expect(h).toContain(TEXTO_SERVIDOR.noCargoApoyo)
  })

  it('cuando la base dice que no: muestra el texto claro y «Entendido»', () => {
    const h = renderToStaticMarkup(<AvisoDeServidorVista conexion="conectado" rechazo={TEXTO_SERVIDOR.cambioYaNoVale} onReintentar={nada} onCerrar={nada} />)
    expect(h).toContain(TEXTO_SERVIDOR.cambioYaNoVale)
    expect(h).toContain(TEXTO_SERVIDOR.entendido)
    expect(h).not.toContain(TEXTO_SERVIDOR.sinConexion)
  })

  it('mientras conecta dice que está conectando', () => {
    expect(renderToStaticMarkup(<AvisoDeServidorVista conexion="conectando" rechazo={null} onReintentar={nada} onCerrar={nada} />)).toContain(TEXTO_SERVIDOR.conectando)
  })
})

const booking = buildBooking({ walker: WALKERS[0], dog: DEMO_DOGS[0], dayIdx: 0, startHour: 10, durationMin: 60, plan: 'once', handoff: 'door', notes: '', groupDogs: 0, groupSize: DEMO_DOGS[0].size })
const solicitado = nuevoPaseo(Date.UTC(2026, 9, 13, 15, 0, 0))

const live = (extra: Partial<Parameters<typeof LiveWalk>[0]> = {}) =>
  renderToStaticMarkup(
    <LiveWalk
      walk={{ ...newWalk(booking), jobId: 'j1' }}
      entries={[]}
      unread={0}
      lastWalkerMessage={null}
      reviewed={false}
      pin={null}
      onOpenChat={nada}
      onOpenSos={nada}
      onOpenConfirm={nada}
      onOpenDog={nada}
      onWriteReview={nada}
      onExplore={nada}
      onRebook={nada}
      onDemo={nada}
      onSkip={nada}
      estado="solicitado"
      paseo={solicitado}
      simulado={false}
      walkerOnline={false}
      onSimularAceptacion={nada}
      onCancelar={nada}
      onDescartar={nada}
      reasignacion={null}
      onReservarCon={nada}
      pago={null}
      demoPago={false}
      entregaConfirmada={false}
      plazoVencido={false}
      onSimularVisto={nada}
      reporte={null}
      onReportar={nada}
      entregaSinConfirmar={false}
      fotos={[]}
      selfie={null}
      puntos={[]}
      ahora={0}
      {...extra}
    />,
  )

describe('«Paseo» de la familia con un paseador real', () => {
  it('con un paseador de ejemplo (o sin servidor) se ofrece «Simular que acepta · demostración», como siempre', () => {
    expect(live()).toContain('Simular que')
    expect(live({ puedeSimular: true })).toContain('demostración')
  })

  it('con un paseador real del servidor NO se ofrece: nadie acepta por él', () => {
    const h = live({ puedeSimular: false })
    expect(h).not.toContain('Simular que')
    // La familia sí puede cancelar su solicitud.
    expect(h).toContain('Cancelar la solicitud')
  })
})

describe('chat con un paseador real (paso 6b)', () => {
  const chat = (extra: Record<string, unknown> = {}) =>
    renderToStaticMarkup(<ChatSheet walk={{ ...newWalk(booking), jobId: 'j1' }} messages={[]} walkerOnline={false} onSend={nada} onPhoto={nada} onClose={nada} {...extra} />)

  it('con servidor el chat es de verdad: ya no dice que el mensaje no le llega y solo se escribe (sin cámara)', () => {
    const h = chat({ conServidor: true })
    expect(h).not.toContain('no le llega')
    expect(h).toContain(TEXTO_SERVIDOR.chatSinFotos)
    expect(h).toContain(TEXTO_SERVIDOR.chatVacio)
    expect(h).not.toContain('Enviar una foto')
  })
  it('dice «Activo hace…» solo cuando se sabe; si no, lo de siempre y nunca «en línea»', () => {
    expect(chat({ conServidor: true, actividad: 'Activo hace 3 min' })).toContain('Activo hace 3 min')
    const sin = chat({ conServidor: true, actividad: null })
    expect(sin).toContain('Paseando a')
    expect(sin).not.toMatch(/en l[ií]nea|Conectado ahora/i)
  })
  it('en la demostración no cambia nada: ofrece la cámara', () => {
    const h = chat()
    expect(h).toContain('Enviar una foto')
    expect(h).not.toContain(TEXTO_SERVIDOR.chatSinFotos)
  })
})

describe('con servidor, nadie «contesta» solo', () => {
  const fuente = readFileSync(join(__dirname, 'PatitasApp.tsx'), 'utf8')

  it('las dos respuestas simuladas (texto y foto) solo existen sin servidor', () => {
    expect(fuente.match(/if \(walkerOnline \|\| walkerReal \|\| servidor\.activo\) return/g)).toHaveLength(2)
    expect(fuente).toContain('typing: !walkerOnline && !walkerReal && !servidor.activo')
  })
})
