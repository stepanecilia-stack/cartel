import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { SEASON_TASK_KIND_STYLES } from '../../data/seasonTaskKinds.js'
import { formatFirestoreErrorMessage } from '../../utils/firestoreErrorMessage.js'
import { monthYearLabelRu } from '../../utils/prepCalendarGrid.js'
import {
  buildSeasonMonthDays,
  formatShortDateRu,
  normalizeIsoRange,
} from '../../utils/prepSeasonCalendar.js'
import {
  countSeasonTasksByCategoryInMonth,
  countSeasonTasksForYear,
  countSeasonTasksInMonth,
  newSeasonTaskId,
  normalizeSeasonTasks,
  removeSeasonTasksForYear,
  seasonTasksToCalendarItems,
} from '../../utils/seasonTasks.js'
import { vk } from '../../utils/vkUi.js'
import SeasonTaskDetails from './SeasonTaskDetails.jsx'
import SeasonTaskEditor from './SeasonTaskEditor.jsx'
import PrepMonthEventStrip from '../student/PrepMonthEventStrip.jsx'
import PrepSeasonCalendar from '../student/PrepSeasonCalendar.jsx'
import PrepSeasonTaskList from '../student/PrepSeasonTaskList.jsx'
import PrepSelectedDayTasks from '../student/PrepSelectedDayTasks.jsx'
import SeasonTasksAutoPlanner from './SeasonTasksAutoPlanner.jsx'
import {
  generateSeasonTasksSchedule,
  normalizeSessionsPerWeek,
} from '../../utils/seasonTasksAutoSchedule.js'

/** @typedef {import('../../utils/seasonTasks.js').SeasonTask} SeasonTask */

/**
 * @param {{
 *   tasks: SeasonTask[],
 *   canSave?: boolean,
 *   saveBusy?: boolean,
 *   saveError?: string,
 *   onSaveTasks: (tasks: SeasonTask[]) => void | Promise<void>,
 *   technicalScore?: number,
 *   physicalScore?: number,
 *   sessionsPerWeek?: number,
 *   onSessionsPerWeekChange?: (n: number) => void | Promise<void>,
 * }} props
 */
