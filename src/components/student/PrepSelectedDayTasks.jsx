import { memo } from 'react'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getSeasonTaskStyle } from '../../data/seasonTaskKinds.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   dateISO: string,
 *   tasks: import('../../utils/seasonTasks.js').SeasonTask[],
 *   focusId: string | null,
 *   onFocus: (task: import('../../utils/seasonTasks.js').SeasonTask) => void,
 *   onRemove?: (id: string) => void,
 *   removeBusy?: boolean,
 * }} props
 */
function PrepSelectedDayTasks({ dateISO, tasks, focusId, onFocus, onRemove, removeBusy = false }) {
  const d = new Date(dateISO + 'T12:00:00')
  const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()]
  const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} (${wd})`

  if (!tasks.length) {
    return (
      <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
        {label} — нет задач. Кликните день начала периода, затем конец.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-[#e7e8ec] bg-white px-2 py-1.5">
      <p className="mb-1 text-[11px] font-semibold text-[#818c99]">{label}</p>
      <ul className="space-y-1">
        {tasks.map((task) => {
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
                <span className="block text-[11px] text-[#818c99]">
                  {style?.label} · {formatCompetitionRange(task)} · {task.progress}%
                </span>
              </button>
              {onRemove ? (
                <button
                  type="button"
                  className={`${vk.btnGhost} shrink-0 px-2 text-rose-600`}
                  disabled={removeBusy}
                  onClick={() => onRemove(task.id)}
                  aria-label="Удалить задачу"
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

export default memo(PrepSelectedDayTasks)
