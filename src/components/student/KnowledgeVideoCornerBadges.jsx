import { KNOWLEDGE_VIDEO_BADGES } from '../../constants/studentPortalIllustrations.js'
import KnowledgeImageIcon from './KnowledgeImageIcon.jsx'

/**
 * @param {string} slideKey
 */
export function resolveKnowledgeBadgeKeysForSlide(slideKey) {
  if (slideKey === 'visual') return ['vision']
  if (slideKey === 'visual-logic' || slideKey === 'detail') return ['vision', 'logic']
  return []
}

/**
 * Иконки образов в углу ролика — только когда нет ряда сверху.
 * @param {{ imageKeys: string[], className?: string }} props
 */
export default function KnowledgeVideoCornerBadges({ imageKeys, className = '' }) {
  const badges = imageKeys
    .map((key) => (KNOWLEDGE_VIDEO_BADGES[key] ? { key, ...KNOWLEDGE_VIDEO_BADGES[key] } : null))
    .filter(Boolean)

  if (badges.length === 0) return null

  return (
    <div
      className={`pointer-events-none absolute left-1.5 top-1.5 z-[5] flex flex-col gap-1 sm:left-3 sm:top-3 sm:gap-1.5 ${className}`}
    >
      {badges.map((badge) => (
        <div
          key={badge.key}
          className={`flex items-center justify-center rounded-md border p-1 shadow-md backdrop-blur-sm sm:rounded-lg sm:p-1.5 sm:shadow-lg ${badge.chipClass}`}
          title={badge.title}
          aria-label={badge.title}
        >
          <KnowledgeImageIcon
            kind={badge.key}
            className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${badge.iconClass}`}
          />
        </div>
      ))}
    </div>
  )
}
