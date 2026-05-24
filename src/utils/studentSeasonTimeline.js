import { formatCompetitionRange } from '../data/competitionLevels.js'
import { getCompetitionMeta } from '../data/competitionLevels.js'
import { getExternalCampStyle } from '../data/externalCampKinds.js'
import { SEASON_CHECKPOINT_KIND_STYLES } from '../data/seasonPlanKinds.js'
import { formatShortDateRu } from './prepSeasonCalendar.js'
import { competitionStillRelevant, isOrientirStart } from './plannedCompetitions.js'

/** @typedef {'camp' | 'start' | 'checkpoint'} StudentTimelineKind */

/**
 * @typedef {{
 *   kind: StudentTimelineKind,
 *   item: import('./plannedCompetitions.js').PlannedCompetition & {
 *     planKind?: string,
 *     checkpointKind?: string,
 *     participantIds?: string[],
 *   },
 *   dateISO: string,
 * }} StudentTimelineEntry
 */

const TYPE_LABEL = {
  camp: 'Сборы',
  start: 'Старт',
  checkpoint: 'Контроль',
}

const TYPE_DOT = {
  camp: 'bg-violet-500',
  start: 'bg-[#2d81e0]',
  checkpoint: 'bg-rose-500',
}

/**
 * @param {Array<import('./plannedCompetitions.js').PlannedCompetition & { planKind?: string, coachEventId?: string, participantIds?: string[], checkpointKind?: string }>} items
 * @param {string} studentId
 */
export function buildStudentSeasonTimeline(items, studentId) {
  /** @type {StudentTimelineEntry[]} */
  const entries = []

  for (const c of items) {
    if (!competitionStillRelevant(c)) continue

    if (c.planKind === 'external_camp') {
      if (!(c.participantIds ?? []).includes(studentId)) continue
      entries.push({ kind: 'camp', item: c, dateISO: c.dateISO })
      continue
    }

    if (c.planKind === 'checkpoint') {
      if (c.calendarOnly) continue
      entries.push({ kind: 'checkpoint', item: c, dateISO: c.dateISO })
      continue
    }

    if (c.coachEventId || isOrientirStart(c)) {
      if (!(c.participantIds ?? []).includes(studentId)) continue
      entries.push({ kind: 'start', item: c, dateISO: c.dateISO })
    }
  }

  entries.sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.kind.localeCompare(b.kind))
  return entries
}

/** @param {StudentTimelineEntry} entry */
export function studentTimelineTypeLabel(entry) {
  return TYPE_LABEL[entry.kind]
}

/** @param {StudentTimelineEntry} entry */
export function studentTimelineTypeDotClass(entry) {
  return TYPE_DOT[entry.kind]
}

/** @param {StudentTimelineEntry} entry */
export function studentTimelineTitle(entry) {
  const { item, kind } = entry
  if (kind === 'camp') {
    return item.title?.trim() || getExternalCampStyle(item)?.label || 'Сборы'
  }
  if (kind === 'checkpoint') {
    const k = item.checkpointKind && item.checkpointKind in SEASON_CHECKPOINT_KIND_STYLES
      ? item.checkpointKind
      : 'other'
    return item.title?.trim() || SEASON_CHECKPOINT_KIND_STYLES[k].label
  }
  return item.title?.trim() || getCompetitionMeta(item).label || 'Старт'
}

/** @param {StudentTimelineEntry} entry */
export function studentTimelineDateLabel(entry) {
  if (entry.kind === 'checkpoint') {
    return formatShortDateRu(entry.item.dateISO)
  }
  return formatCompetitionRange(entry.item)
}
