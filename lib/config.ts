/**
 * Ajustes del piloto. Se cambian aquí, a mano. Nada de esto cuesta dinero.
 * Las pantallas y los cálculos leen estos valores: no escribas "S/ 25", "20 %" ni "24/7"
 * directo en un texto o en una cuenta. Hay pruebas (lib/dinero.test.ts) que fallan si pasa.
 */
import { esCelularPeru, normalizarTelefono } from './telefono'
import type { PaymentMethod, Plan } from './types'

/**
 * Nombre de la app, tal como se escribe en cualquier texto visible. El logo usa "Patitas" en serif y
 * "conectadas" en cursiva (componente Logo). No se renombran carpeta, paquete, skills ni claves de localStorage.
 */
export const NOMBRE_APP = 'Patitas Conectadas'

/** El nombre corto: ícono del celular y frases como «Contacto de Patitas». Es la primera palabra del nombre. */
export const NOMBRE_CORTO = 'Patitas'

/** Las dos partes del logo: «Patitas» (serif) y «conectadas» (cursiva). Si el nombre tuviera una sola palabra, la cursiva queda vacía. */
export function partesNombre(nombre: string = NOMBRE_APP): [string, string] {
  const [primera, ...resto] = nombre.trim().split(/\s+/)
  return [primera ?? '', resto.join(' ').toLowerCase()]
}

export type ModoComision = 'del_precio' | 'sobre_el_precio'

/* ------------------------------------------------------------------ */
/* Pago intermediado (manual): la familia le paga a Patitas, Patitas    */
/* descuenta su comisión y le paga al paseador. La app NO mueve dinero: */
/* el equipo verifica cada pago y paga a mano (lib/pagos.ts, /admin).   */
/* No hay tarjeta, número ni CVV en ninguna pantalla.                    */
/* ------------------------------------------------------------------ */

export type MetodoPago = PaymentMethod

/** Los medios con los que el equipo recibe el pago. Los datos de cada uno (número, cuenta) están en `cobroEquipo`. */
export const METODOS_COBRO: ReadonlyArray<{ id: MetodoPago; nombre: string }> = [
  { id: 'yape', nombre: 'Yape' },
  { id: 'plin', nombre: 'Plin' },
  { id: 'cuenta', nombre: 'Transferencia' },
]

/** Los medios en que un PASEADOR puede registrar dónde cobrar (el equipo le paga ahí). */
export const METODOS_COBRO_PASEADOR: ReadonlyArray<{ id: 'yape' | 'plin'; nombre: string }> = [
  { id: 'yape', nombre: 'Yape' },
  { id: 'plin', nombre: 'Plin' },
]

/** Textos del pago. Una sola redacción de la frase de honestidad para toda la app. */
export const TEXTOS_PAGO = {
  honestidad: `Pagas al terminar el paseo. ${NOMBRE_CORTO} le paga al paseador.`,
  /** La misma frase, vista desde el paseador: antes de pagarle, el equipo confirma el pago en su cuenta. */
  honestidadPaseador: `${NOMBRE_CORTO} te paga después de confirmar el pago en su cuenta.`,
  boton: 'Enviar solicitud',
  /** Cuando el equipo todavía no llenó sus datos de cobro. */
  faltaCobro: 'Falta configurar el medio de cobro.',
} as const

/** El nombre de un método. Un valor viejo o desconocido (por ejemplo «card» o «efectivo») se lee como Transferencia. */
export function nombreMetodoPago(id: string) {
  return METODOS_COBRO.find((m) => m.id === id)?.nombre ?? 'Transferencia'
}

export interface CobroEquipo {
  /** Nombre del titular de las cuentas del equipo, como sale en Yape, Plin o el banco. */
  titular: string
  /** Celular del equipo en Yape (se acepta como lo escribe la gente: «987 654 321»). */
  yape: string
  /** Celular del equipo en Plin. */
  plin: string
  /** Cuenta o CCI para una transferencia (texto tal como lo da el banco). */
  cuenta: string
  /** Ruta de una imagen con el QR del equipo, dentro de `public/` (por ejemplo «/qr-yape.png»). Vacío = sin QR. */
  qr: string
}

