/**
 * Membresías de las familias, niveles del paseador (comisión 20, 15 o 10 %) y promociones.
 * Pedido de Yahrod (30 de octubre de 2026): ganar con la comisión de cada paseo y, además, con membresías que den dinero
 * limpio; y no darle todo el poder a la familia (el plan gratis tiene límites).
 *
 * SIMULADO: hoy no se cobra ninguna membresía (`CONFIG.planesActivos` es false) y el cobro sigue usando `CONFIG.comision`
 * (`comisionPorNivelActiva` es false). Los números viven en lib/config.ts; aquí solo están las reglas.
 */
import { CONFIG, NOMBRE_CORTO, type Config } from './config'

const aCentimos = (n: number) => Math.round(n * 100) / 100

/* ------------------------------------------------------------------ */
/* Niveles del paseador                                                 */
/* ------------------------------------------------------------------ */

export type NivelId = 'nuevo' | 'pro' | 'elite'

export interface Nivel {
  id: NivelId
  nombre: string
  /** Lo que hace falta para llegar (y quedarse) en el nivel. */
  minPaseos: number
  /** Puntaje final promedio (1 a 10) mínimo. */
  minPuntaje: number
  /** Faltas (puntos de penalización) permitidas en los últimos 30 días. */
  maxFaltas: number
  /** Cursos de la academia aprobados. */
  minCursos: number
  ventajas: string[]
}

export const NIVELES: Nivel[] = [
  {
    id: 'nuevo',
    nombre: 'Nuevo',
    minPaseos: 0,
    minPuntaje: 0,
    maxFaltas: 99,
    minCursos: 0,
    ventajas: ['Primer paseo acompañado por el equipo', 'Recibes pedidos de tu zona', 'Cobras por Yape o Plin'],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    minPaseos: 40,
    minPuntaje: 8.5,
    maxFaltas: 1,
    minCursos: 3,
    ventajas: ['Pagas menos comisión', 'Puedes pasear perros de cuidado especial', 'Puedes ser «Destacado» en tu distrito'],
  },
  {
    id: 'elite',
    nombre: 'Élite',
    minPaseos: 150,
    minPuntaje: 9.2,
    maxFaltas: 0,
    minCursos: 6,
    ventajas: ['La comisión más baja', 'Primero en los pedidos urgentes y de rescate', 'Puedes dar entrenamientos (cuando abran)'],
  },
]

export interface HistorialPaseador {
  paseos: number
  /** Puntaje final promedio 1 a 10 (ver lib/calificacionDetallada.ts). null = aún sin calificaciones. */
  puntaje: number | null
  faltas30d: number
  cursos: number
}

/** El nivel más alto cuyos requisitos se cumplen todos. */
export function nivelDe(h: HistorialPaseador): Nivel {
  let actual = NIVELES[0]
  for (const n of NIVELES) {
    const ok = h.paseos >= n.minPaseos && (h.puntaje ?? 0) >= n.minPuntaje && h.faltas30d <= n.maxFaltas && h.cursos >= n.minCursos
    if (ok) actual = n
  }
  return actual
}

/** Lo que le falta para el siguiente nivel, en frases cortas. Vacío si ya es Élite. */
export function faltaParaSiguiente(h: HistorialPaseador): { nivel: Nivel; faltan: string[]; avance: number } | null {
  const idx = NIVELES.findIndex((n) => n.id === nivelDe(h).id)
  const sig = NIVELES[idx + 1]
  if (!sig) return null
  const faltan: string[] = []
  if (h.paseos < sig.minPaseos) faltan.push(`${sig.minPaseos - h.paseos} paseos más`)
  if ((h.puntaje ?? 0) < sig.minPuntaje) faltan.push(`puntaje de ${String(sig.minPuntaje).replace('.', ',')} o más`)
  if (h.faltas30d > sig.maxFaltas) faltan.push(sig.maxFaltas === 0 ? 'cero faltas en 30 días' : `máximo ${sig.maxFaltas} falta en 30 días`)
  if (h.cursos < sig.minCursos) faltan.push(`${sig.minCursos - h.cursos} cursos de la academia`)
  // Avance: promedio de cada requisito (0 a 1), para la barra.
  const partes = [
    Math.min(h.paseos / sig.minPaseos, 1),
    Math.min((h.puntaje ?? 0) / sig.minPuntaje, 1),
    h.faltas30d <= sig.maxFaltas ? 1 : 0,
    Math.min(h.cursos / sig.minCursos, 1),
  ]
  return { nivel: sig, faltan, avance: partes.reduce((a, b) => a + b, 0) / partes.length }
}

/** Comisión (en %) de un nivel. Con la promo de grupo vigente, nadie paga más que la de Pro. */
export function comisionDeNivel(nivel: NivelId, opciones: { promoGrupo?: boolean } = {}, c: Config = CONFIG): number {
  const base = c.comisionPorNivel[nivel]
  return opciones.promoGrupo ? Math.min(base, c.comisionPorNivel.pro) : base
}

