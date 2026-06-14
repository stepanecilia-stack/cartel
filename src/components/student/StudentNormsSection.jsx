import { memo, useMemo, useState } from 'react'
import PhysicalNormProgressSummary from './PhysicalNormProgressSummary.jsx'
import NormHistoryModal from './NormHistoryModal.jsx'
import StudentNormCard from './StudentNormCard.jsx'
import {
  formatMinutesToMinuteSecond,
  getNormValueByTestId,
  getPendingStudentSelfReport,
  isCoachOwnedNormRow,
  isMinuteSecondNorm,
} from '../../utils/normTestsStorage.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   category: 'physical' | 'functional',
 *   norms: object[],
 *   values: Record<string, unknown>,
 *   loadingNorms: boolean,
 *   normSavingKey: string | null,
 *   canSave: boolean,
 *   onResultChange: (norm: object, raw: string) => void,
 *   onSaveAcceptance: (norm: object) => void,
 * }} props
 */
function StudentNormsSection({
  category,
  norms,
  values,
  loadingNorms,
  normSavingKey,
  canSave,
  onResultChange,
  onSaveAcceptance,
}) {
  const [historyNorm, setHistoryNorm] = useState(/** @type {object | null} */ (null))
  const historyRow = useMemo(() => {
    if (!historyNorm) return null
    return getNormValueByTestId(values, historyNorm.testId)
  }, [historyNorm, values])

  const rows = useMemo(
    () =>
      norms.map((norm) => {
        const rawRow = getNormValueByTestId(values, norm.testId)
        const pending = getPendingStudentSelfReport(rawRow)
        const row =
          pending && isCoachOwnedNormRow(rawRow)
            ? { ...rawRow, ...pending }
            : rawRow
        const displayVal =
          pending?.resultRaw != null && pending.resultRaw !== ''
            ? String(pending.resultRaw)
            : row?.resultRaw != null && row.resultRaw !== ''
              ? String(row.resultRaw)
              : pending?.result !== undefined && pending?.result !== null
                ? isMinuteSecondNorm(norm)
                  ? formatMinutesToMinuteSecond(pending.result)
                  : String(pending.result)
                : row?.result !== undefined && row?.result !== null
                  ? isMinuteSecondNorm(norm)
                    ? formatMinutesToMinuteSecond(row.result)
                    : String(row.result)
                  : ''
        const goalLabel =
          Number.isFinite(norm.gold)
            ? isMinuteSecondNorm(norm)
              ? formatMinutesToMinuteSecond(norm.gold)
              : String(norm.gold)
            : '—'
        return {
          norm,
          row: rawRow,
          displayRow: row,
          displayVal,
          inputType: isMinuteSecondNorm(norm) ? 'text' : 'number',
          goalLabel,
          inputPlaceholder: isMinuteSecondNorm(norm) ? 'м:сс' : 'число',
          normBusy: normSavingKey === `${category}:${norm.testId}`,
        }
      }),
    [norms, values, category, normSavingKey],
  )

  if (loadingNorms) {
    return <p className={vk.muted}>Загрузка…</p>
  }
  if (norms.length === 0) {
    return (
      <p className={vk.mutedXs}>
        Нет нормативов для возраста и пола. Укажите год рождения и пол на вкладке «Карта».
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {category === 'physical' ? (
        <PhysicalNormProgressSummary norms={norms} values={values} />
      ) : null}

      <ul className={vk.list}>
      {rows.map(({ norm, row, displayRow, displayVal, inputType, goalLabel, inputPlaceholder, normBusy }) => (
        <StudentNormCard
          key={norm.testId}
          category={category}
          norm={norm}
          row={row}
          displayRow={displayRow}
          displayVal={displayVal}
          inputType={inputType}
          goalLabel={goalLabel}
          inputPlaceholder={inputPlaceholder}
          normBusy={normBusy}
          canSave={canSave}
          onResultChange={(raw) => onResultChange(norm, raw)}
          onSave={() => onSaveAcceptance(norm)}
          onOpenHistory={() => setHistoryNorm(norm)}
        />
      ))}
      </ul>

      <NormHistoryModal
        open={historyNorm != null}
        onClose={() => setHistoryNorm(null)}
        norm={historyNorm}
        row={historyRow}
      />
    </div>
  )
}

export default memo(StudentNormsSection)
