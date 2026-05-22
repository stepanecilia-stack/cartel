/**
 * Сезонная задача — выбор тренера.
 * @typedef {'foundation' | 'advance' | 'peak'} SeasonGoalId
 * @typedef {'foundation' | 'advance' | 'peak'} SeasonMode
 */

/** @type {Array<{ id: SeasonGoalId, label: string, short: string, hint: string }>} */
export const SEASON_GOAL_OPTIONS = [
  {
    id: 'foundation',
    label: 'Вывести базу до соревновательного уровня',
    short: 'База',
    hint: 'Техника, физика, нормативы. Пик к ПР — когда тело и КСР готовы.',
  },
  {
    id: 'advance',
    label: 'Пройти максимально далеко по отборам',
    short: 'Лестница',
    hint: 'Город → край → округ → Россия. Микроцикл к каждому подтверждённому отбору.',
  },
  {
    id: 'peak',
    label: 'Пик к главной цели (ПР / Россия)',
    short: 'Пик',
    hint: 'Полная методика без компромиссов — когда спортсмен тянет нагрузку.',
  },
]

export const DEFAULT_SEASON_GOAL = /** @type {SeasonGoalId} */ ('advance')

/** @param {unknown} raw */
export function normalizeSeasonGoal(raw) {
  const id = typeof raw === 'string' ? raw : ''
  if (SEASON_GOAL_OPTIONS.some((o) => o.id === id)) return /** @type {SeasonGoalId} */ (id)
  return DEFAULT_SEASON_GOAL
}

/**
 * Эффективная задача для рекомендаций и нагрузки.
 * @param {{
 *   seasonGoal?: SeasonGoalId | string | null,
 *   nextSeasonGoal?: SeasonGoalId | string | null,
 *   ladderClosed?: boolean,
 * }} ctx
 * @returns {SeasonMode}
 */
export function resolveSeasonMode(ctx) {
  if (ctx.ladderClosed) {
    return normalizeSeasonGoal(ctx.nextSeasonGoal ?? ctx.seasonGoal)
  }
  return normalizeSeasonGoal(ctx.seasonGoal)
}

/**
 * @param {SeasonMode} mode
 * @param {{ ladderClosed?: boolean }} [meta]
 */
export function seasonModeAllowsMicroPrep(mode, meta = {}) {
  if (meta.ladderClosed && !meta.focusNewCycle) return false
  return mode === 'advance' || mode === 'peak'
}

/**
 * @param {SeasonMode} mode
 * @param {{ ladderClosed?: boolean }} [meta]
 */
export function getSeasonGoalOptionLabel(mode, meta = {}) {
  const opt = SEASON_GOAL_OPTIONS.find((o) => o.id === mode)
  if (!opt) return { short: '—', label: '—' }
  if (meta.ladderClosed) {
    return {
      short: `→ ${opt.short}`,
      label: `Следующий сезон: ${opt.label}`,
    }
  }
  return { short: opt.short, label: opt.label }
}
