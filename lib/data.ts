import type { Account, Booking, Dog, FurKey, Handoff, Plan, Review, Size, Walker } from './types'
import { CONFIG, comisionPatitas, descuentoPlan, montoFamilia, pagoPaseador, precioPaseo } from './config'
import { HOME_POINT } from './geo'
import { hourLabel, dayInfo } from './schedule'
import { COMPROBACIONES } from './verificacion'


export const DURATIONS = [30, 60, 90]

export const SOURCES = ['Afiche en mi edificio', 'Mi portero', 'Instagram o TikTok', 'Un vecino', 'Mi veterinaria', 'Otro']

export const TEMPERAMENTS = [
  'Sociable con perros',
  'Sociable con personas',
  'Tímido',
  'Jala la correa',
  'Se asusta con ruidos',
  'Le encanta la pelota',
  'Come todo del suelo',
  'Ladra mucho',
]

export const FURS: Record<FurKey, { label: string; fur: string; ear: string; muzzle: string }> = {
  dorado: { label: 'Dorado', fur: '#f4b04a', ear: '#b45309', muzzle: '#fde7b8' },
  negro: { label: 'Negro', fur: '#3a3f4b', ear: '#1d222c', muzzle: '#8d929d' },
  blanco: { label: 'Blanco', fur: '#f6f3ee', ear: '#d6cfc2', muzzle: '#ffffff' },
  cafe: { label: 'Café', fur: '#9a6a43', ear: '#6b4425', muzzle: '#dcbd9f' },
  gris: { label: 'Gris', fur: '#9aa3ae', ear: '#6b7480', muzzle: '#d9dee4' },
}

export const BREEDS: Array<{ name: string; size: Size; shape: Dog['shape']; rpp?: boolean }> = [
  { name: 'Golden Retriever', size: 'large', shape: 'floppy' },
  { name: 'Labrador', size: 'large', shape: 'floppy' },
  { name: 'Pastor Alemán', size: 'large', shape: 'floppy' },
  { name: 'Husky Siberiano', size: 'large', shape: 'floppy' },
  { name: 'Border Collie', size: 'medium', shape: 'floppy' },
  { name: 'Cocker Spaniel', size: 'medium', shape: 'floppy' },
  { name: 'Beagle', size: 'medium', shape: 'floppy' },
  { name: 'Schnauzer', size: 'small', shape: 'floppy' },
  { name: 'Poodle', size: 'small', shape: 'floppy' },
  { name: 'Shih Tzu', size: 'small', shape: 'floppy' },
  { name: 'Bulldog Francés', size: 'small', shape: 'bat' },
  { name: 'Pug', size: 'small', shape: 'bat' },
  { name: 'Mestizo', size: 'medium', shape: 'floppy' },
  { name: 'Pitbull / Rottweiler / Dóberman', size: 'large', shape: 'floppy', rpp: true },
]

