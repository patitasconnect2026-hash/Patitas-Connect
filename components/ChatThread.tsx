'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Send } from 'lucide-react'
import { shrinkImage } from '@/lib/store'
import { cn } from '@/lib/utils'

export interface ThreadMsg {
  id: string
  mine: boolean
  text?: string
  /** Foto enviada en el chat (data URL reducida) */
  image?: string
  time: string
}

/** Conversación con envío de texto y fotos. La usan el dueño y el paseador. */
export function ChatThread({
  messages,
  peer,
  typing,
  quick,
  onSend,
  onPhoto,
  sinFotos = false,
  vacio,
}: {
  messages: ThreadMsg[]
  peer: string
  typing?: boolean
  quick: string[]
  onSend: (text: string) => void
  onPhoto: (dataUrl: string) => void
  /** Con servidor las fotos del chat todavía no viajan: no se ofrece el botón de la cámara. */
  sinFotos?: boolean
  /** Lo que se dice mientras no hay ningún mensaje. */
  vacio?: string
}) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, typing])

  const send = (t: string) => {
    const v = t.trim().slice(0, 500)
    if (!v) return
    onSend(v)
    setText('')
  }

  const pick = async (f?: File) => {
    if (!f) return
    try {
      setErr('')
      onPhoto(await shrinkImage(f, 640))
    } catch {
      setErr('No pudimos usar esa foto. Elige otra.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4" aria-live="polite">
        <p className="mx-auto w-fit rounded-full bg-paper px-3 py-1 text-[12px] font-bold text-ink-soft shadow-sm">Hoy</p>
        {messages.length === 0 && vacio && <p className="mx-auto max-w-[280px] text-center text-[14px] leading-snug text-ink-soft">{vacio}</p>}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[82%] overflow-hidden rounded-3xl text-[14px] leading-snug',
                m.image && 'w-64',
                m.mine ? 'rounded-br-lg bg-brand-700 text-white' : 'rounded-bl-lg border border-ink/10 bg-paper text-ink',
              )}
            >
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="Foto enviada en el chat" className="aspect-[4/3] w-full object-cover" />
              )}
              {m.text && <p className="whitespace-pre-wrap break-words px-3.5 pb-1 pt-2.5">{m.text}</p>}
              <p className={cn('px-3.5 pb-2 text-right text-[12px] font-semibold', m.mine ? 'text-white' : 'text-ink-soft')}>{m.time}</p>
            </div>
          </motion.div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-3xl rounded-bl-lg border border-ink/10 bg-paper px-4 py-3.5" aria-label={`${peer} está escribiendo`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40" style={{ animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-ink/10 bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
        <div className="no-scrollbar -mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} className="min-h-11 shrink-0 rounded-full bg-sand px-3.5 py-2 text-[14px] font-bold text-ink active:scale-95">
              {q}
            </button>
          ))}
        </div>
        {err && <p className="mb-2 text-[14px] font-semibold text-red-600">{err}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(text)
          }}
          className="flex items-center gap-2"
        >
          {!sinFotos && (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Enviar una foto"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sand text-ink active:scale-95"
              >
                <Camera size={20} />
              </button>
            </>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={`Escríbele a ${peer}…`}
            aria-label="Mensaje"
            className="h-12 min-w-0 flex-1 rounded-full bg-sand px-4 text-[16px] text-ink outline-hidden placeholder:text-ink-soft focus:ring-2 focus:ring-brand-600/30"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!text.trim()}
            className="btn-press grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-700 text-white shadow-press disabled:bg-ink/15 disabled:text-ink-soft disabled:shadow-none"
          >
            <Send size={19} />
          </button>
        </form>
      </div>
    </>
  )
}
