import Fuse from 'fuse.js'
import { TECH_DOMINANCE_OPTIONS } from './ksrUtils.js'
import { resolveSequenceOrderIndex, TECH_SEQUENCE_NAME_HINTS } from './technicalProgramProgress.js'
import { fuseScoreToConfidence } from './voiceCoachConfidence.js'

function normQ(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .trim()
}

const fuseBase = {
  ignoreLocation: true,
  includeScore: true,
}

const fuseStudentOptions = {
  ...fuseBase,
  keys: ['needle'],
  threshold: 0.42,
  minMatchCharLength: 1,
}

const fuseAtomOptions = {
  ...fuseBase,
  keys: ['needle'],
  threshold: 0.5,
  minMatchCharLength: 2,
}

const fuseLevelOptions = {
  ...fuseBase,
  keys: ['needle'],
  threshold: 0.38,
  minMatchCharLength: 1,
}

const LEVEL_NEEDLE_EXTRA = {
  NOT_LEARNED: 'не изучен не изучена сброс ноль',
  KNOWLEDGE: 'знание теория знает',
  MOTOR_SKILL_LEVEL_1: 'умение первый моторный один',
  MOTOR_SKILL_LEVEL_2: 'навык второй моторный два',
  AUTOMATED: 'автоматизм автоматически автомат',
}

/**
 * @param {Array<{ id: string, name: string }>} students — name: отображаемое ФИО
 */
export function buildStudentFuseIndex(students) {
  const list = (students || []).map((s) => ({
    id: s.id,
    displayName: String(s.name ?? '').trim() || 'Без имени',
    needle: normQ(s.name),
  }))
  return new Fuse(list, fuseStudentOptions)
}

/**
 * @param {object[]} atoms
 */
export function buildTechnicalAtomFuseIndex(atoms) {
  if (!Array.isArray(atoms) || atoms.length === 0) return new Fuse([], fuseAtomOptions)
  const list = atoms.map((atom) => {
    const idx = resolveSequenceOrderIndex(atom)
    const hints = Array.isArray(TECH_SEQUENCE_NAME_HINTS[idx]) ? TECH_SEQUENCE_NAME_HINTS[idx] : []
    const needle = [atom?.name, ...hints].filter(Boolean).join(' | ')
    return {
      id: atom.id,
      label: String(atom?.name ?? '').trim() || 'Элемент',
      needle: needle.toLowerCase().replace(/ё/g, 'е'),
    }
  })
  return new Fuse(list, fuseAtomOptions)
}

export function buildLevelFuseIndex() {
  const list = TECH_DOMINANCE_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
    needle: `${o.key} ${o.label} ${LEVEL_NEEDLE_EXTRA[o.key] || ''}`.toLowerCase().replace(/ё/g, 'е'),
  }))
  return new Fuse(list, fuseLevelOptions)
}

function mapHit(h) {
  const sc = h.score
  return {
    score: sc,
    confidence: fuseScoreToConfidence(sc),
    item: h.item,
  }
}

export function fuzzyTopStudents(fuse, query, limit = 4) {
  const q = normQ(query)
  if (!q || !fuse) return []
  return fuse.search(q, { limit }).map((h) => {
    const m = mapHit(h)
    return {
      id: m.item.id,
      label: m.item.displayName,
      score: m.score,
      confidence: m.confidence,
    }
  })
}

export function fuzzyTopAtoms(fuse, query, limit = 4) {
  const q = normQ(query)
  if (!q || !fuse) return []
  return fuse.search(q, { limit }).map((h) => {
    const m = mapHit(h)
    return {
      id: m.item.id,
      label: m.item.label,
      score: m.score,
      confidence: m.confidence,
    }
  })
}

export function fuzzyTopLevels(fuse, query, limit = 4) {
  const q = normQ(query)
  if (!q || !fuse) return []
  return fuse.search(q, { limit }).map((h) => {
    const m = mapHit(h)
    return {
      key: m.item.key,
      label: m.item.label,
      score: m.score,
      confidence: m.confidence,
    }
  })
}

/** @deprecated используйте fuzzyTop* + пороги; оставлено для совместимости */
export function fuzzyBestStudent(fuse, query) {
  const top = fuzzyTopStudents(fuse, query, 1)
  if (!top.length) return null
  return { id: top[0].id, name: top[0].label, score: top[0].score }
}

export function fuzzyBestAtom(fuse, query) {
  const top = fuzzyTopAtoms(fuse, query, 1)
  if (!top.length) return null
  return { id: top[0].id, name: top[0].label, score: top[0].score }
}

export function fuzzyBestLevelKey(fuse, query) {
  const top = fuzzyTopLevels(fuse, query, 1)
  if (!top.length) return null
  return top[0].key
}
