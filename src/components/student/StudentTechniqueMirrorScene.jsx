import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'
import { STUDENT_TECHNIQUE_MEDIA_WIDTH_CLASS } from './StudentTechniqueVideoBlock.jsx'

/**
 * Зеркало в зале Cartel — шаг кинестетики.
 * @param {{ className?: string }} props
 */
export default function StudentTechniqueMirrorScene({ className = '' }) {
  return (
    <figure className={`overflow-hidden rounded-xl border border-white/20 shadow-lg ${STUDENT_TECHNIQUE_MEDIA_WIDTH_CLASS} ${className}`}>
      <img
        src={STUDENT_PORTAL_RECEPTION.gymMirrorSrc}
        alt=""
        className="aspect-[4/3] w-full object-cover"
        loading="eager"
        decoding="async"
      />
      <figcaption className="border-t border-white/10 bg-black/50 px-3 py-2 text-center text-[12px] leading-snug text-white/85 backdrop-blur-sm">
        Встань перед зеркалом и попробуй самостоятельно
      </figcaption>
    </figure>
  )
}
