import { describe, expect, it } from 'vitest'
import { EMPTY_APP, estadoVisible, type WalkerApplication } from '../walkerStore'
import { appConEstadoPropio, appDesdeLaBase, appDeFilas, cambiosDelEquipo, CASILLAS_DEL_EQUIPO, dniValido, esCascaron, filaDeComprobaciones, filaDePostulacion, listaDelEquipo, marcasDeComprobaciones, yaEnviadaALaBase } from './postulacionesMapeo'

const ID = 'bbbbbbbb-0000-4000-8000-000000000001'

const completa = (extra: Partial<WalkerApplication> = {}): WalkerApplication => ({
  ...EMPTY_APP,
  phone: '987 654 321',
  consent: { edad: true, dni: true },
  consentAt: '2026-10-10T15:00:00.000Z',
  person: { firstName: 'Lucía', lastName: 'Quispe', dni: '12345678', birth: '2004-03-02', district: 'Jesús María', university: 'U. del Pacífico', career: 'Psicología', cycle: '5' },
  profile: { ...EMPTY_APP.profile, bio: 'Hola', rate: 22, spots: ['olivar'] },
  consults: { consent: true },
  videoSlot: 'Lun 7:00 pm',
  status: 'enviada',
  code: 'PAT-ABCD',
  createdAt: '2026-10-10T15:00:00.000Z',
  ...extra,
})

describe('filaDePostulacion', () => {
  it('lleva lo que escribió el paseador y NUNCA el DNI, las casillas, las notas ni los paseos acompañados', () => {
    const f = filaDePostulacion(completa(), ID, null)
    expect(f.paseador_id).toBe(ID)
    expect(f.codigo).toBe('PAT-ABCD')
    expect(f.nombre).toBe('Lucía')
    expect(f.distrito).toBe('Jesús María')
    expect(f.perfil).toMatchObject({ rate: 22, spots: ['olivar'] })
    // Las referencias ya no existen: no viajan ni hay dónde guardarlas.
    expect(Object.keys(f)).not.toContain('referencias')
    expect(f.cita_videollamada).toBe('Lun 7:00 pm')
    const crudo = JSON.stringify(f)
    expect(crudo).not.toContain('12345678')
    expect(Object.keys(f)).not.toContain('revision_notas')
    expect(Object.keys(f)).not.toContain('paseos_acompanados')
  })

  it('el estado «enviada» solo viaja si la base aún deja cambiarlo (sin fila, borrador o enviada)', () => {
    expect(filaDePostulacion(completa(), ID, null).estado).toBe('enviada')
    expect(filaDePostulacion(completa(), ID, 'borrador').estado).toBe('enviada')
    expect(filaDePostulacion(completa(), ID, 'enviada').estado).toBe('enviada')
    for (const e of ['supervisado', 'activo', 'rechazada']) expect(Object.keys(filaDePostulacion(completa(), ID, e))).not.toContain('estado')
  })

  it('un borrador no manda estado', () => {
    expect(Object.keys(filaDePostulacion(completa({ status: 'borrador' }), ID, null))).not.toContain('estado')
  })

  it('una fecha o un distrito que no sirven no rompen la fila', () => {
    const f = filaDePostulacion(completa({ person: { ...completa().person, birth: '03/02/2004' } }), ID, null)
    expect(f.nacimiento).toBeNull()
  })
})

describe('dniValido', () => {
  it('son 8 números', () => {
    expect(dniValido('12345678')).toBe(true)
    for (const x of ['', '1234567', '123456789', '1234567a', '1234 5678']) expect(dniValido(x)).toBe(false)
  })
})

const filaBase = {
  paseador_id: ID,
  codigo: 'PAT-ABCD',
  estado: 'enviada',
  nombre: 'Lucía',
  apellido: 'Quispe',
  nacimiento: '2004-03-02',
  distrito: 'Jesús María',
  universidad: 'U. del Pacífico',
  carrera: 'Psicología',
  ciclo: '5',
  consentimientos: { edad: true },
  consentimiento_en: '2026-10-10T15:00:00.000Z',
  version_terminos: 'v1',
  perfil: { rate: 22, sizes: ['small'], spots: ['olivar'], bio: 'Hola' },
  curso: null,
  curso_intentos: 0,
  examen: null,
  examen_intentos: 0,
  consulta_autorizada: true,
  cita_videollamada: 'Lun 7:00 pm',
  paseos_acompanados: 0,
  creado_en: '2026-10-10T15:00:00.000Z',
}

