import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import { portalPersonaDisplayName } from '../constants/studentPortalPersonas.js'
import { trainingGoalsLabels } from '../constants/studentPortalOnboarding.js'
import {
  buildAthleteForNorms,
  formatStudentNormsCardBlock,
  formatStudentNormsCountBrief,
} from './studentNormsProfile.js'
import { technicalDominancePublicLabel } from './publicSharePayload.js'
import { countLeadingMasteredAtoms } from './studentTechnicalUpdate.js'
import {
  normalizeStudentTechnicalData,
} from './technicalProgramProgress.js'
import { mapCombinationsToDisplayAtoms } from './techniqueCatalog.js'
import {
  countPortalKnowledgeAtoms,
  summarizeStudentPortalProgress,
  studentPortalTierLabel,
} from './studentPortalProgress.js'
import { normalizePortalKnowledgeData } from './portalKnowledgeData.js'
import { getPersonaMemoryMilestonesForCoach, normalizePortalPersonaMemory } from './portalPersonaMemory.js'
import { formatStudentSensitivePeriodsBrief } from './coachAssistantSensitivePeriods.js'
import { formatStudentSuggestionLine } from './studentNameSearch.js'
import { displayNameFromStudent, formatShortIdDisplay, studentAthleteShape } from './studentModel.js'

/**
 * @param {object | null | undefined} student
 * @param {{ level1?: object[], level2?: object[], level3?: object[] } | null} [programAtoms]
 */
export function resolveStudentProgramAtoms(student, programAtoms = null) {
  const cache = programAtoms ?? getTechnicalProgramAtomsCache()
  const orderedL1 = Array.isArray(cache.level1) ? cache.level1 : []
  const orderedL2 = Array.isArray(cache.level2) ? cache.level2 : []
  const orderedL3 = mapCombinationsToDisplayAtoms(
    student?.technicalCombinations,
    cache.level3 ?? [],
    orderedL1,
  )
  return { orderedL1, orderedL2, orderedL3 }
}

function atomTitle(atom) {
  return String(atom?.title ?? atom?.name ?? atom?.id ?? '—').trim() || '—'
}

/**
 * Точка остановки по «Прогрессу по шагам» — как ползунок в карточке тренера.
 * @param {{ orderedL1: object[], orderedL2: object[], orderedL3: object[] }} atoms
 * @param {Record<string, { level?: string }>} data
 */
export function resolveCoachTechniqueStopPoint({ orderedL1, orderedL2, orderedL3 }, data) {
  const tiers = [
    { level: 1, shortLabel: 'Ур.1', label: 'Ур.1 База', atoms: orderedL1 },
    { level: 2, shortLabel: 'Ур.2', label: 'Ур.2 Снизу/Сбоку', atoms: orderedL2 },
    { level: 3, shortLabel: 'Ур.3', label: 'Ур.3 Двойки', atoms: orderedL3 },
  ].filter((t) => t.atoms.length > 0)

  if (!tiers.length) return null

  /** @type {null | {
   *   tierLevel: number,
   *   tierShortLabel: string,
   *   tierLabel: string,
   *   step: number,
   *   total: number,
   *   atomTitle: string,
   *   levelLabel: string,
   *   tierClosed: boolean,
   *   allTiersClosed: boolean,
   *   nextAtomTitle: string | null,
   * }} */
  let lastStop = null

  for (const tier of tiers) {
    const total = tier.atoms.length
    const mastered = countLeadingMasteredAtoms(tier.atoms, data)
    if (mastered <= 0) {
      return (
        lastStop ?? {
          tierLevel: tier.level,
          tierShortLabel: tier.shortLabel,
          tierLabel: tier.label,
          step: 0,
          total,
          atomTitle: '—',
          levelLabel: 'Не изучен',
          tierClosed: false,
          allTiersClosed: false,
          nextAtomTitle: atomTitle(tier.atoms[0]),
        }
      )
    }

    const step = Math.min(mastered, total)
    const atom = tier.atoms[step - 1]
    const tierClosed = mastered >= total
    const stop = {
      tierLevel: tier.level,
      tierShortLabel: tier.shortLabel,
      tierLabel: tier.label,
      step,
      total,
      atomTitle: atomTitle(atom),
      levelLabel: technicalDominancePublicLabel(data[atom?.id]?.level),
      tierClosed,
      allTiersClosed: false,
      nextAtomTitle: !tierClosed && tier.atoms[step] ? atomTitle(tier.atoms[step]) : null,
    }
    lastStop = stop
    if (!tierClosed) return stop
  }

  if (lastStop) {
    return { ...lastStop, allTiersClosed: true }
  }
  return null
}

