/**
 * Avisos con la app abierta (Bloque 3): cuando llega un pedido (paseador) o una oferta (familia) suena un sonido corto, el celular
 * vibra y sale una insignia con el número. Funciones PURAS; el sonido y la vibración están en `avisosSonido.ts`.
 * Con el navegador cerrado todavía NO hay aviso (ver docs/PUBLICAR.md, «Avisos con la app cerrada»).
 */
export interface AvisosPref {
  /** La persona ya vio la pantalla «Activar avisos» (la primera vez se le explica). */
  visto: boolean
  /** Apagó el sonido y la vibración. La insignia se sigue viendo. */
  silenciado: boolean
}

export const PREF_INICIAL: AvisosPref = { visto: false, silenciado: false }

export function normalizarPref(v: unknown): AvisosPref {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  return { visto: o.visto === true, silenciado: o.silenciado === true }
}

/** ¿Debe sonar y vibrar? Solo si la persona activó los avisos (no los silenció ni los dejó para después). */
export const debeAvisar = (p: AvisosPref): boolean => p.visto && !p.silenciado

/** Los ids de `actuales` que todavía no se habían visto. */
export function idsNuevos(vistos: ReadonlySet<string>, actuales: readonly string[]): string[] {
  return actuales.filter((id) => !vistos.has(id))
}
