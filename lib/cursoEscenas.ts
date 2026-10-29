/**
 * El mini curso (Bloque 5): ocho escenas «¿Qué harías si…?». Cada una tiene la situación, tres opciones, una explicación corta y
 * un cierre de qué hacer. Tono cercano, mensajes de 2 a 4 líneas. NADA de veterinarios ni de remedios: ante una emergencia, calma,
 * avisar a la familia por chat o llamada y escribir a Patitas (los contactos salen de `lib/config.ts`). No promete nada («seguro»,
 * «100 %») y no bloquea el avance: lo que se afirma es solo lo que la persona hizo.
 */
export interface EscenaCurso {
  id: string
  /** Hasta 5 palabras. */
  titulo: string
  /** La situación, escrita como pregunta. */
  situacion: string
  opciones: readonly [string, string, string]
  /** Índice (0, 1 o 2) de la opción que más ayuda. */
  correcta: 0 | 1 | 2
  /** Por qué, en pocas palabras. */
  explicacion: string
  /** Cierre: qué hacer (2 o 3 puntos cortos). */
  queHacer: readonly string[]
}

export const ESCENAS_CURSO: readonly EscenaCurso[] = [
  {
    id: 'correa',
    titulo: 'La correa',
    situacion: 'Vas a salir y notas que el broche de la correa está flojo y medio gastado. ¿Qué harías si te pasa?',
    opciones: ['Salgo igual: es un paseíto corto.', 'No salgo así: aviso a la familia y a Patitas.', 'Le hago un nudo y listo.'],
    correcta: 1,
    explicacion: 'Un broche gastado cede justo cuando el perro jala. Ahí es cuando más se necesita.',
    queHacer: ['Revisa collar y broche antes de salir.', 'Si algo falla, avisa por el chat.', 'Nada de nudos improvisados.'],
  },
  {
    id: 'se-suelta',
    titulo: 'Se suelta de la correa',
    situacion: 'Un perro se suelta y sale corriendo hacia la pista. ¿Qué harías si te pasa?',
    opciones: ['Corro detrás gritando su nombre.', 'Mantengo la calma, lo llamo tranquilo y me agacho.', 'Espero a ver si vuelve solo.'],
    correcta: 1,
    explicacion: 'Si corres, él corre más. Una voz tranquila y tu cuerpo agachado le dicen que no es un juego.',
    queHacer: ['Asegura primero a los demás perros.', 'Avisa a la familia por chat o llamada.', 'Escribe a Patitas con la hora y el lugar.'],
  },
  {
    id: 'no-camina',
    titulo: 'No quiere caminar',
    situacion: 'A media cuadra el perro se planta y no quiere avanzar. ¿Qué harías si te pasa?',
    opciones: ['Lo jalo un poco más fuerte.', 'Me paro, le doy un momento y miro qué lo asusta.', 'Lo cargo sin avisar a nadie.'],
    correcta: 1,
    explicacion: 'Casi siempre algo lo incomoda: un ruido, un perro, el piso caliente. Jalarlo lo asusta más.',
    queHacer: ['Párate y déjalo respirar.', 'Cambia de ruta o vuelve despacio.', 'Si sigue así, cuéntale a la familia.'],
  },
  {
    id: 'pelea',
    titulo: 'Un perro ataca a otro',
    situacion: 'Dos perros empiezan a pelear en el parque. ¿Qué harías si te pasa?',
    opciones: ['Meto las manos para separarlos.', 'Hago ruido fuerte o pongo una barrera y me alejo.', 'Me quedo mirando hasta que paren.'],
    correcta: 1,
    explicacion: 'Las manos entre dos perros en pelea son lo más riesgoso. El ruido y una barrera los distraen.',
    queHacer: ['Sepáralos con calma cuando se suelten.', 'Avisa a las familias por chat o llamada.', 'Escribe a Patitas y usa «Reportar problema».'],
  },
  {
    id: 'fuera-de-lo-acordado',
    titulo: 'Piden algo extra',
    situacion: 'La familia te escribe: «¿Puedes pasear una hora más hoy y te pago aparte?». ¿Qué harías si te pasa?',
    opciones: ['Acepto: es plata extra.', 'Agradezco y explico que solo hago lo acordado en la app.', 'No contesto y sigo mi camino.'],
    correcta: 1,
    explicacion: 'Lo que no está en la app no tiene respaldo de nadie, ni para ti ni para ellos.',
    queHacer: ['Responde con amabilidad y claridad.', 'Si quieren más tiempo, que reserven otro paseo.', 'Cuéntale a Patitas si insisten.'],
  },
  {
    id: 'clima',
    titulo: 'Mal clima',
    situacion: 'Sale el paseo y de pronto hay un solazo fuerte o empieza a llover. ¿Qué harías si te pasa?',
    opciones: ['Sigo igual: pagaron por una hora.', 'Acorto el paseo, busco sombra o techo y aviso a la familia.', 'Lo cancelo sin decir nada.'],
    correcta: 1,
    explicacion: 'Con mucho calor o lluvia fuerte, un paseo largo cansa y asusta al perro. Un paseo corto también sirve.',
    queHacer: ['Toca el piso con el dorso de tu mano.', 'Sombra y agua fresca en sorbos.', 'Avisa a la familia por el chat.'],
  },
  {
    id: 'cansancio',
    titulo: 'Te sientes muy cansado',
    situacion: 'Vienes de un día largo y a mitad del paseo sientes mareo y sueño. ¿Qué harías si te pasa?',
    opciones: ['Aguanto: ya falta poco.', 'Paro en un lugar tranquilo y aviso a la familia y a Patitas.', 'Le paso la correa a un desconocido.'],
    correcta: 1,
    explicacion: 'Con sueño o mareo se te pasan cosas: un cruce, un broche, una señal. Pedir ayuda a tiempo es cuidar al perro.',
    queHacer: ['Para en un sitio tranquilo, lejos del tráfico.', 'Avisa a la familia por chat o llamada.', 'Escribe a Patitas para ver cómo seguir.'],
  },
  {
    id: 'sin-senal',
    titulo: 'Se pierde la señal',
    situacion: 'Se te acaba la batería o no hay señal y no puedes escribir a nadie. ¿Qué harías si te pasa?',
    opciones: ['Sigo el paseo y aviso al terminar.', 'Vuelvo con los perros a un lugar tranquilo y busco cómo avisar.', 'Dejo a los perros con alguien un rato.'],
    correcta: 1,
    explicacion: 'La familia espera noticias tuyas. Volver a un lugar conocido te da tiempo para avisar sin apuro.',
    queHacer: ['Vuelve por la ruta que conoces.', 'Pide prestado un celular o avisa en la portería.', 'Apenas puedas, avisa a la familia y a Patitas.'],
  },
]
