import { memo } from 'react'
import { NormGoldGoalIcon, NormMedalChip } from '../NormMedals'
import { normCardToneByStatus, normScoreToneByStatus } from '../../utils/normCardTone'
import { formatNormAcceptedMeta, formatPendingStudentSelfReportMeta, formatStudentSelfReportMeta } from '../../utils/normAcceptanceHistory'
import {
  getPendingStudentSelfReport,
  isMinuteSecondNorm,
  isStudentSelfReportNormRow,
} from '../../utils/normTestsStorage.js'
import { vk } from '../../utils/vkUi.js'

/** @param {string} category @param {string} testId */
export function normCardDomId(category, testId) {
  const safe = String(testId ?? '').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `norm-card-${category}-${safe}`
}

/**
 * @param {{
 *   category: string,
 *   norm: object,
 *   row: object | undefined,
 *   displayRow?: object | undefined,
 *   displayVal: string,
 *   inputType: string,
 *   goalLabel: string,
 *   inputPlaceholder: string,
 *   normBusy: boolean,
 *   canSave: boolean,
 *   onResultChange: (value: string) => void,
 *   onSave: () => void,
 *   onOpenHistory?: () => void,
 * }} props
 */
function StudentNormCard({
  category,
  norm,
  row,
  displayRow = row,
  displayVal,
  inputType,
  goalLabel,
  inputPlaceholder,
  normBusy,
  canSave,
  onResultChange,
  onSave,
  onOpenHistory,
}) {
  const isSelfReport = isStudentSelfReportNormRow(row)
  const pendingRetake = getPendingStudentSelfReport(row)
  const cardTone = isSelfReport ? 'bg-sky-50' : pendingRetake ? 'bg-sky-50/60' : normCardToneByStatus(row?.status)
  const scoreTone = normScoreToneByStatus(row?.status)
  const acceptedMeta = formatNormAcceptedMeta(row)
  const selfReportMeta = formatStudentSelfReportMeta(row)
  const pendingRetakeMeta = formatPendingStudentSelfReportMeta(row)
  const minuteSecond = isMinuteSecondNorm(norm)

  return (
    <li
      id={normCardDomId(category, norm.testId)}
      className={`scroll-mt-40 border-t border-[#e7e8ec] first:border-t-0 ${cardTone}`}
    >
      <div className="px-2.5 py-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {onOpenHistory ? (
              <button
                type="button"
                onClick={onOpenHistory}
                className="group w-full text-left touch-manipulation"
                aria-label={`График: ${norm.testName}`}
              >
                <p className="text-[15px] font-medium leading-5 text-[#2c2d2e] group-hover:text-[#2d81e0]">
                  {norm.testName}
                  <span className="ml-1 text-[12px] font-normal text-[#818c99] group-hover:text-[#2d81e0]">
                    · график
                  </span>
                </p>
              </button>
            ) : (
              <p className="text-[15px] font-medium leading-5 text-[#2c2d2e]">{norm.testName}</p>
            )}
            {norm.description ? (
              <p className="line-clamp-1 text-[11px] leading-4 text-[#818c99]">{norm.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1" title="Золото">
            <NormGoldGoalIcon />
            <span className="text-[12px] font-semibold tabular-nums text-amber-800">
              {goalLabel}
              <span className="ml-0.5 font-normal text-[#818c99]">{norm.unit}</span>
            </span>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <input
            type={minuteSecond ? 'text' : inputType}
            inputMode={minuteSecond ? 'text' : 'decimal'}
            step={minuteSecond ? undefined : 'any'}
            aria-label={`Результат, ${norm.unit}`}
            placeholder={inputPlaceholder}
            className={`${vk.input} w-[5.5rem] min-w-0 shrink-0 sm:w-24`}
            value={displayVal}
            onChange={(e) => onResultChange(e.target.value)}
          />
          {displayRow && Number.isFinite(displayRow.result) ? (
            <span className={`flex items-center gap-1 text-[12px] tabular-nums ${scoreTone}`}>
              <span className="font-semibold">{displayRow.normalizedScore}</span>
              <NormMedalChip status={displayRow.status} size="sm" />
            </span>
          ) : null}
          <button
            type="button"
            disabled={!canSave || normBusy || !displayRow || !Number.isFinite(displayRow.result)}
            onClick={onSave}
            className={`${vk.btnCompact} ml-auto disabled:opacity-45`}
          >
            {normBusy ? '…' : 'Сохранить'}
          </button>
        </div>

        {pendingRetakeMeta ? (
          <p className={`mt-1 truncate text-[11px] font-medium text-sky-800`}>{pendingRetakeMeta}</p>
        ) : null}
        {selfReportMeta ? (
          <p className={`mt-1 truncate text-[11px] font-medium text-sky-800`}>{selfReportMeta}</p>
        ) : null}
        {acceptedMeta ? <p className={`mt-1 truncate ${vk.mutedXs}`}>{acceptedMeta}</p> : null}
      </div>
    </li>
  )
}

export default memo(StudentNormCard)
