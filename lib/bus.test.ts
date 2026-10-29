import { describe, expect, it } from 'vitest'
import { activarUbicacion, cerrarParaPaseador, migrarJob, moverPaseo, registrarLecturas, registrarSinUbicacion, visibleParaPaseador, type Job } from './bus'
import { aplicar, nuevoPaseo } from './paseo'
import { desplazar, type Lectura } from './zona'
import { HOME_POINT } from './geo'
import { lecturasDeEscenario } from './zonaDemo'

const base: Omit<Job, 'paseo'> = {
  id: 'j1',
  walkerFirst: 'Carlos',
  walkerId: 'carlos',
  ownerFirst: 'Valeria',
  dog: {
    name: 'Max',
    breed: 'Golden',
    size: 'large',
    fur: '',
    shape: '',
    notes: '',
    medical: '',
    vet: '',
    temperament: [],
    sociable: true,
    vaccinated: true,
  },
  slotLabel: 'Hoy · 10:00 am',
  durationMin: 60,
  pin: '1234',
  handoff: 'door',
  doormanName: '',
  address: 'Calle · San Isidro',
  groupDogs: 0,
  groupSize: 'large',
  walkerPay: 25,
  createdAt: 1_000_000,
}

describe('moverPaseo (el encargo que comparten las dos apps)', () => {
  const j: Job = { ...base, paseo: nuevoPaseo(1_000_000) }

  it('hace la transición y deja el registro', () => {
    const r = moverPaseo(j, 'aceptar', 'paseador', 1_000_500)!
    expect(r.paseo.estado).toBe('aceptado')
    expect(r.paseo.eventos).toHaveLength(2)
  })

  it('si no corresponde (otra pestaña ya lo movió, o no lo puede hacer ese actor), devuelve el encargo igual', () => {
    expect(moverPaseo(j, 'recoger', 'paseador', 1_000_500)).toBe(j)
    expect(moverPaseo(j, 'aceptar', 'dueno', 1_000_500)).toBe(j)
    const ya = moverPaseo(j, 'aceptar', 'paseador', 1_000_500)!
    expect(moverPaseo(ya, 'aceptar', 'paseador', 1_000_600)).toBe(ya)
  })

  it('con null no hace nada', () => {
    expect(moverPaseo(null, 'aceptar', 'paseador', 1)).toBeNull()
  })
})

describe('el paseador cierra el paseo en su pantalla', () => {
  const j: Job = { ...base, paseo: nuevoPaseo(1_000_000) }

  it('su pantalla lo oculta, pero el encargo sigue intacto para el dueño', () => {
    expect(visibleParaPaseador(j)).toBe(j)
    const cerrado = cerrarParaPaseador(j)!
    expect(visibleParaPaseador(cerrado)).toBeNull()
    expect(cerrado.paseo).toBe(j.paseo)
    expect(cerrado.id).toBe(j.id)
  })

  it('con null no hace nada', () => {
    expect(visibleParaPaseador(null)).toBeNull()
    expect(cerrarParaPaseador(null)).toBeNull()
  })
})

describe('migrarJob (un paseo guardado antes de la máquina de estados)', () => {
  it('asignado → aceptado', () => {
    const m = migrarJob({ ...base, status: 'asignado' })!
    expect(m.paseo.estado).toBe('aceptado')
  })
  it('recogido o paseando → en paseo', () => {
    expect(migrarJob({ ...base, status: 'recogido' })!.paseo.estado).toBe('en_paseo')
    expect(migrarJob({ ...base, status: 'paseando' })!.paseo.estado).toBe('en_paseo')
  })
  it('entregado → entregado; entregado y pagado → cerrado', () => {
    expect(migrarJob({ ...base, status: 'entregado' })!.paseo.estado).toBe('entregado')
    expect(migrarJob({ ...base, status: 'entregado', paid: true })!.paseo.estado).toBe('cerrado')
  })
  it('uno que ya tiene paseo no se toca; null sigue siendo null', () => {
    const j: Job = { ...base, paseo: nuevoPaseo(5) }
    expect(migrarJob(j)).toBe(j)
    expect(migrarJob(null)).toBeNull()
  })
})

