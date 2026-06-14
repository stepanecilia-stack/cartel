import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NormMedalChip } from '../NormMedals'
import { formatNormAcceptedMeta } from '../../utils/normAcceptanceHistory.js'
import { buildNormChartPoints, formatNormChartDateLabel } from '../../utils/normHistoryChart.js'
import { formatNormGoldLabel } from '../../utils/normTestsStorage.js'
import { vk } from '../../utils/vkUi.js'
import NormHistoryChart from './NormHistoryChart.jsx'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   norm: object | null,
 *   row: Record<string, unknown> | null | undefined,
 * }} props
 */
export default function NormHistoryModal({ open, onClose, norm, row }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !norm) return null

  const points = buildNormChartPoints(norm, row)
  const acceptedMeta = formatNormAcceptedMeta(row)
  const unit = String(norm.unit ?? '').trim()

  return createPortal(
    <div className={vk.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-[12px] bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={`История: ${norm.testName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-[#e7e8ec] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-5 text-[#2c2d2e]">{norm.testName}</p>
            <p className={vk.mutedXs}>
              Динамика результата
              {unit ? ` · ${unit}` : ''}
              {points.length > 0 ? ` · ${points.length} ${pointsLabel(points.length)}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f2f5] text-[#2c2d2e] active:bg-[#e7e8ec]"
            aria-label="Закрыть"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
          <NormHistoryChart norm={norm} row={row} />

          <div className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2">
            <p className="text-[12px] font-semibold text-[#2c2d2e]">Ориентир</p>
            <p className="mt-0.5 text-[12px] text-[#818c99]">
              Золото: <span className="font-semibold tabular-nums text-amber-800">{formatNormGoldLabel(norm)}</span>
            </p>
            {acceptedMeta ? <p className={`mt-1 ${vk.mutedXs}`}>{acceptedMeta}</p> : null}
          </div>

          {points.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-[#2c2d2e]">Зачёты</p>
              <ul className="space-y-1.5">
                {[...points].reverse().map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-[#e7e8ec] bg-white px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold tabular-nums text-[#2c2d2e]">{p.resultDisplay}</p>
                      <p className={vk.mutedXs}>
                        {formatNormChartDateLabel(p.recordedAt)}
                        {p.coachName ? ` · ${p.coachName}` : ''}
                        {p.normalizedScore != null ? ` · балл ${p.normalizedScore}` : ''}
                      </p>
                    </div>
                    {p.status ? <NormMedalChip status={p.status} size="sm" /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function pointsLabel(count) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'зачёт'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'зачёта'
  return 'зачётов'
}
