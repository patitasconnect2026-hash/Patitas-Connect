import { NOMBRE_CORTO } from './config'

/** La página a la que lleva el QR de la chapita (`/p/<id>`): para quien encuentra a un perro. Corta y honesta: en el piloto no muestra datos de la familia. */
export const TEXTO_CHAPITA = {
  titulo: `Encontraste a un perro de ${NOMBRE_CORTO}`,
  gracias: 'Gracias por frenar. Este perro tiene familia.',
  pasos: ['Mantén la calma y no lo asustes.', 'Si está en la calle, llévalo a un lugar tranquilo.', `Escríbele al equipo de ${NOMBRE_CORTO} y cuéntale dónde y cuándo lo viste.`],
  limite: 'En el piloto esta página no muestra los datos de la familia.',
  contactos: `Contacto de ${NOMBRE_CORTO}`,
  sinContacto: 'Falta configurar el contacto.',
  llamar: 'Llamar',
  escribir: 'Escribir por WhatsApp',
  mensaje: `Hola, encontré a un perro con la chapita de ${NOMBRE_CORTO}.`,
} as const
