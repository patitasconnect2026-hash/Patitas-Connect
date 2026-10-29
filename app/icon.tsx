import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/** Ícono de la app: Chasqui (perro con chullo) dentro del pin de ubicación, en crema sobre naranja. Se genera al compilar. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ea580c',
        }}
      >
        <svg width="380" height="428" viewBox="0 0 64 72">
          <path d="M32 70 C13 51 7 42 7 29 A25 25 0 0 1 57 29 C57 42 51 51 32 70Z" fill="#fff4ea" />
          <ellipse cx="17.5" cy="37" rx="4.8" ry="9.5" transform="rotate(10 17.5 37)" fill="#b45309" />
          <ellipse cx="46.5" cy="37" rx="4.8" ry="9.5" transform="rotate(-10 46.5 37)" fill="#b45309" />
          <circle cx="32" cy="34" r="14.5" fill="#f4b04a" />
          <ellipse cx="32" cy="40.2" rx="6.2" ry="4.6" fill="#fff" opacity="0.45" />
          <path d="M30 44 Q32 49.5 34 44Z" fill="#fb7185" />
          <path d="M28.6 38 Q32 35.2 35.4 38 Q34.6 41.2 32 41.6 Q29.4 41.2 28.6 38Z" fill="#0f172a" />
          <circle cx="26.6" cy="33.2" r="2" fill="#0f172a" />
          <circle cx="37.4" cy="33.2" r="2" fill="#0f172a" />
          <path d="M17.6 27.5 C17.6 15.5 24.4 10 32 8.4 C39.6 10 46.4 15.5 46.4 27.5Z" fill="#ea580c" />
          <rect x="17" y="25.3" width="30" height="3.8" rx="1.2" fill="#fff4ea" opacity="0.9" />
          <circle cx="32" cy="7.6" r="3.6" fill="#9a3412" />
        </svg>
      </div>
    ),
    size,
  )
}
