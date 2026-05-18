import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getCoachStudents,
  updateStudentData,
} from '../services/firebaseService'
import { loadLegacyTechnicalAtoms, TECHNIQUE_LEVEL2_ATOMS } from '../utils/ksrUtils'
import {
  orderTechnicalAtomsForProgram,
  normalizeStudentTechnicalData,
} from '../utils/technicalProgramProgress.js'
import { mergeWithRequiredLevel3Combinations } from '../utils/techniqueCatalog.js'
import { STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections.js'
import {
  applyProgressSliderToTechnicalData,
  buildTechnicalOnlyUpdatePayload,
  countLeadingMasteredAtoms,
} from '../utils/studentTechnicalUpdate.js'
import { displayNameFromStudent } from '../utils/studentModel'

const SAVE_DEBOUNCE_MS = 350

function normalizeSearchText(value) {
  return String(value ?? '').toLowerCase().trim()
}

function ComposePhase({
  students,
  isLoading,
  loadError,
  searchQuery,
  setSearchQuery,
  selectedIds,
  toggleStudent,
  toggleAll,
  allSelectedInView,
  onStartTraining,
  filteredStudents,
}) {
  const selectedCount = selectedIds.size
  const totalInView = filteredStudents.length

  return (
    <div className="space-y-3 pb-24 sm:space-y-5 sm:pb-0">
      <header className="space-y-2.5">
        <div>
          <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl md:text-4xl">
            Групповой прогресс техники
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
            Шаг 1 из 2: отметьте, кто пришёл на тренировку.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto sm:text-sm"
        >
          Назад на дашборд
        </Link>
      </header>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:rounded-xl sm:p-4 md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="group-training-search" className="sr-only">
              Поиск ученика
            </label>
            <input
              id="group-training-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по имени..."
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 sm:px-3"
            />
          </div>
          <button
            type="button"
            onClick={() => toggleAll(!allSelectedInView)}
            disabled={totalInView === 0}
            className="w-full shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto sm:text-sm"
          >
            {allSelectedInView ? 'Снять выбор' : 'Выбрать всех'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500 sm:mt-3 sm:text-xs dark:text-slate-400">
          Отмечено: {selectedCount} из {students.length}
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Загрузка учеников...
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          В вашем списке пока нет учеников. Добавьте их на главной странице.
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          По запросу никто не найден.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3">
          {filteredStudents.map((student) => {
            const checked = selectedIds.has(student.id)
            return (
              <li key={student.id}>
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2.5 transition-colors active:opacity-90 sm:gap-3 sm:rounded-xl sm:px-3 sm:py-3 ${
                    checked
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStudent(student.id)}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 sm:h-5 sm:w-5"
                  />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium leading-tight text-slate-900 sm:text-sm dark:text-slate-100">
                    {student.displayName}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-slate-50/95 p-2 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/95 sm:static sm:inset-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="button"
          onClick={onStartTraining}
          disabled={selectedCount === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 sm:inline-flex sm:w-auto sm:px-5"
        >
          Начать тренировку
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold tabular-nums">
            {selectedCount}
          </span>
        </button>
      </div>
    </div>
  )
}

function StudentProgressRow({ student, orderedL1, onChange, savingStatus }) {
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const orderedL3 = useMemo(
    () => mergeWithRequiredLevel3Combinations(student.technicalCombinations),
    [student.technicalCombinations],
  )

  const total1 = orderedL1.length
  const total2 = orderedL2.length
  const total3 = orderedL3.length

  const data = student.technicalData ?? {}

  const initial1 = useMemo(() => countLeadingMasteredAtoms(orderedL1, data), [orderedL1, data])
  const initial2 = useMemo(() => countLeadingMasteredAtoms(orderedL2, data), [orderedL2, data])
  const initial3 = useMemo(
    () => countLeadingMasteredAtoms(orderedL3.map((c) => ({ id: c.id })), data),
    [orderedL3, data],
  )

  const [slider1, setSlider1] = useState(initial1)
  const [slider2, setSlider2] = useState(initial2)
  const [slider3, setSlider3] = useState(initial3)
  const [showTier2, setShowTier2] = useState(() => total1 > 0 && initial1 >= total1)
  const [showTier3, setShowTier3] = useState(() => total2 > 0 && initial2 >= total2 && total3 > 0)

  useEffect(() => {
    setSlider1(initial1)
  }, [student.id, initial1])
  useEffect(() => {
    setSlider2(initial2)
  }, [student.id, initial2])
  useEffect(() => {
    setSlider3(initial3)
  }, [student.id, initial3])

  useEffect(() => {
    if (total1 > 0 && slider1 >= total1) setShowTier2(true)
  }, [slider1, total1])

  useEffect(() => {
    if (total2 > 0 && slider2 >= total2) setShowTier3(true)
  }, [slider2, total2])

  const emit = (next1, next2, next3) => {
    onChange(student.id, { l1: next1, l2: next2, l3: next3 })
  }

  const statusLine = (() => {
    if (savingStatus === 'saving') return 'Сохранение...'
    if (savingStatus === 'error') return 'Не удалось сохранить'
    if (savingStatus === 'saved') return 'Сохранено'
    return null
  })()

  const tierLabel = (n, total, value) => `Ур.${n}: ${value}/${total}`

  const renderTierHint = (ordered, value, total) => {
    const current = value >= 1 && value <= total ? ordered[value - 1] : null
    const next = value < total ? ordered[value] : null
    return (
      <div className="mt-1 rounded-md bg-slate-50 px-2 py-1.5 text-[11px] leading-snug text-slate-700 sm:mt-1.5 sm:px-2.5 sm:py-2 sm:text-xs dark:bg-slate-800 dark:text-slate-200">
        {current ? (
          <p className="line-clamp-2">
            <span className="font-semibold text-blue-700 dark:text-blue-400">Шаг {value}.</span>{' '}
            {current.name}
          </p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">Не начато</p>
        )}
        {next ? (
          <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400" title={next.name}>
            Дальше: {next.name}
          </p>
        ) : value === total && total > 0 ? (
          <p className="mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">Уровень закрыт</p>
        ) : null}
      </div>
    )
  }

  const renderTierBlock = (tierNum, total, value, ordered, accentClass, onValueChange) => {
    if (total <= 0) return null
    const label =
      tierNum === 3 ? 'Уровень 3' : tierNum === 2 ? 'Уровень 2' : 'Уровень 1'
    return (
      <div className="border-t border-slate-100 pt-2.5 first:border-t-0 first:pt-0 dark:border-slate-700">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px] dark:text-slate-400">
            {label}
          </p>
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {value}/{total}
          </span>
        </div>
        <div className="touch-manipulation py-2">
          <input
            type="range"
            min={0}
            max={total}
            step={1}
            value={value}
            onChange={(e) => {
              const raw = Number(e.target.value)
              const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), total)
              onValueChange(next)
            }}
            aria-label={`${label}, ${student.displayName}`}
            className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 ${accentClass} sm:h-1.5`}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] tabular-nums text-slate-400 sm:text-[10px] dark:text-slate-500">
          <span>0</span>
          <span>{total}</span>
        </div>
        {renderTierHint(ordered, value, total)}
      </div>
    )
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:rounded-xl sm:p-3 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-slate-900 sm:text-base dark:text-slate-100">
          {student.displayName}
        </h2>
        {statusLine ? (
          <span
            className={`shrink-0 text-[10px] font-medium sm:text-xs ${
              savingStatus === 'error'
                ? 'text-red-600 dark:text-red-400'
                : savingStatus === 'saved'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {statusLine}
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          {tierLabel(1, total1, slider1)}
        </span>
        {showTier2 && total2 > 0 ? (
          <span className="rounded-md bg-blue-50/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            {tierLabel(2, total2, slider2)}
          </span>
        ) : null}
        {showTier3 && total3 > 0 ? (
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
            {tierLabel(3, total3, slider3)}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3">
        {renderTierBlock(1, total1, slider1, orderedL1, 'accent-blue-600', (next) => {
          setSlider1(next)
          emit(next, slider2, slider3)
        })}

        {showTier2 && total2 > 0
          ? renderTierBlock(2, total2, slider2, orderedL2, 'accent-blue-600', (next) => {
              setSlider2(next)
              emit(slider1, next, slider3)
            })
          : null}
        {showTier3 && total3 > 0
          ? renderTierBlock(3, total3, slider3, orderedL3, 'accent-violet-600', (next) => {
              setSlider3(next)
              emit(slider1, slider2, next)
            })
          : null}
      </div>
    </li>
  )
}

function ProgressPhase({ studentsForSession, orderedL1, onBack, technicalAtoms }) {
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const pendingTiersRef = useRef(new Map())
  const [savingStatusById, setSavingStatusById] = useState({})
  const localDataRef = useRef(new Map())
  const debounceRef = useRef(new Map())

  useEffect(() => {
    for (const student of studentsForSession) {
      if (!localDataRef.current.has(student.id)) {
        localDataRef.current.set(student.id, {
          base: student,
          technicalData: normalizeStudentTechnicalData(student.technicalData),
        })
      }
    }
  }, [studentsForSession])

  useEffect(
    () => () => {
      for (const handle of debounceRef.current.values()) clearTimeout(handle)
      debounceRef.current.clear()
    },
    [],
  )

  const setStatus = useCallback((studentId, status) => {
    setSavingStatusById((prev) => ({ ...prev, [studentId]: status }))
  }, [])

  const commitSliderChange = useCallback(
    async (studentId, tiers) => {
      const slot = localDataRef.current.get(studentId)
      if (!slot) return
      const orderedL3 = mergeWithRequiredLevel3Combinations(slot.base.technicalCombinations).map((c) => ({
        id: c.id,
      }))
      let nextTechnical = slot.technicalData
      nextTechnical = applyProgressSliderToTechnicalData(orderedL1, nextTechnical, tiers.l1)
      nextTechnical = applyProgressSliderToTechnicalData(orderedL2, nextTechnical, tiers.l2)
      nextTechnical = applyProgressSliderToTechnicalData(orderedL3, nextTechnical, tiers.l3)
      slot.technicalData = nextTechnical
      try {
        setStatus(studentId, 'saving')
        const patch = buildTechnicalOnlyUpdatePayload(
          { ...slot.base, technicalData: nextTechnical },
          technicalAtoms,
          nextTechnical,
        )
        await updateStudentData(studentId, patch, { section: STUDENT_UPDATE_SECTION.groupTraining })
        slot.base = { ...slot.base, ...patch }
        setStatus(studentId, 'saved')
      } catch (error) {
        console.error('Не удалось сохранить прогресс ученика:', error)
        setStatus(studentId, 'error')
      }
    },
    [orderedL1, orderedL2, setStatus, technicalAtoms],
  )

  const handleSliderChange = useCallback(
    (studentId, tiers) => {
      pendingTiersRef.current.set(studentId, tiers)
      setStatus(studentId, 'saving')
      const prevHandle = debounceRef.current.get(studentId)
      if (prevHandle) clearTimeout(prevHandle)
      const handle = setTimeout(() => {
        debounceRef.current.delete(studentId)
        const latest = pendingTiersRef.current.get(studentId)
        if (latest) void commitSliderChange(studentId, latest)
      }, SAVE_DEBOUNCE_MS)
      debounceRef.current.set(studentId, handle)
    },
    [commitSliderChange, setStatus],
  )

  return (
    <div className="space-y-3 pb-2 sm:space-y-5 sm:pb-0">
      <header className="sticky top-14 z-20 -mx-1 space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/95 p-2.5 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/95 sm:static sm:mx-0 sm:space-y-2.5 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl md:text-4xl">
              Прогресс по шагам
            </h1>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600 sm:mt-1 sm:text-sm dark:text-slate-400">
              <span className="sm:hidden">Шаг 2 · уровни 1–3 · автосохранение</span>
              <span className="hidden sm:inline">
                Шаг 2 из 2: три ползунка — уровень 1 (программа), уровень 2 и уровень 3 (комбинации). Уровни 2 и 3
                открываются сами, когда предыдущий доведён до конца. Данные сохраняются автоматически.
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold tabular-nums text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 sm:hidden">
            {studentsForSession.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto sm:text-sm"
        >
          Изменить состав
        </button>
      </header>

      {orderedL1.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Программа техники не загружена — обновите страницу.
        </div>
      ) : null}

      <ul className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
        {studentsForSession.map((student) => (
          <StudentProgressRow
            key={student.id}
            student={student}
            orderedL1={orderedL1}
            onChange={handleSliderChange}
            savingStatus={savingStatusById[student.id] ?? 'idle'}
          />
        ))}
      </ul>
    </div>
  )
}

export default function GroupTrainingPage({ coachId }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('compose')
  const [students, setStudents] = useState([])
  const [technicalAtoms, setTechnicalAtoms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  useEffect(() => {
    if (!coachId) return undefined
    let cancelled = false
    const run = async () => {
      try {
        const [data, atoms] = await Promise.all([
          getCoachStudents(coachId),
          loadLegacyTechnicalAtoms(),
        ])
        if (cancelled) return
        const decorated = data.map((raw) => ({
          ...raw,
          displayName: displayNameFromStudent(raw),
          nameSearch: normalizeSearchText(displayNameFromStudent(raw)),
          technicalData: normalizeStudentTechnicalData(raw.technicalData),
        }))
        decorated.sort((a, b) => a.nameSearch.localeCompare(b.nameSearch, 'ru'))
        setStudents(decorated)
        setTechnicalAtoms(Array.isArray(atoms) ? atoms : [])
        setLoadError('')
      } catch (error) {
        console.error('Ошибка загрузки данных для групповой тренировки:', error)
        if (!cancelled) {
          setStudents([])
          setLoadError(
            'Не удалось загрузить учеников или программу техники. Проверьте интернет и попробуйте ещё раз.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [coachId])

  const orderedAtoms = useMemo(
    () => orderTechnicalAtomsForProgram(technicalAtoms),
    [technicalAtoms],
  )

  const filteredStudents = useMemo(() => {
    const q = normalizeSearchText(searchQuery)
    if (!q) return students
    return students.filter((student) => student.nameSearch.includes(q))
  }, [students, searchQuery])

  const allSelectedInView =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedIds.has(student.id))

  const toggleStudent = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (shouldSelect) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const student of filteredStudents) {
          if (shouldSelect) next.add(student.id)
          else next.delete(student.id)
        }
        return next
      })
    },
    [filteredStudents],
  )

  const studentsForSession = useMemo(
    () =>
      students
        .filter((student) => selectedIds.has(student.id))
        .map((student) => ({ ...student })),
    [students, selectedIds],
  )

  const handleStartTraining = useCallback(() => {
    if (selectedIds.size === 0) return
    setPhase('progress')
  }, [selectedIds])

  const handleBackToCompose = useCallback(() => {
    setPhase('compose')
  }, [])

  if (!coachId) {
    return (
      <main className="min-h-screen bg-slate-50 px-2 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center text-sm text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:rounded-xl sm:p-6">
          Войдите в аккаунт тренера, чтобы запустить групповую тренировку.
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Войти
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-2 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10 md:py-12">
      <div className="mx-auto max-w-5xl">
        {phase === 'compose' ? (
          <ComposePhase
            students={students}
            isLoading={isLoading}
            loadError={loadError}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedIds={selectedIds}
            toggleStudent={toggleStudent}
            toggleAll={toggleAll}
            allSelectedInView={allSelectedInView}
            onStartTraining={handleStartTraining}
            filteredStudents={filteredStudents}
          />
        ) : (
          <ProgressPhase
            studentsForSession={studentsForSession}
            orderedL1={orderedAtoms}
            technicalAtoms={technicalAtoms}
            onBack={handleBackToCompose}
          />
        )}
      </div>
    </main>
  )
}