describe('registrarLecturas: los avisos de ubicación entran al registro del paseo', () => {
  const enPaseo = (): Job => {
    let p = nuevoPaseo(1_000_000)
    p = aplicar(p, 'aceptar', 'paseador', 1_000_100)
    p = aplicar(p, 'salir', 'paseador', 1_000_200)
    p = aplicar(p, 'recoger', 'paseador', 1_000_300)
    return { ...base, paseo: p }
  }
  const AHORA = 1_000_000 + 30 * 60_000

  it('una prueba de salida deja avisos del sistema, con hora y marcados como demostración', () => {
    const j = registrarLecturas(enPaseo(), lecturasDeEscenario('salida', AHORA), { demo: true, desdeCero: true })!
    const avisos = j.paseo.eventos.filter((e) => e.accion === 'avisar')
    expect(avisos.map((a) => a.aviso)).toEqual(['borde', 'salida', 'regreso', 'borde'])
    for (const a of avisos) {
      expect(a.quien).toBe('sistema')
      expect(a.demo).toBe(true)
      expect(a.nota).toMatch(/^Demostración · /)
    }
    expect(j.paseo.estado).toBe('en_paseo')
    // en orden, y nunca antes del evento anterior
    const horas = j.paseo.eventos.map((e) => e.at)
    expect([...horas].sort((a, b) => a - b)).toEqual(horas)
  })

  it('sin demostración, la nota no dice «Demostración» y el evento no lleva la marca', () => {
    const j = registrarLecturas(enPaseo(), lecturasDeEscenario('quieto', AHORA), { demo: false, desdeCero: true })!
    const a = j.paseo.eventos.find((e) => e.accion === 'avisar')!
    expect(a.demo).toBeUndefined()
    expect(a.nota).not.toContain('Demostración')
  })

  it('recuerda lo que vio: dos lecturas «fuera» en llamadas distintas dan la alerta', () => {
    const lejos = lecturasDeEscenario('salida', AHORA).filter((_, i) => i >= 0)
    // se parte la prueba en dos llamadas: el motor sigue donde quedó
    const mitad = Math.floor(lejos.length / 2)
    const j1 = registrarLecturas(enPaseo(), lejos.slice(0, mitad), { demo: true, desdeCero: true })!
    const j2 = registrarLecturas(j1, lejos.slice(mitad), { demo: true })!
    const junto = registrarLecturas(enPaseo(), lejos, { demo: true, desdeCero: true })!
    expect(j2.paseo.eventos.map((e) => e.aviso)).toEqual(junto.paseo.eventos.map((e) => e.aviso))
    expect(j2.vigilancia).toEqual(junto.vigilancia)
  })

  it('«desdeCero» olvida lo anterior: cada prueba de la demostración empieza limpia', () => {
    const una = registrarLecturas(enPaseo(), lecturasDeEscenario('borde', AHORA), { demo: true, desdeCero: true })!
    const otra = registrarLecturas(una, lecturasDeEscenario('borde', AHORA + 60_000), { demo: true, desdeCero: true })!
    expect(otra.paseo.eventos.filter((e) => e.aviso === 'borde')).toHaveLength(2)
  })

  it('solo durante el paseo: antes de recoger al perro o después de entregarlo no se registra nada', () => {
    const antes: Job = { ...base, paseo: nuevoPaseo(1_000_000) }
    expect(registrarLecturas(antes, lecturasDeEscenario('salida', AHORA), { demo: true })).toBe(antes)
    const entregado = { ...enPaseo() }
    entregado.paseo = aplicar(entregado.paseo, 'entregar', 'paseador', 1_000_400)
    expect(registrarLecturas(entregado, lecturasDeEscenario('salida', AHORA), { demo: true })).toBe(entregado)
    expect(registrarLecturas(null, [], { demo: true })).toBeNull()
  })

  it('una lectura buena y normal solo actualiza la vigilancia: no hay avisos', () => {
    const l: Lectura = { pos: desplazar(HOME_POINT, 5, 5), precisionM: 10, t: AHORA }
    const j = registrarLecturas(enPaseo(), [l], { demo: false })!
    expect(j.paseo.eventos.some((e) => e.accion === 'avisar')).toBe(false)
    expect(j.vigilancia?.ultima?.pos).toEqual(l.pos)
  })

  it('los dos lados leen lo mismo: el aviso está en el encargo que comparten', () => {
    const j = registrarLecturas(enPaseo(), lecturasDeEscenario('quieto', AHORA), { demo: true, desdeCero: true })!
    // el dueño y el paseador leen `job.paseo.eventos`: no hay otra copia
    const dueno = j.paseo.eventos.filter((e) => e.accion === 'avisar')
    const paseador = visibleParaPaseador(j)!.paseo.eventos.filter((e) => e.accion === 'avisar')
    expect(paseador).toEqual(dueno)
    expect(dueno).toHaveLength(1)
  })
})

