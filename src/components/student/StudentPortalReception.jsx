import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'
import { vk } from '../../utils/vkUi.js'

/**
 * Ресепшен: зал крупно, текст отдельно снизу (не перекрывает картинку).
 * @param {{ showSubtitle?: boolean, className?: string }} props
 */
export default function StudentPortalReception({ showSubtitle = true, className = '' }) {
  const { sceneSrc, adminName, adminTitle, welcomeTitle, welcomeSubtitle } = STUDENT_PORTAL_RECEPTION

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-white ${className}`}>
      <div className="relative aspect-[4/3] w-full bg-[#1a1f24] sm:aspect-[16/10]">
        <img
          src={sceneSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <div className="space-y-1.5 p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2d81e0] sm:text-[11px]">
          {adminTitle}
        </p>
        <h2 className="text-[15px] font-semibold leading-snug text-[#2c2d2e] sm:text-[16px]">{welcomeTitle}</h2>
        {showSubtitle ? (
          <p className={`${vk.muted} text-[13px] leading-snug sm:text-[14px]`}>{welcomeSubtitle}</p>
        ) : null}
        <p className={`${vk.mutedXs} pt-0.5`}>{adminName}</p>
      </div>
    </div>
  )
}
