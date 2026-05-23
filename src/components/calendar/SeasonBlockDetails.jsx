import { memo } from 'react'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { SEASON_BLOCK_PHASE_STYLES } from '../../data/seasonPlanKinds.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   block: import('../../utils/seasonPlan.js').SeasonBlock,
 *   onClose: () => void,
 *   onEdit: () => void,
 *   onDelete?: () => void | Promise<void>,
 *   onToggleDone?: (done: boolean) => void | Promise<void>,
 *   busy?: boolean,
 *   canSave?: boolean,
 * }} props
 */
function SeasonBlockDetails({
  block,
  onClose,
  onEdit,
  onDelete,
  onToggleDone,
  busy = false,
  canSave = true,
}) {
  const style = SEASON_BLOCK_PHASE_STYLES[block.phase] ?? SEASON_BLOCK_PHASE_STYLES.base

  return (
    <div className={`rounded-lg border-2 p-2.5 ${style.chip}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">
            {style.label} · блок
          </p>
          <p className="text-[14px] font-semibold text-[#2c2d2e]">{block.title}</p>
          <p className="text-[12px] text-[#818c99]">{formatCompetitionRange(block)}</p>
        </div>
        <button type="button" className={vk.btnSecondary} onClick={onClose}>
          Закрыть
        </button>
      </div>

      {canSave && onToggleDone ? (
        <label className="mt-2 flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={Boolean(block.done)}
            disabled={busy}
            onChange={(e) => void onToggleDone(e.target.checked)}
          />
          Выполнено
        </label>
      ) : null}

      {canSave ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={vk.btnPrimary} onClick={onEdit} disabled={busy}>
            Изменить
          </button>
          {onDelete ? (
            <button
              type="button"
              className="text-[13px] font-medium text-rose-600 disabled:opacity-50"
              disabled={busy}
              onClick={() => void onDelete()}
            >
              Удалить
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default memo(SeasonBlockDetails)
