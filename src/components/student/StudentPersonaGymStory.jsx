import { formatPortalPersonaName } from '../../constants/studentPortalPersonas.js'
import { vk } from '../../utils/vkUi.js'

/**
 * Тренер в зале Cartel: сгенерированная сцена (тот же зал, другой ракурс).
 * @param {{ persona: import('../../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number] }} props
 */
export default function StudentPersonaGymStory({ persona }) {
  const name = formatPortalPersonaName(persona)
  const storyParagraphs = persona.aboutTrainer ?? persona.gymStory ?? []

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-white">
      <div className="relative aspect-[4/3] w-full bg-[#1a1f24] sm:aspect-[16/10]">
        <img
          src={persona.gymSceneSrc}
          alt={`${name} в зале Cartel`}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pb-3 pt-16 sm:px-4 sm:pb-4 sm:pt-20">
          <p className="text-[16px] font-bold leading-tight text-white drop-shadow sm:text-[18px]">{name}</p>
          <p className="mt-0.5 text-[12px] font-medium text-white/90 drop-shadow sm:text-[13px]">{persona.teachingManner}</p>
        </div>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        {persona.biography ? (
          <section>
            <h4 className="text-[13px] font-semibold uppercase tracking-wide text-[#2d81e0]">Биография</h4>
            <p className="mt-1.5 text-[14px] leading-snug text-[#2c2d2e] sm:text-[15px] sm:leading-relaxed">
              {persona.biography}
            </p>
          </section>
        ) : null}

        {storyParagraphs.length > 0 ? (
          <section>
            <h4 className="text-[13px] font-semibold uppercase tracking-wide text-[#2d81e0]">
              {persona.aboutTrainer ? 'О тренере' : 'В зале Cartel'}
            </h4>
            <div className="mt-1.5 space-y-2">
              {storyParagraphs.map((paragraph, index) => (
                <p key={index} className="text-[14px] leading-snug text-[#2c2d2e] sm:text-[15px] sm:leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        <p className={`${vk.muted} text-[13px] italic leading-snug`}>«{persona.sampleQuote}»</p>
      </div>
    </div>
  )
}
