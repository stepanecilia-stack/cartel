import { mapStudentCombinations } from './telegramTechnicalProgram.js'

const MASTERED = new Set(['MOTOR_SKILL_LEVEL_1', 'MOTOR_SKILL_LEVEL_2', 'AUTOMATED'])

/** @param {unknown} level */
function normalizeLevel(level) {
  const key = String(level ?? 'NOT_LEARNED').toUpperCase().trim()
  if (key === 'NONE' || key === 'NOT_STUDIED' || key === '') return 'NOT_LEARNED'
  return key
}

/** @param {unknown} raw */
function normalizeStudentTechnicalData(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue
    out[k] = { ...v, level: normalizeLevel(v.level) }
  }
  return out
}

/**
 * @param {object[]} orderedAtoms
 * @param {Record<string, { level?: string }>} technicalData
 */
export function countLeadingMasteredAtoms(orderedAtoms, technicalData) {
  if (!Array.isArray(orderedAtoms) || !orderedAtoms.length) return 0
  const data = technicalData && typeof technicalData === 'object' ? technicalData : {}
  let count = 0
  for (const atom of orderedAtoms) {
    const level = normalizeLevel(data[atom?.id]?.level)
    if (MASTERED.has(level)) count += 1
    else break
  }
  return count
}

/** @param {object | null | undefined} atom */
function atomLabel(atom) {
  if (!atom) return '—'
  const num = atom.number != null && String(atom.number).trim() !== '' ? `#${atom.number}` : ''
  const name = String(atom.name ?? '').trim()
  return `${num} ${name}`.trim() || '—'
}

/**
 * Точка остановки — как resolveCoachTechniqueStopPoint в приложении.
 * @param {{ orderedL1: object[], orderedL2: object[], orderedL3: object[] }} atoms
 * @param {Record<string, { level?: string }>} data
 */
export function resolveCoachTechniqueStopPoint({ orderedL1, orderedL2, orderedL3 }, data) {
  const tiers = [
    { atoms: orderedL1 },
    { atoms: orderedL2 },
    { atoms: orderedL3 },
  ].filter((t) => t.atoms.length > 0)

  if (!tiers.length) return null

  /** @type {object | null} */
  let lastStop = null

  for (const tier of tiers) {
    const total = tier.atoms.length
    const mastered = countLeadingMasteredAtoms(tier.atoms, data)
    if (mastered <= 0) {
      return (
        lastStop ?? {
          currentLabel: '—',
          nextLabel: atomLabel(tier.atoms[0]),
          allTiersClosed: false,
          notStarted: true,
        }
      )
    }

    const step = Math.min(mastered, total)
    const currentAtom = tier.atoms[step - 1]
    const tierClosed = mastered >= total
    const stop = {
      currentLabel: atomLabel(currentAtom),
      nextLabel: !tierClosed && tier.atoms[step] ? atomLabel(tier.atoms[step]) : null,
      allTiersClosed: false,
      notStarted: false,
    }
    lastStop = stop
    if (!tierClosed) return stop
  }

  if (lastStop) {
    return { ...lastStop, allTiersClosed: true, nextLabel: null }
  }
  return null
}

/**
 * @param {object} student
 * @param {{ level1: object[], level2: object[], level3: object[] }} program
 */
export function buildStudentTechniqueProgress(student, program) {
  const data = normalizeStudentTechnicalData(student?.technicalData)
  const orderedL1 = program.level1
  const orderedL2 = program.level2
  const orderedL3 = mapStudentCombinations(
    student?.technicalCombinations,
    program.level3,
    orderedL1,
  )

  const stop = resolveCoachTechniqueStopPoint(
    { orderedL1, orderedL2, orderedL3 },
    data,
  )

  if (!stop) {
    return { complete: false, currentLabel: '—', nextLabel: null, notStarted: true }
  }

  return {
    complete: stop.allTiersClosed,
    currentLabel: stop.currentLabel,
    nextLabel: stop.nextLabel,
    notStarted: stop.notStarted,
  }
}

/** @param {string} raw */
export function escapeTelegramHtml(raw) {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * @param {string} studentName
 * @param {ReturnType<typeof buildStudentTechniqueProgress>} progress
 */
export function formatStudentTechniqueBlock(studentName, progress) {
  const name = escapeTelegramHtml(studentName)
  if (progress.complete) {
    return `<b>${name}</b>\nПрограмма изучена`
  }
  const lines = [`<b>${name}</b>`]
  if (progress.notStarted) {
    lines.push(`Следующий: ${escapeTelegramHtml(progress.nextLabel ?? '—')}`)
  } else {
    lines.push(`Текущий: ${escapeTelegramHtml(progress.currentLabel)}`)
    if (progress.nextLabel) {
      lines.push(`Следующий: ${escapeTelegramHtml(progress.nextLabel)}`)
    }
  }
  return lines.join('\n')
}
