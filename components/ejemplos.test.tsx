import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DEMO_ACCOUNT, DEMO_DOGS, PAST_WALKS, WALKERS } from '@/lib/data'
import type { Walk } from '@/lib/types'
import { TEXTO_EJEMPLOS } from '@/lib/ejemplos'
import { BookingSheet } from './BookingSheet'
import { DniSheet } from './DniSheet'
import { Explore } from './Explore'
import { ProfileView } from './ProfileView'
import { ReviewsSheet } from './ReviewsSheet'
import { WalkerCard } from './WalkerCard'
import { ZonesMap } from './ZonesMap'

const cuenta = (html: string, texto: string) => html.split(texto).length - 1
const ETIQUETA = '>Ejemplo<'
const noop = () => {}

describe('cada paseador de ejemplo se muestra con la etiqueta «Ejemplo»', () => {
  it('la tarjeta de Explorar: el paseador y su reseña', () => {
    for (const w of WALKERS) {
      const h = renderToStaticMarkup(<WalkerCard walker={w} index={0} dog={null} fav={false} onFav={noop} onDni={noop} onBook={noop} onReviews={noop} />)
      expect(cuenta(h, ETIQUETA), `${w.name}: el paseador y la reseña que se ve`).toBe(2)
    }
  })

  it('la hoja de reseñas: el paseador y cada reseña', () => {
    for (const w of WALKERS) {
      const h = renderToStaticMarkup(<ReviewsSheet walker={w} mine={[]} canReview={false} dogName="Max" onReview={noop} onClose={noop} />)
      expect(cuenta(h, ETIQUETA), w.name).toBe(1 + w.reviews.length)
    }
  })

  it('la reserva y la hoja del DNI', () => {
    const w = WALKERS[0]
    const reserva = renderToStaticMarkup(
      <BookingSheet
        walker={w}
        account={DEMO_ACCOUNT}
        dogs={DEMO_DOGS}
        initialDogId={DEMO_DOGS[0].id}
        welcome={false}
        onAddDog={noop}
        onEditDog={noop}
        onPedirCasa={noop}
        onClose={noop}
        onConfirmed={noop}
        onSeeLive={noop}
      />,
    )
    expect(reserva).toContain(ETIQUETA)
    expect(renderToStaticMarkup(<DniSheet walker={w} onView={noop} onClose={noop} />)).toContain(ETIQUETA)
  })

  it('un paseador real (sin la marca) no lleva la etiqueta', () => {
    const real = { ...WALKERS[0], id: 'nuevo-1', name: 'Lucía Q.', firstName: 'Lucía', esEjemplo: undefined, reviews: [] }
    const h = renderToStaticMarkup(<WalkerCard walker={real} index={0} dog={null} fav={false} onFav={noop} onDni={noop} onBook={noop} onReviews={noop} />)
    expect(h).not.toContain(ETIQUETA)
  })
})

