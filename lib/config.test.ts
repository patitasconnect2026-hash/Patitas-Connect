import { describe, expect, it } from 'vitest'
import {
  CONFIG,
  cobroConfigurado,
  comisionPatitas,
  contactoPrincipal,
  descuentoPlan,
  desgloseDePago,
  etiquetaAyuda,
  mediosDeCobro,
  montoFamilia,
  pagoPaseador,
  precioPaseo,
  textoComision,
  textoPlanLargo,
  textoPlanLunesViernes,
  textoRecargoIndividual,
} from './config'
import { WALKERS } from './data'
import { enlaceLlamadaCorta, enlaceLlamada } from './sos'

describe('CONFIG del piloto', () => {
  it('Patitas cobra el 20 % (0,20), sobre el precio del paseador, y recuerda a los 15 minutos', () => {
    expect(CONFIG.comision).toBe(20)
    expect(CONFIG.comision / 100).toBe(0.2)
    expect(CONFIG.comisionModo).toBe('del_precio')
    expect(CONFIG.minutosRecordatorio).toBe(15)
  })
  it('el medio de cobro del equipo empieza VACÍO (no se inventa ningún Yape, Plin ni cuenta)', () => {
    expect(CONFIG.cobroEquipo).toEqual({ titular: '', yape: '', plin: '', cuenta: '', qr: '' })
    expect(cobroConfigurado()).toBe(false)
    expect(mediosDeCobro()).toEqual([])
  })
  it('lo que el equipo escriba en el cobro sale en la lista solo si sirve', () => {
    const base = CONFIG.cobroEquipo
    expect(mediosDeCobro({ cobroEquipo: { ...base, yape: '987 654 321', plin: '12345', cuenta: ' 1234 ' } }).map((m) => m.id)).toEqual(['yape'])
    const todo = mediosDeCobro({ cobroEquipo: { ...base, yape: '987 654 321', plin: '+51 912 345 678', cuenta: '002-193-001234567890-12' } })
    expect(todo.map((m) => m.nombre)).toEqual(['Yape', 'Plin', 'Transferencia'])
    expect(todo[2].dato).toBe('002-193-001234567890-12')
  })
  it('los contactos y el horario de ayuda empiezan vacíos para llenarlos a mano', () => {
    expect(CONFIG.contactosAyuda).toEqual([])
    expect(CONFIG.horarioAyuda).toBe('')
  })
  it('los números nacionales son los confirmados en gob.pe: Policía 105, Bomberos 116, SAMU 106', () => {
    expect(CONFIG.emergenciasNacionales).toEqual({ policia: '105', bomberos: '116', samu: '106' })
  })
  it('la tarifa libre va de S/ 16 a S/ 34 por hora', () => {
    expect(CONFIG.tarifaMinima).toBe(16)
    expect(CONFIG.tarifaMaxima).toBe(34)
  })
  it('los descuentos están apagados y el paseo individual cuesta 40 % más', () => {
    expect(CONFIG.descuentoBienvenida).toBe(0)
    expect(CONFIG.descuentoLunesViernesPct).toBe(0)
    expect(CONFIG.recargoIndividualPct).toBe(40)
  })
  it('la tarifa sugerida está dentro del rango', () => {
    expect(CONFIG.tarifaSugerida).toBeGreaterThanOrEqual(CONFIG.tarifaMinima)
    expect(CONFIG.tarifaSugerida).toBeLessThanOrEqual(CONFIG.tarifaMaxima)
  })
})

describe('precioPaseo', () => {
  it('es la tarifa por hora proporcional a los minutos', () => {
    expect(precioPaseo(25, 60, false)).toBe(25)
    expect(precioPaseo(25, 30, false)).toBe(12.5)
    expect(precioPaseo(25, 90, false)).toBe(37.5)
  })
  it('el paseo individual suma el recargo del config', () => {
    expect(precioPaseo(25, 60, true)).toBe(35)
    expect(precioPaseo(25, 60, true, { ...CONFIG, recargoIndividualPct: 20 })).toBe(30)
  })
  it('redondea a medio sol', () => {
    expect(precioPaseo(27, 30, true)).toBe(19)
  })
})

