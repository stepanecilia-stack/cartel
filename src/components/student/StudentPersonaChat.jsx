import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import { sendPortalPersonaChatMessage } from '../../services/portalPersonaAiService.js'
import { isPortalPersonaAiRemoteEnabled } from '../../utils/portalPersonaAiConfig.js'
import { portalPersonaReplySourceLabel } from '../../utils/portalPersonaAiConfig.js'
import { getGreetingIntakeProgress } from '../../utils/onboardingGreetingChat.js'
import { deriveStagesQuizPassesFromDialog } from '../../utils/onboardingStagesChat.js'
import { deriveProgramAtomQuizPasses } from '../../utils/programAtomChat.js'
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
 *     stagesQuizPassCount?: number,
 *   }) => void,
 *   onIntakeProgress?: (progress: import('../../utils/onboardingGreetingChat.js').GreetingIntakeProgress) => void,
 *   advanceHint?: string | null,
 *   studyAtom?: object | null,
 *   disabled?: boolean,
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
    inputRef = null,
  },
  ref,
) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const opener =
    openingTrainerText ??
    persona.phrases.greetingDialog?.find((line) => line.from === 'trainer')?.text ??
    `Привет. Я ${name} — твой наставник на платформе.`

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

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || busy || disabled) return

    setError('')
    setInput('')
    const nextHistory = [...messages, { role: 'user', content: text }]
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
      const { displayReply, readyForStages, quizPass } = parsePersonaChatMarkers(rawReply)
      const withTrainer = [...nextHistory, { role: 'assistant', content: displayReply }]
      if (context === 'onboarding_stages') {
        onTrainerSignals?.({
          readyForStages,
          quizPass,
          stagesQuizPassCount: deriveStagesQuizPassesFromDialog(withTrainer),
        })
      } else if (context === 'program_atom' && studyAtom) {
        onTrainerSignals?.({
          readyForStages,
          quizPass,
          stagesQuizPassCount: deriveProgramAtomQuizPasses(withTrainer, studyAtom),
        })
      } else {
        onTrainerSignals?.({ readyForStages, quizPass })
      }
      setMessages(withTrainer)
    } catch (e) {
      console.error(e)
      setError('Не удалось получить ответ. Попробуйте ещё раз.')
      setMessages((prev) => prev.slice(0, -1))
      setInput(text)
    } finally {
      setBusy(false)
    }
  }, [
    input,
    busy,
    disabled,
    messages,
    persona.id,
    context,
    programHint,
    personaMemory,
    trainingGoals,
    onTrainerSignals,
    studyAtom,
  ])

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
      ) : replySource && replySource !== 'ai' ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          {portalPersonaReplySourceLabel(replySource)}. Проверьте сеть или войдите в кабинет заново.
        </p>
      ) : null}

      {advanceHint ? (
        <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-1.5`}>{advanceHint}</p>
      ) : null}

      <div className="max-h-[min(360px,50vh)] space-y-2.5 overflow-y-auto rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-2.5 sm:p-3">
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
            <div key={`${index}-a`} className="flex gap-2.5">
              <StudentPersonaAvatar personaId={persona.id} size="md" />
              <div className="min-w-0 max-w-[calc(100%-3.5rem)]">
                {index === 0 ? (
                  <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
                ) : null}
                <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}

        {busy ? (
          <div className="flex gap-2.5">
            <StudentPersonaAvatar personaId={persona.id} size="md" />
            <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] text-[#818c99]">
              печатает…
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className={`${vk.input} min-h-10 flex-1`}
          placeholder="Напишите тренеру…"
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
