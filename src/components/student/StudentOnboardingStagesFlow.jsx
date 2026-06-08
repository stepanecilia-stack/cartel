import { useCallback, useState } from 'react'
import {
  KNOWLEDGE_IMAGE_CARDS,
  MOTOR_SKILL_STAGES_ILLUSTRATION,
} from '../../constants/studentPortalIllustrations.js'
import { getPortalPersona } from '../../constants/studentPortalPersonas.js'
import {
  buildOnboardingStagesQuizOpener,
  buildStagesMatTrainerLine,
  stagesMatContinueLabel,
  STAGES_MAT_PHASE_ORDER,
} from '../../utils/onboardingStagesMat.js'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import { formatPortalPersonaName } from '../../constants/studentPortalPersonas.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   personaId?: unknown,
 *   trainingGoals?: unknown,
 *   personaMemory?: import('../../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   disabled?: boolean,
 *   onPhaseChange?: (phase: import('../../utils/onboardingStagesMat.js').StagesMatPhase) => void,
 *   onTrainerSignals?: (signals: { readyForStages: boolean, quizPass: boolean }) => void,
 *   chatRef?: import('react').RefObject<import('./StudentPersonaChat.jsx').default>,
 *   stagesQuizPasses?: number,
 * }} props
 */
export default function StudentOnboardingStagesFlow({
  personaId,
  trainingGoals = null,
  personaMemory = null,
  disabled = false,
  onPhaseChange,
  onTrainerSignals,
  chatRef,
  stagesQuizPasses = 0,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const [phase, setPhase] = useState(
    /** @type {import('../../utils/onboardingStagesMat.js').StagesMatPhase} */ ('four-stages'),
  )

  const phaseIndex = STAGES_MAT_PHASE_ORDER.indexOf(phase)
  const isQuiz = phase === 'quiz'

  const advanceMat = useCallback(() => {
    const next = STAGES_MAT_PHASE_ORDER[phaseIndex + 1]
    if (next) {
      setPhase(next)
      onPhaseChange?.(next)
    }
  }, [phaseIndex, onPhaseChange])

  if (isQuiz) {
    return (
      <StudentPersonaChat
        ref={chatRef}
        key={`stages-quiz-${persona.id}`}
        personaId={persona.id}
        context="onboarding_stages"
        openingTrainerText={buildOnboardingStagesQuizOpener(persona)}
        trainingGoals={trainingGoals}
        personaMemory={personaMemory}
        minUserMessages={1}
        disabled={disabled}
        onTrainerSignals={onTrainerSignals}
        advanceHint={
          stagesQuizPasses >= 4
            ? null
            : `Принято ${stagesQuizPasses} из 4: этап «Знание» + три образа. Ответь на все вопросы тренера — тогда загорится «Дальше».`
        }
      />
    )
  }

  const knowledgeCard =
    phase === 'logic'
      ? KNOWLEDGE_IMAGE_CARDS[0]
      : phase === 'vision'
        ? KNOWLEDGE_IMAGE_CARDS[1]
        : phase === 'kinesthesia'
          ? KNOWLEDGE_IMAGE_CARDS[2]
          : null

  const illustrationSrc = phase === 'four-stages' ? MOTOR_SKILL_STAGES_ILLUSTRATION : knowledgeCard?.imageSrc
  const illustrationAlt =
    phase === 'four-stages' ? 'Четыре этапа: Знание, Умение, Навык, Автоматизация' : knowledgeCard?.title

  return (
    <div className="space-y-2">
      <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-1.5`}>
        Шаг {phaseIndex + 1} из {STAGES_MAT_PHASE_ORDER.length}: матчасть
      </p>

      <div className="flex gap-2.5">
        <StudentPersonaAvatar personaId={persona.id} size="md" />
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
          <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
            {buildStagesMatTrainerLine(persona.id, phase)}
          </div>
        </div>
      </div>

      {illustrationSrc ? (
        <figure className="overflow-hidden rounded-xl border border-[#e7e8ec] bg-white">
          <img
            src={illustrationSrc}
            alt={illustrationAlt ?? ''}
            className="w-full object-contain"
            loading="eager"
            decoding="async"
          />
          {knowledgeCard ? (
            <figcaption className={`border-t border-[#e7e8ec] px-3 py-2 ${vk.mutedXs}`}>
              <span className="font-semibold text-slate-900">{knowledgeCard.title}.</span> {knowledgeCard.text}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={advanceMat}
        className={`w-full ${vk.btnAdvancePulse}`}
      >
        {stagesMatContinueLabel(phase)}
      </button>
    </div>
  )
}
