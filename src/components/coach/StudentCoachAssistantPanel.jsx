import { useEffect, useState } from 'react'
import CoachAssistantChat from './CoachAssistantChat.jsx'
import CoachAssistantStudentContextBlock from './CoachAssistantStudentContextBlock.jsx'
import CoachBridgeInboxBlock from './CoachBridgeInboxBlock.jsx'
import CoachStudentRequests from './CoachStudentRequests.jsx'
import {
  formatPortalPersonaName,
  getPortalPersona,
  normalizePortalPersonaId,
} from '../../constants/studentPortalPersonas.js'
import { displayNameFromStudent } from '../../utils/studentModel.js'
import { readCoachBridgeInboxEntry } from '../../utils/coachBridgeModel.js'
import { hydrateCoachAssistantFocusStudent } from '../../utils/coachAssistantStudentSources.js'
import { vk } from '../../utils/vkUi.js'

const OPEN_PREF_PREFIX = 'cartel_student_coach_assistant_open_v1'

function readOpenPref(studentId) {
  try {
    return localStorage.getItem(`${OPEN_PREF_PREFIX}:${studentId}`) === '1'
  } catch {
    return false
  }
}

function writeOpenPref(studentId, open) {
  try {
    localStorage.setItem(`${OPEN_PREF_PREFIX}:${studentId}`, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   coachId: string,
 *   coachName?: string,
 *   student: object | null,
 *   allNorms?: object[],
 *   programAtoms?: { level1?: object[], level2?: object[], level3?: object[] },
 *   onStudentPatched?: (studentId: string, patch: object) => void,
 * }} props
 */
export default function StudentCoachAssistantPanel({
  coachId,
  coachName = 'коллега',
  student,
  allNorms = [],
  programAtoms = null,
  onStudentPatched = null,
}) {
  const studentId = student?.id ? String(student.id) : ''
  const personaId = normalizePortalPersonaId(student?.portalPersonaId)
  const persona = getPortalPersona(personaId)
  const personaName = formatPortalPersonaName(persona)
  const studentName = displayNameFromStudent(student)

  const bridgeInbox = readCoachBridgeInboxEntry(student, coachId)
  const [tab, setTab] = useState(
    /** @type {'requests' | 'assistant'} */ (bridgeInbox ? 'requests' : 'requests'),
  )
  const [liveBrief, setLiveBrief] = useState('')
  const [userMessageCount, setUserMessageCount] = useState(0)

  useEffect(() => {
    setLiveBrief('')
    setUserMessageCount(0)
    if (readCoachBridgeInboxEntry(student, coachId)) setTab('requests')
  }, [studentId, coachId, student])

  const focusStudent = hydrateCoachAssistantFocusStudent(student)

  if (!studentId || !coachId) return null

  const portalEnabled = student?.portalEnabled === true

  return (
    <section className={`${vk.cardPadded} py-2.5 sm:py-3`}>
      <div className="flex gap-1 rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-1">
        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`flex-1 rounded-md px-3 py-2 text-[13px] font-semibold ${
            tab === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#818c99]'
          }`}
        >
          Кабинет ученика
          {bridgeInbox?.unreadFromStudent ? (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] text-white">
              {bridgeInbox.unreadFromStudent}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab('assistant')}
          className={`flex-1 rounded-md px-3 py-2 text-[13px] font-semibold ${
            tab === 'assistant' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#818c99]'
          }`}
        >
          КСР и техника
        </button>
      </div>

      {tab === 'requests' ? (
        <div className="mt-3 space-y-2.5">
          {bridgeInbox?.unreadFromStudent ? (
            <CoachBridgeInboxBlock
              studentId={studentId}
              coachId={coachId}
              studentName={studentName}
              personaId={persona.id}
              initialUnread={bridgeInbox.unreadFromStudent}
              onInboxChange={(patch) => onStudentPatched?.(studentId, patch)}
            />
          ) : null}
          <CoachStudentRequests
            studentId={studentId}
            coachId={coachId}
            student={student}
            personaId={persona.id}
            portalEnabled={portalEnabled}
            onStudentPatched={(patch) => onStudentPatched?.(studentId, patch)}
          />
          {!bridgeInbox?.unreadFromStudent ? (
            <CoachBridgeInboxBlock
              studentId={studentId}
              coachId={coachId}
              studentName={studentName}
              personaId={persona.id}
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex min-h-[min(360px,50dvh)] flex-col gap-2.5 overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-[#fafbfc] p-2.5 sm:p-3">
          <p className={`${vk.mutedXs} px-0.5`}>
            {personaName} — только данные карточки. Сообщения ученику — вкладка «Кабинет ученика».
          </p>
          <CoachAssistantStudentContextBlock
            portalPersonaMemory={student?.portalPersonaMemory}
            liveBrief={liveBrief}
            messageCount={userMessageCount}
            personaAnimal={persona.animal.toLowerCase()}
          />
          <CoachAssistantChat
            personaId={persona.id}
            coachId={coachId}
            coachName={coachName}
            students={focusStudent ? [focusStudent] : []}
            focusStudent={focusStudent}
            studentId={studentId}
            persistToFirestore
            allNorms={allNorms}
            programAtoms={programAtoms}
            disableStudentBridge
            onStudentPatched={(patchedStudentId, patch) => {
              onStudentPatched?.(patchedStudentId, patch)
            }}
            onThreadChange={({ liveBrief: brief, userMessageCount: count }) => {
              setLiveBrief(brief)
              setUserMessageCount(count)
            }}
          />
        </div>
      )}
    </section>
  )
}
