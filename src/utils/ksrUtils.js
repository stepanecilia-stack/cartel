import {
  ageToStandardsGroup,
  calculateKSPPercent,
  findGoldStandardRow,
  GOLD_STANDARDS,
  referenceIdealHeightCm,
  shortTypageLabel,
} from './standards.js'
import { computeAthleteAgeYears, normalizeBirthYearNumber } from './studentModel.js'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const NORMS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSznwbE_UU03tW5O2ps783zQ_V6lXjGnx7IdqYCTfF7XRN6ioJ7EQ4kclNSyrok2Yu2CGXr4M4qGzcs/pub?gid=1658605285&single=true&output=csv'
const TECHNICAL_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSznwbE_UU03tW5O2ps783zQ_V6lXjGnx7IdqYCTfF7XRN6ioJ7EQ4kclNSyrok2Yu2CGXr4M4qGzcs/pub?gid=320989263&single=true&output=csv'

/** Коэффициент доминантности по уровню освоения технического атома. */
export const DOMINANCE_COEFFICIENTS = {
  NOT_LEARNED: 0.25,
  KNOWLEDGE: 0.3,
  MOTOR_SKILL_LEVEL_1: 0.45,
  MOTOR_SKILL_LEVEL_2: 0.7,
  AUTOMATED: 1.0,
}

/** Уровни для UI / Firestore (строковые ключи). */
export const TECH_DOMINANCE_OPTIONS = [
  { key: 'NOT_LEARNED', label: 'Не изучен' },
  { key: 'KNOWLEDGE', label: 'Знание' },
  { key: 'MOTOR_SKILL_LEVEL_1', label: 'Умение' },
  { key: 'MOTOR_SKILL_LEVEL_2', label: 'Навык' },
  { key: 'AUTOMATED', label: 'Автоматизм' },
]

const LEGACY_NUM_TO_DOMINANCE = {
  0: 'NOT_LEARNED',
  1: 'KNOWLEDGE',
  2: 'MOTOR_SKILL_LEVEL_1',
  3: 'MOTOR_SKILL_LEVEL_2',
  4: 'AUTOMATED',
}

/** Нормализация уровня атома к ключу DOMINANCE_COEFFICIENTS. */
export const normalizeTechnicalDominanceKey = (level) => {
  if (level == null || level === '') return 'NOT_LEARNED'
  if (typeof level === 'string' && DOMINANCE_COEFFICIENTS[level] != null) return level
  const n = Number(level)
  if (Number.isFinite(n) && LEGACY_NUM_TO_DOMINANCE[n]) return LEGACY_NUM_TO_DOMINANCE[n]
  return 'NOT_LEARNED'
}

export const dominanceCoeffForLevel = (level) =>
  DOMINANCE_COEFFICIENTS[normalizeTechnicalDominanceKey(level)] ?? 0.25

/**
 * КД — среднее коэффициентов по всем атомам программы (из technicalAtoms).
 * Без списка атомов — среднее по заполненным в technicalData (дашборд / черновик).
 */
export const calculateKD = (technicalAtoms = [], technicalData = {}) => {
  const data = technicalData && typeof technicalData === 'object' ? technicalData : {}
  if (!technicalAtoms.length) {
    const entries = Object.entries(data).filter(
      ([, v]) => v && v.level !== undefined && v.level !== null && v.level !== '',
    )
    if (!entries.length) {
      return { kd: 0.25, atomCount: 0, automationPercent: 25, automatedCount: 0 }
    }
    const coeffs = entries.map(([, v]) => dominanceCoeffForLevel(v.level))
    const kd = coeffs.reduce((a, b) => a + b, 0) / coeffs.length
    const automatedCount = entries.filter(
      ([, v]) => normalizeTechnicalDominanceKey(v.level) === 'AUTOMATED',
    ).length
    return {
      kd: Number(clamp(kd, 0.25, 1).toFixed(4)),
      atomCount: entries.length,
      automationPercent: Math.round((automatedCount / entries.length) * 100),
      automatedCount,
    }
  }
  const coeffs = technicalAtoms.map((atom) => dominanceCoeffForLevel(data[atom.id]?.level))
  const kd = coeffs.reduce((a, b) => a + b, 0) / coeffs.length
  const automatedCount = technicalAtoms.filter(
    (atom) => normalizeTechnicalDominanceKey(data[atom.id]?.level) === 'AUTOMATED',
  ).length
  return {
    kd: Number(clamp(kd, 0.25, 1).toFixed(4)),
    atomCount: technicalAtoms.length,
    automationPercent: Math.round((automatedCount / technicalAtoms.length) * 100),
    automatedCount,
  }
}

