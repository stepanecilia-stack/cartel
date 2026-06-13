import { useEffect, useState } from 'react'
import {
  approveCoachBridgeMessage,
  markCoachBridgeReadByCoach,
  subscribeCoachBridgeThread,
} from '../../services/coachBridgeService.js'
import {
  buildCoachBridgeRequestMessage,
  COACH_BRIDGE_QUICK_REQUESTS,
  deriveCoachBridgeStatus,
} from '../../utils/coachBridgeTemplates.js'
import { displayNameFromStudent } from '../../utils/studentModel.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   studentId: string,
 *   coachId: string,
 *   student: object,
 *   personaId?: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   portalEnabled?: boolean,
 *   onStudentPatched?: (patch: object) => void,
 * }} props
 */
export default function CoachStudentRequests({
  studentId,
  coachId,
  student,
  personaId = 'mikhail',
  portalEnabled = true,
  onStudentPatched = null,
}) {
  const studentName = displayNameFromStudent(student)
  const [thread, setThread] = useState(
    /** @type {import('../../utils/coachBridgeModel.js').CoachBridgeThread | null} */ (null),
  )
  const [composeText, setComposeText] = useState('')
  const [composeReason, setComposeReason] = useState('')
  const [composeMeta, setComposeMeta] = useState(
    /** @type {{ requestType?: import('../../utils/coachBridgeTemplates.js').CoachBridgeRequestType | null, scheduleWeek?: import('../../utils/coachBridgeModel.js').CoachBridgeScheduleWeek | null }} */ ({}),
  )
  const [composing, setComposing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentFlash, setSentFlash] = useState(false)

  useEffect(() => {
    if (!studentId || !coachId) return undefined
    return subscribeCoachBridgeThread(studentId, coachId, setThread)
  }, [studentId, coachId])

  const status = deriveCoachBridgeStatus(thread?.messages ?? [])
  const pendingDraft = thread?.pendingDraft

  useEffect(() => {
    if (pendingDraft?.text?.trim()) {
      setComposeText(pendingDraft.text)
      setComposeReason(pendingDraft.reason ?? '')
      setComposing(true)
    }
  }, [pendingDraft?.text, pendingDraft?.reason])

  useEffect(() => {
    if (status.phase === 'answered' && status.lastFrom && studentId && coachId) {
      void markCoachBridgeReadByCoach(studentId, coachId).then(() => {
        onStudentPatched?.({ coachBridgeInbox: {} })
      })
    }
  }, [status.phase, status.lastFrom?.id, studentId, coachId])

  const startQuickRequest = (type) => {
    const built = buildCoachBridgeRequestMessage(student, type)
    setComposeText(built.text)
    setComposeReason(built.reason)
    setComposeMeta({
      requestType: built.type,
      scheduleWeek: built.scheduleWeek ?? null,
    })
    setComposing(true)
    setError('')
  }

  const cancelCompose = () => {
    setComposing(false)
    setComposeText('')
    setComposeReason('')
    setComposeMeta({})
    setError('')
  }

  const handleSend = async () => {
    const text = composeText.trim()
    if (!text || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await approveCoachBridgeMessage({
        studentId,
        coachId,
        text,
        personaId,
        requestType: composeMeta.requestType ?? null,
        scheduleWeek: composeMeta.scheduleWeek ?? null,
      })
      onStudentPatched?.({ portalBridge: result.portalBridge })
      setComposing(false)
      setComposeText('')
      setComposeReason('')
      setComposeMeta({})
      setSentFlash(true)
      window.setTimeout(() => setSentFlash(false), 3000)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Не удалось отправить.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[10px] border border-[#dce1e6] bg-white p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold text-slate-900">Запросы ученику</h3>
        <p className="mt-0.5 text-[12px] leading-snug text-[#818c99]">
          Сообщение уйдёт в кабинет от имени виртуального тренера — один канал, без отдельного чата.
        </p>
      </div>

      {!composing && !sentFlash ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {COACH_BRIDGE_QUICK_REQUESTS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy}
              onClick={() => startQuickRequest(item.id)}
              className={`${vk.btnPrimary} px-4 py-2.5 text-[14px] font-semibold`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {status.phase === 'awaiting' && !composing ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[13px] font-medium text-amber-900">Ждём ответ от {studentName}</p>
          <p className="mt-1 text-[12px] leading-snug text-amber-800/90">{status.lastTo?.text}</p>
          <p className="mt-1.5 text-[11px] text-amber-800/70">Можно отправить другой запрос — кнопки выше.</p>
        </div>
      ) : null}

      {status.phase === 'answered' && status.lastFrom && !composing ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-[13px] font-medium text-emerald-900">Ответ от {studentName}</p>
          <p className="mt-1 text-[14px] font-semibold text-emerald-950">{status.lastFrom.text}</p>
          <p className="mt-1 text-[11px] text-emerald-800/80">Новый запрос — кнопки выше.</p>
        </div>
      ) : null}

      {sentFlash ? (
        <p className="mt-3 text-[13px] font-medium text-emerald-700">✓ Отправлено — ученик увидит в Зале</p>
      ) : null}

      {composing ? (
        <div className="mt-3 space-y-2">
          <p className="text-[12px] font-semibold text-[#2d81e0]">Сообщение для {studentName}</p>
          <textarea
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            disabled={busy}
            rows={4}
            maxLength={2000}
            autoFocus
            className={`${vk.input} w-full resize-y text-[14px] leading-snug`}
          />
          {!portalEnabled ? (
            <p className={`${vk.noticeWarn} text-[12px]`}>
              Кабинет не включён — сообщение сохранится и появится после входа ученика.
            </p>
          ) : null}
          {error ? <p className={`${vk.error} text-[13px]`}>{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !composeText.trim()}
              onClick={() => void handleSend()}
              className={`${vk.btnPrimary} flex-1 py-2.5 text-[14px] font-semibold disabled:opacity-50`}
            >
              {busy ? 'Отправляю…' : 'Отправить в кабинет'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelCompose}
              className={`${vk.btnSecondary} px-3 py-2.5 text-[13px]`}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
