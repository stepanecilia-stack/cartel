import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { getCalendarItemStyle } from '../../data/coachEventKinds.js'
import { normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { formatCompetitionRange, getCompetitionMeta } from '../../data/competitionLevels.js'
import { formatFirestoreErrorMessage } from '../../utils/firestoreErrorMessage.js'
import { hasOverlappingCoachEvent } from '../../utils/coachEvents.js'
import { participationRecordByOrientirId } from '../../utils/orientirParticipation.js'
import {
  buildStudentSeasonTimeline,
  studentTimelineDateLabel,
  studentTimelineTitle,
  studentTimelineTypeDotClass,
  studentTimelineTypeLabel,
} from '../../utils/studentSeasonTimeline.js'
import { isOrientirStart } from '../../utils/plannedCompetitions.js'
import { monthYearLabelRu } from '../../utils/prepCalendarGrid.js'
import {
  buildSeasonMonthDays,
  countCompetitionsInMonth,
  formatShortDateRu,
  normalizeIsoRange,
} from '../../utils/prepSeasonCalendar.js'
import {
  applyTrainingWeekToMonthDays,
  formatStudentTrainingPlanSummary,
  normalizeStudentTrainingWeekPlan,
} from '../../utils/studentTrainingWeekPlan.js'
import { pickNearestFutureCompetition } from '../../utils/plannedCompetitions.js'
import { daysUntilCompetition } from '../../utils/competitionDate.js'
import {
  generateRecommendedBlocksForEvent,
  mergeSeasonPlanCalendarItems,
  newSeasonBlockId,
  newSeasonCheckpointId,
  normalizeSeasonBlocks,
  normalizeSeasonCheckpoints,
  removeSeasonBlocksForYear,
  removeSeasonCheckpointsForYear,
  seasonBlockToCalendarItem,
  seasonCheckpointToCalendarItem,
} from '../../utils/seasonPlan.js'
import { vk } from '../../utils/vkUi.js'
import CoachEventDetails from './CoachEventDetails.jsx'
import CoachEventEditor from './CoachEventEditor.jsx'
import OrientirEventPanel from './OrientirEventPanel.jsx'
import SeasonBlockDetails from './SeasonBlockDetails.jsx'
import SeasonBlockEditor from './SeasonBlockEditor.jsx'
import SeasonCheckpointEditor from './SeasonCheckpointEditor.jsx'
import StudentCheckpointEditor from './StudentCheckpointEditor.jsx'
import PrepMonthEventStrip from '../student/PrepMonthEventStrip.jsx'
import PrepSeasonCalendar from '../student/PrepSeasonCalendar.jsx'
import PrepSeasonEventList from '../student/PrepSeasonEventList.jsx'
import PrepSeasonPlanList from '../student/PrepSeasonPlanList.jsx'
import PrepSelectedDayStarts from '../student/PrepSelectedDayStarts.jsx'
import SeasonCoachGuide from './SeasonCoachGuide.jsx'
import FederationTournamentHints from './FederationTournamentHints.jsx'
import { buildCartelCoachDirective } from '../../utils/cartelCoachDirective.js'
import { buildSeasonCoachView } from '../../utils/seasonCoachView.js'

/** @typedef {import('../../utils/coachEvents.js').CoachEvent} CoachEvent */

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
 *     dateISO: string,
 *     dateEndISO: string,
 *     participantIds: string[],
 *   }) => void | Promise<void>,
 *   onRemoveFromEvent: (eventId: string, studentId: string) => void | Promise<void>,
 *   onDeleteEvent: (eventId: string) => void | Promise<void>,
 *   defaultParticipantIds?: string[],
 *   contextStudentId?: string | null,
 *   title?: string,
 *   hint?: string,
 *   eventListLayout?: 'flat' | 'cohortLadder',
 *   separateOrientirsBlock?: boolean,
 *   orientirParticipations?: import('../../utils/orientirParticipation.js').OrientirParticipation[],
 *   onSaveOrientirParticipants?: (
 *     orientirId: string,
 *     payload: {
 *       participantIds: string[],
 *       externalCamp: import('../../utils/orientirParticipation.js').OrientirExternalCamp | null,
 *     },
 *   ) => void | Promise<void>,
 *   seasonBlocks?: import('../../utils/seasonPlan.js').SeasonBlock[],
 *   seasonCheckpoints?: import('../../utils/seasonPlan.js').SeasonCheckpoint[],
 *   onSaveSeasonPlan?: (payload: {
 *     blocks: import('../../utils/seasonPlan.js').SeasonBlock[],
 *     checkpoints: import('../../utils/seasonPlan.js').SeasonCheckpoint[],
 *   }) => void | Promise<void>,
 *   planSaveBusy?: boolean,
 *   planSaveError?: string,
 *   ageInt?: number | null,
 *   student?: Record<string, unknown> | null,
 *   allNorms?: object[],
 *   kd?: number,
 *   techniquePercent?: number,
 *   atomsAtSkill?: number,
 *   totalAtoms?: number,
 *   level1Atoms?: object[],
 *   effectiveKsr?: number,
 *   onCartelStageChange?: (
 *     stage: import('../../data/cartelParticipation.js').CartelStageId,
 *     opts?: { earlyAccess?: boolean, note?: string },
 *   ) => void | Promise<void>,
 *   onOpenTab?: (tabId: string) => void,
 *   onAddSparring?: () => void | Promise<void>,
 *   onAddMatch?: () => void | Promise<void>,
 *   onToggleSpecialPass?: () => void | Promise<void>,
 *   onSaveCartelDocuments?: (docs: import('../../data/cartelDocuments.js').CartelDocumentsMap) => void | Promise<void>,
 *   stageSaveBusy?: boolean,
 *   shareReadOnly?: boolean,
 *   cleanCalendar?: boolean,
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
  separateOrientirsBlock = false,
  orientirParticipations = [],
  onSaveOrientirParticipants,
  seasonBlocks: seasonBlocksProp = [],
  seasonCheckpoints: seasonCheckpointsProp = [],
  onSaveSeasonPlan,
  planSaveBusy = false,
  planSaveError = '',
  ageInt = null,
  student = null,
  allNorms = [],
  kd = 0.25,
  techniquePercent = 0,
  atomsAtSkill = 0,
  totalAtoms = 0,
  level1Atoms = [],
  effectiveKsr = 0,
  onCartelStageChange,
  onOpenTab,
  onAddSparring,
  onAddMatch,
  onToggleSpecialPass,
  onSaveCartelDocuments,
  stageSaveBusy = false,
  shareReadOnly = false,
  cleanCalendar = false,
}) {
  const listLayout = eventListLayout
  const isStudentSeason = Boolean(contextStudentId)
  const isPristineCalendar = isStudentSeason || cleanCalendar
  const [focusId, setFocusId] = useState(null)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [assignError, setAssignError] = useState('')
  const [editingEventId, setEditingEventId] = useState(/** @type {string | null} */ (null))
  const [editingBlockId, setEditingBlockId] = useState(/** @type {string | null} */ (null))
  const [editingCheckpointId, setEditingCheckpointId] = useState(/** @type {string | null} */ (null))
  const [planCreateMode, setPlanCreateMode] = useState(
    /** @type {'block' | 'checkpoint' | null} */ (null),
  )
  const [createRange, setCreateRange] = useState(
    /** @type {{ startISO: string, endISO: string } | null} */ (null),
  )
  const [planCreateRange, setPlanCreateRange] = useState(
    /** @type {{ startISO: string, endISO: string } | null} */ (null),
  )

  const blocks = useMemo(() => normalizeSeasonBlocks(seasonBlocksProp), [seasonBlocksProp])
  const checkpoints = useMemo(
    () => normalizeSeasonCheckpoints(seasonCheckpointsProp),
    [seasonCheckpointsProp],
  )

  const mergedCalendarItems = useMemo(
    () => mergeSeasonPlanCalendarItems(calendarItems, blocks, checkpoints),
    [calendarItems, blocks, checkpoints],
  )

  const viewCalendarItems = useMemo(
    () => (isPristineCalendar ? calendarItems : mergedCalendarItems),
    [isPristineCalendar, calendarItems, mergedCalendarItems],
  )

  const nearest = useMemo(
    () => (isPristineCalendar ? null : pickNearestFutureCompetition(calendarItems)),
    [isPristineCalendar, calendarItems],
  )

  const formatDaysUntilLabel = useCallback((dateISO) => {
    if (!dateISO) return ''
    const days = daysUntilCompetition(dateISO)
    if (days == null) return ''
    if (days === 0) return ' · сегодня'
    if (days === 1) return ' · завтра'
    if (days > 1) return ` · через ${days} дн.`
    return ' · идёт сейчас'
  }, [])

  const studentTimeline = useMemo(() => {
    if (!isStudentSeason || !contextStudentId) return []
    return buildStudentSeasonTimeline(viewCalendarItems, contextStudentId)
  }, [isStudentSeason, contextStudentId, viewCalendarItems])

  useEffect(() => {
    if (isPristineCalendar) return
    if (!focusId && nearest) setFocusId(nearest.id)
    if (focusId && !mergedCalendarItems.some((c) => c.id === focusId)) {
      setFocusId(nearest?.id ?? null)
      setEditingEventId(null)
      setEditingBlockId(null)
      setEditingCheckpointId(null)
    }
  }, [isPristineCalendar, focusId, nearest, mergedCalendarItems])

  useEffect(() => {
    if (!isPristineCalendar) return
    if (focusId && !viewCalendarItems.some((c) => c.id === focusId)) {
      setFocusId(null)
    }
  }, [isPristineCalendar, focusId, viewCalendarItems])

  const todayIso = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }, [])

  const [selectedISO, setSelectedISO] = useState(todayIso)

  const trainingWeekPlan = useMemo(
    () => normalizeStudentTrainingWeekPlan(student?.studentTrainingWeekPlan),
    [student?.studentTrainingWeekPlan],
  )

  useEffect(() => {
    const today = new Date()
    setViewMonth(today.getFullYear() === year ? today.getMonth() : 0)
  }, [year])

  useEffect(() => {
    if (!isStudentSeason || !trainingWeekPlan?.weekStartISO) return
    const iso = trainingWeekPlan.weekStartISO
    const planYear = Number(iso.slice(0, 4))
    const planMonth = new Date(`${iso}T12:00:00`).getMonth()
    setYear(planYear)
    setViewMonth(planMonth)
  }, [isStudentSeason, trainingWeekPlan?.weekStartISO, trainingWeekPlan?.submittedAt])

  const seasonMonthDays = useMemo(() => {
    const base = buildSeasonMonthDays(year, viewMonth, viewCalendarItems, focusId, todayIso)
    if (!isStudentSeason || !trainingWeekPlan) return base
    return applyTrainingWeekToMonthDays(base, trainingWeekPlan)
  }, [year, viewMonth, viewCalendarItems, focusId, todayIso, isStudentSeason, trainingWeekPlan])

  const monthEventCounts = useMemo(
    () =>
      isStudentSeason
        ? Array(12).fill(0)
        : Array.from({ length: 12 }, (_, m) => countCompetitionsInMonth(year, m, calendarItems)),
    [year, calendarItems, isStudentSeason],
  )

  const monthLabel = useMemo(() => {
    const iso = `${year}-${String(viewMonth + 1).padStart(2, '0')}-01`
    return monthYearLabelRu(iso)
  }, [year, viewMonth])

  const selectedDayCompetitions = useMemo(() => {
    const row = seasonMonthDays.find((d) => d.dateISO === selectedISO)
    return (row?.competitions ?? []).filter(
      (c) => c.planKind !== 'block' && c.planKind !== 'checkpoint',
    )
  }, [seasonMonthDays, selectedISO])

  const selectedDayCheckpoints = useMemo(
    () => checkpoints.filter((c) => c.dateISO === selectedISO),
    [checkpoints, selectedISO],
  )

  const editingEvent = useMemo(
    () => coachEvents.find((e) => e.id === editingEventId) ?? null,
    [coachEvents, editingEventId],
  )

  const focusedCalendarItem = useMemo(
    () => mergedCalendarItems.find((c) => c.id === focusId) ?? null,
    [mergedCalendarItems, focusId],
  )

  const orientirRecordsById = useMemo(
    () => participationRecordByOrientirId(orientirParticipations),
    [orientirParticipations],
  )

  const focusedOrientir = useMemo(() => {
    if (!focusedCalendarItem) return null
    if (isOrientirStart(focusedCalendarItem)) return focusedCalendarItem
    if (focusedCalendarItem.planKind === 'external_camp' && focusedCalendarItem.anchorOrientirId) {
      return mergedCalendarItems.find((c) => c.id === focusedCalendarItem.anchorOrientirId) ?? null
    }
    return null
  }, [focusedCalendarItem, mergedCalendarItems])

  const focusedOrientirRecord = useMemo(
    () => (focusedOrientir ? orientirRecordsById[focusedOrientir.id] ?? null : null),
    [focusedOrientir, orientirRecordsById],
  )

  const focusedCoachEvent = useMemo(() => {
    if (!focusedCalendarItem?.coachEventId || isOrientirStart(focusedCalendarItem)) return null
    return coachEvents.find((e) => e.id === focusedCalendarItem.coachEventId) ?? null
  }, [focusedCalendarItem, coachEvents])

  const focusedBlock = useMemo(
    () => (focusId ? blocks.find((b) => b.id === focusId) ?? null : null),
    [focusId, blocks],
  )

  const focusedCheckpoint = useMemo(
    () => (focusId ? checkpoints.find((c) => c.id === focusId) ?? null : null),
    [focusId, checkpoints],
  )

  const mesoAnchorItem = useMemo(() => {
    if (!focusedCalendarItem || isOrientirStart(focusedCalendarItem)) return null
    if (focusedCalendarItem.coachEventId) return focusedCalendarItem
    return null
  }, [focusedCalendarItem])

  const closeCreateForm = useCallback(() => {
    setCreateRange(null)
    setAssignError('')
  }, [])

  const closePlanCreate = useCallback(() => {
    setPlanCreateMode(null)
    setPlanCreateRange(null)
    setAssignError('')
  }, [])

  const openCheckpointCreate = useCallback(() => {
    closeCreateForm()
    setEditingCheckpointId(null)
    setEditingBlockId(null)
    setPlanCreateRange({ startISO: selectedISO, endISO: selectedISO })
    setPlanCreateMode('checkpoint')
  }, [selectedISO, closeCreateForm])

  const persistPlan = useCallback(
    async (
      nextBlocks,
      nextCheckpoints,
    ) => {
      if (!onSaveSeasonPlan || !canSave) return
      setAssignError('')
      try {
        await onSaveSeasonPlan({
          blocks: normalizeSeasonBlocks(nextBlocks),
          checkpoints: normalizeSeasonCheckpoints(nextCheckpoints),
        })
        closePlanCreate()
        setEditingBlockId(null)
        setEditingCheckpointId(null)
      } catch (err) {
        setAssignError(formatFirestoreErrorMessage(err))
        throw err
      }
    },
    [onSaveSeasonPlan, canSave, closePlanCreate],
  )

  const setCheckpointCalendarOnly = useCallback(
    async (checkpointId, calendarOnly) => {
      await persistPlan(
        blocks,
        checkpoints.map((c) => (c.id === checkpointId ? { ...c, calendarOnly } : c)),
      )
    },
    [blocks, checkpoints, persistPlan],
  )

  const openCreateForm = useCallback(
    (iso) => {
      const norm = normalizeIsoRange(iso, iso)
      setCreateRange({ startISO: norm.dateISO, endISO: norm.dateEndISO })
      setEditingEventId(null)
      setAssignError('')
    },
    [],
  )

  const goToday = useCallback(() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setYear(y)
    setViewMonth(m)
    setSelectedISO(iso)
    closeCreateForm()
  }, [closeCreateForm])

  const focusItem = useCallback(
    (c) => {
      const isExternalCamp = c.planKind === 'external_camp' && c.anchorOrientirId
      const focusTargetId = isExternalCamp ? c.anchorOrientirId : c.id
      const dateISO = c.dateISO
      setFocusId(focusTargetId)
      setSelectedISO(dateISO)
      setViewMonth(new Date(dateISO + 'T12:00:00').getMonth())
      if (!dateISO.startsWith(String(year))) setYear(Number(dateISO.slice(0, 4)))
      setEditingEventId(null)
      setEditingBlockId(null)
      setEditingCheckpointId(null)
      closeCreateForm()
      closePlanCreate()
    },
    [year, closeCreateForm, closePlanCreate],
  )

  const focusBlock = useCallback(
    (block) => {
      focusItem(seasonBlockToCalendarItem(block))
    },
    [focusItem],
  )

  const focusCheckpoint = useCallback(
    (cp) => {
      focusItem(seasonCheckpointToCalendarItem(cp))
    },
    [focusItem],
  )

  const handleDayClick = useCallback(
    (iso) => {
      setSelectedISO(iso)
      const m = new Date(iso + 'T12:00:00').getMonth()
      if (m !== viewMonth) setViewMonth(m)
      if (!iso.startsWith(String(year))) setYear(Number(iso.slice(0, 4)))
    },
    [viewMonth, year],
  )

  const handleCreateSave = useCallback(
    async ({ title, kind, dateISO, dateEndISO, participantIds }) => {
      if (!canSave) return
      setAssignError('')
      const range = normalizeCompetitionRange(dateISO, dateEndISO)
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
        closeCreateForm()
      } catch (err) {
        setAssignError(formatFirestoreErrorMessage(err))
      }
    },
    [canSave, coachEvents, onCreateEvent, closeCreateForm],
  )

  const handleEditSave = useCallback(
    async ({ title, kind, dateISO, dateEndISO, participantIds }) => {
      if (!editingEvent || !canSave) return
      setAssignError('')
      const range = normalizeCompetitionRange(dateISO, dateEndISO)
      if (
        hasOverlappingCoachEvent(coachEvents, range.dateISO, range.dateEndISO, kind, editingEvent.id)
      ) {
        setAssignError('На эти даты уже есть событие с такой категорией.')
        return
      }
      try {
        await onUpdateEvent(editingEvent.id, {
          title,
          kind,
          dateISO: range.dateISO,
          dateEndISO: range.dateEndISO,
          participantIds,
        })
        setEditingEventId(null)
        setAssignError('')
        setFocusId(editingEvent.id)
        setSelectedISO(range.dateISO)
        const month = new Date(`${range.dateISO}T12:00:00`).getMonth()
        setViewMonth(month)
        const eventYear = Number(range.dateISO.slice(0, 4))
        if (eventYear !== year) setYear(eventYear)
      } catch {
        setAssignError('Не удалось сохранить событие.')
      }
    },
    [editingEvent, canSave, coachEvents, onUpdateEvent, year],
  )

  const handleRemoveItem = useCallback(
    async (item) => {
      if (isOrientirStart(item) || item.planKind === 'external_camp') return
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

  const cartelDirective = useMemo(
    () =>
      buildCartelCoachDirective({
        student,
        allNorms,
        confirmedStage: student?.cartelStage,
        kd,
        techniquePercent,
        atomsAtSkill,
        totalAtoms,
        effectiveKsr,
        seasonCheckpoints: checkpoints,
        seasonBlocks: blocks,
        calendarItems,
        year,
        ageInt,
        focusCompetitionId: focusId,
        selectedISO,
      }),
    [
      student,
      allNorms,
      kd,
      techniquePercent,
      atomsAtSkill,
      totalAtoms,
      effectiveKsr,
      checkpoints,
      blocks,
      calendarItems,
      year,
      ageInt,
      focusId,
      selectedISO,
    ],
  )

  const coachView = cartelDirective.seasonView

  const handleApplyRecommendedPlan = useCallback(async () => {
    const focus = coachView.focus
    if (!focus || !canSave || !onSaveSeasonPlan) return
    const anchorId = focus.coachEventId ?? focus.id
    const ok = window.confirm(
      `Расставить подготовку к «${focus.title || 'старту'}» на календаре? Три периода (база → темп → спарринги) посчитает приложение. Старые полосы этого старта заменятся.`,
    )
    if (!ok) return
    const nextBlocks = generateRecommendedBlocksForEvent({
      anchorEventId: anchorId,
      eventTitle: focus.title || 'Старт',
      fightDateISO: focus.dateISO,
      existingBlocks: blocks,
      todayIso,
    })
    await persistPlan(nextBlocks, checkpoints)
  }, [coachView.focus, canSave, onSaveSeasonPlan, blocks, checkpoints, persistPlan, todayIso])

  const handleClearPlanYear = useCallback(async () => {
    if (!canSave) return
    const ok = window.confirm(`Удалить все блоки и контрольные точки за ${year}?`)
    if (!ok) return
    await persistPlan(removeSeasonBlocksForYear(blocks, year), removeSeasonCheckpointsForYear(checkpoints, year))
    setFocusId(null)
  }, [canSave, year, blocks, checkpoints, persistPlan])

  const handleClearAllPlan = useCallback(async () => {
    if (!canSave || (blocks.length === 0 && checkpoints.length === 0)) return
    const ok = window.confirm('Удалить все блоки и контрольные точки?')
    if (!ok) return
    await persistPlan([], [])
    setFocusId(null)
  }, [canSave, blocks.length, checkpoints.length, persistPlan])

  const displayError = assignError || saveError || planSaveError
  const planBusy = planSaveBusy
  return (
    <div className="space-y-3">
      {!canSave && !shareReadOnly ? (
        <p className={vk.noticeWarn}>Выберите ученика, чтобы сохранять сезон.</p>
      ) : null}

      {student ? (
        <SeasonCoachGuide
          student={student}
          allNorms={allNorms}
          kd={kd}
          techniquePercent={techniquePercent}
          atomsAtSkill={atomsAtSkill}
          totalAtoms={totalAtoms}
          level1Atoms={level1Atoms}
          effectiveKsr={effectiveKsr}
          year={year}
          ageInt={ageInt}
          calendarItems={calendarItems}
          focusCompetitionId={focusId}
          selectedISO={selectedISO}
          seasonBlocks={blocks}
          seasonCheckpoints={checkpoints}
          canSave={canSave}
          onOpenTab={onOpenTab}
          onAddSparring={onAddSparring}
          onAddMatch={onAddMatch}
          onToggleSpecialPass={onToggleSpecialPass}
          onSaveCartelDocuments={onSaveCartelDocuments}
          onApplyRecommendedPlan={onSaveSeasonPlan ? handleApplyRecommendedPlan : undefined}
          onAddEvent={() => openCreateForm(selectedISO)}
          stageBusy={stageSaveBusy}
          applyBusy={planBusy}
          shareReadOnly={shareReadOnly}
        />
      ) : null}

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

      {cleanCalendar && hint ? (
        <p className="text-[13px] leading-snug text-[#818c99]">{hint}</p>
      ) : null}

      {contextStudentId ? (
        <div className="space-y-2">
          {studentTimeline.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-[#e7e8ec] bg-white shadow-sm">
              {studentTimeline.map((entry, index) => {
                const daysLabel = formatDaysUntilLabel(entry.dateISO)
                const active = focusId === entry.item.id
                const rowClass = [
                  'flex w-full items-center gap-2 px-2.5 py-2 transition',
                  index > 0 ? 'border-t border-[#e7e8ec]' : '',
                  active ? 'bg-sky-50' : 'hover:bg-[#f7f8fa]',
                ].join(' ')

                if (entry.kind === 'checkpoint') {
                  return (
                    <div key={entry.item.id} className={rowClass}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCheckpointId(entry.item.id)
                          focusItem(entry.item)
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <span
                          className={[
                            'h-2 w-2 shrink-0 rounded-full',
                            studentTimelineTypeDotClass(entry),
                          ].join(' ')}
                          aria-hidden
                        />
                        <span className="text-[13px] font-medium text-[#2c2d2e]">
                          {studentTimelineTitle(entry)}
                        </span>
                      </button>
                      <label
                        className="flex shrink-0 items-center"
                        title="Только в календаре"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="accent-[#2d81e0]"
                          disabled={planBusy}
                          onChange={(e) =>
                            void setCheckpointCalendarOnly(entry.item.id, e.target.checked)
                          }
                        />
                      </label>
                    </div>
                  )
                }

                return (
                  <button
                    key={entry.item.id}
                    type="button"
                    onClick={() => focusItem(entry.item)}
                    className={[rowClass, 'gap-2.5 text-left'].join(' ')}
                  >
                    <span
                      className={[
                        'h-2 w-2 shrink-0 rounded-full',
                        studentTimelineTypeDotClass(entry),
                      ].join(' ')}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-[#2c2d2e]">
                        {studentTimelineTitle(entry)}
                      </span>
                      <span className="block text-[11px] text-[#818c99]">
                        {studentTimelineTypeLabel(entry)} · {studentTimelineDateLabel(entry)}
                        {daysLabel}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2 text-[12px] text-[#818c99]">
              Нет предстоящих событий.
            </p>
          )}
          {canSave && onSaveSeasonPlan && !planCreateMode && !editingCheckpointId ? (
            <button
              type="button"
              className={vk.btnSecondary}
              disabled={planBusy}
              onClick={openCheckpointCreate}
            >
              + Контрольная точка на {formatShortDateRu(selectedISO)}
            </button>
          ) : null}
        </div>
      ) : (
        !isPristineCalendar ? (
          <p className="text-[12px] text-[#818c99]">
            Точки — старты · зелёная — подготовка клуба · фиолетовая полоска — сборы (край / федерация).
          </p>
        ) : null
      )}

      {isStudentSeason && planCreateMode === 'checkpoint' && planCreateRange && onSaveSeasonPlan ? (
        <StudentCheckpointEditor
          key={`cp-create-student-${planCreateRange.startISO}`}
          dateISO={planCreateRange.startISO}
          onCancel={closePlanCreate}
          onSave={async (payload) => {
            await persistPlan(blocks, [
              ...checkpoints,
              {
                id: newSeasonCheckpointId(),
                title: payload.title,
                kind: 'other',
                dateISO: planCreateRange.startISO,
                done: false,
                calendarOnly: payload.calendarOnly,
              },
            ])
          }}
          busy={planBusy}
          disabled={!canSave}
        />
      ) : null}

      {isStudentSeason && editingCheckpointId && onSaveSeasonPlan
        ? (() => {
            const cp = checkpoints.find((row) => row.id === editingCheckpointId)
            if (!cp) return null
            return (
              <StudentCheckpointEditor
                key={cp.id}
                dateISO={cp.dateISO}
                initialTitle={cp.title}
                initialCalendarOnly={cp.calendarOnly}
                onCancel={() => setEditingCheckpointId(null)}
                onSave={async (payload) => {
                  await persistPlan(
                    blocks,
                    checkpoints.map((row) =>
                      row.id === cp.id
                        ? {
                            ...row,
                            title: payload.title,
                            calendarOnly: payload.calendarOnly,
                          }
                        : row,
                    ),
                  )
                }}
                onDelete={async () => {
                  await persistPlan(
                    blocks,
                    checkpoints.filter((row) => row.id !== cp.id),
                  )
                  setFocusId(null)
                }}
                busy={planBusy}
                disabled={!canSave}
              />
            )
          })()
        : null}

      {!isStudentSeason ? (
        <PrepMonthEventStrip eventCounts={monthEventCounts} activeMonth={viewMonth} onMonth={setViewMonth} />
      ) : null}

      {isStudentSeason && trainingWeekPlan ? (
        <div className="rounded-lg border border-[#2d81e0]/25 bg-[#ecf3fc] px-3 py-2 text-[13px] text-[#2c2d2e]">
          <span className="font-semibold text-[#2d81e0]">График ученика: </span>
          {formatStudentTrainingPlanSummary(trainingWeekPlan)}
        </div>
      ) : null}

      <div className="rounded-[12px] border border-[#e7e8ec] bg-white p-3 shadow-sm">
        <PrepSeasonCalendar
          monthDays={seasonMonthDays}
          selectedISO={selectedISO}
          onSelect={handleDayClick}
          monthLabel={monthLabel}
          visualMode="minimal"
          emphasizeCoachDays={listLayout === 'cohortLadder'}
          focusId={focusId}
          showMacroPeriod={!isPristineCalendar}
          trainingScheduleOnly={isStudentSeason}
          emptyCalendarMode={cleanCalendar}
        />
      </div>

      {isStudentSeason && selectedDayCheckpoints.length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-[#e7e8ec] bg-white shadow-sm">
          {selectedDayCheckpoints.map((cp, index) => (
            <li
              key={cp.id}
              className={[
                'flex items-center gap-2 px-2.5 py-2',
                index > 0 ? 'border-t border-[#e7e8ec]' : '',
              ].join(' ')}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left text-[13px] font-medium text-[#2c2d2e] hover:text-[#2d81e0]"
                onClick={() => {
                  setEditingCheckpointId(cp.id)
                  focusCheckpoint(cp)
                }}
              >
                {cp.title}
              </button>
              <label
                className="flex shrink-0 items-center"
                title="Только в календаре"
              >
                <input
                  type="checkbox"
                  className="accent-[#2d81e0]"
                  checked={cp.calendarOnly}
                  disabled={planBusy}
                  onChange={(e) => void setCheckpointCalendarOnly(cp.id, e.target.checked)}
                />
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      {separateOrientirsBlock && !isPristineCalendar ? (
        <PrepSeasonEventList
          items={calendarItems}
          year={year}
          focusId={focusId}
          onFocus={focusItem}
          layout="orientirsOnly"
        />
      ) : null}

      {canSave && onSaveSeasonPlan && !isStudentSeason ? (
        <details className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2">
          <summary className="cursor-pointer text-[12px] font-medium text-[#818c99]">
            Дополнительно: свой блок, контрольная точка, очистка
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={vk.btnSecondary}
              disabled={planBusy}
              onClick={() => {
                const norm = normalizeIsoRange(selectedISO, selectedISO)
                setPlanCreateRange({ startISO: norm.dateISO, endISO: norm.dateEndISO })
                setPlanCreateMode('block')
                setEditingBlockId(null)
                closeCreateForm()
              }}
            >
              Свой блок
            </button>
            <button
              type="button"
              className={vk.btnSecondary}
              disabled={planBusy}
              onClick={() => {
                setPlanCreateRange({ startISO: selectedISO, endISO: selectedISO })
                setPlanCreateMode('checkpoint')
                setEditingCheckpointId(null)
                closeCreateForm()
              }}
            >
              Контрольная точка
            </button>
            {blocks.length > 0 || checkpoints.length > 0 ? (
              <>
                <button
                  type="button"
                  className="text-[12px] text-rose-600"
                  disabled={planBusy}
                  onClick={() => void handleClearPlanYear()}
                >
                  Очистить план за {year}
                </button>
                <button
                  type="button"
                  className="text-[12px] text-rose-600"
                  disabled={planBusy}
                  onClick={() => void handleClearAllPlan()}
                >
                  Очистить весь план
                </button>
              </>
            ) : null}
          </div>
        </details>
      ) : null}

      {createRange ? (
        <CoachEventEditor
          key={`create-${createRange.startISO}`}
          mode="create"
          dateISO={createRange.startISO}
          dateEndISO={createRange.endISO}
          students={students}
          initialParticipantIds={defaultParticipantIds}
          onCancel={closeCreateForm}
          onSave={handleCreateSave}
          busy={saveBusy}
          error={displayError}
          disabled={!canSave}
        />
      ) : null}

      {planCreateMode === 'block' && planCreateRange && onSaveSeasonPlan && !isStudentSeason ? (
        <SeasonBlockEditor
          key={`block-create-${planCreateRange.startISO}`}
          mode="create"
          dateISO={planCreateRange.startISO}
          dateEndISO={planCreateRange.endISO}
          onCancel={closePlanCreate}
          onSave={async (payload) => {
            await persistPlan(
              [
                ...blocks,
                {
                  id: newSeasonBlockId(),
                  title: payload.title,
                  phase: payload.phase,
                  dateISO: payload.dateISO,
                  dateEndISO: payload.dateEndISO,
                  anchorEventId: mesoAnchorItem?.coachEventId ?? mesoAnchorItem?.id ?? null,
                  done: payload.done,
                },
              ],
              checkpoints,
            )
          }}
          busy={planBusy}
          error={displayError}
          disabled={!canSave}
        />
      ) : null}

      {planCreateMode === 'checkpoint' && planCreateRange && onSaveSeasonPlan && !isStudentSeason ? (
        <SeasonCheckpointEditor
          key={`cp-create-${planCreateRange.startISO}`}
          mode="create"
          dateISO={planCreateRange.startISO}
          onCancel={closePlanCreate}
          onSave={async (payload) => {
            await persistPlan(blocks, [
              ...checkpoints,
              {
                id: newSeasonCheckpointId(),
                title: payload.title,
                kind: payload.kind,
                dateISO: payload.dateISO,
                done: payload.done,
              },
            ])
          }}
          busy={planBusy}
          error={displayError}
          disabled={!canSave}
        />
      ) : null}

      {focusedBlock && !editingBlockId && !planCreateMode && !isStudentSeason ? (
        <SeasonBlockDetails
          block={focusedBlock}
          onClose={() => setFocusId(null)}
          onEdit={() => setEditingBlockId(focusedBlock.id)}
          onToggleDone={async (done) => {
            await persistPlan(
              blocks.map((b) => (b.id === focusedBlock.id ? { ...b, done } : b)),
              checkpoints,
            )
          }}
          onDelete={async () => {
            await persistPlan(
              blocks.filter((b) => b.id !== focusedBlock.id),
              checkpoints,
            )
            setFocusId(null)
          }}
          busy={planBusy}
          canSave={canSave && Boolean(onSaveSeasonPlan)}
        />
      ) : null}

      {editingBlockId && onSaveSeasonPlan && !isStudentSeason ? (
        (() => {
          const block = blocks.find((b) => b.id === editingBlockId)
          if (!block) return null
          return (
            <SeasonBlockEditor
              key={block.id}
              mode="edit"
              dateISO={block.dateISO}
              dateEndISO={block.dateEndISO}
              initialTitle={block.title}
              initialPhase={block.phase}
              initialDone={block.done}
              onCancel={() => setEditingBlockId(null)}
              onSave={async (payload) => {
                await persistPlan(
                  blocks.map((b) =>
                    b.id === block.id
                      ? {
                          ...b,
                          title: payload.title,
                          phase: payload.phase,
                          dateISO: payload.dateISO,
                          dateEndISO: payload.dateEndISO,
                          done: payload.done,
                        }
                      : b,
                  ),
                  checkpoints,
                )
              }}
              onDelete={async () => {
                await persistPlan(
                  blocks.filter((b) => b.id !== block.id),
                  checkpoints,
                )
                setFocusId(null)
              }}
              busy={planBusy}
              error={displayError}
              disabled={!canSave}
            />
          )
        })()
      ) : null}

      {editingCheckpointId && onSaveSeasonPlan && !isStudentSeason ? (
        (() => {
          const cp = checkpoints.find((c) => c.id === editingCheckpointId)
          if (!cp) return null
          return (
            <SeasonCheckpointEditor
              key={cp.id}
              mode="edit"
              dateISO={cp.dateISO}
              initialTitle={cp.title}
              initialKind={cp.kind}
              initialDone={cp.done}
              onCancel={() => setEditingCheckpointId(null)}
              onSave={async (payload) => {
                await persistPlan(
                  blocks,
                  checkpoints.map((row) =>
                    row.id === cp.id
                      ? {
                          ...row,
                          title: payload.title,
                          kind: payload.kind,
                          dateISO: payload.dateISO,
                          done: payload.done,
                        }
                      : row,
                  ),
                )
              }}
              onDelete={async () => {
                await persistPlan(
                  blocks,
                  checkpoints.filter((row) => row.id !== cp.id),
                )
                setFocusId(null)
              }}
              busy={planBusy}
              error={displayError}
              disabled={!canSave}
            />
          )
        })()
      ) : null}

      {focusedCheckpoint && !editingCheckpointId && !planCreateMode && !isStudentSeason ? (
        <div className="rounded-lg border p-2.5">
          <p className="text-[12px] font-semibold text-[#2c2d2e]">{focusedCheckpoint.title}</p>
          <p className="text-[11px] text-[#818c99]">{focusedCheckpoint.dateISO}</p>
          {canSave && onSaveSeasonPlan ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={vk.btnPrimary}
                onClick={() => setEditingCheckpointId(focusedCheckpoint.id)}
              >
                Изменить
              </button>
              <button
                type="button"
                className="text-[13px] text-rose-600"
                onClick={() =>
                  void persistPlan(
                    blocks,
                    checkpoints.filter((c) => c.id !== focusedCheckpoint.id),
                  ).then(() => setFocusId(null))
                }
              >
                Удалить
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {      focusedOrientir &&
      onSaveOrientirParticipants &&
      !isPristineCalendar &&
      !editingEvent &&
      !createRange &&
      !focusedBlock &&
      !focusedCheckpoint ? (
        <OrientirEventPanel
          item={focusedOrientir}
          students={students}
          participantIds={
            focusedOrientirRecord?.participantIds ?? focusedOrientir.participantIds ?? []
          }
          externalCamp={focusedOrientirRecord?.externalCamp ?? null}
          onClose={() => setFocusId(null)}
          onSave={(payload) => onSaveOrientirParticipants(focusedOrientir.id, payload)}
          busy={saveBusy}
          canSave={canSave}
        />
      ) : null}

      {focusedCoachEvent && !editingEvent && !createRange && !focusedBlock && !focusedCheckpoint ? (
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

      {editingEvent && !createRange ? (
        <CoachEventEditor
          key={`${editingEvent.id}-${editingEvent.dateISO}-${editingEvent.dateEndISO}`}
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

      {!isPristineCalendar ? (
      <details className="rounded-lg border border-[#e7e8ec] bg-white px-2.5 py-2">
        <summary className="cursor-pointer text-[12px] font-medium text-[#2c2d2e]">
          Все старты и периоды списком
        </summary>
        <div className="mt-2 space-y-2">
      <PrepSeasonEventList
        items={calendarItems}
        year={year}
        focusId={focusId}
        onFocus={focusItem}
        layout={separateOrientirsBlock && listLayout === 'cohortLadder' ? 'coachOnly' : listLayout}
        orientirsCollapsedDefault={listLayout === 'cohortLadder' && !separateOrientirsBlock}
        showOrientirsInLadder={!separateOrientirsBlock}
      />

      {onSaveSeasonPlan && !isStudentSeason ? (
        <PrepSeasonPlanList
          blocks={blocks}
          checkpoints={checkpoints}
          year={year}
          focusId={focusId}
          onFocusBlock={focusBlock}
          onFocusCheckpoint={focusCheckpoint}
          onDeleteBlock={
            canSave
              ? (id) =>
                  void persistPlan(
                    blocks.filter((b) => b.id !== id),
                    checkpoints,
                  ).then(() => {
                    if (focusId === id) setFocusId(null)
                  })
              : undefined
          }
          onDeleteCheckpoint={
            canSave
              ? (id) =>
                  void persistPlan(
                    blocks,
                    checkpoints.filter((c) => c.id !== id),
                  ).then(() => {
                    if (focusId === id) setFocusId(null)
                  })
              : undefined
          }
          deleteBusy={planBusy}
        />
      ) : null}
        </div>
      </details>
      ) : null}

      {!isStudentSeason ? (
      <>
        {canSave && cleanCalendar ? (
          <button
            type="button"
            className={`${vk.btnPrimary} w-full sm:w-auto`}
            onClick={() => openCreateForm(selectedISO)}
          >
            + Событие на {formatShortDateRu(selectedISO)}
          </button>
        ) : null}
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
      </>
      ) : null}

      {cleanCalendar ? <FederationTournamentHints /> : null}

    </div>
  )
}

export default memo(SeasonCalendarPanel)
