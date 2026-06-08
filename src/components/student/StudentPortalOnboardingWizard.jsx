import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ONBOARDING_STEP_ORDER,
  KNOWLEDGE_GUIDE_STEP_ORDER,
  normalizePortalTrainingGoals,
} from '../../constants/studentPortalOnboarding.js'
import { getPortalPersona, normalizePortalPersonaId } from '../../constants/studentPortalPersonas.js'
import { buildOnboardingGreetingOpener, greetingIntakeHint } from '../../utils/onboardingGreetingChat.js'
import StudentOnboardingStagesFlow from './StudentOnboardingStagesFlow.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import StudentPersonaIntroFlow from './StudentPersonaIntroFlow.jsx'
import StudentReceptionMonologue from './StudentReceptionMonologue.jsx'
import StudentReceptionQuestionnaire from './StudentReceptionQuestionnaire.jsx'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   mode?: 'full' | 'guide',
 *   initialGoals?: string[] | null,
 *   initialPersonaId?: string | null,
 *   personaMemory?: import('../../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   onGreetingChatComplete?: (
 *     messages: import('../../services/portalPersonaAiService.js').PortalChatMessage[],
 *     context?: import('../../utils/portalPersonaAiPrompt.js').PortalPersonaChatContext,
 *   ) => void | Promise<void>,
 *   onComplete: (payload: { goals: string[], personaId: string, skipped?: boolean }) => void | Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function StudentPortalOnboardingWizard({
  mode = 'full',
  initialGoals = null,
  initialPersonaId = null,
  personaMemory = null,
  onGreetingChatComplete,
  onComplete,
  busy = false,
  error = '',
}) {
  const steps = mode === 'guide' ? KNOWLEDGE_GUIDE_STEP_ORDER : ONBOARDING_STEP_ORDER
  const [stepIndex, setStepIndex] = useState(0)
  const [goals, setGoals] = useState(() => new Set(normalizePortalTrainingGoals(initialGoals)))
  const [personaId, setPersonaId] = useState(() => normalizePortalPersonaId(initialPersonaId))
  const [readyForStages, setReadyForStages] = useState(false)
  /** @type {import('../../utils/onboardingGreetingChat.js').GreetingIntakeProgress | null} */
  const [greetingIntake, setGreetingIntake] = useState(null)
  const [stagesQuizPasses, setStagesQuizPasses] = useState(0)
  const [skipOffered, setSkipOffered] = useState(false)
  /** @type {import('../../utils/onboardingStagesMat.js').StagesMatPhase} */
  const [stagesFlowPhase, setStagesFlowPhase] = useState('four-stages')
  const [memoryBusy, setMemoryBusy] = useState(false)
  /** @type {import('react').RefObject<import('./StudentPersonaChat.jsx').default>} */
  const greetingChatRef = useRef(null)
  /** @type {import('react').RefObject<import('./StudentPersonaChat.jsx').default>} */
  const stagesChatRef = useRef(null)

  const stepId = steps[stepIndex] ?? steps[0]
  const isLast = stepIndex >= steps.length - 1
  const isWelcome = stepId === 'welcome'
  const isGoal = stepId === 'goal'
  const isPersona = stepId === 'persona'
  const isImmersive = isWelcome || isGoal || isPersona

  useEffect(() => {
    if (stepId === 'trainer-greeting') {
      setReadyForStages(false)
      setGreetingIntake(null)
      setSkipOffered(false)
    }
    if (stepId === 'path') {
      setStagesQuizPasses(0)
      setStagesFlowPhase('four-stages')
      setSkipOffered(false)
    }
  }, [stepId, personaId])

  const handleGreetingIntakeProgress = useCallback((progress) => {
    setGreetingIntake(progress)
  }, [])

  const handleGreetingSignals = useCallback(({ readyForStages: ready, onboardingSkip }) => {
    if (onboardingSkip) setSkipOffered(true)
    if (ready) setReadyForStages(true)
  }, [])

  const handleStagesSignals = useCallback(({ stagesQuizPassCount, quizPass, onboardingSkip }) => {
    if (onboardingSkip) setSkipOffered(true)
    if (typeof stagesQuizPassCount === 'number') {
      setStagesQuizPasses(Math.min(4, stagesQuizPassCount))
      return
    }
    if (quizPass) setStagesQuizPasses((n) => Math.min(4, n + 1))
  }, [])

  const toggleGoal = (id) => {
    setGoals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBack = useCallback(() => {
    if (busy || stepIndex === 0) return
    setStepIndex((i) => Math.max(0, i - 1))
  }, [busy, stepIndex])

  const handlePersonaConfirmed = useCallback(
    (id) => {
      setPersonaId(id)
      setStepIndex((i) => Math.min(i + 1, steps.length - 1))
    },
    [steps.length],
  )

  const content = useMemo(() => {
    switch (stepId) {
      case 'welcome':
        return {
          title: '',
          body: <StudentReceptionMonologue />,
          action: 'Заполнить анкету',
          canAdvance: true,
        }
      case 'goal':
        return {
          title: '',
          body: (
            <StudentReceptionQuestionnaire
              selectedGoals={goals}
              onToggleGoal={toggleGoal}
              disabled={busy}
            />
          ),
          action: 'Дальше',
          canAdvance: goals.size > 0,
        }
      case 'persona':
        return {
          title: '',
          hideActions: true,
          body: (
            <StudentPersonaIntroFlow
              selectedId={personaId}
              disabled={busy}
              onSelect={setPersonaId}
              onConfirm={handlePersonaConfirmed}
              onWizardBack={handleBack}
            />
          ),
          action: 'Дальше',
          canAdvance: Boolean(personaId),
        }
      case 'trainer-greeting':
        return {
          title: '',
          body: (
            <StudentPersonaChat
              ref={greetingChatRef}
              key={`greeting-${personaId}`}
              personaId={personaId}
              context="onboarding_greeting"
              openingTrainerText={buildOnboardingGreetingOpener(getPortalPersona(personaId), [...goals])}
              trainingGoals={[...goals]}
              personaMemory={personaMemory}
              minUserMessages={3}
              disabled={busy || memoryBusy}
              onIntakeProgress={handleGreetingIntakeProgress}
              onTrainerSignals={handleGreetingSignals}
              advanceHint={readyForStages ? null : greetingIntakeHint(greetingIntake ?? { goalsDone: false, sportDone: false, physicalDone: false, complete: false, step: 1 })}
            />
          ),
          action: skipOffered ? 'К тренировкам' : 'К инструктажу',
          canAdvance: skipOffered || readyForStages,
        }
      case 'path':
        return {
          title: '',
          body: (
            <StudentOnboardingStagesFlow
              key={`stages-${personaId}`}
              chatRef={stagesChatRef}
              personaId={personaId}
              trainingGoals={[...goals]}
              personaMemory={personaMemory}
              disabled={busy || memoryBusy}
              onPhaseChange={setStagesFlowPhase}
              onTrainerSignals={handleStagesSignals}
              stagesQuizPasses={stagesQuizPasses}
            />
          ),
          action: skipOffered ? 'К тренировкам' : 'К программе',
          canAdvance: skipOffered || (stagesFlowPhase === 'quiz' && stagesQuizPasses >= 4),
          hideAdvance: !skipOffered && stagesFlowPhase !== 'quiz',
        }
      default:
        return { title: '', body: null, action: 'Дальше', canAdvance: true }
    }
  }, [stepId, goals, personaId, busy, memoryBusy, personaMemory, readyForStages, greetingIntake, stagesQuizPasses, stagesFlowPhase, skipOffered, handlePersonaConfirmed, handleBack, handleGreetingIntakeProgress, handleGreetingSignals, handleStagesSignals, toggleGoal])

  const handleAdvance = async () => {
    if (!content.canAdvance || busy || memoryBusy) return

    if (skipOffered) {
      if (stepId === 'trainer-greeting' && onGreetingChatComplete && greetingChatRef.current) {
        const userCount = greetingChatRef.current.getUserMessageCount?.() ?? 0
        if (userCount > 0) {
          setMemoryBusy(true)
          try {
            await onGreetingChatComplete(greetingChatRef.current.getSessionMessages(), 'onboarding_greeting')
          } catch (e) {
            console.warn('[onboarding] greeting memory save failed (skip)', e)
          } finally {
            setMemoryBusy(false)
          }
        }
      } else if (stepId === 'path' && onGreetingChatComplete && stagesChatRef.current) {
        const userCount = stagesChatRef.current.getUserMessageCount?.() ?? 0
        if (userCount > 0) {
          setMemoryBusy(true)
          try {
            await onGreetingChatComplete(stagesChatRef.current.getSessionMessages(), 'onboarding_stages')
          } catch (e) {
            console.warn('[onboarding] stages memory save failed (skip)', e)
          } finally {
            setMemoryBusy(false)
          }
        }
      }
      void onComplete({ goals: [...goals], personaId, skipped: true })
      return
    }

    if (stepId === 'trainer-greeting' && onGreetingChatComplete && greetingChatRef.current) {
      const userCount = greetingChatRef.current.getUserMessageCount?.() ?? 0
      if (userCount > 0) {
        setMemoryBusy(true)
        try {
          await onGreetingChatComplete(greetingChatRef.current.getSessionMessages(), 'onboarding_greeting')
        } catch (e) {
          console.warn('[onboarding] greeting memory save failed', e)
        } finally {
          setMemoryBusy(false)
        }
      }
    }

    if (stepId === 'path' && onGreetingChatComplete && stagesChatRef.current) {
      const userCount = stagesChatRef.current.getUserMessageCount?.() ?? 0
      if (userCount > 0) {
        setMemoryBusy(true)
        try {
          await onGreetingChatComplete(stagesChatRef.current.getSessionMessages(), 'onboarding_stages')
        } catch (e) {
          console.warn('[onboarding] stages memory save failed', e)
        } finally {
          setMemoryBusy(false)
        }
      }
    }

    if (isLast) {
      void onComplete({ goals: [...goals], personaId })
      return
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  const isAdvanceReady = content.canAdvance && !busy && !memoryBusy
  const advanceWidth = stepIndex > 0 ? 'flex-1' : 'w-full'

  const actions = (
    <div className={`flex gap-2 ${isImmersive ? 'pt-0.5' : ''}`}>
      {stepIndex > 0 ? (
        <button type="button" disabled={busy} onClick={handleBack} className={`${isAdvanceReady ? '' : 'flex-1'} ${vk.btnSecondary}`}>
          Назад
        </button>
      ) : null}
      {content.hideAdvance || (stepId === 'trainer-greeting' && !content.canAdvance) ? null : (
        <button
          type="button"
          disabled={busy || memoryBusy || !content.canAdvance}
          onClick={() => void handleAdvance()}
          className={`${advanceWidth} ${isAdvanceReady ? vk.btnAdvancePulse : vk.btnPrimary}`}
        >
          {busy || memoryBusy ? 'Сохранение…' : content.action}
        </button>
      )}
    </div>
  )

  if (isImmersive) {
    return (
      <div className="space-y-2">
        {content.body}
        {error ? <p className={vk.error}>{error}</p> : null}
        {content.hideActions ? null : actions}
      </div>
    )
  }

  return (
    <section className={`${vk.cardPadded} space-y-2`}>
      <div>
        {content.title ? <h2 className={vk.h2}>{content.title}</h2> : null}
        <div className={content.title ? 'mt-2' : ''}>{content.body}</div>
      </div>
      {error ? <p className={vk.error}>{error}</p> : null}
      {actions}
    </section>
  )
}
