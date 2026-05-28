/** Сколько WebM одновременно декодирует браузер — больше даёт лаги на телефоне. */
export const WEBM_MAX_CONCURRENT = 6

/** @type {Map<HTMLVideoElement, 'high' | 'normal'>} */
const registered = new Map()

function playingVideos() {
  return [...registered.keys()].filter((v) => !v.paused && !v.ended)
}

function pickEvictionVictim(except) {
  const playing = playingVideos().filter((v) => v !== except)
  if (playing.length === 0) return null
  const normal = playing.find((v) => registered.get(v) === 'normal')
  return normal ?? playing[0]
}

export function unregisterWebmPreview(video) {
  if (!video) return
  video.pause()
  registered.delete(video)
}

export async function tryPlayWebmPreview(video, priority = 'normal') {
  if (!video) return
  registered.set(video, priority)

  while (playingVideos().length >= WEBM_MAX_CONCURRENT && !playingVideos().includes(video)) {
    const victim = pickEvictionVictim(video)
    if (!victim) break
    unregisterWebmPreview(victim)
  }

  try {
    await video.play()
  } catch {
    registered.delete(video)
  }
}

export function pauseWebmPreview(video) {
  if (!video) return
  video.pause()
  registered.delete(video)
}

export function pauseAllWebmPreviews() {
  for (const video of registered.keys()) {
    video.pause()
  }
  registered.clear()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pauseAllWebmPreviews()
  })
}
