import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import { buildPortalNormsStationCaption, STUDENT_PORTAL_NORMS } from '../../utils/studentPortalNorms.js'

/**
 * Зона сдачи нормативов — секундомер и блокнот; подпись от наставника.
 * @param {{ personaId: import('../../constants/studentPortalPersonas.js').PortalPersonaId | unknown, className?: string }} props
 */
export default function StudentNormsTrainerScene({ personaId, className = '' }) {
  const persona = getPortalPersona(personaId)
  const caption = buildPortalNormsStationCaption(personaId)

  return (
    <figure className={`overflow-hidden rounded-xl border border-white/25 shadow-lg ${className}`}>
      <img
        src={STUDENT_PORTAL_NORMS.stationSceneSrc}
        alt=""
        className="aspect-[16/10] w-full object-cover object-center"
        loading="eager"
        decoding="async"
      />
      <figcaption className="border-t border-white/15 bg-black/55 px-3 py-2.5 text-center backdrop-blur-sm">
        <p className="text-[12px] font-semibold text-white">{formatPortalPersonaName(persona)}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-white/85">{caption}</p>
      </figcaption>
    </figure>
  )
}
