/**
 * Textos del panel interno (/admin), escritos una sola vez.
 * Hoy NO hay servidor: el panel no está protegido de verdad y solo ve lo guardado en el navegador donde se abre.
 * Lo decimos claro, y dejamos escrito qué hace falta para protegerlo. No hay ninguna contraseña en el código:
 * una contraseña que se comprueba en el navegador no protege nada y daría una falsa sensación de seguridad.
 */

export const TEXTO_ADMIN = {
  eyebrow: 'Panel interno · Demostración',
  titulo: 'Panel del equipo',
  /** El título dice lo verdadero: quien lo lee solo a él no debe creer que está protegido. */
  avisoTitulo: 'Todavía sin contraseña',
  /** Dos líneas cortas, siempre a la vista. */
  aviso: ['No tiene inicio de sesión: es solo para el equipo.', 'Se abre desde un solo navegador y solo ve lo guardado aquí.'],
  avisoMasAbrir: 'Por qué y qué falta',
  /** Detrás de «Ver más»: por qué solo se abre desde un navegador. */
  avisoMas: 'Cada navegador guarda sus propios datos: quien abra este enlace verá su navegador, no el de otra persona. Para revisar a una postulante, ábrelo en el mismo navegador donde postuló.',
  protegerTitulo: 'Para protegerlo hace falta',
  /** Qué hace falta para que /admin esté protegido de verdad (solo con servidor). */
  proteger: [
    'Un servidor donde vivan las postulaciones y los reportes.',
    'Inicio de sesión del equipo, comprobado en el servidor.',
    'Que cada decisión guarde quién la tomó y cuándo.',
  ],
  /**
   * Con servidor y con una cuenta del equipo dentro. Lo verdadero: la cuenta se comprueba en la base y los pagos salen de
   * ella (paso 7); las postulaciones y los reportes todavía viven en este navegador. No promete protección de datos.
   */
  eyebrowEquipo: 'Panel interno · Con sesión',
  avisoTituloEquipo: 'Los datos vienen del servidor',
  avisoEquipo: ['Entraste con la cuenta del equipo.', 'Los pagos, las postulaciones y los reportes ya vienen del servidor.', 'La foto del postulante sigue en su teléfono.'],
  avisoMasAbrirEquipo: 'Qué sigue en el teléfono',
  avisoMasEquipo:
    'La cuenta se comprueba en la base de datos y decide quién ve esta pantalla. Los pagos, las postulaciones y los reportes se leen de la base con tu cuenta, y lo que decides se guarda allá. Solo siguen en cada teléfono la foto del postulante y el ajuste «Mostrar ejemplos» de este navegador.',
  /**
   * Recordatorio SOLO para el equipo (el paseador nunca lo ve): el contenido del mini curso todavía lo tiene que revisar una
   * persona con formación (veterinaria). No bloquea a nadie. Sale mientras `CONFIG.cursoRevisado` sea false.
   */
  cursoSinRevisar: 'Recordatorio para el equipo: el mini curso aún lo tiene que leer una persona de confianza antes de usarlo con paseadores reales.',
  /** Cuando una postulación figura aprobada pero falta una casilla. */
  faltanCasillas: 'Estaba aprobada, pero faltan casillas. Aún no aparece como aprobada.',
  /** Aprobada pero sin dónde cobrar: no recibe solicitudes. */
  sinCobro: 'Falta que registre dónde cobra: aún no recibe solicitudes.',
  /** Sobre los botones, cuando están apagados: qué casillas faltan (títulos cortos de lib/verificacion.ts). */
  paraAprobar: (faltan: readonly string[]) => `Para aprobar, falta marcar: ${faltan.join(', ')}.`,
} as const

/**
 * Las pantallas cortas de /admin cuando la app trabaja con el servidor (paso 5): entrada, «sin acceso» y «no se pudo».
 * Nada de lo que dicen es una promesa: solo cuentan qué pasa con la cuenta.
 */
export const TEXTO_ENTRADA_ADMIN = {
  titulo: 'Entrada del equipo',
  apoyo: 'Entra con la cuenta del equipo.',
  boton: 'Entrar',
  /** Con sesión pero sin rol «equipo»: esto y nada más. */
  sinAcceso: 'Esta cuenta no tiene acceso',
  noSePudo: 'No pudimos comprobar tu cuenta',
  noSePudoApoyo: 'Revisa tu internet e inténtalo de nuevo.',
  reintentar: 'Reintentar',
  salir: 'Salir',
  volver: 'Volver a la app',
  espera: 'Un momento…',
} as const

/**
 * La lista de pagos de /admin. Patitas cobra: el equipo verifica cada pago a mano y le paga al paseador a mano.
 * Las cifras (comisión, neto) salen del pago, que las copió de lib/config.ts al reservar. Nada se escribe a mano.
 */
export const TEXTO_PAGOS_ADMIN = {
  titulo: 'Pagos',
  apoyo: 'La familia paga al terminar el paseo. Tú pagas al paseador.',
  pagarTitulo: 'Por pagar al paseador',
  pagarVacio: 'No hay pagos por pagar.',
  /** Lo primero que se hace con cada fila: mirar en la cuenta del equipo, no en la app. */
  mirarCuenta: 'Mira en TU cuenta que el dinero llegó. Recién ahí paga al paseador.',
  noEncontradosTitulo: 'No encontrados',
  noEncontradosVacio: 'No hay pagos sin encontrar.',
  yaLoEncontre: 'Ya lo encontré',
  sinPagarTitulo: 'Falta que la familia pague',
  sinPagarVacio: 'Ninguna familia debe un paseo.',
  noLoEncuentro: 'No lo encuentro',
  pagadoAlPaseador: 'Pagado al paseador',
  /** Los botones son acciones («Marcar…»), no estados. */
  marcarPagado: 'Marcar «Pagado al paseador»',
  /** Sin la cuenta del paseador no se puede marcar como pagado. */
  noSePuedePagar: 'No se puede marcar pagado sin su Yape o Plin.',
  confirmar: 'Toca otra vez para confirmar',
  nota: 'Nota del equipo (obligatoria)',
  notaNoEncontrado: 'Si no lo encuentras, escribe por qué. Se abre un caso.',
  demostracion: 'Demostración: no es plata real.',
  sinCuentaDemo: 'Paseador de ejemplo: no tiene cuenta real.',
  faltaCobroPaseador: 'Falta el Yape o Plin del paseador.',
  paga: 'Paga la familia',
  seQueda: 'Patitas se queda',
  recibe: 'Recibe el paseador',
  historial: 'Historial',
  masAbrir: 'Cómo se paga',
  mas: 'La familia paga a Patitas al terminar el paseo (Yape, Plin o transferencia) y le muestra el pago al paseador, que toca «Vi el pago». Tú abres TU cuenta y compruebas que el dinero llegó. Si llegó, pagas al paseador su parte al Yape o Plin que registró y lo marcas «Pagado al paseador». Mientras no lo confirmes en tu cuenta, no se le paga. Si no lo encuentras, marca «No lo encuentro» con una nota: se abre un caso. Si el paseo no se hizo, no hay nada que pagar. La app no mueve dinero: todo lo haces tú a mano.',
} as const
