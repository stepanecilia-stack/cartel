import { memo, useCallback, useMemo, useState } from 'react'
import SeasonCalendarPanel from '../calendar/SeasonCalendarPanel.jsx'
import { useCoachEvents } from '../../hooks/useCoachEvents.js'
import { useCoachStudents } from '../../hooks/useCoachStudents.js'
import {
  createCoachEvent,
  deleteCoachEvent,
  removeParticipantFromCoachEvent,
  updateCoachEvent,
} from '../../services/coachEventsService.js'
import {
  calendarItemsForStudent,
  mergeCalendarWithOrientirs,
} from '../../utils/coachEvents.js'
import { resolveTypicalSeasonCalendar } from '../../utils/plannedCompetitions.js'
import { federationCalendarHint } from '../../data/federationCalendar2026.js'
import { formatFirestoreErrorMessage } from '../../utils/firestoreErrorMessage.js'
import { displayNameFromStudent } from '../../utils/studentModel.js'

/**
 * @param {{
 *   coachId: string | undefined,
 *   studentId: string | undefined,
 *   studentName?: string,
 *   ageInt?: number | null,
 *   gender?: 'M' | 'F' | string | null,
 * }} props
 */
function StudentYearPrepPanel({ coachId, studentId, studentName = '', ageInt = null, gender = 'M' }) {
  const { students } = useCoachStudents(coachId)
  const { events } = useCoachEvents(coachId)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        id: String(s.id),
        name: displayNameFromStudent(s),
      })),
    [students],
  )

  const orientirs = useMemo(
    () => resolveTypicalSeasonCalendar(ageInt, gender === 'F' ? 'F' : 'M'),
    [ageInt, gender],
  )

  const calendarItems = useMemo(() => {
    const coachItems = calendarItemsForStudent(events, studentId)
    return mergeCalendarWithOrientirs(coachItems, orientirs)
  }, [events, studentId, orientirs])

  const orientirHint = useMemo(
    () => federationCalendarHint(ageInt, gender === 'F' ? 'F' : 'M'),
    [ageInt, gender],
  )

  const runSave = useCallback(async (fn) => {
    setSaveBusy(true)
    setSaveError('')
    try {
      await fn()
    } catch (err) {
      console.error(err)
      setSaveError(formatFirestoreErrorMessage(err))
      throw err
    } finally {
      setSaveBusy(false)
    }
  }, [])

  const defaultParticipants = studentId ? [studentId] : []

  return (
    <SeasonCalendarPanel
      title={studentName ? `Сезон · ${studentName}` : 'Сезон'}
      hint={`${orientirHint} События тренера — в общем календаре; серые пунктирные даты — ориентиры Минспорта 2026.`}
      calendarItems={calendarItems}
      coachEvents={events}
      students={studentOptions}
      canSave={Boolean(coachId && studentId)}
      saveBusy={saveBusy}
      saveError={saveError}
      contextStudentId={studentId ?? null}
      defaultParticipantIds={defaultParticipants}
      onCreateEvent={(payload) =>
        runSave(() =>
          createCoachEvent(coachId, {
            ...payload,
            participantIds: payload.participantIds.length
              ? payload.participantIds
              : defaultParticipants,
          }),
        )
      }
      onUpdateEvent={(eventId, payload) =>
        runSave(() => updateCoachEvent(eventId, payload))
      }
      onRemoveFromEvent={(eventId, sid) => {
        const ev = events.find((e) => e.id === eventId)
        if (!ev) return Promise.resolve()
        return runSave(() => removeParticipantFromCoachEvent(eventId, sid, ev.participantIds))
      }}
      onDeleteEvent={(eventId) => runSave(() => deleteCoachEvent(eventId))}
    />
  )
}

export default memo(StudentYearPrepPanel)
