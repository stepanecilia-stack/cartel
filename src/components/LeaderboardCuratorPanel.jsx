/**
 * @param {{
 *   editMode: boolean,
 *   onToggleEditMode: () => void,
 *   curatedCount: number,
 *   totalCount: number,
 *   onSelectAll: () => void,
 *   onClearAll: () => void,
 *   shareUrl: string,
 *   shareError?: string,
 *   shareBusy: boolean,
 *   shareFlash: boolean,
 *   isLive: boolean,
 *   onShare: () => void,
 *   onCopyShareUrl: () => void,
 * }} props
 */
export default function LeaderboardCuratorPanel({
  editMode,
  onToggleEditMode,
  curatedCount,
  totalCount,
  onSelectAll,
  onClearAll,
  shareUrl,
  shareError = '',
  shareBusy,
  shareFlash,
  isLive,
  onShare,
  onCopyShareUrl,
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Состав рейтинга</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            В рейтинге: {curatedCount} из {totalCount}
            {isLive ? (
              <span className="mt-0.5 inline-flex items-center gap-1 text-emerald-600 sm:ml-2 sm:mt-0 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                онлайн
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleEditMode}
          className={`w-full shrink-0 rounded-lg px-3 py-2.5 text-xs font-semibold touch-manipulation sm:w-auto sm:py-1.5 sm:text-sm ${
            editMode
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'border border-slate-200 bg-slate-50 text-slate-700 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {editMode ? 'Готово' : 'Изменить состав'}
        </button>
      </div>

      {editMode ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="min-h-[2.75rem] rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-700 touch-manipulation active:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:active:bg-slate-800"
          >
            Выбрать всех
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="min-h-[2.75rem] rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-700 touch-manipulation active:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:active:bg-slate-800"
          >
            Снять всех
          </button>
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-3 dark:border-slate-700">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs dark:text-slate-400">
              Ссылка для родителей
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600 sm:text-xs dark:text-slate-400">
              {shareUrl
                ? 'Нажмите на ссылку, чтобы скопировать. Обновляется автоматически.'
                : 'Создайте ссылку — в рейтинг попадут только выбранные спортсмены.'}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-600 dark:bg-slate-800 sm:shrink-0 sm:justify-center">
            <button
              type="button"
              disabled={shareBusy || curatedCount === 0}
              onClick={onShare}
              title={shareUrl ? 'Обновить публичную ссылку' : 'Поделиться рейтингом'}
              aria-label={shareUrl ? 'Обновить ссылку рейтинга' : 'Поделиться рейтингом'}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-900 sm:h-9 sm:w-9 ${
                shareFlash && !shareUrl
                  ? 'border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 text-slate-600 active:bg-slate-100 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
              </svg>
            </button>
            {shareBusy ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">Публикация…</span>
            ) : shareFlash && shareUrl ? (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Скопировано</span>
            ) : (
              <span className="text-[11px] text-slate-500 sm:hidden dark:text-slate-400">Поделиться</span>
            )}
          </div>
        </div>

        {shareUrl ? (
          <button
            type="button"
            onClick={onCopyShareUrl}
            title="Нажмите, чтобы скопировать ссылку"
            aria-label="Скопировать ссылку рейтинга"
            className={`mt-3 w-full rounded-lg border px-3 py-3 text-left text-[11px] leading-snug break-all touch-manipulation transition sm:py-2.5 sm:text-sm ${
              shareFlash
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {shareUrl}
          </button>
        ) : null}

        {shareError ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] leading-snug text-rose-800 sm:text-xs dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {shareError}
          </p>
        ) : null}

        {shareUrl ? (
          <p className="mt-2 text-center">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block min-h-[2.75rem] py-2 text-xs font-medium text-blue-600 touch-manipulation active:text-blue-800 dark:text-blue-400"
            >
              Открыть рейтинг в новой вкладке
            </a>
          </p>
        ) : null}
      </div>
    </section>
  )
}
