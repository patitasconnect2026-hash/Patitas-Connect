'use client'

import { motion } from 'framer-motion'
import { NOMBRE_APP, partesNombre } from '@/lib/config'
import { COMPROBACIONES, type ComprobacionId } from '@/lib/verificacion'
import { cn } from '@/lib/utils'

type Tone = 'orange' | 'cream' | 'ink'

/**
 * Isotipo de Patitas Connect: el perro grande abrazando al cachorro (el logo que nos dio el equipo).
 * Sobre fondo claro va suelta; sobre fondo naranja u oscuro ("cream"/"ink") lleva una placa blanca
 * redonda debajo, porque la imagen no cambia de color sola.
 */
export function LogoMark({
  size = 40,
  tone = 'orange',
  animated = false,
  className,
}: {
  size?: number
  tone?: Tone
  animated?: boolean
  className?: string
}) {
  const sobrePlaca = tone !== 'orange'
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- tamaño variable por prop; es un ícono chico, no una foto grande
    <img src="/marca/logo-mark.png" alt="" width={size} height={size} className="h-full w-full object-contain" />
  )
  return (
    <motion.span
      role="img"
      aria-label={NOMBRE_APP}
      initial={animated ? { y: -26, opacity: 0 } : false}
      animate={animated ? { y: 0, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }}
      className={cn('inline-flex shrink-0 items-center justify-center', sobrePlaca && 'rounded-full bg-white shadow-sm', className)}
      style={{ width: size, height: size, padding: sobrePlaca ? size * 0.1 : 0 }}
    >
      {img}
    </motion.span>
  )
}

/**
 * Logotipo de Patitas Connect, como el logo oficial (public/marca/logo-lockup.png): el isotipo y, al lado, «PATITAS» grande
 * en terracota y «CONNECT» debajo en vino, espaciado, con la letra del logo (Cinzel). Sobre fondo oscuro o naranja
 * ("cream"/"ink") las letras van en crema.
 */
export function Logo({
  tone = 'orange',
  size = 36,
  animated = false,
  className,
}: {
  tone?: Tone
  size?: number
  animated?: boolean
  className?: string
}) {
  const [uno, dos] = partesNombre()
  const claro = tone !== 'orange'
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} tone={tone} animated={animated} />
      <span className="font-display flex flex-col items-center leading-none" aria-hidden>
        <span className={cn('font-bold uppercase', claro ? 'text-brand-50' : 'text-brand-600')} style={{ fontSize: size * 0.56, letterSpacing: '0.02em' }}>
          {uno}
        </span>
        {dos && (
          <span
            className={cn('font-semibold uppercase', claro ? 'text-brand-100' : 'text-vino')}
            style={{ fontSize: size * 0.27, letterSpacing: '0.34em', marginTop: size * 0.05, marginRight: '-0.34em' }}
          >
            {dos}
          </span>
        )}
      </span>
    </span>
  )
}

/** Huella de perro para patrones: almohadilla grande y cuatro dedos anchos, no la huella fina de un gato. */
export function PawMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden fill="currentColor">
      <ellipse cx="12" cy="31" rx="6.4" ry="8" transform="rotate(-24 12 31)" />
      <ellipse cx="24" cy="15" rx="7" ry="8.8" transform="rotate(-8 24 15)" />
      <ellipse cx="40" cy="15" rx="7" ry="8.8" transform="rotate(8 40 15)" />
      <ellipse cx="52" cy="31" rx="6.4" ry="8" transform="rotate(24 52 31)" />
      <path d="M32 29 C22 29 13 38 14 47 C15 56 24 58 32 58 C40 58 49 56 50 47 C51 38 42 29 32 29Z" />
    </svg>
  )
}

/**
 * Sello (borde festoneado) con una huella. Sin visto: no dice «verificado»; lo que afirma se escribe aparte.
 * Para un paseador usa <SelloPaseador>: solo aparece si tiene comprobaciones marcadas.
 */
export function Seal({ size = 28, className, etiqueta }: { size?: number; className?: string; etiqueta?: string }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    const r = i % 2 === 0 ? 14 : 12.4
    return `${(16 + Math.cos(a) * r).toFixed(2)},${(16 + Math.sin(a) * r).toFixed(2)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} {...(etiqueta ? { role: 'img', 'aria-label': etiqueta } : { 'aria-hidden': true })}>
      <polygon points={pts} fill="#146c43" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      <g transform="translate(6.4 6.2) scale(.3)" fill="#fff">
        <ellipse cx="12" cy="31" rx="6.4" ry="8" transform="rotate(-24 12 31)" />
        <ellipse cx="24" cy="15" rx="7" ry="8.8" transform="rotate(-8 24 15)" />
        <ellipse cx="40" cy="15" rx="7" ry="8.8" transform="rotate(8 40 15)" />
        <ellipse cx="52" cy="31" rx="6.4" ry="8" transform="rotate(24 52 31)" />
        <path d="M32 29 C22 29 13 38 14 47 C15 56 24 58 32 58 C40 58 49 56 50 47 C51 38 42 29 32 29Z" />
      </g>
    </svg>
  )
}

/** El sello de un paseador. Sin comprobaciones marcadas no se dibuja (la app no afirma nada). Dice cuántas hay. */
export function SelloPaseador({ comprobaciones, size, className }: { comprobaciones?: readonly ComprobacionId[]; size?: number; className?: string }) {
  const n = comprobaciones?.length ?? 0
  if (n === 0) return null
  return <Seal size={size} className={className} etiqueta={`${n} de ${COMPROBACIONES.length} comprobaciones`} />
}
