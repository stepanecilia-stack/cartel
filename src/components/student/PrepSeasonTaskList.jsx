import { memo, useMemo } from 'react'
import { competitionDateRange, formatCompetitionRange } from '../../data/competitionLevels.js'
import { getSeasonTaskStyle } from '../../data/seasonTaskKinds.js'

/**
 * @param {{
 *   tasks: import('../../utils/seasonTasks.js').SeasonTask[],
 *   year: number,
 *   focusId: string | null,
 *   onFocus: (task: import('../../utils/seasonTasks.js').SeasonTask) => void,
 *   onDelete?: (taskId: string) => void,
 *   deleteBusy?: boolean,
 * }} props
 */
function PrepSeasonTaskList({ tasks, year, focusId, onFocus, onDelete, deleteBusy = false }) {
  const items = useMemo(() => {
    const yearStr = String(year)
    return [...tasks]
      .filter((t) => {
        for (const iso of competitionDateRange({
          dateISO: t.dateISO,
          dateEndISO: t.dateEndISO,
        })) {
          if (iso.startsWith(yearStr)) return true
        }
        return t.dateISO.startsWith(yearStr)
      })
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.title.localeCompare(b.title, 'ru'))
  }, [tasks, year])

  if (!items.length) {
    return (
      <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
        Нет задач на {year} год. Выберите день и нажмите «Добавить задачу».
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-[#e7e8ec] bg-white px-2 py-1.5">
      <p className="mb-1 text-[11px] font-semibold text-[#818c99]">Задачи сезона · {year}</p>
      <ul className="space-y-1">
        {items.map((task) => {
          const style = getSeasonTaskStyle({ taskKind: task.category })
          const active = focusId === task.id
          return (
            <li key={task.id} className="flex gap-1">
              <button
                type="button"
                onClick={() => onFocus(task)}
                className={`min-w-0 flex-1 rounded-md border-2 px-2 py-1.5 text-left text-[12px] ${style?.chip ?? ''} ${
                  active ? 'ring-2 ring-[#2d81e0]/50' : ''
                }`}
              >
                <span className="font-semibold text-[#2c2d2e]">{task.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#818c99]">
                  <span>{style?.label}</span>
                  <span>{formatCompetitionRange(task)}</span>
                  <span className="font-semibold tabular-nums text-[#2c2d2e]">{task.progress}%</span>
                </span>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/70">
                  <div className={`h-full ${style?.bar ?? ''}`} style={{ width: `${task.progress}%` }} />
                </div>
              </button>
              {onDelete ? (
                <button
                  type="button"
                  className="shrink-0 rounded-md px-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  disabled={deleteBusy}
                  aria-label="Удалить задачу"
                  onClick={() => onDelete(task.id)}
                >
                  ✕
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(PrepSeasonTaskList)
