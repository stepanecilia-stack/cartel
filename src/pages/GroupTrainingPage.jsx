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

  const tierLabel = (n, total, value) => `Ур. ${n}: ${value} из ${total}`

  const renderTierHint = (ordered, value, total) => {
    const current = value >= 1 && value <= total ? ordered[value - 1] : null
    const next = value < total ? ordered[value] : null
    return (
      <div className="mt-2 min-h-[2.5rem] rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {current ? (
          <p>
            <span className="font-semibold text-blue-700 dark:text-blue-400">Шаг {value}.</span>{' '}
            {current.name}
          </p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">Не начато</p>
        )}
        {next ? (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Дальше: {next.name}</p>
        ) : value === total && total > 0 ? (
          <p className="mt-0.5 text-[11px] leading-snug text-emerald-700 dark:text-emerald-400">Уровень закрыт.</p>
        ) : null}
      </div>
    )
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{student.displayName}</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {tierLabel(1, total1, slider1)}
            {showTier2 ? ` · ${tierLabel(2, total2, slider2)}` : ''}
            {showTier3 ? ` · ${tierLabel(3, total3, slider3)}` : ''}
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

      <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 dark:border-slate-700">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Уровень 1</p>
        <input
          type="range"
          min={0}
          max={total1}
          step={1}
          value={slider1}
          onChange={(e) => {
            const raw = Number(e.target.value)
            const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), total1)
            setSlider1(next)
            emit(next, slider2, slider3)
          }}
          aria-label={`Уровень 1, прогресс: ${student.displayName}`}
          className="w-full cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span>0</span>
          <span>{total1}</span>
        </div>
        {renderTierHint(orderedL1, slider1, total1)}
      </div>

      {showTier2 && total2 > 0 ? (
        <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 dark:border-slate-700">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Уровень 2</p>
          <input
            type="range"
            min={0}
            max={total2}
            step={1}
            value={slider2}
            onChange={(e) => {
              const raw = Number(e.target.value)
              const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), total2)
              setSlider2(next)
              emit(slider1, next, slider3)
            }}
            aria-label={`Уровень 2, прогресс: ${student.displayName}`}
            className="w-full cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span>0</span>
            <span>{total2}</span>
          </div>
          {renderTierHint(orderedL2, slider2, total2)}
        </div>
      ) : null}

      {showTier3 && total3 > 0 ? (
        <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 dark:border-slate-700">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Уровень 3 (комбинации)
          </p>
          <input
            type="range"
            min={0}
            max={total3}
            step={1}
            value={slider3}
            onChange={(e) => {
              const raw = Number(e.target.value)
              const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), total3)
              setSlider3(next)
              emit(slider1, slider2, next)
            }}
            aria-label={`Уровень 3, прогресс: ${student.displayName}`}
            className="w-full cursor-pointer accent-violet-600"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span>0</span>
            <span>{total3}</span>
          </div>
          {renderTierHint(orderedL3, slider3, total3)}
        </div>
      ) : null}
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Прогресс по шагам
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Шаг 2 из 2: три ползунка — уровень 1 (программа), уровень 2 и уровень 3 (комбинации). Уровни 2 и 3
            открываются сами, когда предыдущий доведён до конца. Перетягивание по-прежнему выставляет «Умение» на
            пройденных шагах; данные сохраняются автоматически.
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

      {orderedL1.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Программа техники не загружена — обновите страницу.
        </div>
      ) : null}

      <ul className="grid gap-3 lg:grid-cols-2">
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
            orderedL1={orderedAtoms}
            technicalAtoms={technicalAtoms}
            onBack={handleBackToCompose}
          />
        )}
      </div>
    </main>
  )
}
