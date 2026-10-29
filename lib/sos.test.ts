import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import {
  contactosSos,
  distritoDe,
  emergenciasSos,
  enlaceLlamada,
  enlaceLlamadaCorta,
  enlaceMapa,
  enlaceWhatsApp,
  mensajeSos,
  normalizarTelefono,
  pasosSos,
  serenazgoSos,
} from './sos'

describe('normalizarTelefono', () => {
  it('acepta los formatos con los que la gente escribe un celular', () => {
    expect(normalizarTelefono('987654321')).toBe('+51987654321')
    expect(normalizarTelefono('987 654 321')).toBe('+51987654321')
    expect(normalizarTelefono('+51 987-654-321')).toBe('+51987654321')
    expect(normalizarTelefono('51987654321')).toBe('+51987654321')
    expect(normalizarTelefono('(+51) 987 654 321')).toBe('+51987654321')
  })
  it('acepta un número internacional con +', () => {
    expect(normalizarTelefono('+1 305 555 0123')).toBe('+13055550123')
  })
  it('rechaza lo que no es un teléfono', () => {
    expect(normalizarTelefono('')).toBeNull()
    expect(normalizarTelefono('   ')).toBeNull()
    expect(normalizarTelefono('12345')).toBeNull()
    expect(normalizarTelefono('887654321')).toBeNull() // un celular peruano empieza con 9
    expect(normalizarTelefono('9876543')).toBe('+5119876543') // 7 dígitos = fijo de Lima
    expect(normalizarTelefono('98765abcd')).toBeNull()
    expect(normalizarTelefono('+51')).toBeNull()
  })
})

describe('enlaces', () => {
  it('tel: lleva el número internacional', () => {
    expect(enlaceLlamada('987 654 321')).toBe('tel:+51987654321')
    expect(enlaceLlamada('nada')).toBeNull()
  })
  it('wa.me lleva solo dígitos y el mensaje codificado', () => {
    const url = enlaceWhatsApp('+51 987 654 321', '¡Ayuda! Perro: Max\nUbicación')
    expect(url).not.toBeNull()
    expect(url!.startsWith('https://wa.me/51987654321?text=')).toBe(true)
    expect(url).toContain(encodeURIComponent('¡Ayuda! Perro: Max\nUbicación'))
    expect(url).not.toContain(' ')
  })
  it('wa.me es null si el teléfono no sirve', () => {
    expect(enlaceWhatsApp('abc', 'hola')).toBeNull()
  })
  it('el mapa lleva latitud y longitud', () => {
    expect(enlaceMapa(-12.09993, -77.03739)).toBe('https://www.google.com/maps/search/?api=1&query=-12.09993,-77.03739')
  })
})

describe('mensajeSos', () => {
  const pos = { lat: -12.1, lng: -77.03, origen: 'telefono' as const }

  it('del paseador: dice quién es, con qué perro y trae el mapa', () => {
    const m = mensajeSos({ quien: 'paseador', perro: 'Max', paseador: 'Carlos', posicion: pos })
    expect(m).toContain('Carlos')
    expect(m).toContain('Max')
    expect(m).toContain('https://www.google.com/maps/search/?api=1&query=-12.10000,-77.03000')
    expect(m).toContain('Mi ubicación ahora')
  })
  it('del dueño: nombra al perro y al paseador', () => {
    const m = mensajeSos({ quien: 'dueno', perro: 'Max', paseador: 'Carlos', posicion: pos })
    expect(m).toContain('Max está de paseo con Carlos')
    expect(m).toContain('Última ubicación del paseo')
  })
  it('mientras el teléfono aún busca, el mensaje no dice «no pude»: dice que sigue buscando', () => {
    const m = mensajeSos({ quien: 'paseador', perro: 'Max', paseador: 'Carlos', posicion: null, buscando: true })
    expect(m).toContain('Todavía estoy buscando mi ubicación')
    expect(m).not.toContain('No pude')
  })
  it('sin ubicación lo dice y no inventa un enlace', () => {
    const m = mensajeSos({ quien: 'dueno', perro: 'Max', paseador: 'Carlos', posicion: null })
    expect(m).toContain('No pude obtener la ubicación')
    expect(m).not.toContain('google.com/maps')
  })
  it('una posición simulada se marca como demostración, nunca como real', () => {
    const m = mensajeSos({ quien: 'dueno', perro: 'Max', paseador: 'Carlos', posicion: { ...pos, origen: 'simulada' } })
    expect(m).toContain('Ubicación de demostración (no es real)')
    expect(m).not.toContain('Última ubicación del paseo')
  })
  it('nunca promete atención a toda hora ni ubicación infalsificable', () => {
    for (const quien of ['dueno', 'paseador'] as const) {
      const m = mensajeSos({ quien, perro: 'Max', paseador: 'Carlos', posicion: pos })
      expect(m).not.toMatch(/24 ?\/ ?7|garantiz|100 ?%|seguro/i)
    }
  })
})