function SeasonTasksCalendarPanel({
  tasks: tasksProp,
  canSave = true,
  saveBusy = false,
  saveError = '',
  onSaveTasks,
  technicalScore = 0,
  physicalScore = 0,
  sessionsPerWeek = 3,
  onSessionsPerWeekChange,
}) {
  const tasks = useMemo(() => normalizeSeasonTasks(tasksProp), [tasksProp])
  const calendarItems = useMemo(() => seasonTasksToCalendarItems(tasks), [tasks])

  const [focusId, setFocusId] = useState(null)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [assignError, setAssignError] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(/** @type {string | null} */ (null))
  const [createRange, setCreateRange] = useState(
    /** @type {{ startISO: string, endISO: string } | null} */ (null),
  )

  const todayIso = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }, [])

  const [selectedISO, setSelectedISO] = useState(todayIso)

  useEffect(() => {
    const today = new Date()
    setViewMonth(today.getFullYear() === year ? today.getMonth() : 0)
  }, [year])

  const seasonMonthDays = useMemo(
    () => buildSeasonMonthDays(year, viewMonth, calendarItems, focusId, todayIso),
    [year, viewMonth, calendarItems, focusId, todayIso],
  )

  const monthTaskCounts = useMemo(
    () => Array.from({ length: 12 }, (_, m) => countSeasonTasksInMonth(year, m, tasks)),
    [year, tasks],
  )

  const monthLabel = useMemo(() => {
    const iso = `${year}-${String(viewMonth + 1).padStart(2, '0')}-01`
    return monthYearLabelRu(iso)
  }, [year, viewMonth])

  const selectedDayTasks = useMemo(() => {
    const row = seasonMonthDays.find((d) => d.dateISO === selectedISO)
    const ids = new Set((row?.competitions ?? []).map((c) => c.id))
    return tasks.filter((t) => ids.has(t.id))
  }, [seasonMonthDays, selectedISO, tasks])

  const monthCategoryCounts = useMemo(
    () => countSeasonTasksByCategoryInMonth(year, viewMonth, tasks),
    [year, viewMonth, tasks],
  )

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) ?? null,
    [tasks, editingTaskId],
  )

  const focusedTask = useMemo(
    () => (focusId ? tasks.find((t) => t.id === focusId) ?? null : null),
    [focusId, tasks],
  )

  const persistTasks = useCallback(
    async (nextTasks) => {
      try {
        await onSaveTasks(normalizeSeasonTasks(nextTasks))
        setAssignError('')
      } catch (err) {
        setAssignError(formatFirestoreErrorMessage(err))
        throw err
      }
    },
    [onSaveTasks],
  )

  const closeCreateForm = useCallback(() => {
    setCreateRange(null)
    setAssignError('')
  }, [])

  const openCreateForm = useCallback((iso) => {
    const norm = normalizeIsoRange(iso, iso)
    setCreateRange({ startISO: norm.dateISO, endISO: norm.dateEndISO })
    setEditingTaskId(null)
    setAssignError('')
  }, [])

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

  const focusTask = useCallback(
    (task) => {
      setFocusId(task.id)
      setSelectedISO(task.dateISO)
      setViewMonth(new Date(task.dateISO + 'T12:00:00').getMonth())
      if (!task.dateISO.startsWith(String(year))) setYear(Number(task.dateISO.slice(0, 4)))
      setEditingTaskId(null)
      closeCreateForm()
    },
    [year, closeCreateForm],
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
    async ({ title, category, dateISO, dateEndISO, progress }) => {
      if (!canSave) return
      const range = normalizeCompetitionRange(dateISO, dateEndISO)
      const task = {
        id: newSeasonTaskId(),
        title,
        category,
        dateISO: range.dateISO,
        dateEndISO: range.dateEndISO,
        progress,
      }
      try {
        await persistTasks([...tasks, task])
        setFocusId(task.id)
        closeCreateForm()
      } catch {
        /* assignError set in persistTasks */
      }
    },
    [canSave, tasks, persistTasks, closeCreateForm],
  )

  const handleEditSave = useCallback(
    async ({ title, category, dateISO, dateEndISO, progress }) => {
      if (!editingTask || !canSave) return
      const range = normalizeCompetitionRange(dateISO, dateEndISO)
      try {
        const next = tasks.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title,
                category,
                dateISO: range.dateISO,
                dateEndISO: range.dateEndISO,
                progress,
              }
            : t,
        )
        await persistTasks(next)
        setEditingTaskId(null)
      } catch {
        setAssignError('Не удалось сохранить задачу.')
      }
    },
    [editingTask, canSave, tasks, persistTasks],
  )

  const handleProgressChange = useCallback(
    async (taskId, progress) => {
      if (!canSave) return
      const next = tasks.map((t) => (t.id === taskId ? { ...t, progress } : t))
      try {
        await persistTasks(next)
      } catch {
        /* shown via saveError */
      }
    },
    [canSave, tasks, persistTasks],
  )

  const handleDeleteTask = useCallback(
    async (taskId) => {
      if (!canSave) return
      try {
        await persistTasks(tasks.filter((t) => t.id !== taskId))
        if (focusId === taskId) setFocusId(null)
        setEditingTaskId(null)
        closeCreateForm()
      } catch {
        setAssignError('Не удалось удалить задачу.')
      }
    },
    [canSave, tasks, persistTasks, focusId, closeCreateForm],
  )

  const tasksInYear = useMemo(() => countSeasonTasksForYear(tasks, year), [tasks, year])

  const handleClearYear = useCallback(async () => {
    if (!canSave || tasksInYear === 0) return
    const ok = window.confirm(
      `Удалить все задачи за ${year} год (${tasksInYear})? Это нельзя отменить.`,
    )
    if (!ok) return
    try {
      await persistTasks(removeSeasonTasksForYear(tasks, year))
      setFocusId(null)
      setEditingTaskId(null)
      closeCreateForm()
    } catch {
      setAssignError('Не удалось очистить задачи.')
    }
  }, [canSave, tasksInYear, year, tasks, persistTasks, closeCreateForm])

  const handleClearAll = useCallback(async () => {
    if (!canSave || tasks.length === 0) return
    const ok = window.confirm(
      `Удалить все задачи ученика (${tasks.length})? Это нельзя отменить.`,
    )
    if (!ok) return
    try {
      await persistTasks([])
      setFocusId(null)
      setEditingTaskId(null)
      closeCreateForm()
    } catch {
      setAssignError('Не удалось очистить задачи.')
    }
  }, [canSave, tasks.length, persistTasks, closeCreateForm])

  const displayError = assignError || saveError
  const sessions = normalizeSessionsPerWeek(sessionsPerWeek)

  const handleAutoGenerate = useCallback(
    async (mode) => {
      if (!canSave) return
      const next = generateSeasonTasksSchedule({
        year,
        sessionsPerWeek: sessions,
        existingTasks: tasks,
        mode,
      })
      await persistTasks(next)
      if (onSessionsPerWeekChange) await onSessionsPerWeekChange(sessions)
    },
    [canSave, year, sessions, tasks, persistTasks, onSessionsPerWeekChange],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-semibold text-[#2c2d2e]">Календарь задач</h3>
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

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase text-[#818c99]">Балл техники</p>
          <p className="text-[18px] font-bold tabular-nums text-[#6f3ff5]">{Math.round(technicalScore)}</p>
        </div>
        <div className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase text-[#818c99]">Балл физики</p>
          <p className="text-[18px] font-bold tabular-nums text-[#2d81e0]">{Math.round(physicalScore)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-sm ${SEASON_TASK_KIND_STYLES.technical.bar}`} />
          Техника: <strong>{monthCategoryCounts.technical}</strong> в месяце
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-sm ${SEASON_TASK_KIND_STYLES.physical.bar}`} />
          Физика: <strong>{monthCategoryCounts.physical}</strong> в месяце
        </span>
      </div>

      <p className="text-[11px] leading-snug text-[#818c99]">
        Выберите день в календаре и нажмите «Добавить задачу» — даты задаёте в форме. Прогресс — ползунком в карточке
        задачи.
      </p>
      {!canSave ? <p className={vk.noticeWarn}>Выберите ученика для сохранения задач.</p> : null}

      {canSave && tasks.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-rose-200/80 bg-rose-50/50 px-2.5 py-2">
          <button
            type="button"
            className="text-[13px] font-medium text-rose-700 disabled:opacity-50"
            disabled={saveBusy || tasksInYear === 0}
            onClick={() => void handleClearYear()}
          >
            Очистить {year} год
            {tasksInYear > 0 ? ` (${tasksInYear})` : ''}
          </button>
          <button
            type="button"
            className="text-[13px] font-medium text-rose-700 disabled:opacity-50"
            disabled={saveBusy}
            onClick={() => void handleClearAll()}
          >
            Очистить все ({tasks.length})
          </button>
        </div>
      ) : null}

      <SeasonTasksAutoPlanner
        year={year}
        tasksCount={tasks.length}
        sessionsPerWeek={sessions}
        onSessionsPerWeekChange={(n) => {
          if (onSessionsPerWeekChange) void onSessionsPerWeekChange(n)
        }}
        onGenerate={handleAutoGenerate}
        busy={saveBusy}
        disabled={!canSave}
      />

      <PrepMonthEventStrip
        eventCounts={monthTaskCounts}
        activeMonth={viewMonth}
        onMonth={setViewMonth}
        countLabel={(n) => (n === 0 ? '—' : `${n} ${n === 1 ? 'задача' : n < 5 ? 'задачи' : 'задач'}`)}
      />

      {canSave ? (
        <button
          type="button"
          className={vk.btnPrimary}
          onClick={() => openCreateForm(selectedISO)}
        >
          Добавить задачу на {formatShortDateRu(selectedISO)}
        </button>
      ) : null}

      <div className="rounded-[12px] border border-[#e7e8ec] bg-white p-3 shadow-sm">
        <PrepSeasonCalendar
          monthDays={seasonMonthDays}
          selectedISO={selectedISO}
          onSelect={handleDayClick}
          monthLabel={monthLabel}
          visualMode="minimal"
          focusId={focusId}
          legendMode="tasks"
        />
      </div>

      {createRange ? (
        <SeasonTaskEditor
          key={`create-task-${createRange.startISO}`}
          mode="create"
          dateISO={createRange.startISO}
          dateEndISO={createRange.endISO}
          onCancel={closeCreateForm}
          onSave={handleCreateSave}
          busy={saveBusy}
          error={displayError}
          disabled={!canSave}
        />
      ) : null}

      {focusedTask && !editingTask && !createRange ? (
        <SeasonTaskDetails
          task={focusedTask}
          onClose={() => setFocusId(null)}
          onEdit={() => setEditingTaskId(focusedTask.id)}
          onProgressChange={(progress) => handleProgressChange(focusedTask.id, progress)}
          onDelete={() => handleDeleteTask(focusedTask.id)}
          busy={saveBusy}
          canSave={canSave}
        />
      ) : null}

      {editingTask && !createRange ? (
        <SeasonTaskEditor
          key={editingTask.id}
          mode="edit"
          dateISO={editingTask.dateISO}
          dateEndISO={editingTask.dateEndISO}
          initialTitle={editingTask.title}
          initialCategory={editingTask.category}
          initialProgress={editingTask.progress}
          onCancel={() => setEditingTaskId(null)}
          onSave={handleEditSave}
          onDelete={() => handleDeleteTask(editingTask.id)}
          busy={saveBusy}
          error={displayError}
          disabled={!canSave}
        />
      ) : null}

      <PrepSeasonTaskList
        tasks={tasks}
        year={year}
        focusId={focusId}
        onFocus={focusTask}
        onDelete={canSave ? (id) => void handleDeleteTask(id) : undefined}
        deleteBusy={saveBusy}
      />

      <PrepSelectedDayTasks
        dateISO={selectedISO}
        tasks={selectedDayTasks}
        focusId={focusId}
        onFocus={focusTask}
        onRemove={canSave ? (id) => void handleDeleteTask(id) : undefined}
        removeBusy={saveBusy}
      />
    </div>
  )
}

export default memo(SeasonTasksCalendarPanel)
