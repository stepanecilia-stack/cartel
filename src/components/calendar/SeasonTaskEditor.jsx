import { memo, useState } from 'react'
import { SEASON_TASK_KIND_STYLES } from '../../data/seasonTaskKinds.js'
import { formatCompetitionRange, normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { vk } from '../../utils/vkUi.js'
import SeasonDateRangeFields from './SeasonDateRangeFields.jsx'

/**
 * @param {{
 *   mode: 'create' | 'edit',
 *   dateISO: string,
 *   dateEndISO: string,
 *   initialTitle?: string,
 *   initialCategory?: 'technical' | 'physical',
 *   initialProgress?: number,
 *   onCancel: () => void,
 *   onSave: (payload: {
 *     title: string,
 *     category: 'technical' | 'physical',
 *     dateISO: string,
 *     dateEndISO: string,
 *     progress: number,
 *   }) => void | Promise<void>,
 *   onDelete?: () => void | Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 *   disabled?: boolean,
 * }} props
 */
function SeasonTaskEditor({
  mode,
  dateISO,
  dateEndISO,
  initialTitle = '',
  initialCategory = 'technical',
  initialProgress = 0,
  onCancel,
  onSave,
  onDelete,
  busy = false,
  error = '',
  disabled = false,
}) {
  const [range, setRange] = useState(() => normalizeCompetitionRange(dateISO, dateEndISO))
  const rangeLabel = formatCompetitionRange(range)
  const [progress, setProgress] = useState(() =>
    Math.min(100, Math.max(0, Math.round(Number(initialProgress) || 0))),
  )

  return (
    <form
      className="rounded-lg border border-[#6f3ff5]/25 bg-[#f9f8ff] p-2.5 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = String(fd.get('title') ?? '').trim()
        const category = String(fd.get('category') ?? 'technical')
        if (!title) return
        void onSave({
          title,
          category: category === 'physical' ? 'physical' : 'technical',
          dateISO: range.dateISO,
          dateEndISO: range.dateEndISO,
          progress,
        })
      }}
    >
      <p className="text-[12px] font-semibold text-[#2c2d2e]">
        {mode === 'create' ? 'Новая задача' : 'Задача'}
        <span className="ml-1 font-normal text-[#818c99]">· {rangeLabel}</span>
      </p>

      <SeasonDateRangeFields
        startISO={range.dateISO}
        endISO={range.dateEndISO}
        onChange={setRange}
        disabled={disabled || busy}
        idPrefix="season-task-range"
      />

      <div>
        <label className={vk.label} htmlFor="season-task-title">
          Что решаем
        </label>
        <input
          id="season-task-title"
          name="title"
          className={vk.input}
          defaultValue={initialTitle}
          placeholder="Например: закрыть уровень 2, выйти на норматив бега"
          disabled={disabled || busy}
          autoFocus
          maxLength={160}
          required
        />
      </div>

      <fieldset className="space-y-1">
        <legend className={vk.label}>Направление</legend>
        <div className="flex flex-wrap gap-1.5">
          {(['technical', 'physical']).map((kind) => (
            <label
              key={kind}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-[12px] has-[:checked]:ring-2 has-[:checked]:ring-offset-1 ${SEASON_TASK_KIND_STYLES[kind].chip}`}
            >
              <input
                type="radio"
                name="category"
                value={kind}
                defaultChecked={initialCategory === kind}
                disabled={disabled || busy}
                className="accent-current"
              />
              {SEASON_TASK_KIND_STYLES[kind].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className={vk.label} htmlFor="season-task-progress">
            Прогресс
          </label>
          <span className="text-[12px] font-semibold tabular-nums text-[#2c2d2e]">{progress}%</span>
        </div>
        <input
          id="season-task-progress"
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          disabled={disabled || busy}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-[#6f3ff5]"
        />
      </div>

      {error ? <p className="text-[12px] text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={vk.btnPrimary} disabled={disabled || busy}>
          {busy ? 'Сохранение…' : mode === 'create' ? 'Добавить задачу' : 'Сохранить'}
        </button>
        <button type="button" className={vk.btnGhost} onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        {mode === 'edit' && onDelete ? (
          <button
            type="button"
            className="ml-auto text-[13px] font-medium text-rose-600"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Удалить
          </button>
        ) : null}
      </div>
    </form>
  )
}

export default memo(SeasonTaskEditor)