describe('appDeFilas', () => {
  it('arma la postulación con lo que dice la base', () => {
    const app = appDeFilas({ post: filaBase, comp: { dni: true, distrito: false, celular: false, consultas: false, examen: false }, dni: '12345678', celular: '987654321', nota: 'Llamar el lunes' })
    expect(app.person).toMatchObject({ firstName: 'Lucía', dni: '12345678', district: 'Jesús María', birth: '2004-03-02' })
    expect(app.phone).toBe('987654321')
    expect(app.status).toBe('enviada')
    expect(app.review.comprobaciones).toMatchObject({ dni: true, distrito: false })
    expect(app.review.notes).toBe('Llamar el lunes')
    expect(app.videoSlot).toBe('Lun 7:00 pm')
    expect(Object.keys(app)).not.toContain('refs')
    expect(app.profile.sizes).toEqual(['small'])
  })

  it('sin la fila de casillas, ninguna está marcada', () => {
    const marcas = marcasDeComprobaciones(null)
    for (const id of CASILLAS_DEL_EQUIPO) expect(marcas[id]).toBe(false)
  })

  it('«aprobada» sin las cinco casillas se MUESTRA en revisión (estadoVisible)', () => {
    const cuatro = { dni: true, distrito: true, celular: true, consultas: true, examen: false }
    expect(estadoVisible(appDeFilas({ post: { ...filaBase, estado: 'supervisado' }, comp: cuatro }))).toBe('enviada')
    expect(estadoVisible(appDeFilas({ post: { ...filaBase, estado: 'activo' }, comp: null }))).toBe('enviada')
    expect(estadoVisible(appDeFilas({ post: { ...filaBase, estado: 'supervisado' }, comp: { ...cuatro, examen: true } }))).toBe('supervisado')
  })

  it('un estado raro de la base se trata como borrador', () => {
    expect(appDeFilas({ post: { ...filaBase, estado: 'inventado' } }).status).toBe('borrador')
  })
})

describe('appConEstadoPropio (lo que ve el paseador)', () => {
  it('sin fila en la base queda su postulación tal cual', () => {
    const local = completa()
    expect(appConEstadoPropio(local, null, null)).toBe(local)
    expect(appConEstadoPropio(null, null, null)).toBeNull()
  })

  it('manda la base en el estado, las casillas y los paseos; lo que escribió él se queda', () => {
    const local = completa({ profile: { ...completa().profile, rate: 30 } })
    const app = appConEstadoPropio(local, { ...filaBase, estado: 'rechazada', paseos_acompanados: 3 }, { dni: true, distrito: true, celular: false, consultas: false, examen: false })!
    expect(app.status).toBe('rechazada')
    expect(app.review.supervisedWalks).toBe(3)
    expect(app.review.comprobaciones).toMatchObject({ dni: true, celular: false })
    expect(app.profile.rate).toBe(30)
    expect(app.person.dni).toBe('12345678')
  })

  it('las notas internas del equipo NUNCA llegan al paseador', () => {
    const local = completa({ review: { comprobaciones: {}, notes: 'algo viejo', supervisedWalks: 0 } })
    expect(appConEstadoPropio(local, filaBase, null)!.review.notes).toBe('')
  })

  it('«borrador» en la base: manda lo local (nunca se mandó nada)', () => {
    expect(appConEstadoPropio(completa({ status: 'enviada' }), { ...filaBase, estado: 'borrador' }, null)!.status).toBe('enviada')
  })

  it('en otro teléfono se arma con lo de la base, sin DNI', () => {
    const app = appConEstadoPropio(null, filaBase, null)!
    expect(app.person.firstName).toBe('Lucía')
    expect(app.person.dni).toBe('')
    expect(app.code).toBe('PAT-ABCD')
  })
})

describe('cambiosDelEquipo', () => {
  const antes = appDeFilas({ post: filaBase })
  it('sin cambios, null', () => expect(cambiosDelEquipo(antes, { ...antes })).toBeNull())
  it('el estado, los paseos, las casillas y la nota', () => {
    const despues: WalkerApplication = {
      ...antes,
      status: 'supervisado',
      review: { comprobaciones: { dni: true, distrito: true, celular: true, consultas: true, examen: true }, notes: 'ok', supervisedWalks: 2 },
    }
    const c = cambiosDelEquipo(antes, despues)!
    expect(c.estado).toBe('supervisado')
    expect(c.paseos).toBe(2)
    expect(c.nota).toBe('ok')
    expect(c.casillas).toMatchObject({ dni: true, examen: true })
  })
  it('una sola casilla cambia la fila entera de casillas', () => {
    const c = cambiosDelEquipo(antes, { ...antes, review: { ...antes.review, comprobaciones: { dni: true } } })!
    expect(c.casillas).toMatchObject({ dni: true, distrito: false })
    expect(c.estado).toBeUndefined()
  })
})

