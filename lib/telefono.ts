/**
 * Teléfonos de Perú: de cómo los escribe la gente ("(01) 319 0000", "987 654 321") a un formato que sirve
 * para tel: y wa.me. No depende de nada más (lo usan lib/config.ts y lib/sos.ts).
 */

/**
 * Devuelve el teléfono en formato internacional ("+51987654321", "+5113190000") o null si no sirve.
 *
 * Celulares: "987 654 321", "+51 987-654-321", "51987654321", "(+51) 987 654 321" (9 dígitos y empieza con 9).
 * Fijos de Lima (como los copian de las páginas oficiales): "(01) 319 0000", "01 319 0000", "319 0000",
 * "(511) 3190000", "+51 1 319 0000".
 * Un número con "+" y otro país se acepta si tiene entre 8 y 15 dígitos.
 */
export function normalizarTelefono(entrada: string): string | null {
  const limpio = entrada.replace(/[\s\-().]/g, '')
  if (limpio === '') return null
  const conMas = limpio.startsWith('+')
  const digitos = limpio.replace(/\D/g, '')
  if (limpio.replace(/^\+/, '') !== digitos) return null // hay letras u otros signos
  if (conMas) {
    return digitos.length >= 8 && digitos.length <= 15 ? `+${digitos}` : null
  }
  if (digitos.length === 9 && digitos.startsWith('9')) return `+51${digitos}` // celular
  if (digitos.length === 11 && digitos.startsWith('519')) return `+${digitos}` // celular con 51
  if (digitos.length === 7) return `+511${digitos}` // fijo de Lima sin código
  if (digitos.length === 9 && digitos.startsWith('01')) return `+51${digitos.slice(1)}` // 01 + fijo
  if (digitos.length === 10 && digitos.startsWith('511')) return `+${digitos}` // 51 1 + fijo
  return null
}

/** true si es un celular peruano (el único que puede tener WhatsApp con seguridad). */
export function esCelularPeru(entrada: string): boolean {
  const t = normalizarTelefono(entrada)
  return t !== null && /^\+519\d{8}$/.test(t)
}

/** Enlace para llamar. Null si el teléfono no sirve. */
export function enlaceLlamada(telefono: string): string | null {
  const t = normalizarTelefono(telefono)
  return t ? `tel:${t}` : null
}

/** Enlace de WhatsApp con el mensaje ya escrito. Null si el teléfono no sirve. */
export function enlaceWhatsApp(telefono: string, mensaje: string): string | null {
  const t = normalizarTelefono(telefono)
  if (!t) return null
  return `https://wa.me/${t.slice(1)}?text=${encodeURIComponent(mensaje)}`
}
