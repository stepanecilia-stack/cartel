import { competitionDateRange, normalizeCompetitionRange } from '../data/competitionLevels.js'
import { buildMicroCycleSegments } from '../data/juniorPrepTracks.js'
import { isIsoInInclusiveRange } from './prepSeasonCalendar.js'

/** @typedef {'ofp' | 'sfp' | 'sttm' | 'base' | 'recovery'} SeasonBlockPhase */
/** @typedef {'med' | 'norm' | 'sparring' | 'match' | 'other'} SeasonCheckpointKind */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   phase: SeasonBlockPhase,
 *   dateISO: string,
 *   dateEndISO: string,
 *   anchorEventId?: string | null,
 *   done?: boolean,
 * }} SeasonBlock
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   kind: SeasonCheckpointKind,
 *   dateISO: string,
 *   done?: boolean,
 * }} SeasonCheckpoint
 */

const BLOCK_PHASES = new Set(['ofp', 'sfp', 'sttm', 'base', 'recovery'])
const CHECKPOINT_KINDS = new Set(['med', 'norm', 'sparring', 'match', 'other'])

/**
 * @param {unknown} raw
 * @returns {SeasonBlockPhase}
 */
function normalizeBlockPhase(raw) {
  const id = typeof raw === 'string' ? raw : ''
  return BLOCK_PHASES.has(id) ? /** @type {SeasonBlockPhase} */ (id) : 'base'
}

/**
 * @param {unknown} raw
 * @returns {SeasonCheckpointKind}
 */
function normalizeCheckpointKind(raw) {
  const id = typeof raw === 'string' ? raw : ''
  return CHECKPOINT_KINDS.has(id) ? /** @type {SeasonCheckpointKind} */ (id) : 'other'
}

/**
 * @param {unknown} raw
 * @returns {SeasonBlock[]}
 */
export function normalizeSeasonBlocks(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const id = typeof row.id === 'string' ? row.id : ''
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const dateISO = typeof row.dateISO === 'string' ? row.dateISO : ''
    if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) continue
    const range = normalizeCompetitionRange(dateISO, row.dateEndISO ?? dateISO)
    out.push({
      id,
      title,
      phase: normalizeBlockPhase(row.phase),
      dateISO: range.dateISO,
      dateEndISO: range.dateEndISO,
      anchorEventId: typeof row.anchorEventId === 'string' ? row.anchorEventId : null,
      done: Boolean(row.done),
    })
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.title.localeCompare(b.title))
}

/**
 * @param {unknown} raw
 * @returns {SeasonCheckpoint[]}
 */
export function normalizeSeasonCheckpoints(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const id = typeof row.id === 'string' ? row.id : ''
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const dateISO = typeof row.dateISO === 'string' ? row.dateISO : ''
    if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) continue
    out.push({
      id,
      title,
      kind: normalizeCheckpointKind(row.kind),
      dateISO,
      done: Boolean(row.done),
    })
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.title.localeCompare(b.title))
}

export function newSeasonBlockId(prefix = 'block') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function newSeasonCheckpointId(prefix = 'cp') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** @param {SeasonBlock} block */
export function seasonBlockToCalendarItem(block) {
  return {
    id: block.id,
    title: block.title,
    dateISO: block.dateISO,
    dateEndISO: block.dateEndISO,
    planKind: 'block',
    blockPhase: block.phase,
    anchorEventId: block.anchorEventId ?? undefined,
    planDone: block.done,
  }
}

/** @param {SeasonCheckpoint} cp */
export function seasonCheckpointToCalendarItem(cp) {
  return {
    id: cp.id,
    title: cp.title,
    dateISO: cp.dateISO,
    dateEndISO: cp.dateISO,
    planKind: 'checkpoint',
    checkpointKind: cp.kind,
    planDone: cp.done,
  }
}

/**
 * @param {import('./plannedCompetitions.js').PlannedCompetition[]} events
 * @param {SeasonBlock[]} blocks
 * @param {SeasonCheckpoint[]} checkpoints
 */
export function mergeSeasonPlanCalendarItems(events, blocks, checkpoints) {
  const planItems = [
    ...blocks.map(seasonBlockToCalendarItem),
    ...checkpoints.map(seasonCheckpointToCalendarItem),
  ]
  return [...events, ...planItems]
}

/** @param {SeasonBlock} block @param {number} year */
export function seasonBlockTouchesYear(block, year) {
  const yearStr = String(year)
  for (const iso of competitionDateRange(seasonBlockToCalendarItem(block))) {
    if (iso.startsWith(yearStr)) return true
  }
  return block.dateISO.startsWith(yearStr)
}

/**
 * @param {SeasonBlock[]} blocks
 * @param {number} year
 */
export function removeSeasonBlocksForYear(blocks, year) {
  return blocks.filter((b) => !seasonBlockTouchesYear(b, year))
}

/**
 * @param {SeasonCheckpoint[]} checkpoints
 * @param {number} year
 */
export function removeSeasonCheckpointsForYear(checkpoints, year) {
  const yearStr = String(year)
  return checkpoints.filter((c) => !c.dateISO.startsWith(yearStr))
}

/**
 * @param {number} year
 * @param {number} month 0–11
 * @param {SeasonBlock[]} blocks
 */
export function countSeasonBlocksInMonth(year, month, blocks) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const ids = new Set()
  for (const b of blocks) {
    for (const iso of competitionDateRange(seasonBlockToCalendarItem(b))) {
      if (iso.startsWith(prefix)) ids.add(b.id)
    }
  }
  return ids.size
}

/** @type {SeasonBlockPhase[]} */
const METHODOLOGY_BLOCK_PHASES = ['ofp', 'sfp', 'sttm']

/**
 * Этапы на календарь — по методике (buildMicroCycleSegments), не «на глаз».
 * @param {{
 *   anchorEventId: string,
 *   eventTitle: string,
 *   fightDateISO: string,
 *   existingBlocks?: SeasonBlock[],
 *   todayIso?: string,
 * }} options
 * @returns {SeasonBlock[]}
 */
export function generateRecommendedBlocksForEvent(options) {
  const { anchorEventId, eventTitle, fightDateISO, existingBlocks = [], todayIso } = options
  const label = eventTitle.trim() || 'Старт'
  const withoutAnchor = existingBlocks.filter((b) => b.anchorEventId !== anchorEventId)
  const segments = buildMicroCycleSegments(fightDateISO, todayIso)

  const generated = METHODOLOGY_BLOCK_PHASES.map((phaseId) => {
    const seg = segments.find((s) => s.id === phaseId)
    if (!seg) return null
    return {
      id: newSeasonBlockId('plan'),
      title: `${seg.label} · ${label}`,
      phase: /** @type {SeasonBlockPhase} */ (phaseId),
      dateISO: seg.dateStartISO,
      dateEndISO: seg.dateEndISO,
      anchorEventId,
      done: seg.status === 'past',
    }
  }).filter(Boolean)

  return normalizeSeasonBlocks([...withoutAnchor, ...generated])
}

/** @deprecated используйте generateRecommendedBlocksForEvent */
export function generateMesoBlocksForEvent(options) {
  return generateRecommendedBlocksForEvent(options)
}

/** @param {string} iso @param {SeasonBlock[]} blocks @param {SeasonCheckpoint[]} checkpoints */
export function planItemsOnDay(iso, blocks, checkpoints) {
  const blockItems = blocks.filter((b) =>
    isIsoInInclusiveRange(iso, b.dateISO, b.dateEndISO),
  )
  const cps = checkpoints.filter((c) => c.dateISO === iso)
  return { blocks: blockItems, checkpoints: cps }
}
