import { memo, useState } from 'react'
import { SEASON_BLOCK_PHASE_STYLES } from '../../data/seasonPlanKinds.js'
import { formatCompetitionRange, normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { vk } from '../../utils/vkUi.js'
import SeasonDateRangeFields from './SeasonDateRangeFields.jsx'

/**
 * @param {{
 *   mode: 'create' | 'edit',
 *   dateISO: string,
 *   dateEndISO: string,
 *   initialTitle?: string,
 *   initialPhase?: import('../../utils/seasonPlan.js').SeasonBlockPhase,
 *   initialDone?: boolean,
 *   onCancel: () => void,
 *   onSave: (payload: {
 *     title: string,
 *     phase: import('../../utils/seasonPlan.js').SeasonBlockPhase,
 *     dateISO: string,
 *     dateEndISO: string,
 *     done: boolean,
 *   }) => void | Promise<void>,
 *   onDelete?: () => void | Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 *   disabled?: boolean,
 * }} props
 */
function SeasonBlockEditor({
  mode,
  dateISO,
  dateEndISO,
  initialTitle = '',
  initialPhase = 'base',
  initialDone = false,
  onCancel,
  onSave,
  onDelete,
  busy = false,
  error = '',
  disabled = false,
}) {
  const [range, setRange] = useState(() => normalizeCompetitionRange(dateISO, dateEndISO))
  const rangeLabel = formatCompetitionRange(range)
  const [done, setDone] = useState(Boolean(initialDone))

  return (
    <form
      className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = String(fd.get('title') ?? '').trim()
        const phase = String(fd.get('phase') ?? 'base')
        if (!title) return
        const validPhase =
          phase in SEASON_BLOCK_PHASE_STYLES
            ? /** @type {import('../../utils/seasonPlan.js').SeasonBlockPhase} */ (phase)
            : 'base'
        void onSave({
          title,
          phase: validPhase,
          dateISO: range.dateISO,
          dateEndISO: range.dateEndISO,
          done,
        })
      }}
    >
      <p className="text-[12px] font-semibold text-[#2c2d2e]">
        {mode === 'create' ? 'Новый блок подготовки' : 'Блок подготовки'}
        <span className="ml-1 font-normal text-[#818c99]">· {rangeLabel}</span>
      </p>

      <SeasonDateRangeFields
        startISO={range.dateISO}
        endISO={range.dateEndISO}
        onChange={setRange}
        disabled={disabled || busy}
        idPrefix="season-block-range"
      />

      <div>
        <label className={vk.label} htmlFor="season-block-title">
          Название
        </label>
        <input
          id="season-block-title"
          name="title"
          className={vk.input}
          defaultValue={initialTitle}
          placeholder="ОФП · сбор в среднегорье"
          disabled={disabled || busy}
          required
        />
      </div>

      <div>
        <span className={vk.label}>Фаза</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {Object.entries(SEASON_BLOCK_PHASE_STYLES).map(([id, style]) => (
            <label key={id} className="inline-flex cursor-pointer items-center gap-1 text-[12px]">
              <input
                type="radio"
                name="phase"
                value={id}
                defaultChecked={initialPhase === id}
                disabled={disabled || busy}
              />
              <span className={`rounded border px-1.5 py-0.5 ${style.chip}`}>{style.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-[12px] text-[#2c2d2e]">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => setDone(e.target.checked)}
          disabled={disabled || busy}
        />
        Блок выполнен
      </label>

      {error ? <p className={vk.noticeWarn}>{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={vk.btnPrimary} disabled={disabled || busy}>
          {busy ? 'Сохранение…' : 'Сохранить'}
        </button>
        <button type="button" className={vk.btnSecondary} onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        {mode === 'edit' && onDelete ? (
          <button
            type="button"
            className="ml-auto text-[13px] font-medium text-rose-600 disabled:opacity-50"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Удалить блок
          </button>
        ) : null}
      </div>
    </form>
  )
}

export default memo(SeasonBlockEditor)
