import { useEffect, useState } from 'react'
import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import { countCoachUnreadFromStudent } from '../../utils/coachBridgeModel.js'
import { markCoachBridgeReadByCoach, subscribeCoachBridgeThread } from '../../services/coachBridgeService.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   studentName?: string,
 *   personaId?: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   initialUnread?: number,
 *   onInboxChange?: (patch: { coachBridgeInbox?: object }) => void,
 * }} props
 */
export default function CoachBridgeInboxBlock({
  studentId,
  coachId,
  studentName = 'Ученик',
  personaId = 'mikhail',
  initialUnread = 0,
  onInboxChange = null,
}) {
  const [thread, setThread] = useState(/** @type {import('../../utils/coachBridgeModel.js').CoachBridgeThread | null} */ (null))
  const [open, setOpen] = useState(initialUnread > 0)
  const unread = thread ? countCoachUnreadFromStudent(thread.messages) : initialUnread

  useEffect(() => {
    if (!studentId || !coachId) return undefined
    return subscribeCoachBridgeThread(studentId, coachId, setThread)
  }, [studentId, coachId])

  useEffect(() => {
    if (initialUnread > 0) setOpen(true)
  }, [initialUnread, studentId])

  useEffect(() => {
    if (!open || !studentId || !coachId || unread <= 0) return undefined
    const t = window.setTimeout(() => {
      void markCoachBridgeReadByCoach(studentId, coachId).then(() => {
        onInboxChange?.({ coachBridgeInbox: {} })
      })
    }, 600)
    return () => window.clearTimeout(t)
  }, [open, studentId, coachId, unread])

  const studentMessages = (thread?.messages ?? []).filter((m) => m.dir === 'from_student')
  if (studentMessages.length === 0 && unread <= 0) return null

  return (
    <div
      className={`rounded-[10px] border px-3 py-2.5 ${
        unread > 0 ? 'border-[#2d81e0]/30 bg-[#ecf3fc]' : 'border-[#e7e8ec] bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="relative shrink-0">
          <StudentPersonaAvatar personaId={personaId} size="sm" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2d81e0] px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[#2c2d2e]">
            {unread > 0 ? `Ответ от ${studentName}` : `Переписка с ${studentName}`}
          </span>
          {unread > 0 && studentMessages.length ? (
            <span className="mt-0.5 block truncate text-[12px] text-[#818c99]">
              {studentMessages[studentMessages.length - 1].text}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-[12px] text-[#818c99]">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto border-t border-[#e7e8ec]/80 pt-2.5">
          {(thread?.messages ?? []).map((msg) =>
            msg.dir === 'from_student' ? (
              <div key={msg.id} className="rounded-lg bg-white px-2.5 py-2 text-[13px] leading-snug text-[#2c2d2e] shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#818c99]">{studentName}</p>
                <p className="mt-0.5 whitespace-pre-wrap">{msg.text}</p>
              </div>
            ) : (
              <div key={msg.id} className="rounded-lg bg-[#f0f2f5] px-2.5 py-2 text-[13px] leading-snug text-[#2c2d2e]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#818c99]">Вы отправили</p>
                <p className="mt-0.5 whitespace-pre-wrap">{msg.text}</p>
              </div>
            ),
          )}
          {studentMessages.length === 0 ? (
            <p className={`${vk.mutedXs} py-1`}>Ответов от ученика пока нет.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
