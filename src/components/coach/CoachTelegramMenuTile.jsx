import TelegramLogoIcon from '../icons/TelegramLogoIcon.jsx'
import { useCoachTelegramLink } from '../../hooks/useCoachTelegramLink.js'

const tileClass =
  'flex min-h-[4.25rem] w-full touch-manipulation flex-col items-center justify-start gap-1 rounded-md px-0.5 py-1.5 text-center active:bg-[#f5f6f8] dark:active:bg-[#2c2d2e] sm:min-h-[4.5rem]'

/**
 * @param {{ coachId: string | undefined }} props
 */
export default function CoachTelegramMenuTile({ coachId }) {
  const { linked, busy, connect, botUrl } = useCoachTelegramLink(coachId)

  if (!coachId) return null

  const content = (
    <>
      <TelegramLogoIcon className="h-9 w-9" linked={linked} />
      <span className="line-clamp-2 text-[11px] font-medium leading-[13px] text-[#2c2d2e] dark:text-[#e1e3e6]">
        Telegram
      </span>
    </>
  )

  if (linked) {
    return (
      <a
        href={botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={tileClass}
        aria-label="Открыть Telegram-бот Cartel"
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void connect()}
      className={`${tileClass} disabled:opacity-60`}
      aria-label="Подключить Telegram-бот"
    >
      {content}
    </button>
  )
}
