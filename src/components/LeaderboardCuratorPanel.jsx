import { vk } from '../utils/vkUi.js'

function shortShareLabel(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    return `…${u.pathname.slice(-28)}`
  } catch {
    return url.length > 36 ? `…${url.slice(-32)}` : url
  }
}

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
    <section className={`${vk.cardPadded} py-2.5 sm:py-3`}>
      <div className="flex items-center gap-2">
        <p className={`min-w-0 flex-1 ${vk.mutedXs}`}>
          <span className="font-medium text-[#2c2d2e]">
            {curatedCount} из {totalCount}
          </span>
          {isLive ? (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[#4bb34b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4bb34b]" aria-hidden />
              онлайн
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onToggleEditMode}
          className={editMode ? vk.btnCompact : vk.btnCompactSecondary}
        >
          {editMode ? 'Готово' : 'Состав'}
        </button>
      </div>

      {editMode ? (
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <button type="button" onClick={onSelectAll} className={vk.btnCompactSecondary}>
            Все
          </button>
          <button type="button" onClick={onClearAll} className={vk.btnCompactSecondary}>
            Снять
          </button>
        </div>
      ) : null}

      {!editMode ? (
        <div className="mt-1.5 border-t border-[#e7e8ec] pt-1.5">
          {shareUrl ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onCopyShareUrl}
                title={shareUrl}
                aria-label="Скопировать ссылку для родителей"
                className={`min-h-8 min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-[12px] leading-4 text-[#2d81e0] touch-manipulation active:bg-[#f0f2f5] ${
                  shareFlash ? 'bg-[#e8f9ed]' : 'bg-[#f0f2f5]'
                }`}
              >
                {shareFlash ? 'Скопировано' : shortShareLabel(shareUrl)}
              </button>
              <button
                type="button"
                disabled={shareBusy || curatedCount === 0}
                onClick={onShare}
                title="Обновить публичную ссылку"
                aria-label="Обновить ссылку рейтинга"
                className={`${vk.iconBtn} shrink-0 ${shareBusy ? 'opacity-50' : ''}`}
              >
                <ShareIcon />
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Открыть в новой вкладке"
                aria-label="Открыть рейтинг в новой вкладке"
                className={`${vk.iconBtn} shrink-0 text-[#2d81e0]`}
              >
                <OpenIcon />
              </a>
            </div>
          ) : (
            <button
              type="button"
              disabled={shareBusy || curatedCount === 0}
              onClick={onShare}
              className={`${vk.btnSecondary} h-8 w-full text-[13px]`}
            >
              {shareBusy ? 'Создание…' : 'Ссылка для родителей'}
            </button>
          )}
          {shareError ? <p className={`mt-1 ${vk.error} py-1.5 text-[12px]`}>{shareError}</p> : null}
        </div>
      ) : null}
    </section>
  )
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
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
  )
}

function OpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  )
}
