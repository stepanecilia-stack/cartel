import { useEffect, useMemo, useRef, useState } from 'react'

import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import CoachAssistantNormConfirmCard from './CoachAssistantNormConfirmCard.jsx'

import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'

import { sendCoachAssistantMessage } from '../../services/coachAssistantService.js'
import { saveCoachAssistantNorm } from '../../services/coachAssistantNormSave.js'

import { formatCoachAssistantMessageForDisplay } from '../../utils/coachAssistantActions.js'
import { resolvePendingNormFromMessages } from '../../utils/coachAssistantNormPending.js'

import {
  loadCoachAssistantChatMessages,
  resetCoachAssistantChatMessages,
  trimCoachAssistantChatMessages,
  writeCoachAssistantChatHistory,
} from '../../utils/coachAssistantChatHistory.js'

import { buildCoachColleagueBriefFromMessages } from '../../utils/coachColleagueBrief.js'
import {
  clearCoachAssistantStudentThread,
  saveCoachAssistantStudentThread,
  subscribeCoachAssistantStudentThread,
} from '../../services/coachAssistantStudentThreadService.js'

import { buildCoachAssistantOpener } from '../../utils/coachAssistantPrompt.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   personaId: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   coachId: string,
 *   coachName?: string,
 *   students?: object[],
 *   focusStudent?: object | null,
 *   studentId?: string,
 *   persistToFirestore?: boolean,
 *   studentDisplayName?: string,
 *   allNorms?: object[],
 *   programAtoms?: { level1?: object[], level2?: object[], level3?: object[] },
 *   disabled?: boolean,
 *   disableStudentBridge?: boolean,
 *   onStudentPatched?: (studentId: string, patch: object) => void,
 *   onThreadChange?: (payload: {
 *     messages: Array<{ role: string, content: string }>,
 *     liveBrief: string,
 *     userMessageCount: number,
 *   }) => void,
 * }} props
 */
