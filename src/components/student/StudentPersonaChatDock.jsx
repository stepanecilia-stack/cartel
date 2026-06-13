import { useEffect, useId, useRef, useState } from 'react'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentPersonaChat from './StudentPersonaChat.jsx'
import StudentBridgeReplyInline, {
  studentBridgeNeedsAnswer,
  subscribeStudentBridgeNeedsAnswer,
} from './StudentBridgeReplyInline.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   personaId?: unknown,
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   programHint?: string | null,
 *   personaMemory?: import('../../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 *   studentId?: string,
 *   bridgeCoachId?: string,
 *   onBridgeChange?: (patch: { portalBridge?: object }) => void,
 *   onSessionClose?: (
 *     messages: import('../../services/portalPersonaAiService.js').PortalChatMessage[],
 *   ) => void | Promise<void>,
 * }} props
 */
export default function StudentPersonaChatDock({
  personaId,
  open,
  onOpenChange,
  programHint = null,
  personaMemory = null,
  trainingGoals = null,
  studentId = '',
  bridgeCoachId = '',
  onBridgeChange = null,
  onSessionClose,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const panelId = useId()
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  /** @type {import('react').RefObject<import('./StudentPersonaChat.jsx').default>} */
  const chatRef = useRef(null)
  const [bridgeThread, setBridgeThread] = useState(
    /** @type {import('../../utils/coachBridgeModel.js').CoachBridgeThread | null} */ (null),
  )
  const [bridgeDoneFlash, setBridgeDoneFlash] = useState(false)

  const bridgeActive =
    Boolean(studentId && bridgeCoachId) &&
    !bridgeDoneFlash &&
    studentBridgeNeedsAnswer(bridgeThread?.messages ?? [])

  useEffect(() => {
    if (!studentId || !bridgeCoachId) return undefined
    return subscribeStudentBridgeNeedsAnswer(studentId, bridgeCoachId, setBridgeThread)
  }, [studentId, bridgeCoachId])

  useEffect(() => {
    if (!open || bridgeActive) return undefined
    const t = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(t)
  }, [open, bridgeActive])

  const handleClose = () => {
    const messages = chatRef.current?.getSessionMessages?.() ?? []
    const userCount = chatRef.current?.getUserMessageCount?.() ?? 0
    onOpenChange(false)
    if (userCount > 0 && onSessionClose) {
      void onSessionClose(messages)
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label={bridgeActive ? `Ответить ${name}` : `Спросить ${name}`}
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => onOpenChange(true)}
          className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] right-3 z-40 flex items-center gap-2 rounded-full border border-[#e7e8ec] bg-white py-1.5 pl-1.5 pr-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] touch-manipulation sm:right-4"
        >
          <span className="relative shrink-0">
            <StudentPersonaAvatar personaId={persona.id} size="md" />
            {bridgeActive ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2d81e0] px-1 text-[10px] font-bold text-white">
                !
              </span>
            ) : null}
          </span>
          <span className="text-[13px] font-semibold text-[#2c2d2e]">
            {bridgeActive ? 'Ответить наставнику' : 'Спросить тренера'}
          </span>
        </button>
      ) : null}

      <div
        className={`fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:p-4 ${
          open ? '' : 'pointer-events-none invisible'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Закрыть"
          tabIndex={open ? 0 : -1}
          className="absolute inset-0 bg-[#2c2d2e]/35"
          onClick={handleClose}
        />

        <section
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
          aria-labelledby={`${panelId}-title`}
          className="relative mx-auto flex max-h-[min(560px,92dvh)] w-full max-w-2xl flex-col rounded-t-[14px] border border-[#e7e8ec] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:rounded-[14px]"
        >
          <header className="flex shrink-0 items-center gap-2.5 border-b border-[#e7e8ec] px-3 py-2.5 sm:px-4">
            <StudentPersonaAvatar personaId={persona.id} size="md" />
            <div className="min-w-0 flex-1">
              <h2 id={`${panelId}-title`} className="truncate text-[15px] font-bold text-[#2c2d2e]">
                {name}
              </h2>
              <p className={vk.mutedXs}>
                {bridgeActive ? 'Ответь на вопрос — одно сообщение' : persona.roleLabel}
              </p>
            </div>
            <button type="button" onClick={handleClose} className={vk.btnSecondary}>
              Закрыть
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-3 py-2.5 sm:px-4 sm:py-3">
            {bridgeActive && studentId && bridgeCoachId ? (
              <StudentBridgeReplyInline
                studentId={studentId}
                coachId={bridgeCoachId}
                personaId={persona.id}
                open={open}
                onBridgeChange={onBridgeChange}
                onAnswered={() => {
                  setBridgeDoneFlash(true)
                  window.setTimeout(() => setBridgeDoneFlash(false), 3000)
                }}
              />
            ) : (
              <StudentPersonaChat
                ref={chatRef}
                personaId={persona.id}
                context="program"
                openingTrainerText={persona.phrases.welcomeBack}
                programHint={programHint}
                personaMemory={personaMemory}
                trainingGoals={trainingGoals}
                inputRef={inputRef}
                disabled={!open}
                expanded
                showTrainerIdentity
              />
            )}
          </div>
        </section>
      </div>
    </>
  )
}
