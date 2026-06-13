import { useEffect, useMemo, useRef, useState } from 'react'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentWeekSchedulePicker from './StudentWeekSchedulePicker.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import {
  markCoachBridgeReadByStudent,
  sendStudentBridgeReply,
  sendStudentBridgeScheduleReply,
  subscribeCoachBridgeThread,
} from '../../services/coachBridgeService.js'
import { countStudentUnreadFromPersona } from '../../utils/coachBridgeModel.js'
import { deriveCoachBridgeStatus } from '../../utils/coachBridgeTemplates.js'
import {
  resolveScheduleWeekForMessage,
  validateTrainingDaySelection,
} from '../../utils/studentTrainingWeekPlan.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   personaId?: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   open?: boolean,
 *   onBridgeChange?: (patch: { portalBridge?: object }) => void,
 *   onAnswered?: () => void,
 * }} props
 */
export default function StudentBridgeReplyInline({
  studentId,
  coachId,
  personaId = 'mikhail',
  open = false,
  onBridgeChange = null,
  onAnswered = null,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const localInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  const [thread, setThread] = useState(
    /** @type {import('../../utils/coachBridgeModel.js').CoachBridgeThread | null} */ (null),
  )
  const [selectedDays, setSelectedDays] = useState(/** @type {string[]} */ ([]))
  const [customReply, setCustomReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!studentId || !coachId) return undefined
    return subscribeCoachBridgeThread(studentId, coachId, setThread)
  }, [studentId, coachId])

  const unread = thread ? countStudentUnreadFromPersona(thread.messages) : 0
  const status = deriveCoachBridgeStatus(thread?.messages ?? [])
  const questionText = status.lastTo?.text ?? ''
  const requestType = status.requestType ?? 'custom'
  const needsAnswer = status.phase === 'awaiting' || unread > 0
  const showWeekPicker = requestType === 'training_frequency' && needsAnswer && !done

  const scheduleWeek = useMemo(
    () => resolveScheduleWeekForMessage(status.lastTo),
    [status.lastTo?.id, status.lastTo?.scheduleWeek?.weekStartISO],
  )

  useEffect(() => {
    if (!open || unread <= 0 || !studentId || !coachId) return undefined
    void markCoachBridgeReadByStudent(studentId, coachId).then(() => {
      onBridgeChange?.({
        portalBridge: {
          unreadCount: 0,
          lastPreview: questionText,
          lastAt: status.lastTo?.at ?? null,
          coachId,
        },
      })
    })
  }, [open, unread, studentId, coachId])

  useEffect(() => {
    if (showWeekPicker) setSelectedDays([])
  }, [showWeekPicker, scheduleWeek.weekStartISO])

  useEffect(() => {
    if (!open || !needsAnswer || done || showWeekPicker) return undefined
    const t = window.setTimeout(() => localInputRef.current?.focus(), 120)
    return () => window.clearTimeout(t)
  }, [open, needsAnswer, done, showWeekPicker])

  if (!needsAnswer && !done) return null

  const submitTextReply = async (text) => {
    const trimmed = String(text ?? '').trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError('')
    try {
      await sendStudentBridgeReply({ studentId, coachId, text: trimmed })
      setCustomReply('')
      setDone(true)
      onAnswered?.()
      window.setTimeout(() => setDone(false), 2500)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Не удалось отправить ответ.')
    } finally {
      setBusy(false)
    }
  }

  const toggleDay = (dateISO) => {
    setError('')
    setSelectedDays((prev) => {
      if (prev.includes(dateISO)) return prev.filter((d) => d !== dateISO)
      if (prev.length >= 6) {
        setError('Максимум 6 тренировок — оставь хотя бы один день отдыха.')
        return prev
      }
      return [...prev, dateISO]
    })
  }

  const submitSchedule = async () => {
    const validation = validateTrainingDaySelection(scheduleWeek, selectedDays)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    setBusy(true)
    setError('')
    try {
      await sendStudentBridgeScheduleReply({
        studentId,
        coachId,
        weekStartISO: scheduleWeek.weekStartISO,
        weekEndISO: scheduleWeek.weekEndISO,
        trainingDays: validation.trainingDays,
        bridgeRequestMessageId: status.lastTo?.id ?? null,
      })
      setSelectedDays([])
      setDone(true)
      onAnswered?.()
      window.setTimeout(() => setDone(false), 2500)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Не удалось отправить график.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <p className="text-[15px] font-medium text-emerald-700">✓ График отправлен тренеру</p>
        <p className={`${vk.mutedXs} mt-2`}>Можешь закрыть окно или задать другой вопрос.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-2.5">
        <div className="flex gap-2.5">
          <StudentPersonaAvatar personaId={persona.id} size="md" />
          <div className="min-w-0 max-w-[calc(100%-3rem)]">
            <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
            <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
              {questionText || '…'}
            </div>
          </div>
        </div>

        {showWeekPicker ? (
          <StudentWeekSchedulePicker
            week={scheduleWeek}
            selectedDays={selectedDays}
            onToggleDay={toggleDay}
            onSubmit={() => void submitSchedule()}
            busy={busy}
            error={error}
          />
        ) : null}
      </div>

      {!showWeekPicker ? (
        <>
          {error ? <p className={`${vk.error} mt-2 text-[13px]`}>{error}</p> : null}
          <form
            className="mt-2 flex shrink-0 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void submitTextReply(customReply)
            }}
          >
            <input
              ref={localInputRef}
              type="text"
              value={customReply}
              onChange={(e) => setCustomReply(e.target.value)}
              disabled={busy}
              placeholder="Ваш ответ…"
              maxLength={2000}
              className={`${vk.input} min-h-[48px] flex-1 rounded-full text-[14px]`}
            />
            <button
              type="submit"
              disabled={busy || !customReply.trim()}
              className={`h-[48px] shrink-0 rounded-full px-4 ${vk.btnPrimary} disabled:opacity-50`}
            >
              →
            </button>
          </form>
        </>
      ) : null}
    </div>
  )
}

/**
 * @param {import('../../utils/coachBridgeModel.js').CoachBridgeMessage[]} messages
 */
export function studentBridgeNeedsAnswer(messages) {
  const status = deriveCoachBridgeStatus(messages ?? [])
  const unread = countStudentUnreadFromPersona(messages ?? [])
  return status.phase === 'awaiting' || unread > 0
}

/**
 * @param {string} studentId
 * @param {string} coachId
 * @param {(thread: import('../../utils/coachBridgeModel.js').CoachBridgeThread) => void} onChange
 */
export function subscribeStudentBridgeNeedsAnswer(studentId, coachId, onChange) {
  if (!studentId || !coachId) {
    onChange({ pendingDraft: null, messages: [] })
    return () => {}
  }
  return subscribeCoachBridgeThread(studentId, coachId, onChange)
}
