import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COACH_EVENT_KIND_STYLES, getCalendarItemStyle } from '../../data/coachEventKinds.js'
import { normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { normalizeCompetitionDateISO } from '../../utils/competitionDate.js'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { formatFirestoreErrorMessage } from '../../utils/firestoreErrorMessage.js'
import { hasOverlappingCoachEvent } from '../../utils/coachEvents.js'
import { isOrientirStart } from '../../utils/plannedCompetitions.js'
import { monthYearLabelRu } from '../../utils/prepCalendarGrid.js'
import {
  advanceAssignPickOnDay,
  buildSeasonMonthDays,
  countCompetitionsInMonth,
  normalizeIsoRange,
} from '../../utils/prepSeasonCalendar.js'
import { pickNearestFutureCompetition } from '../../utils/plannedCompetitions.js'
import { vk } from '../../utils/vkUi.js'
import CoachEventDetails from './CoachEventDetails.jsx'
import CoachEventEditor from './CoachEventEditor.jsx'
import PrepMonthEventStrip from '../student/PrepMonthEventStrip.jsx'
import PrepSeasonCalendar from '../student/PrepSeasonCalendar.jsx'
import PrepSeasonRangeBar from '../student/PrepSeasonRangeBar.jsx'
import PrepSeasonEventList from '../student/PrepSeasonEventList.jsx'
import PrepSelectedDayStarts from '../student/PrepSelectedDayStarts.jsx'

/** @typedef {import('../../utils/prepSeasonCalendar.js').AssignPickState} AssignPickState */
/** @typedef {import('../../utils/coachEvents.js').CoachEvent} CoachEvent */

const IDLE_PICK = /** @type {AssignPickState} */ ({ phase: 'idle', range: null })

/**
 * @param {{
 *   calendarItems: Array<import('../../utils/plannedCompetitions.js').PlannedCompetition & { eventKind?: string, coachEventId?: string, participantIds?: string[] }>,
 *   coachEvents: CoachEvent[],
 *   students: import('../../utils/coachEventStudents.js').CoachEventStudentOption[],
 *   canSave?: boolean,
 *   saveBusy?: boolean,
 *   saveError?: string,
 *   onCreateEvent: (payload: {
 *     title: string,
 *     kind: 'practice' | 'competition',
 *     dateISO: string,
 *     dateEndISO: string,
 *     participantIds: string[],
 *   }) => void | Promise<void>,
 *   onUpdateEvent: (eventId: string, payload: {
 *     title: string,
 *     kind: 'practice' | 'competition',
 *     participantIds: string[],
 *   }) => void | Promise<void>,
 *   onRemoveFromEvent: (eventId: string, studentId: string) => void | Promise<void>,
 *   onDeleteEvent: (eventId: string) => void | Promise<void>,
 *   defaultParticipantIds?: string[],
 *   contextStudentId?: string | null,
 *   title?: string,
 *   hint?: string,
 *   eventListLayout?: 'flat' | 'cohortLadder',
 * }} props
 */
function SeasonCalendarPanel({
  calendarItems,
  coachEvents,
  students,
  canSave = true,
  saveBusy = false,
  saveError = '',
  onCreateEvent,
  onUpdateEvent,
  onRemoveFromEvent,
  onDeleteEvent,
  defaultParticipantIds = [],
  contextStudentId = null,
  title = 'Календарь сезона',
  hint = '',
  eventListLayout = 'flat',
}) {
  const listLayout = eventListLayout
  const [focusId, setFocusId] = useState(null)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const assignPickRef = useRef(IDLE_PICK)
  const [assignPick, setAssignPick] = useState(IDLE_PICK)
  const [hoverEndISO, setHoverEndISO] = useState(/** @type {string | null} */ (null))
  const [assignError, setAssignError] = useState('')
  const [editingEventId, setEditingEventId] = useState(/** @type {string | null} */ (null))

  const syncAssignPick = useCallback((next) => {
    assignPickRef.current = next
    setAssignPick(next)
  }, [])

  const pickPhase = assignPick.phase
  const rangeDraft = assignPick.range

  const displayRangeDraft = useMemo(() => {
    if (!rangeDraft) return null
    if (pickPhase !== 'end') return rangeDraft
    const endISO = hoverEndISO ?? rangeDraft.endISO
    const norm = normalizeIsoRange(rangeDraft.startISO, endISO)
    return { startISO: norm.dateISO, endISO: norm.dateEndISO }
  }, [rangeDraft, pickPhase, hoverEndISO])

  const nearest = useMemo(() => pickNearestFutureCompetition(calendarItems), [calendarItems])

  useEffect(() => {
    if (!focusId && nearest) setFocusId(nearest.id)
    if (focusId && !calendarItems.some((c) => c.id === focusId)) {
      setFocusId(nearest?.id ?? null)
      setEditingEventId(null)
    }
  }, [focusId, nearest, calendarItems])

  const todayIso = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }, [])

  const [selectedISO, setSelectedISO] = useState(todayIso)

  useEffect(() => {
    if (assignPickRef.current.phase !== 'idle') return
    const today = new Date()
    setViewMonth(today.getFullYear() === year ? today.getMonth() : 0)
  }, [year])

  const seasonMonthDays = useMemo(
    () => buildSeasonMonthDays(year, viewMonth, calendarItems, focusId, todayIso),
    [year, viewMonth, calendarItems, focusId, todayIso],
  )

  const monthEventCounts = useMemo(
    () => Array.from({ length: 12 }, (_, m) => countCompetitionsInMonth(year, m, calendarItems)),
    [year, calendarItems],
  )

  const monthLabel = useMemo(() => {
    const iso = `${year}-${String(viewMonth + 1).padStart(2, '0')}-01`
    return monthYearLabelRu(iso)
  }, [year, viewMonth])

  const selectedDayCompetitions = useMemo(() => {
    const row = seasonMonthDays.find((d) => d.dateISO === selectedISO)
    return row?.competitions ?? []
  }, [seasonMonthDays, selectedISO])

  const eventCounts = useMemo(() => {
    const practice = calendarItems.filter((c) => c.eventKind === 'practice').length
    const competition = calendarItems.filter((c) => c.eventKind === 'competition').length
    return { practice, competition, total: calendarItems.length }
  }, [calendarItems])

  const editingEvent = useMemo(
    () => coachEvents.find((e) => e.id === editingEventId) ?? null,
    [coachEvents, editingEventId],
  )

  const focusedCoachEvent = useMemo(() => {
    if (!focusId) return null
    const item = calendarItems.find((c) => c.id === focusId)
    if (!item?.coachEventId || isOrientirStart(item)) return null
    return coachEvents.find((e) => e.id === item.coachEventId) ?? null
  }, [focusId, calendarItems, coachEvents])

  const resetAssign = useCallback(() => {
    syncAssignPick(IDLE_PICK)
    setHoverEndISO(null)
    setAssignError('')
    setEditingEventId(null)
  }, [syncAssignPick])

  const commitRangeToForm = useCallback(
    (startISO, endISO) => {
      const norm = normalizeIsoRange(startISO, endISO)
      syncAssignPick({
        phase: 'form',
        range: { startISO: norm.dateISO, endISO: norm.dateEndISO },
      })
      setHoverEndISO(null)
      setAssignError('')
      setEditingEventId(null)
    },
    [syncAssignPick],
  )

  const goToday = useCallback(() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setYear(y)
    setViewMonth(m)
    setSelectedISO(iso)
    resetAssign()
  }, [resetAssign])

  const focusItem = useCallback(
    (c) => {
      setFocusId(c.id)
      setSelectedISO(c.dateISO)
      setViewMonth(new Date(c.dateISO + 'T12:00:00').getMonth())
      if (!c.dateISO.startsWith(String(year))) setYear(Number(c.dateISO.slice(0, 4)))
      setEditingEventId(null)
      syncAssignPick(IDLE_PICK)
      setHoverEndISO(null)
    },
    [year, syncAssignPick],
  )

  const handleDayClick = useCallback(
    (iso) => {
      setSelectedISO(iso)
      const m = new Date(iso + 'T12:00:00').getMonth()
      if (m !== viewMonth) setViewMonth(m)
      if (!iso.startsWith(String(year))) setYear(Number(iso.slice(0, 4)))

      const next = advanceAssignPickOnDay(assignPickRef.current, iso)
      syncAssignPick(next)
      setHoverEndISO(null)
      setAssignError('')
      if (next.phase === 'form') setEditingEventId(null)
    },
    [syncAssignPick, viewMonth, year],
  )

  const handleCreateSave = useCallback(
    async ({ title, kind, participantIds }) => {
      if (!rangeDraft || !canSave) return
      setAssignError('')
      const range = normalizeCompetitionRange(rangeDraft.startISO, rangeDraft.endISO)
      if (hasOverlappingCoachEvent(coachEvents, range.dateISO, range.dateEndISO, kind)) {
        setAssignError('На эти даты уже есть событие с такой категорией.')
        return
      }
      try {
        await onCreateEvent({
          title,
          kind,
          dateISO: range.dateISO,
          dateEndISO: range.dateEndISO,
          participantIds,
        })
        resetAssign()
      } catch (err) {
        setAssignError(formatFirestoreErrorMessage(err))
      }
    },
    [rangeDraft, canSave, coachEvents, onCreateEvent, resetAssign],
  )

  const handleEditSave = useCallback(
    async ({ title, kind, participantIds }) => {
      if (!editingEvent || !canSave) return
      setAssignError('')
      try {
        await onUpdateEvent(editingEvent.id, { title, kind, participantIds })
        resetAssign()
      } catch {
        setAssignError('Не удалось сохранить событие.')
      }
    },
    [editingEvent, canSave, onUpdateEvent, resetAssign],
  )

  const handleRemoveItem = useCallback(
    async (item) => {
      if (isOrientirStart(item)) return
      const eventId = item.coachEventId ?? item.id
      if (!eventId || !canSave) return
      if (contextStudentId) {
        await onRemoveFromEvent(eventId, contextStudentId)
      } else {
        await onDeleteEvent(eventId)
      }
      if (focusId === item.id) setFocusId(null)
      setEditingEventId(null)
    },
    [canSave, contextStudentId, focusId, onDeleteEvent, onRemoveFromEvent],
  )

  const displayError = assignError || saveError
  const nearestStyle = nearest ? getCalendarItemStyle(nearest) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold text-[#2c2d2e]">{title}</h2>
        <button type="button" className={vk.btnSecondary} onClick={() => setYear((y) => y - 1)} aria-label="Год назад">
          ←
        </button>
        <span className="min-w-[4rem] text-center text-[15px] font-bold tabular-nums">{year}</span>
        <button type="button" className={vk.btnSecondary} onClick={() => setYear((y) => y + 1)} aria-label="Год вперёд">
          →
        </button>
        <button type="button" className={vk.btnSecondary} onClick={goToday}>
          Сегодня
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-sm ${COACH_EVENT_KIND_STYLES.practice.bar}`} />
          Боевая практика: <strong>{eventCounts.practice}</strong>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-sm ${COACH_EVENT_KIND_STYLES.competition.bar}`} />
          Соревнования: <strong>{eventCounts.competition}</strong>
        </span>
      </div>

      {hint ? <p className="text-[11px] leading-snug text-[#818c99]">{hint}</p> : null}
      {!canSave ? <p className={vk.noticeWarn}>Войдите и выберите ученика для сохранения.</p> : null}

      {nearest && nearestStyle ? (
        <p className="text-[11px] text-[#818c99]">
          Ближайшее:{' '}
          <button
            type="button"
            className="font-semibold text-[#2d81e0] hover:underline"
            onClick={() => focusItem(nearest)}
          >
            {nearest.title || nearestStyle.label} · {formatCompetitionRange(nearest)}
          </button>
        </p>
      ) : null}

      <PrepMonthEventStrip eventCounts={monthEventCounts} activeMonth={viewMonth} onMonth={setViewMonth} />

      {pickPhase === 'end' && rangeDraft ? (
        <PrepSeasonRangeBar
          startISO={rangeDraft.startISO}
          endISO={hoverEndISO ?? rangeDraft.endISO}
          onEndISO={(raw) => setHoverEndISO(normalizeCompetitionDateISO(raw) || raw)}
          onConfirm={() => commitRangeToForm(rangeDraft.startISO, hoverEndISO ?? rangeDraft.endISO)}
          onOneDay={() => commitRangeToForm(rangeDraft.startISO, rangeDraft.startISO)}
          onCancel={resetAssign}
        />
      ) : null}

      <div className="rounded-[12px] border border-[#e7e8ec] bg-white p-3 shadow-sm">
        <PrepSeasonCalendar
          monthDays={seasonMonthDays}
          selectedISO={selectedISO}
          onSelect={handleDayClick}
          onDayHover={pickPhase === 'end' ? (iso) => setHoverEndISO(iso) : undefined}
          onDayHoverEnd={() => setHoverEndISO(null)}
          monthLabel={monthLabel}
          rangeDraft={displayRangeDraft}
          pickingEnd={pickPhase === 'end'}
          visualMode="minimal"
          emphasizeCoachDays={listLayout === 'cohortLadder'}
          focusId={focusId}
        />
      </div>

      {pickPhase === 'form' && rangeDraft ? (
        <CoachEventEditor
          mode="create"
          dateISO={rangeDraft.startISO}
          dateEndISO={rangeDraft.endISO}
          students={students}
          initialParticipantIds={defaultParticipantIds}
          onCancel={resetAssign}
          onSave={handleCreateSave}
          busy={saveBusy}
          error={displayError}
          disabled={!canSave}
        />
      ) : null}

      {focusedCoachEvent && !editingEvent && pickPhase !== 'form' ? (
        <CoachEventDetails
          event={focusedCoachEvent}
          students={students}
          onClose={() => setFocusId(null)}
          onEdit={() => setEditingEventId(focusedCoachEvent.id)}
          onDelete={async () => {
            await onDeleteEvent(focusedCoachEvent.id)
            setFocusId(null)
            setEditingEventId(null)
          }}
          busy={saveBusy}
          canSave={canSave}
        />
      ) : null}

      {editingEvent && pickPhase !== 'form' ? (
        <CoachEventEditor
          key={editingEvent.id}
          mode="edit"
          dateISO={editingEvent.dateISO}
          dateEndISO={editingEvent.dateEndISO}
          initialTitle={editingEvent.title}
          initialKind={editingEvent.kind}
          initialParticipantIds={editingEvent.participantIds}
          students={students}
          onCancel={() => setEditingEventId(null)}
          onSave={handleEditSave}
          onDelete={async () => {
            await onDeleteEvent(editingEvent.id)
            setFocusId(null)
          }}
          busy={saveBusy}
          error={displayError}
          disabled={!canSave}
        />
      ) : null}

      <PrepSeasonEventList
        items={calendarItems}
        year={year}
        focusId={focusId}
        onFocus={focusItem}
        layout={listLayout}
        orientirsCollapsedDefault={listLayout === 'cohortLadder'}
      />

      <PrepSelectedDayStarts
        dateISO={selectedISO}
        competitions={selectedDayCompetitions}
        focusId={focusId}
        onFocus={focusItem}
        onRemove={
          canSave
            ? (id) => {
                const item = selectedDayCompetitions.find((c) => c.id === id)
                if (item) void handleRemoveItem(item)
              }
            : undefined
        }
        removeBusy={saveBusy}
        removeLabel={contextStudentId ? 'Убрать из события' : 'Удалить'}
        students={students}
      />
    </div>
  )
}

export default memo(SeasonCalendarPanel)
