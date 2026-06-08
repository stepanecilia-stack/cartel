import { formatPortalPersonaName } from '../../constants/studentPortalPersonas.js'

/**
 * Наставник в зале Cartel — сгенерированная сцена.
 * @param {{ persona: import('../../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number] }} props
 */
export default function StudentPersonaGymHero({ persona }) {
  const name = formatPortalPersonaName(persona)

  return (
    <div className="relative aspect-[4/3] max-h-[min(44vh,340px)] w-full bg-[#1a1f24] sm:aspect-[16/10]">
      <img
        src={persona.gymSceneSrc}
        alt={`${name} в зале Cartel`}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="eager"
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-3 pt-14 sm:px-4 sm:pb-4 sm:pt-16">
        <p className="text-[15px] font-bold leading-tight text-white drop-shadow sm:text-[17px]">{name}</p>
        <p className="mt-0.5 text-[11px] font-medium text-white/90 drop-shadow sm:text-[12px]">
          {persona.teachingManner.replace(/^Манера:\s*/i, '')}
        </p>
      </div>
    </div>
  )
}
