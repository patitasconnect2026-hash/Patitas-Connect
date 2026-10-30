/**
 * Todas las claves del almacenamiento, en un solo sitio. Los valores NO cambian (los celulares de prueba
 * conservan sus datos): solo se juntan aquí. Las pantallas no escriben estas cadenas.
 */
export const CLAVES = {
  /** Cuenta del dueño, perros, reseñas, favoritos, contacto de emergencia. */
  cuenta: 'patitas:v2',
  /** Lo que se «dicen» el dueño y el paseador (demostración, mismo navegador). */
  chat: 'patitas:bus:chat',
  paseo: 'patitas:bus:job',
  /**
   * Con servidor: lo del paseo que se guarda en este teléfono y solo en él, por paseo: la memoria del motor de avisos de
   * ubicación (`vigilancia`) y el permiso de ubicación NUNCA suben. El inicio y el fin del paseo (`puntos`) también se
   * guardan aquí primero y de aquí salen solos a la base (paso 9), para que sin internet no se pierdan.
   */
  paseoLocal: 'patitas:bus:job-local',
  /** Con servidor: los paseos que la familia ya cerró en su pantalla (la base no los borra). Solo en este teléfono. */
  descartados: 'patitas:descartados',
  eventos: 'patitas:bus:events',
  presencia: 'patitas:bus:walker-presence',
  /** Quién abrió la hoja del DNI de cada paseador (la escribe el dueño, la lee el paseador). */
  vistasDni: 'patitas:bus:dni-views',
  /** Los recordatorios de reserva que ya se avisaron en este teléfono (solo local). */
  recordados: 'patitas:recordados',
  /** «Pedir paseo» sin servidor (modo local y demostración): el pedido de la familia, solo en este teléfono. Con servidor vive en la base. */
  pedido: 'patitas:pedido',
  /** Si la persona activó o silenció los avisos con sonido (solo en este teléfono). */
  avisos: 'patitas:avisos',
  /**
   * Cola de reportes y entregas sin confirmar para el equipo (/admin). Con servidor viven en la tabla `casos` (paso 7b): la
   * familia y el paseador ven los de su paseo y el equipo todos.
   */
  casos: 'patitas:bus:casos',
  /**
   * El libro de pagos (lib/pagos.ts): un pago por paseo, con su estado y los montos. Lo escribe la app del dueño al
   * reservar y el equipo en /admin al verificar y pagar. Vive aparte del encargo: el equipo tiene que poder verlo y
   * pagarlo aunque el dueño ya haya pedido otro paseo.
   */
  pagos: 'patitas:bus:pagos',
  /**
   * Con servidor: dónde cobra cada paseador (Yape o Plin), por id. El paseador ve solo el suyo y el equipo los de sus pagos;
   * la familia no recibe nada. Se guarda en `cobros_paseador`. Sin servidor no se usa (el cobro vive en la postulación).
   */
  cobros: 'patitas:bus:cobros',
  /** Postulación del paseador y su día a día. */
  /** Los datos de las fotos del paseo (hora, lugar, código). Los bytes están en IndexedDB (lib/datos/fotos.ts). */
  fotos: 'patitas:bus:fotos',
  /**
   * Con servidor: las fotos que trae la base (las de mis paseos y la foto de hoy de mi paseador), SIN los bytes: se ven con
   * un enlace que vence. Solo se lee; las que toma este teléfono viajan solas (`lib/servidor/remotoPaseos.ts`).
   */
  fotosServidor: 'patitas:bus:fotos-servidor',
  /**
   * Con servidor: las reseñas que escribió esta familia (una por paseo), en la tabla `resenas` (parte 3b). Sin servidor las
   * reseñas viven en la cuenta (`CLAVES.cuenta`), como siempre.
   */
  resenas: 'patitas:bus:resenas',
  /** «Mostrar ejemplos»: true o false si la persona eligió; si no existe, manda el valor por defecto de su cuenta. */
  ejemplos: 'patitas:ejemplos',
  postulacion: 'patitas:walker:v1',
  demo: 'patitas:walker:demo',
  /** Calificaciones por barras (paseador, perro y familia) y el puntaje del 1 al 10. Solo en este teléfono por ahora. */
  calificaciones: 'patitas:v1:calificaciones-detalladas',
  /** Qué avisos apagó la persona (los de seguridad no se apagan). Solo en este teléfono. */
  avisosPreferencias: 'patitas:v1:avisos-preferencias',
  /** Cursos de la academia que el paseador marcó como hechos (simulado). */
  academia: 'patitas:v1:academia-hecha',
} as const

/**
 * Con `NEXT_PUBLIC_DATOS=servidor`, las ÚNICAS claves que viajan al servidor (con la sesión de cada persona): los paseos,
 * su bitácora y el chat (pasos 6a y 6b), los pagos y dónde cobra el paseador (paso 7), los casos y disputas (paso 7b) y las
 * reseñas de la familia (parte 3b). Los
 * pagos solo se LEEN por aquí: se mueven por `mover_pago`. Las fotos (paso 8) también: `fotosServidor` solo se lee; las
 * fotos de ESTE teléfono viven en `CLAVES.fotos` (local, con sus bytes en IndexedDB) y se envían solas. El inicio y el fin
 * del paseo (paso 9) salen de `CLAVES.paseoLocal`. La postulación del paseador (paso 7b) NO pasa por aquí: sigue en su
 * teléfono (por cuenta) y sale sola a la base con `lib/servidor/postulaciones.ts`. Todo lo demás (cuenta de la familia…)
 * sigue en el teléfono.
 */
export const CLAVES_DEL_SERVIDOR: readonly string[] = [CLAVES.paseo, CLAVES.eventos, CLAVES.chat, CLAVES.pagos, CLAVES.cobros, CLAVES.fotosServidor, CLAVES.casos, CLAVES.resenas]

export type Clave = (typeof CLAVES)[keyof typeof CLAVES]
