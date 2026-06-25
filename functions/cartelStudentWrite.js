import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import {
  athleteShapeFromStudent,
  getNormsForAthlete,
} from './telegramNormsLite.js'
import {
  applyNormRawInput,
  getNormValueByTestId,
  migrateStudentTests,
} from './telegramNormResults.js'
import { loadLegacyNorms, getCoachProfile, displayName } from './telegramCoachData.js'
import { loadTechnicalProgramBundle, mapStudentCombinations } from './telegramTechnicalProgram.js'

const DOMINANCE = {
  NOT_LEARNED: 0.25,
  KNOWLEDGE: 0.35,
  MOTOR_SKILL_LEVEL_1: 0.45,
  MOTOR_SKILL_LEVEL_2: 0.7,
  AUTOMATED: 1,
}

const LEVEL_LABELS = {
  NOT_LEARNED: 'Не изучен',
  KNOWLEDGE: 'Знание',
  MOTOR_SKILL_LEVEL_1: 'Умение',
  MOTOR_SKILL_LEVEL_2: 'Навык',
  AUTOMATED: 'Автомат',
}

/** @param {unknown} level */
export function normalizeTechniqueLevel(level) {
  const key = String(level ?? 'NOT_LEARNED').toUpperCase().trim()
  if (key === 'NONE' || key === 'NOT_STUDIED' || key === '') return 'NOT_LEARNED'
  if (key in DOMINANCE) return key
  return 'NOT_LEARNED'
}

/** @param {string} text */
export function parseTechniqueLevelFromText(text) {
  const l = String(text ?? '').toLowerCase()
  if (/автоматиз|автомат/.test(l)) return 'AUTOMATED'
  if (/навык/.test(l)) return 'MOTOR_SKILL_LEVEL_2'
  if (/умение/.test(l)) return 'MOTOR_SKILL_LEVEL_1'
  if (/знан/.test(l)) return 'KNOWLEDGE'
  if (/не изуч/.test(l)) return 'NOT_LEARNED'
  return null
}

/** @param {string} key */
export function techniqueLevelLabel(key) {
  return LEVEL_LABELS[normalizeTechniqueLevel(key)] ?? key
}

/** @param {object | null | undefined} student @param {string} coachId */
export function isStudentAttachedToCoach(student, coachId) {
  if (!student || !coachId) return false
  const ids = [
    student.coachId,
    ...(Array.isArray(student.coach_ids) ? student.coach_ids : []),
    ...(Array.isArray(student.coachIds) ? student.coachIds : []),
  ].filter(Boolean)
  return ids.includes(coachId)
}

/**
 * @param {object[]} allNorms
 * @param {object} student
 * @param {string} testIdOrName
 */
export { resolvePhysicalNormForStudent } from './telegramNormResolve.js'

/** @param {unknown} raw */
function normalizeTechnicalData(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue
    out[key] = { ...value, level: normalizeTechniqueLevel(value.level) }
  }
  return out
}

/** @param {object} student @param {{ level1: object[], level2: object[], level3: object[] }} program */
function buildProgramAtoms(student, program) {
  const combos = mapStudentCombinations(student?.technicalCombinations, program.level3, program.level1)
  return [...program.level1, ...program.level2, ...combos]
}

/** @param {object} student */
function getWeightsLite(student) {
  const height = Number(student?.height) || 0
  const reach = Number(student?.reach) || 0
  const apeIndex = reach - height
  const isFemale = student?.gender === 'F' || student?.gender === 'Ж'
  let T = isFemale ? 0.45 : 0.4
  let F = 0.3
  let P = isFemale ? 0.25 : 0.3
  if (apeIndex > 3) {
    T = isFemale ? 0.55 : 0.5
    F = 0.3
    P = isFemale ? 0.15 : 0.2
  } else if (apeIndex < 0) {
    T = isFemale ? 0.35 : 0.3
    F = 0.3
    P = isFemale ? 0.35 : 0.4
  }
  return { T, F, P }
}

/**
 * @param {object[]} norms
 * @param {Record<string, unknown>} values
 * @param {Record<string, { level?: string }>} technicalData
 * @param {object[]} programAtoms
 */
