import { memo, useEffect, useState } from 'react'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getSeasonTaskStyle } from '../../data/seasonTaskKinds.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   task: import('../../utils/seasonTasks.js').SeasonTask,
 *   onClose: () => void,
 *   onEdit: () => void,
 *   onProgressChange: (progress: number) => void | Promise<void>,
 *   onDelete?: () => void | Promise<void>,
 *   busy?: boolean,
 *   canSave?: boolean,
 * }} props
 */
function SeasonTaskDetails({
  task,
  onClose,
  onEdit,
  onProgressChange,
  onDelete,
  busy = false,
  canSave = true,
}) {
  const style = getSeasonTaskStyle({ taskKind: task.category })
  const rangeLabel = formatCompetitionRange({
    dateISO: task.dateISO,
    dateEndISO: task.dateEndISO,
  })
  const [progress, setProgress] = useState(task.progress)

  useEffect(() => {
    setProgress(task.progress)
  }, [task.id, task.progress])

  return (
    <div className={`rounded-lg border-2 p-2.5 space-y-2 ${style?.chip ?? ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
            {style?.label ?? 'Задача'}
          </p>
          <p className="text-[14px] font-semibold text-[#2c2d2e]">{task.title}</p>
          <p className="text-[12px] text-[#818c99]">{rangeLabel}</p>
        </div>
        <button type="button" className={vk.btnGhost} onClick={onClose} disabled={busy} aria-label="Закрыть">
          ✕
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className={vk.label}>Прогресс</p>
          <span className="text-[12px] font-semibold tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full ${style?.bar ?? 'bg-[#6f3ff5]'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {canSave ? (
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            disabled={busy}
            onChange={(e) => {
              const next = Number(e.target.value)
              setProgress(next)
              void onProgressChange(next)
            }}
            className="mt-2 h-2 w-full cursor-pointer accent-current"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 pt-0.5">
        {canSave ? (
          <button type="button" className={vk.btnPrimary} onClick={onEdit} disabled={busy}>
            Редактировать
          </button>
        ) : null}
        <button type="button" className={vk.btnSecondary} onClick={onClose} disabled={busy}>
          Закрыть
        </button>
        {canSave && onDelete ? (
          <button
            type="button"
            className="ml-auto text-[13px] font-medium text-rose-600 disabled:opacity-50"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Удалить задачу
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default memo(SeasonTaskDetails)
