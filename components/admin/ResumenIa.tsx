'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useServidor } from '@/lib/datos'
import { estadoDeLaIa, pedidoParaLaIa, textoDeMotivoIa } from '@/lib/iaApoyo'
import { TEXTO_IA } from '@/lib/iaTextos'
import type { QuizResult } from '@/lib/quiz'
import { clienteIaDeLaApp } from '@/lib/servidor/cliente'
import type { ResumenDeApoyo } from '../../supabase/functions/_shared/resumen'
import { btnSoft } from '@/lib/ui'
import { cn } from '@/lib/utils'

type Pantalla = { tipo: 'nada' } | { tipo: 'cargando' } | { tipo: 'mensaje'; texto: string } | { tipo: 'listo'; resumen: ResumenDeApoyo }

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[13px] font-extrabold text-ink-soft">{titulo}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[14.5px] leading-snug text-ink">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * «Resumen de apoyo con IA»: apagado por defecto (lib/config.ts). La llamada va a una Edge Function de Supabase con la clave en sus
 * secretos. Antes de enviar se quitan nombre, DNI, teléfono y correo. La IA solo ayuda: «Ayuda para el equipo. Decide una persona.»
 */
export function ResumenIa({ paseadorId, quiz, persona }: { paseadorId: string | null; quiz?: QuizResult; persona: { nombres: readonly string[]; dni?: string; telefono?: string } }) {
  const servidor = useServidor()
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'nada' })
  const estado = estadoDeLaIa()

  const pedir = async () => {
    if (pantalla.tipo === 'cargando') return
    if (estado === 'apagada') return setPantalla({ tipo: 'mensaje', texto: TEXTO_IA.apagado })
    if (estado === 'aviso_pendiente') return setPantalla({ tipo: 'mensaje', texto: TEXTO_IA.avisoPendiente })
    if (!servidor.activo || servidor.rol !== 'equipo' || !paseadorId) return setPantalla({ tipo: 'mensaje', texto: TEXTO_IA.sinServidor })
    const pedido = pedidoParaLaIa(paseadorId, quiz, persona)
    if (!pedido) return setPantalla({ tipo: 'mensaje', texto: TEXTO_IA.sinRespuestas })
    setPantalla({ tipo: 'cargando' })
    const cliente = await clienteIaDeLaApp()
    const r = cliente ? await cliente.resumir(pedido) : ({ ok: false, motivo: 'sin_conexion' } as const)
    setPantalla(r.ok ? { tipo: 'listo', resumen: r.resumen } : { tipo: 'mensaje', texto: textoDeMotivoIa(r.motivo) })
  }

  return (
    <div className="mt-4 rounded-2xl border border-ink/10 p-4">
      <button type="button" onClick={() => void pedir()} disabled={pantalla.tipo === 'cargando'} className={cn(btnSoft, 'h-12 gap-2 px-5 text-[14px] disabled:opacity-60')}>
        <Sparkles size={16} aria-hidden /> {pantalla.tipo === 'cargando' ? TEXTO_IA.botonCargando : TEXTO_IA.boton}
      </button>
      <p className="mt-2 text-[13px] leading-snug text-ink-soft">{TEXTO_IA.quitado}</p>
      <div aria-live="polite" className="mt-2 space-y-3">
        {pantalla.tipo === 'mensaje' && <p className="rounded-2xl bg-amber-50 p-3 text-[14px] font-bold text-amber-900">{pantalla.texto}</p>}
        {pantalla.tipo === 'listo' && (
          <>
            <Lista titulo={TEXTO_IA.tituloResumen} items={pantalla.resumen.resumen} />
            <Lista titulo={TEXTO_IA.tituloRevisar} items={pantalla.resumen.revisar} />
            <Lista titulo={TEXTO_IA.tituloPreguntas} items={pantalla.resumen.preguntas} />
          </>
        )}
        {(pantalla.tipo === 'listo' || pantalla.tipo === 'mensaje') && <p className="text-[14px] font-extrabold text-ink">{TEXTO_IA.fijo}</p>}
      </div>
    </div>
  )
}