/** Un medio de cobro del equipo ya listo para mostrar. */
export interface MedioDeCobro {
  id: MetodoPago
  nombre: string
  /** Lo que se escribe en pantalla: el celular como lo puso el equipo, o la cuenta. */
  dato: string
}

/**
 * Los medios del equipo que SÍ están configurados (y sirven): Yape y Plin deben ser un celular de Perú; la cuenta,
 * al menos 8 caracteres. Vacíos o mal escritos no salen: nada se inventa ni queda mudo (la pantalla dice «Falta configurar»).
 */
export function mediosDeCobro(c: Pick<Config, 'cobroEquipo'> = CONFIG): MedioDeCobro[] {
  const x = c.cobroEquipo
  const lista: MedioDeCobro[] = []
  if (esCelularPeru(x.yape)) lista.push({ id: 'yape', nombre: 'Yape', dato: x.yape.trim() })
  if (esCelularPeru(x.plin)) lista.push({ id: 'plin', nombre: 'Plin', dato: x.plin.trim() })
  if (x.cuenta.trim().length >= 8) lista.push({ id: 'cuenta', nombre: 'Transferencia', dato: x.cuenta.trim() })
  return lista
}

/** ¿El equipo ya puede recibir pagos? Hace falta al menos un medio que sirva. */
export function cobroConfigurado(c: Pick<Config, 'cobroEquipo'> = CONFIG): boolean {
  return mediosDeCobro(c).length > 0
}

export interface ContactoAyuda {
  /** Cómo se le dice a la persona o al servicio. Ej.: nombre de la persona o del servicio. */
  nombre: string
  /** Celular ("987 654 321") o fijo de Lima ("(01) 319 0000"); se acepta como lo escribe la gente. Sirve para llamar (tel:). */
  telefono: string
  /** Opcional. Mismo formato. Si falta, se usa el teléfono para WhatsApp (wa.me). */
  whatsapp?: string
}

/** Teléfono y WhatsApp de un servicio. Vacío = falta configurarlo. Un fijo sirve para llamar; el WhatsApp debe ser un celular. */
export interface ContactoServicio {
  telefono: string
  whatsapp: string
}

/** Una persona del equipo. El rol sale de docs/CONTEXTO.md; el nombre solo se escribe con permiso de la persona. */
export interface IntegranteEquipo {
  /** Qué hace en el proyecto. */
  rol: string
  /** Nombre real, SOLO con permiso de la persona. Vacío = «Quiénes somos» dice «Falta configurar». */
  nombre: string
}