function calculateLegacySectionScores(norms, values, technicalData, programAtoms) {
  const averageNormScore = () => {
    if (!norms.length) return 0
    const sum = norms.reduce(
      (acc, norm) => acc + Number(getNormValueByTestId(values, norm.testId)?.normalizedScore ?? 0),
      0,
    )
    return Math.round(Math.min(100, Math.max(0, sum / norms.length)))
  }

  let technicalScore = 0
  if (programAtoms.length) {
    const coeffs = programAtoms.map(
      (atom) => DOMINANCE[normalizeTechniqueLevel(technicalData[atom.id]?.level)] ?? 0.25,
    )
    technicalScore = Math.round(
      coeffs.reduce((acc, c) => acc + c * 100, 0) / coeffs.length,
    )
  }

  return {
    физика: averageNormScore(),
    функционал: 0,
    техника: technicalScore,
  }
}

/** @param {object[]} programAtoms @param {Record<string, { level?: string }>} technicalData */
function calculateKD(programAtoms, technicalData) {
  if (!programAtoms.length) {
    return { kd: studentKdFallback(technicalData), atomCount: 0, automationPercent: 0 }
  }
  const coeffs = programAtoms.map(
    (atom) => DOMINANCE[normalizeTechniqueLevel(technicalData[atom.id]?.level)] ?? 0.25,
  )
  const kd = coeffs.reduce((a, b) => a + b, 0) / coeffs.length
  const automatedCount = programAtoms.filter(
    (atom) => normalizeTechniqueLevel(technicalData[atom.id]?.level) === 'AUTOMATED',
  ).length
  return {
    kd: Number(Math.min(1, Math.max(0.25, kd)).toFixed(4)),
    atomCount: programAtoms.length,
    automationPercent: Math.round((automatedCount / programAtoms.length) * 100),
  }
}

/** @param {Record<string, { level?: string }>} technicalData */
function studentKdFallback(technicalData) {
  const levels = Object.values(technicalData ?? {})
  if (!levels.length) return 0.25
  const kd =
    levels.reduce(
      (acc, item) => acc + (DOMINANCE[normalizeTechniqueLevel(item?.level)] ?? 0.25),
      0,
    ) / levels.length
  return Number(Math.min(1, Math.max(0.25, kd)).toFixed(4))
}

/**
 * @param {object} student
 * @param {Record<string, unknown>} physicalMerged
 * @param {Record<string, { level?: string }>} technicalData
 * @param {object[]} allNorms
 * @param {{ level1: object[], level2: object[], level3: object[] }} program
 */
function buildDerivedStudentFields(student, physicalMerged, technicalData, allNorms, program) {
  const athlete = athleteShapeFromStudent(student)
  const physicalNorms = getNormsForAthlete(allNorms, athlete)
  const programAtoms = buildProgramAtoms(student, program)
  const tech = normalizeTechnicalData(technicalData)
  const scores = calculateLegacySectionScores(physicalNorms, physicalMerged, tech, programAtoms)
  const w = getWeightsLite(student)
  const trainingProgress = scores.техника * w.T + scores.физика * (w.P + w.F)
  const kspScale = Number(student?.ksp) > 0 ? Number(student.ksp) : 100
  const baseKSR = Math.floor(Math.min(100, Math.max(0, (trainingProgress / 100) * kspScale)))
  const kdStats = calculateKD(programAtoms, tech)
  const effectiveKSR = Number(Math.min(100, Math.max(0, baseKSR * kdStats.kd)).toFixed(1))

  return {
    scores,
    trainingProgress,
    baseKSR,
    kd: kdStats.kd,
    kdAtomCount: kdStats.atomCount,
    kdAutomationPercent: kdStats.automationPercent,
    effectiveKSR,
    technicalScore: scores.техника / 100,
  }
}

/**
 * @param {object} program
 * @param {string} mention
 */
