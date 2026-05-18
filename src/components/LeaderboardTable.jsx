import LeaderboardMotorPreview from './LeaderboardMotorPreview.jsx'
import ShareLeaderboardMotorPreview from './ShareLeaderboardMotorPreview.jsx'

/** @param {{ rank: number, compact?: boolean }} props */
export function RankBadge({ rank, compact = false }) {
  const podium =
    rank === 1
      ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200'
      : rank === 2
        ? 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100'
        : rank === 3
          ? 'border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-200'
          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'

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
        stacked ? 'justify-start' : 'items-center justify-end sm:justify-end'
      }`}
    >
      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 sm:px-2">
        🥇 {medals.gold}
      </span>
      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:px-2">
        🥈 {medals.silver}
      </span>
      <span className="rounded-full bg-orange-50 px-1.5 py-0.5 font-medium text-orange-900 dark:bg-orange-950/40 dark:text-orange-200 sm:px-2">
        🥉 {medals.bronze}
      </span>
      {medals.red > 0 ? (
        <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 sm:px-2">
          зона роста {medals.red}
        </span>
      ) : null}
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
            <span className="text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">{row.secondary}</span>
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
          <span className="text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">{row.secondary}</span>
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
    <span className="text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">{row.secondary}</span>
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

  const stepHeight = isFirst ? 'h-10' : isSecond ? 'h-6' : 'h-4'
  const stepColor = isFirst
    ? 'bg-gradient-to-t from-amber-500 to-amber-400'
    : isSecond
      ? 'bg-gradient-to-t from-slate-400 to-slate-300'
      : 'bg-gradient-to-t from-orange-500 to-orange-400'

  const cardShell = isFirst
    ? 'z-10 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-white shadow-lg ring-2 ring-amber-400/70 dark:border-amber-600 dark:from-amber-950/50 dark:via-slate-900 dark:to-slate-900 dark:ring-amber-500/50'
    : isSecond
      ? 'mt-5 border-slate-300 bg-white shadow-sm dark:border-slate-500 dark:bg-slate-900'
      : 'mt-7 border-orange-200 bg-white shadow-sm dark:border-orange-700 dark:bg-slate-900'

  const inner = (
    <>
      {isFirst ? (
        <span className="mb-0.5 text-base leading-none" aria-hidden>
          👑
        </span>
      ) : null}
      <RankBadge rank={rank} compact />
      <span
        className={`mt-1 line-clamp-2 w-full font-bold leading-tight text-slate-900 dark:text-slate-100 ${
          isFirst ? 'text-xs' : 'text-[10px]'
        }`}
      >
        {row[displayNameKey]}
      </span>
      <div className="mt-1 w-full">{rowPrimary(row, isFirst)}</div>
      {categoryId !== 'technical' ? (!isFirst ? (
        <div className="mt-1.5 w-full border-t border-slate-100 pt-1.5 dark:border-slate-700">
          <LeaderboardRowMetrics
            row={row}
            categoryId={categoryId}
            rawById={rawById}
            publicMode={publicMode}
            mobileStacked
          />
        </div>
      ) : (
        <div className="mt-2 w-full border-t border-amber-200/80 pt-2 dark:border-amber-800/50">
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
          className={`flex flex-1 flex-col items-center rounded-t-xl border-x border-t px-1.5 pb-2 pt-2.5 text-center touch-manipulation active:opacity-95 sm:px-2 ${cardShell}`}
        >
          {inner}
        </button>
      ) : (
        <div
          className={`flex flex-1 flex-col items-center rounded-t-xl border-x border-t px-1.5 pb-2 pt-2.5 text-center sm:px-2 ${cardShell}`}
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
      className={`font-bold tabular-nums text-blue-700 dark:text-blue-400 ${
        large ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
      }`}
    >
      {row.primaryLabel}
      <span className="ml-1 text-[10px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">
        {row.primarySuffix}
      </span>
    </p>
  )

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:px-4 sm:py-8">
        {showCheckboxes ? 'Выберите учеников для рейтинга.' : 'Нет данных для отображения.'}
      </p>
    )
  }

  return (
    <>
      {topThree.length > 0 && !showCheckboxes ? (
        <>
          <div className="sm:hidden">
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Пьедестал
            </p>
            <ol className="grid grid-cols-3 items-end gap-1.5" aria-label="Топ-3">
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
                  <li key={`empty-${slot.rank}`} className="min-h-[4rem] flex-1" aria-hidden />
                ),
              )}
            </ol>
          </div>

          {/* Планшет и десктоп: сетка */}
          <ol className="hidden gap-3 sm:grid sm:grid-cols-3" aria-label="Топ-3">
            {topThree.map((row) => (
              <li key={`desktop-${row.id ?? row.rank}`}>
                <button
                  type="button"
                  disabled={!canOpenStudent}
                  onClick={() => onOpenStudent?.(row)}
                  className={`flex h-full w-full flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition dark:border-slate-600 dark:bg-slate-900 ${
                    canOpenStudent
                      ? 'hover:border-blue-300 hover:shadow-md dark:hover:border-blue-600'
                      : 'cursor-default'
                  }`}
                >
                  <RankBadge rank={row.rank} />
                  <span className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {row[displayNameKey]}
                  </span>
                  <div className="mt-2">{rowPrimary(row, true)}</div>
                  {categoryId !== 'technical' ? (
                    <div className="mt-2 w-full">
                      <LeaderboardRowMetrics
                        row={row}
                        categoryId={categoryId}
                        rawById={rawById}
                        publicMode={publicMode}
                      />
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <ol className="space-y-2" aria-label="Турнирная таблица">
        {(showCheckboxes ? rows : topThree.length > 0 ? rest : rows).map((row) => {
          const rowKey = row.id ?? `${row.rank}-${row[displayNameKey]}`
          const checked = row.id && curatedSet?.has(row.id)

          if (showCheckboxes) {
            return (
              <li key={rowKey}>
                <label className="flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm touch-manipulation active:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:active:bg-slate-800 sm:px-4">
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    onChange={() => onToggleStudent?.(row.id)}
                    className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
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
                className={`flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm touch-manipulation dark:border-slate-600 dark:bg-slate-900 sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${
                  canOpenStudent
                    ? 'active:border-blue-200 active:bg-slate-50/80 dark:active:border-blue-700 dark:active:bg-slate-800/80 sm:hover:border-blue-200 sm:hover:bg-slate-50/80'
                    : 'cursor-default'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <RankBadge rank={row.rank} compact />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-100">
                      {row[displayNameKey]}
                    </p>
                    <div className="mt-0.5 sm:hidden">{rowPrimary(row)}</div>
                  </div>
                </div>

                <div className="hidden sm:block sm:shrink-0">{rowPrimary(row)}</div>

                {categoryId !== 'technical' ? (
                  <div className="w-full border-t border-slate-100 pt-2 sm:w-auto sm:border-0 sm:pt-0 sm:shrink-0 dark:border-slate-700">
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
