import { evaluateLegacyTest, normalizeTechnicalDominanceKey } from './ksrUtils.js'
import { ageToStandardsGroup } from './standards.js'
import { orderSensitiveQualitiesForBoxing } from './sensitivePeriods.js'

const LEVEL_RANK = {
  NOT_LEARNED: 0,
  KNOWLEDGE: 1,
  MOTOR_SKILL_LEVEL_1: 2,
  MOTOR_SKILL_LEVEL_2: 3,
  AUTOMATED: 4,
}

/** Раздел с наибольшим весом в модели (T / P / F). */
function dominantProgressSection(weights) {
  const T = Number(weights?.T ?? 0)
  const P = Number(weights?.P ?? 0)
  const F = Number(weights?.F ?? 0)
  const m = Math.max(T, P, F)
  if (!Number.isFinite(m) || m <= 0) return 'technical'
  if (T >= P && T >= F) return 'technical'
  if (P >= F) return 'physical'
  return 'functional'
}

/** Подпись и цвет акцента для раздела (список рекомендаций). */
export const COACH_REC_FOCUS = {
  technical: { label: 'Технику', className: 'font-semibold text-blue-700' },
  physical: { label: 'Физику', className: 'font-semibold text-amber-700' },
  functional: { label: 'Функционал', className: 'font-semibold text-violet-700' },
}

/** @param {unknown} item */
export function isCoachRecFocusItem(item) {
  return Boolean(item && typeof item === 'object' && item.type === 'focus')
}

/** Цвет названия элемента техники (как акцент «Технику» в пункте про упор на раздел). */
export const COACH_REC_ELEMENT_NAME_CLASS = 'font-semibold text-blue-700'

/** @param {unknown} item */
export function isCoachRecTechElementItem(item) {
  return Boolean(item && typeof item === 'object' && item.type === 'techElement')
}

/** @param {unknown} item */
export function isCoachRecSessionFormula(item) {
  return Boolean(item && typeof item === 'object' && item.type === 'sessionFormula')
}

/**
 * Возрастной «якорь» для бокса (полные годы).
 * 13+ согласованы с группами эталонов; 7–12 — внутренняя лестница до эталонов.
 */
export function getBoxingAgeAnchorQuality(ageInt) {
  if (ageInt == null || !Number.isFinite(ageInt)) return null
  if (ageInt < 7) return null
  if (ageInt <= 8) return 'Равновесие'
  if (ageInt <= 10) return 'Быстрота'
  if (ageInt <= 12) return 'Координационные способности'
  if (ageInt <= 14) return 'Координационные способности'
  if (ageInt <= 16) return 'Скоростно-силовые качества'
  if (ageInt <= 18) return 'Анаэробные возможности'
  return 'Динамическая сила'
}

function rankLevel(level) {
  return LEVEL_RANK[normalizeTechnicalDominanceKey(level)] ?? 0
}

