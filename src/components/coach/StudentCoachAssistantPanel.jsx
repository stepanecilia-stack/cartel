import { useEffect, useMemo, useState } from 'react'
import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import CoachAssistantChat from './CoachAssistantChat.jsx'
import {
  formatPortalPersonaName,
  getPortalPersona,
  normalizePortalPersonaId,
} from '../../constants/studentPortalPersonas.js'
import { displayNameFromStudent } from '../../utils/studentModel.js'
import { hydrateCoachAssistantFocusStudent } from '../../utils/coachAssistantStudentSources.js'
import { vk } from '../../utils/vkUi.js'

const OPEN_PREF_PREFIX = 'cartel_student_coach_assistant_open_v1'

/**
 * @param {string} studentId
 */
function readOpenPref(studentId) {
  try {
    return localStorage.getItem(`${OPEN_PREF_PREFIX}:${studentId}`) === '1'
  } catch {
    return false
  }
}

/**
 * @param {string} studentId
 * @param {boolean} open
 */
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

  const [open, setOpen] = useState(() => (studentId ? readOpenPref(studentId) : false))

  useEffect(() => {
    if (studentId) setOpen(readOpenPref(studentId))
  }, [studentId])

  const focusStudent = useMemo(
    () => hydrateCoachAssistantFocusStudent(student),
    [student],
  )

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (studentId) writeOpenPref(studentId, next)
  }

  if (!studentId || !coachId) return null

  const portalEnabled = student?.portalEnabled === true
  const hasPersonaChoice = Boolean(student?.portalPersonaId)

  return (
    <section className={`${vk.cardPadded} py-2.5 sm:py-3`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <StudentPersonaAvatar personaId={persona.id} size="md" />
          <div className="min-w-0">
            <h2 className={vk.h2}>Виртуальный помощник</h2>
            <p className={`mt-0.5 ${vk.mutedXs}`}>
              {hasPersonaChoice
                ? `${personaName} — тот же тренер, что в кабинете ученика`
                : 'Ученик ещё не выбрал тренера в кабинете — пока используется Медведь'}
            </p>
            {!portalEnabled ? (
              <p className={`mt-1 ${vk.noticeWarn}`}>Кабинет ученика не включён — переписка сохранится, ученик увидит контекст после входа.</p>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={toggleOpen} className={vk.btnSecondary}>
          {open ? 'Скрыть' : 'Обсудить с помощником'}
        </button>
      </div>

      {open ? (
        <div className="mt-3 flex min-h-[min(420px,55dvh)] flex-col overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-[#fafbfc] p-2.5 sm:p-3">
          <p className={`mb-2 ${vk.mutedXs}`}>
            Контекст: <span className="font-medium text-[#2c2d2e]">{studentName}</span>.
            Переписка сохраняется в базе и влияет на ответы {persona.animal}а в кабинете ученика.
          </p>
          <CoachAssistantChat
            personaId={persona.id}
            coachId={coachId}
            coachName={coachName}
            students={focusStudent ? [focusStudent] : []}
            focusStudent={focusStudent}
            studentId={studentId}
            persistToFirestore
            studentDisplayName={studentName}
            allNorms={allNorms}
            programAtoms={programAtoms}
            onStudentPatched={onStudentPatched}
          />
        </div>
      ) : null}
    </section>
  )
}
