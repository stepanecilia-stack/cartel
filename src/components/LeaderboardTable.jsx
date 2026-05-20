import LeaderboardMotorPreview from './LeaderboardMotorPreview.jsx'
import ShareLeaderboardMotorPreview from './ShareLeaderboardMotorPreview.jsx'
import { vk } from '../utils/vkUi.js'

const TOP_RANK_ROW = {
  1: 'bg-[#fff8e6]',
  2: 'bg-[#f5f6f8]',
  3: 'bg-[#f7f0ea]',
}

/** @param {{ rank: number, compact?: boolean }} props */
export function RankBadge({ rank, compact = false }) {
  const podium =
    rank === 1
      ? 'bg-[#f0b429] text-[#3d2e00] ring-1 ring-[#e6a817]/60'
      : rank === 2
        ? 'bg-[#9aa7b5] text-white'
        : rank === 3
          ? 'bg-[#a0632d] text-white'
          : 'bg-[#f0f2f5] text-[#2c2d2e]'

  const size = compact ? 'h-7 w-7 text-[12px]' : 'h-8 w-8 text-[13px]'

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${size} ${podium}`}
      aria-label={`Место ${rank}`}
    >
      {rank}
    </span>
  )
}

/** @param {{ medals: { gold: number, silver: number, bronze: number }, compact?: boolean }} props */
export function MedalChips({ medals, compact = false }) {
  if (compact) {
    return (
      <span className="text-[11px] tabular-nums text-[#818c99]">
        🥇{medals.gold} · 🥈{medals.silver} · 🥉{medals.bronze}
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1 text-[10px]">
      <span className="rounded bg-[#fff8e6] px-1 py-0.5 font-medium text-[#2c2d2e]">🥇 {medals.gold}</span>
      <span className="rounded bg-[#f0f2f5] px-1 py-0.5 text-[#2c2d2e]">🥈 {medals.silver}</span>
      <span className="rounded bg-[#fff4eb] px-1 py-0.5 text-[#2c2d2e]">🥉 {medals.bronze}</span>
    </div>
  )
}

/**
 * @param {{
 *   row: object,
 *   categoryId: string,
 *   rawById?: Map<string, object>,
 *   publicMode?: boolean,
 *   compact?: boolean,
 * }} props
 */
export function LeaderboardRowMetrics({ row, categoryId, rawById, publicMode = false, compact = true }) {
  if (categoryId === 'motor') {
    if (publicMode) {
      return (
        <ShareLeaderboardMotorPreview squares={row.motorSquares} className="justify-end" />
      )
    }
    const raw = rawById?.get(row.id)
    return <LeaderboardMotorPreview workLog={raw?.motorQualityWorkLog} className="justify-end" />
  }
  if (categoryId === 'physical' || categoryId === 'functional') {
    return row.medals ? <MedalChips medals={row.medals} compact={compact} /> : null
  }
  if (row.secondary) {
    return <span className={vk.mutedXs}>{row.secondary}</span>
  }
  return null
}

/**
 * @param {{
 *   rows: object[],
 *   categoryId: string,
 *   rawById?: Map<string, object>,
 *   publicMode?: boolean,
 *   canOpenStudent?: boolean,
 *   onOpenStudent?: (row: object) => void,
 *   showCheckboxes?: boolean,
 *   curatedSet?: Set<string>,
 *   onToggleStudent?: (id: string) => void,
 * }} props
 */
export default function LeaderboardTable({
  rows,
  categoryId,
  rawById,
  publicMode = false,
  canOpenStudent = false,
  onOpenStudent,
  showCheckboxes = false,
  curatedSet,
  onToggleStudent,
}) {
  const displayNameKey = publicMode ? 'displayName' : 'name'

  if (rows.length === 0) {
    return (
      <p className={vk.emptyState}>
        {showCheckboxes ? 'Выберите учеников для рейтинга.' : 'Нет данных для отображения.'}
      </p>
    )
  }

  return (
    <ol className={vk.list} aria-label={showCheckboxes ? 'Состав рейтинга' : 'Турнирная таблица'}>
      {rows.map((row) => {
        const rowKey = row.id ?? `${row.rank}-${row[displayNameKey]}`
        const checked = row.id && curatedSet?.has(row.id)
        const topBg = !showCheckboxes && row.rank <= 3 ? TOP_RANK_ROW[row.rank] : 'bg-white'

        if (showCheckboxes) {
          return (
            <li key={rowKey} className="border-t border-[#e7e8ec] first:border-t-0">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 px-2.5 py-2 active:bg-[#f5f6f8]">
                <input
                  type="checkbox"
                  checked={Boolean(checked)}
                  onChange={() => onToggleStudent?.(row.id)}
                  className="h-[18px] w-[18px] shrink-0 rounded border-[#c5d0de] text-[#2d81e0]"
                />
                <span className={`min-w-0 flex-1 truncate ${vk.listItemTitle}`}>
                  {row[displayNameKey] ?? row.name}
                </span>
              </label>
            </li>
          )
        }

        const metrics =
          categoryId !== 'technical' ? (
            <LeaderboardRowMetrics
              row={row}
              categoryId={categoryId}
              rawById={rawById}
              publicMode={publicMode}
            />
          ) : null

        const scoreBlock = (
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-semibold tabular-nums leading-5 text-[#2d81e0]">
              {row.primaryLabel}
            </p>
            <p className="text-[10px] leading-3 text-[#818c99]">{row.primarySuffix}</p>
          </div>
        )

        const inner = (
          <>
            <RankBadge rank={row.rank} compact />
            <div className="min-w-0 flex-1">
              <p className={`truncate ${vk.listItemTitle}`}>{row[displayNameKey]}</p>
              {metrics ? <div className="mt-0.5">{metrics}</div> : null}
            </div>
            {scoreBlock}
          </>
        )

        return (
          <li key={rowKey} className={`border-t border-[#e7e8ec] first:border-t-0 ${topBg}`}>
            {canOpenStudent ? (
              <button
                type="button"
                onClick={() => onOpenStudent?.(row)}
                className="flex w-full min-h-[44px] touch-manipulation items-center gap-2 px-2.5 py-2 text-left active:bg-[#f5f6f8]"
              >
                {inner}
              </button>
            ) : (
              <div className="flex min-h-[44px] items-center gap-2 px-2.5 py-2">{inner}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
