import { Star } from 'lucide-react'

export function Stars({ value = 5, size = 14 }: { value?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.5}
          className={i < Math.round(value) ? 'fill-gold text-gold' : 'fill-ink/10 text-ink/10'}
        />
      ))}
    </span>
  )
}
