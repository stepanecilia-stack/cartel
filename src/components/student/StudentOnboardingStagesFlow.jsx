import { useCallback, useState } from 'react'
import { KNOWLEDGE_IMAGE_ROW_ITEMS } from '../../constants/studentPortalIllustrations.js'
import { getPortalPersona } from '../../constants/studentPortalPersonas.js'
import {
  buildOnboardingStagesQuizOpener,
  buildStagesMatTrainerLine,
  stagesMatContinueLabel,
  STAGES_MAT_PHASE_ORDER,
} from '../../utils/onboardingStagesMat.js'
import StudentMotorStagesHighlight from './StudentMotorStagesHighlight.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import StudentPortalTrainerBubble from './StudentPortalTrainerBubble.jsx'
import StudentTechniqueMirrorScene from './StudentTechniqueMirrorScene.jsx'
import { formatPortalPersonaName } from '../../constants/studentPortalPersonas.js'
import { vk } from '../../utils/vkUi.js'

/** @param {import('../../utils/onboardingStagesMat.js').StagesMatPhase} phase */
function knowledgeKeyForPhase(phase) {
  if (phase === 'logic' || phase === 'vision' || phase === 'kinesthesia') return phase
  return null
}

/** @param {'logic' | 'vision' | 'kinesthesia'} key */
function GuideKnowledgeFigure({ phaseKey }) {
  const item = KNOWLEDGE_IMAGE_ROW_ITEMS.find((entry) => entry.key === phaseKey)
  if (!item) return null

  return (
    <figure className="overflow-hidden rounded-xl border border-[#e7e8ec] bg-white">
      <img
        src={item.imageSrc}
        alt={item.title}
        className="w-full object-contain"
        loading="eager"
        decoding="async"
      />
      <figcaption className={`border-t border-[#e7e8ec] px-3 py-2 ${vk.mutedXs}`}>
        <span className="font-semibold text-slate-900">{item.title}.</span> {item.text}
      </figcaption>
    </figure>
  )
}

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
  const knowledgeKey = knowledgeKeyForPhase(phase)

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
            : `Принято ${stagesQuizPasses} из 4: этап «Знание» + три образа. Ответь на все вопросы ${name} — тогда загорится «Дальше».`
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-1.5`}>
        Шаг {phaseIndex + 1} из {STAGES_MAT_PHASE_ORDER.length}: {name} объясняет
      </p>

      <StudentPortalTrainerBubble personaId={persona.id}>
        {buildStagesMatTrainerLine(persona.id, phase)}
      </StudentPortalTrainerBubble>

      {phase === 'four-stages' ? <StudentMotorStagesHighlight /> : null}

      {knowledgeKey ? <GuideKnowledgeFigure phaseKey={knowledgeKey} /> : null}

      {phase === 'kinesthesia' ? <StudentTechniqueMirrorScene /> : null}

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
