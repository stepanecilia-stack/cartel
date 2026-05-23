import { memo, useMemo } from 'react'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { SEASON_BLOCK_PHASE_STYLES, SEASON_CHECKPOINT_KIND_STYLES } from '../../data/seasonPlanKinds.js'
import { seasonBlockTouchesYear } from '../../utils/seasonPlan.js'

/**
 * @param {{
 *   blocks: import('../../utils/seasonPlan.js').SeasonBlock[],
 *   checkpoints: import('../../utils/seasonPlan.js').SeasonCheckpoint[],
 *   year: number,
 *   focusId: string | null,
 *   onFocusBlock: (block: import('../../utils/seasonPlan.js').SeasonBlock) => void,
 *   onFocusCheckpoint: (cp: import('../../utils/seasonPlan.js').SeasonCheckpoint) => void,
 *   onDeleteBlock?: (id: string) => void,
 *   onDeleteCheckpoint?: (id: string) => void,
 *   deleteBusy?: boolean,
 * }} props
 */
function PrepSeasonPlanList({
  blocks,
  checkpoints,
  year,
  focusId,
  onFocusBlock,
  onFocusCheckpoint,
  onDeleteBlock,
  onDeleteCheckpoint,
  deleteBusy = false,
}) {
  const yearBlocks = useMemo(
    () => blocks.filter((b) => seasonBlockTouchesYear(b, year)),
    [blocks, year],
  )
  const yearCheckpoints = useMemo(
    () => checkpoints.filter((c) => c.dateISO.startsWith(String(year))),
    [checkpoints, year],
  )

  if (!yearBlocks.length && !yearCheckpoints.length) {
    return (
      <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
        Нет блоков и контрольных точек на {year} год. Выберите старт и «Мезо к старту» или добавьте блок
        вручную.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {yearBlocks.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-[#818c99]">Блоки подготовки</p>
          <ul className="space-y-1">
            {yearBlocks.map((block) => {
              const style = SEASON_BLOCK_PHASE_STYLES[block.phase]
              const active = focusId === block.id
              return (
                <li key={block.id} className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onFocusBlock(block)}
                    className={`min-w-0 flex-1 rounded-md border-2 px-2 py-1.5 text-left text-[12px] ${style.chip} ${
                      active ? 'ring-2 ring-[#2d81e0]/50' : ''
                    } ${block.done ? 'opacity-70' : ''}`}
                  >
                    <span className="font-semibold text-[#2c2d2e]">
                      {block.done ? '✓ ' : ''}
                      {block.title}
                    </span>
                    <span className="block text-[11px] text-[#818c99]">
                      {style.label} · {formatCompetitionRange(block)}
                    </span>
                  </button>
                  {onDeleteBlock ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-md px-2 text-[13px] text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      disabled={deleteBusy}
                      aria-label="Удалить блок"
                      onClick={() => onDeleteBlock(block.id)}
                    >
                      ✕
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {yearCheckpoints.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-[#818c99]">Контрольные точки</p>
          <ul className="space-y-1">
            {yearCheckpoints.map((cp) => {
              const style = SEASON_CHECKPOINT_KIND_STYLES[cp.kind]
              const active = focusId === cp.id
              return (
                <li key={cp.id} className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onFocusCheckpoint(cp)}
                    className={`min-w-0 flex-1 rounded-md border-2 px-2 py-1.5 text-left text-[12px] ${style.chip} ${
                      active ? 'ring-2 ring-[#2d81e0]/50' : ''
                    } ${cp.done ? 'opacity-70' : ''}`}
                  >
                    <span className="font-semibold text-[#2c2d2e]">
                      {cp.done ? '✓ ' : ''}
                      {cp.title}
                    </span>
                    <span className="block text-[11px] text-[#818c99]">{style.label}</span>
                  </button>
                  {onDeleteCheckpoint ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-md px-2 text-[13px] text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      disabled={deleteBusy}
                      aria-label="Удалить точку"
                      onClick={() => onDeleteCheckpoint(cp.id)}
                    >
                      ✕
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default memo(PrepSeasonPlanList)
