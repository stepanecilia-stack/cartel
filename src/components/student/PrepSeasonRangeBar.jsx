import { memo } from 'react'
import { competitionDateToInputString } from '../../utils/competitionDate.js'
import { formatShortDateRu } from '../../utils/prepSeasonCalendar.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   startISO: string,
 *   endISO: string,
 *   onEndISO: (iso: string) => void,
 *   onConfirm: () => void,
 *   onOneDay: () => void,
 *   onCancel: () => void,
 * }} props
 */
function PrepSeasonRangeBar({ startISO, endISO, onEndISO, onConfirm, onOneDay, onCancel }) {
  return (
    <div className="rounded-lg border border-[#2d81e0] bg-[#ecf3fc] px-2.5 py-2 space-y-2">
      <p className="text-[12px] font-semibold text-[#2c2d2e]">
        Начало: {formatShortDateRu(startISO)} — выберите конец в календаре или укажите дату
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label className={vk.label} htmlFor="prep-range-end">
            Конец периода
          </label>
          <input
            id="prep-range-end"
            type="date"
            className={vk.input}
            value={competitionDateToInputString(endISO) || competitionDateToInputString(startISO)}
            min={competitionDateToInputString(startISO)}
            onChange={(e) => {
              const v = e.target.value
              if (v) onEndISO(v)
            }}
          />
        </div>
        <button type="button" className={vk.btnPrimary} onClick={onConfirm}>
          Готово
        </button>
        <button type="button" className={vk.btnSecondary} onClick={onOneDay}>
          Один день
        </button>
        <button type="button" className={vk.btnGhost} onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  )
}

export default memo(PrepSeasonRangeBar)
