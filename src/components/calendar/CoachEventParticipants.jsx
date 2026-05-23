import { memo, useMemo } from 'react'
import { formatCoachEventParticipantMeta } from '../../utils/coachEventStudents.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   students: import('../../utils/coachEventStudents.js').CoachEventStudentOption[],
 *   selectedIds: string[],
 *   onChange: (ids: string[]) => void,
 *   disabled?: boolean,
 * }} props
 */
function CoachEventParticipants({ students, selectedIds, onChange, disabled = false }) {
  const sorted = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [students],
  )

  const allSelected = sorted.length > 0 && sorted.every((s) => selectedIds.includes(s.id))

  return (
    <fieldset className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <legend className={vk.label}>Участники</legend>
        {sorted.length > 0 ? (
          <button
            type="button"
            className="text-[11px] font-medium text-[#2d81e0]"
            disabled={disabled}
            onClick={() =>
              onChange(allSelected ? [] : sorted.map((s) => s.id))
            }
          >
            {allSelected ? 'Снять всех' : 'Выбрать всех'}
          </button>
        ) : null}
      </div>
      {sorted.length === 0 ? (
        <p className="text-[12px] text-[#818c99]">Нет учеников в базе.</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[#e7e8ec] bg-white p-1.5">
          {sorted.map((s) => {
            const checked = selectedIds.includes(s.id)
            return (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-[#f7f8fa]">
                  <input
                    type="checkbox"
                    className="accent-[#2d81e0]"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                      onChange(
                        checked
                          ? selectedIds.filter((id) => id !== s.id)
                          : [...selectedIds, s.id],
                      )
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{s.name}</span>
                    <span className="block truncate text-[11px] text-[#818c99]">
                      {formatCoachEventParticipantMeta(s)}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}

export default memo(CoachEventParticipants)
