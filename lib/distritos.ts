/**
 * Distritos de Lima: dónde paseamos hoy, dónde abrimos después y el teléfono del serenazgo de cada uno.
 * Pedido de Yahrod (30 de octubre de 2026): mostrar los números para llamar rápido si el GPS se pierde, y sumar los
 * distritos que mejor van a funcionar.
 *
 * Los números NO se inventan: cada uno trae su fuente (página o red oficial de la municipalidad), copiada el 30 de
 * octubre de 2026. FALTA que el equipo los confirme llamando (docs/AVANCE.md). Vacío = «Falta confirmar».
 * Las municipalidades publican una central de serenazgo, no un número por caseta: por eso se muestra la central.
 *
 * El orden de apertura es una PROPUESTA del equipo (cercanía a San Isidro y Jesús María, parques y familias con perro),
 * no un dato de mercado.
 */
import { CONFIG, type Config } from './config'
import { enlaceLlamada, enlaceWhatsApp } from './telefono'

export type EstadoDistrito = 'activo' | 'siguiente' | 'despues'

export interface DistritoLima {
  id: string
  nombre: string
  estado: EstadoDistrito
  /** Central de serenazgo como la publica la municipalidad. Vacío = falta confirmar. */
  serenazgo: string
  /** WhatsApp de serenazgo, si la municipalidad publica uno (celular). */
  whatsapp: string
  /** Dónde se copió el número. */
  fuente: string
  /** Por qué va en ese lugar (para la web). */
  porQue: string
}

export function distritosLima(c: Config = CONFIG): DistritoLima[] {
  return [
    {
      id: 'san-isidro',
      nombre: 'San Isidro',
      estado: 'activo',
      serenazgo: c.serenazgo.sanIsidro.telefono,
      whatsapp: c.serenazgo.sanIsidro.whatsapp,
      fuente: 'gob.pe · Teléfonos de emergencia de San Isidro',
      porQue: 'Donde empezamos: Olivar y parques vecinales.',
    },
    {
      id: 'jesus-maria',
      nombre: 'Jesús María',
      estado: 'activo',
      serenazgo: c.serenazgo.jesusMaria.telefono,
      whatsapp: c.serenazgo.jesusMaria.whatsapp,
      fuente: 'munijesusmaria.gob.pe · Teléfonos de emergencia',
      porQue: 'Campo de Marte, el parque de las mascotas.',
    },
    {
      id: 'miraflores',
      nombre: 'Miraflores',
      estado: 'siguiente',
      serenazgo: '(01) 680 3000',
      whatsapp: '',
      fuente: 'Instagram oficial de la Municipalidad de Miraflores',
      porQue: 'Malecón y mucha demanda de paseos.',
    },
    {
      id: 'surco',
      nombre: 'Santiago de Surco',
      estado: 'siguiente',
      serenazgo: '(01) 411 5555',
      whatsapp: '',
      fuente: 'munisurco.gob.pe · Teléfonos de emergencia',
      porQue: 'Muchas familias con perro y parques grandes.',
    },
    {
      id: 'magdalena',
      nombre: 'Magdalena del Mar',
      estado: 'siguiente',
      serenazgo: '(01) 418 0710',
      whatsapp: '954 468 421',
      fuente: 'Facebook oficial de la Municipalidad de Magdalena del Mar',
      porQue: 'Pegado a San Isidro y Jesús María.',
    },
    { id: 'san-borja', nombre: 'San Borja', estado: 'siguiente', serenazgo: '', whatsapp: '', fuente: '', porQue: 'Parques amplios y vecinos con perro.' },
    { id: 'lince', nombre: 'Lince', estado: 'siguiente', serenazgo: '', whatsapp: '', fuente: '', porQue: 'Entre San Isidro y Jesús María.' },
    { id: 'barranco', nombre: 'Barranco', estado: 'despues', serenazgo: '', whatsapp: '', fuente: '', porQue: 'Junto a Miraflores.' },
    { id: 'pueblo-libre', nombre: 'Pueblo Libre', estado: 'despues', serenazgo: '', whatsapp: '', fuente: '', porQue: 'Junto a Jesús María y Magdalena.' },
    { id: 'san-miguel', nombre: 'San Miguel', estado: 'despues', serenazgo: '', whatsapp: '', fuente: '', porQue: 'Junto a Magdalena.' },
    { id: 'la-molina', nombre: 'La Molina', estado: 'despues', serenazgo: '', whatsapp: '', fuente: '', porQue: 'Casas con jardín y perros grandes.' },
  ]
}

export function distritosPorEstado(estado: EstadoDistrito, c: Config = CONFIG): DistritoLima[] {
  return distritosLima(c).filter((d) => d.estado === estado)
}

export interface BotonSerenazgo {
  distrito: string
  numero: string
  llamar: string | null
  whatsapp: string | null
  fuente: string
}

/** Los botones de serenazgo: los de los distritos activos primero. Los que no tienen número igual salen («Falta confirmar»). */
export function botonesSerenazgo(mensaje: string, c: Config = CONFIG, soloActivos = false): BotonSerenazgo[] {
  return distritosLima(c)
    .filter((d) => !soloActivos || d.estado === 'activo')
    .map((d) => ({
      distrito: d.nombre,
      numero: d.serenazgo,
      llamar: enlaceLlamada(d.serenazgo),
      whatsapp: enlaceWhatsApp(d.whatsapp, mensaje),
      fuente: d.fuente,
    }))
}
