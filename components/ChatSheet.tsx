'use client'

import { Camera, X } from 'lucide-react'
import { TEXTO_SERVIDOR } from '@/lib/servidor/paseosTextos'
import type { ChatMessage, Walk } from '@/lib/types'
import { AvisoDeServidor } from './AvisoDeServidor'
import { ChatThread, type ThreadMsg } from './ChatThread'
import { EtiquetaEjemplo } from './ui/EtiquetaEjemplo'
import { SelloPaseador } from './ui/Logo'
import { PortraitAvatar } from './ui/PortraitAvatar'
import { Sheet } from './ui/Sheet'

export function ChatSheet({
  walk,
  messages,
  walkerOnline,
  actividad = null,
  conServidor = false,
  onSend,
  onPhoto,
  onClose,
}: {
  walk: Walk
  messages: ChatMessage[]
  /** Hay un paseador real conectado en otra pestaña */
  walkerOnline: boolean
  /** Con servidor: «Activo hace 3 min» según lo último que hizo el paseador (null = no se sabe: no se dice nada). */
  actividad?: string | null
  /**
   * El chat vive en el servidor (cada mensaje llega al otro teléfono). Por ahora ahí solo se escribe: las fotos del chat
   * llegan con el paso de las fotos; sin internet se explica y los mensajes se envían solos al volver.
   */
  conServidor?: boolean
  onSend: (text: string) => void
  onPhoto: (dataUrl: string) => void
  onClose: () => void
}) {
  const { booking: b } = walk
  const quick = ['¿Todo bien? 👀', `¡Gracias ${b.walker.firstName}!`, 'Mándame otra foto 📸']
  const thread: ThreadMsg[] = messages.map((m) => ({
    id: m.id,
    mine: m.from === 'owner',
    text: m.text,
    image: m.image,
    time: m.time,
  }))

  return (
    <Sheet label={`Chat con ${b.walker.name}`} onClose={onClose} full>
      <header className="flex items-center gap-3 border-b border-ink/10 px-5 pb-3 pt-3">
        <div className="relative">
          <PortraitAvatar portrait={b.walker.portrait} photo={b.walker.photo} alt={b.walker.name} className="h-11 w-11 rounded-full border border-ink/10" />
          <SelloPaseador comprobaciones={b.walker.comprobaciones} size={18} className="absolute -bottom-1 -right-1" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-display text-[19px] font-bold leading-tight text-ink">
            <span className="truncate">{b.walker.name}</span>
            {b.walker.esEjemplo && <EtiquetaEjemplo />}
          </p>
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-forest">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" />
            {walkerOnline ? 'Conectado ahora' : (actividad ?? (walk.phase === 'completed' ? `Paseó a ${b.dog.name}` : `Paseando a ${b.dog.name}`))}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar chat" className="grid h-11 w-11 place-items-center rounded-full bg-sand text-ink active:scale-95">
          <X size={18} />
        </button>
      </header>

      <div className="flex items-start gap-2 bg-brand-50 px-5 py-2.5 text-[12px] font-semibold leading-snug text-brand-800">
        <Camera size={15} className="mt-0.5 shrink-0" />
        {conServidor ? TEXTO_SERVIDOR.chatSinFotos : 'Las fotos del paseo llegan en «Paseo», con su hora y su lugar. Aquí puedes escribir y mandar fotos.'}
      </div>

      {conServidor && <AvisoDeServidor className="px-0" />}

      <ChatThread
        messages={thread}
        peer={b.walker.firstName}
        typing={walk.typing}
        quick={quick}
        onSend={onSend}
        onPhoto={onPhoto}
        sinFotos={conServidor}
        vacio={conServidor ? TEXTO_SERVIDOR.chatVacio : undefined}
      />
    </Sheet>
  )
}
