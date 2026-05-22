import { memo } from 'react'
import { SEASON_GOAL_OPTIONS } from '../../data/seasonGoals.js'

/**
 * @param {{
 *   seasonGoal: import('../../data/seasonGoals.js').SeasonGoalId,
 *   nextSeasonGoal: import('../../data/seasonGoals.js').SeasonGoalId,
 *   ladderClosed: boolean,
 *   onSeasonGoal: (id: import('../../data/seasonGoals.js').SeasonGoalId) => void,
 *   onNextSeasonGoal: (id: import('../../data/seasonGoals.js').SeasonGoalId) => void,
 *   onLadderClosed: (v: boolean) => void,
 *   disabled?: boolean,
 * }} props
 */
function PrepSeasonGoal({
  seasonGoal,
  nextSeasonGoal,
  ladderClosed,
  onSeasonGoal,
  onNextSeasonGoal,
  onLadderClosed,
  disabled = false,
}) {
  return (
    <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2">
      <label className="flex cursor-pointer items-start gap-2 rounded-[8px] border border-amber-200/80 bg-amber-50/80 px-2 py-1.5">
        <input
          type="checkbox"
          checked={ladderClosed}
          disabled={disabled}
          onChange={(e) => onLadderClosed(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span className="min-w-0 text-[11px] leading-snug text-amber-950">
          <span className="font-semibold">Лестница этого цикла закрыта</span> (вылет). Рекомендации
          строятся под <span className="font-semibold">следующий сезон</span>, а не под прошедшие отборы.
        </span>
      </label>

      {ladderClosed ? (
        <div className="mt-2.5">
          <p className="text-[12px] font-semibold text-[#2c2d2e]">Амбиция на следующий сезон</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#818c99]">
            Пример: вылет в мае, цель — Россия в следующем цикле. Сейчас — мост: техника, объём, опыт, без
            ложного пика к старым датам.
          </p>
          <GoalRadioGroup
            name="nextSeasonGoal"
            value={nextSeasonGoal}
            disabled={disabled}
            onChange={onNextSeasonGoal}
          />
        </div>
      ) : (
        <div className="mt-2.5">
          <p className="text-[12px] font-semibold text-[#2c2d2e]">Задача на этот сезон</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#818c99]">
            Активная лестница — задача определяет микроцикл и нагрузку к ближайшим отборам.
          </p>
          <GoalRadioGroup
            name="seasonGoal"
            value={seasonGoal}
            disabled={disabled}
            onChange={onSeasonGoal}
          />
        </div>
      )}
    </div>
  )
}

/**
 * @param {{
 *   name: string,
 *   value: import('../../data/seasonGoals.js').SeasonGoalId,
 *   disabled?: boolean,
 *   onChange: (id: import('../../data/seasonGoals.js').SeasonGoalId) => void,
 * }} props
 */
function GoalRadioGroup({ name, value, disabled, onChange }) {
  return (
    <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={name}>
      {SEASON_GOAL_OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <label
            key={opt.id}
            className={`flex cursor-pointer gap-2 rounded-[8px] border px-2 py-1.5 transition ${
              active
                ? 'border-[#2d81e0]/40 bg-[#f5f9ff]'
                : 'border-[#e7e8ec] bg-[#fafbfc] hover:border-[#d3d9de]'
            } ${disabled ? 'opacity-70' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={active}
              disabled={disabled}
              onChange={() => onChange(opt.id)}
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 text-[12px] font-medium leading-snug text-[#2c2d2e]" title={opt.hint}>
              {opt.short} — {opt.hint.split('.')[0]}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export default memo(PrepSeasonGoal)
