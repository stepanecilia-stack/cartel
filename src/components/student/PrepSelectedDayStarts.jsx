import { memo, useMemo } from 'react'
import { getCalendarItemStyle, ORIENTIR_CALENDAR_STYLE } from '../../data/coachEventKinds.js'
import { getExternalCampStyle } from '../../data/externalCampKinds.js'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getCompetitionMeta } from '../../data/competitionLevels.js'
import { formatOrientirAgeLine, orientirDisplayTitle } from '../../utils/orientirDisplay.js'
import { formatStartWithStatus, isOrientirStart } from '../../utils/plannedCompetitions.js'
import { formatCoachEventParticipantMeta } from '../../utils/coachEventStudents.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   dateISO: string,
 *   competitions: Array<import('../../utils/plannedCompetitions.js').PlannedCompetition & { eventKind?: string, participantIds?: string[] }>,
 *   focusId: string | null,
 *   onFocus: (c: import('../../utils/plannedCompetitions.js').PlannedCompetition) => void,
 *   onRemove?: (id: string) => void,
 *   removeBusy?: boolean,
 *   removeLabel?: string,
 *   students?: import('../../utils/coachEventStudents.js').CoachEventStudentOption[],
 * }} props
 */
function PrepSelectedDayStarts({
  dateISO,
  competitions,
  focusId,
  onFocus,
  onRemove,
  removeBusy = false,
  removeLabel = 'Удалить',
  students = [],
}) {
  const studentById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students],
  )

  const d = new Date(dateISO + 'T12:00:00')
  const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()]
  const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} (${wd})`

  if (!competitions.length) {
    return (
      <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
        {label} — нет событий на этот день.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-[#e7e8ec] bg-white px-2 py-1.5">
      <p className="mb-1 text-[11px] font-semibold text-[#818c99]">{label}</p>
      <ul className="space-y-1">
        {competitions.map((c) => {
          const orientir = isOrientirStart(c)
          const externalCamp = c.planKind === 'external_camp'
          const style = externalCamp
            ? getExternalCampStyle(c)
            : orientir
              ? ORIENTIR_CALENDAR_STYLE
              : getCalendarItemStyle(c)
          const active = focusId === c.id
          const meta = getCompetitionMeta(c)
          const displayName = externalCamp
            ? c.title?.trim() || style?.label
            : orientir
              ? orientirDisplayTitle(c)
              : c.title?.trim() || style?.label
          const participants = (c.participantIds ?? [])
            .map((id) => studentById[id])
            .filter(Boolean)
          return (
            <li key={c.id} className="flex gap-1">
              <button
                type="button"
                onClick={() => onFocus(c)}
                className={`min-w-0 flex-1 rounded-md border-2 px-2 py-1.5 text-left text-[12px] ${style?.chip ?? ''} ${
                  active ? 'ring-2 ring-[#2d81e0]/50' : ''
                }`}
              >
                <span className="font-semibold text-[#2c2d2e]">{displayName}</span>
                <span className="block text-[11px] text-[#818c99]">
                  {externalCamp
                    ? `${style?.label} (не клуб)`
                    : orientir
                      ? 'Ориентир Минспорта'
                      : style?.label}{' '}
                  · {formatCompetitionRange(c)}
                  {!externalCamp ? ` · ${formatStartWithStatus(c)}` : ''}
                  {orientir && meta.short ? ` · ${meta.short}` : ''}
                  {orientir && c.orientirAgeLabels?.length ? (
                    <span className="block text-[10px] font-medium text-slate-500">
                      Возраст: {formatOrientirAgeLine(c.orientirAgeLabels)}
                    </span>
                  ) : null}
                  {c.dateISO !== dateISO || (c.dateEndISO && c.dateEndISO !== dateISO)
                    ? ` · ${formatCompetitionRange(c)}`
                    : ''}
                </span>
                {participants.length > 0 ? (
                  <span className="mt-0.5 block space-y-0.5 text-[10px] text-[#818c99]">
                    {participants.map((p) => (
                      <span key={p.id} className="block">
                        {p.name} · {formatCoachEventParticipantMeta(p)}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
              {onRemove && !orientir ? (
                <button
                  type="button"
                  className={`${vk.btnGhost} shrink-0 px-2 text-rose-600`}
                  disabled={removeBusy}
                  onClick={() => onRemove(c.id)}
                  aria-label={removeLabel}
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

export default memo(PrepSelectedDayStarts)
