import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getCoachStudents,
  updateStudentData,
} from '../services/firebaseService'
import { loadLegacyTechnicalAtoms } from '../utils/ksrUtils'
import {
  orderTechnicalAtomsForProgram,
  normalizeStudentTechnicalData,
} from '../utils/technicalProgramProgress.js'
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Групповой прогресс техники
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Шаг 1 из 2: отметьте, кто пришёл на тренировку.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Назад на дашборд
        </Link>
      </header>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
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
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={() => toggleAll(!allSelectedInView)}
            disabled={totalInView === 0}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {allSelectedInView ? 'Снять выбор' : 'Выбрать всех'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
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
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => {
            const checked = selectedIds.has(student.id)
            return (
              <li key={student.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    checked
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStudent(student.id)}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {student.displayName}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="sticky bottom-3 z-30 flex justify-end">
        <button
          type="button"
          onClick={onStartTraining}
          disabled={selectedCount === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
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

function StudentProgressRow({ student, orderedAtoms, onChange, savingStatus }) {
  const total = orderedAtoms.length

  const initialValue = useMemo(
    () => countLeadingMasteredAtoms(orderedAtoms, student.technicalData ?? {}),
    [orderedAtoms, student.technicalData],
  )

  const [sliderValue, setSliderValue] = useState(initialValue)
  const [knownInitial, setKnownInitial] = useState(initialValue)
  if (knownInitial !== initialValue) {
    setKnownInitial(initialValue)
    setSliderValue(initialValue)
  }

  const currentAtom = sliderValue >= 1 && sliderValue <= total ? orderedAtoms[sliderValue - 1] : null
  const nextAtom = sliderValue < total ? orderedAtoms[sliderValue] : null

  const statusLine = (() => {
    if (savingStatus === 'saving') return 'Сохранение...'
    if (savingStatus === 'error') return 'Не удалось сохранить'
    if (savingStatus === 'saved') return 'Сохранено'
    return null
  })()

  const handleInput = (event) => {
    const raw = Number(event.target.value)
    const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), total)
    setSliderValue(next)
    onChange(student.id, next)
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {student.displayName}
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Шаг {sliderValue} из {total}
          </span>
          {statusLine ? (
            <span
              className={
                savingStatus === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : savingStatus === 'saved'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
              }
            >
              {statusLine}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={sliderValue}
          onChange={handleInput}
          aria-label={`Прогресс по программе: ${student.displayName}`}
          className="w-full cursor-pointer accent-blue-600"
        />
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span>0</span>
          <span>{total}</span>
        </div>
      </div>

      <div className="mt-2 min-h-[2.75rem] rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {currentAtom ? (
          <p>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              Шаг {sliderValue}.
            </span>{' '}
            {currentAtom.name}
          </p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">Программа ещё не начата</p>
        )}
        {nextAtom ? (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Дальше: {nextAtom.name}
          </p>
        ) : sliderValue === total && total > 0 ? (
          <p className="mt-0.5 text-[11px] leading-snug text-emerald-700 dark:text-emerald-400">
            Все шаги программы пройдены.
          </p>
        ) : null}
      </div>
    </li>
  )
}

function ProgressPhase({ studentsForSession, orderedAtoms, onBack, technicalAtoms }) {
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
    async (studentId, sliderValue) => {
      const slot = localDataRef.current.get(studentId)
      if (!slot) return
      const nextTechnical = applyProgressSliderToTechnicalData(
        orderedAtoms,
        slot.technicalData,
        sliderValue,
      )
      slot.technicalData = nextTechnical
      try {
        setStatus(studentId, 'saving')
        const patch = buildTechnicalOnlyUpdatePayload(
          { ...slot.base, technicalData: nextTechnical },
          technicalAtoms,
          nextTechnical,
        )
        await updateStudentData(studentId, patch)
        slot.base = { ...slot.base, ...patch }
        setStatus(studentId, 'saved')
      } catch (error) {
        console.error('Не удалось сохранить прогресс ученика:', error)
        setStatus(studentId, 'error')
      }
    },
    [orderedAtoms, setStatus, technicalAtoms],
  )

  const handleSliderChange = useCallback(
    (studentId, value) => {
      setStatus(studentId, 'saving')
      const prevHandle = debounceRef.current.get(studentId)
      if (prevHandle) clearTimeout(prevHandle)
      const handle = setTimeout(() => {
        debounceRef.current.delete(studentId)
        commitSliderChange(studentId, value)
      }, SAVE_DEBOUNCE_MS)
      debounceRef.current.set(studentId, handle)
    },
    [commitSliderChange, setStatus],
  )

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Прогресс по шагам
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Шаг 2 из 2: тащите ползунок вправо — отметятся сразу несколько элементов. Данные
            сохраняются автоматически.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Изменить состав
        </button>
      </header>

      {orderedAtoms.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Программа техники не загружена — обновите страницу.
        </div>
      ) : null}

      <ul className="grid gap-3 lg:grid-cols-2">
        {studentsForSession.map((student) => (
          <StudentProgressRow
            key={student.id}
            student={student}
            orderedAtoms={orderedAtoms}
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
      <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
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
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
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
            orderedAtoms={orderedAtoms}
            technicalAtoms={technicalAtoms}
            onBack={handleBackToCompose}
          />
        )}
      </div>
    </main>
  )
}