export default function CoachAssistantChat({
  personaId,
  coachId,
  coachName = 'коллега',
  students = [],
  focusStudent = null,
  studentId = '',
  persistToFirestore = false,
  studentDisplayName = '',
  allNorms = [],
  programAtoms = null,
  disabled = false,
  disableStudentBridge = false,
  onStudentPatched = null,
  onThreadChange = null,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const focusName =
    studentDisplayName ||
    String(focusStudent?.name ?? focusStudent?.fullName ?? '').trim()
  const opener = useMemo(
    () => buildCoachAssistantOpener(persona.id, coachName, focusName),
    [persona.id, coachName, focusName],
  )

  const [messages, setMessages] = useState(() =>
    persistToFirestore
      ? [{ role: 'assistant', content: opener }]
      : loadCoachAssistantChatMessages(coachId, persona.id, opener),
  )
  const [threadReady, setThreadReady] = useState(!persistToFirestore)
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
    () => ({
      coachName,
      students,
      focusStudent,
      allNorms,
      programAtoms,
      disableStudentBridge,
    }),
    [coachName, students, focusStudent, allNorms, programAtoms, disableStudentBridge],
  )

  const notifyThreadChange = (next) => {
    if (!onThreadChange) return
    const list = Array.isArray(next) ? next : []
    onThreadChange({
      messages: list,
      liveBrief: buildCoachColleagueBriefFromMessages(list),
      userMessageCount: list.filter((m) => m?.role === 'user').length,
    })
  }

  const persistLocal = (next) => {
    const trimmed = trimCoachAssistantChatMessages(next)
    setMessages(trimmed)
    writeCoachAssistantChatHistory(coachId, persona.id, trimmed)
    notifyThreadChange(trimmed)
    return trimmed
  }

  const persistFirestore = async (next) => {
    const trimmed = trimCoachAssistantChatMessages(next)
    setMessages(trimmed)
    notifyThreadChange(trimmed)
    if (!studentId || !coachId) return trimmed
    try {
      const memory = await saveCoachAssistantStudentThread({
        studentId,
        coachId,
        personaId: persona.id,
        messages: trimmed,
      })
      if (memory) {
        onStudentPatched?.(studentId, { portalPersonaMemory: memory })
      }
    } catch (err) {
      console.error('persistFirestore coach assistant', err)
    }
    return trimmed
  }

  const persist = (next) => {
    if (persistToFirestore) {
      void persistFirestore(next)
      return trimCoachAssistantChatMessages(next)
    }
    return persistLocal(next)
  }

  useEffect(() => {
    if (!persistToFirestore || !studentId || !coachId) {
      setThreadReady(true)
      if (!persistToFirestore) {
        setMessages(loadCoachAssistantChatMessages(coachId, persona.id, opener))
      }
      return undefined
    }

    setThreadReady(false)
    const unsub = subscribeCoachAssistantStudentThread(studentId, coachId, (thread) => {
      const next = thread?.messages?.length
        ? thread.messages
        : [{ role: 'assistant', content: opener }]
      setMessages(next)
      notifyThreadChange(next)
      setThreadReady(true)
    })

    return () => unsub()
  }, [coachId, studentId, persona.id, opener, persistToFirestore])

  useEffect(() => {
    if (persistToFirestore) return
    const loaded = loadCoachAssistantChatMessages(coachId, persona.id, opener)
    setMessages(loaded)
    notifyThreadChange(loaded)
    setInput('')
    setError('')
    setPendingNorm(null)
    setConfirmSaved(false)
    setConfirmError('')
    savedNormKeysRef.current = new Set()
    sendingRef.current = false
    setBusy(false)
  }, [coachId, persona.id, opener, persistToFirestore])

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
    if (disabled || sendingRef.current || (persistToFirestore && !threadReady)) return

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
      const { reply } = await sendCoachAssistantMessage({
        personaId: persona.id,
        messages: withUser,
        coachContext,
      })

      const withReply = persist([
        ...withUser,
        { role: 'assistant', content: reply || '…' },
      ])
      await refreshPendingNorm(withReply)
    } catch (err) {
      console.error(err)
      setError('Не удалось получить ответ. Попробуйте ещё раз.')
      setMessages(snapshot)
      if (!persistToFirestore) {
        writeCoachAssistantChatHistory(coachId, persona.id, snapshot)
      }
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
      `Сбросить переписку с ${name}? История будет удалена, контекст для кабинета ученика тоже очистится.`,
    )
    if (!confirmed) return
    if (persistToFirestore && studentId && coachId) {
      void clearCoachAssistantStudentThread(studentId, coachId).then((memory) => {
        if (memory) onStudentPatched?.(studentId, { portalPersonaMemory: memory })
      })
    } else {
      resetCoachAssistantChatMessages(coachId, persona.id, opener)
    }
    const fresh = [{ role: 'assistant', content: opener }]
    setMessages(fresh)
    notifyThreadChange(fresh)
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
          disabled={disabled || busy || (persistToFirestore && !threadReady)}
          onClick={resetChat}
          className={`${vk.btnSecondary} px-2.5 py-1 text-[12px]`}
        >
          Сбросить чат
        </button>
      </div>

      <div className="min-h-[min(320px,42dvh)] flex-1 space-y-2.5 overflow-y-auto rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-2.5">
        {persistToFirestore && !threadReady ? (
          <p className={`py-6 text-center ${vk.mutedXs}`}>Загрузка истории переписки…</p>
        ) : null}

        {(persistToFirestore ? threadReady : true)
          ? messages.map((msg, index) => {
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
                  <div className="min-w-0 max-w-[calc(100%-3rem)] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
                    {formatCoachAssistantMessageForDisplay(msg.content)}
                  </div>
                </div>
              )
            })
          : null}

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
          placeholder={`Спросите ${name} про КСР, нормативы, технику…`}
          value={input}
          disabled={disabled || busy || (persistToFirestore && !threadReady)}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={disabled || busy || (persistToFirestore && !threadReady)}
          className={`h-[52px] shrink-0 rounded-full px-4 ${vk.btnPrimary}`}
          aria-label="Отправить"
        >
          →
        </button>
      </form>
    </div>
  )
}
