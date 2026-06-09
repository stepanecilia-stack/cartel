import { KNOWLEDGE_IMAGE_CARDS } from '../../constants/studentPortalIllustrations.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{ imageKeys: string[], caption?: string, emphasized?: boolean }} props
 */
export function StudentTechniqueKnowledgeVisual({ imageKeys, caption, emphasized = true }) {
  const cards = imageKeys
    .map((key) => KNOWLEDGE_IMAGE_CARDS.find((c) => c.key === key))
    .filter(Boolean)

  if (cards.length === 0) return null

  return (
    <div className="space-y-2">
      {caption ? (
        <p className="text-center text-[12px] font-bold uppercase tracking-wide text-[#2d81e0]">{caption}</p>
      ) : null}
      <div className={`grid gap-2 ${cards.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {cards.map((card) => (
          <figure
            key={card.key}
            className={`overflow-hidden rounded-xl border bg-white ${
              emphasized ? `ring-2 ring-offset-2 ${card.ringClass}` : 'border-[#e7e8ec]'
            }`}
          >
            <img
              src={card.imageSrc}
              alt={card.title}
              className="w-full object-contain"
              loading="eager"
              decoding="async"
            />
            <figcaption className="border-t border-[#e7e8ec] px-3 py-2">
              <p className="text-[13px] font-semibold text-[#2c2d2e]">{card.title}</p>
              <p className={`mt-0.5 ${vk.mutedXs}`}>{card.text}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
