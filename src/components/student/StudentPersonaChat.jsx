import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import { sendPortalPersonaChatMessage } from '../../services/portalPersonaAiService.js'
import { isPortalPersonaAiRemoteEnabled } from '../../utils/portalPersonaAiConfig.js'
import { portalPersonaReplySourceLabel } from '../../utils/portalPersonaAiConfig.js'
import { getGreetingIntakeProgress } from '../../utils/onboardingGreetingChat.js'
import { deriveStagesQuizPassesFromDialog, stagesQuizQuestionIndex } from '../../utils/onboardingStagesChat.js'
import { deriveProgramAtomQuizPasses } from '../../utils/programAtomChat.js'
import {
  getOnboardingStagesTheoryQuestion,
  ONBOARDING_STAGES_THEORY_QUESTIONS,
} from '../../constants/onboardingTheoryQuiz.js'
import { parsePersonaChatMarkers } from '../../utils/personaChatMarkers.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @typedef {{
 *   getSessionMessages: () => import('../../services/portalPersonaAiService.js').PortalChatMessage[],
 *   getUserMessageCount: () => number,
 * }} StudentPersonaChatHandle
 */

/**
 * @param {{
 *   personaId?: unknown,
 *   context?: import('../../utils/portalPersonaAiPrompt.js').PortalPersonaChatContext,
 *   openingTrainerText?: string | null,
 *   programHint?: string | null,
 *   personaMemory?: import('../../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   minUserMessages?: number,
 *   onMinMessagesReached?: () => void,
 *   onTrainerSignals?: (signals: {
 *     readyForStages: boolean,
 *     quizPass: boolean,
 *     onboardingSkip?: boolean,
 *     stagesQuizPassCount?: number,
 *   }) => void,
 *   onIntakeProgress?: (progress: import('../../utils/onboardingGreetingChat.js').GreetingIntakeProgress) => void,
 *   advanceHint?: string | null,
 *   studyAtom?: object | null,
 *   disabled?: boolean,
 *   onGymScene?: boolean,
 *   inputRef?: import('react').RefObject<HTMLInputElement | null>,
 * }} props
 * @param {import('react').Ref<StudentPersonaChatHandle>} ref
 */
