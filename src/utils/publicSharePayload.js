import {
  evaluateLegacyTest,
  getNormsForAthlete,
  normalizeTechnicalDominanceKey,
  TECH_DOMINANCE_OPTIONS,
} from './ksrUtils'
import { formatNormAcceptedMeta } from './normAcceptanceHistory'
import { formatBirthYearRu, normalizeBirthDateISO } from './studentModel.js'
import { findGoldStandardRow, referenceIdealHeightCm, shortTypageLabel } from './standards.js'
import { buildShareAutoRecommendations } from './shareAutoRecommendations.js'
import { referenceWeightFromStandardRow } from '../components/StandardDuelSilhouettes.jsx'
import { getNormValueByTestId } from './normTestsStorage.js'

/** Подпись уровня освоения атома — те же названия, что у тренера в карточке. */
export function technicalDominancePublicLabel(level) {
  const k = normalizeTechnicalDominanceKey(level)
  const row = TECH_DOMINANCE_OPTIONS.find((o) => o.key === k)
  return row?.label ?? 'Не изучен'
}

/**
 * Доля заполнения по уровню (для шкалы техники на публичной странице).
 * Не изучен 0%, Знание 15%, Умение 40%, Навык 75%, Автоматизм 100%.
 */
export function technicalLevelInterpolationPercent(level) {
  const k = normalizeTechnicalDominanceKey(level)
  switch (k) {
    case 'NOT_LEARNED':
      return 0
    case 'KNOWLEDGE':
      return 15
    case 'MOTOR_SKILL_LEVEL_1':
      return 40
    case 'MOTOR_SKILL_LEVEL_2':
      return 75
    case 'AUTOMATED':
      return 100
    default:
      return 0
  }
}

function normalizeHistoryEntry(e) {
  if (!e || typeof e !== 'object') return null
  let date = e.date
  if (date && typeof date.toDate === 'function') {
    date = date.toDate().toISOString().slice(0, 10)
  } else if (date && typeof date === 'object' && typeof date.seconds === 'number') {
    date = new Date(date.seconds * 1000).toISOString().slice(0, 10)
  }
  date = typeof date === 'string' ? date.slice(0, 10) : ''
  const weight = Number(e.weight)
  if (!date || !Number.isFinite(weight) || weight < 15 || weight > 200) return null
  return { date, weight }
}

function isMinuteSecondUnit(norm) {
  const u = String(norm?.unit ?? '').toLowerCase()
  return u.includes('мин') || u.includes('mm:ss') || u.includes('м:с')
}

