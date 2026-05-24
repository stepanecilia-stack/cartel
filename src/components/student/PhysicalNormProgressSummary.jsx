import { memo, useMemo } from 'react'
import { TrainingRangeSlider } from '../technique/TechniqueProgressSliders.jsx'
import { summarizeNormsForValues } from '../../utils/normTestsStorage.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   norms: object[],
 *   values: Record<string, unknown>,
 * }} props
 */
function PhysicalNormProgressSummary({ norms, values }) {
  const summary = useMemo(() => summarizeNormsForValues(norms, values), [norms, values])

  if (summary.total <= 0) return null

  const notPassed = summary.empty + summary.red

  return (
    <section className={`${vk.cardPadded} space-y-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[#2c2d2e]">Сводка по нормативам</p>
          <p className={`${vk.mutedXs} mt-0.5`}>
            Зачёты (бронза и выше) по нормативам вашего возраста и пола
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#2d81e0]">
          {summary.passed}/{summary.total}
        </span>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">
            Зачёты
          </p>
          <span className="text-[11px] font-semibold tabular-nums text-[#2c2d2e]">
            {summary.passed}/{summary.total}
          </span>
        </div>
        <TrainingRangeSlider
          min={0}
          max={summary.total}
          value={summary.passed}
          readOnly
          ariaLabel={`Зачёты по нормативам: ${summary.passed} из ${summary.total}`}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-[12px]">
        <span className="rounded-md bg-[#fff8e6] px-2 py-1 font-medium tabular-nums text-[#2c2d2e]">
          🥇 {summary.gold}
        </span>
        <span className="rounded-md bg-[#f0f2f5] px-2 py-1 font-medium tabular-nums text-[#2c2d2e]">
          🥈 {summary.silver}
        </span>
        <span className="rounded-md bg-[#fff4eb] px-2 py-1 font-medium tabular-nums text-[#2c2d2e]">
          🥉 {summary.bronze}
        </span>
        {summary.red > 0 ? (
          <span className="rounded-md bg-rose-50 px-2 py-1 font-medium tabular-nums text-rose-800">
            Ниже нормы: {summary.red}
          </span>
        ) : null}
        {summary.empty > 0 ? (
          <span className="rounded-md bg-[#f0f2f5] px-2 py-1 font-medium tabular-nums text-[#818c99]">
            Не сдано: {summary.empty}
          </span>
        ) : null}
      </div>

      {notPassed > 0 ? (
        <p className={`${vk.mutedXs}`}>
          Всего нормативов в программе: {summary.total}. Сдано с зачётом: {summary.passed}
          {summary.filled > summary.passed
            ? `, попыток без зачёта: ${summary.red}`
            : ''}
          {summary.empty > 0 ? `, без результата: ${summary.empty}` : ''}.
        </p>
      ) : (
        <p className={`${vk.mutedXs} font-medium text-[#4bb34b]`}>Все нормативы сданы на зачёт.</p>
      )}
    </section>
  )
}

export default memo(PhysicalNormProgressSummary)