describe('pasosSos', () => {
  it('el paseador: asegurar al perro, avisar al dueño, ir a la veterinaria (en ese orden)', () => {
    const p = pasosSos({ quien: 'paseador', perro: 'Max', paseador: 'Carlos' })
    expect(p).toHaveLength(3)
    expect(p[0]).toMatch(/^Asegura a Max/)
    expect(p[1]).toMatch(/^Avisa al dueño/)
    expect(p[2]).toMatch(/veterinaria más cercana/)
  })
  it('el dueño tiene tres pasos y ninguno promete que alguien responde siempre', () => {
    const p = pasosSos({ quien: 'dueno', perro: 'Max', paseador: 'Carlos' })
    expect(p).toHaveLength(3)
    expect(p.join(' ')).not.toMatch(/24 ?\/ ?7/)
    // El dueño no usa su propio contacto de emergencia en el SOS (su celular ya tiene sus contactos).
    expect(p.join(' ')).not.toMatch(/contacto de emergencia/i)
  })
})

describe('contactosSos', () => {
  it('arma llamar y WhatsApp para un celular', () => {
    const r = contactosSos([{ nombre: 'Paola', telefono: '987654321' }], 'Hola')
    expect(r).toEqual([{ nombre: 'Paola', llamar: 'tel:+51987654321', whatsapp: 'https://wa.me/51987654321?text=Hola' }])
  })
  it('usa el WhatsApp propio si el contacto lo tiene', () => {
    const r = contactosSos([{ nombre: 'Paola', telefono: '987654321', whatsapp: '+51 912 345 678' }], 'Hola')
    expect(r[0].llamar).toBe('tel:+51987654321')
    expect(r[0].whatsapp).toBe('https://wa.me/51912345678?text=Hola')
  })
  it('un fijo ofrece llamar pero NO inventa un WhatsApp', () => {
    const [c] = contactosSos([{ nombre: 'Oficina', telefono: '(01) 319 0000' }], 'Hola')
    expect(c.llamar).toBe('tel:+5113190000')
    expect(c.whatsapp).toBeNull()
  })
  it('si el WhatsApp está mal escrito, igual se puede llamar', () => {
    const [c] = contactosSos([{ nombre: 'Paola', telefono: '987654321', whatsapp: 'abc' }], 'Hola')
    expect(c.llamar).toBe('tel:+51987654321')
    expect(c.whatsapp).toBeNull()
  })
  it('descarta a quien no tiene ningún enlace que sirva (no deja un botón muerto)', () => {
    expect(contactosSos([{ nombre: 'Vacío', telefono: '' }, { nombre: 'Malo', telefono: '123' }], 'Hola')).toEqual([])
  })
})

describe('distritoDe', () => {
  it('detecta el distrito en una dirección', () => {
    expect(distritoDe('Calle Los Cedros 245 · San Isidro')).toBe('San Isidro')
    expect(distritoDe('Av. Brasil 1200 · Jesús María')).toBe('Jesús María')
    expect(distritoDe('Jesus Maria')).toBe('Jesús María')
  })
  it('mira lo que está después del último « · » (una calle que se llama como un distrito no confunde)', () => {
    expect(distritoDe('Jr. Jesús María 245 · San Isidro')).toBe('San Isidro')
  })
  it('si el texto no dice el distrito devuelve null (no adivina)', () => {
    expect(distritoDe('')).toBeNull()
    expect(distritoDe('Av. Arequipa 1200')).toBeNull()
  })
})

