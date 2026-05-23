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
import { formatFirestoreErrorMessage } from '../../utils/firestoreErrorMessage.js'
import { toCoachEventStudentOption } from '../../utils/coachEventStudents.js'
import { localDateISO } from '../../utils/prepCalendarGrid.js'
import {
  newSeasonCheckpointId,
  normalizeSeasonBlocks,
  normalizeSeasonCheckpoints,
} from '../../utils/seasonPlan.js'

/**
 * @param {{
 *   coachId: string | undefined,
 *   studentId: string | undefined,
 *   student?: Record<string, unknown> | null,
 *   studentName?: string,
 *   ageInt?: number | null,
 *   gender?: 'M' | 'F' | string | null,
 *   allNorms?: object[],
 *   kd?: number,
 *   techniquePercent?: number,
 *   atomsAtSkill?: number,
 *   totalAtoms?: number,
 *   effectiveKsr?: number,
 *   seasonBlocks?: import('../../utils/seasonPlan.js').SeasonBlock[],
 *   seasonCheckpoints?: import('../../utils/seasonPlan.js').SeasonCheckpoint[],
 *   onSaveSeasonPlan: (payload: {
 *     blocks: import('../../utils/seasonPlan.js').SeasonBlock[],
 *     checkpoints: import('../../utils/seasonPlan.js').SeasonCheckpoint[],
 *   }) => void | Promise<void>,
 *   onCartelStageChange: (stage: import('../../data/cartelParticipation.js').CartelStageId) => void | Promise<void>,
 *   onSaveCartelDocuments?: (docs: import('../../data/cartelDocuments.js').CartelDocumentsMap) => void | Promise<void>,
 *   onOpenTab?: (tabId: string) => void,
 *   planSaveBusy?: boolean,
 *   planSaveError?: string,
 *   stageSaveBusy?: boolean,
 * }} props
 */
function StudentSeasonPanel({
  coachId,
  studentId,
  student = null,
  studentName = '',
  ageInt = null,
  gender = 'M',
  allNorms = [],
  kd = 0.25,
  techniquePercent = 0,
  atomsAtSkill = 0,
  totalAtoms = 0,
  effectiveKsr = 0,
  seasonBlocks = [],
  seasonCheckpoints = [],
  onSaveSeasonPlan,
  onCartelStageChange,
  onSaveCartelDocuments,
  onOpenTab,
  planSaveBusy = false,
  planSaveError = '',
  stageSaveBusy = false,
}) {
  const { students } = useCoachStudents(coachId)
  const { events } = useCoachEvents(coachId)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const studentOptions = useMemo(
    () => students.map((s) => toCoachEventStudentOption(s)),
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

  const blocks = useMemo(() => normalizeSeasonBlocks(seasonBlocks), [seasonBlocks])
  const checkpoints = useMemo(
    () => normalizeSeasonCheckpoints(seasonCheckpoints),
    [seasonCheckpoints],
  )

  const defaultParticipants = studentId ? [studentId] : []

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

  const appendCombatCheckpoint = useCallback(
    async (kind) => {
      const today = localDateISO(new Date())
      const count = checkpoints.filter((c) => c.kind === kind).length + 1
      const title = kind === 'sparring' ? `Спарринг ${count}` : `Матчевая встреча ${count}`
      await onSaveSeasonPlan({
        blocks,
        checkpoints: [
          ...checkpoints,
          {
            id: newSeasonCheckpointId(kind),
            title,
            kind,
            dateISO: today,
            done: true,
          },
        ],
      })
    },
    [blocks, checkpoints, onSaveSeasonPlan],
  )

  const handleToggleSpecialPass = useCallback(async () => {
    const today = localDateISO(new Date())
    const existing = checkpoints.find((c) => /спецзач|план подготовки/i.test(c.title))
    if (existing) {
      await onSaveSeasonPlan({
        blocks,
        checkpoints: checkpoints.map((c) =>
          c.id === existing.id ? { ...c, done: !c.done, dateISO: c.dateISO || today } : c,
        ),
      })
      return
    }
    await onSaveSeasonPlan({
      blocks,
      checkpoints: [
        ...checkpoints,
        {
          id: newSeasonCheckpointId('special'),
          title: 'Спецзачёт (План подготовки)',
          kind: 'norm',
          dateISO: today,
          done: true,
        },
      ],
    })
  }, [blocks, checkpoints, onSaveSeasonPlan])

  return (
    <SeasonCalendarPanel
      title={studentName ? `Сезон · ${studentName}` : 'Сезон'}
      calendarItems={calendarItems}
      coachEvents={events}
      students={studentOptions}
      canSave={Boolean(coachId && studentId)}
      saveBusy={saveBusy}
      saveError={saveError}
      contextStudentId={studentId ?? null}
      defaultParticipantIds={defaultParticipants}
      student={student}
      allNorms={allNorms}
      kd={kd}
      techniquePercent={techniquePercent}
      atomsAtSkill={atomsAtSkill}
      totalAtoms={totalAtoms}
      effectiveKsr={effectiveKsr}
      seasonBlocks={blocks}
      seasonCheckpoints={checkpoints}
      onSaveSeasonPlan={onSaveSeasonPlan}
      planSaveBusy={planSaveBusy}
      planSaveError={planSaveError}
      onCartelStageChange={onCartelStageChange}
      onOpenTab={onOpenTab}
      onAddSparring={() => appendCombatCheckpoint('sparring')}
      onAddMatch={() => appendCombatCheckpoint('match')}
      onToggleSpecialPass={handleToggleSpecialPass}
      onSaveCartelDocuments={onSaveCartelDocuments}
      stageSaveBusy={stageSaveBusy}
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
      onUpdateEvent={(eventId, payload) => runSave(() => updateCoachEvent(eventId, payload))}
      onRemoveFromEvent={(eventId, sid) => {
        const ev = events.find((e) => e.id === eventId)
        if (!ev) return Promise.resolve()
        return runSave(() => removeParticipantFromCoachEvent(eventId, sid, ev.participantIds))
      }}
      onDeleteEvent={(eventId) => runSave(() => deleteCoachEvent(eventId))}
    />
  )
}

export default memo(StudentSeasonPanel)
