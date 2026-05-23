import { memo, useState } from 'react'
import { COACH_EVENT_KIND_STYLES } from '../../data/coachEventKinds.js'
import { formatCompetitionRange, normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { vk } from '../../utils/vkUi.js'
import CoachEventParticipants from './CoachEventParticipants.jsx'

/**
 * @param {{
 *   mode: 'create' | 'edit',
 *   dateISO: string,
 *   dateEndISO: string,
 *   initialTitle?: string,
 *   initialKind?: 'practice' | 'competition',
 *   initialParticipantIds?: string[],
 *   students: import('../../utils/coachEventStudents.js').CoachEventStudentOption[],
 *   onCancel: () => void,
 *   onSave: (payload: {
 *     title: string,
 *     kind: 'practice' | 'competition',
 *     participantIds: string[],
 *   }) => void | Promise<void>,
 *   onDelete?: () => void | Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 *   disabled?: boolean,
 * }} props
 */
function CoachEventEditor({
  mode,
  dateISO,
  dateEndISO,
  initialTitle = '',
  initialKind = 'practice',
  initialParticipantIds = [],
  students,
  onCancel,
  onSave,
  onDelete,
  busy = false,
  error = '',
  disabled = false,
}) {
  const range = normalizeCompetitionRange(dateISO, dateEndISO)
  const rangeLabel = formatCompetitionRange({
    dateISO: range.dateISO,
    dateEndISO: range.dateEndISO,
  })

  const [participantIds, setParticipantIds] = useState(initialParticipantIds)

  return (
    <form
      className="rounded-lg border border-[#2d81e0]/30 bg-[#ecf3fc] p-2.5 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = String(fd.get('title') ?? '').trim()
        const kind = String(fd.get('kind') ?? 'practice')
        if (!title) return
        void onSave({
          title,
          kind: kind === 'competition' ? 'competition' : 'practice',
          participantIds,
        })
      }}
    >
      <p className="text-[12px] font-semibold text-[#2c2d2e]">
        {mode === 'create' ? 'Новое событие' : 'Событие'} · {rangeLabel}
      </p>

      <div>
        <label className={vk.label} htmlFor="coach-event-title">
          Название
        </label>
        <input
          id="coach-event-title"
          name="title"
          className={vk.input}
          defaultValue={initialTitle}
          placeholder="Например: Боевая практика, Кубок области"
          disabled={disabled || busy}
          autoFocus
          maxLength={120}
          required
        />
      </div>

      <fieldset className="space-y-1">
        <legend className={vk.label}>Категория</legend>
        <div className="flex flex-wrap gap-1.5">
          {(['practice', 'competition']).map((kind) => (
            <label
              key={kind}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-[12px] has-[:checked]:ring-2 has-[:checked]:ring-offset-1 ${COACH_EVENT_KIND_STYLES[kind].chip}`}
            >
              <input
                type="radio"
                name="kind"
                value={kind}
                defaultChecked={initialKind === kind}
                disabled={disabled || busy}
                className="accent-current"
              />
              {COACH_EVENT_KIND_STYLES[kind].label}
            </label>
          ))}
        </div>
      </fieldset>

      <CoachEventParticipants
        students={students}
        selectedIds={participantIds}
        onChange={setParticipantIds}
        disabled={disabled || busy}
      />

      {error ? <p className="text-[12px] text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={vk.btnPrimary} disabled={disabled || busy}>
          {busy ? 'Сохранение…' : mode === 'create' ? 'Создать событие' : 'Сохранить'}
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
            Удалить событие
          </button>
        ) : null}
      </div>
    </form>
  )
}

export default memo(CoachEventEditor)
