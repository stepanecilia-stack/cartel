import { useEffect, useState } from 'react'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import {
  markCoachBridgeReadByStudent,
  sendStudentBridgeReply,
  subscribeCoachBridgeThread,
} from '../../services/coachBridgeService.js'
import { countStudentUnreadFromPersona } from '../../utils/coachBridgeModel.js'
import { deriveCoachBridgeStatus, detectBridgeRequestType } from '../../utils/coachBridgeTemplates.js'
import { vk } from '../../utils/vkUi.js'

const SCHEDULE_CHOICES = [
  { label: '2 раза', text: '2 раза в неделю' },
  { label: '3 раза', text: '3 раза в неделю' },
  { label: '4 раза', text: '4 раза в неделю' },
  { label: '5+', text: '5 и более раз в неделю' },
]

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   personaId?: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   initialUnread?: number,
 *   initialPreview?: string,
 *   onBridgeChange?: (patch: { portalBridge?: object }) => void,
 * }} props
 */
export default function StudentPortalBridgeBanner({
  studentId,
  coachId,
  personaId = 'mikhail',
  initialUnread = 0,
  initialPreview = '',
  onBridgeChange = null,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const [thread, setThread] = useState(
    /** @type {import('../../utils/coachBridgeModel.js').CoachBridgeThread | null} */ (null),
  )
  const [customReply, setCustomReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const unread = thread ? countStudentUnreadFromPersona(thread.messages) : initialUnread
  const status = deriveCoachBridgeStatus(thread?.messages ?? [])
  const lastToStudent = status.lastTo
  const questionText = lastToStudent?.text ?? initialPreview
  const requestType = detectBridgeRequestType(questionText)
  const needsAnswer = status.phase === 'awaiting' || unread > 0
  const showScheduleChoices = requestType === 'training_frequency' && needsAnswer && !done

  useEffect(() => {
    if (!studentId || !coachId) return undefined
    return subscribeCoachBridgeThread(studentId, coachId, setThread)
  }, [studentId, coachId])

  useEffect(() => {
    if (unread <= 0 || !studentId || !coachId) return undefined
    void markCoachBridgeReadByStudent(studentId, coachId).then(() => {
      onBridgeChange?.({
        portalBridge: {
          unreadCount: 0,
          lastPreview: questionText,
          lastAt: lastToStudent?.at ?? null,
          coachId,
        },
      })
    })
  }, [unread, studentId, coachId])

  if (!needsAnswer && !done) return null

  const submitReply = async (text) => {
    const trimmed = String(text ?? '').trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError('')
    try {
      await sendStudentBridgeReply({ studentId, coachId, text: trimmed })
      setCustomReply('')
      setDone(true)
      window.setTimeout(() => setDone(false), 5000)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Не удалось отправить ответ.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mb-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-3">
        <p className="text-[14px] font-medium text-emerald-800">✓ Ответ отправлен — тренер учтёт в плане</p>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-[10px] border border-[#2d81e0]/35 bg-[#ecf3fc] p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <StudentPersonaAvatar personaId={persona.id} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2d81e0]">Нужен ваш ответ</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[#2c2d2e]">{name}</p>
          {questionText ? (
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-snug text-[#2c2d2e]">{questionText}</p>
          ) : null}
        </div>
      </div>

      {showScheduleChoices ? (
        <div className="mt-3">
          <p className="mb-2 text-[12px] text-[#818c99]">Выберите или напишите свой вариант:</p>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_CHOICES.map((choice) => (
              <button
                key={choice.label}
                type="button"
                disabled={busy}
                onClick={() => void submitReply(choice.text)}
                className={`${vk.btnPrimary} min-w-[4.5rem] px-3 py-2 text-[14px] font-semibold disabled:opacity-50`}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className={`${vk.error} mt-2 text-[13px]`}>{error}</p> : null}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void submitReply(customReply)
        }}
      >
        <input
          type="text"
          value={customReply}
          onChange={(e) => setCustomReply(e.target.value)}
          disabled={busy}
          placeholder={showScheduleChoices ? 'Или свой вариант…' : 'Ваш ответ…'}
          maxLength={2000}
          className={`${vk.input} min-h-[44px] flex-1 rounded-full text-[14px]`}
        />
        <button
          type="submit"
          disabled={busy || !customReply.trim()}
          className={`h-[44px] shrink-0 rounded-full px-4 ${vk.btnPrimary} disabled:opacity-50`}
        >
          →
        </button>
      </form>
    </div>
  )
}
