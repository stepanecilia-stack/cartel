import { memo, useState } from 'react'
import { formatShortDateRu } from '../../utils/prepSeasonCalendar.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   dateISO: string,
 *   initialTitle?: string,
 *   initialCalendarOnly?: boolean,
 *   onCancel: () => void,
 *   onSave: (payload: { title: string, calendarOnly: boolean }) => void | Promise<void>,
 *   onDelete?: () => void | Promise<void>,
 *   busy?: boolean,
 *   disabled?: boolean,
 * }} props
 */
function StudentCheckpointEditor({
  dateISO,
  initialTitle = '',
  initialCalendarOnly = false,
  onCancel,
  onSave,
  onDelete,
  busy = false,
  disabled = false,
}) {
  const [title, setTitle] = useState(initialTitle)
  const [calendarOnly, setCalendarOnly] = useState(initialCalendarOnly)

  return (
    <form
      className="rounded-lg border border-[#e7e8ec] bg-white p-2.5 space-y-2 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        const t = title.trim()
        if (!t) return
        void onSave({ title: t, calendarOnly })
      }}
    >
      <p className="text-[12px] text-[#818c99]">{formatShortDateRu(dateISO)}</p>
      <div>
        <label className={vk.label} htmlFor="student-cp-title">
          Название
        </label>
        <input
          id="student-cp-title"
          className={vk.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Контрольная точка"
          disabled={disabled || busy}
          required
          autoFocus
        />
      </div>
      <label className="flex items-center gap-2 text-[13px] text-[#2c2d2e]">
        <input
          type="checkbox"
          className="accent-[#2d81e0]"
          checked={calendarOnly}
          disabled={disabled || busy}
          onChange={(e) => setCalendarOnly(e.target.checked)}
        />
        Только в календаре
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={vk.btnPrimary} disabled={disabled || busy || !title.trim()}>
          {busy ? 'Сохранение…' : 'Сохранить'}
        </button>
        <button type="button" className={vk.btnSecondary} onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        {onDelete ? (
          <button
            type="button"
            className="ml-auto text-[13px] text-rose-600"
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

export default memo(StudentCheckpointEditor)