export function newDog(partial: Partial<Dog> = {}): Dog {
  return {
    id: `dog-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    breed: 'Mestizo',
    ageYears: 3,
    sex: 'M',
    size: 'medium',
    fur: 'dorado',
    shape: 'floppy',
    temperament: [],
    sociable: true,
    vaccinated: true,
    sterilized: false,
    rpp: false,
    notes: '',
    medical: '',
    vet: '',
    ...partial,
  }
}

export const DEMO_ACCOUNT: Account = {
  firstName: 'Valeria',
  lastName: 'Rojas',
  phone: '987 654 321',
  district: 'San Isidro',
  street: 'Calle Lizardo Alzamora',
  unit: 'Dpto. 502',
  casa: HOME_POINT,
  birth: '1994-03-12',
  termsVersion: '2026-10-v1',
  termsAt: '2026-07-14',
  doorman: true,
  doormanName: 'Don Luis',
  source: 'Afiche en mi edificio',
  referral: '',
  createdAt: '2026-07-14',
}

/** ¿Es la cuenta de demostración («usar cuenta de demostración»)? Solo ahí se ofrecen las pruebas de los avisos. */
export function esCuentaDeEjemplo(a: Account | null): boolean {
  return !!a && a.firstName === DEMO_ACCOUNT.firstName && a.phone === DEMO_ACCOUNT.phone && a.createdAt === DEMO_ACCOUNT.createdAt
}

export const DEMO_DOGS: Dog[] = [
  newDog({
    id: 'max',
    name: 'Max',
    breed: 'Golden Retriever',
    ageYears: 3,
    sex: 'M',
    size: 'large',
    weightKg: 30,
    fur: 'dorado',
    temperament: ['Sociable con perros', 'Sociable con personas', 'Le encanta la pelota'],
    sterilized: true,
    notes: 'Se emociona al ver otros perros. Premios solo si tú se lo permites. Comando "quieto" funciona bien.',
    medical: 'Alergia leve al pollo.',
    vet: 'Clínica Veterinaria San Isidro',
  }),
  newDog({
    id: 'luna',
    name: 'Luna',
    breed: 'Bulldog Francés',
    ageYears: 2,
    sex: 'F',
    size: 'small',
    weightKg: 9,
    fur: 'gris',
    shape: 'bat',
    temperament: ['Tímido', 'Sociable con personas'],
    notes: 'No camina más de 30 minutos seguidos con calor: necesita agua y sombra.',
    vet: 'Clínica Veterinaria San Isidro',
  }),
]

/* ---------- Reseñas de ejemplo ---------- */

let rid = 0
function rv(
  author: string,
  district: Review['district'],
  rating: number,
  text: string,
  when: string,
  tags: string[],
): Review {
  return { id: `r${++rid}`, author, district, rating, text, when, tags, esEjemplo: true }
}

export const REVIEW_TAGS = [
  'Puntual',
  'Mandó fotos',
  'Cariñoso con mi perro',
  'Buena comunicación',
  'Cuidó el tamaño del grupo',
  'Dejó todo limpio',
]

const WALKERS_BASE: Walker[] = [
  {
    id: 'carlos',
    name: 'Carlos M.',
    firstName: 'Carlos',
    district: 'Jesús María',
    neighbor: 'Vive en Jesús María',
    pricePerHour: 25,
    rating: 4.9,
    walks: 127,
    maxDogs: 3,
    accepts: ['medium', 'large'],
    windows: [[6, 20]],
    spots: ['olivar', 'campo-de-marte', 'caceres'],
    tagline: 'Estudiante de Medicina Veterinaria · 8.º ciclo',
    bio: 'Cuido perros hace 3 años. Me encantan los golden y los labradores. Siempre llevo agua, bolsas y un botiquín de primeros auxilios.',
    experience: '3 años',
    responds: '~2 min',
    extras: ['Primeros auxilios caninos', 'Botiquín en cada paseo'],
    includes: ['Agua y bolsas', 'Fotos del paseo', 'Juego con pelota', 'Botiquín de primeros auxilios'],
    style: ['Paciente', 'Mucha energía', 'Puntual'],
    dni: '10000001',
    code: 'PAT-7K3Q',
    verifiedAt: '2026-09-10',
    reviews: [
      rv('Valeria R.', 'San Isidro', 5, 'Max volvió feliz y cansado. Las fotos del Bosque El Olivar me hicieron el día. Ya no me preocupo en la oficina.', 'Hace 3 días', ['Mandó fotos', 'Puntual']),
      rv('Gonzalo H.', 'Jesús María', 5, 'Súper atento con mi labrador. Me avisó cuando se cruzó con un perro nervioso y cambió de ruta.', 'Hace 1 semana', ['Buena comunicación', 'Cuidó el tamaño del grupo']),
      rv('Paola S.', 'San Isidro', 4, 'Muy responsable y cariñoso. Una vez llegó 5 minutos tarde pero avisó antes por el chat.', 'Hace 2 semanas', ['Cariñoso con mi perro']),
    ],
    portrait: { skin: '#d9a074', hair: '#1c1917', style: 'short', shirt: '#ea580c', bg: ['#fed7aa', '#fdba74'] },
  },
  {
    id: 'camila',
    name: 'Camila R.',
    firstName: 'Camila',
    district: 'San Isidro',
    neighbor: 'Vive en San Isidro',
    pricePerHour: 30,
    rating: 5.0,
    walks: 86,
    maxDogs: 3,
    accepts: ['small', 'medium'],
    windows: [[8, 21]],
    spots: ['olivar', 'guatemala', 'juan-de-arona'],
    tagline: 'Estudiante de Psicología · adiestradora canina',
    bio: 'Combino el paseo con refuerzo positivo: tu perro vuelve más tranquilo y mejor educado. Especialista en razas pequeñas y medianas.',
    experience: '4 años',
    responds: '~1 min',
    extras: ['Adiestramiento básico', 'Perros pequeños y medianos'],
    includes: ['Agua y bolsas', 'Fotos', 'Refuerzo positivo', 'Limpieza de patas'],
    style: ['Tranquila', 'Educadora', 'Detallista'],
    dni: '10000002',
    code: 'PAT-4M9X',
    verifiedAt: '2026-09-10',
    reviews: [
      rv('Renzo T.', 'Jesús María', 5, 'Súper profesional. Mi schnauzer vuelve tranquilito y con el collar bien puesto. Muy recomendada.', 'Hace 2 días', ['Puntual', 'Cuidó el tamaño del grupo']),
      rv('Daniela P.', 'San Isidro', 5, 'Mi perrita era miedosa con otros perros y ahora camina con confianza. Se nota la paciencia.', 'Hace 5 días', ['Cariñoso con mi perro']),
      rv('Alonso V.', 'San Isidro', 5, 'Responde rapidísimo y manda fotos en cada paseo.', 'Hace 3 semanas', ['Mandó fotos', 'Buena comunicación']),
    ],
    portrait: { skin: '#f1c9a5', hair: '#3b2418', style: 'long', shirt: '#0f172a', bg: ['#e0e7ff', '#c7d2fe'] },
  },
  {
    id: 'diego',
    name: 'Diego A.',
    firstName: 'Diego',
    district: 'San Isidro',
    neighbor: 'Estudia en San Isidro',
    pricePerHour: 28,
    rating: 4.8,
    walks: 64,
    maxDogs: 3,
    accepts: ['medium', 'large'],
    windows: [
      [6, 12],
      [16, 20],
    ],
    spots: ['olivar', 'villaran', 'oropendolas'],
    tagline: 'Estudiante de Educación Física · runner',
    bio: 'Corro todas las mañanas y mis paseos tienen ritmo: perfectos para razas energéticas que necesitan gastar pila de verdad.',
    experience: '2 años',
    responds: '~3 min',
    extras: ['Paseos de alta energía', 'Razas deportivas'],
    includes: ['Agua y bolsas', 'Fotos', 'Ritmo de trote', 'Juego con pelota'],
    style: ['Deportivo', 'Energético', 'Constante'],
    dni: '10000003',
    code: 'PAT-2D8R',
    verifiedAt: '2026-09-11',
    reviews: [
      rv('Fiorella G.', 'San Isidro', 5, 'Mi border collie por fin gasta toda su energía. Me avisa por la app cada vez que cruzan una avenida.', 'Hace 4 días', ['Buena comunicación']),
      rv('Martín C.', 'Jesús María', 4, 'Buen ritmo y buen trato. Me gustaría más fotos durante el paseo.', 'Hace 2 semanas', ['Puntual']),
      rv('Sofía L.', 'San Isidro', 5, 'Mi husky vuelve agotado y feliz, justo lo que necesitaba.', 'Hace 1 mes', ['Cariñoso con mi perro']),
    ],
    portrait: { skin: '#c58c63', hair: '#18120e', style: 'cap', shirt: '#0ea5e9', bg: ['#bae6fd', '#7dd3fc'], beard: true },
  },
  {
    id: 'lucia',
    name: 'Lucía P.',
    firstName: 'Lucía',
    district: 'Jesús María',
    neighbor: 'Estudia en Jesús María',
    pricePerHour: 25,
    rating: 4.9,
    walks: 152,
    maxDogs: 3,
    accepts: ['small', 'medium'],
    windows: [[9, 19]],
    spots: ['campo-de-marte', 'habich', 'santa-cruz'],
    tagline: 'Técnica veterinaria · cuidados especiales',
    bio: 'Trabajo en una clínica veterinaria y paseo medio tiempo. Cariñosa con perros senior y con los que necesitan un cuidado especial.',
    experience: '5 años',
    responds: '~4 min',
    extras: ['Perros senior', 'Cuidados especiales'],
    includes: ['Agua y bolsas', 'Fotos', 'Paseo a su ritmo', 'Medicación si la necesita'],
    style: ['Cariñosa', 'Cuidadosa', 'Paciente'],
    dni: '10000004',
    code: 'PAT-9L5C',
    verifiedAt: '2026-09-10',
    reviews: [
      rv('Martín C.', 'Jesús María', 5, 'Puntual, cariñosa y muy responsable. La tranquilidad de ver las fotos del paseo no tiene precio.', 'Hace 1 día', ['Puntual', 'Mandó fotos']),
      rv('Teresa B.', 'Jesús María', 5, 'Mi perrito de 11 años camina a su ritmo y ella lo respeta. Gracias por tanto cariño.', 'Hace 6 días', ['Cariñoso con mi perro']),
      rv('Hugo M.', 'San Isidro', 5, 'Se dio cuenta de una cojera leve y me avisó a tiempo. Eso es oficio.', 'Hace 3 semanas', ['Buena comunicación']),
    ],
    portrait: { skin: '#e8b894', hair: '#2a1a12', style: 'bun', shirt: '#146c43', bg: ['#dcfce7', '#bbf7d0'] },
  },
  {
    id: 'mateo',
    name: 'Mateo S.',
    firstName: 'Mateo',
    district: 'San Isidro',
    neighbor: 'Vive en San Isidro',
    pricePerHour: 34,
    rating: 5.0,
    walks: 41,
    maxDogs: 2,
    accepts: ['small', 'medium', 'large'],
    windows: [[7, 21]],
    spots: ['olivar', 'bicentenario'],
    tagline: 'Estudiante de Biología · máx. 2 perros',
    bio: 'Solo llevo dos perros por paseo para dar atención casi personalizada. Ideal para perros ansiosos, rescatados o muy apegados.',
    experience: '2 años',
    responds: '~2 min',
    extras: ['Atención casi personalizada', 'Perros ansiosos o rescatados'],
    includes: ['Agua y bolsas', 'Fotos del paseo', 'Atención personalizada', 'Reporte detallado'],
    style: ['Calmado', 'Observador', 'Detallista'],
    dni: '10000005',
    code: 'PAT-6S1B',
    verifiedAt: '2026-09-11',
    reviews: [
      rv('Daniela P.', 'San Isidro', 5, 'Paseos de máxima atención, con solo dos perritos. Vale cada sol.', 'Hace 4 días', ['Cuidó el tamaño del grupo']),
      rv('Jorge A.', 'San Isidro', 5, 'Mi perro rescatado no confiaba en nadie. Con Mateo se soltó en dos semanas.', 'Hace 2 semanas', ['Cariñoso con mi perro', 'Buena comunicación']),
    ],
    portrait: { skin: '#e8b894', hair: '#4a2c1a', style: 'curly', shirt: '#7c3aed', bg: ['#ede9fe', '#ddd6fe'], beard: true },
  },
  {
    id: 'andrea',
    name: 'Andrea V.',
    firstName: 'Andrea',
    district: 'Jesús María',
    neighbor: 'Estudia en Jesús María',
    pricePerHour: 27,
    rating: 4.9,
    walks: 98,
    maxDogs: 3,
    accepts: ['small', 'medium'],
    windows: [[10, 18]],
    spots: ['caceres', 'procers', 'huiracocha'],
    tagline: 'Estudiante de Administración · amante de los cachorros',
    bio: 'Me especializo en cachorros: socialización con cuidado, paseos cortos y mucho cariño. Siempre con correa corta y atención total.',
    experience: '3 años',
    responds: '~2 min',
    extras: ['Cachorros y socialización', 'Primeros auxilios caninos'],
    includes: ['Agua y bolsas', 'Fotos', 'Socialización con cuidado', 'Limpieza de patas'],
    style: ['Dulce', 'Juguetona', 'Atenta'],
    dni: '10000006',
    code: 'PAT-3V7H',
    verifiedAt: '2026-09-17',
    reviews: [
      rv('Gonzalo H.', 'Jesús María', 5, 'Me manda fotos con el agua y la pelota, tal cual lo prometen. Mi cocker la adora.', 'Hace 2 días', ['Mandó fotos']),
      rv('Lucero N.', 'Jesús María', 5, 'Mi cachorra aprendió a caminar con correa en un mes. Paciencia total.', 'Hace 1 semana', ['Cariñoso con mi perro', 'Puntual']),
      rv('Iván R.', 'San Isidro', 4, 'Muy dulce con los perros. Solo pediría más horarios por la tarde.', 'Hace 1 mes', ['Buena comunicación']),
    ],
    portrait: { skin: '#d9a074', hair: '#120d0a', style: 'long', shirt: '#db2777', bg: ['#fce7f3', '#fbcfe8'] },
  },
]

/**
 * Casillas de los paseadores DE EJEMPLO (lib/verificacion.ts). Son datos inventados para la demostración:
 * los que llevan la etiqueta «Nuevo» tienen cinco (todavía no hicieron el primer paseo acompañado).
 */
export const WALKERS: Walker[] = WALKERS_BASE.map((w) => ({
  ...w,
  esEjemplo: true,
  comprobaciones: COMPROBACIONES.filter((c) => !(w.probation && c.id === 'primerPaseo')).map((c) => c.id),
}))


/**
 * Paseos anteriores de la cuenta de demostración (inventados). Cada paseador pasea solo perros de los tamaños que
 * acepta: Carlos (medianos y grandes) con Max, que es grande; Lucía (pequeños y medianos) con Luna, que es pequeña.
 */
export const PAST_WALKS = [
  { id: 'p1', walker: 'Carlos M.', dog: 'Max', when: 'Hace 3 días', total: 28, esEjemplo: true },
  { id: 'p2', walker: 'Lucía P.', dog: 'Luna', when: 'Hace 1 semana', total: 28, esEjemplo: true },
]

export const UNIVERSITIES = [
  'Universidad del Pacífico (Jesús María)',
  'Otra universidad de Lima',
  'Instituto o escuela técnica',
  'Todavía no estudio',
]

export const SPOT_ORDER = ['olivar', 'campo-de-marte', 'caceres']

/** Nombres de los otros perros del grupo, según el tamaño. */
export const GROUP_NAMES: Record<Size, string[]> = {
  small: ['Coco', 'Kira'],
  medium: ['Thor', 'Nala'],
  large: ['Rocky', 'Simba'],
}

export interface BookingInput {
  walker: Walker
  dog: Dog
  dayIdx: number
  startHour: number
  durationMin: number
  plan: Plan
  handoff: Handoff
  notes: string
  groupDogs: number
  groupSize: Size
  welcome?: boolean
  /** El parque o zona (de los del paseador) donde se pide el paseo. */
  spotId?: string
}

export function buildBooking(i: BookingInput): Booking {
  const walkPrice = precioPaseo(i.walker.pricePerHour, i.durationMin, !i.dog.sociable)
  const planDiscount = descuentoPlan(walkPrice, i.plan)
  const welcome = i.welcome ? CONFIG.descuentoBienvenida : 0
  const discount = planDiscount + welcome
  const day = dayInfo(i.dayIdx)
  // Lo que se cobra: el precio (menos descuentos) y, según `comisionModo`, la comisión se descuenta del paseador o se
  // suma a lo que paga la familia. Los tres números salen de lib/config.ts.
  const precio = Math.max(walkPrice - discount, 0)
  return {
    walker: i.walker,
    dog: i.dog,
    ...(i.spotId ? { spotId: i.spotId } : {}),
    dayIdx: i.dayIdx,
    dayLabel: day.label,
    startHour: i.startHour,
    startMin: i.startHour * 60,
    slotLabel: `${day.label} · ${hourLabel(i.startHour)}`,
    durationMin: i.durationMin,
    plan: i.plan,
    handoff: i.handoff,
    notes: i.notes,
    groupDogs: i.groupDogs,
    groupSize: i.groupSize,
    walkPrice,
    discount,
    total: montoFamilia(precio),
    comision: comisionPatitas(precio),
    neto: pagoPaseador(precio),
  }
}
