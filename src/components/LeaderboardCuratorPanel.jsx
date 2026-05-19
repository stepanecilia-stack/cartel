import { vk } from '../utils/vkUi.js'

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
    <section className={`${vk.cardPadded} space-y-3`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className={vk.h2}>Состав рейтинга</h2>
          <p className={vk.mutedXs}>
            В рейтинге: {curatedCount} из {totalCount}
            {isLive ? (
              <span className="mt-0.5 inline-flex items-center gap-1 text-[#4bb34b] sm:ml-2 sm:mt-0">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4bb34b]" aria-hidden />
                онлайн
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleEditMode}
          className={`w-full sm:w-auto ${editMode ? vk.btnPrimary : vk.btnSecondary}`}
        >
          {editMode ? 'Готово' : 'Изменить состав'}
        </button>
      </div>

      {editMode ? (
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={onSelectAll} className={vk.btnSecondary}>
            Выбрать всех
          </button>
          <button type="button" onClick={onClearAll} className={vk.btnSecondary}>
            Снять всех
          </button>
        </div>
      ) : null}

      <div className="border-t border-[#e7e8ec] pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={vk.mutedXs}>Ссылка для родителей</h3>
            <p className={`mt-0.5 ${vk.mutedXs}`}>
              {shareUrl
                ? 'Нажмите на ссылку, чтобы скопировать. Обновляется автоматически.'
                : 'Создайте ссылку — в рейтинг попадут только выбранные спортсмены.'}
            </p>
          </div>
          <div className={`${vk.chipBar} shrink-0 justify-between sm:justify-center`}>
            <button
              type="button"
              disabled={shareBusy || curatedCount === 0}
              onClick={onShare}
              title={shareUrl ? 'Обновить публичную ссылку' : 'Поделиться рейтингом'}
              aria-label={shareUrl ? 'Обновить ссылку рейтинга' : 'Поделиться рейтингом'}
              className={`${vk.iconBtn} ${shareFlash && !shareUrl ? 'text-[#4bb34b]' : ''}`}
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
              <span className={vk.mutedXs}>Публикация…</span>
            ) : shareFlash && shareUrl ? (
              <span className="text-[12px] font-medium text-[#4bb34b]">Скопировано</span>
            ) : (
              <span className={`${vk.mutedXs} sm:hidden`}>Поделиться</span>
            )}
          </div>
        </div>

        {shareUrl ? (
          <button
            type="button"
            onClick={onCopyShareUrl}
            title="Нажмите, чтобы скопировать ссылку"
            aria-label="Скопировать ссылку рейтинга"
            className={`mt-3 w-full rounded-[10px] px-3 py-2.5 text-left text-[13px] leading-snug break-all touch-manipulation active:opacity-90 ${
              shareFlash ? 'bg-[#e8f7e8] text-[#4bb34b]' : vk.notice
            }`}
          >
            {shareUrl}
          </button>
        ) : null}

        {shareError ? <p className={`mt-2 ${vk.error}`}>{shareError}</p> : null}

        {shareUrl ? (
          <p className="mt-2 text-center">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block min-h-[2.5rem] py-2 ${vk.link}`}
            >
              Открыть рейтинг в новой вкладке
            </a>
          </p>
        ) : null}
      </div>
    </section>
  )
}
