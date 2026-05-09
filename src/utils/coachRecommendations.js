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
 * Рекомендации для тренера: техника по цепочке, доминантность/рейтинг, возрастной якорь + сенситив, нормы, тактика.
 * @param {object} ctx — см. поля внутри функции
 * @returns {string[]}
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
      out.push(
        'Коэффициент доминантности техники (КД — насколько «дотянута» техника по уровням освоения) заметно снижает эффективный коэффициент спортивной реализации (КСР) относительно базового КСР (тот же показатель по технике, физике и функционалу до умножения на КД). Приоритет — довести ключевые открытые элементы хотя бы до «Умение» / «Навык».',
      )
    } else if (kdNum < 0.55) {
      out.push(
        'Коэффициент доминантности техники (КД) ниже среднего — итоговый коэффициент спортивной реализации с учётом техники (эффективный КСР) получается заниженным. Планируйте больше повторений и контроля техники в бою на лапах / в спарринге.',
      )
    }
  }

  const atoms = Array.isArray(orderedTechnicalAtoms) ? orderedTechnicalAtoms : []
  const locks = technicalLocksById || {}
  const data = technicalData || {}

  let firstLocked = null
  let prevForLocked = null
  for (let i = 0; i < atoms.length; i += 1) {
    const atom = atoms[i]
    if (locks[atom.id]) {
      firstLocked = atom
      prevForLocked = i > 0 ? atoms[i - 1] : null
      break
    }
  }
  if (firstLocked && prevForLocked) {
    out.push(
      `Цепочка техники: чтобы открыть «${firstLocked.name ?? 'следующий элемент'}», доведите предыдущий — «${prevForLocked.name ?? 'элемент'}» — до уровня «Умение» или выше.`,
    )
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
  if (focusOpen) {
    const label = focusOpen.name ?? 'текущий элемент'
    if (focusRank <= 0) {
      out.push(`Техника: закрепите «${label}» — переведите с «Не изучен» на «Знание», затем на «Умение».`)
    } else if (focusRank === 1) {
      out.push(`Техника: «${label}» на уровне «Знание» — цель ближайших занятий: выйти на «Умение» (стабильное исполнение под лёгким сопротивлением).`)
    } else {
      out.push(
        `Техника: усильте «${label}» до «Навык» / «Автоматизм», чтобы рос коэффициент доминантности техники (КД) и вместе с ним эффективный коэффициент спортивной реализации (КСР) — плюс уверенность в серии.`,
      )
    }
  } else if (atoms.length && !firstLocked) {
    out.push('Техника: цепочка открыта — поддерживайте автоматизм по программе и добавляйте вариативность под задачи боя.')
  }

  const anchor = getBoxingAgeAnchorQuality(ageInt)
  const stdGroup = ageInt != null && Number.isFinite(ageInt) ? ageToStandardsGroup(ageInt) : null

  if (sensitive?.reason === 'no_birth_year' || ageInt == null) {
    out.push('Укажите год рождения в антропометрии — появятся рекомендации по сенситивным периодам развития качеств.')
  } else if (sensitive?.reason === 'below_table') {
    out.push('Возраст младше таблицы сенситивных периодов (7 лет) — ориентируйтесь на игровую моторику и безопасную дозировку нагрузки.')
  } else if (sensitive?.reason === 'ok' && anchor) {
    const orderedGreen = orderSensitiveQualitiesForBoxing(sensitive.qualities || [])
    const inGreen = orderedGreen.filter((q) => q === anchor)
    const tail = orderedGreen.slice(0, 2).join(', ')
    if (stdGroup) {
      out.push(
        `Возрастная группа эталонов ${stdGroup}: акцент развития — «${anchor}». В сенситивной «зелёной» зоне сейчас: ${tail || 'см. список ниже по разделу сенситивного периода'}.`,
      )
    } else {
      out.push(
        `До 13 лет эталоны КСП по возрастной группе не заданы; акцент тренировки — «${anchor}». В «зелёной» зоне сенситивности: ${tail || 'см. список внизу страницы'}.`,
      )
    }
    if (inGreen.length === 0 && orderedGreen.length) {
      out.push(`Совмещайте «${anchor}» с уже благоприятными качествами: ${orderedGreen[0]} — усильте связку в уроке.`)
    }
  }

  const physWorst = worstNormInCategory(physicalNorms || [], physicalResults)
  const funcWorst = worstNormInCategory(functionalNorms || [], functionalResults)

  if (P >= F && P >= T && physWorst && physWorst.score < 55) {
    out.push(
      `Физика (в расчёте коэффициента спортивной реализации, КСР, на этот раздел приходится больший вес): ослабый норматив «${physWorst.norm.testName}» (${Math.round(physWorst.score)} балл.) — включите в план прицельно.`,
    )
  } else if (F > P && funcWorst && funcWorst.score < 55) {
    out.push(
      `Функционал (в расчёте коэффициента спортивной реализации, КСР, на этот раздел приходится больший вес): ослабый норматив «${funcWorst.norm.testName}» (${Math.round(funcWorst.score)} балл.) — дайте приоритет в микроцикле.`,
    )
  } else if (physWorst && physWorst.score < 45) {
    out.push(`Физика: «${physWorst.norm.testName}» отстаёт (${Math.round(physWorst.score)} балл.) — точечная работа по тесту.`)
  } else if (funcWorst && funcWorst.score < 45) {
    out.push(`Функционал: «${funcWorst.norm.testName}» отстаёт (${Math.round(funcWorst.score)} балл.) — точечная работа по тесту.`)
  }

  if (weights?.tacticMode === 'infighter' && weights?.tacticAdvice) {
    out.push(`Тактика: ${weights.tacticAdvice}`)
  } else if (weights?.tacticMode === 'outfighter' && weights?.tacticAdvice) {
    out.push(`Тактика: ${weights.tacticAdvice}`)
  } else if (tacticDistanceDisplay && tacticDistanceDisplay !== '—') {
    out.push(`Дистанция и стиль: ориентир «${tacticDistanceDisplay}» (${weights?.archetypeSmart ?? 'профиль'}).`)
  }

  const maxInf = Math.max(T, P, F)
  if (maxInf > 0 && T === maxInf && kdNum < 0.55) {
    out.push(
      'Вес модели сильно тянет раздел «Техника»: без роста коэффициента доминантности техники (КД) потолок эффективного коэффициента спортивной реализации (КСР) останется низким.',
    )
  }

  return out.slice(0, 7)
}
