/**
 * Términos y condiciones del PILOTO, en bloques cortos que se aceptan uno por uno.
 *
 * *** BORRADOR SIN REVISIÓN LEGAL. ***
 * Lo escribió el equipo con ayuda de una herramienta. NINGÚN abogado ni contador lo revisó. No es asesoría legal ni
 * tributaria y NO se debe usar con familias reales hasta que lo revise una persona con formación legal (y un contador,
 * porque Patitas cobra). La app lo dice en pantalla (TermsBlocks).
 *
 * Qué cuenta este texto (y qué NO):
 *  - Patitas cobra AL TERMINAR el paseo: la familia le paga a Patitas y le muestra el pago al paseador; Patitas
 *    confirma el pago en su cuenta, descuenta su comisión y le paga al paseador (lib/pagos.ts). La app no mueve dinero:
 *    lo hace el equipo, a mano.
 *  - La comisión, las horas de cancelación y el porcentaje de cancelación tardía se leen de CONFIG: nada a mano.
 *  - Patitas no es empleador del paseador.
 *  - No cita leyes: el equipo no las puede respaldar todavía. Eso lo agrega quien revise el texto.
 *  - Las cifras (máximos de perros, comprobaciones) salen de lib/verificacion.ts: nada a mano.
 *
 * DOS VERSIONES DE «DÓNDE SE GUARDAN LOS DATOS» (paso 7b). Sin servidor (`NEXT_PUBLIC_DATOS` distinto de «servidor», y la
 * demostración) es verdad que todo se queda en el teléfono: ese es el texto de `full`. Con servidor y sesión los datos se
 * guardan en los servidores de Supabase (un proveedor externo): ese es el texto de `conServidor`, y se muestra con
 * `bloquesParaMostrar(bloques, true)`. Las dos son un BORRADOR SIN REVISIÓN LEGAL; la de servidor está escrita para decir la
 * verdad de lo que hace la app hoy, NO para dar por bueno el manejo de datos personales (ver docs/AVANCE.md, «Pendientes»).
 */
import { CONFIG, NOMBRE_APP, NOMBRE_CORTO } from './config'
import { COMPROBACIONES, MAX_PERROS_POR_PASEO, REGLA_NUEVO } from './verificacion'

/** Cambia cada vez que cambia el texto: quien aceptó una versión vieja vuelve a aceptar. */
export const TERMS_VERSION = '2026-10-v4'

export interface TermsBlock {
  id: string
  title: string
  /** Lo que se acepta, en una frase clara */
  summary: string
  /** Texto completo (se despliega) */
  full: string
  /**
   * Lo mismo, dicho para cuando la app trabaja con el servidor (los datos se guardan en servidores de Supabase). Lo que no se
   * escribe aquí queda igual que arriba. BORRADOR SIN REVISIÓN LEGAL.
   */
  conServidor?: { title?: string; summary?: string; full: string }
}

/** Los bloques como se muestran: con servidor, la variante `conServidor` de cada uno que la tenga; si no, tal cual. */
export function bloquesParaMostrar(bloques: readonly TermsBlock[], servidor: boolean): TermsBlock[] {
  if (!servidor) return [...bloques]
  return bloques.map((b) => (b.conServidor ? { id: b.id, title: b.conServidor.title ?? b.title, summary: b.conServidor.summary ?? b.summary, full: b.conServidor.full } : b))
}

/** "7.5" → "7,5" (coma decimal, como se escribe en Perú). */
const pct = (n: number) => String(n).replace('.', ',')

/** Cómo se cobra la comisión, dicho para quien lo lee. Todo sale de CONFIG (porcentaje y modo). */
function textoComisionLegal(): string {
  if (CONFIG.comision <= 0) return `${NOMBRE_CORTO} no cobra comisión por ahora.`
  return CONFIG.comisionModo === 'sobre_el_precio'
    ? `${NOMBRE_CORTO} cobra a la familia el precio del paseo más un ${pct(CONFIG.comision)} % de comisión, y el paseador recibe el precio completo.`
    : `${NOMBRE_CORTO} se queda el ${pct(CONFIG.comision)} % del precio del paseo como comisión, y el paseador recibe el resto.`
}