export interface Config {
  // ---- DINERO. PROVISIONAL: se ajusta con los resultados de las encuestas ----
  /**
   * Porcentaje que se queda Patitas de cada paseo (en porcentaje: 20 = el 20 %, es decir 0,20). Decisión del equipo.
   * 0 = Patitas no cobra comisión.
   */
  comision: number
  /**
   * Sobre qué se cobra la comisión. `del_precio` (por defecto): la familia paga el precio del paseador y Patitas se
   * queda el porcentaje de ESE precio; el paseador recibe el resto. `sobre_el_precio`: la familia paga el precio MÁS la
   * comisión y el paseador recibe el precio completo. Cambiarlo es cambiar esta línea.
   */
  comisionModo: ModoComision
  /**
   * Cómo cobra el equipo (titular, Yape, Plin, cuenta y QR). NO se inventan: el equipo los llena a mano. Vacío = la
   * reserva dice «Falta configurar el medio de cobro» y nadie puede pagar.
   */
  cobroEquipo: CobroEquipo
  /** Tarifa libre del paseador, en soles por hora. */
  tarifaMinima: number
  tarifaMaxima: number
  /** Tarifa con la que arranca un paseador nuevo al armar su perfil (soles por hora). */
  tarifaSugerida: number
  /** Cuántos paseadores se muestran de una vez en la lista; «Ver más» trae otra tanda igual. */
  paseadoresPorTanda: number
  /** Recordatorios de una reserva aceptada: cuántos minutos ANTES del paseo avisar (a la familia y al paseador). Agrega otros aquí. */
  recordatoriosReservaMin: number[]
  /** Cada cuántos segundos la app abierta mira si toca un recordatorio. */
  segundosEntreRecordatorios: number
  // ---- «PEDIR PASEO» (Bloque 2) ----
  /** Cuánto dura un pedido abierto antes de vencer solo (minutos). */
  minutosVidaPedido: number
  /** El pedido le llega a los paseadores de su distrito que pasean en parques a esta distancia de la casa (metros). */
  radioPedidoMetros: number
  /** Cada cuántos segundos la app abierta pregunta por pedidos y ofertas nuevos. */
  segundosEntreConsultas: number
  // ---- MAPA Y BÚSQUEDA DE DIRECCIÓN (Bloque 4) ----
  /** Buscador de direcciones gratis de OpenStreetMap (Nominatim). Solo se llama al apretar «Buscar». */
  nominatimUrl: string
  /** Su política pide máximo 1 pedido por segundo. */
  nominatimSegundosEntreBusquedas: number
  nominatimMaxResultados: number
  /** Correo de contacto del equipo para identificar la app ante Nominatim (opcional; vacío = no se envía). */
  nominatimCorreo: string
  /** Antes de ser elegido, el paseador ve un círculo de este radio (metros) y no el punto exacto. */
  radioZonaAproximadaMetros: number
  // ---- IA DE APOYO EN /admin (Bloque 7) ----
  /**
   * El botón «Resumen de apoyo con IA» de /admin. APAGADO por defecto: no se enciende hasta que (1) exista la clave en los
   * secretos de Supabase (docs/PUBLICAR.md) y (2) la abogada revise el aviso de privacidad para el paseador (`iaAvisoRevisado`).
   * La clave NUNCA va aquí ni en el código. La IA solo ayuda: nunca dice «apto» ni «no apto» y decide una persona.
   */
  iaApoyoActivada: boolean
  /** ¿La abogada ya revisó el aviso de privacidad de la IA para el paseador (docs/AVISO-IA-PASEADOR-BORRADOR.md, paso 10)? Sin esto no se enciende. */
  iaAvisoRevisado: boolean
  // ---- UBICACIÓN: FOTOS SOSPECHOSAS Y SEGUIMIENTO EN VIVO (Bloque 6) ----
  /** Una foto con una lectura de ubicación con más error que esto (metros) queda marcada «sospechosa» (solo la ve el equipo). */
  sospechaPrecisionMetros: number
  /** Una foto a más de esta distancia (metros) de la casa del paseo queda marcada. */
  sospechaRadioMetros: number
  /** Dos fotos que implican ir más rápido que esto (km/h) quedan marcadas: un salto imposible para un paseo a pie. */
  sospechaVelocidadKmh: number
  /** Cada cuántos segundos el paseador publica su ubicación y la familia la mira (solo con la app abierta). */
  segundosEnVivo: number
  // ---- RESPUESTAS ESCRITAS DEL EXAMEN (Bloque 5) ----
  /** Largo mínimo y máximo (en letras) de cada respuesta escrita. La migración `respuestas_escritas` copia estos dos números (una prueba los compara). */
  respuestaMinima: number
  respuestaMaxima: number
  /** Recargo del paseo individual (perro que va solo), en %. Se suma a la tarifa del grupo. */
  recargoIndividualPct: number
  /** Descuento de bienvenida en soles (código de invitación o afiche). 0 = apagado. */
  descuentoBienvenida: number
  /** Descuento del plan lunes a viernes, en %. 0 = apagado. */
  descuentoLunesViernesPct: number
  /** Porcentaje del paseo que se paga si se cancela tarde (después de 2 horas antes). Solo se menciona en el texto legal. */
  cancelacionTardiaPct: number
  /** Precios de referencia del mercado que se le muestran al paseador al poner su tarifa. */
  referenciaMercado: {
    sanIsidro: { min: number; max: number }
    jesusMaria: { min: number; max: number }
    fuente: string
  }

