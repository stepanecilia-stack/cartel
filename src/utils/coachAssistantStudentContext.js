import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import { portalPersonaDisplayName } from '../constants/studentPortalPersonas.js'
import { trainingGoalsLabels } from '../constants/studentPortalOnboarding.js'
import { buildAthleteForNorms, formatStudentNormsCardBlock } from './studentNormsProfile.js'
import { technicalDominancePublicLabel } from './publicSharePayload.js'
import { countLeadingMasteredAtoms } from './studentTechnicalUpdate.js'
import {
  normalizeStudentTechnicalData,
} from './technicalProgramProgress.js'
import { mapCombinationsToDisplayAtoms } from './techniqueCatalog.js'
import {
  summarizeStudentPortalProgress,
  studentPortalTierLabel,
} from './studentPortalProgress.js'
import { normalizePortalKnowledgeData } from './portalKnowledgeData.js'
import { getPersonaMemoryMilestonesForCoach, normalizePortalPersonaMemory } from './portalPersonaMemory.js'
import { formatStudentSensitivePeriodsBrief } from './coachAssistantSensitivePeriods.js'
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
    const portalTech = formatPortalTechnicalBrief(student, atoms, false)
    const norms = formatNormsBrief(student, allNorms, false)
    const sensitive = formatStudentSensitivePeriodsBrief(student, false)
    return [header, coachTech, portalTech, norms, sensitive].join('; ')
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
