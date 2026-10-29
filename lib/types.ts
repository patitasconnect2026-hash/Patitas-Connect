export type District = 'San Isidro' | 'Jesús María'
/**
 * Con qué le paga la familia a Patitas: los medios de cobro del equipo (lib/config.ts `cobroEquipo`).
 * Patitas cobra, descuenta su comisión y le paga al paseador (lib/pagos.ts).
 */
export type PaymentMethod = 'yape' | 'plin' | 'cuenta'

/** Tamaño del perro. Nunca se mezclan tamaños distintos en un mismo grupo. */
export type Size = 'small' | 'medium' | 'large'
export type FurKey = 'dorado' | 'negro' | 'blanco' | 'cafe' | 'gris'

/** Parámetros del retrato ilustrado (se usa si el paseador no tiene `photo`). */
export interface Portrait {
  skin: string
  hair: string
  style: 'short' | 'long' | 'bun' | 'curly' | 'cap'
  shirt: string
  bg: [string, string]
  beard?: boolean
}

export interface Review {
  id: string
  author: string
  /** Vacío si la base no tiene el distrito de quien la escribió (no se inventa uno). */
  district: District | ''
  rating: number
  text: string
  when: string
  tags: string[]
  /** true si la escribió el usuario actual */
  mine?: boolean
  /** Paseador reseñado (solo en reseñas del usuario) */
  walkerId?: string
  /** Con servidor: el paseo del que es la reseña (una sola por paseo). */
  paseoId?: string
  /** Reseña inventada para la demostración: lleva la etiqueta «Ejemplo» (lib/ejemplos.ts) */
  esEjemplo?: boolean
}

export interface Walker {
  id: string
  name: string
  firstName: string
  district: District
  /** Vive o estudia en el distrito (sello "vecino") */
  neighbor: string
  pricePerHour: number
  rating: number
  walks: number
  /** Con servidor: cuántas reseñas tiene de verdad (la calificación solo se muestra con al menos una). */
  resenasN?: number
  /** Máximo de perros por paseo (2 o 3) */
  maxDogs: 2 | 3
  /** Tamaños de perro que acepta pasear */
  accepts: Size[]
  /** Ventanas de horario en las que pasea, en horas [inicio, fin) */
  windows: Array<[number, number]>
  /** Parques donde suele pasear */
  spots: string[]
  tagline: string
  bio: string
  experience: string
  responds: string
  extras: string[]
  /** Qué incluye su paseo (opcional, ayuda a elegir) */
  includes: string[]
  /** Su estilo de paseo (etiquetas) */
  style: string[]
  reviews: Review[]
  portrait: Portrait
  /** URL de una foto real. Si existe, reemplaza al retrato ilustrado. */
  photo?: string
  /** DNI de demostración (en producción se muestra con consentimiento y registro de accesos) */
  dni: string
  /** Código público de verificación, ej. PAT-7K3Q */
  code: string
  verifiedAt: string
  /** Lleva la etiqueta «Nuevo» (regla 2 de lib/verificacion.ts) */
  probation?: boolean
  /** «Disponible ahora» (el paseador lo enciende o apaga). Sin dato = disponible. */
  disponible?: boolean
  /** Comprobaciones marcadas (lib/verificacion.ts). Vacío = la app no afirma nada. */
  comprobaciones?: Array<'dni' | 'distrito' | 'celular' | 'consultas' | 'examen' | 'primerPaseo'>
  /** Paseador inventado para la demostración: lleva la etiqueta «Ejemplo» y se puede ocultar (lib/ejemplos.ts) */
  esEjemplo?: boolean
  /**
   * Viene de la base (`paseadores_publicos`), no de un guion: la calificación sale de sus reseñas de verdad (sin ninguna, no
   * hay calificación), sin respuesta inventada y sin ocupación simulada de sus horarios (lib/servidor/paseadoresReales.ts).
   */
  deServidor?: boolean
}

export interface Dog {
  id: string
  name: string
  /** Foto subida por el dueño (data URL reducida) */
  photo?: string
  breed: string
  ageYears: number
  sex: 'M' | 'F'
  size: Size
  weightKg?: number
  fur: FurKey
  /** Forma de la carita ilustrada si no hay foto */
  shape: 'floppy' | 'bat'
  temperament: string[]
  /** Puede ir en grupo con otros perros. Si es false, solo paseo individual. */
  sociable: boolean
  vaccinated: boolean
  sterilized: boolean
  /** Raza potencialmente peligrosa (Ley 27596): requiere licencia municipal y bozal */
  rpp: boolean
  notes: string
  medical: string
  vet: string
}

export interface Account {
  firstName: string
  lastName: string
  phone: string
  district: District
  street: string
  unit: string
  /**
   * Dónde queda la casa (latitud, longitud): el punto de recojo. Lo marca el dueño en el mapa y se guarda solo en
   * su teléfono; no se le muestra al paseador. Las cuentas anteriores no lo tienen: se les pide al reservar.
   */
  casa?: [number, number]
  /** Fecha de nacimiento (AAAA-MM-DD). Se exige ser mayor de 18 años. */
  birth: string
  /** Aceptó los términos y condiciones (versión y fecha) */
  termsVersion: string
  termsAt: string
  doorman: boolean
  doormanName: string
  source: string
  referral: string
  createdAt: string
}

export type Handoff = 'door' | 'doorman'
export type Plan = 'once' | 'weekdays'

export interface Booking {
  walker: Walker
  dog: Dog
  /** El parque o zona (de los que marcó el paseador) donde la familia pidió el paseo. */
  spotId?: string
  dayIdx: number
  dayLabel: string
  startHour: number
  /** Hora de inicio en minutos desde medianoche */
  startMin: number
  slotLabel: string
  durationMin: number
  plan: Plan
  handoff: Handoff
  notes: string
  /** Perros que ya estaban en el grupo (sin contar al tuyo) */
  groupDogs: number
  groupSize: Size
  /** El precio del paseo (lo que cuesta el paseo, antes de la comisión). */
  walkPrice: number
  discount: number
  /** Lo que PAGA la familia a Patitas (con la configuración de ese momento: `montoFamilia`). */
  total: number
  /** Lo que se queda Patitas. Reservas viejas no lo traen: se calcula con `desgloseDePago`. */
  comision?: number
  /** Lo que recibe el paseador. Reservas viejas no lo traen: se calcula con `desgloseDePago`. */
  neto?: number
}

export type EventKind =
  | 'start'
  | 'route'
  | 'cross'
  | 'pee'
  | 'water'
  | 'photo'
  | 'poop'
  | 'return'
  | 'arrived'
  | 'sos'

export interface TimelineEntry {
  id: string
  /** Progreso del paseo (0–1) en el que ocurrió */
  at: number
  time: string
  kind: EventKind
  text: string
}

export interface ChatMessage {
  id: string
  from: 'walker' | 'owner'
  at: number
  time: string
  text?: string
  /** Foto enviada por el paseador o el dueño en el chat (data URL reducida) */
  image?: string
}

export type Phase = 'active' | 'arrived' | 'completed'

export interface Walk {
  booking: Booking
  /** 0 = recién empezó, 1 = llegó a casa */
  progress: number
  phase: Phase
  sos: 'off' | 'on'
  typing: boolean
  rating: number
  extraMessages: ChatMessage[]
  extraEvents: TimelineEntry[]
  /** Id del encargo publicado en el "bus" para la app del paseador */
  jobId?: string
  /** Un paseador real (app del paseador) tomó el paseo: se oculta el guion simulado */
  live?: boolean
}