  // ---- OTROS AJUSTES ----
  /** Si el dueño no confirma la entrega en estos minutos, la app le recuerda y la entrega queda «sin confirmar». */
  minutosRecordatorio: number
  /** Minutos que tiene el paseador para aceptar o rechazar una solicitud. Pasados, la solicitud vence. */
  minutosParaAceptar: number
  /** Horas antes del paseo hasta las que se cancela sin que cuente como «tardía». */
  horasCancelacionGratis: number
  /** El paseador también escribe el código de recojo al entregar al perro (doble confirmación). */
  entregaPideCodigo: boolean
  /**
   * Horas que tiene la familia para pagar después de que termina el paseo. Pasadas, se le recuerda con suavidad.
   * Mientras haya un pago pendiente no se puede reservar otro paseo (con o sin plazo vencido).
   */
  horasParaPagar: number
  /**
   * ¿Una persona con formación (veterinaria) ya revisó el contenido del mini curso (lib/quiz.ts)? Mientras sea false es un
   * BORRADOR. NO bloquea al paseador (decisión de la usuaria): es un recordatorio SOLO para el equipo (se ve en /admin y en
   * docs/AVANCE.md). Solo el equipo lo cambia.
   */
  cursoRevisado: boolean

  // ---- ZONA Y AVISOS DEL PASEO (Bloque 3). PROVISIONALES: se ajustan con las pruebas en la calle ----
  /** Margen (en metros) alrededor de San Isidro y Jesús María que todavía se acepta: ni «dentro» ni «fuera», «borde». */
  zonaBufferMetros: number
  /** Una lectura de ubicación con una precisión peor que esto (en metros) se ignora. */
  precisionMaximaMetros: number
  /** Aviso suave cuando el paseo se acerca al borde de la zona a menos de estos metros. */
  avisoBordeMetros: number
  /** Cuántas lecturas buenas SEGUIDAS «fuera» hacen falta para el aviso de salida. */
  lecturasFueraParaAlerta: number
  /** Más rápido que esto (km/h) no es una caminata: ese salto de posición se descarta. */
  velocidadMaximaKmh: number
  /** Minutos sin moverse para avisar. */
  minutosQuietoParaAviso: number
  /** «Sin moverse» = dentro de este radio (metros), para no confundir el ruido normal del GPS con un paseo. */
  radioQuietoMetros: number
  /**
   * Los avisos de zona son solo una AYUDA mientras la pantalla está encendida: cada cuántos segundos se toma en cuenta una
   * lectura de la ubicación real del paseador (el teléfono manda más seguido). Con la pantalla apagada la web no sigue la
   * ubicación: el seguimiento oficial es por puntos de control con foto.
   */
  segundosEntreLecturas: number
  // ---- PUNTOS DE CONTROL (Bloque 6). PROVISIONALES ----
  /**
   * La ubicación se registra al empezar, al terminar y en cada foto. Cada tantos minutos sin foto de control, la app le
   * hace un recordatorio suave al paseador (solo se ve con la pantalla encendida).
   */
  minutosPuntoControl: number
  /** Una ubicación de punto de control con más error que esto (metros) se anota como «sin lectura buena». */
  precisionPuntoControlMetros: number
  // ---- FOTOS DEL PASEO (Bloque 4). PROVISIONALES: se ajustan con los primeros paseos ----
  /** Cuántas fotos como máximo por paseo (el teléfono tiene poco espacio). */
  maxFotosPorPaseo: number
  /** La foto se reduce a este lado mayor (en píxeles) antes de guardarla. */
  ladoMaximoFotoPx: number
  /** Calidad del JPEG (0 a 1). */
  calidadFoto: number
  /** Si una foto pesa más que esto (en KB) se vuelve a comprimir más. */
  pesoMaximoFotoKB: number
  /** Una ubicación más vieja que esto (minutos) se dice con su antigüedad. */
  minutosUbicacionVieja: number
  /** «Cerca de [parque]» solo si el parque queda a menos de esto (metros). */
  metrosCercaDeParque: number
  /**
   * El equipo, para «Quiénes somos». Los roles vienen de docs/CONTEXTO.md. Los nombres NO se inventan: cada persona
   * da su permiso y el equipo los escribe aquí. Vacío = la pantalla dice «Falta configurar».
   */
  equipo: IntegranteEquipo[]
  /** Contactos de ayuda. Los llena el equipo a mano. Vacío = la pantalla de ayuda avisa que falta configurarlo. */
  contactosAyuda: ContactoAyuda[]
  /** Horario real en que alguien contesta. Ej.: "Lun a vie, 8:00 a 20:00". Vacío = no se muestra ningún horario. */
  horarioAyuda: string
  /**
   * Serenazgo de cada municipalidad. NO se inventan: el equipo copia el número de la página oficial de la
   * municipalidad y lo confirma llamando. Vacío = el SOS dice «Falta configurar».
   */
  serenazgo: { sanIsidro: ContactoServicio; jesusMaria: ContactoServicio }
  /**
   * Números nacionales de emergencia. Revisados el 10 de octubre de 2026 en páginas oficiales del Estado (gob.pe):
   *  - 105 Policía Nacional y 116 Bomberos: https://www.gob.pe/institucion/pnp/contacto-y-numeros-de-emergencias
   *  - 106 SAMU (urgencias médicas, gratuita): https://www.gob.pe/1013-solicitar-atencion-medica-en-caso-de-emergencia-samu
   * OJO: gob.pe bloquea la descarga automática; se confirmaron por lo que citan esas páginas en el buscador y por otros
   * sitios del Estado. Una persona del equipo debe abrir los enlaces y comprobar que siguen igual (ver docs/AVANCE.md).
   * Vacío = no se muestra.
   */
  emergenciasNacionales: { policia: string; bomberos: string; samu: string }
}

