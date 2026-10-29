'use client'

import { useId } from 'react'
import type { Portrait } from '@/lib/types'

/**
 * Retrato ilustrado del paseador. Si el paseador tiene `photo` (URL real),
 * se muestra esa foto en su lugar.
 */
export function PortraitAvatar({
  portrait,
  photo,
  alt,
  className,
}: {
  portrait: Portrait
  photo?: string
  alt: string
  className?: string
}) {
  const uid = useId().replace(/:/g, '')

  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={alt} className={`${className ?? ''} object-cover`} />
  }

  const { skin, hair, style, shirt, bg, beard } = portrait

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={alt} className={className}>
      <defs>
        <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg[0]} />
          <stop offset="1" stopColor={bg[1]} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}bg)`} />

      {/* pelo de atrás (pelo largo) */}
      {style === 'long' && <path d="M26 50 C20 18 38 9 50 9 C62 9 80 18 74 50 L78 88 L22 88 Z" fill={hair} />}

      {/* hombros */}
      <path d="M8 100 C8 80 28 71 50 71 C72 71 92 80 92 100 Z" fill={shirt} />
      <path d="M41 72 L50 83 L59 72 Z" fill="#fff" opacity=".92" />

      {/* cuello y orejas */}
      <rect x="43" y="57" width="14" height="19" rx="7" fill={skin} />
      <rect x="43" y="65" width="14" height="10" fill="#000" opacity=".1" />
      <ellipse cx="31" cy="46" rx="3.6" ry="5" fill={skin} />
      <ellipse cx="69" cy="46" rx="3.6" ry="5" fill={skin} />

      {/* cara */}
      <ellipse cx="50" cy="44" rx="19" ry="22" fill={skin} />

      {/* pelo de adelante */}
      {style === 'short' && (
        <path
          d="M30.5 44 C26 20 40 12 50 12 C61 12 74 20 69.5 44 C66.5 36 61 31 50 31 C39 31 33.5 36 30.5 44Z"
          fill={hair}
        />
      )}
      {style === 'long' && (
        <path
          d="M30 48 C27 22 42 12 52 12 C65 12 74 24 70 48 C65 33 53 28 43 31 C36 33 32 39 30 48Z"
          fill={hair}
        />
      )}
      {style === 'bun' && (
        <g fill={hair}>
          <circle cx="50" cy="9" r="8.5" />
          <path d="M30.5 44 C26 20 40 12 50 12 C61 12 74 20 69.5 44 C66.5 36 61 31 50 31 C39 31 33.5 36 30.5 44Z" />
        </g>
      )}
      {style === 'curly' && (
        <g fill={hair}>
          <circle cx="32" cy="34" r="9" />
          <circle cx="40" cy="23" r="10" />
          <circle cx="52" cy="19" r="10" />
          <circle cx="63" cy="24" r="10" />
          <circle cx="69" cy="35" r="9" />
          <ellipse cx="50" cy="31" rx="19" ry="11" />
        </g>
      )}
      {style === 'cap' && (
        <g>
          <path
            d="M30.5 44 C26 24 40 16 50 16 C61 16 74 24 69.5 44 C66.5 38 61 34 50 34 C39 34 33.5 38 30.5 44Z"
            fill={hair}
          />
          <path d="M28 36 C28 17 40 10 50 10 C61 10 72 17 72 36 Z" fill="#ea580c" />
          <path d="M26 36 H72 L86 40 C86 43 82 44.5 78 44.5 H28 Z" fill="#c2410c" />
        </g>
      )}

      {/* barba */}
      {beard && (
        <path d="M31.5 50 C32 67 68 67 68.5 50 C65 59 57 61 50 61 C43 61 35 59 31.5 50Z" fill={hair} />
      )}

      {/* rostro */}
      <circle cx="37.5" cy="52" r="3.6" fill="#f87171" opacity=".16" />
      <circle cx="62.5" cy="52" r="3.6" fill="#f87171" opacity=".16" />
      <circle cx="42.5" cy="45" r="1.9" fill="#1e293b" />
      <circle cx="57.5" cy="45" r="1.9" fill="#1e293b" />
      <path d="M38.5 40.5 Q42.5 38 46.5 40.5" stroke={hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M53.5 40.5 Q57.5 38 61.5 40.5" stroke={hair} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50 46 Q48.5 51 50.5 52" stroke="#000" strokeOpacity=".18" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path
        d="M43.5 55.5 Q50 61.5 56.5 55.5"
        stroke={beard ? '#fff' : '#9a3412'}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
