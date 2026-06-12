import TelegramLogoIcon from '../icons/TelegramLogoIcon.jsx'
import { useCoachTelegramLink } from '../../hooks/useCoachTelegramLink.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{ coachId: string | undefined, className?: string }} props
 */
export default function CoachTelegramNavButton({ coachId, className = '' }) {
  const { linked, busy, connect, botUrl } = useCoachTelegramLink(coachId)

  if (!coachId) return null

  const baseClass = `inline-flex shrink-0 touch-manipulation items-center gap-1 text-[13px] font-medium ${className}`

  if (linked) {
    return (
      <a
        href={botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClass} ${vk.linkNav}`}
      >
        <TelegramLogoIcon className="h-4 w-4" linked />
        Telegram
      </a>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void connect()}
      className={`${baseClass} text-[#5181b8] hover:underline disabled:opacity-60`}
    >
      <TelegramLogoIcon className="h-4 w-4" />
      Telegram
    </button>
  )
}
