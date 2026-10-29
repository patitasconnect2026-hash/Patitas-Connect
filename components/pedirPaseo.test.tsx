import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CONFIG } from '@/lib/config'
import { DEMO_ACCOUNT, DEMO_DOGS } from '@/lib/data'
import { crearPedido, type Pedido } from '@/lib/pedidos'
import { TEXTO_PEDIDO } from '@/lib/pedidosTextos'
import { PedirPaseoSheet } from './PedirPaseoSheet'
import { FichaPedido } from './FichaPedido'

const base = (): Pedido => {
  const r = crearPedido({ id: 'p1', dog: DEMO_DOGS[0], dayIdx: 1, startHour: 10, slotLabel: 'Mañana · 10:00 am', durationMin: 60, montoHora: 20, distrito: 'San Isidro', punto: null, ahora: Date.now() })
  if (!r.ok) throw new Error('no')
  return r.pedido
}
const nada = () => undefined

describe('«Pedir paseo» · pantallas', () => {
  it('el formulario dice que no se paga ahora y muestra el rango permitido', () => {
    const html = renderToStaticMarkup(<PedirPaseoSheet account={{ ...DEMO_ACCOUNT, casa: [-12.1, -77.03] }} dogs={DEMO_DOGS} initialDogId={null} onClose={nada} onPedir={async () => ({ ok: true })} onPedirCasa={nada} onAddDog={nada} />)
    expect(html).toContain(TEXTO_PEDIDO.sinPago)
    expect(html).toContain(`S/ ${CONFIG.tarifaMinima}`)
    expect(html).toContain(`S/ ${CONFIG.tarifaMaxima}`)
    expect(html).toContain(TEXTO_PEDIDO.enviar)
  })
  it('sin casa guardada pide marcarla y no deja pedir', () => {
    const html = renderToStaticMarkup(<PedirPaseoSheet account={{ ...DEMO_ACCOUNT, casa: undefined }} dogs={DEMO_DOGS} initialDogId={null} onClose={nada} onPedir={async () => ({ ok: true })} onPedirCasa={nada} onAddDog={nada} />)
    expect(html).toContain(TEXTO_PEDIDO.sinCasa)
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Pedir ahora/)
  })
  it('la tarjeta muestra solo cifras de quién lo vio, y las respuestas con «Elegir»; la demostración va marcada', () => {
    const p: Pedido = { ...base(), estado: 'con_ofertas', vistos: 4, disponibles: 2, ofertas: [{ id: 'o1', paseadorId: 'w1', nombre: 'Lucía', monto: 22, tipo: 'contraoferta', estado: 'enviada', demo: true }] }
    const html = renderToStaticMarkup(<FichaPedido pedido={p} onElegir={async () => ({ ok: true })} onCancelar={nada} onCerrar={nada} />)
    expect(html).toContain('4 paseadores lo vieron · 2 disponibles en tu zona')
    expect(html).toContain('Lucía')
    expect(html).toContain(TEXTO_PEDIDO.elegir)
    expect(html).toContain(TEXTO_PEDIDO.demostracion)
    expect(html).toContain(TEXTO_PEDIDO.cancelar)
  })
  it('un pedido vencido o cancelado no deja elegir ni cancelar y se puede cerrar', () => {
    const html = renderToStaticMarkup(<FichaPedido pedido={{ ...base(), estado: 'vencido' }} onElegir={async () => ({ ok: true })} onCancelar={nada} onCerrar={nada} />)
    expect(html).toContain(TEXTO_PEDIDO.venció)
    expect(html).not.toContain(TEXTO_PEDIDO.cancelar)
    expect(html).toContain('Entendido')
  })
})