export const CLIENT_BLOCKS: TermsBlock[] = [
  {
    id: 'edad',
    title: 'Tengo 18 años o más y mis datos son verdaderos',
    summary: 'Esta cuenta es mía, soy mayor de edad y los datos que doy son reales.',
    full: `Para usar ${NOMBRE_APP} debes tener 18 años cumplidos. La cuenta es personal: no la prestes ni la compartas. Si descubrimos que diste datos falsos o que eres menor de edad, podemos cerrar la cuenta y cancelar las reservas.`,
  },
  {
    id: 'perro',
    title: 'La información de mi perro es verdadera',
    summary: 'Dije la verdad sobre mi perro: tamaño, carácter, vacunas y si alguna vez mordió o se mostró agresivo.',
    full: 'La ficha de tu perro es lo que el paseador usa para cuidarlo. Debes informar con honestidad su tamaño, su carácter, sus alergias y si ha mordido o mostrado agresividad. Sus vacunas deben estar al día. Por ahora no atendemos razas consideradas potencialmente peligrosas (por ejemplo Pitbull, Rottweiler, Dóberman, Dogo Argentino, Fila Brasileño, Tosa Inu y Bullmastiff): su tenencia exige requisitos especiales y el piloto no puede cumplirlos.',
  },
  {
    id: 'pago',
    title: 'Entiendo cómo funcionan el pago y las cancelaciones',
    summary: `Pagas al terminar el paseo. ${NOMBRE_CORTO} le paga al paseador. Puedo cancelar gratis hasta ${CONFIG.horasCancelacionGratis} horas antes.`,
    full: `Pagas al terminar el paseo, no antes, y le pagas a ${NOMBRE_CORTO}, no al paseador. Cuando confirmas que recibiste a tu perro, la app te muestra a dónde pagar (Yape, Plin o transferencia) y a nombre de quién está la cuenta. Le muestras el pago al paseador y él lo marca como visto. Después ${NOMBRE_CORTO} confirma el pago en su cuenta, descuenta su comisión y le paga al paseador. ${textoComisionLegal()} Hoy no hay pasarela de pagos: todo se hace a mano y puede demorar. Hasta que pagues no puedes reservar otro paseo. Puedes cancelar sin costo hasta ${CONFIG.horasCancelacionGratis} horas antes del paseo; después, la cancelación queda anotada como tardía. Si el paseo no se hace (cancelado, rechazado o vencido), no hay nada que pagar. Si hay un problema con el pago o con la entrega, usa «Reportar problema»: el equipo lo revisa a mano y decide con una nota. ${NOMBRE_CORTO} no es el empleador del paseador. Este texto es un borrador y todavía no lo revisó un abogado ni un contador.`,
  },
  {
    id: 'trato',
    title: 'Trataré con respeto al paseador y no haré reservas falsas',
    summary: 'No hago bromas, reservas falsas ni insultos. El equipo puede suspender mi cuenta si lo hago.',
    full: 'Los paseadores trabajan con su nombre y su cara. No se permiten reservas falsas, bromas, insultos, acoso ni mensajes fuera de tema. Podemos suspender las cuentas que incumplan estas normas.',
  },
  {
    id: 'datos',
    title: 'Acepto cómo se usan mis datos',
    summary: 'El paseador ve el nombre de mi perro, su ficha y el punto de recojo solo durante el paseo. Nunca ve mi celular.',
    full: 'Guardamos solo los datos necesarios para dar el servicio. En el piloto se guardan en tu teléfono, no en un servidor. El paseador asignado ve el nombre y la ficha de tu perro, el punto de recojo y tu nombre de pila mientras dura el paseo; no ve tu celular ni tu forma de pago. Si dejas un contacto de emergencia, el paseador puede llamarlo si tú no contestas en una emergencia. Tus fotos y mensajes del paseo también se guardan solo en tu teléfono. Puedes borrar tus datos borrando los datos de esta página en tu navegador.',
    conServidor: {
      summary: 'Mis datos se guardan en servidores de Supabase. El paseador ve lo necesario durante el paseo y nunca mi celular.',
      full: `BORRADOR SIN REVISIÓN LEGAL. Con tu cuenta, tus datos se guardan en servidores de Supabase, un proveedor externo; esos servidores pueden estar fuera del Perú. Guardamos solo lo necesario para dar el servicio: tu correo, tu nombre y celular, tu dirección y el punto de recojo, la ficha de tu perro, tus paseos y sus avisos, los mensajes del chat, las fotos del paseo con su hora y su lugar, los puntos donde empezó y terminó el paseo, tus pagos y tus reportes. No seguimos tu recorrido: solo se guarda el lugar al empezar, al terminar y en cada foto. El paseador asignado ve el nombre y la ficha de tu perro, el punto de recojo y tu nombre de pila mientras dura el paseo; no ve tu celular ni tu forma de pago. Si dejas un contacto de emergencia, el paseador puede llamarlo si tú no contestas en una emergencia. El equipo de ${NOMBRE_CORTO} ve lo que necesita para atender pagos y problemas. Las fotos están pensadas para borrarse a los 7 días (salvo que haya un reporte abierto); hoy el equipo lo hace a mano. Todavía no está definido por cuánto tiempo guardamos el resto de los datos. Borrar los datos de tu navegador NO borra lo que ya está en el servidor: para pedir que borremos tus datos, escríbele al equipo.`,
    },
  },
  {
    id: 'riesgo',
    title: 'Entiendo que pasear perros tiene riesgos',
    summary: 'Los paseadores son personas independientes y ningún paseo está libre de riesgos.',
    full: `Pasear perros siempre tiene riesgos propios de la actividad con animales. Mostramos las comprobaciones que el equipo hizo de cada paseador y limitamos el tamaño del grupo, pero no podemos evitar que a veces pase algo. El paseador es una persona independiente: ${NOMBRE_APP} no es su empleador ni el paseador. Si ocurre un incidente, usa SOS y «Reportar problema»; el equipo lo revisa a mano. Hoy no existe ninguna póliza ni cobertura económica.`,
  },
]