export function findProgramAtomByMention(program, mention) {
  const lower = String(mention ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .trim()
  if (!lower) return null
  const all = [...program.level1, ...program.level2, ...program.level3]
  let best = null
  let bestLen = 0
  for (const atom of all) {
    const name = String(atom.name ?? '')
      .toLowerCase()
      .replace(/ё/g, 'е')
    const num = String(atom.number ?? '').toLowerCase()
    if (name && lower.includes(name) && name.length > bestLen) {
      best = atom
      bestLen = name.length
    } else if (num && lower.includes(num) && num.length > bestLen) {
      best = atom
      bestLen = num.length
    }
  }
  return best
}

/**
 * @param {string} coachId
 * @param {object} student
 * @param {object} norm
 * @param {string} resultRaw
 */
export async function saveStudentNormFromTelegram(coachId, student, norm, resultRaw) {
  const parsed = applyNormRawInput(norm, resultRaw)
  if (!parsed || !Number.isFinite(parsed.result)) {
    throw new Error('Не удалось разобрать результат. Укажите число или время (м:сс).')
  }

  const coachProfile = await getCoachProfile(coachId)
  const coachName = [coachProfile?.firstName, coachProfile?.lastName].filter(Boolean).join(' ').trim() || 'Тренер'
  const allNorms = await loadLegacyNorms()
  const program = await loadTechnicalProgramBundle(getFirestore())

  const { physical } = migrateStudentTests(student?.tests)
  const physicalMerged = { ...physical }
  const serverRow = getNormValueByTestId(physicalMerged, norm.testId)
  const recordedAt = new Date().toISOString()

  const mergedRow = {
    ...parsed,
    acceptedAt: recordedAt,
    acceptedByCoachId: coachId,
    acceptedByCoachName: coachName,
    acceptanceHistory: [
      ...(Array.isArray(serverRow?.acceptanceHistory) ? serverRow.acceptanceHistory : []),
      {
        id: `h_${Date.now().toString(36)}`,
        recordedAt,
        coachId,
        coachName,
        result: parsed.result,
        resultRaw: parsed.resultRaw ?? String(parsed.result),
        normalizedScore: parsed.normalizedScore,
        status: parsed.status,
        testId: norm.testId,
        category: 'physical',
        normNameSnapshot: norm.testName ?? '',
        measureTypeSnapshot: norm.measureType ?? '',
        unitSnapshot: norm.unit ?? '',
      },
    ],
  }
  delete mergedRow.studentSelfReport
  delete mergedRow.studentSelfReportAt
  delete mergedRow.pendingStudentSelfReport

  physicalMerged[norm.testId] = mergedRow
  const technicalData = normalizeTechnicalData(student?.technicalData)
  const derived = buildDerivedStudentFields(student, physicalMerged, technicalData, allNorms, program)

  const payload = {
    tests: { physical: physicalMerged, functional: {} },
    ...derived,
  }

  await getFirestore()
    .collection('students')
    .doc(student.id)
    .set(
      {
        ...payload,
        lastUpdatedByCoachId: coachId,
        lastUpdatedByCoachName: coachName,
        lastUpdatedSection: `Telegram: норматив «${norm.testName}»`,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

  return {
    studentName: displayName(student),
    normName: norm.testName,
    resultDisplay: parsed.resultRaw ?? String(parsed.result),
    status: parsed.status,
  }
}

/**
 * @param {string} coachId
 * @param {object} student
 * @param {object} atom
 * @param {string} levelKey
 */
export async function saveStudentTechniqueFromTelegram(coachId, student, atom, levelKey) {
  const level = normalizeTechniqueLevel(levelKey)
  const coachProfile = await getCoachProfile(coachId)
  const coachName = [coachProfile?.firstName, coachProfile?.lastName].filter(Boolean).join(' ').trim() || 'Тренер'
  const allNorms = await loadLegacyNorms()
  const program = await loadTechnicalProgramBundle(getFirestore())

  const technicalData = normalizeTechnicalData(student?.technicalData)
  technicalData[atom.id] = { ...(technicalData[atom.id] ?? {}), level }

  const { physical } = migrateStudentTests(student?.tests)
  const physicalMerged = { ...physical }
  const derived = buildDerivedStudentFields(student, physicalMerged, technicalData, allNorms, program)

  const atomLabel = atom.number ? `#${atom.number} ${atom.name}` : String(atom.name ?? atom.id)

  await getFirestore()
    .collection('students')
    .doc(student.id)
    .set(
      {
        technicalData,
        ...derived,
        lastUpdatedByCoachId: coachId,
        lastUpdatedByCoachName: coachName,
        lastUpdatedSection: `Telegram: техника «${atomLabel}»`,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

  return {
    studentName: displayName(student),
    atomLabel,
    level,
    levelLabel: techniqueLevelLabel(level),
  }
}

/** @param {'gold'|'silver'|'bronze'|'red'} status */
export function normStatusLabelRu(status) {
  if (status === 'gold') return 'золото'
  if (status === 'silver') return 'серебро'
  if (status === 'bronze') return 'бронза'
  if (status === 'red') return 'ниже нормы'
  return '—'
}