/** @param {NonNullable<ReturnType<typeof resolveCoachTechniqueStopPoint>>} stop */
function formatCoachTechniqueStopLine(stop) {
  if (stop.step <= 0) {
    return `техника (тренер): не начата; дальше ${stop.tierShortLabel}, шаг 1 «${stop.nextAtomTitle ?? '—'}»`
  }
  const base = `техника (тренер): остановились на ${stop.tierShortLabel}, шаг ${stop.step} «${stop.atomTitle}» — ${stop.levelLabel}`
  if (stop.allTiersClosed) return `${base}; программа закрыта`
  if (stop.nextAtomTitle) return `${base}; дальше «${stop.nextAtomTitle}»`
  return base
}

/**
 * @param {object} student
 * @param {{ orderedL1: object[], orderedL2: object[], orderedL3: object[] }} atoms
 */
function formatCoachTechnicalBrief(student, atoms, _detailed) {
  const data = normalizeStudentTechnicalData(student?.technicalData)
  const stop = resolveCoachTechniqueStopPoint(atoms, data)
  if (!stop) return 'техника (тренер): программа не загружена'
  return formatCoachTechniqueStopLine(stop)
}

/**
 * @param {object} student
 * @param {{ orderedL1: object[], orderedL2: object[], orderedL3: object[] }} atoms
 */
