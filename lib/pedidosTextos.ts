/**
 * Los textos de «Pedir paseo» (Bloque 2): cortos y simples. Los números salen de lib/config.ts. Nunca nombres en los contadores.
 */
export const TEXTO_PEDIDO = {
  boton: 'Pedir paseo',
  botonApoyo: 'Di cuánto pagarías y los paseadores de tu zona responden.',
  titulo: 'Pedir paseo',
  /** Debajo de la tarjeta: la otra forma de pedir y que las dos son lo mismo después. */
  reservaLink: 'O reserva una hora con un paseador',
  dosFormas: 'Las dos formas terminan en el mismo paseo. Pagas al terminar.',
  cuando: '¿Cuándo?',
  duracion: '¿Cuánto dura?',
  perro: '¿Quién pasea?',
  monto: '¿Cuánto pagarías por UNA hora?',
  montoApoyo: 'Los paseadores pueden aceptar o pedir un poco más. Tú eliges.',
  sinPago: 'No pagas ahora. Pagas al terminar el paseo.',
  enviar: 'Pedir ahora',
  enviando: 'Enviando…',
  sinConexion: 'No pudimos enviar tu pedido. Revisa tu internet e inténtalo otra vez.',
  sinCasa: 'Primero guarda tu casa en el mapa.',
  yaTienes: 'Ya tienes un pedido abierto. Espera o cancélalo.',
  pagoPendiente: 'No puedes pedir otro paseo hasta pagar el anterior.',
  montoFuera: 'Ese monto no está dentro del rango permitido.',
  horaFuera: 'Elige una hora que empiece después de que venza el pedido.',
  perroNo: 'Este perro no se puede pedir por ahora.',
  noSePudo: 'No pudimos crear el pedido. Inténtalo otra vez.',
  activoTitulo: 'Tu pedido',
  esperando: 'Esperando respuestas…',
  vence: 'Vence en',
  ofertasTitulo: 'Respuestas',
  sinOfertas: 'Todavía nadie respondió. Se avisa aquí.',
  acepta: 'Acepta tu monto',
  contraoferta: 'Pide un poco más',
  elegir: 'Elegir',
  eligiendo: 'Eligiendo…',
  cancelar: 'Cancelar pedido',
  venció: 'Tu pedido venció. Puedes pedir otra vez.',
  cancelado: 'Pedido cancelado.',
  elegido: 'Listo, tu paseo quedó aceptado.',
  yaNo: 'Esa oferta ya no está disponible.',
  demostracion: 'Demostración',
  porHora: 'por hora',
  // Para los paseadores
  cercaTitulo: 'Pedidos en tu zona',
  cercaApoyo: 'De ti solo se ve tu nombre. De la familia, su distrito y una zona aproximada.',
  cercaVacio: 'Por ahora no hay pedidos en tu zona.',
  aceptarMonto: 'Aceptar',
  ofrecerMas: 'Ofrecer más',
  enviarOferta: 'Enviar oferta',
  yaOfertaste: 'Ya respondiste a este pedido.',
  ocupado: 'Ya tienes un paseo a esa hora.',
  ofertaEnviada: 'Oferta enviada. La familia elige.',
  ofertaNo: 'No pudimos enviar tu oferta.',
  ofertaYaAsignado: 'Ya se asignó este pedido. Gracias por responder.',
  zonaAprox: 'Zona aproximada',
} as const

/** «12 paseadores lo vieron · 5 disponibles en tu zona» */
export function textoContadores(vistos: number, disponibles: number): string {
  const v = `${vistos} ${vistos === 1 ? 'paseador lo vio' : 'paseadores lo vieron'}`
  const d = `${disponibles} ${disponibles === 1 ? 'disponible' : 'disponibles'} en tu zona`
  return `${v} · ${d}`
}

/** Por qué la base dijo que no (el «motivo» de la función), en frase simple. */
export function textoDeMotivo(motivo: string): string {
  switch (motivo) {
    case 'sin_casa':
      return TEXTO_PEDIDO.sinCasa
    case 'ya_tienes_pedido':
      return TEXTO_PEDIDO.yaTienes
    case 'pago_pendiente':
      return TEXTO_PEDIDO.pagoPendiente
    case 'monto':
      return TEXTO_PEDIDO.montoFuera
    case 'hora':
      return TEXTO_PEDIDO.horaFuera
    case 'perro':
      return TEXTO_PEDIDO.perroNo
    case 'ya_ofertaste':
      return TEXTO_PEDIDO.yaOfertaste
    case 'ocupado':
      return TEXTO_PEDIDO.ocupado
    case 'ya_no':
    case 'fuera_de_zona':
      return TEXTO_PEDIDO.yaNo
    default:
      return TEXTO_PEDIDO.noSePudo
  }
}