function toMinuteSecondDisplay(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  let minutes = Math.floor(num)
  let seconds = Math.round((num - minutes) * 60)
  if (seconds === 60) {
    minutes += 1
    seconds = 0
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatThresholdDisplay(norm, value) {
  if (!Number.isFinite(value)) return null
  return isMinuteSecondUnit(norm) ? toMinuteSecondDisplay(value) : String(value)
}

function formatStandardWeightCategory(row) {
  if (!row) return '—'
  const wMin = Number(row.weightMin)
  const wMax = Number(row.weightMax)
  if (!Number.isFinite(wMin) || !Number.isFinite(wMax)) return '—'
  if (row.openTop) return `${wMin}+`
  if (wMin === wMax) return String(wMin)
  return `${wMin}-${wMax}`
}

function mapNormRows(norms, results) {
  return norms.map((norm) => {
    const row = getNormValueByTestId(results, norm.testId)
    const hasResult = row && row.result != null && Number.isFinite(Number(row.result))
    let status = 'empty'
    let critical = false
    let tierLabel = 'Результат не внесён'
    let resultValue = null
    let normalizedScore = null
    const unit = norm.unit != null && norm.unit !== '' ? String(norm.unit) : ''
    const g = Number(norm.gold)
    const s = Number(norm.silver)
    const b = Number(norm.bronze)
    const measureType = norm.measureType === 'MIN' ? 'MIN' : 'MAX'
    const compareHint =
      measureType === 'MAX'
        ? 'чем больше результат — тем лучше (к «золоту»)'
        : 'чем меньше результат — тем лучше (к «золоту»)'
    if (hasResult) {
      resultValue = Number(row.result)
      const ev = evaluateLegacyTest(resultValue, norm)
      status = ev.status
      normalizedScore = row.normalizedScore != null && Number.isFinite(Number(row.normalizedScore)) ? Number(row.normalizedScore) : ev.normalizedScore
      if (ev.status === 'red') critical = true
      if (status === 'gold') tierLabel = 'Золото'
      else if (status === 'silver') tierLabel = 'Серебро'
      else if (status === 'bronze') tierLabel = 'Бронза'
      else if (critical) tierLabel = 'Ниже нормы'
      else tierLabel = 'Есть запас для улучшения'
    }
    const passedDisplay = status === 'gold' || status === 'silver' || status === 'bronze'
    const resultDisplay =
      hasResult && resultValue != null
        ? row?.resultRaw && String(row.resultRaw).trim()
          ? String(row.resultRaw).trim()
          : isMinuteSecondUnit(norm)
            ? toMinuteSecondDisplay(resultValue)
            : String(resultValue)
        : ''
    const acceptedDisplay = row ? formatNormAcceptedMeta(row) : null
    const acceptanceHistoryCount = Array.isArray(row?.acceptanceHistory) ? row.acceptanceHistory.length : 0
    return {
      id: String(norm.testId ?? ''),
      name: String(norm.testName ?? 'Норматив'),
      description: String(norm.description ?? ''),
      unit,
      hasResult,
      status,
      critical,
      passedDisplay,
      tierLabel,
      resultValue,
      resultDisplay,
      normalizedScore,
      measureType,
      compareHint,
      normGold: Number.isFinite(g) ? g : null,
      normSilver: Number.isFinite(s) ? s : null,
      normBronze: Number.isFinite(b) ? b : null,
      normGoldDisplay: formatThresholdDisplay(norm, g),
      normSilverDisplay: formatThresholdDisplay(norm, s),
      normBronzeDisplay: formatThresholdDisplay(norm, b),
      acceptedDisplay,
      acceptanceHistoryCount,
    }
  })
}

/**
 * Только данные для публичной страницы: без КСР, КБП, коэффициентов и внутренних баллов.
 * @param {string} [measureDate] — дата замера для точки на графике, если истории ещё нет.
 */
export function buildPublicSharePayload({
  displayName,
  photoURL = '',
  currentWeight = 0,
  weightHistory = [],
  measureDate = '',
  nextAttestationDate = null,
  allNorms = [],
  athleteForNorms,
  physicalResults = {},
  functionalResults = {},
  technicalAtoms = [],
  technicalData = {},
  season = null,
  etalonExtras = null,
  motorQualityWorkLog = null,
}) {
  const physicalNorms = getNormsForAthlete(allNorms, athleteForNorms, 'physical')
  const mergedPhysicalResults = { ...physicalResults, ...functionalResults }

  const physicalItems = mapNormRows(physicalNorms, mergedPhysicalResults)
  const functionalItems = []

  const countFilled = (items) => items.filter((i) => i.hasResult).length
  const physicalTotal = Math.max(physicalItems.length, 1)
  const physicalFilled = countFilled(physicalItems)

  const technicalItems = technicalAtoms.map((atom) => {
    const row = technicalData[atom.id] ?? {}
    const k = normalizeTechnicalDominanceKey(row.level)
    const levelLabel = technicalDominancePublicLabel(row.level)
    const levelPercent = technicalLevelInterpolationPercent(row.level)
    return {
      id: String(atom.id ?? ''),
      number: atom.number != null ? String(atom.number) : '',
      name: String(atom.name ?? 'Элемент'),
      comboChain:
        typeof atom.chainPreview === 'string' && atom.chainPreview.trim() !== ''
          ? atom.chainPreview.trim()
          : '',
      levelKey: k,
      levelLabel,
      levelPercent,
      webmSrc: typeof atom.media?.webmSrc === 'string' ? atom.media.webmSrc : '',
      comment: typeof row.comment === 'string' ? row.comment : '',
      howTo: String(atom.howTo ?? ''),
      whyHowTo: String(atom.whyHowTo ?? ''),
      mistakes: String(atom.mistakes ?? ''),
      whyMistakes: String(atom.whyMistakes ?? ''),
    }
  })
  const techTotal = Math.max(technicalItems.length, 1)
  const techAutomated = technicalItems.filter((t) => t.levelKey === 'AUTOMATED').length
  const techInterpSum = technicalItems.reduce((acc, t) => acc + (Number(t.levelPercent) || 0), 0)
  const technicalFillPct = Math.round(techInterpSum / techTotal)

  const safeHistory = (Array.isArray(weightHistory) ? weightHistory : [])
    .map(normalizeHistoryEntry)
    .filter(Boolean)

  const cw = Number(currentWeight) || 0
  let chartHistory = [...safeHistory]
  if (chartHistory.length === 0 && cw >= 20) {
    const d =
      typeof measureDate === 'string' && measureDate.trim()
        ? measureDate.trim().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    chartHistory = [{ date: d, weight: cw }]
  }

  const m = findGoldStandardRow(athleteForNorms)
  const referenceHeight = m?.row ? referenceIdealHeightCm(m.row) : 0
  const referenceReach = Number.isFinite(referenceHeight) ? referenceHeight : 0
  const ah = Number(athleteForNorms?.height) || 0
  const ar = Number(athleteForNorms?.reach) || 0
  const birthYear = Number(athleteForNorms?.birthYear) || 0
  const birthDate = normalizeBirthDateISO(athleteForNorms?.birthDate) || null
  const gender = athleteForNorms?.gender === 'F' ? 'F' : 'M'
  const md =
    typeof measureDate === 'string' && measureDate.trim()
      ? measureDate.trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

  const duelRows = [
    {
      key: 'height',
      label: 'Рост',
      athleteValue: ah,
      referenceValue: referenceHeight,
      delta: ah - referenceHeight,
      unit: 'см',
    },
    {
      key: 'reach',
      label: 'Размах',
      athleteValue: ar,
      referenceValue: referenceReach,
      delta: ar - referenceReach,
      unit: 'см',
    },
  ]

  const standardRow = m?.row ?? null
  const standardPassport = {
    weightCategory: standardRow ? formatStandardWeightCategory(standardRow) : '—',
    ageGroup: standardRow?.ageGroup ?? '—',
    archetype: shortTypageLabel(standardRow?.label) || '—',
    referenceWeightKg: referenceWeightFromStandardRow(standardRow),
  }

  const anthropometryPct =
    ah > 0 && ar > 0 && cw > 0 && birthYear > 0
      ? 100
      : Math.round(([ah > 0, ar > 0, cw > 0, birthYear > 0].filter(Boolean).length / 4) * 100)

  const autoRecommendations = buildShareAutoRecommendations({
    physicalItems,
    functionalItems,
    technicalItems,
    duelRows,
  })

  const etalon =
    etalonExtras && typeof etalonExtras === 'object'
      ? {
          kspPercent: Number(etalonExtras.kspPercent) || 0,
          basePercent: Number(etalonExtras.basePercent) || 0,
          tacticDistanceDisplay:
            typeof etalonExtras.tacticDistanceDisplay === 'string' ? etalonExtras.tacticDistanceDisplay : '',
          tacticMode: typeof etalonExtras.tacticMode === 'string' ? etalonExtras.tacticMode : '',
          tacticAdvice: typeof etalonExtras.tacticAdvice === 'string' ? etalonExtras.tacticAdvice : '',
          isYoungHistoricalPreview: Boolean(etalonExtras.isYoungHistoricalPreview),
          historicalReferenceLabel:
            typeof etalonExtras.historicalReferenceLabel === 'string'
              ? etalonExtras.historicalReferenceLabel
              : 'Эталон',
          referenceHeight: Number(etalonExtras.referenceHeight) || referenceHeight,
          referenceReach: Number(etalonExtras.referenceReach) || referenceReach,
          referenceWeightKg: etalonExtras.referenceWeightKg ?? standardPassport.referenceWeightKg,
        }
      : null

  return {
    v: 8,
    displayName: displayName || 'Спортсмен',
    photoURL: typeof photoURL === 'string' ? photoURL : '',
    currentWeight: cw,
    weightHistory: chartHistory,
    nextAttestationDate:
      typeof nextAttestationDate === 'string' && nextAttestationDate.trim()
        ? nextAttestationDate.trim()
        : null,
    autoRecommendations,
    athleteSnapshot: {
      birthYear,
      birthDate,
      birthYearLabel: formatBirthYearRu(birthYear),
      gender,
      genderLabel: gender === 'F' ? 'Женский' : 'Мужской',
      height: ah,
      reach: ar,
      weight: cw,
      measureDate: md,
    },
    standardPassport,
    duelRows,
    tabProgress: {
      anthropometry: anthropometryPct,
      physical: Math.round((physicalFilled / physicalTotal) * 100),
      functional: 0,
      technical: technicalFillPct,
    },
    physical: {
      items: physicalItems,
      fillPct: Math.round((physicalFilled / physicalTotal) * 100),
      filled: physicalFilled,
      total: physicalTotal,
    },
    functional: {
      items: functionalItems,
      fillPct: 0,
      filled: 0,
      total: 1,
    },
    technical: {
      atoms: technicalItems,
      /** Среднее по элементам: 0 / 15 / 40 / 75 / 100% за уровень освоения. */
      fillPct: technicalFillPct,
      automatedCount: techAutomated,
      total: techTotal,
    },
    season: season && typeof season === 'object' ? season : null,
    etalon,
    motorQualityWorkLog: motorQualityWorkLog ?? null,
  }
}

export function isValidProgressShareToken(t) {
  if (typeof t !== 'string' || t.length < 32 || t.length > 80) return false
  return /^[a-f0-9]+$/i.test(t)
}
