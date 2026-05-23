import { memo, useMemo, useState } from 'react'
import {
  estimateGeneratedTaskCount,
  generateSeasonTasksSchedule,
  normalizeSessionsPerWeek,
  SESSIONS_PER_WEEK_OPTIONS,
} from '../../utils/seasonTasksAutoSchedule.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   year: number,
 *   tasksCount: number,
 *   sessionsPerWeek: number,
 *   onSessionsPerWeekChange: (n: number) => void,
 *   onGenerate: (mode: 'replace' | 'merge') => void | Promise<void>,
 *   busy?: boolean,
 *   disabled?: boolean,
 * }} props
 */
function SeasonTasksAutoPlanner({
  year,
  tasksCount,
  sessionsPerWeek,
  onSessionsPerWeekChange,
  onGenerate,
  busy = false,
  disabled = false,
}) {
  const sessions = normalizeSessionsPerWeek(sessionsPerWeek)
  const [mergeMode, setMergeMode] = useState(false)

  const previewCount = useMemo(
    () => estimateGeneratedTaskCount(year, sessions),
    [year, sessions],
  )

  const handleGenerate = () => {
    const mode = mergeMode ? 'merge' : 'replace'
    if (!mergeMode && tasksCount > 0) {
      const ok = window.confirm(
        `Заменить задачи с сегодня до конца ${year} года? Будет около ${previewCount} занятий (${sessions} в неделю). Старые задачи за этот период удалятся.`,
      )
      if (!ok) return
    }
    void onGenerate(mode)
  }

  return (
    <details className={`${vk.cardPadded} space-y-2`}>
      <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#2c2d2e] marker:content-none [&::-webkit-details-marker]:hidden">
        Автоплан на сезон (по желанию)
      </summary>
      <div className="mt-2 space-y-2">
      <div>
        <p className="sr-only">Автоплан на сезон</p>
        <p className={`mt-0.5 ${vk.mutedXs}`}>
          Расставим занятия по технике и физике на {year} год: чередование Т/Ф, подписи по периоду альманаха.
          В переходные месяцы (авг, фев) — до 2 занятий в неделю. Отдельные задачи — кнопкой «Добавить задачу».
        </p>
      </div>

      <div>
        <label className={vk.label} htmlFor="sessions-per-week">
          Занятий в неделю
        </label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {SESSIONS_PER_WEEK_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled || busy}
              onClick={() => onSessionsPerWeekChange(n)}
              className={`min-w-[2.5rem] rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold tabular-nums transition ${
                sessions === n
                  ? 'border-[#2d81e0] bg-[#ecf3fc] text-[#2d81e0]'
                  : 'border-[#e7e8ec] bg-white text-[#2c2d2e] hover:bg-[#f7f8fa]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className={`mt-1.5 ${vk.mutedXs}`}>
          Примерно <strong className="text-[#2c2d2e]">{previewCount}</strong> задач с сегодня до 31.12.{year}
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#2c2d2e]">
        <input
          type="checkbox"
          className="accent-[#2d81e0]"
          checked={mergeMode}
          disabled={disabled || busy}
          onChange={(e) => setMergeMode(e.target.checked)}
        />
        Добавить к существующим (не трогать дни, где уже есть задача)
      </label>

      <button
        type="button"
        className={vk.btnPrimary}
        disabled={disabled || busy || previewCount === 0}
        onClick={handleGenerate}
      >
        {busy ? 'Расстановка…' : 'Расставить автоматически'}
      </button>
      </div>
    </details>
  )
}

export default memo(SeasonTasksAutoPlanner)