function StudentPersonaChat(
  {
    personaId,
    context = 'general',
    openingTrainerText = null,
    programHint = null,
    personaMemory = null,
    trainingGoals = null,
    minUserMessages = 1,
    onMinMessagesReached,
    onTrainerSignals,
    onIntakeProgress,
    advanceHint = null,
    studyAtom = null,
    disabled = false,
    onGymScene = false,
    inputRef = null,
  },
  ref,
) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const opener =
    openingTrainerText ??
    (context === 'program' || context === 'program_atom'
      ? persona.phrases.welcomeBack
      : context === 'onboarding_greeting' || context === 'onboarding_stages'
        ? null
        : persona.phrases.greetingDialog?.find((line) => line.from === 'trainer')?.text) ??
    (context === 'onboarding_greeting' || context === 'onboarding_stages'
      ? `Привет. Я ${name} — твой наставник на платформе.`
      : persona.phrases.welcomeBack)

  const [messages, setMessages] = useState(() => [{ role: 'assistant', content: opener }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  /** @type {import('../../utils/portalPersonaAiConfig.js').PortalPersonaReplySource | null} */
  const [replySource, setReplySource] = useState(null)
  const bottomRef = useRef(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const userCount = messages.filter((m) => m.role === 'user').length
  const minReachedRef = useRef(false)

  useImperativeHandle(ref, () => ({
    getSessionMessages: () =>
      messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    getUserMessageCount: () =>
      messagesRef.current.filter((m) => m.role === 'user' && m.content?.trim()).length,
  }))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  useEffect(() => {
    if (userCount >= minUserMessages && !minReachedRef.current) {
      minReachedRef.current = true
      onMinMessagesReached?.()
    }
  }, [userCount, minUserMessages, onMinMessagesReached])

  useEffect(() => {
    if (context === 'onboarding_greeting') {
      onIntakeProgress?.(getGreetingIntakeProgress(messages))
    }
  }, [messages, context, onIntakeProgress])

  useEffect(() => {
    if (!onTrainerSignals) return
    if (context === 'onboarding_stages') {
      onTrainerSignals({
        readyForStages: false,
        quizPass: false,
        stagesQuizPassCount: deriveStagesQuizPassesFromDialog(messages),
      })
      return
    }
    if (context === 'program_atom' && studyAtom) {
      onTrainerSignals({
        readyForStages: false,
        quizPass: false,
        stagesQuizPassCount: deriveProgramAtomQuizPasses(messages, studyAtom),
      })
    }
  }, [messages, context, onTrainerSignals, studyAtom])

  const stagesQuizIndex =
    context === 'onboarding_stages' ? stagesQuizQuestionIndex(messages) : ONBOARDING_STAGES_THEORY_QUESTIONS.length
  const stagesQuizComplete = stagesQuizIndex >= ONBOARDING_STAGES_THEORY_QUESTIONS.length
  const currentTheoryQuestion =
    context === 'onboarding_stages' && !stagesQuizComplete
      ? getOnboardingStagesTheoryQuestion(stagesQuizIndex)
      : null
  const showTheoryChoices = Boolean(currentTheoryQuestion) && !busy

  const submitUserText = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || busy || disabled) return

      setError('')
      setInput('')
      const nextHistory = [...messages, { role: 'user', content: trimmed }]
      setMessages(nextHistory)
      setBusy(true)

      try {
        const { reply: rawReply, source } = await sendPortalPersonaChatMessage({
          personaId: persona.id,
          messages: nextHistory,
          context,
          programHint,
          personaMemory,
          trainingGoals,
          studyAtom,
        })
        setReplySource(source)
        const { displayReply, readyForStages, quizPass, onboardingSkip } = parsePersonaChatMarkers(rawReply)
        const withTrainer = [...nextHistory, { role: 'assistant', content: displayReply }]
        if (context === 'onboarding_stages') {
          onTrainerSignals?.({
            readyForStages,
            quizPass,
            onboardingSkip,
            stagesQuizPassCount: deriveStagesQuizPassesFromDialog(withTrainer),
          })
        } else if (context === 'program_atom' && studyAtom) {
          onTrainerSignals?.({
            readyForStages,
            quizPass,
            onboardingSkip,
            stagesQuizPassCount: deriveProgramAtomQuizPasses(withTrainer, studyAtom),
          })
        } else {
          onTrainerSignals?.({ readyForStages, quizPass, onboardingSkip })
        }
        setMessages(withTrainer)
      } catch (e) {
        console.error(e)
        setError('Не удалось получить ответ. Попробуйте ещё раз.')
        setMessages((prev) => prev.slice(0, -1))
        setInput(trimmed)
      } finally {
        setBusy(false)
      }
    },
    [
      busy,
      disabled,
      messages,
      persona.id,
      context,
      programHint,
      personaMemory,
      trainingGoals,
      studyAtom,
      onTrainerSignals,
    ],
  )

  const send = useCallback(async () => {
    await submitUserText(input)
  }, [input, submitUserText])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="space-y-2">
      {!isPortalPersonaAiRemoteEnabled() ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          {import.meta.env.DEV
            ? 'Скрипты: задайте VITE_FIREBASE_* в .env.local (VITE_PORTAL_PERSONA_AI=0 — принудительно выкл.).'
            : 'Скрипты: в сборке нет Firebase-конфига. Добавьте VITE_FIREBASE_* на Vercel и пересоберите.'}
        </p>
      ) : replySource === 'script-fallback' ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          {portalPersonaReplySourceLabel(replySource)}. Проверьте сеть или войдите в кабинет заново.
        </p>
      ) : replySource === 'script' && !isPortalPersonaAiRemoteEnabled() ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          {portalPersonaReplySourceLabel(replySource)}
        </p>
      ) : null}

      {advanceHint ? (
        <p
          className={`${vk.mutedXs} rounded-lg px-2.5 py-1.5 ${
            onGymScene ? 'border border-white/70 bg-white/90 backdrop-blur-sm' : 'bg-[#fafbfc]'
          }`}
        >
          {advanceHint}
        </p>
      ) : null}

      <div
        className={`max-h-[min(360px,50vh)] space-y-2.5 overflow-y-auto rounded-lg border p-2.5 sm:p-3 ${
          onGymScene
            ? 'max-h-[min(280px,38vh)] border-white/70 bg-white/90 shadow-sm backdrop-blur-md'
            : 'border-[#e7e8ec] bg-[#fafbfc]'
        }`}
      >
        {messages.map((msg, index) => {
          if (msg.role === 'user') {
            return (
              <div key={`${index}-u`} className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-[#ecf3fc] px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
                  {msg.content}
                </div>
              </div>
            )
          }

          return (
            <div key={`${index}-a`} className={`flex gap-2.5 ${onGymScene ? 'justify-start' : ''}`}>
              {onGymScene ? null : <StudentPersonaAvatar personaId={persona.id} size="md" />}
              <div className={`min-w-0 ${onGymScene ? 'max-w-[92%]' : 'max-w-[calc(100%-3.5rem)]'}`}>
                {!onGymScene && index === 0 ? (
                  <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
                ) : null}
                <div
                  className={`rounded-2xl rounded-tl-md border px-3 py-2 text-[14px] leading-snug text-[#2c2d2e] ${
                    onGymScene ? 'border-white/80 bg-white/95 shadow-sm' : 'border-[#e7e8ec] bg-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}

        {busy ? (
          <div className="flex gap-2.5">
            {onGymScene ? null : <StudentPersonaAvatar personaId={persona.id} size="md" />}
            <div
              className={`rounded-2xl rounded-tl-md border px-3 py-2 text-[14px] text-[#818c99] ${
                onGymScene ? 'border-white/80 bg-white/95' : 'border-[#e7e8ec] bg-white'
              }`}
            >
              печатает…
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {showTheoryChoices && currentTheoryQuestion ? (
        <div className="space-y-1.5">
          <p className={`${vk.mutedXs} px-0.5`}>Можно выбрать вариант или написать своими словами:</p>
          {currentTheoryQuestion.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled || busy}
              onClick={() => void submitUserText(option.label)}
              className={`w-full touch-manipulation rounded-xl border border-[#e7e8ec] bg-white px-3 py-2.5 text-left text-[14px] leading-snug text-[#2c2d2e] transition-colors hover:border-[#2d81e0] hover:bg-[#ecf3fc] active:bg-[#e3eef9] disabled:opacity-50`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className={`${vk.input} min-h-10 flex-1`}
          placeholder={
            currentTheoryQuestion && !stagesQuizComplete
              ? 'Или напишите ответ своими словами…'
              : 'Напишите тренеру…'
          }
          value={input}
          disabled={disabled || busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={400}
        />
        <button
          type="button"
          disabled={disabled || busy || !input.trim()}
          onClick={() => void send()}
          className={`shrink-0 ${vk.btnPrimary} px-3`}
        >
          →
        </button>
      </div>

      {error ? <p className={vk.error}>{error}</p> : null}
    </div>
  )
}

export default forwardRef(StudentPersonaChat)
