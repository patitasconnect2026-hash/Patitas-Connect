import { TriangleAlert } from 'lucide-react'
import { TEXTO_ADMIN } from '@/lib/adminTextos'
import { VerMas } from '../ui/VerMas'

/**
 * Lo primero que se lee en /admin. Sin servidor (modo local) no está protegido de verdad y no hay forma honesta de
 * hacerlo: no se pone ninguna contraseña en el código. Con una cuenta del equipo dentro (`conSesion`) se dice lo
 * verdadero: la cuenta se comprueba en la base, pero los datos de la pantalla siguen en este navegador.
 */
export function AvisoAdmin({ conSesion = false }: { conSesion?: boolean }) {
  if (conSesion) {
    return (
      <section aria-labelledby="aviso-admin" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <h2 id="aviso-admin" className="flex items-center gap-2 text-[16px] font-extrabold">
          <TriangleAlert size={19} className="shrink-0" /> {TEXTO_ADMIN.avisoTituloEquipo}
        </h2>
        <div className="mt-1.5 space-y-0.5 text-[14px] font-semibold leading-snug">
          {TEXTO_ADMIN.avisoEquipo.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
        <VerMas abrir={TEXTO_ADMIN.avisoMasAbrirEquipo} className="text-amber-900">
          <p>{TEXTO_ADMIN.avisoMasEquipo}</p>
        </VerMas>
      </section>
    )
  }
  return (
    <section aria-labelledby="aviso-admin" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <h2 id="aviso-admin" className="flex items-center gap-2 text-[16px] font-extrabold">
        <TriangleAlert size={19} className="shrink-0" /> {TEXTO_ADMIN.avisoTitulo}
      </h2>
      <div className="mt-1.5 space-y-0.5 text-[14px] font-semibold leading-snug">
        {TEXTO_ADMIN.aviso.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <VerMas abrir={TEXTO_ADMIN.avisoMasAbrir} className="text-amber-900">
        <p>{TEXTO_ADMIN.avisoMas}</p>
        <p className="mt-2 font-bold">{TEXTO_ADMIN.protegerTitulo}:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {TEXTO_ADMIN.proteger.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </VerMas>
    </section>
  )
}
