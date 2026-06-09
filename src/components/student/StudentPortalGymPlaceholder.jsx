import { vk } from '../../utils/vkUi.js'

/**
 * @param {{ title: string, body: string, onBack: () => void }} props
 */
export default function StudentPortalGymPlaceholder({ title, body, onBack }) {
  return (
    <section className={`${vk.cardPadded} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={vk.h2}>{title}</h2>
        <button type="button" onClick={onBack} className={vk.btnSecondary}>
          В зал
        </button>
      </div>
      <p className={`${vk.muted} text-[14px] leading-relaxed`}>{body}</p>
    </section>
  )
}