export const WALKER_BLOCKS: TermsBlock[] = [
  {
    id: 'edad',
    title: 'Tengo 18 años o más y mis datos son verdaderos',
    summary: 'Soy mayor de edad y todo lo que declaro es real.',
    full: 'Para ser paseador debes tener 18 años cumplidos y vivir o estudiar en San Isidro o Jesús María. Los datos y fotos que entregues deben ser tuyos y verdaderos. Si descubrimos falsedad, podemos cerrar tu cuenta.',
  },
  {
    id: 'dni',
    title: 'Los clientes verán los últimos 4 dígitos de mi DNI',
    summary: 'Autorizo que los clientes con cuenta vean mi nombre, mi foto y los últimos 4 dígitos de mi DNI, solo para comprobar mi identidad.',
    full: 'Para dar confianza, tu nombre, tu foto y los últimos 4 dígitos de tu DNI se muestran a clientes con cuenta (no al público en internet). El número completo lo ve solo el equipo. Cada vez que un cliente abre esa hoja queda registrado y tú puedes ver ese registro. El uso es solo para comprobar tu identidad cuando se encuentren: copiarlo o publicarlo es una falta. Puedes retirar esta autorización pidiendo el cierre de tu cuenta.',
    conServidor: {
      title: 'Los clientes verán los últimos dígitos de mi DNI',
      summary: 'Autorizo que los clientes con cuenta vean mi nombre y los últimos dígitos de mi DNI, solo para comprobar mi identidad.',
      full: 'BORRADOR SIN REVISIÓN LEGAL. Para dar confianza, tu nombre y los últimos dígitos de tu DNI se muestran a clientes con cuenta (no al público en internet). El número completo se guarda en los servidores de Supabase, un proveedor externo, y lo ve solo el equipo; tú puedes corregirlo, pero no volver a leerlo en la app. El uso es solo para comprobar tu identidad cuando se encuentren: copiarlo o publicarlo es una falta. Puedes retirar esta autorización pidiendo el cierre de tu cuenta.',
    },
  },
  {
    id: 'registros',
    title: 'Autorizo consultas oficiales en la videollamada',
    summary: 'Autorizo que el equipo consulte REDAM, requisitorias y denuncias con mi DNI, en vivo, durante la videollamada.',
    full: `Autorizas a ${NOMBRE_APP} a consultar, con tu DNI y para este único fin, registros públicos gratuitos (REDAM, requisitorias de la PNP y seguimiento de denuncias del Ministerio Público). La consulta se hace en vivo, durante la videollamada contigo. En el piloto no te pedimos capturas ni documentos. La información se usa solo para decidir si puedes ser paseador.`,
  },
  {
    id: 'reglas',
    title: 'Cumpliré las reglas de cada paseo',
    summary: 'Máximo de perros, nunca mezclo tamaños, correa corta siempre, código de recojo y fotos obligatorias.',
    full: `Reglas que no se negocian: máximo ${MAX_PERROS_POR_PASEO} perros por paseo (${REGLA_NUEVO.maxPerros} mientras lleves la etiqueta «${REGLA_NUEVO.etiqueta}», hasta tus primeros ${REGLA_NUEVO.paseos} paseos), nunca mezclar tamaños, correa corta siempre y nunca soltar a un perro, no pasear razas potencialmente peligrosas, pedir el código de recojo al dueño, enviar las fotos obligatorias (jugando y tomando agua), recoger los desechos, no pedir más de lo acordado en la reserva, no dejar perros solos ni con terceros, no usar el celular de forma distraída y no estar bajo los efectos de alcohol o drogas. No publiques fotos de perros o clientes sin permiso.`,
  },
  {
    id: 'independiente',
    title: 'Soy trabajador independiente',
    summary: `Elijo mis horarios y mis paseos. ${NOMBRE_CORTO} cobra a la familia y me paga a mí; no es mi empleador.`,
    full: `Trabajas de forma independiente: tú eliges tus horarios y los paseos que aceptas. ${NOMBRE_APP} no es tu empleador ni te paga un sueldo. ${NOMBRE_CORTO} le cobra a la familia al terminar el paseo y la familia te muestra el pago: tú lo marcas como visto. Después ${NOMBRE_CORTO} confirma el pago en su cuenta y te paga a ti por Yape o Plin, descontando su comisión. ${textoComisionLegal()} El pago puede demorar porque lo hace el equipo a mano. Eres responsable de tus obligaciones tributarias, si te corresponden. Este texto es un borrador y todavía no lo revisó un abogado ni un contador.`,
  },
  {
    id: 'cobro',
    title: 'Registro dónde cobrar',
    summary: 'Guardo mi Yape o Plin y mi nombre de titular. Solo los ven el equipo y yo.',
    full: `Para pagarte, ${NOMBRE_CORTO} necesita el celular de tu Yape o Plin y el nombre del titular. Se guardan solo en tu teléfono; el equipo los ve en su panel para hacerte el pago. El dueño nunca los ve. Sin esto no puedes recibir solicitudes. Puedes cambiarlos en «Mi perfil» cuando quieras.`,
    conServidor: {
      full: `Para pagarte, ${NOMBRE_CORTO} necesita el celular de tu Yape o Plin y el nombre del titular. Se guardan en los servidores de Supabase, un proveedor externo; los ven solo tú y el equipo, para hacerte el pago. El dueño nunca los ve. Sin esto no puedes recibir solicitudes. Puedes cambiarlos en «Mi perfil» cuando quieras. BORRADOR SIN REVISIÓN LEGAL.`,
    },
  },
  {
    id: 'incidentes',
    title: 'Avisaré de inmediato cualquier incidente',
    summary: 'Si algo pasa, aviso al instante al equipo y al dueño, y colaboro en la revisión. Puedo ser suspendido mientras se investiga.',
    full: `Cualquier incidente (mordida, pérdida, caída, enfermedad, pelea, accidente) se avisa de inmediato al dueño y a ${NOMBRE_CORTO}, con fotos y datos, y se reporta con «Reportar problema». Colaborarás en la revisión. Si hay una queja grave, tu cuenta puede suspenderse mientras se investiga.`,
  },
  {
    id: 'supervision',
    title: 'Acepto que acompañen mi primer paseo',
    summary: `El equipo acompaña mi primer paseo. Hasta los ${REGLA_NUEVO.paseos} paseos llevo la etiqueta «${REGLA_NUEVO.etiqueta}».`,
    full: `El equipo acompaña tu primer paseo (es la comprobación ${COMPROBACIONES.length}). Hasta tus primeros ${REGLA_NUEVO.paseos} paseos llevas la etiqueta «${REGLA_NUEVO.etiqueta}» y máximo ${REGLA_NUEVO.maxPerros} perros. El equipo puede llamarte y revisar el chat y las fotos del paseo. Se espera una calificación mínima de 4,7; si baja, el equipo lo conversa contigo y puede suspender tu cuenta.`,
  },
]