describe('serenazgoSos', () => {
  const vacio = CONFIG
  const lleno = {
    ...CONFIG,
    serenazgo: {
      sanIsidro: { telefono: '+51987654321', whatsapp: '+51912345678' },
      jesusMaria: { telefono: '', whatsapp: '' },
    },
  }

  it('con el distrito conocido muestra solo el de ese distrito', () => {
    const f = serenazgoSos('San Isidro', 'Hola', vacio)
    expect(f).toHaveLength(1)
    expect(f[0].nombre).toBe('Serenazgo de San Isidro')
  })
  it('si no se sabe el distrito muestra los dos, San Isidro primero', () => {
    const f = serenazgoSos(null, 'Hola', vacio)
    expect(f.map((x) => x.nombre)).toEqual(['Serenazgo de San Isidro', 'Serenazgo de Jesús María'])
  })
  it('un número vacío NO desaparece: sale como «falta configurar»', () => {
    const f = serenazgoSos('Jesús María', 'Hola', lleno)
    expect(f).toHaveLength(1)
    expect(f[0].configurado).toBe(false)
    expect(f[0].llamar).toBeNull()
    expect(f[0].whatsapp).toBeNull()
  })
  it('con teléfono y WhatsApp arma los dos enlaces, el WhatsApp con el mensaje', () => {
    const [f] = serenazgoSos('San Isidro', 'Ayuda: Max', lleno)
    expect(f.configurado).toBe(true)
    expect(f.llamar).toBe('tel:+51987654321')
    expect(f.whatsapp).toBe(`https://wa.me/51912345678?text=${encodeURIComponent('Ayuda: Max')}`)
  })
  it('con solo el teléfono ofrece llamar y no inventa un WhatsApp', () => {
    const c = { ...CONFIG, serenazgo: { ...CONFIG.serenazgo, sanIsidro: { telefono: '987654321', whatsapp: '' } } }
    const [f] = serenazgoSos('San Isidro', 'Hola', c)
    expect(f.configurado).toBe(true)
    expect(f.llamar).toBe('tel:+51987654321')
    expect(f.whatsapp).toBeNull()
  })
  it('el serenazgo real de la config empieza vacío (no se inventan números)', () => {
    expect(CONFIG.serenazgo.sanIsidro).toEqual({ telefono: '', whatsapp: '' })
    expect(CONFIG.serenazgo.jesusMaria).toEqual({ telefono: '', whatsapp: '' })
  })
})

describe('emergencias nacionales', () => {
  it('Policía 105, Bomberos 116 y SAMU 106, en ese orden', () => {
    expect(emergenciasSos().map((e) => [e.nombre, e.numero, e.llamar])).toEqual([
      ['Policía', '105', 'tel:105'],
      ['Bomberos', '116', 'tel:116'],
      ['SAMU (urgencias médicas)', '106', 'tel:106'],
    ])
  })
  it('un número vacío o mal escrito no genera un botón muerto', () => {
    const c = { ...CONFIG, emergenciasNacionales: { policia: '', bomberos: '11', samu: '106' } }
    expect(emergenciasSos(c).map((e) => e.numero)).toEqual(['106'])
  })
  it('enlaceLlamadaCorta solo acepta 3 dígitos', () => {
    expect(enlaceLlamadaCorta('105')).toBe('tel:105')
    expect(enlaceLlamadaCorta(' 116 ')).toBe('tel:116')
    expect(enlaceLlamadaCorta('1055')).toBeNull()
    expect(enlaceLlamadaCorta('abc')).toBeNull()
  })
})

describe('sin veterinarias', () => {
  it('la config no tiene lista de veterinarias (no hay convenio con ninguna)', () => {
    expect(Object.keys(CONFIG)).not.toContain('veterinarias24h')
    expect(JSON.stringify(CONFIG)).not.toMatch(/veterinari/i)
  })
})