/** La comisión que se usa HOY para cobrar: la del nivel solo si el equipo la activó; si no, la de siempre. */
export function comisionVigente(nivel: NivelId, opciones: { promoGrupo?: boolean } = {}, c: Config = CONFIG): number {
  return c.comisionPorNivelActiva ? comisionDeNivel(nivel, opciones, c) : c.comision
}

/** Cuánto gana el paseador al mes con la comisión de cada nivel, para un total cobrado `brutoMes`. */
export function gananciaPorNivel(brutoMes: number, c: Config = CONFIG) {
  return NIVELES.map((n) => ({ nivel: n, comision: c.comisionPorNivel[n.id], recibe: aCentimos(brutoMes * (1 - c.comisionPorNivel[n.id] / 100)) }))
}

/* ------------------------------------------------------------------ */
/* Promoción «Trae a tu grupo» (paseadores de grupos de Facebook)       */
/* ------------------------------------------------------------------ */

/** Código para que un grupo entre junto: letras del nombre del grupo + 3 números. Sin datos personales. */
export function codigoDeGrupo(nombreGrupo: string, numero: number): string {
  const letras = nombreGrupo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 5)
  return `${letras || 'GRUPO'}-${String(Math.abs(Math.trunc(numero)) % 1000).padStart(3, '0')}`
}

/** ¿El grupo ya ganó la promo? Hace falta que entren (aprobados) al menos `minimoGrupo` personas con el mismo código. */
export function promoGrupoVigente(aprobadosConCodigo: number, diasDesdeIngreso: number, c: Config = CONFIG): boolean {
  return aprobadosConCodigo >= c.minimoGrupo && diasDesdeIngreso <= c.diasPromoGrupo
}

/** El mensaje que el paseador manda a su grupo por WhatsApp o Facebook (lo manda la persona, la web no publica nada). */
export function mensajeInvitacionGrupo(codigo: string, enlace: string, c: Config = CONFIG): string {
  return `Estoy paseando perros con ${NOMBRE_CORTO}. Si entramos ${c.minimoGrupo} o más del grupo con el código ${codigo}, todos pagamos la comisión de nivel Pro los primeros ${c.diasPromoGrupo} días. Postula aquí: ${enlace}`
}

/* ------------------------------------------------------------------ */
/* Membresías de las familias                                           */
/* ------------------------------------------------------------------ */

export type PlanFamiliaId = 'gratis' | 'plus' | 'club'

export interface LimitesPlan {
  /** Pedidos «Pedir paseo» abiertos al mismo tiempo. */
  pedidosAbiertos: number
  /** Paseos reservados por adelantado en una semana (calendario). null = sin límite. */
  reservasPorSemana: number | null
  /** Horas antes del paseo hasta las que se cancela gratis. */
  horasCancelacionGratis: number
  /** Cancelaciones tardías al mes antes de pausar las reservas por 7 días. */
  cancelacionesTardiasMes: number
  /** Prioridad cuando un paseador cancela: la familia entra antes en la fila del reemplazo. */
  reemplazoPrioritario: boolean
}

export interface PlanFamilia {
  id: PlanFamiliaId
  nombre: string
  lema: string
  limites: LimitesPlan
  ventajas: string[]
}

export function planesFamilia(c: Config = CONFIG): PlanFamilia[] {
  return [
    {
      id: 'gratis',
      nombre: 'Gratis',
      lema: 'Pagas solo cada paseo.',
      limites: { pedidosAbiertos: 1, reservasPorSemana: 3, horasCancelacionGratis: c.horasCancelacionGratis, cancelacionesTardiasMes: 2, reemplazoPrioritario: false },
      ventajas: ['Paseadores con comprobaciones', 'Fotos y puntos de control', 'Chat, mapa y SOS en cada paseo', 'Reemplazo si el paseador cancela'],
    },
    {
      id: 'plus',
      nombre: 'Plus',
      lema: 'Para la rutina de la semana.',
      limites: { pedidosAbiertos: 3, reservasPorSemana: null, horasCancelacionGratis: 1, cancelacionesTardiasMes: 4, reemplazoPrioritario: true },
      ventajas: ['Reservas sin límite en la semana', 'Primero en la fila si te cancelan', 'Cancelas gratis hasta 1 hora antes', 'Recorrido del paseo guardado'],
    },
    {
      id: 'club',
      nombre: 'Club',
      lema: 'Paseo diario y cuidado especial.',
      limites: { pedidosAbiertos: 5, reservasPorSemana: null, horasCancelacionGratis: 1, cancelacionesTardiasMes: 6, reemplazoPrioritario: true },
      ventajas: [
        `${String(c.descuentoClubPct).replace('.', ',')} % menos en cada paseo`,
        'Paseador de respaldo ya asignado',
        'Ficha de cuidado especial para perros frágiles',
        'Todo lo de Plus',
      ],
    },
  ]
}

export function planFamilia(id: PlanFamiliaId, c: Config = CONFIG): PlanFamilia {
  return planesFamilia(c).find((p) => p.id === id) ?? planesFamilia(c)[0]
}

