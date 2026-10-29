/** Los textos de los avisos (Bloque 3). Honestos: con el navegador cerrado todavía no hay aviso. */
export const TEXTO_ALERTAS = {
  titulo: 'Activar avisos',
  apoyoFamilia: 'Te avisamos con un sonido corto y vibración cuando un paseador responda a tu pedido.',
  apoyoPaseador: 'Te avisamos con un sonido corto y vibración cuando llegue un pedido en tu zona.',
  limite: 'Con el navegador cerrado, todavía no hay aviso. Deja la app abierta.',
  activar: 'Activar avisos',
  ahoraNo: 'Ahora no',
  interruptor: 'Avisos con sonido',
  interruptorSi: 'Suena y vibra cuando llega algo nuevo.',
  interruptorNo: 'En silencio. Solo verás el número.',
  nuevos: (n: number) => (n === 1 ? '1 nuevo' : `${n} nuevos`),
} as const
