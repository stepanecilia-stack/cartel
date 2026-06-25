import { parseTechniqueLevelFromText, findProgramAtomByMention } from './cartelStudentWrite.js'
import { mapStudentCombinations } from './telegramTechnicalProgram.js'
import { buildStudentTechniqueProgress } from './telegramTechnicalProgress.js'

/** @param {string} text */
function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

/** @param {object | null | undefined} atom */
function atomDisplayLabel(atom) {
  if (!atom) return '—'
  const num = atom.number != null && String(atom.number).trim() !== '' ? `#${atom.number}` : ''
  const name = String(atom.name ?? '').trim()
  return `${num} ${name}`.trim() || '—'
}

/**
 * @param {object} student
 * @param {{ level1: object[], level2: object[], level3: object[] }} program
 */
export function getOrderedProgramAtoms(student, program) {
  const orderedL3 = mapStudentCombinations(
    student?.technicalCombinations,
    program.level3,
    program.level1,
  )
  return [...program.level1, ...program.level2, ...orderedL3]
}

/**
 * @param {object[]} allAtoms
 * @param {string} label
 */
export function findAtomByDisplayLabel(allAtoms, label) {
  const target = normalize(label)
  if (!target || target === '—') return null

  for (const atom of allAtoms) {
    if (normalize(atomDisplayLabel(atom)) === target) return atom
  }
  for (const atom of allAtoms) {
    const lbl = normalize(atomDisplayLabel(atom))
    if (lbl.includes(target) || target.includes(lbl)) return atom
  }
  for (const atom of allAtoms) {
    const name = normalize(String(atom.name ?? ''))
    if (name && (target.includes(name) || name.includes(target))) return atom
  }
  return null
}

/** @param {string} text */
export function isTechniqueAdvanceCommand(text) {
  const l = normalize(text)
  if (!l) return false
  if (parseTechniqueLevelFromText(text)) return false
  return (
    /следующ[\p{L}]*\s*(?:этап|шаг|элемент|при[её]м|уровень)/u.test(l) ||
    /(?:^|\s)(?:дальше|вперед|вперёд|продолжаем|продолжим)(?:\s|$)/u.test(l) ||
    /(?:переход|переш[\p{L}]*|перевел[\p{L}]*|перевед[\p{L}]*)\s*(?:на\s*)?(?:следующ|этап|техник|умение)/u.test(l) ||
    /(?:на\s+)?(?:следующ[\p{L}]*\s*)?умение\b/u.test(l) ||
    /отмет[\p{L}]*\s+(?:умение|этап)/u.test(l) ||
    /(?:закрыл[\p{L}]*|освоил[\p{L}]*|готов)\s*(?:элемент|при[её]м|шаг)?/u.test(l) ||
    /переход\s+на\s+следующ/u.test(l)
  )
}

/** @param {string} text */
export function looksLikeTechniqueWrite(text) {
  const l = normalize(text)
  if (!l) return false
  if (isTechniqueAdvanceCommand(text)) return true
  if (
    parseTechniqueLevelFromText(text) &&
    /техник|этап|при[её]м|элемент|#\d|\d+|переход|умение|навык|знан|автомат/u.test(l)
  ) {
    return true
  }
  if (/запиш|внес|зафикси|постав|отмет/.test(l) && /техник|этап|умение|знан|навык|автомат|при[её]м/.test(l)) {
    return true
  }
  return false
}

/**
 * @param {object} student
 * @param {{ level1: object[], level2: object[], level3: object[] }} program
 * @param {string} userText
 * @param {string} [atomHint]
 */
export function resolveTechniqueAtomForStudent(student, program, userText, atomHint = '') {
  const combined = [atomHint, userText].filter(Boolean).join(' ')
  const fromHint = findProgramAtomByMention(program, atomHint)
  if (fromHint) return fromHint

  const fromText = findProgramAtomByMention(program, userText)
  if (fromText) return fromText

  if (!isTechniqueAdvanceCommand(userText) && !atomHint) return null

  const allAtoms = getOrderedProgramAtoms(student, program)
  const progress = buildStudentTechniqueProgress(student, program)

  if (progress.nextLabel) {
    const nextAtom = findAtomByDisplayLabel(allAtoms, progress.nextLabel)
    if (nextAtom) return nextAtom
  }
  if (progress.currentLabel && progress.currentLabel !== '—') {
    const currentAtom = findAtomByDisplayLabel(allAtoms, progress.currentLabel)
    if (currentAtom) return currentAtom
  }

  return findProgramAtomByMention(program, combined)
}

/**
 * @param {string} userText
 * @param {string} [levelHint]
 */
export function resolveTechniqueLevelForWrite(userText, levelHint = '') {
  return (
    parseTechniqueLevelFromText(userText) ??
    parseTechniqueLevelFromText(levelHint) ??
    (isTechniqueAdvanceCommand(userText) ? 'MOTOR_SKILL_LEVEL_1' : null)
  )
}

/**
 * @param {object} student
 * @param {{ level1: object[], level2: object[], level3: object[] }} program
 * @param {string} userText
 * @param {{ elementName?: string, levelHint?: string }} [hints]
 */
export function resolveTechniqueWriteRequest(student, program, userText, hints = {}) {
  const elementName = hints.elementName ?? ''
  const atom = resolveTechniqueAtomForStudent(student, program, userText, elementName)
  if (!atom) {
    return {
      ok: false,
      error:
        'Не нашёл элемент техники. Назовите приём («прямой в голову») или скажите «следующий этап» для текущего шага программы.',
    }
  }

  const level = resolveTechniqueLevelForWrite(userText, hints.levelHint ?? '')
  const atomLabel = atomDisplayLabel(atom)

  if (!level) {
    return {
      ok: false,
      error: `Элемент «${atomLabel}» понял. Скажите этап: знание, умение, навык, автомат — или «следующий этап» (будет умение).`,
      partial: {
        kind: 'technique',
        atomId: atom.id,
        atomLabel,
      },
    }
  }

  return {
    ok: true,
    atom,
    level,
    atomLabel,
  }
}