export const CONFIG: Config = {
  // PROVISIONAL: se ajusta con los resultados de las encuestas
  comision: 20,
  // Decisión del equipo: Patitas cobra, se queda el 20 % y le paga al paseador (ver docs/CONTEXTO.md).
  comisionModo: 'del_precio',
  // El equipo llena estos datos a mano. NO se inventan números de cuenta, Yape ni Plin.
  cobroEquipo: { titular: '', yape: '', plin: '', cuenta: '', qr: '' },
  tarifaMinima: 16,
  tarifaMaxima: 34,
  tarifaSugerida: 25,
  recargoIndividualPct: 40,
  // PROVISIONAL: se ajusta con los resultados de las encuestas.
  // Apagados en el piloto: nadie financia hoy la diferencia (Patitas cobra el precio y paga al paseador).
  // El prototipo traía S/ 10 de bienvenida y 10 % de lunes a viernes.
  descuentoBienvenida: 0,
  descuentoLunesViernesPct: 0,
  // PROVISIONAL: se ajusta con los resultados de las encuestas
  cancelacionTardiaPct: 50,
  referenciaMercado: {
    sanIsidro: { min: 22, max: 34 },
    jesusMaria: { min: 16, max: 28 },
    fuente: 'Paseadores.pe 2026 (referencia)',
  },

  minutosRecordatorio: 15,
  // PROVISIONAL: 2 horas para que el paseador conteste.
  minutosParaAceptar: 120,
  horasCancelacionGratis: 2,
  entregaPideCodigo: true,
  horasParaPagar: 24,
  cursoRevisado: false,
  zonaBufferMetros: 300,
  precisionMaximaMetros: 50,
  avisoBordeMetros: 100,
  lecturasFueraParaAlerta: 2,
  velocidadMaximaKmh: 15,
  minutosQuietoParaAviso: 10,
  radioQuietoMetros: 25,
  segundosEntreLecturas: 45,
  paseadoresPorTanda: 6,
  recordatoriosReservaMin: [60],
  segundosEntreRecordatorios: 30,
  minutosVidaPedido: 15,
  radioPedidoMetros: 1500,
  segundosEntreConsultas: 5,
  nominatimUrl: 'https://nominatim.openstreetmap.org/search',
  nominatimSegundosEntreBusquedas: 1,
  nominatimMaxResultados: 5,
  nominatimCorreo: '',
  radioZonaAproximadaMetros: 300,
  iaApoyoActivada: false,
  iaAvisoRevisado: false,
  sospechaPrecisionMetros: 60,
  sospechaRadioMetros: 500,
  sospechaVelocidadKmh: 25,
  segundosEnVivo: 10,
  respuestaMinima: 40,
  respuestaMaxima: 600,
  minutosPuntoControl: 10,
  precisionPuntoControlMetros: 100,
  maxFotosPorPaseo: 12,
  ladoMaximoFotoPx: 800,
  calidadFoto: 0.7,
  pesoMaximoFotoKB: 160,
  minutosUbicacionVieja: 3,
  metrosCercaDeParque: 300,
  equipo: [
    { rol: 'La web y la lógica', nombre: '' },
    { rol: 'El diseño y la marca', nombre: '' },
    { rol: 'El marketing y las encuestas', nombre: '' },
  ],
  contactosAyuda: [],
  horarioAyuda: '',
  serenazgo: {
    sanIsidro: { telefono: '', whatsapp: '' },
    jesusMaria: { telefono: '', whatsapp: '' },
  },
  emergenciasNacionales: { policia: '105', bomberos: '116', samu: '106' },
}

