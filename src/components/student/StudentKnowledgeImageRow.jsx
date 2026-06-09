import { KNOWLEDGE_IMAGE_ROW_ITEMS } from '../../constants/studentPortalIllustrations.js'
import { STUDENT_TECHNIQUE_MEDIA_WIDTH_CLASS } from './StudentTechniqueVideoBlock.jsx'

/**
 * Три образа «Знания» в один ряд — активные подсвечены, остальные приглушены.
 * @param {{ activeKeys?: string[], className?: string }} props
 */
export default function StudentKnowledgeImageRow({ activeKeys = [], className = '' }) {
  const activeSet = new Set(activeKeys)

  return (
    <div
      className={`grid grid-cols-3 gap-1 ${STUDENT_TECHNIQUE_MEDIA_WIDTH_CLASS} ${className}`}
      role="list"
      aria-label="Образы знания"
    >
      {KNOWLEDGE_IMAGE_ROW_ITEMS.map((item) => {
        const active = activeSet.has(item.key)

        return (
          <div
            key={item.key}
            role="listitem"
            title={item.title}
            aria-label={item.title}
            aria-current={active ? 'step' : undefined}
            className={`relative overflow-hidden rounded-md border transition-all duration-300 ${
              active
                ? `${item.activeSurface} ${item.activeBorder} shadow-sm ${item.activeGlow} brightness-100`
                : 'border-[#dfe3ea] bg-[#eceff3] opacity-30 saturate-0'
            }`}
          >
            {active ? (
              <span
                className={`absolute right-1 top-1 z-[2] h-1.5 w-1.5 rounded-full ${item.indicatorClass}`}
                aria-hidden
              />
            ) : null}
            <img
              src={item.imageSrc}
              alt=""
              className="aspect-square w-full object-cover"
              loading="eager"
              decoding="async"
            />
            <span
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-0.5 pb-0.5 pt-2 text-center text-[7px] font-semibold leading-none text-white sm:text-[8px] ${
                active ? '' : 'opacity-80'
              }`}
            >
              {item.shortLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
