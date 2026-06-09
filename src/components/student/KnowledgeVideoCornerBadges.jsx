import { KNOWLEDGE_VIDEO_BADGES } from '../../constants/studentPortalIllustrations.js'

/**
 * @param {string} slideKey
 */
export function resolveKnowledgeBadgeKeysForSlide(slideKey) {
  if (slideKey === 'visual') return ['vision']
  if (slideKey === 'visual-logic' || slideKey === 'detail') return ['vision', 'logic']
  return []
}

/** @param {'vision' | 'logic' | 'kinesthesia'} kind */
function KnowledgeBadgeIcon({ kind, className = '' }) {
  if (kind === 'vision') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <path
          d="M12 5c-5 0-8 4.2-8 7s3 7 8 7 8-4.2 8-7-3-7-8-7Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (kind === 'logic') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <path
          d="M8 5.5c0-1.2 1-2.2 2.2-2.2.8 0 1.5.4 1.9 1.1.4-.7 1.1-1.1 1.9-1.1 1.2 0 2.2 1 2.2 2.2 0 .9-.5 1.7-1.3 2.1.8.4 1.3 1.2 1.3 2.1 0 1.2-1 2.2-2.2 2.2-.8 0-1.5-.4-1.9-1.1-.4.7-1.1 1.1-1.9 1.1-1.2 0-2.2-1-2.2-2.2 0-.9.5-1.7 1.3-2.1-.8-.4-1.3-1.2-1.3-2.1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M9.5 14.5v4M14.5 14.5v4M8 18.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M7 11.5c0-2.8 2.2-5 5-5s5 2.2 5 5c0 1.6-.8 3-2 3.9V18H9v-2.6c-1.2-.9-2-2.3-2-3.9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 20h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Читаемые метки образов в углу ролика — иконка + короткая подпись.
 * @param {{ imageKeys: string[], className?: string }} props
 */
export default function KnowledgeVideoCornerBadges({ imageKeys, className = '' }) {
  const badges = imageKeys
    .map((key) => (KNOWLEDGE_VIDEO_BADGES[key] ? { key, ...KNOWLEDGE_VIDEO_BADGES[key] } : null))
    .filter(Boolean)

  if (badges.length === 0) return null

  return (
    <div
      className={`pointer-events-none absolute left-2 top-2 z-[5] flex max-w-[min(92%,14rem)] flex-col gap-1.5 sm:left-3 sm:top-3 ${className}`}
    >
      {badges.map((badge) => (
        <div
          key={badge.key}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-lg backdrop-blur-sm ${badge.chipClass}`}
          title={badge.title}
        >
          <KnowledgeBadgeIcon kind={badge.key} className={`h-6 w-6 shrink-0 ${badge.iconClass}`} />
          <span className="text-[12px] font-bold leading-none sm:text-[13px]">{badge.shortLabel}</span>
        </div>
      ))}
    </div>
  )
}