function formatPortalTechnicalBrief(student, { orderedL1, orderedL2, orderedL3 }, detailed) {
  const pk = normalizePortalKnowledgeData(student?.portalKnowledgeData)
  const summary = summarizeStudentPortalProgress(orderedL1, orderedL2, orderedL3, pk)

  if (!summary.started && !student?.portalEnabled) {
    return 'кабинет ученика: портал не активен или ученик ещё не отмечал «Знание»'
  }

  const tierLines = summary.items.map(
    (t) => `${t.label}: ${t.done}/${t.total}${t.complete ? ' (уровень закрыт)' : ''}`,
  )
  const focusTier = studentPortalTierLabel(summary.activeTier)
  const focusName = summary.focusAtom ? atomTitle(summary.focusAtom) : '—'
  const focusMarked = summary.focusAtom
    ? pk[summary.focusAtom.id]?.level === 'KNOWLEDGE'
      ? 'уже «Знание»'
      : 'ещё не отмечено'
    : ''

  const lines = [
    `кабинет ученика (самостоятельно): ${tierLines.join('; ')}; этап ${focusTier}, текущий атом «${focusName}» ${focusMarked}`,
  ]

  if (detailed) {
    for (const tier of summary.items) {
      const marked = tier.atoms
        .filter((atom) => pk[atom.id]?.level === 'KNOWLEDGE')
        .map((atom) => `«${atomTitle(atom)}»`)
      if (marked.length) {
        lines.push(`  ${tier.label} (отмечено учеником «Знание»): ${marked.join(', ')}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * @param {object} student
 * @param {object[]} allNorms
 */
function formatNormsBrief(student, allNorms, detailed) {
  return formatStudentNormsCardBlock(student, allNorms, detailed)
}

function formatAnthropometryHumanLine(shape) {
  const parts = []
  if (shape.height > 0) parts.push(`рост ${shape.height} см`)
  if (shape.weight > 0) parts.push(`вес ${shape.weight} кг`)
  if (shape.reach > 0) parts.push(`размах ${shape.reach} см`)
  return parts.length ? parts.join(', ') : 'не заполнена'
}

function formatAnthropometryBrief(shape, student) {
  const parts = []
  if (shape.height > 0) parts.push(`рост=${shape.height} см`)
  if (shape.weight > 0) parts.push(`вес=${shape.weight} кг`)
  if (shape.reach > 0) parts.push(`размах=${shape.reach} см`)
  if (student?.anthropometryDate) parts.push(`дата измерения=${student.anthropometryDate}`)
  if (shape.height > 0 && shape.reach > 0) {
    const ape = Number((shape.reach - shape.height).toFixed(1))
    parts.push(`размах−рост=${ape} см`)
  }
  if (student?.archetype || student?.archetypeSmart) {
    parts.push(`архетип=${student.archetype || student.archetypeSmart}`)
  }
  const scores = shape.scores
  if (scores && (scores.T || scores.P || scores.F)) {
    const bits = []
    if (scores.T) bits.push(`T=${scores.T}`)
    if (scores.P) bits.push(`P=${scores.P}`)
    if (scores.F) bits.push(`F=${scores.F}`)
    if (bits.length) parts.push(`баллы ${bits.join(', ')}`)
  }
  return parts.length ? parts.join(', ') : 'антропометрия не заполнена'
}

function formatPortalExtrasBrief(student) {
  const lines = []
  if (student?.portalEnabled) lines.push('портал: включён')
  const persona = portalPersonaDisplayName(student?.portalPersonaId)
  if (persona) lines.push(`вирт. тренер ученика: ${persona}`)
  const goals = trainingGoalsLabels(student?.portalTrainingGoals ?? student?.portalTrainingGoal)
  if (goals.length) lines.push(`цели из анкеты: ${goals.join('; ')}`)

  const memory = normalizePortalPersonaMemory(student?.portalPersonaMemory)
  const milestones = getPersonaMemoryMilestonesForCoach(memory)
  if (milestones.length) {
    lines.push(
      `вехи кабинета: ${milestones.map((m) => m.label + (m.detail ? ` (${m.detail})` : '')).join('; ')}`,
    )
  }
  if (memory.levelNotes) lines.push(`заметки вирт. тренера: ${memory.levelNotes.slice(0, 280)}`)
  if (memory.conversationSummary) {
    lines.push(`сводка переписки с учеником: ${memory.conversationSummary.slice(0, 280)}`)
  }
  return lines
}

/**
 * Где остановились в технике — одна строка для тренера.
 * @param {object} student
 * @param {{ level1?: object[], level2?: object[], level3?: object[] } | null} [programAtoms]
 */
export function formatCoachTechniqueStopShort(student, programAtoms = null) {
  const atoms = resolveStudentProgramAtoms(student, programAtoms)
  const data = normalizeStudentTechnicalData(student?.technicalData)
  const stop = resolveCoachTechniqueStopPoint(atoms, data)
  if (!stop || stop.step <= 0) return 'техника не начата'
  return `${stop.tierShortLabel}, шаг ${stop.step} «${stop.atomTitle}» — ${stop.levelLabel}`
}

/**
 * Сводка по ученику для ответа «найди / покажи»: антропометрия, техника, нормативы.
 * @param {object} student
 * @param {object[]} allNorms
 * @param {{ level1?: object[], level2?: object[], level3?: object[] } | null} [programAtoms]
 */
export function formatStudentCoachSummaryText(student, allNorms, programAtoms = null) {
  const name = displayNameFromStudent(student)
  const athlete = buildAthleteForNorms(student)
  const shape = studentAthleteShape(athlete)
  const gender = athlete.gender === 'F' ? 'Ж' : 'М'
  const birth = athlete.birthYear ? `${athlete.birthYear} г.р.` : null
  const header = [name, gender, birth].filter(Boolean).join(', ')

  return [
    header,
    `Антропометрия: ${formatAnthropometryHumanLine(shape)}.`,
    `Техника: ${formatCoachTechniqueStopShort(student, programAtoms)}.`,
    `${formatStudentNormsCountBrief(student, allNorms).replace(/^нормативы:\s*/i, 'Нормативы: ')}.`,
  ].join('\n')
}

/**
 * @param {string} text
 */
export function isStudentTopicSpecificQuery(text) {
  const lower = String(text ?? '').toLowerCase()
  return /техник|кабинет|этап|атом|уровен|умение|знание|навык|рост|вес|размах|антроп|физическ|норматив|сдал|зач[её]т|золот|серебр|бронз|сенситив|чувствител|окн[ао].*развит|моторн|качеств.*возраст|кср|кд\b|архетип|вирт|тренер ученика|кабинет/.test(
    lower,
  )
}

/**
 * @param {string} text
 */
export function isStudentLookupQuery(text) {
  const lower = String(text ?? '').trim().toLowerCase()
  if (!lower) return false
  if (isStudentTopicSpecificQuery(lower)) return false
  return /найди|найти|покажи|покажите|кто такой|кто такая|открой|откройте|выведи|дай\s+(мне\s+)?(данн|инф|сводк)|информаци|сведения|карточк|про\s+ученик|что\s+с\s+/i.test(
    lower,
  )
}

/**
 * @param {object} student
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {object[]} allNorms
 * @param {{ level1?: object[], level2?: object[], level3?: object[] } | null} [programAtoms]
 */
export function formatStudentLookupReply(student, personaId, allNorms, programAtoms = null) {
  const summary = formatStudentCoachSummaryText(student, allNorms, programAtoms)
  const name = displayNameFromStudent(student)

  if (personaId === 'vasily') {
    return `Коллега, нашёл:\n${summary}\nЧто уточнить?`
  }
  if (personaId === 'gleb') {
    return `Краткая сводка по ${name}:\n${summary}\nУточните, что разобрать подробнее.`
  }
  return `Коллега, вот сводка:\n${summary}\nСпроси детали: нормативы, техника, сенситив.`
}

/**
 * @param {object[]} suggestions
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {boolean} [includeCode]
 * @param {{ corrections?: { from: string, to: string }[] }} [options]
 */
export function formatStudentSuggestionsReply(suggestions, personaId, includeCode = false, options = {}) {
  const corrections = Array.isArray(options.corrections) ? options.corrections : []
  const correctionHint =
    corrections.length > 0
      ? `Возможно, имелось в виду: ${corrections.map((c) => `«${c.from}» → ${c.to}`).join(', ')}.\n`
      : ''

  const list = (Array.isArray(suggestions) ? suggestions : [])
    .slice(0, 5)
    .map((s) => `• ${formatStudentSuggestionLine(s, { includeCode })}`)
    .join('\n')
  if (!list) {
    return personaId === 'gleb'
      ? 'Не нашёл такого ученика. Уточните имя, фамилию или код.'
      : 'Коллега, такого ученика не вижу. Назови имя, фамилию или код.'
  }
  if (personaId === 'vasily') {
    return `${correctionHint}Похожие в базе (уточни, кого именно):\n${list}\nНазови имя или год рождения — не гадаю за тебя.`
  }
  if (personaId === 'gleb') {
    return `${correctionHint}Похожие ученики:\n${list}\nУточните, кого имеете в виду.`
  }
  return `${correctionHint}Коллега, похоже, имелись в виду:\n${list}\nНазови точнее — имя или фамилию.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId} personaId
 * @param {number} rosterSize
 * @param {string[]} [nameTokens]
 */
export function formatStudentNotFoundReply(personaId, rosterSize, nameTokens = []) {
  const hint = nameTokens.length
    ? `По запросу «${nameTokens.join(' ')}» в списке (${rosterSize} уч.) никого не нашёл.`
    : `В списке (${rosterSize} уч.) такого ученика не вижу.`

  if (personaId === 'vasily') {
    return `${hint} Назови имя и фамилию точнее или код из карточки. Не выдумываю — только кто реально в списке.`
  }
  if (personaId === 'gleb') {
    return `${hint} Уточните ФИО или 6-значный код.`
  }
  return `${hint} Уточни имя, фамилию или код.`
}

/**
 * @param {{ significantTokens?: string[] }} nameQuery
 */
export function messageHasStudentNameIntent(nameQuery) {
  return (nameQuery?.significantTokens?.length ?? 0) >= 1
}

/**
 * Полная или краткая строка ученика для промпта коллеги-тренера.
 * @param {object} student
 * @param {object[]} allNorms
 * @param {boolean} [detailed]
 * @param {{ level1?: object[], level2?: object[], level3?: object[] } | null} [programAtoms]
 */
export function formatStudentCoachBrief(student, allNorms, detailed = false, programAtoms = null) {
  const id = String(student?.id ?? '')
  const name = displayNameFromStudent(student)
  const code = student?.short_id ? formatShortIdDisplay(student.short_id) : '—'
  const athlete = buildAthleteForNorms(student)
  const shape = studentAthleteShape(athlete)
  const gender = athlete.gender === 'F' ? 'Ж' : 'М'
  const birth = athlete.birthYear ? `г.р.=${athlete.birthYear}` : null

  const baseKsr = Number(student?.baseKSR)
  const eff = Number(student?.effectiveKSR ?? student?.baseKSR ?? 0)
  const kd = student?.kd != null ? Number(student.kd) : null

  const ksrParts = []
  if (Number.isFinite(baseKsr) && baseKsr > 0) ksrParts.push(`базовый КСР=${baseKsr.toFixed(1)}`)
  if (Number.isFinite(eff) && eff > 0) ksrParts.push(`эффективный КСР=${eff.toFixed(1)}`)
  if (kd != null && Number.isFinite(kd)) ksrParts.push(`КД=${kd.toFixed(2)}`)

  const atoms = resolveStudentProgramAtoms(student, programAtoms)
  const header = [
    `id=${id}`,
    `имя=${name}`,
    `код=${code}`,
    `пол=${gender}`,
    birth,
    formatAnthropometryBrief(shape, student),
    ksrParts.join(', ') || null,
  ]
    .filter(Boolean)
    .join('; ')

  if (!detailed) {
    const coachTech = formatCoachTechnicalBrief(student, atoms)
    const pk = normalizePortalKnowledgeData(student?.portalKnowledgeData)
    const portalL1 = countPortalKnowledgeAtoms(atoms.orderedL1, pk)
    const portalHint =
      portalL1 > 0 && atoms.orderedL1.length > 0
        ? `; кабинет Ур.1: ${portalL1}/${atoms.orderedL1.length} «Знание» (самостоятельно)`
        : ''
    const norms = formatStudentNormsCountBrief(student, allNorms)
    return [header, coachTech + portalHint, norms].join('; ')
  }

  const sections = [
    header,
    formatCoachTechnicalBrief(student, atoms),
    formatPortalTechnicalBrief(student, atoms, true),
    formatNormsBrief(student, allNorms, true),
    formatStudentSensitivePeriodsBrief(student, true),
    ...formatPortalExtrasBrief(student),
  ]
  return sections.filter(Boolean).join('\n')
}

/** @deprecated используй formatStudentCoachBrief */
export function formatStudentCoachLine(student, allNorms, detailed = false, programAtoms = null) {
  return formatStudentCoachBrief(student, allNorms, detailed, programAtoms)
}