describe('descuentoPlan', () => {
  it('con el descuento apagado es 0 aunque el plan sea lunes a viernes', () => {
    expect(descuentoPlan(25, 'weekdays')).toBe(0)
  })
  it('solo aplica al plan lunes a viernes', () => {
    const c = { ...CONFIG, descuentoLunesViernesPct: 10 }
    expect(descuentoPlan(25, 'weekdays', c)).toBe(2.5)
    expect(descuentoPlan(25, 'once', c)).toBe(0)
  })
})

describe('textos de precios', () => {
  it('el recargo individual muestra el valor del config', () => {
    expect(textoRecargoIndividual()).toBe('+40 % sobre la tarifa del grupo')
    expect(textoRecargoIndividual({ ...CONFIG, recargoIndividualPct: 25 })).toBe('+25 % sobre la tarifa del grupo')
  })
  it('el plan lunes a viernes no promete descuento si está apagado', () => {
    expect(textoPlanLunesViernes()).not.toMatch(/%/)
    expect(textoPlanLargo()).not.toMatch(/descuento/)
  })
  it('el plan lunes a viernes muestra el descuento si está encendido', () => {
    const c = { ...CONFIG, descuentoLunesViernesPct: 10 }
    expect(textoPlanLunesViernes(c)).toBe('−10 % cada paseo')
    expect(textoPlanLargo(c)).toMatch(/10 % de descuento/)
  })
})

describe('teléfonos de la config', () => {
  it('todo número que el equipo escriba tiene que servir (si no, el SOS diría «Falta configurar» sin avisar)', () => {
    const malos: string[] = []
    const revisar = (nombre: string, valor: string) => {
      if (valor.trim() !== '' && enlaceLlamada(valor) === null) malos.push(`${nombre}: «${valor}»`)
    }
    CONFIG.contactosAyuda.forEach((c, i) => {
      revisar(`contactosAyuda[${i}].telefono`, c.telefono)
      revisar(`contactosAyuda[${i}].whatsapp`, c.whatsapp ?? '')
    })
    for (const [d, v] of Object.entries(CONFIG.serenazgo)) {
      revisar(`serenazgo.${d}.telefono`, v.telefono)
      revisar(`serenazgo.${d}.whatsapp`, v.whatsapp)
    }
    for (const [k, v] of Object.entries(CONFIG.emergenciasNacionales)) {
      if (v.trim() !== '' && enlaceLlamadaCorta(v) === null) malos.push(`emergenciasNacionales.${k}: «${v}»`)
    }
    expect(malos).toEqual([])
  })
})

describe('tarifas de los paseadores de ejemplo', () => {
  it('todas están dentro del rango permitido', () => {
    for (const w of WALKERS) {
      expect(w.pricePerHour, w.name).toBeGreaterThanOrEqual(CONFIG.tarifaMinima)
      expect(w.pricePerHour, w.name).toBeLessThanOrEqual(CONFIG.tarifaMaxima)
    }
  })
})

describe('textoComision', () => {
  it('con comisión 0 dice que durante el piloto no se cobra', () => {
    expect(textoComision(0)).toBe('Durante el piloto Patitas no cobra comisión.')
  })
  it('con comisión mayor a 0 muestra el porcentaje', () => {
    expect(textoComision(20)).toBe('Patitas cobra una comisión del 20 % de cada paseo.')
    expect(textoComision(7.5)).toBe('Patitas cobra una comisión del 7,5 % de cada paseo.')
  })
  it('el texto por defecto sale de la configuración (20 %) y cambia con el modo', () => {
    expect(textoComision()).toBe('Patitas cobra una comisión del 20 % de cada paseo.')
    expect(textoComision(20, 'sobre_el_precio')).toBe('Patitas cobra a la familia un 20 % más de comisión.')
  })
})