/* ------------------------------------------------------------------ */
/* Precios: todas las cuentas de dinero pasan por aquí                  */
/* ------------------------------------------------------------------ */

/** Redondea a 0,50 soles, como se cobra en la calle. */
function aMediosSoles(n: number) {
  return Math.round(n * 2) / 2
}

/** "20" → "20", "7.5" → "7,5" (coma decimal, como se escribe en Perú). */
function porcentaje(n: number) {
  return String(n).replace('.', ',')
}

/** Precio de un paseo de `minutos` a la tarifa por hora del paseador. `individual` = el perro va solo. */
export function precioPaseo(tarifaHora: number, minutos: number, individual: boolean, c: Config = CONFIG) {
  const recargo = individual ? 1 + c.recargoIndividualPct / 100 : 1
  return aMediosSoles(((tarifaHora * minutos) / 60) * recargo)
}

/** Descuento del plan sobre el precio de un paseo. 0 si el plan es "solo esta vez" o si está apagado. */
export function descuentoPlan(precio: number, plan: Plan, c: Config = CONFIG) {
  if (plan !== 'weekdays') return 0
  return aMediosSoles(precio * (c.descuentoLunesViernesPct / 100))
}

const aCentimos = (n: number) => Math.round(n * 100) / 100

/**
 * Lo que recibe el paseador de un paseo de `precio` soles. En `del_precio` (por defecto) es el precio menos la comisión;
 * en `sobre_el_precio` el paseador recibe el precio completo (la familia paga la comisión encima).
 */
export function pagoPaseador(precio: number, comision: number = CONFIG.comision, modo: ModoComision = CONFIG.comisionModo) {
  return modo === 'sobre_el_precio' ? aCentimos(precio) : aCentimos(precio * (1 - comision / 100))
}

