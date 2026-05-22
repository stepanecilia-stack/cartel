import { memo, useMemo } from 'react'
import { getCalendarItemStyle } from '../../data/coachEventKinds.js'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getCompetitionMeta } from '../../data/competitionLevels.js'
import { orientirDisplayTitle } from '../../utils/orientirDisplay.js'
import { formatStartWithStatus, isOrientirStart } from '../../utils/plannedCompetitions.js'

/**
 * @param {import('../../utils/plannedCompetitions.js').PlannedCompetition} c
 * @param {number} year
 */
function eventTouchesYear(c, year) {
  const yStart = `${year}-01-01`
  const yEnd = `${year}-12-31`
  const end = c.dateEndISO && c.dateEndISO >= c.dateISO ? c.dateEndISO : c.dateISO
  return c.dateISO <= yEnd && end >= yStart
}

/**
 * @param {{
 *   items: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *   year: number,
 *   focusId: string | null,
 *   onFocus: (c: import('../../utils/plannedCompetitions.js').PlannedCompetition) => void,
 * }} props
 */
function PrepSeasonEventList({ items, year, focusId, onFocus }) {
  const yearItems = useMemo(
    () =>
      [...items]
        .filter((c) => eventTouchesYear(c, year))
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO) || (a.title ?? '').localeCompare(b.title ?? '')),
    [items, year],
  )

  if (!yearItems.length) {
    return (
      <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
        Нет стартов в {year}. Укажите возраст на вкладке «Карта» или добавьте событие.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-[#e7e8ec] bg-white px-2 py-1.5">
      <p className="mb-1 text-[11px] font-semibold text-[#818c99]">
        Старты {year} · клик — подсветка дат в календаре
      </p>
      <ul className="max-h-[11rem] space-y-1 overflow-y-auto pr-0.5">
        {yearItems.map((c) => {
          const style = getCalendarItemStyle(c)
          const active = focusId === c.id
          const orientir = isOrientirStart(c)
          const meta = getCompetitionMeta(c)
          const displayName = orientir
            ? orientirDisplayTitle(c)
            : c.title?.trim() || style.label
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onFocus(c)}
                className={[
                  'flex w-full items-center gap-2 rounded-md border-2 px-2 py-1.5 text-left text-[11px] transition',
                  style.chip,
                  orientir ? 'border-dashed' : 'border-solid',
                  active ? 'ring-2 ring-[#2d81e0] ring-offset-1 shadow-sm' : 'hover:brightness-[0.98]',
                ].join(' ')}
              >
                <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase">
                  {meta.short}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#2c2d2e]">{displayName}</span>
                  <span className="block text-[10px] text-[#818c99]">
                    {formatCompetitionRange(c)} · {formatStartWithStatus(c)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(PrepSeasonEventList)
