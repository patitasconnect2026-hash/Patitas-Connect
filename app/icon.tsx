import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/** Ícono de la app: el isotipo (el perro abrazando al cachorro) sobre crema. Se genera al compilar. */
export default async function Icon() {
  const logo = await readFile(join(process.cwd(), 'public/marca/logo-mark.png'))
  const src = `data:image/png;base64,${logo.toString('base64')}`
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff4ea',
        }}
      >
        <img src={src} width={358} height={380} alt="" />
      </div>
    ),
    size,
  )
}
