import LeaderboardMotorPreview from './LeaderboardMotorPreview.jsx'
import ShareLeaderboardMotorPreview from './ShareLeaderboardMotorPreview.jsx'
import { vk } from '../utils/vkUi.js'

/** @param {{ rank: number, compact?: boolean }} props */
export function RankBadge({ rank, compact = false }) {
  const podium =
    rank === 1
      ? 'border-amber-300 bg-amber-100 text-amber-900'
      : rank === 2
        ? 'border-[#c5d0de] bg-[#f0f2f5] text-[#2c2d2e]'
        : rank === 3
          ? 'border-orange-300 bg-orange-100 text-orange-900'
          : 'border-[#e7e8ec] bg-white text-[#2c2d2e]'

  const size = compact ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border font-bold tabular-nums ${size} ${podium}`}
      aria-label={`Место ${rank}`}
    >
      {rank}
    </span>
  )
}

/** @param {{ medals: { gold: number, silver: number, bronze: number, red: number }, stacked?: boolean }} props */
export function MedalChips({ medals, stacked = false }) {
  return (
    <div
      className={`flex flex-wrap gap-1 text-[10px] sm:gap-1.5 sm:text-xs ${
        stacked ? 'justify-center' : 'items-center justify-end sm:justify-end'
      }`}
    >
      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-900 sm:px-2">
        🥇 {medals.gold}
      </span>
      <span className="rounded-full bg-[#f0f2f5] px-1.5 py-0.5 font-medium text-[#2c2d2e] sm:px-2">
        🥈 {medals.silver}
      </span>
      <span className="rounded-full bg-orange-50 px-1.5 py-0.5 font-medium text-orange-900 sm:px-2">
        🥉 {medals.bronze}
      </span>
    </div>
  )
}

/**
 * @param {{
 *   row: object,
 *   categoryId: string,
 *   rawById?: Map<string, object>,
 *   publicMode?: boolean,
 *   mobileStacked?: boolean,
 * }} props
 */
export function LeaderboardRowMetrics({ row, categoryId, rawById, publicMode = false, mobileStacked = false }) {
  const align = mobileStacked ? 'items-start' : 'items-end sm:items-end'

  if (categoryId === 'motor') {
    if (publicMode) {
      return (
        <div className={`flex min-w-0 w-full flex-col gap-1 ${align}`}>
          <ShareLeaderboardMotorPreview
            squares={row.motorSquares}
            className="max-w-full justify-start sm:max-w-[200px] sm:justify-end"
          />
          {row.secondary ? (
            <span className={vk.mutedXs}>{row.secondary}</span>
          ) : null}
        </div>
      )
    }
    const raw = rawById?.get(row.id)
    return (
      <div className={`flex min-w-0 w-full flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 ${align}`}>
        <LeaderboardMotorPreview
          workLog={raw?.motorQualityWorkLog}
          className="max-w-full justify-start sm:max-w-[200px] sm:justify-end"
        />
        {row.secondary ? (
          <span className={vk.mutedXs}>{row.secondary}</span>
        ) : null}
      </div>
    )
  }
  if (categoryId === 'physical' || categoryId === 'functional') {
    return row.medals ? <MedalChips medals={row.medals} stacked={mobileStacked} /> : null
  }
  if (categoryId === 'technical') {
    return null
  }
  return row.secondary ? (
    <span className={vk.mutedXs}>{row.secondary}</span>
  ) : null
}

/** Порядок колонок: 2-е | 1-е | 3-е (пустые ячейки сохраняют центр для чемпиона). */
function getPodiumSlots(topThree) {
  const byRank = Object.fromEntries(topThree.map((r) => [r.rank, r]))
  return [2, 1, 3].map((rank) => ({ row: byRank[rank] ?? null, rank }))
}

/**
 * @param {{
 *   slot: { row: object, rank: number },
 *   displayNameKey: string,
 *   categoryId: string,
 *   rawById?: Map<string, object>,
 *   publicMode: boolean,
 *   canOpenStudent: boolean,
 *   onOpenStudent?: (row: object) => void,
 *   rowPrimary: (row: object, large?: boolean) => JSX.Element,
 * }} props
 */
function PodiumSlot({
  slot,
  displayNameKey,
  categoryId,
  rawById,
  publicMode,
  canOpenStudent,
  onOpenStudent,
  rowPrimary,
}) {
  const { row, rank } = slot
  const isFirst = rank === 1
  const isSecond = rank === 2

  const stepHeight = isFirst ? 'h-10 sm:h-14' : isSecond ? 'h-6 sm:h-9' : 'h-4 sm:h-7'
  const stepColor = isFirst
    ? 'bg-gradient-to-t from-amber-500 to-amber-400'
    : isSecond
      ? 'bg-gradient-to-t from-slate-400 to-slate-300'
      : 'bg-gradient-to-t from-orange-500 to-orange-400'

  const cardShell = isFirst
    ? 'z-10 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-white ring-2 ring-amber-400/50'
    : isSecond
      ? 'mt-5 border-[#e7e8ec] bg-white sm:mt-8'
      : 'mt-7 border-orange-200 bg-white sm:mt-10'

  const inner = (
    <>
      {isFirst ? (
        <span className="mb-0.5 text-base leading-none sm:mb-1 sm:text-xl" aria-hidden>
          👑
        </span>
      ) : null}
      <RankBadge rank={rank} compact />
      <span
        className={`mt-1 line-clamp-2 w-full font-bold leading-tight text-[#2c2d2e] ${
          isFirst ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'
        }`}
      >
        {row[displayNameKey]}
      </span>
      <div className="mt-1 w-full">{rowPrimary(row, isFirst)}</div>
      {categoryId !== 'technical' ? (!isFirst ? (
        <div className="mt-1.5 w-full border-t border-[#e7e8ec] pt-1.5">
          <LeaderboardRowMetrics
            row={row}
            categoryId={categoryId}
            rawById={rawById}
            publicMode={publicMode}
            mobileStacked
          />
        </div>
      ) : (
        <div className="mt-2 w-full border-t border-amber-200/80 pt-2">
          <LeaderboardRowMetrics
            row={row}
            categoryId={categoryId}
            rawById={rawById}
            publicMode={publicMode}
            mobileStacked
          />
        </div>
      )) : null}
    </>
  )

  return (
    <li className="flex min-w-0 flex-1 flex-col">
      {canOpenStudent ? (
        <button
          type="button"
          onClick={() => onOpenStudent?.(row)}
          className={`flex flex-1 flex-col items-center rounded-t-xl border-x border-t px-1.5 pb-2 pt-2.5 text-center touch-manipulation active:opacity-95 sm:px-3 sm:pb-3 sm:pt-3.5 ${canOpenStudent ? 'sm:hover:brightness-[0.98]' : ''} ${cardShell}`}
        >
          {inner}
        </button>
      ) : (
        <div
          className={`flex flex-1 flex-col items-center rounded-t-xl border-x border-t px-1.5 pb-2 pt-2.5 text-center sm:px-3 sm:pb-3 sm:pt-3.5 ${cardShell}`}
        >
          {inner}
        </div>
      )}
      <div
        className={`${stepHeight} ${stepColor} w-full rounded-b-md shadow-inner`}
        aria-hidden
      />
    </li>
  )
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
  const topThree = rows.slice(0, 3)
  const rest = rows.slice(3)

  const rowPrimary = (row, large = false) => (
    <p
      className={`${vk.accent} ${large ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}
    >
      {row.primaryLabel}
      <span className={`ml-1 text-[10px] font-medium sm:text-xs ${vk.mutedXs}`}>
        {row.primarySuffix}
      </span>
    </p>
  )

  if (rows.length === 0) {
    return (
      <p className={vk.emptyState}>
        {showCheckboxes ? 'Выберите учеников для рейтинга.' : 'Нет данных для отображения.'}
      </p>
    )
  }

  return (
    <>
      {topThree.length > 0 && !showCheckboxes ? (
        <>
          <div>
            <p className={`mb-2 text-center ${vk.mutedXs} sm:mb-3`}>
              Пьедестал
            </p>
            <ol
              className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-1.5 sm:max-w-4xl sm:gap-4 md:max-w-5xl md:gap-6"
              aria-label="Топ-3"
            >
              {getPodiumSlots(topThree).map((slot) =>
                slot.row ? (
                  <PodiumSlot
                    key={slot.row.id ?? `${slot.rank}-${slot.row[displayNameKey]}`}
                    slot={slot}
                    displayNameKey={displayNameKey}
                    categoryId={categoryId}
                    rawById={rawById}
                    publicMode={publicMode}
                    canOpenStudent={canOpenStudent}
                    onOpenStudent={onOpenStudent}
                    rowPrimary={rowPrimary}
                  />
                ) : (
                  <li key={`empty-${slot.rank}`} className="min-h-[4rem] flex-1 sm:min-h-[5rem]" aria-hidden />
                ),
              )}
            </ol>
          </div>

        </>
      ) : null}

      <ol className="space-y-2" aria-label="Турнирная таблица">
        {(showCheckboxes ? rows : topThree.length > 0 ? rest : rows).map((row) => {
          const rowKey = row.id ?? `${row.rank}-${row[displayNameKey]}`
          const checked = row.id && curatedSet?.has(row.id)

          if (showCheckboxes) {
            return (
              <li key={rowKey}>
                <label className={`${vk.listRow} min-h-[3rem] cursor-pointer items-center gap-3`}>
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    onChange={() => onToggleStudent?.(row.id)}
                    className="h-5 w-5 shrink-0 rounded border-[#e7e8ec] text-[#2d81e0] focus:ring-[#2d81e0]"
                  />
                  <span className={`min-w-0 flex-1 ${vk.listItemTitle}`}>
                    {row[displayNameKey] ?? row.name}
                  </span>
                </label>
              </li>
            )
          }

          return (
            <li key={rowKey}>
              <button
                type="button"
                disabled={!canOpenStudent}
                onClick={() => onOpenStudent?.(row)}
                className={`${vk.listRow} flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${
                  canOpenStudent ? '' : 'cursor-default'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <RankBadge rank={row.rank} compact />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${vk.listItemTitle} sm:text-base`}>
                      {row[displayNameKey]}
                    </p>
                    <div className="mt-0.5 sm:hidden">{rowPrimary(row)}</div>
                  </div>
                </div>

                <div className="hidden sm:block sm:shrink-0">{rowPrimary(row)}</div>

                {categoryId !== 'technical' ? (
                  <div className="w-full border-t border-[#e7e8ec] pt-2 sm:w-auto sm:border-0 sm:pt-0 sm:shrink-0">
                    <LeaderboardRowMetrics
                      row={row}
                      categoryId={categoryId}
                      rawById={rawById}
                      publicMode={publicMode}
                      mobileStacked
                    />
                  </div>
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
