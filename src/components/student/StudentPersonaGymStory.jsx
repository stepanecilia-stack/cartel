import { vk } from '../../utils/vkUi.js'
import StudentPersonaGymHero from './StudentPersonaGymHero.jsx'

/**
 * Тренер в зале Cartel: сцена + текст (биография, о тренере).
 * @param {{ persona: import('../../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number], heroOnly?: boolean }} props
 */
export default function StudentPersonaGymStory({ persona, heroOnly = false }) {
  const storyParagraphs = persona.aboutTrainer ?? persona.gymStory ?? []

  if (heroOnly) {
    return <StudentPersonaGymHero persona={persona} />
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-white">
      <StudentPersonaGymHero persona={persona} />

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
