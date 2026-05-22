import { memo } from 'react'
import { athleteStageStyle } from '../../data/athletePrepStages.js'

/**
 * @param {{ roadmap: object | null, studentName?: string | null }} props
 */
function PrepRoadmapBar({ roadmap, studentName = null }) {
  if (!roadmap) return null

  const { anchor, daysUntilAnchor, todayPhaseId, timeline, hasAnchor, anchorCertainty } = roadmap
  const isOrientir = anchorCertainty === 'orientir'

  return (
    <div className="rounded-[10px] border border-[#2d81e0]/20 bg-[#f5f9ff] px-2.5 py-2">
      <p className="text-[12px] font-semibold text-[#2d81e0]">
        План подготовки{studentName ? ` · ${studentName}` : ''}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-[#818c99]">
        {hasAnchor ? (
          <>
            {isOrientir ? (
              <span className="font-medium text-amber-900">Ориентир</span>
            ) : (
              <span className="font-medium text-[#2c2d2e]">Подтверждённый старт</span>
            )}
            {anchor?.title ? ` · ${anchor.title}` : ''}
            {isOrientir ? (
              <span className="text-amber-900">
                {daysUntilAnchor != null && daysUntilAnchor >= 0
                  ? ` · примерно ${daysUntilAnchor} дн (дата уточнится)`
                  : ' · дата примерная'}
              </span>
            ) : daysUntilAnchor != null && daysUntilAnchor >= 0 ? (
              <span className="font-medium text-[#2c2d2e]"> · {daysUntilAnchor} дн</span>
            ) : null}
            {isOrientir ? (
              <span className="block mt-0.5">
                Этапы идут по нарастанию нагрузки. Когда дата станет точной — пересчитаем отсчёт и
                микроплан.
              </span>
            ) : (
              <span className="block mt-0.5">Этапы считаются от даты старта назад.</span>
            )}
          </>
        ) : (
          <span className="font-medium text-amber-900">Добавьте старт в календарь</span>
        )}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {timeline.map((step) => {
          const active = step.id === todayPhaseId
          const style = athleteStageStyle(step.id)
          return (
            <span
              key={step.id}
              title={step.fullLabel + (step.rangeLabel ? ` (${step.rangeLabel})` : '')}
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                style.chip
              } ${active ? 'ring-2 ring-[#2d81e0]/50 ring-offset-1' : 'opacity-75'}`}
            >
              {step.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default memo(PrepRoadmapBar)
