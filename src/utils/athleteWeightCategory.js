import { findGoldStandardRow } from './standards.js'

/**
 * Весовая категория по таблице программы (пол, возраст, вес из анкеты).
 * @param {{ gender?: string, birthYear?: number, weight?: number }} athleteShaped
 * @param {{ fallbackToWeight?: boolean }} [opts]
 */
export function formatAthleteWeightCategory(athleteShaped, opts = {}) {
  const { fallbackToWeight = false } = opts
  const w = Number(athleteShaped?.weight ?? 0)
  if (!w || w < 20) return '—'
  const m = findGoldStandardRow(athleteShaped)
  if (!m) {
    return fallbackToWeight ? `${Math.round(w)} кг (вес из анкеты)` : '—'
  }
  const row = m.row
  if (row.openTop) return `свыше ${Math.floor(row.weightMin)} кг`
  if (row.weightMin === row.weightMax) return `${row.weightMin} кг`
  return `${row.weightMin}–${row.weightMax} кг`
}

/** Короткая подпись без «(вес из анкеты)». */
export function formatAthleteWeightCategoryShort(fullLine) {
  if (!fullLine || fullLine === '—') return fullLine
  return fullLine.replace(/\s*\(вес из анкеты\)/i, '').trim()
}
