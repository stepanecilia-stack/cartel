import { memo } from 'react'
import { NormGoldGoalIcon, NormMedalChip } from '../NormMedals.jsx'
import { normCardToneByStatus } from '../../utils/normCardTone.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   snapshot: import('../../utils/portalNormsChat.js').PortalNormsSnapshot,
 *   activeTestId?: string | null,
 *   onSelectNorm?: (item: import('../../utils/portalNormsChat.js').PortalNormsItemSnapshot) => void,
 * }} props
 */
function StudentPortalNormsGoldList({ snapshot, activeTestId = null, onSelectNorm = null }) {
  if (snapshot.total <= 0) return null

  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-[#2c2d2e]">Твои нормативы</h2>
          <p className={`${vk.mutedXs} mt-0.5`}>Нажми пункт — тренер проведёт сдачу · золото — ориентир</p>
        </div>
        <span className="rounded-full bg-[#ecf3fc] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-[#2d81e0]">
          Зачёт {snapshot.passed}/{snapshot.total}
        </span>
      </div>

      <ul className="space-y-1.5">
        {snapshot.items.map((item) => {
          const hasResult = Boolean(item.displayResult)
          const tone = normCardToneByStatus(item.status)
          const goldLabel = `${item.goalGold}${item.unit ? ` ${item.unit}` : ''}`
          const isActive = activeTestId != null && item.testId === activeTestId
          const interactive = Boolean(onSelectNorm)

          return (
            <li key={item.testId || item.testName}>
              <button
                type="button"
                onClick={() => onSelectNorm?.(item)}
                disabled={!interactive}
                className={`w-full overflow-hidden rounded-xl border text-left shadow-sm transition-colors ${
                  isActive
                    ? 'border-[#2d81e0] ring-2 ring-[#2d81e0]/25'
                    : 'border-[#e7e8ec] hover:border-[#2d81e0]/50'
                } ${tone} ${interactive ? 'cursor-pointer active:scale-[0.995]' : 'cursor-default'}`}
              >
                <div className="flex items-stretch gap-0">
                  <div className="min-w-0 flex-1 px-3 py-2.5 sm:px-3.5">
                    <p className="text-[14px] font-semibold leading-snug text-[#2c2d2e] sm:text-[15px]">
                      {item.testName}
                    </p>
                    {hasResult ? (
                      <div className="mt-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-[#818c99]">
                            {item.selfReported
                              ? 'Со слов ученика'
                              : item.hasOfficialResult
                                ? 'Зачёт'
                                : item.hasCoachEnteredResult
                                  ? 'Записал тренер'
                                  : 'Результат'}
                          </span>
                          <span className="text-[13px] font-bold tabular-nums text-[#2c2d2e]">
                            {item.displayResult}
                            {item.unit ? ` ${item.unit}` : ''}
                          </span>
                          {item.status !== 'empty' && !item.selfReported ? (
                            <NormMedalChip status={item.status} size="sm" />
                          ) : null}
                        </div>
                        {item.pendingRetakeResult ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-medium text-sky-700">Пересдача</span>
                            <span className="text-[12px] font-semibold tabular-nums text-sky-900">
                              {item.pendingRetakeResult}
                              {item.unit ? ` ${item.unit}` : ''}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className={`${vk.mutedXs} mt-0.5`}>Нажми — сообщить результат</p>
                    )}
                  </div>

                  <div className="flex w-[5.75rem] shrink-0 flex-col items-center justify-center border-l border-[#e7e8ec]/80 bg-gradient-to-b from-amber-50/90 to-amber-100/50 px-2 py-2 sm:w-[6.25rem]">
                    <NormGoldGoalIcon />
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-amber-800/80">
                      Золото
                    </p>
                    <p className="mt-0.5 text-center text-[13px] font-bold leading-tight tabular-nums text-amber-950 sm:text-[14px]">
                      {goldLabel}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default memo(StudentPortalNormsGoldList)
