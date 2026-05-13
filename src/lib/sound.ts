const BELL_URL = "/sounds/bell.wav"

let cached: HTMLAudioElement | null = null

export function playBell(volume = 0.7) {
  if (typeof window === "undefined") return
  try {
    if (!cached) {
      cached = new Audio(BELL_URL)
      cached.preload = "auto"
    }
    const audio = cached.cloneNode(true) as HTMLAudioElement
    audio.volume = Math.max(0, Math.min(1, volume))
    const p = audio.play()
    if (p && typeof p.catch === "function") p.catch(() => {})
  } catch {
    // ignore
  }
}
