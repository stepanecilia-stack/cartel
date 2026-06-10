import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import CoachAssistantNormConfirmCard from './CoachAssistantNormConfirmCard.jsx'

import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'

import {
  prepareCoachAssistantContext,
  sendCoachAssistantMessage,
} from '../../services/coachAssistantService.js'

import { saveCoachAssistantNorm } from '../../services/coachAssistantNormSave.js'

import { parseCoachAssistantMarkers } from '../../utils/coachAssistantActions.js'
import { resolvePendingNormFromMessages } from '../../utils/coachAssistantNormPending.js'

import {
  loadCoachAssistantChatMessages,
  resetCoachAssistantChatMessages,
  trimCoachAssistantChatMessages,
  writeCoachAssistantChatHistory,
} from '../../utils/coachAssistantChatHistory.js'

import { buildCoachAssistantOpener } from '../../utils/coachAssistantPrompt.js'

import { isPortalPersonaAiRemoteEnabled } from '../../utils/portalPersonaAiConfig.js'

import { portalPersonaReplySourceLabel } from '../../utils/portalPersonaAiConfig.js'

import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   personaId: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   coachId: string,
 *   coachName?: string,
 *   students?: object[],
 *   focusStudent?: object | null,
 *   disabled?: boolean,
 *   onStudentPatched?: (studentId: string, patch: object) => void,
 * }} props
 */
