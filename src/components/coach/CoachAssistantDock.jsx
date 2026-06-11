import { useEffect, useId, useRef, useState } from 'react'
import {
  getCoachStudentsCache,
  subscribeCoachStudentsCache,
} from '../../data/coachStudentsCache.js'
import { hydrateCoachAssistantFocusStudent } from '../../utils/coachAssistantStudentSources.js'
import { saveCoachAssistantPersona } from '../../services/coachAssistantService.js'
import { resolveCoachAssistantPersonaId } from '../../utils/coachAssistantPersona.js'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import CoachAssistantChat from './CoachAssistantChat.jsx'
import CoachAssistantPersonaPicker from './CoachAssistantPersonaPicker.jsx'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   coachId: string,
 *   coachProfile?: object | null,
 *   focusStudent?: object | null,
 *   onStudentPatched?: (studentId: string, patch: object) => void,
 * }} props
 */
export default function CoachAssistantDock({
  coachId,
  coachProfile = null,
  focusStudent = null,
  onStudentPatched = null,
}) {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState(() => getCoachStudentsCache())
  const [personaId, setPersonaId] = useState(() => resolveCoachAssistantPersonaId(coachProfile))
  const [personaBusy, setPersonaBusy] = useState(false)
  const panelId = useId()
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const coachName = [coachProfile?.firstName, coachProfile?.lastName].filter(Boolean).join(' ').trim() || 'коллега'

  useEffect(() => {
    return subscribeCoachStudentsCache(() => setStudents(getCoachStudentsCache()))
  }, [])

  useEffect(() => {
    setPersonaId(resolveCoachAssistantPersonaId(coachProfile))
  }, [coachProfile?.coachAssistantPersonaId])

  const handlePersonaChange = async (nextId) => {
    setPersonaId(nextId)
    setPersonaBusy(true)
    try {
      await saveCoachAssistantPersona(coachId, nextId)
    } catch (e) {
      console.error(e)
    } finally {
      setPersonaBusy(false)
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label={`Чат с ${name}`}
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] right-3 z-40 flex items-center gap-2 rounded-full border border-[#e7e8ec] bg-white py-1.5 pl-1.5 pr-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] touch-manipulation sm:right-4"
        >
          <StudentPersonaAvatar personaId={persona.id} size="md" />
          <span className="text-[13px] font-semibold text-[#2c2d2e]">Помощник</span>
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
          aria-label="Закрыть чат"
          tabIndex={open ? 0 : -1}
          className="absolute inset-0 bg-[#2c2d2e]/35"
          onClick={() => setOpen(false)}
        />

        <section
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className="relative mx-auto flex max-h-[min(640px,94dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[14px] border border-[#e7e8ec] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:rounded-[14px]"
        >
          <header className="shrink-0 space-y-2 border-b border-[#e7e8ec] px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2.5">
              <StudentPersonaAvatar personaId={persona.id} size="md" />
              <div className="min-w-0 flex-1">
                <h2 id={`${panelId}-title`} className="truncate text-[15px] font-bold text-[#2c2d2e]">
                  {name}
                </h2>
                <p className={vk.mutedXs}>Коллега · агент по вашим ученикам</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className={vk.btnSecondary}>
                Закрыть
              </button>
            </div>
            <CoachAssistantPersonaPicker
              value={persona.id}
              onChange={handlePersonaChange}
              disabled={personaBusy}
            />
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-2.5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-3">
            {open ? (
              <CoachAssistantChat
                personaId={persona.id}
                coachId={coachId}
                coachName={coachName}
                students={students}
                focusStudent={hydrateCoachAssistantFocusStudent(focusStudent)}
                onStudentPatched={onStudentPatched}
              />
            ) : null}
          </div>
        </section>
      </div>
    </>
  )
}