function normalizeLegacyTestId(id) {
  return String(id ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function getNormValueByTestId(values, testId) {
  if (!values || typeof values !== 'object') return undefined
  if (values[testId]) return values[testId]
  const normalizedTarget = normalizeLegacyTestId(testId)
  if (!normalizedTarget) return undefined
  for (const [key, value] of Object.entries(values)) {
    if (normalizeLegacyTestId(key) === normalizedTarget) return value
  }
  return undefined
}

function worstNormInCategory(norms, values) {
  let worst = null
  let worstScore = Infinity
  for (const norm of norms) {
    const row = getNormValueByTestId(values, norm.testId)
    if (!row || !Number.isFinite(row.result)) continue
    const evaluated = evaluateLegacyTest(row.result, norm)
    const sc = Number(row.normalizedScore ?? evaluated.normalizedScore ?? 0)
    if (sc < worstScore) {
      worstScore = sc
      worst = { norm, row, evaluated, score: sc }
    }
  }
  return worst
}

/**
 * Рекомендации для тренера: префикс по КД + временная формула тренировки (логика веток без изменений).
 * @param {object} ctx
 * @returns {(string | { type: 'focus', before: string, section: 'technical'|'physical'|'functional', after: string } | { type: 'sessionFormula', rows: object[], footnotes: string[] })[]}
 */
export function buildCoachRecommendations(ctx) {
  const {
    ageInt,
    sensitive,
    weights,
    tacticDistanceDisplay,
    kd,
    baseKSR,
    effectiveKSR,
    orderedTechnicalAtoms,
    technicalLocksById,
    technicalData,
    physicalNorms,
    functionalNorms,
    physicalResults,
    functionalResults,
  } = ctx

  const out = []
  const T = Number(weights?.T ?? 0)
  const P = Number(weights?.P ?? 0)
  const F = Number(weights?.F ?? 0)
  const kdNum = Number(kd)
  const base = Number(baseKSR)
  const eff = Number(effectiveKSR)

  if (Number.isFinite(base) && base > 5 && Number.isFinite(eff) && Number.isFinite(kdNum)) {
    if (kdNum < 0.5 && eff < base * 0.92) {
      out.push({
        type: 'focus',
        before: 'Ближайшие 2–3 тренировки: упор на ',
        section: dominantProgressSection(weights),
        after: '.',
      })
    } else if (kdNum < 0.55) {
      out.push(
        'Каждую тренировку 10–15 мин: лапы или лёгкий спарринг — одна задача, чистота двух-трёх движений.',
      )
    }
  }

  const atoms = Array.isArray(orderedTechnicalAtoms) ? orderedTechnicalAtoms : []
  const locks = technicalLocksById || {}
  const data = technicalData || {}

  let firstLocked = null
  for (const atom of atoms) {
    if (locks[atom.id]) {
      firstLocked = atom
      break
    }
  }
  let focusOpen = null
  let focusRank = -1
  for (const atom of atoms) {
    if (locks[atom.id]) break
    const r = rankLevel(data[atom.id]?.level)
    if (r < 2) {
      focusOpen = atom
      focusRank = r
      break
    }
  }
  if (!focusOpen) {
    for (const atom of atoms) {
      if (locks[atom.id]) break
      const r = rankLevel(data[atom.id]?.level)
      if (r < 3) {
        focusOpen = atom
        focusRank = r
        break
      }
    }
  }

  let technical = null
  if (focusOpen) {
    const label = focusOpen.name ?? 'текущий элемент'
    if (focusRank <= 0) {
      technical = { name: label, taskSuffix: ', задача — вывести на «Знание», затем на «Умение».' }
    } else if (focusRank === 1) {
      technical = { name: label, taskSuffix: ', задача — довести до уровня «Умение».' }
    } else {
      technical = { name: label, taskSuffix: ', задача — довести до «Навык» или «Автоматизм».' }
    }
  }

  const chainOpenNote =
    atoms.length && !firstLocked && !focusOpen
      ? 'Цепочка открыта: нагрузку не наращивать за счёт новизны — 1–2 боевые связки из уже освоенного и смена условий (усталость, дистанция, счёт).'
      : null

  const anchor = getBoxingAgeAnchorQuality(ageInt)
  const stdGroup = ageInt != null && Number.isFinite(ageInt) ? ageToStandardsGroup(ageInt) : null

  let sensitiveWeeklyNote = null
  let sensitiveDailyNote = null
  const hasAgeBody = sensitive?.reason === 'ok' && Boolean(anchor)

  let orderedGreen = []
  let inGreen = []
  let tail = ''
  let greenHint = ''

  if (sensitive?.reason === 'no_birth_year' || ageInt == null) {
    out.push('Указать в антропометрии год рождения — иначе возрастные указания по телу здесь не строятся.')
  } else if (sensitive?.reason === 'below_table') {
    out.push(
      'До 7 лет: короткие разнообразные отрезки занятия, игра и координация, без удорожания одной способностью и без «взрослой» специализации.',
    )
  } else if (hasAgeBody) {
    orderedGreen = orderSensitiveQualitiesForBoxing(sensitive.qualities || [])
    inGreen = orderedGreen.filter((q) => q === anchor)
    tail = orderedGreen.slice(0, 2).join(', ')
    greenHint =
      tail || 'см. раздел «Сенситивный период» ниже — список того, что в этом возрасте лучше всего усваивается'
    const weeklyQualityList = orderedGreen.slice(0, 2).join(', ') || greenHint
    if (stdGroup) {
      sensitiveWeeklyNote = `Дважды за неделю по 10 мин — на то, что сейчас лучше всего усваивается: ${weeklyQualityList}.`
    } else {
      sensitiveWeeklyNote = `Включить в неделю то, что сейчас лучше всего усваивается: ${weeklyQualityList}.`
    }
    if (inGreen.length === 0 && orderedGreen.length) {
      const topGreen = orderedGreen[0]
      sensitiveDailyNote = `Каждое занятие 10–15 мин на «${topGreen}»; «${anchor}» не убирать — чередовать отрезки работы.`
    }
  }

  const physWorst = worstNormInCategory(physicalNorms || [], physicalResults)
  const funcWorst = worstNormInCategory(functionalNorms || [], functionalResults)

  let normative = null
  let normFuncPlacementNote = null

  if (P >= F && P >= T && physWorst && physWorst.score < 55) {
    normative = {
      testName: physWorst.norm.testName,
      score: Math.round(physWorst.score),
      weekly: '2×15',
      category: 'phys',
    }
  } else if (F > P && funcWorst && funcWorst.score < 55) {
    normFuncPlacementNote = `Функционал тянет общий балл (КСР): тест «${funcWorst.norm.testName}» (${Math.round(
      funcWorst.score,
    )} балл.) — в микроцикле ставить вторым после разминки, не в «хвост» тренировки.`
  } else if (physWorst && physWorst.score < 45) {
    normative = {
      testName: physWorst.norm.testName,
      score: Math.round(physWorst.score),
      weekly: '2×12',
      category: 'phys',
    }
  } else if (funcWorst && funcWorst.score < 45) {
    normative = {
      testName: funcWorst.norm.testName,
      score: Math.round(funcWorst.score),
      weekly: '2×12',
      category: 'func',
    }
  }

  let tacticNote = null
  if (weights?.tacticMode === 'infighter' && weights?.tacticAdvice) {
    tacticNote = `В бою и спарринге: ${weights.tacticAdvice}`
  } else if (weights?.tacticMode === 'outfighter' && weights?.tacticAdvice) {
    tacticNote = `В бою и спарринге: ${weights.tacticAdvice}`
  } else if (tacticDistanceDisplay && tacticDistanceDisplay !== '—') {
    tacticNote = `Спарринг на неделю: одна явная задача по дистанции — «${tacticDistanceDisplay}» (${weights?.archetypeSmart ?? 'профиль'}), без смешения стиля за один раунд.`
  }

  const maxInf = Math.max(T, P, F)
  let modelNote = null
  if (maxInf > 0 && T === maxInf && kdNum < 0.55) {
    modelNote =
      'Сначала довести технику по программе (поднять КД), потом наращивать объём силы и бега вне связки с техникой — для этого спортсмена так считает модель; иначе общий балл (КСР) почти не вырастет.'
  }

  const footnotes = []
  if (sensitiveWeeklyNote) footnotes.push(sensitiveWeeklyNote)
  if (sensitiveDailyNote) footnotes.push(sensitiveDailyNote)
  if (normFuncPlacementNote) footnotes.push(normFuncPlacementNote)
  if (chainOpenNote) footnotes.push(chainOpenNote)
  if (tacticNote) footnotes.push(tacticNote)
  if (modelNote) footnotes.push(modelNote)

  const hasGreenRow = hasAgeBody && Boolean(tail || orderedGreen.length)
  const greensForTable = orderedGreen.slice(0, 2)
  const hasNormSlot = Boolean(normative)

  if (normative) {
    const wkMin = normative.weekly === '2×15' ? 15 : 12
    let nLine = `Норматив «${normative.testName}» (${normative.score} балл.): в неделю два раза по ${wkMin} мин только этот тест`
    if (normative.weekly === '2×15' && normative.category === 'phys') {
      nLine += ' + простое «домашнее» на то же качество'
    }
    footnotes.unshift(nLine)
  }

  let mWarm90 = 10
  let mWarm60 = 8
  let mAnc90 = hasAgeBody ? 12 : 0
  let mAnc60 = hasAgeBody ? 8 : 0
  const greenTwoSplit = hasGreenRow && greensForTable.length >= 2
  const mGreen1_90 = hasGreenRow ? (greenTwoSplit ? 6 : 12) : 0
  const mGreen1_60 = hasGreenRow ? (greenTwoSplit ? 4 : 8) : 0
  const mGreen2_90 = hasGreenRow && greenTwoSplit ? 6 : 0
  const mGreen2_60 = hasGreenRow && greenTwoSplit ? 4 : 0
  let mTech90 = 30
  let mTech60 = 22
  let mNorm90 = hasNormSlot ? 15 : 0
  let mNorm60 = hasNormSlot ? 8 : 0
  let mFat90 = 8
  let mFat60 = 4
  let mCool90 = 3
  let mCool60 = 2

  const bodyMiss90 = (hasAgeBody ? 0 : 24) + (hasAgeBody && !hasGreenRow ? 12 : 0)
  const bodyMiss60 = (hasAgeBody ? 0 : 16) + (hasAgeBody && !hasGreenRow ? 8 : 0)
  const normMiss90 = hasNormSlot ? 0 : 15
  const normMiss60 = hasNormSlot ? 0 : 8

  mTech90 += bodyMiss90 + normMiss90
  mTech60 += bodyMiss60 + normMiss60

  const rows = [
    { key: 'warmup', kind: 'plain', label: 'Разминка', m90: mWarm90, m60: mWarm60 },
    {
      key: 'anchor',
      kind: 'plain',
      label: hasAgeBody
        ? `Упражнения на развитие «${anchor}»${stdGroup ? ` (КСП ${stdGroup})` : ''}`
        : 'Тело: возрастной ориентир — нет данных (укажите год рождения)',
      m90: mAnc90,
      m60: mAnc60,
    },
  ]
  if (hasGreenRow) {
    if (greensForTable.length >= 2) {
      rows.push({
        key: 'green0',
        kind: 'plain',
        label: `Упражнения на развитие «${greensForTable[0]}»`,
        m90: mGreen1_90,
        m60: mGreen1_60,
      })
      rows.push({
        key: 'green1',
        kind: 'plain',
        label: `Упражнения на развитие «${greensForTable[1]}»`,
        m90: mGreen2_90,
        m60: mGreen2_60,
      })
    } else if (greensForTable.length === 1) {
      rows.push({
        key: 'green0',
        kind: 'plain',
        label: `Упражнения на развитие «${greensForTable[0]}»`,
        m90: mGreen1_90,
        m60: mGreen1_60,
      })
    } else {
      rows.push({
        key: 'greenFallback',
        kind: 'plain',
        label: `Упражнения на развитие (сенситивный период — ${greenHint})`,
        m90: mGreen1_90,
        m60: mGreen1_60,
      })
    }
  }
  rows.push(
    {
      key: 'technical',
      kind: 'technical',
      label: '',
      m90: mTech90,
      m60: mTech60,
      technical,
    },
    {
      key: 'norm',
      kind: 'norm',
      label: '',
      m90: mNorm90,
      m60: mNorm60,
      normative,
    },
    {
      key: 'fatigue',
      kind: 'plain',
      label: 'Лёгкая отработка под усталость (лапы / смена темпа) — без нового материала',
      m90: mFat90,
      m60: mFat60,
    },
    { key: 'cooldown', kind: 'plain', label: 'Заминка', m90: mCool90, m60: mCool60 },
  )

  out.push({
    type: 'sessionFormula',
    rows,
    footnotes,
  })

  return out.slice(0, 7)
}
