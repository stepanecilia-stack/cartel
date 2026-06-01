/** Псевдослучайное 0..1 по строке (стабильный кадр для одного атома). */
export function seededUnitRandom(seed) {
  let h = 2166136261
  const s = String(seed ?? '')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** Время кадра-заставки внутри ролика (секунды). */
export function pickWebmCoverTime(duration, seed) {
  if (!Number.isFinite(duration) || duration <= 0.15) return 0
  const r = seededUnitRandom(seed)
  const margin = Math.min(duration * 0.08, 0.4)
  const inner = Math.max(0, duration - margin * 2)
  return margin + r * inner
}
