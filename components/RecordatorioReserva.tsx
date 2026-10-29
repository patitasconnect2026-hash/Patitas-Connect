'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Job } from '@/lib/bus'
import { CONFIG } from '@/lib/config'
import { guardarRecordados, leerRecordados } from '@/lib/datos'
import { clavesQueQuedanAvisadas, recordatoriosQueTocan } from '@/lib/recordatorios'
import { recordatorioCuerpo, TEXTO_RESERVAS } from '@/lib/reservasTextos'
import { NotificationBanner, type Toast } from './NotificationBanner'

/**
 * Recordatorio de la reserva aceptada («1 hora antes», `CONFIG.recordatoriosReservaMin`) para la familia y para el paseador.
 * Solo funciona con la app abierta: con el navegador cerrado todavía no hay aviso (ver docs/PUBLICAR.md).
 */
export function RecordatorioReserva({ job, quien, alAvisar }: { job: Job | null; quien: 'familia' | 'paseador'; alAvisar?: () => void }) {
  const [aviso, setAviso] = useState<Toast | null>(null)

  useEffect(() => {
    if (!job) return
    const revisar = () => {
      const ya = leerRecordados()
      const r = recordatoriosQueTocan([job], Date.now(), ya)[0]
      if (!r) return
      clavesQueQuedanAvisadas(r).forEach((c) => ya.add(c))
      guardarRecordados(ya)
      const hora = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima' }).format(r.inicio)
      const otro = quien === 'familia' ? job.walkerFirst : job.ownerFirst
      setAviso({
        id: `rec-${r.clave}`,
        title: quien === 'familia' ? TEXTO_RESERVAS.recordatorioFamiliaTitulo : TEXTO_RESERVAS.recordatorioPaseadorTitulo,
        body: recordatorioCuerpo(quien, otro, job.dog.name, r.minutos, hora),
      })
      alAvisar?.()
    }
    const primero = setTimeout(revisar, 0)
    const cada = setInterval(revisar, CONFIG.segundosEntreRecordatorios * 1000)
    return () => {
      clearTimeout(primero)
      clearInterval(cada)
    }
  }, [job, quien, alAvisar])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 8000)
    return () => clearTimeout(t)
  }, [aviso])

  return <AnimatePresence>{aviso && <NotificationBanner key={aviso.id} toast={aviso} onOpen={() => setAviso(null)} />}</AnimatePresence>
}
