'use client'

import { FURS } from '@/lib/data'
import type { Dog, FurKey } from '@/lib/types'
import { cn } from '@/lib/utils'

type Look = Pick<Dog, 'fur' | 'shape'>

const DEFAULT_LOOK: Look = { fur: 'dorado', shape: 'floppy' }

function Floppy({ fur }: { fur: FurKey }) {
  const c = FURS[fur]
  const dark = fur === 'negro'
  return (
    <g>
      <ellipse cx="22" cy="50" rx="11" ry="23" transform="rotate(14 22 50)" fill={c.ear} />
      <ellipse cx="78" cy="50" rx="11" ry="23" transform="rotate(-14 78 50)" fill={c.ear} />
      <ellipse cx="50" cy="50" rx="27" ry="26" fill={c.fur} />
      <ellipse cx="50" cy="34" rx="9" ry="6" fill="#fff" opacity={dark ? 0.12 : 0.28} />
      <ellipse cx="50" cy="64" rx="16" ry="12" fill={c.muzzle} />
      <path d="M45.5 69.5 Q50 80 54.5 69.5Z" fill="#fb7185" />
      <path d="M43 56 Q50 51 57 56 Q55.5 62 50 62.5 Q44.5 62 43 56Z" fill="#1e293b" />
      <path
        d="M50 62.5 V67 M50 67 Q44.5 72 40 67.5 M50 67 Q55.5 72 60 67.5"
        stroke="#1e293b"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="39" cy="45" r="3.3" fill="#1e293b" />
      <circle cx="61" cy="45" r="3.3" fill="#1e293b" />
      <circle cx="40.2" cy="43.8" r="1.1" fill="#fff" />
      <circle cx="62.2" cy="43.8" r="1.1" fill="#fff" />
    </g>
  )
}

function Bat({ fur }: { fur: FurKey }) {
  const c = FURS[fur]
  return (
    <g>
      <path d="M25 44 L18 8 Q37 9 44 32 Z" fill={c.ear} />
      <path d="M27 38 L23 17 Q32 18 37 31Z" fill="#fda4af" />
      <path d="M75 44 L82 8 Q63 9 56 32 Z" fill={c.ear} />
      <path d="M73 38 L77 17 Q68 18 63 31Z" fill="#fda4af" />
      <ellipse cx="50" cy="52" rx="29" ry="25" fill={c.fur} />
      <ellipse cx="50" cy="65" rx="17" ry="12" fill={c.muzzle} />
      <path d="M43 69 Q50 79 57 69Z" fill="#fb7185" />
      <ellipse cx="50" cy="58" rx="6.2" ry="4.2" fill="#0f172a" />
      <path
        d="M50 62 V66.5 M50 66.5 Q45 71 41 66.5 M50 66.5 Q55 71 59 66.5"
        stroke="#0f172a"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M42 38 Q50 35 58 38" stroke={c.ear} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="37.5" cy="47" r="3.7" fill="#0f172a" />
      <circle cx="62.5" cy="47" r="3.7" fill="#0f172a" />
      <circle cx="38.8" cy="45.7" r="1.2" fill="#fff" />
      <circle cx="63.8" cy="45.7" r="1.2" fill="#fff" />
    </g>
  )
}

function Head({ look }: { look: Look }) {
  return look.shape === 'bat' ? <Bat fur={look.fur} /> : <Floppy fur={look.fur} />
}

/** Carita ilustrada del perro, con su color de pelaje y forma de orejas. */
export function DogFace({
  look = DEFAULT_LOOK,
  className,
  background = '#ffe4cc',
}: {
  look?: Look
  className?: string
  background?: string | null
}) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      {background && <rect width="100" height="100" fill={background} />}
      <Head look={look} />
    </svg>
  )
}

/** Foto del perro si el dueño la subió; si no, su carita ilustrada. */
export function DogAvatar({ dog, className }: { dog: Pick<Dog, 'name' | 'photo' | 'fur' | 'shape'>; className?: string }) {
  if (dog.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={dog.photo} alt={`Foto de ${dog.name}`} className={cn('object-cover', className)} />
  }
  return <DogFace look={dog} className={className} />
}
