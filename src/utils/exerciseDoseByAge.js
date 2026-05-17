/**
 * @param {number} ageInt
 * @returns {'u12' | '13-15' | '16+'}
 */
export function ageToDoseBand(ageInt) {
  if (!Number.isFinite(ageInt)) return '16+'
  if (ageInt <= 12) return 'u12'
  if (ageInt <= 15) return '13-15'
  return '16+'
}

/**
 * @param {number} ageInt
 * @param {{ doseUnder12?: string, dose13to15?: string, dose16Plus?: string }} exercise
 * @returns {{ text: string, band: 'u12' | '13-15' | '16+', bandLabel: string } | null}
 */
export function pickDoseForAge(ageInt, exercise) {
  if (!exercise || !Number.isFinite(ageInt)) return null
  const band = ageToDoseBand(ageInt)
  const raw =
    band === 'u12'
      ? exercise.doseUnder12
      : band === '13-15'
        ? exercise.dose13to15
        : exercise.dose16Plus
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return null
  const bandLabel = band === 'u12' ? 'до 12' : band === '13-15' ? '13–15' : '16+'
  return { text, band, bandLabel }
}
