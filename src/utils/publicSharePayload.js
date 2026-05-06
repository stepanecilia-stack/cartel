import {
  evaluateLegacyTest,
  getNormsForAthlete,
  normalizeTechnicalDominanceKey,
  TECH_DOMINANCE_OPTIONS,
} from './ksrUtils'
import { findGoldStandardRow, referenceIdealHeightCm, shortTypageLabel } from './standards.js'

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

/**
 * Весовая категория по золотой таблице + ориентир роста «типичного бойца» для возраста/пола/веса.
 * Без КСР/КСП — только справочные строки для родителя и атлета.
 */
export function buildShareContext(athleteForNorms) {
  const w = Number(athleteForNorms?.weight ?? 0)
  const m = findGoldStandardRow(athleteForNorms)

  let weightCategoryLabel
  if (!w || w < 20) {
    weightCategoryLabel = 'не указан (тренер внесёт вес в анкете)'
  } else if (!m) {
    weightCategoryLabel = `${Math.round(w)} кг — личный вес; категория по таблице не найдена (нужны год рождения и пол в анкете).`
  } else {
    const row = m.row
    if (row.openTop) weightCategoryLabel = `свыше ${Math.floor(row.weightMin)} кг`
    else if (row.weightMin === row.weightMax) weightCategoryLabel = `${row.weightMin} кг`
    else weightCategoryLabel = `${row.weightMin}–${row.weightMax} кг`
  }

  let idealHeightLine = '—'
  let typageHint = ''
  if (m?.row) {
    const row = m.row
    typageHint = shortTypageLabel(row.label) || ''
    const ideal = referenceIdealHeightCm(row)
    if (row.openTop && Number.isFinite(row.heightMin)) {
      idealHeightLine = `Ориентир роста «идеального бойца» по таблице: от ${row.heightMin} см (верх по росту в таблице открыт).`
    } else if (Number.isFinite(row.heightMin) && Number.isFinite(row.heightMax)) {
      if (row.heightMin === row.heightMax) {
        idealHeightLine = `${row.heightMin} см — эталонный рост в этой весовой категории по нашей таблице.`
      } else {
        idealHeightLine = `${row.heightMin}–${row.heightMax} см — коридор роста «идеального бойца» по таблице программы.`
      }
    } else if (ideal != null && Number.isFinite(ideal)) {
      idealHeightLine = `${Math.round(ideal)} см — средний ориентир по таблице.`
    }
  }

  return {
    weightCategoryLabel,
    idealHeightLine,
    typageHint,
    note:
      'Это образ для сравнения по возрасту, полу и весу из справочника программы — не медицинская норма и не требование к вашему ребёнку.',
  }
}

function mapNormRows(norms, results) {
  return norms.map((norm) => {
    const row = results[norm.testId]
    const hasResult = row && row.result != null && Number.isFinite(Number(row.result))
    let status = 'empty'
    let critical = false
    let tierLabel = 'Результат не внесён'
    let resultValue = null
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
      if (ev.status === 'red') critical = true
      if (status === 'gold') tierLabel = 'Золото'
      else if (status === 'silver') tierLabel = 'Серебро'
      else if (status === 'bronze') tierLabel = 'Бронза'
      else if (critical) tierLabel = 'Критическое отставание'
      else tierLabel = 'Ниже нормы'
    }
    const passedDisplay = status === 'gold' || status === 'silver' || status === 'bronze'
    return {
      id: String(norm.testId ?? ''),
      name: String(norm.testName ?? 'Норматив'),
      unit,
      hasResult,
      status,
      critical,
      passedDisplay,
      tierLabel,
      resultValue,
      measureType,
      compareHint,
      normGold: Number.isFinite(g) ? g : null,
      normSilver: Number.isFinite(s) ? s : null,
      normBronze: Number.isFinite(b) ? b : null,
    }
  })
}

/**
 * Только данные для публичной страницы: без КСР, КСП, коэффициентов и внутренних баллов.
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
}) {
  const physicalNorms = getNormsForAthlete(allNorms, athleteForNorms, 'physical')
  const functionalNorms = getNormsForAthlete(allNorms, athleteForNorms, 'functional')

  const physicalItems = mapNormRows(physicalNorms, physicalResults)
  const functionalItems = mapNormRows(functionalNorms, functionalResults)

  const countFilled = (items) => items.filter((i) => i.hasResult).length
  const physicalTotal = Math.max(physicalItems.length, 1)
  const functionalTotal = Math.max(functionalItems.length, 1)
  const physicalFilled = countFilled(physicalItems)
  const functionalFilled = countFilled(functionalItems)

  const technicalItems = technicalAtoms.map((atom) => {
    const row = technicalData[atom.id] ?? {}
    const k = normalizeTechnicalDominanceKey(row.level)
    const levelLabel = technicalDominancePublicLabel(row.level)
    const levelPercent = technicalLevelInterpolationPercent(row.level)
    return {
      id: String(atom.id ?? ''),
      number: atom.number != null ? String(atom.number) : '',
      name: String(atom.name ?? 'Элемент'),
      levelKey: k,
      levelLabel,
      levelPercent,
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

  const context = buildShareContext(athleteForNorms)

  return {
    v: 4,
    displayName: displayName || 'Спортсмен',
    photoURL: typeof photoURL === 'string' ? photoURL : '',
    currentWeight: cw,
    weightHistory: chartHistory,
    nextAttestationDate:
      typeof nextAttestationDate === 'string' && nextAttestationDate.trim()
        ? nextAttestationDate.trim()
        : null,
    context,
    physical: {
      items: physicalItems,
      fillPct: Math.round((physicalFilled / physicalTotal) * 100),
      filled: physicalFilled,
      total: physicalTotal,
    },
    functional: {
      items: functionalItems,
      fillPct: Math.round((functionalFilled / functionalTotal) * 100),
      filled: functionalFilled,
      total: functionalTotal,
    },
    technical: {
      atoms: technicalItems,
      /** Среднее по элементам: 0 / 15 / 40 / 75 / 100% за уровень освоения. */
      fillPct: technicalFillPct,
      automatedCount: techAutomated,
      total: techTotal,
    },
  }
}

export function isValidProgressShareToken(t) {
  if (typeof t !== 'string' || t.length < 32 || t.length > 80) return false
  return /^[a-f0-9]+$/i.test(t)
}
