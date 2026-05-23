import { competitionDateRange } from '../data/competitionLevels.js'
import { SEASON_TASK_KIND_STYLES } from '../data/seasonTaskKinds.js'

/** @typedef {'technical' | 'physical'} SeasonTaskCategory */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   category: SeasonTaskCategory,
 *   dateISO: string,
 *   dateEndISO: string,
 *   progress: number,
 * }} SeasonTask
 */

/**
 * @param {unknown} raw
 * @returns {SeasonTaskCategory}
 */
function normalizeCategory(raw) {
  return raw === 'physical' ? 'physical' : 'technical'
}

/**
 * @param {unknown} raw
 * @returns {SeasonTask[]}
 */
export function normalizeSeasonTasks(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const dateISO = typeof item.dateISO === 'string' ? item.dateISO.trim() : ''
    if (!id || !title || !dateISO) continue
    const dateEndISO =
      typeof item.dateEndISO === 'string' && item.dateEndISO.trim()
        ? item.dateEndISO.trim()
        : dateISO
    const progress = Math.min(100, Math.max(0, Math.round(Number(item.progress) || 0)))
    out.push({
      id,
      title,
      category: normalizeCategory(item.category),
      dateISO: dateISO <= dateEndISO ? dateISO : dateEndISO,
      dateEndISO: dateISO <= dateEndISO ? dateEndISO : dateISO,
      progress,
    })
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/** @param {SeasonTask} task */
export function seasonTaskToCalendarItem(task) {
  return {
    id: task.id,
    title: task.title,
    dateISO: task.dateISO,
    dateEndISO: task.dateEndISO,
    taskKind: task.category,
    progress: task.progress,
  }
}

/**
 * @param {SeasonTask[]} tasks
 * @returns {ReturnType<typeof seasonTaskToCalendarItem>[]}
 */
export function seasonTasksToCalendarItems(tasks) {
  return tasks.map(seasonTaskToCalendarItem)
}

/**
 * @param {number} year
 * @param {number} month 0–11
 * @param {SeasonTask[]} tasks
 */
export function countSeasonTasksInMonth(year, month, tasks) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const ids = new Set()
  for (const task of tasks) {
    for (const iso of competitionDateRange(seasonTaskToCalendarItem(task))) {
      if (iso.startsWith(prefix)) ids.add(task.id)
    }
  }
  return ids.size
}

/**
 * @param {number} year
 * @param {number} month 0–11
 * @param {SeasonTask[]} tasks
 */
export function countSeasonTasksByCategoryInMonth(year, month, tasks) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const counts = { technical: 0, physical: 0 }
  const seen = { technical: new Set(), physical: new Set() }
  for (const task of tasks) {
    for (const iso of competitionDateRange(seasonTaskToCalendarItem(task))) {
      if (!iso.startsWith(prefix)) continue
      if (!seen[task.category].has(task.id)) {
        seen[task.category].add(task.id)
        counts[task.category] += 1
      }
    }
  }
  return counts
}

/** @param {SeasonTaskCategory} category */
export function seasonTaskCategoryLabel(category) {
  return SEASON_TASK_KIND_STYLES[category]?.label ?? 'Задача'
}

/**
 * @param {string} [prefix]
 * @returns {string}
 */
export function newSeasonTaskId(prefix = 'task') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * @param {SeasonTask} task
 * @param {number} year
 */
export function seasonTaskTouchesYear(task, year) {
  const yearStr = String(year)
  for (const iso of competitionDateRange(seasonTaskToCalendarItem(task))) {
    if (iso.startsWith(yearStr)) return true
  }
  return task.dateISO.startsWith(yearStr)
}

/**
 * @param {SeasonTask[]} tasks
 * @param {number} year
 */
export function countSeasonTasksForYear(tasks, year) {
  return tasks.filter((t) => seasonTaskTouchesYear(t, year)).length
}

/**
 * @param {SeasonTask[]} tasks
 * @param {number} year
 */
export function removeSeasonTasksForYear(tasks, year) {
  return tasks.filter((t) => !seasonTaskTouchesYear(t, year))
}
