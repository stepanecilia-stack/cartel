import { memo, useMemo } from 'react'
import { COACH_EVENT_KIND_STYLES } from '../../data/coachEventKinds.js'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getCompetitionMeta } from '../../data/competitionLevels.js'
import {
  buildCoachSeasonLadderView,
  eventTouchesYear,
  stageLadderIndex,
} from '../../utils/orientirLadderGroups.js'
import { extractAgeRangeFromCohortLabel } from '../../utils/orientirDisplay.js'
import { formatStartWithStatus, isOrientirStart } from '../../utils/plannedCompetitions.js'

const ROW_BASE =
  'flex w-full items-baseline gap-2 rounded-md border border-[#e7e8ec] bg-[#fafbfc] px-2 py-1 text-left text-[11px] transition hover:bg-[#f4f5f7]'
const ROW_ACTIVE = 'ring-2 ring-[#2d81e0] border-[#2d81e0] bg-sky-50'

/**
 * @param {{
 *   items: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *   year: number,
 *   focusId: string | null,
 *   onFocus: (c: import('../../utils/plannedCompetitions.js').PlannedCompetition) => void,
 *   layout?: 'flat' | 'cohortLadder',
 * }} props
 */
function PrepSeasonEventList({ items, year, focusId, onFocus, layout = 'flat' }) {
  const ladderView = useMemo(
    () => (layout === 'cohortLadder' ? buildCoachSeasonLadderView(items, year) : null),
    [items, year, layout],
  )

  const flatItems = useMemo(() => {
    if (layout !== 'flat') return []
    return [...items]
      .filter((c) => eventTouchesYear(c, year))
      .sort(
        (a, b) =>
          stageLadderIndex(a.stage) - stageLadderIndex(b.stage) ||
          a.dateISO.localeCompare(b.dateISO),
      )
  }, [items, year, layout])

  if (layout === 'cohortLadder' && ladderView) {
    const { coachEvents, genderBlocks } = ladderView
    const hasOrientirs = genderBlocks.length > 0

    if (!hasOrientirs && !coachEvents.length) {
      return (
        <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
          Нет стартов в {year}.
        </p>
      )
    }

    return (
      <div className="rounded-lg border border-[#e7e8ec] bg-white px-2 py-2">
        <p className="mb-2 text-[11px] font-semibold text-[#818c99]">
          Старты {year} · клик — подсветка дат в календаре
        </p>
        <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-0.5">
          {coachEvents.length > 0 ? (
            <section>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#818c99]">
                События тренера
              </p>
              <ul className="space-y-0.5">
                {coachEvents.map((c) => (
                  <EventRow key={c.id} c={c} focusId={focusId} onFocus={onFocus} coach />
                ))}
              </ul>
            </section>
          ) : null}

          {hasOrientirs ? (
            <section>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#818c99]">
                Ориентиры Минспорта 2026
              </p>
              {genderBlocks.map((block) => (
                <div key={block.gender} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-[12px] font-semibold text-[#2c2d2e]">{block.title}</p>
                  {block.cohorts.map(({ cohort, events }) => (
                    <div key={cohort.id} className="mb-2 last:mb-0">
                      <p className="mb-0.5 pl-0.5 text-[11px] font-medium text-slate-600">
                        {extractAgeRangeFromCohortLabel(cohort.label)}
                      </p>
                      <ul className="space-y-0.5 border-l-2 border-[#e7e8ec] pl-2">
                        {events.map((c) => (
                          <EventRow key={c.id} c={c} focusId={focusId} onFocus={onFocus} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    )
  }

  if (!flatItems.length) {
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
      <ul className="max-h-[11rem] space-y-0.5 overflow-y-auto pr-0.5">
        {flatItems.map((c) => (
          <EventRow key={c.id} c={c} focusId={focusId} onFocus={onFocus} coach={!isOrientirStart(c)} />
        ))}
      </ul>
    </div>
  )
}

/**
 * @param {{
 *   c: import('../../utils/plannedCompetitions.js').PlannedCompetition,
 *   focusId: string | null,
 *   onFocus: (c: import('../../utils/plannedCompetitions.js').PlannedCompetition) => void,
 *   coach?: boolean,
 * }} props
 */
function EventRow({ c, focusId, onFocus, coach = false }) {
  const active = focusId === c.id
  const orientir = isOrientirStart(c)
  const meta = getCompetitionMeta(c)
  const title = c.title?.trim() || meta.label
  const badgeClass = orientir
    ? 'bg-slate-100 text-slate-600'
    : c.eventKind === 'practice'
      ? 'bg-teal-50 text-teal-800'
      : 'bg-orange-50 text-orange-900'

  return (
    <li>
      <button
        type="button"
        onClick={() => onFocus(c)}
        className={[ROW_BASE, active ? ROW_ACTIVE : ''].join(' ')}
      >
        <span
          className={[
            'shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase',
            badgeClass,
          ].join(' ')}
        >
          {meta.short}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-medium text-[#2c2d2e]">{title}</span>
          <span className="ml-1 text-[10px] text-[#818c99]">
            {formatCompetitionRange(c)} · {formatStartWithStatus(c)}
          </span>
        </span>
      </button>
    </li>
  )
}

export default memo(PrepSeasonEventList)
