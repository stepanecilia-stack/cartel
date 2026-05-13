/**
 * Пороги «уверенности» для Fuse: score ближе к 0 = лучше; confidence = 1 - score.
 * Подбираются консервативно: лучше уточнить, чем записать не тому.
 */
export const VOICE_CONF_STUDENT_MIN = 0.55
export const VOICE_CONF_ATOM_MIN = 0.5
export const VOICE_CONF_LEVEL_MIN = 0.52
/** Если разница между 1-м и 2-м кандидатом меньше — считаем неоднозначностью */
export const VOICE_AMBIGUITY_GAP = 0.09

export function fuseScoreToConfidence(score) {
  if (score == null || !Number.isFinite(score)) return 0
  return Math.max(0, Math.min(1, 1 - score))
}

/**
 * @param {number} c1 confidence первого
 * @param {number|undefined} c2 второго (если нет — не двусмысленно)
 */
export function isAmbiguousPair(c1, c2) {
  if (c2 == null || !Number.isFinite(c2)) return false
  return Math.abs(c1 - c2) < VOICE_AMBIGUITY_GAP
}

export function needsStudentClarify(confidence, secondConfidence) {
  if (confidence < VOICE_CONF_STUDENT_MIN) return true
  if (isAmbiguousPair(confidence, secondConfidence) && confidence < 0.88) return true
  return false
}

export function needsAtomClarify(confidence, secondConfidence) {
  if (confidence < VOICE_CONF_ATOM_MIN) return true
  if (isAmbiguousPair(confidence, secondConfidence) && confidence < 0.85) return true
  return false
}

export function needsLevelClarify(confidence, secondConfidence) {
  if (confidence < VOICE_CONF_LEVEL_MIN) return true
  if (isAmbiguousPair(confidence, secondConfidence) && confidence < 0.9) return true
  return false
}