describe('la ubicación del paseador: permiso, «Ahora no» y navegador sin ubicación', () => {
  const enPaseo = (): Job => {
    let p = nuevoPaseo(1_000_000)
    p = aplicar(p, 'aceptar', 'paseador', 1_000_100)
    p = aplicar(p, 'salir', 'paseador', 1_000_200)
    p = aplicar(p, 'recoger', 'paseador', 1_000_300)
    return { ...base, paseo: p }
  }

  it('al elegir compartirla queda «activa» (todavía sin avisos)', () => {
    const j = activarUbicacion(enPaseo())!
    expect(j.ubicacion).toBe('activa')
    expect(j.paseo.eventos.some((e) => e.accion === 'avisar')).toBe(false)
  })

  it('si se niega, el paseador sigue y el registro lo anota con la hora, el sistema y el motivo', () => {
    const j = registrarSinUbicacion(activarUbicacion(enPaseo()), 'negada', 1_005_000)!
    expect(j.ubicacion).toBe('negada')
    expect(j.paseo.estado).toBe('en_paseo')
    const e = j.paseo.eventos[j.paseo.eventos.length - 1]
    expect(e).toMatchObject({ accion: 'avisar', quien: 'sistema', aviso: 'sin_ubicacion', at: 1_005_000 })
    expect(e.nota).toMatch(/permiso/)
    expect(e.demo).toBeUndefined()
  })

  it('«Ahora no» y «el navegador no la permite» también quedan anotados, cada uno con su motivo', () => {
    const a = registrarSinUbicacion(enPaseo(), 'omitida', 1_005_000)!
    expect(a.ubicacion).toBe('omitida')
    expect(a.paseo.eventos[a.paseo.eventos.length - 1].nota).toMatch(/no la compartió/)
    const b = registrarSinUbicacion(enPaseo(), 'no_disponible', 1_005_000)!
    expect(b.paseo.eventos[b.paseo.eventos.length - 1].nota).toMatch(/navegador o esta conexión/)
  })

  it('no se anota dos veces lo mismo (recargar la pantalla no llena el registro)', () => {
    const una = registrarSinUbicacion(enPaseo(), 'negada', 1_005_000)!
    const dos = registrarSinUbicacion(una, 'negada', 1_006_000)!
    expect(dos).toBe(una)
    expect(dos.paseo.eventos.filter((e) => e.aviso === 'sin_ubicacion')).toHaveLength(1)
  })

  it('solo durante el paseo', () => {
    const antes: Job = { ...base, paseo: nuevoPaseo(1_000_000) }
    expect(registrarSinUbicacion(antes, 'negada', 1_005_000)).toBe(antes)
    expect(activarUbicacion(antes)).toBe(antes)
    expect(registrarSinUbicacion(null, 'negada', 1)).toBeNull()
  })

  it('con ubicación real: las lecturas dejan avisos que NO dicen «Demostración»', () => {
    const j = activarUbicacion(enPaseo())!
    // dos lecturas buenas, lejos de la zona (Miraflores y un poco más al sur)
    const fuera = registrarLecturas(
      j,
      [
        { pos: [-12.1219, -77.0297], precisionM: 15, t: 1_010_000 },
        { pos: [-12.1225, -77.0297], precisionM: 15, t: 1_055_000 },
      ],
      { demo: false },
    )!
    const aviso = fuera.paseo.eventos.find((e) => e.aviso === 'salida')!
    expect(aviso).toBeDefined()
    expect(aviso.demo).toBeUndefined()
    expect(aviso.nota).not.toContain('Demostración')
  })
})