/** Effective КСР = Base КСР × КД (коэффициент доминантности по технике). */
export const calculateEffectiveKSR = (baseKSR = 0, kd = 0.25) => {
  const k = Number(kd)
  const mult = Number.isFinite(k) ? clamp(k, 0.25, 1) : 0.25
  return Number(clamp(Number(baseKSR) * mult, 0, 100).toFixed(1))
}

/**
 * Справочник эталонов: вес (кг) → идеальный рост (см) по полу и возрастной группе.
 * Собирается из GOLD_STANDARDS (weight-first).
 */
function buildWeightStandardsFromGold() {
  /** @type {Record<'M'|'F', Record<string, Record<number, number>>>} */
  const out = { M: {}, F: {} }
  for (const row of GOLD_STANDARDS) {
    const g = row.gender
    const ag = row.ageGroup
    if (!out[g][ag]) out[g][ag] = {}
    const ideal = referenceIdealHeightCm(row)
    if (ideal == null || !Number.isFinite(ideal)) continue
    const wMin = Number(row.weightMin)
    const wMax = Number(row.weightMax)
    const from = Math.floor(Math.min(wMin, wMax))
    const to = Math.ceil(Math.max(wMin, wMax))
    for (let w = from; w <= to; w += 1) {
      if (w >= 15 && w <= 200) out[g][ag][w] = ideal
    }
  }
  return out
}

export const WEIGHT_STANDARDS = buildWeightStandardsFromGold()

/**
 * Дельта роста: standardHeight − studentHeight (положительно — ниже эталона).
 */
export function resolveWeightFirstHeightDiff(studentData = {}) {
  const studentHeight = Number(studentData.height ?? 0)
  const weight = Number(studentData.weight ?? 0)
  const gender = studentData.gender === 'F' || studentData.gender === 'Ж' ? 'F' : 'M'
  const y = normalizeBirthYearNumber(studentData.birthYear)
  const age = computeAthleteAgeYears(y)
  const ageGroup = age != null ? ageToStandardsGroup(age) : null

  const base = {
    standardHeight: null,
    heightDiff: null,
    categoryCorrespondence: 'Нет данных',
    categoryDisplayCm: null,
    tacticMode: 'none',
    lookupWeight: null,
    ageGroup,
    gender,
  }

  if (!ageGroup || !weight || weight < 20 || !studentHeight || studentHeight < 100) {
    return base
  }

  const map = WEIGHT_STANDARDS[gender]?.[ageGroup]
  if (!map || !Object.keys(map).length) return base

  const keys = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
  const rw = Math.round(weight)
  let standardHeight = map[rw]
  let lookupWeight = rw
  if (standardHeight == null) {
    let bestKey = keys[0]
    let bestDist = Infinity
    for (const k of keys) {
      const d = Math.abs(k - weight)
      if (d < bestDist) {
        bestDist = d
        bestKey = k
      }
    }
    standardHeight = map[bestKey]
    lookupWeight = bestKey
  }

  const heightDiff = standardHeight - studentHeight

  let categoryCorrespondence = 'Норма'
  let categoryDisplayCm = Math.round(Math.abs(heightDiff))
  let tacticMode = 'standard'

  if (heightDiff > 10) {
    categoryCorrespondence = 'Дефицит'
    tacticMode = 'infighter'
    categoryDisplayCm = Math.round(heightDiff)
  } else if (heightDiff < -5) {
    categoryCorrespondence = 'Преимущество'
    tacticMode = 'outfighter'
    categoryDisplayCm = Math.round(Math.abs(heightDiff))
  }

  return {
    standardHeight,
    heightDiff,
    categoryCorrespondence,
    categoryDisplayCm,
    tacticMode,
    lookupWeight,
    ageGroup,
    gender,
  }
}

