import { gymHubPremiumSectionTitle } from '../../constants/studentPortalPremium.js'
import { vk } from '../../utils/vkUi.js'

function LockIcon() {
  return (
    <svg className="h-8 w-8 text-[#818c99]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 10V8a4 4 0 1 1 8 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h4V8a2 2 0 1 0-4 0v2Z" />
    </svg>
  )
}

/**
 * @param {{
 *   sectionId: import('../../constants/studentPortalPremium.js').PortalPremiumGymSectionId,
 *   onClose: () => void,
 * }} props
 */
export default function StudentPortalPremiumPaywall({ sectionId, onClose }) {
  const title = gymHubPremiumSectionTitle(sectionId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-paywall-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[12px] border border-[#e7e8ec] bg-white p-4 shadow-xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f0f2f5]">
            <LockIcon />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="premium-paywall-title" className={vk.h2}>
              Раздел закрыт
            </h2>
            <p className="mt-1 text-[14px] font-semibold text-[#2c2d2e]">{title}</p>
          </div>
        </div>
        <p className={`mt-3 ${vk.muted} text-[14px] leading-relaxed`}>
          Этот раздел доступен в платной версии учебного кабинета. Подключи платный доступ у тренера в
          академии Cartel — откроется персональная программа и подготовка к соревнованиям.
        </p>
        <button type="button" onClick={onClose} className={`mt-4 w-full ${vk.btnPrimary}`}>
          Понятно
        </button>
      </div>
    </div>
  )
}
