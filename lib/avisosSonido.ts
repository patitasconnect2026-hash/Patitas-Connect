'use client'

/**
 * El sonido y la vibración de los avisos. Sin archivos de audio: un pitido corto hecho con Web Audio. El navegador solo deja sonar
 * después de que la persona toca la pantalla; si no deja, el aviso queda en la vibración y la insignia (nunca rompe).
 */
let contexto: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    if (contexto) return contexto
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    contexto = new Ctor()
    return contexto
  } catch {
    return null
  }
}

/** Se llama desde un toque de la persona: deja el sonido listo para los avisos que lleguen solos. */
export function prepararSonido(): void {
  const c = audio()
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined)
}

export function sonar(): void {
  const c = audio()
  if (!c || c.state !== 'running') return
  try {
    const t = c.currentTime
    for (const [i, hz] of [880, 1175].entries()) {
      const osc = c.createOscillator()
      const vol = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      vol.gain.setValueAtTime(0.0001, t + i * 0.16)
      vol.gain.exponentialRampToValueAtTime(0.25, t + i * 0.16 + 0.02)
      vol.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.14)
      osc.connect(vol).connect(c.destination)
      osc.start(t + i * 0.16)
      osc.stop(t + i * 0.16 + 0.15)
    }
  } catch {
    // Sin sonido: queda la vibración y la insignia.
  }
}

export function vibrar(): void {
  try {
    navigator.vibrate?.([120, 60, 120])
  } catch {
    // Algunos navegadores no dejan vibrar.
  }
}