export default function CoachAssistantChat({
  personaId,
  coachId,
  coachName = 'коллега',
  students = [],
  focusStudent = null,
  disabled = false,
  onStudentPatched = null,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const opener = useMemo(() => buildCoachAssistantOpener(persona.id, coachName), [persona.id, coachName])

  const [messages, setMessages] = useState(() => loadCoachAssistantChatMessages(coachId, persona.id, opener))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [replySource, setReplySource] = useState(null)
  const [pendingNorm, setPendingNorm] = useState(/** @type {Awaited<ReturnType<typeof resolvePendingNormFromMessages>>} */ (null))
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmSaved, setConfirmSaved] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const savedNormKeysRef = useRef(new Set())
  const bottomRef = useRef(null)

  const coachContextBase = useMemo(
    () => ({ coachName, students, focusStudent }),
    [coachName, students, focusStudent],
  )

  const persistMessages = useCallback(
    (next) => {
      const trimmed = trimCoachAssistantChatMessages(next)
      setMessages(trimmed)
      writeCoachAssistantChatHistory(coachId, persona.id, trimmed)
      return trimmed
    },
    [coachId, persona.id],
  )

  useEffect(() => {
    setMessages(loadCoachAssistantChatMessages(coachId, persona.id, opener))
    setError('')
    setReplySource(null)
    setInput('')
    setPendingNorm(null)
    setConfirmSaved(false)
    setConfirmError('')
    savedNormKeysRef.current = new Set()
  }, [coachId, persona.id, opener])

  useEffect(() => {
    if (busy || disabled) return undefined

    let cancelled = false
    ;(async () => {
      const pending = await resolvePendingNormFromMessages(messages, coachContextBase)
      if (cancelled) return
      if (!pending || savedNormKeysRef.current.has(pending.key)) {
        setPendingNorm(null)
        setConfirmSaved(false)
        setConfirmError('')
        return
      }
      setPendingNorm(pending)
      setConfirmSaved(false)
      setConfirmError('')
    })()

    return () => {
      cancelled = true
    }
  }, [messages, busy, disabled, coachContextBase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy, pendingNorm, confirmSaved])

  const runNormSave = useCallback(
    async (saveAction) => {
      const saved = await saveCoachAssistantNorm({
        studentId: saveAction.studentId,
        testId: saveAction.testId,
        resultRaw: saveAction.resultRaw,
        coachId,
      })
      onStudentPatched?.(saveAction.studentId, saved.payload)
      return `Записано в карточку: ${saved.studentName} — «${saved.normName}» ${saved.resultDisplay} (${saved.status}).`
    },
    [coachId, onStudentPatched],
  )

  const handleConfirmNorm = useCallback(async () => {
    if (!pendingNorm?.evaluation || confirmBusy || confirmSaved) return
    setConfirmBusy(true)
    setConfirmError('')
    try {
      const note = await runNormSave({
        studentId: String(pendingNorm.evaluation.student.id),
        testId: String(pendingNorm.evaluation.testId),
        resultRaw: pendingNorm.evaluation.resultRaw,
      })
      savedNormKeysRef.current.add(pendingNorm.key)
      setConfirmSaved(true)
      persistMessages([...messages, { role: 'assistant', content: note }])
      window.setTimeout(() => {
        setPendingNorm(null)
        setConfirmSaved(false)
      }, 1800)
    } catch (saveErr) {
      console.error(saveErr)
      setConfirmError(saveErr instanceof Error ? saveErr.message : 'Ошибка записи норматива')
    } finally {
      setConfirmBusy(false)
    }
  }, [pendingNorm, confirmBusy, confirmSaved, runNormSave, messages, persistMessages])

  const submitUserText = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || busy || disabled) return

      setError('')
      setInput('')
      setConfirmError('')

      const nextHistory = persistMessages([...messages, { role: 'user', content: trimmed }])
      setBusy(true)

      try {
        const conversationText = nextHistory
          .filter((m) => m.role === 'user')
          .map((m) => m.content ?? '')
          .join('\n')
        const coachContext = await prepareCoachAssistantContext(coachContextBase, trimmed, conversationText)

        const { reply: rawReply, source } = await sendCoachAssistantMessage({
          personaId: persona.id,
          messages: nextHistory,
          coachContext,
        })

        setReplySource(source)

        const { displayReply } = parseCoachAssistantMarkers(rawReply)
        persistMessages([...nextHistory, { role: 'assistant', content: displayReply || '…' }])
      } catch (e) {
        console.error(e)
        setError('Не удалось получить ответ. Попробуйте ещё раз.')
        const rolledBack = messages
        setMessages(rolledBack)
        writeCoachAssistantChatHistory(coachId, persona.id, rolledBack)
        setInput(trimmed)
      } finally {
        setBusy(false)
      }
    },
    [busy, disabled, messages, persona.id, coachContextBase, persistMessages, coachId],
  )

  const send = () => void submitUserText(input)

  const resetChat = useCallback(() => {
    if (busy || disabled) return
    const confirmed = window.confirm(
      `Сбросить переписку с ${name}? История этого помощника будет удалена, контекст начнётся заново.`,
    )
    if (!confirmed) return
    const fresh = resetCoachAssistantChatMessages(coachId, persona.id, opener)
    setMessages(fresh)
    setError('')
    setReplySource(null)
    setInput('')
    setPendingNorm(null)
    setConfirmSaved(false)
    setConfirmError('')
    savedNormKeysRef.current = new Set()
  }, [busy, disabled, coachId, persona.id, name, opener])

  const showConfirmCard = pendingNorm?.evaluation && !busy

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={resetChat}
          className={`${vk.btnSecondary} px-2.5 py-1 text-[12px]`}
        >
          Сбросить чат
        </button>
      </div>

      {!isPortalPersonaAiRemoteEnabled() ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          Скриптовый режим. Для полного агента задайте VITE_FIREBASE_* и VITE_PORTAL_PERSONA_AI.
        </p>
      ) : replySource === 'script-fallback' ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          {portalPersonaReplySourceLabel(replySource)}
        </p>
      ) : null}

      <div className="min-h-[min(320px,42dvh)] flex-1 space-y-2.5 overflow-y-auto rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-2.5">
        {messages.map((msg, index) =>
          msg.role === 'user' ? (
            <div key={`${index}-u`} className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-[#ecf3fc] px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={`${index}-a`} className="flex gap-2.5">
              <StudentPersonaAvatar personaId={persona.id} size="md" />
              <div className="min-w-0 max-w-[calc(100%-3rem)] rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e] whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ),
        )}

        {busy ? (
          <div className="flex gap-2.5">
            <StudentPersonaAvatar personaId={persona.id} size="md" />
            <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] text-[#818c99]">
              печатает…
            </div>
          </div>
        ) : null}

        {showConfirmCard ? (
          <CoachAssistantNormConfirmCard
            evaluation={pendingNorm.evaluation}
            busy={confirmBusy}
            saved={confirmSaved}
            error={confirmError}
            onConfirm={() => void handleConfirmNorm()}
          />
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className={`${vk.input} min-h-10 flex-1`}
          placeholder={`Спросите ${name}…`}
          value={input}
          disabled={disabled || busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          maxLength={500}
        />
        <button
          type="button"
          disabled={disabled || busy || !input.trim()}
          onClick={send}
          className={`shrink-0 ${vk.btnPrimary} px-3`}
        >
          →
        </button>
      </div>

      {error ? <p className={vk.error}>{error}</p> : null}
    </div>
  )
}
