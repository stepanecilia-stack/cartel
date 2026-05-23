import { memo, useEffect, useState } from 'react'
import { competitionDateToInputString, normalizeCompetitionDateISO } from '../../utils/competitionDate.js'
import { normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { formatShortDateRu } from '../../utils/prepSeasonCalendar.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   startISO: string,
 *   endISO: string,
 *   onChange: (range: { dateISO: string, dateEndISO: string }) => void,
 *   disabled?: boolean,
 *   idPrefix?: string,
 * }} props
 */
function SeasonDateRangeFields({
  startISO,
  endISO,
  onChange,
  disabled = false,
  idPrefix = 'season-range',
}) {
  const [start, setStart] = useState(startISO)
  const [end, setEnd] = useState(endISO)

  useEffect(() => {
    setStart(startISO)
    setEnd(endISO)
  }, [startISO, endISO])

  const emit = (nextStart, nextEnd) => {
    const s = normalizeCompetitionDateISO(nextStart) || nextStart
    const e = normalizeCompetitionDateISO(nextEnd) || nextEnd
    const range = normalizeCompetitionRange(s, e)
    setStart(range.dateISO)
    setEnd(range.dateEndISO)
    onChange(range)
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <label className={vk.label} htmlFor={`${idPrefix}-start`}>
          Начало
        </label>
        <input
          id={`${idPrefix}-start`}
          name="dateISO"
          type="date"
          className={vk.input}
          value={competitionDateToInputString(start) || ''}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            emit(v, end)
          }}
        />
      </div>
      <div>
        <label className={vk.label} htmlFor={`${idPrefix}-end`}>
          Конец
        </label>
        <input
          id={`${idPrefix}-end`}
          name="dateEndISO"
          type="date"
          className={vk.input}
          value={competitionDateToInputString(end) || ''}
          min={competitionDateToInputString(start) || undefined}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            emit(start, v)
          }}
        />
      </div>
      <p className={`sm:col-span-2 ${vk.mutedXs}`}>
        Период: {formatShortDateRu(start)}
        {end !== start ? ` — ${formatShortDateRu(end)}` : ' (один день)'}
        {' · '}
        <button
          type="button"
          className="font-medium text-[#2d81e0] disabled:opacity-50"
          disabled={disabled || start === end}
          onClick={() => emit(start, start)}
        >
          Один день
        </button>
      </p>
    </div>
  )
}

export default memo(SeasonDateRangeFields)
