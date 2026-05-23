import { memo, useMemo } from 'react'
import { COACH_EVENT_KIND_STYLES } from '../../data/coachEventKinds.js'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { formatCoachEventParticipantMeta } from '../../utils/coachEventStudents.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   event: import('../../utils/coachEvents.js').CoachEvent,
 *   students: import('../../utils/coachEventStudents.js').CoachEventStudentOption[],
 *   onClose: () => void,
 *   onEdit: () => void,
 *   onDelete?: () => void | Promise<void>,
 *   busy?: boolean,
 *   canSave?: boolean,
 * }} props
 */
function CoachEventDetails({
  event,
  students,
  onClose,
  onEdit,
  onDelete,
  busy = false,
  canSave = true,
}) {
  const style = COACH_EVENT_KIND_STYLES[event.kind]
  const rangeLabel = formatCompetitionRange({
    dateISO: event.dateISO,
    dateEndISO: event.dateEndISO,
  })

  const participants = useMemo(() => {
    const byId = Object.fromEntries(students.map((s) => [s.id, s]))
    return (event.participantIds ?? [])
      .map((id) => byId[id])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [event.participantIds, students])

  return (
    <div className={`rounded-lg border-2 p-2.5 space-y-2 ${style.chip}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{style.label}</p>
          <p className="text-[14px] font-semibold text-[#2c2d2e]">{event.title || style.label}</p>
          <p className="text-[12px] text-[#818c99]">{rangeLabel}</p>
        </div>
        <button type="button" className={vk.btnGhost} onClick={onClose} disabled={busy} aria-label="Закрыть">
          ✕
        </button>
      </div>

      <div>
        <p className={vk.label}>
          Участники ({participants.length})
        </p>
        {participants.length === 0 ? (
          <p className="text-[12px] text-[#818c99]">Никто не отмечен. Нажмите «Редактировать», чтобы добавить.</p>
        ) : (
          <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-[#e7e8ec]/80 bg-white/80 p-1.5">
            {participants.map((p) => (
              <li key={p.id} className="rounded-md px-2 py-1">
                <span className="block text-[13px] font-medium text-[#2c2d2e]">{p.name}</span>
                <span className="block text-[11px] text-[#818c99]">
                  {formatCoachEventParticipantMeta(p)}
                </span>
              </li>
            ))}
          </ul>
        )}
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
            Удалить событие
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default memo(CoachEventDetails)
