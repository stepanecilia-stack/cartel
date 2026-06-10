import { NormMedalChip } from '../NormMedals.jsx'
import { displayNameFromStudent } from '../../utils/studentModel.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   evaluation: {
 *     student: object,
 *     norm: { testName?: string, unit?: string },
 *     resultDisplay: string,
 *     status: string,
 *     statusLabel: string,
 *   },
 *   busy?: boolean,
 *   saved?: boolean,
 *   error?: string,
 *   onConfirm: () => void,
 * }} props
 */
export default function CoachAssistantNormConfirmCard({
  evaluation,
  busy = false,
  saved = false,
  error = '',
  onConfirm,
}) {
  const studentName = displayNameFromStudent(evaluation.student)
  const normName = evaluation.norm?.testName ?? 'Норматив'
  const unit = evaluation.norm?.unit ? ` ${evaluation.norm.unit}` : ''
  const result = evaluation.resultDisplay

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-[14px] text-emerald-900">
        <p className="font-semibold">Записано в карточку</p>
        <p className="mt-1 text-[13px] leading-snug">
          {studentName} — «{normName}»: {result}
          {unit}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#dce1e6] bg-white px-3 py-3 shadow-sm">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#818c99]">
        Записать в карточку
      </p>
      <dl className="mt-2 space-y-1.5 text-[14px] text-[#2c2d2e]">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-[#818c99]">Спортсмен</dt>
          <dd className="min-w-0 font-medium">{studentName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-[#818c99]">Норматив</dt>
          <dd className="min-w-0">{normName}</dd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-20 shrink-0 text-[#818c99]">Результат</dt>
          <dd className="flex items-center gap-1.5 font-semibold tabular-nums">
            {result}
            {unit}
            <NormMedalChip status={evaluation.status} size="sm" />
            <span className="text-[13px] font-normal text-[#818c99]">{evaluation.statusLabel}</span>
          </dd>
        </div>
      </dl>
      {error ? <p className={`${vk.error} mt-2 text-[13px]`}>{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className={`${vk.btnPrimary} mt-3 w-full py-2 text-[14px] font-semibold disabled:opacity-50`}
      >
        {busy ? 'Записываю…' : 'Записать в карточку'}
      </button>
    </div>
  )
}
