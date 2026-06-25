import { athleteShapeFromStudent, getNormsForAthlete } from './telegramNormsLite.js'
import {
  buildNormItems,
  buildStudentPhysicalValues,
  summarizeNormsForValues,
} from './telegramNormResults.js'
import {
  displayName,
  getStudentById,
  loadLegacyNorms,
} from './telegramCoachData.js'

const READ_ONLY_FOOTER =
  '\n\n<i>Запись: «запиши … норматив/технику» — с подтверждением.</i>'

/**
 * @param {object} student
 * @param {object[]} allNorms
 */
export function formatStudentSummary(student, allNorms) {
  const name = displayName(student)
  const a = athleteShapeFromStudent(student)
  const gender = a.gender === 'F' ? 'Ж' : 'М'
  const birth = a.birthYear ? `${a.birthYear} г.р.` : 'г.р. ?'
  const anthro = [
    a.height > 0 ? `рост ${a.height}` : null,
    a.weight > 0 ? `вес ${a.weight}` : null,
    a.reach > 0 ? `размах ${a.reach}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const tech = formatTechniqueLine(student)
  const normsLine = formatNormsCountLine(student, allNorms)

  return [
    `<b>${escapeHtml(name)}</b> (${gender}, ${escapeHtml(birth)})`,
    anthro ? `Антропометрия: ${escapeHtml(anthro)} см.` : 'Антропометрия: не заполнена.',
    `Техника: ${escapeHtml(tech)}`,
    normsLine,
    READ_ONLY_FOOTER,
  ].join('\n')
}

/**
 * @param {object} student
 */
function formatTechniqueLine(student) {
  const data = student?.technicalData
  if (!data || typeof data !== 'object') return 'нет данных'
  const entries = Object.entries(data).filter(([, v]) => v && typeof v === 'object')
  if (!entries.length) return 'не начата'
  let mastered = 0
  for (const [, v] of entries) {
    const level = String(v.level ?? '').toUpperCase()
    if (level && level !== 'NOT_STUDIED' && level !== 'NONE') mastered += 1
    else break
  }
  if (mastered <= 0) return 'не начата'
  return `освоено шагов по программе: ${mastered} (см. карточку для точки остановки)`
}

/**
 * @param {object} student
 * @param {object[]} allNorms
 */
function formatNormsCountLine(student, allNorms) {
  const athlete = athleteShapeFromStudent(student)
  const norms = getNormsForAthlete(allNorms, athlete)
  if (!athlete.birthYear) return 'Нормативы: укажите год рождения в карточке ученика.'
  if (!norms.length) return 'Нормативы: нет списка для возраста/пола.'
  const values = buildStudentPhysicalValues(student)
  const { passed, total } = summarizeNormsForValues(norms, values)
  return `Нормативы: сдано ${passed} из ${total}.`
}

/**
 * @param {object} student
 * @param {object[]} allNorms
 */
export function formatPendingNorms(student, allNorms) {
  const name = displayName(student)
  const athlete = athleteShapeFromStudent(student)
  if (!athlete.birthYear) {
    return [
      `<b>Нормативы — ${escapeHtml(name)}</b>`,
      '',
      'В карточке не указан год рождения — нормативы нельзя подобрать по возрасту.',
      'Заполните год рождения в приложении Cartel.',
      READ_ONLY_FOOTER,
    ].join('\n')
  }
  const norms = getNormsForAthlete(allNorms, athlete)
  const values = buildStudentPhysicalValues(student)
  const items = buildNormItems(norms, values)
  const passed = []
  const pending = []
  const below = []

  for (const item of items) {
    const testName = String(item.norm.testName ?? item.norm.testId)
    const unit = item.norm.unit ? ` ${item.norm.unit}` : ''
    if (item.status === 'gold' || item.status === 'silver' || item.status === 'bronze') {
      const result = item.displayResult ? `${item.displayResult}${unit}` : '—'
      passed.push(`• ${testName}: ${result} (${item.statusLabel})`)
    } else if (item.status === 'red') {
      const result = item.displayResult ? `${item.displayResult}${unit}` : '—'
      below.push(`• ${testName}: ${result} — ниже нормы`)
    } else {
      pending.push(`• ${testName} (золото ${item.goalGold})`)
    }
  }

  const lines = [`<b>Нормативы — ${escapeHtml(name)}</b>`]
  if (passed.length) {
    lines.push('', '<b>Сдано:</b>', passed.slice(0, 15).map(escapeHtml).join('\n'))
    if (passed.length > 15) lines.push(`… и ещё ${passed.length - 15}`)
  }
  if (pending.length) {
    lines.push('', '<b>Ещё не сдано:</b>', pending.slice(0, 15).map(escapeHtml).join('\n'))
    if (pending.length > 15) lines.push(`… и ещё ${pending.length - 15}`)
  } else if (!passed.length && !below.length) {
    lines.push('', 'Нормативы для возраста и пола не найдены.')
  } else if (!pending.length) {
    lines.push('', 'Все нормативы из программы сданы.')
  }
  if (below.length) {
    lines.push('', '<b>Ниже нормы:</b>', below.slice(0, 10).map(escapeHtml).join('\n'))
  }
  lines.push(READ_ONLY_FOOTER)
  return lines.join('\n')
}

/**
 * Упоминание ученика в свободной фразе (голос/текст).
 * @param {object[]} students
 * @param {string} text
 * @returns {object | null}
 */
export function findStudentMentionInText(students, text) {
  const lower = String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .trim()
  if (!lower) return null

  let best = null
  let bestLen = 0

  for (const student of students ?? []) {
    const candidates = []
    const full = displayName(student)
      .toLowerCase()
      .replace(/ё/g, 'е')
    if (full.length >= 3) candidates.push(full)
    const first = String(student.firstName ?? '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .trim()
    const last = String(student.lastName ?? '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .trim()
    if (first.length >= 3) candidates.push(first)
    if (last.length >= 4) candidates.push(last)

    for (const part of candidates) {
      if (lower.includes(part) && part.length > bestLen) {
        best = student
        bestLen = part.length
      }
    }
  }

  return best
}

/**
 * @param {string} text
 * @param {object | null} student
 * @param {object[]} allNorms
 */
export function buildReadOnlyReply(text, student, allNorms) {
  const lower = String(text ?? '').trim().toLowerCase()
  if (!student) {
    return 'Сначала выберите ученика — кнопка «👤 Ученики» в меню.'
  }

  if (
    /не сдан|не сдала|не сдали|осталось|что сда|какие норматив|норматив/.test(lower) &&
    !/запиш|внес|сохран|прим/.test(lower)
  ) {
    return formatPendingNorms(student, allNorms)
  }
  if (/техник|программ|элемент|где останов|шаг|уровен/.test(lower)) {
    return [
      `<b>${escapeHtml(displayName(student))}</b>`,
      `Техника: ${escapeHtml(formatTechniqueLine(student))}`,
      'Подробная точка остановки — в карточке ученика в приложении.',
      READ_ONLY_FOOTER,
    ].join('\n')
  }
  if (
    /сводк|покажи|расскаж|как дела|что с |кратко|инфо|данные|информац/.test(lower) ||
    lower.length < 40
  ) {
    return formatStudentSummary(student, allNorms)
  }

  return [
    'Понял. По выбранному ученику используйте кнопки меню:',
    '📋 Сводка — кратко',
    '📊 Нормативы — что не сдано',
    '👤 Ученики — сменить ученика',
    '',
    'Или спросите: «что не сдано», «техника», «сводка».',
    READ_ONLY_FOOTER,
  ].join('\n')
}

/**
 * @param {string} coachId
 * @param {string | null | undefined} activeStudentId
 */
export async function resolveActiveStudent(coachId, activeStudentId) {
  if (!activeStudentId) return null
  const student = await getStudentById(activeStudentId)
  if (!student) return null
  const coachIds = [
    student.coachId,
    ...(Array.isArray(student.coach_ids) ? student.coach_ids : []),
    ...(Array.isArray(student.coachIds) ? student.coachIds : []),
  ].filter(Boolean)
  if (!coachIds.includes(coachId)) return null
  return student
}

/** @param {string} raw */
function escapeHtml(raw) {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

let normsCache = /** @type {object[] | null} */ (null)
let normsCacheAt = 0

export async function getNormsCached() {
  if (normsCache && Date.now() - normsCacheAt < 5 * 60 * 1000) return normsCache
  normsCache = await loadLegacyNorms()
  normsCacheAt = Date.now()
  return normsCache
}
