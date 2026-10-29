/**
 * Los textos de la lista de paseadores, «Disponible ahora», el lugar de la reserva y los recordatorios (Bloque 1).
 * Cortos y simples. Ninguno promete rapidez ni nada que la app no haga.
 */
export const TEXTO_RESERVAS = {
  disponibleAhora: 'Disponible ahora',
  noDisponible: 'No disponible ahora',
  disponibleTitulo: 'Disponible ahora',
  disponibleApoyoSi: 'Las familias te ven como disponible.',
  disponibleApoyoNo: 'Las familias te ven como no disponible ahora.',
  filtroDisponibles: 'Disponibles ahora',
  verMas: 'Ver más paseadores',
  filtroParque: 'Parque o zona',
  todosLosParques: 'Todos los parques',
  lugarTitulo: '¿Dónde quieres el paseo?',
  lugarApoyo: 'Los parques o zonas donde pasea esta persona.',
  lugarFila: 'Lugar',
  sinPago: 'No pagas ahora. Pagas al terminar el paseo.',
  recordatorioFamiliaTitulo: 'Tu paseo es pronto',
  recordatorioPaseadorTitulo: 'Tienes un paseo pronto',
} as const

/** «Tu paseo con Lucía empieza en 1 hora (10:00 am).» */
export function recordatorioCuerpo(quien: 'familia' | 'paseador', otro: string, perro: string, minutos: number, hora: string): string {
  const cuando = minutos % 60 === 0 && minutos >= 60 ? `${minutos / 60} ${minutos === 60 ? 'hora' : 'horas'}` : `${minutos} minutos`
  return quien === 'familia' ? `Tu paseo con ${otro} empieza en ${cuando} (${hora}).` : `Paseo con ${perro} (de ${otro}) en ${cuando} (${hora}).`
}
