import { useState } from 'react'
import { isGymHubPremiumSection } from '../../constants/studentPortalPremium.js'
import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'
import StudentPortalPremiumPaywall from './StudentPortalPremiumPaywall.jsx'
/** @typedef {'technique' | 'norms' | 'program' | 'competition'} GymHubSectionId */

function HubLockIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-[#818c99]" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 7V5a4 4 0 1 1 8 0v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1Zm2 0h4V5a2 2 0 1 0-4 0v2Z" />
    </svg>
  )
}

function HubMicIcon() {
  return (
    <svg className="h-12 w-12 sm:h-14 sm:w-14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        fill="currentColor"
      />
      <path
        d="M6 11a6 6 0 0 0 12 0M12 17v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** @type {Array<{ id: GymHubSectionId, title: string, subtitle: string, premiumSubtitle: string }>} */
export const GYM_HUB_SECTIONS = [
  {
    id: 'technique',
    title: 'Техника бокса',
    subtitle: 'Элементы, видео и этап «Знание»',
    premiumSubtitle: '',
  },
  {
    id: 'norms',
    title: 'Нормативы',
    subtitle: 'Физические зачёты и прогресс',
    premiumSubtitle: '',
  },
  {
    id: 'program',
    title: 'Индивидуальная тренировочная программа',
    subtitle: 'Твой маршрут с наставником',
    premiumSubtitle: 'Платная версия кабинета',
  },
  {
    id: 'competition',
    title: 'Подготовка к соревнованиям',
    subtitle: 'План и календарь к старту',
    premiumSubtitle: 'Платная версия кабинета',
  },
]

/**
 * @param {{
 *   studentName: string,
 *   premiumActive?: boolean,
 *   onSelectSection: (id: GymHubSectionId) => void,
 *   onOpenGuide?: () => void,
 *   onLogout?: () => void,
 * }} props
 */
export default function StudentPortalGymHub({
  studentName,
  premiumActive = false,
  onSelectSection,
  onOpenGuide,
  onLogout,
}) {
  const [paywallSection, setPaywallSection] = useState(
    /** @type {import('../../constants/studentPortalPremium.js').PortalPremiumGymSectionId | null} */ (null),
  )
  const sceneSrc = STUDENT_PORTAL_RECEPTION.gymHubSrc

  return (
    <div className="relative min-h-[min(100dvh,920px)] overflow-hidden rounded-[12px] border border-[#e7e8ec] bg-[#1a1f24] shadow-sm">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src={sceneSrc}
          alt=""
          className="h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/25" />
      </div>

      <div className="relative z-10 flex min-h-[min(100dvh,920px)] flex-col p-3 sm:p-4">
        <header className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">Cartel Boxing</p>
            <h1 className="text-[18px] font-bold leading-tight text-white sm:text-[22px]">Зал</h1>
            <p className="mt-0.5 truncate text-[13px] text-white/90">{studentName}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            {onOpenGuide ? (
              <button
                type="button"
                onClick={onOpenGuide}
                className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
              >
                Как учить
              </button>
            ) : null}
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
              >
                Выйти
              </button>
            ) : null}
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-4">
          <button
            type="button"
            aria-label="Голосовой помощник (скоро)"
            className="flex h-28 w-28 items-center justify-center rounded-full border border-white/25 bg-[#2d81e0] text-white shadow-xl backdrop-blur-sm transition hover:bg-[#2875cc] active:scale-95 sm:h-32 sm:w-32"
          >
            <HubMicIcon />
          </button>
          <p className="mt-3 text-center text-[13px] font-medium text-white/90">Скажите запрос</p>
          <p className="mt-0.5 text-center text-[11px] text-white/70">Скоро · голосовой помощник</p>
        </div>

        <nav className="flex flex-col justify-end gap-2 pb-1 sm:gap-2.5" aria-label="Разделы зала">
          {GYM_HUB_SECTIONS.map((section) => {
            const locked = isGymHubPremiumSection(section.id) && !premiumActive
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  if (locked && isGymHubPremiumSection(section.id)) {
                    setPaywallSection(section.id)
                    return
                  }
                  onSelectSection(section.id)
                }}
                className={`group w-full rounded-[10px] border px-3.5 py-3 text-left shadow-lg backdrop-blur-md transition sm:px-4 sm:py-3.5 ${
                  locked
                    ? 'border-white/15 bg-white/75 hover:bg-white/80'
                    : 'border-white/20 bg-white/92 hover:border-[#2d81e0]/40 hover:bg-white'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`block text-[15px] font-bold leading-tight sm:text-[16px] ${
                      locked ? 'text-[#818c99]' : 'text-[#2c2d2e] group-hover:text-[#2d81e0]'
                    }`}
                  >
                    {section.title}
                  </span>
                  {locked ? <HubLockIcon /> : null}
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[#818c99] sm:text-[13px]">
                  {locked ? section.premiumSubtitle : section.subtitle}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {paywallSection ? (
        <StudentPortalPremiumPaywall sectionId={paywallSection} onClose={() => setPaywallSection(null)} />
      ) : null}
    </div>
  )
}