describe('filaDeComprobaciones', () => {
  it('lleva las cinco casillas y quién del equipo las marcó', () => {
    expect(filaDeComprobaciones(ID, { dni: true, distrito: false, celular: true, consultas: false, examen: true, primerPaseo: false }, 'eq-1')).toEqual({
      paseador_id: ID,
      dni: true,
      distrito: false,
      celular: true,
      consultas: false,
      examen: true,
      marcado_por: 'eq-1',
    })
  })
})

describe('listaDelEquipo', () => {
  it('muestra las enviadas (no los borradores), las más nuevas primero, con DNI, celular, cobro y nota', () => {
    const otro = { ...filaBase, paseador_id: 'bbbbbbbb-0000-4000-8000-000000000002', nombre: 'Mateo', creado_en: '2026-10-12T10:00:00.000Z' }
    const borrador = { ...filaBase, paseador_id: 'bbbbbbbb-0000-4000-8000-000000000003', estado: 'borrador' }
    const lista = listaDelEquipo(
      [filaBase, otro, borrador],
      [],
      [{ paseador_id: ID, dni: '12345678' }],
      [{ id: ID, celular: '987654321' }],
      { [ID]: { metodo: 'yape', telefono: '987654321', titular: 'Lucía Quispe' } },
      [{ paseador_id: ID, nota: 'Llamar' }],
    )
    expect(lista.map((p) => p.app.person.firstName)).toEqual(['Mateo', 'Lucía'])
    const lucia = lista[1].app
    expect(lucia.person.dni).toBe('12345678')
    expect(lucia.phone).toBe('987654321')
    expect(lucia.cobro.metodo).toBe('yape')
    expect(lucia.review.notes).toBe('Llamar')
  })
})

describe('en otro teléfono: lo que se arma con lo de la base', () => {
  const cuentaNueva: WalkerApplication = { ...EMPTY_APP, phone: '987 654 321', person: { ...EMPTY_APP.person, firstName: 'Lucía', lastName: 'Quispe' }, code: 'PAT-NUEVO' }

  it('un cascarón es lo que arma la app al entrar con una cuenta nueva: nombre y celular, sin perfil, curso ni examen', () => {
    expect(esCascaron(null)).toBe(true)
    expect(esCascaron(cuentaNueva)).toBe(true)
    expect(esCascaron({ ...completa(), profile: { ...completa().profile, bio: 'Me gustan mucho los perros y vivo cerca del Olivar.' } })).toBe(false)
  })

  it('«ya enviada a la base» es enviada, aprobada o rechazada; un borrador o nada, no', () => {
    expect(yaEnviadaALaBase(null)).toBe(false)
    expect(yaEnviadaALaBase({ ...filaBase, estado: 'borrador' })).toBe(false)
    expect(yaEnviadaALaBase({ ...filaBase, estado: 'inventado' })).toBe(false)
    for (const e of ['enviada', 'supervisado', 'activo', 'rechazada']) expect(yaEnviadaALaBase({ ...filaBase, estado: e })).toBe(true)
  })

  it('se arma con lo que guardó la base y conserva del teléfono el celular, la foto y el DNI que tenga', () => {
    const local = { ...cuentaNueva, photo: 'data:image/jpeg;base64,AAAA', person: { ...cuentaNueva.person, dni: '12345678' } }
    const app = appDesdeLaBase(local, filaBase, { dni: true, distrito: false, celular: false, consultas: false, examen: false }, { metodo: 'yape', telefono: '987654321', titular: 'Lucía Quispe' })
    expect(app.status).toBe('enviada')
    expect(app.code).toBe('PAT-ABCD')
    expect(app.person).toMatchObject({ firstName: 'Lucía', dni: '12345678', district: 'Jesús María' })
    expect(app.phone).toBe('987 654 321')
    expect(app.photo).toBe('data:image/jpeg;base64,AAAA')
    expect(app.profile.bio).toBe('Hola')
    expect(app.videoSlot).toBe('Lun 7:00 pm')
    expect(app.cobro).toMatchObject({ metodo: 'yape', titular: 'Lucía Quispe' })
    expect(app.review.comprobaciones).toMatchObject({ dni: true, distrito: false })
  })

  it('sin nada en el teléfono: sin DNI ni foto (la base no los devuelve) y dónde cobra, si la base lo tiene', () => {
    const app = appDesdeLaBase(null, filaBase, null, null)
    expect(app.person.dni).toBe('')
    expect(app.photo).toBeUndefined()
    expect(app.cobro.metodo).toBe('')
  })
})