/** Precio al mes de un plan. */
export function precioPlan(id: PlanFamiliaId, c: Config = CONFIG): number {
  return c.precioPlanFamilia[id]
}

/** Descuento del Club en un mes con `gastoPaseosMes` soles en paseos: el porcentaje, con tope. */
export function descuentoClubMes(gastoPaseosMes: number, c: Config = CONFIG): number {
  return aCentimos(Math.min(gastoPaseosMes * (c.descuentoClubPct / 100), c.topeDescuentoClubMes))
}

/**
 * Lo que le queda LIMPIO a Patitas de una membresía en un mes: lo que paga la familia menos lo que cuestan sus beneficios
 * con dinero (descuento del Club y bonos de rescate). Por diseño nunca es negativo (hay una prueba).
 */
export function margenMembresia(id: PlanFamiliaId, gastoPaseosMes: number, rescatesMes = 0, c: Config = CONFIG): number {
  if (id === 'gratis') return 0
  const descuento = id === 'club' ? descuentoClubMes(gastoPaseosMes, c) : 0
  const bonos = Math.min(rescatesMes, 2) * (c.bonoRescatePlan - c.bonoRescate)
  return aCentimos(precioPlan(id, c) - descuento - bonos)
}

/** ¿Le conviene el Club a una familia? Solo si el descuento que recibe más lo que valora el resto pasa el precio. */
export function ahorroClub(gastoPaseosMes: number, c: Config = CONFIG): number {
  return aCentimos(descuentoClubMes(gastoPaseosMes, c) - precioPlan('club', c))
}

/* ------------------------------------------------------------------ */
/* Límites: no todo el poder a la familia                               */
/* ------------------------------------------------------------------ */

export interface UsoFamilia {
  plan: PlanFamiliaId
  pedidosAbiertos: number
  reservasEstaSemana: number
  cancelacionesTardiasMes: number
  /** Si la cuenta tiene una pausa vigente (por cancelaciones tardías o reportes sin sustento), hasta cuándo (ms). */
  pausadaHasta?: number
}

export type Bloqueo = { ok: true } | { ok: false; motivo: string; sugerencia?: PlanFamiliaId }

export function puedePedir(u: UsoFamilia, ahora: number, c: Config = CONFIG): Bloqueo {
  const p = planFamilia(u.plan, c)
  if (u.pausadaHasta && u.pausadaHasta > ahora) return { ok: false, motivo: 'Tu cuenta está en pausa por cancelaciones tardías. Escríbenos si fue un error.' }
  if (u.cancelacionesTardiasMes > p.limites.cancelacionesTardiasMes) return { ok: false, motivo: 'Pasaste el límite de cancelaciones tardías de este mes.' }
  if (u.pedidosAbiertos >= p.limites.pedidosAbiertos) {
    return { ok: false, motivo: `Tu plan permite ${p.limites.pedidosAbiertos === 1 ? 'un pedido abierto' : `${p.limites.pedidosAbiertos} pedidos abiertos`} a la vez.`, sugerencia: u.plan === 'gratis' ? 'plus' : undefined }
  }
  return { ok: true }
}

export function puedeReservar(u: UsoFamilia, ahora: number, c: Config = CONFIG): Bloqueo {
  const p = planFamilia(u.plan, c)
  if (u.pausadaHasta && u.pausadaHasta > ahora) return { ok: false, motivo: 'Tu cuenta está en pausa por cancelaciones tardías. Escríbenos si fue un error.' }
  if (p.limites.reservasPorSemana !== null && u.reservasEstaSemana >= p.limites.reservasPorSemana) {
    return { ok: false, motivo: `El plan Gratis permite ${p.limites.reservasPorSemana} reservas por semana.`, sugerencia: 'plus' }
  }
  return { ok: true }
}

/* ------------------------------------------------------------------ */
/* Promociones                                                          */
/* ------------------------------------------------------------------ */

/**
 * Descuento del primer paseo: el porcentaje con tope, y NUNCA más que la comisión de ese paseo (así Patitas no le paga
 * al paseador de su bolsillo). 0 mientras los planes no estén activos.
 */
export function descuentoPrimerPaseo(precio: number, comisionPct: number, c: Config = CONFIG): number {
  if (!c.planesActivos) return 0
  const pedido = Math.min(precio * (c.promoPrimerPaseoPct / 100), c.promoPrimerPaseoTope)
  return Math.floor(Math.min(pedido, precio * (comisionPct / 100)) * 100) / 100
}

/** Crédito por invitar a otra familia: para las dos, después del primer paseo pagado de la invitada; nunca más que la comisión. */
export function creditoInvitacion(comisionDelPrimerPaseo: number, c: Config = CONFIG): number {
  if (!c.planesActivos) return 0
  return aCentimos(Math.min(c.promoInvitaFamilia, comisionDelPrimerPaseo / 2))
}

/** El texto que acompaña a los planes mientras no se cobren. */
export function estadoPlanes(c: Config = CONFIG): string {
  return c.planesActivos ? 'Se cobra cada mes. Cancelas cuando quieras.' : 'Simulado: se activan cuando empecemos a cobrar.'
}