const parseCsv = (csvText) =>
  csvText.split('\n').map((row) => {
    const cells = []
    let current = ''
    let insideQuotes = false
    for (let i = 0; i < row.length; i += 1) {
      const char = row[i]
      if (char === '"') insideQuotes = !insideQuotes
      else if (char === ',' && !insideQuotes) {
        cells.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else current += char
    }
    cells.push(current.trim().replace(/^"|"$/g, ''))
    return cells
  })

const weightFirstBase = (studentData, wf) => ({
  standardHeight: wf.standardHeight,
  heightDiff: wf.heightDiff,
  categoryCorrespondence: wf.categoryCorrespondence,
  categoryDisplayCm: wf.categoryDisplayCm,
  tacticMode: wf.tacticMode,
  lookupWeight: wf.lookupWeight,
  weightFirstAgeGroup: wf.ageGroup,
})

/**
 * Leverage Weights: сначала дельта «эталон по весу − рост», затем Ape Index.
 */
export const getWeights = (studentData = {}) => {
  const height = Number(studentData.height ?? 0)
  const reach = Number(studentData.reach ?? 0)
  const apeIndex = reach - height
  const isFemale = studentData.gender === 'F' || studentData.gender === 'Ж'

  const wf = resolveWeightFirstHeightDiff(studentData)

  if (wf.tacticMode === 'infighter') {
    const label = 'Инфайтер (Дефицит роста)'
    const T = isFemale ? 0.35 : 0.3
    const F = 0.3
    const P = isFemale ? 0.35 : 0.4
    return {
      archetype: label,
      archetypeSmart: label,
      archetypeFull: null,
      typageFromTable: false,
      T,
      F,
      P,
      apeIndex,
      tacticAdvice:
        'Критический дефицит роста. Рекомендована работа через агрессивное давление.',
      ...weightFirstBase(studentData, wf),
    }
  }

  if (wf.tacticMode === 'outfighter') {
    const label = 'Аутфайтер (Преимущество роста)'
    const T = 0.6
    const F = isFemale ? 0.3 : 0.25
    const P = isFemale ? 0.1 : 0.15
    return {
      archetype: label,
      archetypeSmart: label,
      archetypeFull: null,
      typageFromTable: false,
      T,
      F,
      P,
      apeIndex,
      tacticAdvice:
        'Максимальное преимущество в росте. Рекомендована работа на дальней дистанции.',
      ...weightFirstBase(studentData, wf),
    }
  }

  let archetypeSmart = 'Универсал'
  let T = isFemale ? 0.45 : 0.4
  let F = 0.3
  let P = isFemale ? 0.25 : 0.3
  if (apeIndex > 3) {
    archetypeSmart = 'Линейный'
    T = isFemale ? 0.55 : 0.5
    F = 0.3
    P = isFemale ? 0.15 : 0.2
  } else if (apeIndex < 0) {
    archetypeSmart = 'Силовой'
    T = isFemale ? 0.35 : 0.3
    F = 0.3
    P = isFemale ? 0.35 : 0.4
  }

  const table = findGoldStandardRow(studentData)
  const useTable = Boolean(table && table.weightDistance <= 6)
  const archetype = useTable ? shortTypageLabel(table.row.label) : archetypeSmart

  return {
    archetype,
    archetypeSmart,
    archetypeFull: useTable ? table.row.label : null,
    typageFromTable: useTable,
    T,
    F,
    P,
    apeIndex,
    tacticAdvice: '',
    ...weightFirstBase(studentData, wf),
  }
}

/** Потолок КСП (0–100) по золотым стандартам и антропометрии. */
export const calculateKSP = (studentData = {}) => calculateKSPPercent(studentData).ksp

/** Базовый балл и «потолок по телу» (внутренние расчёты по антропометрии). */
export const calculateKsrAndKsp = (studentData = {}, scores = {}) => {
  const kspBlock = calculateKSPPercent(studentData)
  const trainingProgress = calculateTrainingProgress(studentData, scores)
  const baseKSR = calculateBaseKSR(studentData, scores, kspBlock.ksp)
  return {
    baseKSR,
    trainingProgress,
    ksp: kspBlock.ksp,
    kspZ: kspBlock.z,
    kspH: kspBlock.h,
    kspTypage: kspBlock.typage,
    kspIdealHeight: kspBlock.idealHeightRange,
    kspDetail: kspBlock,
  }
}

export {
  analyzeGeometricHeightDeficit,
  findGoldStandardRow,
  calculateKSPPercent,
  referenceIdealHeightCm,
  shortTypageLabel,
} from './standards.js'

/**
 * TrainingProgress: вклад разделов с учётом Leverage Weights (0–100 по шкале баллов).
 * TechScore*wT + PhysScore*wP + FuncScore*wF
 */
export const calculateTrainingProgress = (studentData = {}, scores = {}) => {
  const w = getWeights(studentData)
  return (
    Number(scores.техника ?? 0) * w.T +
    Number(scores.физика ?? 0) * w.P +
    Number(scores.функционал ?? 0) * w.F
  )
}

/**
 * Base КСР = (TrainingProgress / 100) * КСП. При КСП = 0 множитель 100 (нет эталона потолка).
 */
export const calculateBaseKSR = (studentData = {}, scores = {}, kspCeiling = null) => {
  const trainingProgress = calculateTrainingProgress(studentData, scores)
  const ksp =
    kspCeiling != null && kspCeiling !== undefined
      ? Number(kspCeiling)
      : calculateKSP(studentData)
  const kspScale = Number.isFinite(ksp) && ksp > 0 ? ksp : 100
  const base = (trainingProgress / 100) * kspScale
  return Math.floor(clamp(base, 0, 100))
}

export const evaluateLegacyTest = (result, norm) => {
  const { gold, silver, bronze, measureType } = norm
  let status = 'red'
  let normalizedScore = 0
  if (measureType === 'MAX') {
    if (result >= gold) {
      status = 'gold'
      normalizedScore = 100 + ((result - gold) / gold) * 20
    } else if (result >= silver) {
      status = 'silver'
      normalizedScore = 80 + ((result - silver) / (gold - silver)) * 20
    } else if (result >= bronze) {
      status = 'bronze'
      normalizedScore = 60 + ((result - bronze) / (silver - bronze)) * 20
    } else normalizedScore = (result / bronze) * 60
  } else if (result <= gold) {
    status = 'gold'
    normalizedScore = 100 + ((gold - result) / gold) * 20
  } else if (result <= silver) {
    status = 'silver'
    normalizedScore = 80 + ((silver - result) / (silver - gold)) * 20
  } else if (result <= bronze) {
    status = 'bronze'
    normalizedScore = 60 + ((bronze - result) / (bronze - silver)) * 20
  } else normalizedScore = (bronze / result) * 60
  return { status, normalizedScore: Math.round(clamp(normalizedScore, 0, 120)) }
}

export const getAgeGroup = (birthYear) => {
  const age = computeAthleteAgeYears(birthYear)
  if (age == null) return null
  return ageToStandardsGroup(age)
}

const parseLegacyNormThreshold = (raw, unit = '') => {
  const source = String(raw ?? '').trim()
  if (!source) return NaN

  const minuteSecondMatch = source.match(/^(\d+)\s*:\s*([0-5]?\d)$/)
  if (minuteSecondMatch) {
    const minutes = Number(minuteSecondMatch[1])
    const seconds = Number(minuteSecondMatch[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return NaN
    return minutes + seconds / 60
  }

  // CSV often contains comma decimals (e.g. 8,5)
  const normalized = source.replace(',', '.')
  const asNumber = Number(normalized)
  if (Number.isFinite(asNumber)) return asNumber

  // Fallback for time-like unit values with dot separator in source.
  if (String(unit).toLowerCase().includes('мин')) {
    const dotTime = source.match(/^(\d+)\.(\d{1,2})$/)
    if (dotTime) {
      const minutes = Number(dotTime[1])
      const seconds = Number(dotTime[2])
      if (Number.isFinite(minutes) && Number.isFinite(seconds)) return minutes + seconds / 60
    }
  }

  return NaN
}

export const loadLegacyNorms = async () => {
  const response = await fetch(NORMS_SHEET_URL)
  const rows = parseCsv(await response.text()).slice(1)
  return rows
    .filter((row) => row.length >= 11 && row[2])
    .map((row) => ({
      category: row[0],
      testId: row[1],
      testName: row[2],
      description: row[3],
      ageGroup: row[4],
      gender: row[5],
      unit: row[9],
      gold: parseLegacyNormThreshold(row[6], row[9]),
      silver: parseLegacyNormThreshold(row[7], row[9]),
      bronze: parseLegacyNormThreshold(row[8], row[9]),
      measureType: row[10],
    }))
}

export const getNormsForAthlete = (allNorms, athlete, category) => {
  const age = computeAthleteAgeYears(athlete.birthYear) ?? 0
  return allNorms.filter((norm) => {
    if (norm.category !== category || norm.gender !== athlete.gender) return false
    const [minAge, maxAge] = norm.ageGroup.split('-').map(Number)
    return age >= minAge && age <= maxAge
  })
}

export const loadLegacyTechnicalAtoms = async () => {
  const response = await fetch(TECHNICAL_SHEET_URL)
  return parseCsv(await response.text())
    .slice(1)
    .filter((row) => row.length >= 7 && row[1])
    .map((row, index) => ({
      id: `atom_${row[0] || index + 1}`,
      number: row[0] || String(index + 1),
      name: row[1],
      howTo: row[2],
      whyHowTo: row[3],
      mistakes: row[4],
      whyMistakes: row[5],
      videoLink: row[6],
    }))
}

export const calculateLegacySectionScores = ({
  physicalNorms = [],
  functionalNorms = [],
  physicalResults = {},
  functionalResults = {},
  technicalData = {},
}) => {
  const averageNormScore = (norms, values) => {
    if (norms.length === 0) return 0
    const sum = norms.reduce((acc, norm) => acc + Number(values[norm.testId]?.normalizedScore ?? 0), 0)
    return Math.round(clamp(sum / norms.length, 0, 100))
  }
  const technicalLevels = Object.values(technicalData)
  const technicalScore =
    technicalLevels.length === 0
      ? 0
      : Math.round(
          technicalLevels.reduce((acc, item) => acc + dominanceCoeffForLevel(item.level) * 100, 0) /
            technicalLevels.length,
        )

  return {
    физика: averageNormScore(physicalNorms, physicalResults),
    функционал: averageNormScore(functionalNorms, functionalResults),
    техника: technicalScore,
  }
}