/** Lo que PAGA la familia por un paseo de `precio` soles: el precio, o el precio más la comisión (`sobre_el_precio`). */
export function montoFamilia(precio: number, comision: number = CONFIG.comision, modo: ModoComision = CONFIG.comisionModo) {
  return modo === 'sobre_el_precio' ? aCentimos(precio * (1 + comision / 100)) : aCentimos(precio)
}

/** Lo que se queda Patitas de un paseo de `precio` soles: lo que paga la familia menos lo que recibe el paseador. */
export function comisionPatitas(precio: number, comision: number = CONFIG.comision, modo: ModoComision = CONFIG.comisionModo) {
  return aCentimos(montoFamilia(precio, comision, modo) - pagoPaseador(precio, comision, modo))
}

/**
 * El desglose de un pago: lo que paga la familia, la comisión y lo que recibe el paseador. Las reservas viejas no
 * traen la comisión ni el neto: se calculan con la configuración de hoy. Los tres números siempre suman.
 */
export function desgloseDePago(b: { walkPrice: number; discount: number; total: number; comision?: number; neto?: number }): {
  monto: number
  comision: number
  neto: number
} {
  if (b.comision !== undefined && b.neto !== undefined) return { monto: b.total, comision: b.comision, neto: b.neto }
  const base = Math.max(b.walkPrice - b.discount, 0)
  return { monto: montoFamilia(base), comision: comisionPatitas(base), neto: pagoPaseador(base) }
}

/* ------------------------------------------------------------------ */
/* Textos que dependen de los valores                                   */
/* ------------------------------------------------------------------ */

/** Frase que se muestra donde se habla de la comisión. Lee el valor de CONFIG. */
export function textoComision(comision: number = CONFIG.comision, modo: ModoComision = CONFIG.comisionModo) {
  if (comision <= 0) return `Durante el piloto ${NOMBRE_CORTO} no cobra comisión.`
  if (modo === 'sobre_el_precio') return `${NOMBRE_CORTO} cobra a la familia un ${porcentaje(comision)} % más de comisión.`
  return `${NOMBRE_CORTO} cobra una comisión del ${porcentaje(comision)} % de cada paseo.`
}

/** Aviso del paseo individual. */
export function textoRecargoIndividual(c: Config = CONFIG) {
  return `+${porcentaje(c.recargoIndividualPct)} % sobre la tarifa del grupo`
}

/** Texto del plan lunes a viernes: con descuento o, si está apagado, solo la ventaja de la rutina. */
export function textoPlanLunesViernes(c: Config = CONFIG) {
  if (c.descuentoLunesViernesPct > 0) return `−${porcentaje(c.descuentoLunesViernesPct)} % cada paseo`
  return 'Misma hora, todos los días hábiles'
}

/** Frase larga para la lista de novedades. */
export function textoPlanLargo(c: Config = CONFIG) {
  if (c.descuentoLunesViernesPct > 0) {
    return `Misma hora todos los días hábiles, con ${porcentaje(c.descuentoLunesViernesPct)} % de descuento y tu paseador de siempre.`
  }
  return 'Misma hora todos los días hábiles y tu paseador de siempre.'
}

/** "Ayuda" o "Ayuda · Lun a vie, 8:00 a 20:00". Sin horario configurado, solo la base. */
export function etiquetaAyuda(base: string, horario: string = CONFIG.horarioAyuda) {
  const h = horario.trim()
  return h ? `${base} · ${h}` : base
}

/** Primer contacto de ayuda con un teléfono que sirve, o undefined si el equipo aún no lo configuró bien. */
export function contactoPrincipal(contactos: ContactoAyuda[] = CONFIG.contactosAyuda) {
  return contactos.find((c) => normalizarTelefono(c.telefono) !== null)
}
