import { describe, expect, it } from 'vitest'
import { EMPTY_APP, type WalkerApplication } from '@/lib/walkerStore'
import { profileValid } from './ProfileBuilder'

const completa: WalkerApplication = {
  ...EMPTY_APP,
  photo: 'data:image/jpeg;base64,AAAA',
  profile: {
    ...EMPTY_APP.profile,
    bio: 'Estudio veterinaria y vivo cerca del Bosque El Olivar, paseo con mucha paciencia.',
    days: ['Lun'],
    times: ['Mañana (6–12)'],
    spots: ['olivar'],
    experience: 'Tengo perro',
  },
  cobro: { metodo: 'yape', telefono: '987 654 321', titular: 'Ana Rojas' },
}

describe('perfil del paseador: puntos de paseo dentro de la zona', () => {
  it('con un parque de la lista, el perfil es válido', () => {
    expect(profileValid(completa)).toBe(true)
  })

  it('un punto que no está en la lista de parques de la zona no vale', () => {
    expect(profileValid({ ...completa, profile: { ...completa.profile, spots: ['olivar', 'miraflores-kennedy'] } })).toBe(false)
  })

  it('sin ningún punto de paseo, tampoco', () => {
    expect(profileValid({ ...completa, profile: { ...completa.profile, spots: [] } })).toBe(false)
  })
})

describe('perfil del paseador: sin dónde cobrar no puede recibir solicitudes', () => {
  it('sin Yape o Plin registrado, el perfil no está completo', () => {
    expect(profileValid({ ...completa, cobro: { metodo: '', telefono: '', titular: '' } })).toBe(false)
  })

  it('con un celular que no sirve o sin titular, tampoco', () => {
    expect(profileValid({ ...completa, cobro: { metodo: 'plin', telefono: '12345', titular: 'Ana Rojas' } })).toBe(false)
    expect(profileValid({ ...completa, cobro: { metodo: 'plin', telefono: '987 654 321', titular: '  ' } })).toBe(false)
  })
})
