import { MOTOR_QUALITY_SLUG_BY_TITLE } from '../data/motorQualitiesCatalog.js'
import { evaluateLegacyTest, normalizeTechnicalDominanceKey } from './ksrUtils.js'
import { ageToStandardsGroup } from './standards.js'
import { orderSensitiveQualitiesForBoxing } from './sensitivePeriods.js'

/**
 * Подпись к сетке эталонов КСП в строке плана. В `standards.js` для всех 19+ лет одна метка «19-22»;
 * для возраста 23–40 лет в подписи строки: «Мужчины 19-40 лет» (та же сетка норм, другой текст).
 */
function coachKspStandardsSuffix(ageInt, stdGroup) {
  if (!stdGroup || ageInt == null || !Number.isFinite(ageInt)) return ''
  const parts = String(stdGroup)
    .split('-')
    .map((s) => Number(s.trim()))
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    const [lo, hi] = parts
    if (ageInt >= lo && ageInt <= hi) return ` (КСП ${stdGroup})`
  }
  if (stdGroup === '19-22' && ageInt >= 23 && ageInt <= 40) {
    return ' (Мужчины 19-40 лет)'
  }
  if (stdGroup === '19-22' && ageInt > 22) {
    return ' (КСП — взрослые эталоны, сетка от 19 лет)'
  }
  return ` (КСП ${stdGroup})`
}

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
 * @returns {(string | { type: 'focus', before: string, section: 'technical'|'physical'|'functional', after: string } | { type: 'sessionFormula', rows: object[] })[]}
 */
export function buildCoachRecommendations(ctx) {
  const {
    ageInt,
    sensitive,
    weights,
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

  const anchor = getBoxingAgeAnchorQuality(ageInt)
  const stdGroup = ageInt != null && Number.isFinite(ageInt) ? ageToStandardsGroup(ageInt) : null

  const hasAgeBody = sensitive?.reason === 'ok' && Boolean(anchor)

  let orderedGreen = []
  /** Качества сенситивной «зелёной» зоны без повтора якоря возраста (якорь уже отдельной строкой таблицы). */
  let greenWithoutAnchor = []
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
    greenWithoutAnchor = orderedGreen.filter((q) => q !== anchor)
    tail = greenWithoutAnchor.slice(0, 2).join(', ') || orderedGreen.slice(0, 2).join(', ')
    greenHint =
      tail || 'см. раздел «Сенситивный период» ниже — список того, что в этом возрасте лучше всего усваивается'
  }

  const physWorst = worstNormInCategory(physicalNorms || [], physicalResults)
  const funcWorst = worstNormInCategory(functionalNorms || [], functionalResults)

  let normative = null

  if (P >= F && P >= T && physWorst && physWorst.score < 55) {
    normative = {
      testName: physWorst.norm.testName,
      score: Math.round(physWorst.score),
      weekly: '2×15',
      category: 'phys',
    }
  } else if (F > P && funcWorst && funcWorst.score < 55) {
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

  const hasGreenRow = hasAgeBody && greenWithoutAnchor.length > 0
  const greensForTable = greenWithoutAnchor.slice(0, 2)
  const hasNormSlot = Boolean(normative)

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
        ? `Упражнения на развитие «${anchor}»${coachKspStandardsSuffix(ageInt, stdGroup)}`
        : 'Тело: возрастной ориентир — нет данных (укажите год рождения)',
      m90: mAnc90,
      m60: mAnc60,
      ...(hasAgeBody && anchor ? { linkableQuotedQualities: [anchor] } : {}),
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
        linkableQuotedQualities: [greensForTable[0]],
      })
      rows.push({
        key: 'green1',
        kind: 'plain',
        label: `Упражнения на развитие «${greensForTable[1]}»`,
        m90: mGreen2_90,
        m60: mGreen2_60,
        linkableQuotedQualities: [greensForTable[1]],
      })
    } else if (greensForTable.length === 1) {
      rows.push({
        key: 'green0',
        kind: 'plain',
        label: `Упражнения на развитие «${greensForTable[0]}»`,
        m90: mGreen1_90,
        m60: mGreen1_60,
        linkableQuotedQualities: [greensForTable[0]],
      })
    } else {
      rows.push({
        key: 'greenFallback',
        kind: 'plain',
        label: `Упражнения на развитие (сенситивный период — ${greenHint})`,
        m90: mGreen1_90,
        m60: mGreen1_60,
        ...(() => {
          if (!tail || String(greenHint).trim().startsWith('см.')) return {}
          const hintLinkTitles = tail
            .split(', ')
            .map((s) => s.trim())
            .filter((t) => MOTOR_QUALITY_SLUG_BY_TITLE[t])
          return hintLinkTitles.length ? { hintLinkTitles } : {}
        })(),
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
  })

  return out.slice(0, 7)
}