describe('el perfil: paseos anteriores y el interruptor', () => {
  const perfil = (mostrarEjemplos: boolean) =>
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
        mostrarEjemplos={mostrarEjemplos}
        onMostrarEjemplos={noop}
      />,
    )

  it('encendido: los paseos anteriores salen, cada uno con la etiqueta', () => {
    const h = perfil(true)
    expect(cuenta(h, ETIQUETA)).toBe(PAST_WALKS.length)
    for (const p of PAST_WALKS) expect(h).toContain(`${p.dog} con ${p.walker}`)
    expect(h).toContain(TEXTO_EJEMPLOS.interruptor)
    expect(h).toMatch(/role="switch"[^>]*aria-checked="true"|aria-checked="true"[^>]*role="switch"/)
  })

  it('el paseo de hoy con un paseador de ejemplo también lleva la etiqueta (y con uno real, no)', () => {
    const paseo = (walker: Walk['booking']['walker']): Walk => ({
      booking: {
        walker,
        dog: DEMO_DOGS[0],
        dayIdx: 0,
        dayLabel: 'Hoy',
        startHour: 9,
        startMin: 540,
        slotLabel: '9:00 a. m.',
        durationMin: 60,
        plan: 'once',
        handoff: 'door',
        notes: '',
        groupDogs: 0,
        groupSize: DEMO_DOGS[0].size,
        walkPrice: 25,
        discount: 0,
        total: 25,
      },
      progress: 0,
      phase: 'active',
      sos: 'off',
      typing: false,
      rating: 0,
      extraMessages: [],
      extraEvents: [],
    })
    const conPaseo = (walk: Walk) =>
      renderToStaticMarkup(
        <ProfileView
          account={DEMO_ACCOUNT}
          dogs={DEMO_DOGS}
          walk={walk}
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
          onMostrarEjemplos={noop}
        />,
      )
    // con el interruptor apagado, los paseos anteriores no salen: la única etiqueta posible es la del paseo de hoy
    expect(cuenta(conPaseo(paseo(WALKERS[0])), ETIQUETA)).toBe(1)
    const real = { ...WALKERS[0], id: 'real-1', name: 'Lucía Q.', firstName: 'Lucía', esEjemplo: undefined, reviews: [] }
    expect(cuenta(conPaseo(paseo(real)), ETIQUETA)).toBe(0)
  })

  it('apagado: no sale ninguno', () => {
    const h = perfil(false)
    expect(h).not.toContain(ETIQUETA)
    for (const p of PAST_WALKS) expect(h).not.toContain(`${p.dog} con ${p.walker}`)
    expect(h).toMatch(/role="switch"[^>]*aria-checked="false"|aria-checked="false"[^>]*role="switch"/)
  })
})

describe('Explorar con y sin ejemplos', () => {
  const explorar = (walkers: typeof WALKERS, mostrarEjemplos: boolean) =>
    renderToStaticMarkup(
      <Explore
        account={DEMO_ACCOUNT}
        dogs={DEMO_DOGS}
        dog={DEMO_DOGS[0]}
        onPickDog={noop}
        onAddDog={noop}
        walk={null}
        filter="all"
        onFilter={noop}
        spotFilter={null}
        onClearSpot={noop}
        walkers={walkers}
        favs={[]}
        onFav={noop}
        onDni={noop}
        onBook={noop}
        onReviews={noop}
        onGoLive={noop}
        onGoMap={noop}
        onDemo={noop}
        onApply={noop}
        mostrarEjemplos={mostrarEjemplos}
        onMostrarEjemplos={noop}
      />,
    )

  it('con ejemplos: las tarjetas llevan la etiqueta', () => {
    const h = explorar(WALKERS, true)
    expect(cuenta(h, ETIQUETA)).toBeGreaterThanOrEqual(WALKERS.length)
    expect(h).not.toContain(TEXTO_EJEMPLOS.sinPaseadores)
  })

  it('sin ejemplos y sin paseadores reales: «Aún no hay paseadores en tu zona.» (y no se rompe)', () => {
    const h = explorar([], false)
    expect(h).toContain('Aún no hay paseadores en tu zona.')
    expect(h).toContain(TEXTO_EJEMPLOS.sinPaseadoresApoyo)
    expect(h).toContain(TEXTO_EJEMPLOS.interruptor)
    expect(h).not.toContain(ETIQUETA)
  })

  it('el mapa de zonas tampoco se rompe sin paseadores', () => {
    const h = renderToStaticMarkup(<ZonesMap dog={DEMO_DOGS[0]} casa={null} walkers={[]} onBook={noop} onSeeWalkers={noop} />)
    expect(h).toContain('Mapa de zonas')
    expect(h).toContain('0 paseadores')
  })

  it('el mapa de zonas no cuenta paseadores de ejemplo como si fueran reales', () => {
    const h = renderToStaticMarkup(<ZonesMap dog={DEMO_DOGS[0]} casa={null} walkers={WALKERS} onBook={noop} onSeeWalkers={noop} />)
    expect(h).toMatch(/paseadores? de ejemplo/)
    // ningún «N paseador(es)» suelto: siempre «de ejemplo» o «(k de ejemplo)»
    expect(h).not.toMatch(/\d+ paseadores?\b(?! de ejemplo)(?! \()/)
  })
})
