import { useEffect, useMemo, useRef, useState } from 'react'

import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import CoachAssistantNormConfirmCard from './CoachAssistantNormConfirmCard.jsx'

import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'

import { sendCoachAssistantMessage } from '../../services/coachAssistantService.js'
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
  const [pendingNorm, setPendingNorm] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmSaved, setConfirmSaved] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const bottomRef = useRef(null)
  const sendingRef = useRef(false)
  const savedNormKeysRef = useRef(new Set())

  const coachContext = useMemo(
    () => ({ coachName, students, focusStudent }),
    [coachName, students, focusStudent],
  )

  const persist = (next) => {
    const trimmed = trimCoachAssistantChatMessages(next)
    setMessages(trimmed)
    writeCoachAssistantChatHistory(coachId, persona.id, trimmed)
    return trimmed
  }

  useEffect(() => {
    setMessages(loadCoachAssistantChatMessages(coachId, persona.id, opener))
    setInput('')
    setError('')
    setPendingNorm(null)
    setConfirmSaved(false)
    setConfirmError('')
    savedNormKeysRef.current = new Set()
    sendingRef.current = false
    setBusy(false)
  }, [coachId, persona.id, opener])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, pendingNorm, confirmSaved])

  const refreshPendingNorm = async (history) => {
    try {
      const pending = await resolvePendingNormFromMessages(history, coachContext)
      if (!pending || savedNormKeysRef.current.has(pending.key)) {
        setPendingNorm(null)
        return
      }
      setPendingNorm(pending)
      setConfirmSaved(false)
      setConfirmError('')
    } catch {
      setPendingNorm(null)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (disabled || sendingRef.current) return

    const text = String(inputRef.current?.value ?? input).trim()
    if (!text) return

    sendingRef.current = true
    setBusy(true)
    setError('')
    setInput('')
    if (inputRef.current) inputRef.current.value = ''

    const snapshot = messages
    const userMessage = { role: 'user', content: text }
    const withUser = persist([...snapshot, userMessage])

    try {
      const { reply: rawReply } = await sendCoachAssistantMessage({
        personaId: persona.id,
        messages: withUser,
        coachContext,
      })

      const { displayReply } = parseCoachAssistantMarkers(rawReply)
      const withReply = persist([
        ...withUser,
        { role: 'assistant', content: displayReply || '…' },
      ])
      await refreshPendingNorm(withReply)
    } catch (err) {
      console.error(err)
      setError('Не удалось получить ответ. Попробуйте ещё раз.')
      setMessages(snapshot)
      writeCoachAssistantChatHistory(coachId, persona.id, snapshot)
      setInput(text)
      if (inputRef.current) inputRef.current.value = text
    } finally {
      sendingRef.current = false
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const handleConfirmNorm = async () => {
    if (!pendingNorm?.evaluation || confirmBusy || confirmSaved) return
    setConfirmBusy(true)
    setConfirmError('')
    try {
      const saved = await saveCoachAssistantNorm({
        studentId: String(pendingNorm.evaluation.student.id),
        testId: String(pendingNorm.evaluation.testId),
        resultRaw: pendingNorm.evaluation.resultRaw,
        coachId,
      })
      onStudentPatched?.(pendingNorm.evaluation.student.id, saved.payload)
      savedNormKeysRef.current.add(pendingNorm.key)
      setConfirmSaved(true)
      persist([
        ...messages,
        {
          role: 'assistant',
          content: `Записано в карточку: ${saved.studentName} — «${saved.normName}» ${saved.resultDisplay} (${saved.status}).`,
        },
      ])
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
  }

  const resetChat = () => {
    if (busy || disabled) return
    const confirmed = window.confirm(
      `Сбросить переписку с ${name}? История этого помощника будет удалена, контекст начнётся заново.`,
    )
    if (!confirmed) return
    const fresh = resetCoachAssistantChatMessages(coachId, persona.id, opener)
    setMessages(fresh)
    setInput('')
    setError('')
    setPendingNorm(null)
    setConfirmSaved(false)
    setConfirmError('')
    savedNormKeysRef.current = new Set()
    if (inputRef.current) inputRef.current.value = ''
  }

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
              <div className="min-w-0 max-w-[calc(100%-3rem)] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
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

        {pendingNorm?.evaluation && !busy ? (
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

      {error ? <p className={vk.error}>{error}</p> : null}

      <form className="flex min-w-0 gap-2" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          name="message"
          autoComplete="off"
          enterKeyHint="send"
          className={`${vk.input} min-h-[52px] flex-1 rounded-full`}
          placeholder={`Спросите ${name}…`}
          value={input}
          disabled={disabled || busy}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={disabled || busy}
          className={`h-[52px] shrink-0 rounded-full px-4 ${vk.btnPrimary}`}
          aria-label="Отправить"
        >
          →
        </button>
      </form>
    </div>
  )
}
