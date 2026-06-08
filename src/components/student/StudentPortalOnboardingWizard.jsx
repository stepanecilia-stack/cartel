import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KNOWLEDGE_THREE_IMAGES,
  ONBOARDING_STEP_ORDER,
  KNOWLEDGE_GUIDE_STEP_ORDER,
  normalizePortalTrainingGoals,
} from '../../constants/studentPortalOnboarding.js'
import { getPortalPersona, normalizePortalPersonaId } from '../../constants/studentPortalPersonas.js'
import { buildOnboardingStagesOpener } from '../../utils/onboardingStagesChat.js'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import StudentPersonaIntroFlow from './StudentPersonaIntroFlow.jsx'
import StudentReceptionMonologue from './StudentReceptionMonologue.jsx'
import StudentReceptionQuestionnaire from './StudentReceptionQuestionnaire.jsx'
import { vk } from '../../utils/vkUi.js'

const highlight = 'font-semibold text-[#2d81e0]'

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
 *   onComplete: (payload: { goals: string[], personaId: string }) => void | Promise<void>,
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
  const [greetingChatReady, setGreetingChatReady] = useState(false)
  const [readyForStages, setReadyForStages] = useState(false)
  const [stagesQuizPasses, setStagesQuizPasses] = useState(0)
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
      setGreetingChatReady(false)
      setReadyForStages(false)
    }
    if (stepId === 'path') {
      setStagesQuizPasses(0)
    }
  }, [stepId, personaId])

  const handleGreetingChatReady = useCallback(() => {
    setGreetingChatReady(true)
  }, [])

  const handleGreetingSignals = useCallback(({ readyForStages: ready }) => {
    if (ready) setReadyForStages(true)
  }, [])

  const handleStagesSignals = useCallback(({ quizPass }) => {
    if (quizPass) setStagesQuizPasses((n) => Math.min(2, n + 1))
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
              personaId={personaId}
              context="onboarding_greeting"
              trainingGoals={[...goals]}
              personaMemory={personaMemory}
              minUserMessages={1}
              disabled={busy || memoryBusy}
              onMinMessagesReached={handleGreetingChatReady}
              onTrainerSignals={handleGreetingSignals}
              advanceHint={
                readyForStages
                  ? null
                  : 'Поговорите с тренером — он подведёт вас к инструктажу про этапы навыка. Кнопка «Дальше» откроется, когда тренер даст добро.'
              }
            />
          ),
          action: 'К инструктажу',
          canAdvance: greetingChatReady && readyForStages,
        }
      case 'path':
        return {
          title: '',
          body: (
            <StudentPersonaChat
              ref={stagesChatRef}
              key={`stages-${personaId}`}
              personaId={personaId}
              context="onboarding_stages"
              openingTrainerText={buildOnboardingStagesOpener(getPortalPersona(personaId))}
              trainingGoals={[...goals]}
              personaMemory={personaMemory}
              minUserMessages={1}
              disabled={busy || memoryBusy}
              onTrainerSignals={handleStagesSignals}
              advanceHint={
                stagesQuizPasses >= 2
                  ? null
                  : `Ответьте на вопросы тренера в чате. Засчитано: ${stagesQuizPasses}/2. «Дальше» откроется после двух верных ответов.`
              }
            />
          ),
          action: 'Дальше',
          canAdvance: stagesQuizPasses >= 2,
        }
      case 'knowledge-what':
        return {
          title: 'Что такое «Знание»',
          body: (
            <p className={`${vk.muted} leading-snug`}>
              Технический элемент освоен на уровне «Знание», если сформированы три образа:{' '}
              <span className={highlight}>логический</span>, <span className={highlight}>зрительный</span> и{' '}
              <span className={highlight}>кинестетический</span>.
            </p>
          ),
          action: 'Дальше',
          canAdvance: true,
        }
      case 'logic':
        return {
          title: KNOWLEDGE_THREE_IMAGES[0].title,
          body: <p className={`${vk.muted} leading-snug`}>{KNOWLEDGE_THREE_IMAGES[0].text}</p>,
          action: 'Понял',
          canAdvance: true,
        }
      case 'vision':
        return {
          title: KNOWLEDGE_THREE_IMAGES[1].title,
          body: <p className={`${vk.muted} leading-snug`}>{KNOWLEDGE_THREE_IMAGES[1].text}</p>,
          action: 'Понял',
          canAdvance: true,
        }
      case 'kinesthesia':
        return {
          title: KNOWLEDGE_THREE_IMAGES[2].title,
          body: <p className={`${vk.muted} leading-snug`}>{KNOWLEDGE_THREE_IMAGES[2].text}</p>,
          action: 'Понял',
          canAdvance: true,
        }
      case 'knowledge-rule':
        return {
          title: 'Когда жать «Понял»',
          body: (
            <p className={`${vk.muted} leading-snug`}>
              Только когда есть все три образа — логический, зрительный и кинестетический. Иначе «Знание» ещё
              не сформировано.
            </p>
          ),
          action: 'К программе',
          canAdvance: true,
        }
      default:
        return { title: '', body: null, action: 'Дальше', canAdvance: true }
    }
  }, [stepId, goals, personaId, busy, memoryBusy, personaMemory, readyForStages, stagesQuizPasses, handlePersonaConfirmed, handleBack, handleGreetingChatReady, handleGreetingSignals, handleStagesSignals, greetingChatReady, toggleGoal])

  const handleAdvance = async () => {
    if (!content.canAdvance || busy || memoryBusy) return

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

  const progressBar = (
    <div className="flex items-center justify-between gap-2">
      <p className={`${vk.mutedXs} tabular-nums`}>
        {stepIndex + 1} / {steps.length}
      </p>
      <div className="flex gap-1">
        {steps.map((id, i) => (
          <span
            key={id}
            className={`h-1.5 w-1.5 rounded-full ${i <= stepIndex ? 'bg-[#2d81e0]' : 'bg-[#dce1e6]'}`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )

  const actions = (
    <div className={`flex gap-2 ${isImmersive ? 'pt-1' : ''}`}>
      {stepIndex > 0 ? (
        <button type="button" disabled={busy} onClick={handleBack} className={`flex-1 ${vk.btnSecondary}`}>
          Назад
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy || memoryBusy || !content.canAdvance}
        onClick={() => void handleAdvance()}
        className={`${stepIndex > 0 ? 'flex-1' : 'w-full'} ${vk.btnPrimary}`}
      >
        {busy || memoryBusy ? 'Сохранение…' : content.action}
      </button>
    </div>
  )

  if (isImmersive) {
    return (
      <div className="space-y-3">
        {progressBar}
        {content.body}
        {error ? <p className={vk.error}>{error}</p> : null}
        {content.hideActions ? null : actions}
      </div>
    )
  }

  return (
    <section className={`${vk.cardPadded} space-y-3`}>
      {progressBar}
      <div>
        {content.title ? <h2 className={vk.h2}>{content.title}</h2> : null}
        <div className={content.title ? 'mt-2' : ''}>{content.body}</div>
      </div>
      {error ? <p className={vk.error}>{error}</p> : null}
      {actions}
    </section>
  )
}
