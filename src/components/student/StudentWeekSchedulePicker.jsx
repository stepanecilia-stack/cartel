import { useMemo } from 'react'
import { vk } from '../../utils/vkUi.js'
import { formatWeekRangeLabel } from '../../utils/studentTrainingWeekPlan.js'

const WEEK_HEADERS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/**
 * @param {{
 *   week: import('../../utils/studentTrainingWeekPlan.js').TrainingWeek,
 *   selectedDays: string[],
 *   onToggleDay: (dateISO: string) => void,
 *   onSubmit: () => void,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function StudentWeekSchedulePicker({
  week,
  selectedDays,
  onToggleDay,
  onSubmit,
  busy = false,
  error = '',
}) {
  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays])
  const count = selectedDays.length
  const canSubmit = count >= 1 && count <= 6 && !busy
  const rangeLabel = formatWeekRangeLabel(week.weekStartISO, week.weekEndISO)

  return (
    <div className="space-y-3 pl-11">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#818c99]">
          Следующая неделя · {rangeLabel}
        </p>
        <p className={`${vk.mutedXs} mt-1`}>
          Нажми на дни тренировок. От 1 до 6 — минимум один день отдыха.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_HEADERS.map((h) => (
          <div
            key={h}
            className="py-0.5 text-center text-[10px] font-semibold uppercase text-[#818c99]"
          >
            {h}
          </div>
        ))}
        {week.days.map((day) => {
          const selected = selectedSet.has(day.dateISO)
          return (
            <button
              key={day.dateISO}
              type="button"
              disabled={busy}
              onClick={() => onToggleDay(day.dateISO)}
              className={[
                'flex min-h-[3.25rem] touch-manipulation flex-col items-center justify-center rounded-lg border-2 px-0.5 py-1 transition',
                selected
                  ? 'border-[#2d81e0] bg-[#ecf3fc] text-[#2d81e0] shadow-sm'
                  : 'border-[#e7e8ec] bg-white text-[#2c2d2e] hover:border-[#2d81e0]/40',
                busy ? 'opacity-60' : '',
              ].join(' ')}
              aria-pressed={selected}
            >
              <span className="text-[12px] font-bold tabular-nums leading-none">{day.dayNum}</span>
              <span className="mt-0.5 text-[9px] font-medium uppercase">{day.weekdayShort}</span>
            </button>
          )
        })}
      </div>

      <p className="text-[13px] text-[#2c2d2e]">
        {count === 0
          ? 'Дни не выбраны'
          : `Выбрано: ${count} ${count === 1 ? 'день' : count < 5 ? 'дня' : 'дней'}`}
      </p>

      {error ? <p className={`${vk.error} text-[13px]`}>{error}</p> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className={`${vk.btnPrimary} w-full py-2.5 text-[14px] font-semibold disabled:opacity-50`}
      >
        {busy ? 'Отправка…' : 'Отправить тренеру'}
      </button>
    </div>
  )
}
