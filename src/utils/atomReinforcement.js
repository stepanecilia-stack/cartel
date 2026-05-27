/**
 * Упрочнение навыка: счётчик отработок атома в зале (вариант А).
 * Звёзды на карточке считаются автоматически от total.
 */

import { isAtomReinforceableInIsolation } from './atomReinforcementEligibility.js'

/** Пороги total → число заполненных звёзд (0–5). */
export const REINFORCEMENT_STAR_THRESHOLDS = [1, 3, 8, 15, 25]

/**
 * @param {unknown} raw
 * @returns {Record<string, { total: number, lastAt?: string }>}
 */
export function normalizeAtomReinforcement(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [atomId, entry] of Object.entries(raw)) {
    if (typeof atomId !== 'string' || !atomId) continue
    if (!entry || typeof entry !== 'object') continue
    const total = Math.max(0, Math.floor(Number(entry.total) || 0))
    const lastAt = typeof entry.lastAt === 'string' && entry.lastAt.trim() ? entry.lastAt.trim() : undefined
    if (total > 0 || lastAt) {
      out[atomId] = lastAt ? { total, lastAt } : { total }
    }
  }
  return out
}

/**
 * @param {Record<string, { total?: number }> | null | undefined} map
 * @param {string} atomId
 */
export function getAtomReinforcementTotal(map, atomId) {
  if (!map || !atomId) return 0
  return Math.max(0, Math.floor(Number(map[atomId]?.total) || 0))
}

/**
 * Сумма отработок по атомам программы, которые можно отмечать отдельно (для рейтинга).
 * @param {unknown} atomReinforcementRaw
 * @param {Array<{ id?: string, number?: string | number, kind?: string }>} programAtoms
 */
export function sumReinforceableProgramPractices(atomReinforcementRaw, programAtoms) {
  const map = normalizeAtomReinforcement(atomReinforcementRaw)
  if (!Array.isArray(programAtoms)) return 0
  let total = 0
  for (const atom of programAtoms) {
    if (!atom?.id || !isAtomReinforceableInIsolation(atom)) continue
    total += getAtomReinforcementTotal(map, atom.id)
  }
  return total
}

/**
 * @param {number} total
 * @returns {number} 0–5
 */
export function reinforcementStarCount(total) {
  const n = Math.max(0, Math.floor(Number(total) || 0))
  let stars = 0
  for (const threshold of REINFORCEMENT_STAR_THRESHOLDS) {
    if (n >= threshold) stars += 1
    else break
  }
  return stars
}

/**
 * @param {Record<string, { total?: number, lastAt?: string }> | null | undefined} existing
 * @param {Iterable<string>} atomIds
 * @param {string} [practicedAt] ISO date YYYY-MM-DD
 */
export function applyPracticedAtomsToReinforcement(existing, atomIds, practicedAt) {
  const base = normalizeAtomReinforcement(existing)
  const next = { ...base }
  const day =
    typeof practicedAt === 'string' && practicedAt.trim()
      ? practicedAt.trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  const unique = [...new Set([...atomIds].filter((id) => typeof id === 'string' && id))]
  for (const atomId of unique) {
    const prev = next[atomId]?.total ?? 0
    next[atomId] = { total: prev + 1, lastAt: day }
  }
  return next
}

/**
 * @param {...Record<string, { total?: number, lastAt?: string }> | null | undefined} maps
 */
export function mergeAtomReinforcementRecords(...maps) {
  const out = {}
  for (const map of maps) {
    const norm = normalizeAtomReinforcement(map)
    for (const [atomId, entry] of Object.entries(norm)) {
      const prev = out[atomId]
      if (!prev || entry.total > prev.total) {
        out[atomId] = { ...entry }
      } else if (prev && entry.total === prev.total) {
        const prevDate = prev.lastAt ?? ''
        const nextDate = entry.lastAt ?? ''
        if (nextDate > prevDate) out[atomId] = { total: prev.total, lastAt: nextDate }
      }
    }
  }
  return out
}
