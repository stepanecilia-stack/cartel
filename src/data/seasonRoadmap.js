/**
 * Якорь и сроки дорожной карты (дата отбора). Отображение этапов — athletePrepStages.js
 */
import { daysUntilCompetition } from '../utils/competitionDate.js'
import {
  buildStageTimelineLabels,
  resolveAthleteStageId,
} from './athletePrepStages.js'

/** @typedef {import('./seasonGoals.js').SeasonMode} SeasonMode */
/** @typedef {import('../utils/plannedCompetitions.js').PlannedCompetition} PlannedCompetition */

/** @param {string} fromISO @param {string} toISO */
export function daysFromISOUntil(fromISO, toISO) {
  const from = new Date(fromISO + 'T12:00:00')
  const to = new Date(toISO + 'T12:00:00')
  from.setHours(0, 0, 0, 0)
  to.setHours(0, 0, 0, 0)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

import { normalizeDateStatus, pickNextSeasonAnchor } from '../utils/plannedCompetitions.js'

export { pickNextSeasonAnchor, resolvePlanningAnchor } from '../utils/plannedCompetitions.js'

/** @deprecated use athletePrepStages */
export function resolveRoadmapPhaseId(ctx) {
  return resolveAthleteStageId(ctx.daysUntilAnchor, ctx.daysFromToday, ctx.seasonMode)
}

/**
 * @param {PlannedCompetition[]} planned
 * @param {string} todayIso
 * @param {SeasonMode} seasonMode
 * @param {PlannedCompetition | null} [anchorOverride]
 * @param {import('../utils/plannedCompetitions.js').CompetitionDateStatus | 'none'} [certaintyOverride]
 */
export function buildSeasonRoadmapSummary(
  planned,
  todayIso,
  seasonMode,
  anchorOverride = null,
  certaintyOverride = 'none',
) {
  const anchor = anchorOverride ?? pickNextSeasonAnchor(planned)
  const certainty =
    certaintyOverride !== 'none'
      ? certaintyOverride
      : anchor
        ? normalizeDateStatus(anchor.dateStatus)
        : 'none'
  const isOrientir = certainty === 'orientir'
  const daysUntilAnchor = anchor ? daysUntilCompetition(anchor.dateISO) : null
  const timeline = buildStageTimelineLabels(seasonMode, isOrientir ? null : daysUntilAnchor)
  const todayPhaseId = resolveAthleteStageId(isOrientir ? null : daysUntilAnchor, 0, seasonMode)

  return {
    anchor,
    daysUntilAnchor,
    anchorCertainty: certainty,
    todayPhaseId,
    timeline,
    hasAnchor: Boolean(anchor),
  }
}
