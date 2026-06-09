import { KNOWLEDGE_IMAGE_ROW_ITEMS } from '../../constants/studentPortalIllustrations.js'

/**
 * Три образа «Знания» в один ряд — активные подсвечены, остальные приглушены.
 * @param {{ activeKeys?: string[], className?: string }} props
 */
export default function StudentKnowledgeImageRow({ activeKeys = [], className = '' }) {
  const activeSet = new Set(activeKeys)

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`} role="list" aria-label="Образы знания">
      {KNOWLEDGE_IMAGE_ROW_ITEMS.map((item) => {
        const active = activeSet.has(item.key)

        return (
          <div
            key={item.key}
            role="listitem"
            title={item.title}
            aria-label={item.title}
            aria-current={active ? 'step' : undefined}
            className={`relative overflow-hidden rounded-lg border transition-all duration-300 ${
              active
                ? `${item.activeSurface} ${item.activeBorder} shadow-sm ${item.activeGlow} brightness-100`
                : 'border-[#dfe3ea] bg-[#eceff3] opacity-30 saturate-0'
            }`}
          >
            {active ? (
              <span
                className={`absolute right-1.5 top-1.5 z-[2] h-2 w-2 rounded-full ${item.indicatorClass}`}
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
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1 pb-1 pt-4 text-center text-[9px] font-semibold leading-tight text-white sm:text-[10px] ${
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