describe('pagoPaseador', () => {
  it('con comisión 0 el paseador recibe todo el precio', () => {
    expect(pagoPaseador(25, 0)).toBe(25)
  })
  it('con comisión 20 recibe el 80 %, sin decimales de más', () => {
    expect(pagoPaseador(25, 20)).toBe(20)
    expect(pagoPaseador(12.5, 20)).toBe(10)
    expect(pagoPaseador(33.33, 15)).toBe(28.33)
  })
  it('por defecto lee la configuración (20 %)', () => {
    expect(pagoPaseador(25)).toBe(20)
  })
})

describe('el reparto de un pago: la familia paga, Patitas se queda su parte y el paseador recibe el resto', () => {
  it('por defecto la familia paga el precio y Patitas se queda el 20 % de ese precio', () => {
    expect(montoFamilia(25)).toBe(25)
    expect(comisionPatitas(25)).toBe(5)
    expect(pagoPaseador(25)).toBe(20)
    expect(desgloseDePago({ walkPrice: 25, discount: 0, total: 25 })).toEqual({ monto: 25, comision: 5, neto: 20 })
  })

  it('la reversión: cobrar el 20 % ENCIMA del precio (la familia paga más y el paseador recibe todo)', () => {
    expect(montoFamilia(25, 20, 'sobre_el_precio')).toBe(30)
    expect(comisionPatitas(25, 20, 'sobre_el_precio')).toBe(5)
    expect(pagoPaseador(25, 20, 'sobre_el_precio')).toBe(25)
  })

  it('los tres números siempre suman, en los dos modos y con decimales', () => {
    for (const modo of ['del_precio', 'sobre_el_precio'] as const) {
      for (const precio of [12.5, 19, 25, 33.33, 47.5]) {
        const monto = montoFamilia(precio, 20, modo)
        expect(Math.round((comisionPatitas(precio, 20, modo) + pagoPaseador(precio, 20, modo)) * 100) / 100, `${modo} ${precio}`).toBe(monto)
      }
    }
  })

  it('con comisión 0 la familia paga el precio y el paseador recibe todo', () => {
    expect(montoFamilia(25, 0)).toBe(25)
    expect(comisionPatitas(25, 0)).toBe(0)
  })

  it('una reserva vieja (sin comisión ni neto guardados) se calcula con la configuración de hoy', () => {
    expect(desgloseDePago({ walkPrice: 30, discount: 5, total: 25 })).toEqual({ monto: 25, comision: 5, neto: 20 })
    expect(desgloseDePago({ walkPrice: 25, discount: 0, total: 25, comision: 4, neto: 21 })).toEqual({ monto: 25, comision: 4, neto: 21 })
  })
})

describe('etiquetaAyuda', () => {
  it('sin horario dice solo la palabra base', () => {
    expect(etiquetaAyuda('Ayuda', '')).toBe('Ayuda')
    expect(etiquetaAyuda('Ayuda', '   ')).toBe('Ayuda')
  })
  it('con horario lo agrega', () => {
    expect(etiquetaAyuda('SOS', 'Lun a vie, 8:00 a 20:00')).toBe('SOS · Lun a vie, 8:00 a 20:00')
  })
})

describe('contactoPrincipal', () => {
  it('es undefined mientras el equipo no configure ninguno', () => {
    expect(contactoPrincipal([])).toBeUndefined()
    expect(contactoPrincipal([{ nombre: 'Sin número', telefono: ' ' }])).toBeUndefined()
  })
  it('devuelve el primero que tenga teléfono', () => {
    const c = { nombre: 'Equipo', telefono: '+51999999999' }
    expect(contactoPrincipal([{ nombre: 'Vacío', telefono: '' }, c])).toBe(c)
  })
})
