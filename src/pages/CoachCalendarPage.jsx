import { useCallback, useMemo, useState } from 'react'
import BackToHomeLink from '../components/layout/BackToHomeLink.jsx'
import SeasonCalendarPanel from '../components/calendar/SeasonCalendarPanel.jsx'
import { useCoachEvents } from '../hooks/useCoachEvents.js'
import { useCoachStudents } from '../hooks/useCoachStudents.js'
import {
  createCoachEvent,
  deleteCoachEvent,
  removeParticipantFromCoachEvent,
  updateCoachEvent,
} from '../services/coachEventsService.js'
import { buildAllFederationOrientirCompetitions } from '../data/federationCalendar2026.js'
import {
  calendarItemsForCoach,
  mergeCalendarWithOrientirs,
} from '../utils/coachEvents.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import { toCoachEventStudentOption } from '../utils/coachEventStudents.js'
import { vk } from '../utils/vkUi.js'

/**
 * @param {{ coachId: string | undefined }} props
 */
function CoachCalendarPage({ coachId }) {
  const { students } = useCoachStudents(coachId)
  const { events, ready, error: loadError } = useCoachEvents(coachId)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const studentOptions = useMemo(
    () => students.map((s) => toCoachEventStudentOption(s)),
    [students],
  )

  const orientirs = useMemo(() => buildAllFederationOrientirCompetitions(), [])

  const calendarItems = useMemo(() => {
    const coachItems = calendarItemsForCoach(events)
    return mergeCalendarWithOrientirs(coachItems, orientirs)
  }, [events, orientirs])

  const runSave = useCallback(async (fn) => {
    if (!coachId) {
      setSaveError('Войдите в аккаунт тренера.')
      return
    }
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
  }, [coachId])

  return (
    <main className={`${vk.page} ${vk.pagePad}`}>
      <div className={`${vk.containerNarrow} space-y-3`}>
        <div className={vk.navSubBar}>
          <BackToHomeLink to="/" />
          <p className={vk.h2}>Общий календарь</p>
        </div>

        {!ready ? (
          <p className={vk.muted}>Загрузка…</p>
        ) : (
          <>
            {loadError ? <p className={vk.noticeWarn}>{loadError}</p> : null}
            <SeasonCalendarPanel
            title="Сезон · все события"
            hint="Яркие дни и блок «Ваши события» — то, что вы создали. Ориентиры Минспорта — свёрнуты, раскройте при необходимости."
            eventListLayout="cohortLadder"
            calendarItems={calendarItems}
            coachEvents={events}
            students={studentOptions}
            canSave={Boolean(coachId)}
            saveBusy={saveBusy}
            saveError={saveError}
            onCreateEvent={(payload) =>
              runSave(() =>
                createCoachEvent(coachId, {
                  title: payload.title,
                  kind: payload.kind,
                  dateISO: payload.dateISO,
                  dateEndISO: payload.dateEndISO,
                  participantIds: payload.participantIds,
                }),
              )
            }
            onUpdateEvent={(eventId, payload) =>
              runSave(() =>
                updateCoachEvent(eventId, {
                  title: payload.title,
                  kind: payload.kind,
                  participantIds: payload.participantIds,
                }),
              )
            }
            onRemoveFromEvent={(eventId, studentId) => {
              const ev = events.find((e) => e.id === eventId)
              if (!ev) return Promise.resolve()
              return runSave(() =>
                removeParticipantFromCoachEvent(eventId, studentId, ev.participantIds),
              )
            }}
            onDeleteEvent={(eventId) => runSave(() => deleteCoachEvent(eventId))}
          />
          </>
        )}
      </div>
    </main>
  )
}

export default CoachCalendarPage
