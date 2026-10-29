/**
 * Textos de los puntos de control (lib/puntosControl.ts), escritos una sola vez. Los lee el dueño y el paseador.
 * Reglas: título hasta 5 palabras, apoyo hasta 12, detalle detrás de «Ver más». Los minutos salen de lib/config.ts.
 * Honestidad: el seguimiento NO es continuo; con la pantalla apagada el teléfono no sigue la ubicación; la hora y el
 * lugar los pone el teléfono (son señales); sin servidor solo llegan entre pestañas del mismo navegador, y con servidor
 * (paso 9) llegan por internet: solo el inicio, el fin y cada foto, nunca un recorrido.
 */
import { CONFIG } from './config'

/** La frase que resume cómo se sigue el paseo. Va tal cual en el «Ver más» del dueño y del paseador. */
export const LEMA_SEGUIMIENTO = 'El seguimiento es por puntos de control con foto.'

export const TEXTO_PUNTOS = {
  titulo: 'Puntos de control',
  tituloCorto: 'Puntos de control',
  /** Dueño */
  dueno: {
    apoyo: 'Inicio, cada foto y fin, con su hora y su lugar.',
    vacio: 'Aún no hay puntos de control.',
    masAbrir: 'Cómo se sigue el paseo',
  },
  /** Paseador */
  paseador: {
    guarda: 'Guardamos tu ubicación al empezar, al terminar y en cada foto.',
    toca: 'Toca una foto de control.',
    tocaApoyo: 'Una foto rápida y sigues paseando.',
  },
  /** Demostración: puntos inventados por la app en el mapa del dueño. */
  mapaDemo: 'PUNTOS DE EJEMPLO · DEMOSTRACIÓN',
  mapaSin: 'AÚN NO HAY PUNTOS',
} as const

/** «Próxima foto de control en 7 min.» */
export function textoProxima(min: number): string {
  return min <= 0 ? TEXTO_PUNTOS.paseador.toca : `Próxima foto de control en ${min} min.`
}

/** Para el dueño: cuánto hace de la última foto o inicio. */
export function textoUltimoControl(min: number): string {
  return min < 1 ? 'Último punto de control: hace menos de 1 min.' : `Último punto de control: hace ${min} min.`
}

/** Para el dueño, cuando pasó más de lo previsto sin foto. No es una alarma: solo informa. */
export function textoSinFoto(min: number): string {
  return `Pasaron ${min} min sin foto de control.`
}

/**
 * Detrás de «Ver más» para el dueño. Con servidor (`conServidor`) los puntos le llegan de verdad por internet; sin servidor,
 * solo si el paseador y él usan el mismo navegador.
 */
export function masDueno(minutos: number = CONFIG.minutosPuntoControl, conServidor = false): string {
  const llegada = conServidor
    ? 'Esos puntos llegan a tu teléfono por internet, cuando el paseador tiene conexión. Además, mientras él tiene la app abierta, ves en el mapa la última ubicación que mandó, cada pocos segundos; con la app cerrada no se actualiza. No guardamos su recorrido.'
    : 'Hoy solo te llegan si el paseador y tú usan el mismo navegador: entre dos celulares hace falta servidor.'
  return `${LEMA_SEGUIMIENTO} La ubicación se registra al empezar, al terminar y en cada foto. El paseador recibe un recordatorio cada ${minutos} minutos, pero solo lo ve si tiene la pantalla encendida. Con la pantalla apagada el teléfono no sigue la ubicación. La hora y el lugar los pone el teléfono: son señales y se pueden alterar. ${llegada}`
}

/**
 * Detrás de «Ver más» para el paseador. Con servidor (`conServidor`) se dice que esos puntos se envían y quién los ve.
 */
export function masPaseador(minutos: number = CONFIG.minutosPuntoControl, conServidor = false): string {
  const guarda = conServidor
    ? 'Tu ubicación se guarda al empezar, al terminar y en cada foto, y esos puntos se envían al servidor: los ven la familia del paseo y el equipo. Además, mientras pasas con la app abierta, tu última ubicación se envía cada pocos segundos para que la familia te vea en el mapa; al entregar al perro se borra. No guardamos tu recorrido.'
    : 'Tu ubicación se guarda al empezar, al terminar y en cada foto.'
  return `${LEMA_SEGUIMIENTO} ${guarda} Cada ${minutos} minutos sin foto te recordamos sacar una; el recordatorio solo se ve con la pantalla encendida, así que no hace falta que mires el teléfono todo el rato. Con la pantalla apagada el teléfono no sigue tu ubicación. Los avisos de zona son solo una ayuda mientras la pantalla está encendida. Si no das el permiso de ubicación, el paseo sigue y los puntos dicen «Sin ubicación».`
}
