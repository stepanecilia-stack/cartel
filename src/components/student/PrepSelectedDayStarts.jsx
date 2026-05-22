import { memo } from 'react'
import { formatStartWithStatus, getCompetitionMeta } from '../../utils/plannedCompetitions.js'

/**
 * @param {{
 *   dateISO: string,
 *   competitions: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *   focusId: string | null,
 *   onFocus: (c: import('../../utils/plannedCompetitions.js').PlannedCompetition) => void,
 * }} props
 */
function PrepSelectedDayStarts({ dateISO, competitions, focusId, onFocus }) {
  const d = new Date(dateISO + 'T12:00:00')
  const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()]
  const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} (${wd})`

  if (!competitions.length) {
    return (
      <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
        {label} — без стартов
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-[#e7e8ec] bg-white px-2 py-1.5">
      <p className="mb-1 text-[11px] font-semibold text-[#818c99]">{label}</p>
      <ul className="space-y-1">
        {competitions.map((c) => {
          const meta = getCompetitionMeta(c)
          const active = focusId === c.id
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onFocus(c)}
                className={`w-full rounded-md border px-2 py-1.5 text-left text-[12px] ${meta.chip} ${
                  active ? 'ring-2 ring-[#2d81e0]/40' : ''
                }`}
              >
                <span className="font-bold uppercase">{meta.short}</span> · {formatStartWithStatus(c)}
                {c.title ? <span className="block text-[#818c99]">{c.title}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(PrepSelectedDayStarts)
