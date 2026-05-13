import { useCallback, useEffect, useMemo, useState } from 'react'
import AddStudentModal from '../components/AddStudentModal'
import VoiceCoachAssistant from '../components/VoiceCoachAssistant'
import DashboardTechnicalStrip from '../components/DashboardTechnicalStrip'
import { getCoachStudents } from '../services/firebaseService'
import { findGoldStandardRow, loadLegacyTechnicalAtoms } from '../utils/ksrUtils'
import { buildDashboardTechnicalSnapshot, rankTechnicalLevel } from '../utils/technicalProgramProgress.js'
import { displayNameFromStudent, formatBirthYearRu, studentAthleteShape } from '../utils/studentModel'

function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
}

/** Понятная подпись веса по таблице программы (возраст + пол + вес из анкеты). */
function formatDashboardWeightCategory(athleteShaped) {
  const w = Number(athleteShaped.weight ?? 0)
  if (!w || w < 20) return '—'
  const m = findGoldStandardRow(athleteShaped)
  if (!m) return `${Math.round(w)} кг (вес из анкеты)`
  const row = m.row
  if (row.openTop) return `свыше ${Math.floor(row.weightMin)} кг`
  if (row.weightMin === row.weightMax) return `${row.weightMin} кг`
  return `${row.weightMin}–${row.weightMax} кг`
}

function HomePage({ onSelectStudent, coachId }) {
  const [students, setStudents] = useState([])
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [birthYearFilter, setBirthYearFilter] = useState('all')
  const [weightFilter, setWeightFilter] = useState('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [programAtoms, setProgramAtoms] = useState([])
  const [techAtomsLoadError, setTechAtomsLoadError] = useState('')
  const [pairWorkFilter, setPairWorkFilter] = useState('all')
  const [dashboardSort, setDashboardSort] = useState('tech')

  const loadStudents = useCallback(async () => {
    if (!coachId) {
      setStudents([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await getCoachStudents(coachId)
      setStudents(data)
      setLoadError('')
    } catch (error) {
      console.error('Ошибка загрузки students:', error)
      setStudents([])
      setLoadError('Не удалось загрузить список учеников из интернета. Проверьте связь и вход в аккаунт.')
    } finally {
      setIsLoading(false)
    }
  }, [coachId])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const atoms = await loadLegacyTechnicalAtoms()
        if (!cancelled) {
          setProgramAtoms(Array.isArray(atoms) ? atoms : [])
          setTechAtomsLoadError('')
        }
      } catch (e) {
        console.error('Ошибка загрузки атомов техники для дашборда:', e)
        if (!cancelled) {
          setProgramAtoms([])
          setTechAtomsLoadError('Не удалось загрузить программу техники — блок «Техника» на карточках недоступен.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const studentsWithKsr = useMemo(
    () =>
      students.map((raw) => {
        const shaped = studentAthleteShape(raw)
        const birthYearNum = Number(shaped.birthYear) || null
        const birthYearLabel = formatBirthYearRu(shaped.birthYear) || 'не указан'
        const weightCategoryLine = formatDashboardWeightCategory(shaped)
        const gender = shaped.gender === 'F' ? 'F' : 'M'
        return {
          ...raw,
          name: displayNameFromStudent(raw),
          nameSearch: normalizeSearchText(displayNameFromStudent(raw)),
          gender,
          genderLabel: gender === 'F' ? 'Женский' : 'Мужской',
          birthYearNum,
          birthYearLabel,
          weightCategoryLine,
        }
      }),
    [students],
  )

  const snapshotsByStudentId = useMemo(() => {
    const map = new Map()
    if (!programAtoms.length) return map
    for (const s of studentsWithKsr) {
      map.set(s.id, buildDashboardTechnicalSnapshot(programAtoms, s.technicalData))
    }
    return map
  }, [programAtoms, studentsWithKsr])

  const filteredStudents = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery)
    let list = studentsWithKsr.filter((student) => {
      const byQuery =
        !normalizedQuery || student.nameSearch.includes(normalizedQuery)
      const byGender = genderFilter === 'all' || student.gender === genderFilter
      const byBirthYear =
        birthYearFilter === 'all' || String(student.birthYearNum ?? '') === birthYearFilter
      const byWeight = weightFilter === 'all' || student.weightCategoryLine === weightFilter
      if (!byQuery || !byGender || !byBirthYear || !byWeight) return false

      if (pairWorkFilter !== 'all' && programAtoms.length > 0) {
        const snap = snapshotsByStudentId.get(student.id)
        if (!snap || snap.empty) return true
        if (pairWorkFilter === 'yes' && !snap.pairWorkEligible) return false
        if (pairWorkFilter === 'no' && snap.pairWorkEligible) return false
      }
      return true
    })

    if (dashboardSort === 'tech' && programAtoms.length > 0) {
      list = [...list].sort((a, b) => {
        const sa = snapshotsByStudentId.get(a.id)
        const sb = snapshotsByStudentId.get(b.id)
        const ia = !sa || sa.empty ? 99999 : sa.focus.focusIndex
        const ib = !sb || sb.empty ? 99999 : sb.focus.focusIndex
        if (ia !== ib) return ia - ib
        const ra = !sa || sa.empty ? 99 : rankTechnicalLevel(sa.focus.levelKey)
        const rb = !sb || sb.empty ? 99 : rankTechnicalLevel(sb.focus.levelKey)
        if (ra !== rb) return ra - rb
        return a.nameSearch.localeCompare(b.nameSearch, 'ru')
      })
    } else {
      list = [...list].sort((a, b) => a.nameSearch.localeCompare(b.nameSearch, 'ru'))
    }
    return list
  }, [
    studentsWithKsr,
    searchQuery,
    genderFilter,
    birthYearFilter,
    weightFilter,
    pairWorkFilter,
    dashboardSort,
    programAtoms.length,
    snapshotsByStudentId,
  ])

  const birthYearOptions = useMemo(
    () =>
      [...new Set(studentsWithKsr.map((s) => s.birthYearNum).filter(Boolean))]
        .sort((a, b) => b - a),
    [studentsWithKsr],
  )

  const weightOptions = useMemo(
    () => [...new Set(studentsWithKsr.map((s) => s.weightCategoryLine).filter(Boolean))],
    [studentsWithKsr],
  )

  const suggestedNames = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery)
    const names = [...new Set(studentsWithKsr.map((s) => s.name).filter(Boolean))]
    if (!normalizedQuery) return names.slice(0, 12)
    return names
      .filter((name) => normalizeSearchText(name).includes(normalizedQuery))
      .slice(0, 12)
  }, [studentsWithKsr, searchQuery])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (genderFilter !== 'all') count += 1
    if (birthYearFilter !== 'all') count += 1
    if (weightFilter !== 'all') count += 1
    if (pairWorkFilter !== 'all') count += 1
    return count
  }, [genderFilter, birthYearFilter, weightFilter, pairWorkFilter])

  const studentIds = useMemo(() => students.map((s) => s.id), [students])

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
      <AddStudentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        coachId={coachId}
        studentIds={studentIds}
        onListChanged={loadStudents}
      />
      <div className="mx-auto max-w-6xl space-y-10">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
                Дашборд учеников
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <span className="text-base leading-none">+</span>
              Добавить ученика
            </button>
          </div>
        </header>

        {coachId && students.length > 0 && !isLoading && (
          <VoiceCoachAssistant students={students} onRosterChanged={loadStudents} />
        )}

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 p-8 text-center text-slate-600 dark:text-slate-400 shadow-sm">
            Загрузка данных...
          </div>
        )}

        {studentsWithKsr.length === 0 && !loadError && !isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 p-8 text-center text-slate-600 dark:text-slate-400 shadow-sm">
            Пока нет ни одного ученика. Нажмите синюю кнопку «Добавить ученика» выше — откроется окно, куда можно
            вписать нового или ввести код от другого тренера.
          </div>
        )}

        {studentsWithKsr.length > 0 && !isLoading && (
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-1">
                <label htmlFor="dashboard-search" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Поиск по ФИО
                </label>
                <div className="flex gap-2 md:block">
                  <input
                    id="dashboard-search"
                    type="text"
                    list="student-name-suggestions"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Начните вводить имя..."
                    className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="button"
                    onClick={() => setFiltersExpanded((prev) => !prev)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 md:hidden"
                    aria-expanded={filtersExpanded}
                    aria-controls="dashboard-mobile-filters"
                  >
                    Фильтры
                    {activeFiltersCount > 0 && (
                      <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
                <datalist id="student-name-suggestions">
                  {suggestedNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div
                id="dashboard-mobile-filters"
                className={`${filtersExpanded ? 'block' : 'hidden'} md:block`}
              >
                <label htmlFor="dashboard-gender" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Пол
                </label>
                <select
                  id="dashboard-gender"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Все</option>
                  <option value="M">Мужской</option>
                  <option value="F">Женский</option>
                </select>
              </div>
              <div className={`${filtersExpanded ? 'block' : 'hidden'} md:block`}>
                <label htmlFor="dashboard-birth-year" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Год рождения
                </label>
                <select
                  id="dashboard-birth-year"
                  value={birthYearFilter}
                  onChange={(e) => setBirthYearFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Все</option>
                  {birthYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${filtersExpanded ? 'block' : 'hidden'} md:block`}>
                <label htmlFor="dashboard-weight-category" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Весовая категория
                </label>
                <select
                  id="dashboard-weight-category"
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Все</option>
                  {weightOptions.map((weight) => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {techAtomsLoadError ? (
              <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">{techAtomsLoadError}</p>
            ) : null}
            <div
              className={`mt-3 grid gap-3 sm:grid-cols-2 ${filtersExpanded ? 'grid' : 'hidden'} md:grid`}
            >
              <div>
                <label htmlFor="dashboard-pair-work" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Допуск к парам
                </label>
                <select
                  id="dashboard-pair-work"
                  value={pairWorkFilter}
                  onChange={(e) => setPairWorkFilter(e.target.value)}
                  disabled={!programAtoms.length}
                  title="Допуск: первые 8 элементов программы не ниже уровня «Умение»"
                  className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                >
                  <option value="all">Все</option>
                  <option value="yes">С допуском (первые 8 на «Умение»+)</option>
                  <option value="no">Без допуска</option>
                </select>
              </div>
              <div>
                <label htmlFor="dashboard-sort" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Сортировка списка
                </label>
                <select
                  id="dashboard-sort"
                  value={dashboardSort}
                  onChange={(e) => setDashboardSort(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="tech">По программе техники (номер → уровень)</option>
                  <option value="name">По ФИО (А–Я)</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {studentsWithKsr.length > 0 && filteredStudents.length === 0 && !isLoading && !loadError && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 p-6 text-center text-slate-600 dark:text-slate-400 shadow-sm">
            По выбранным фильтрам спортсмены не найдены.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {filteredStudents.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelectStudent?.(student)}
                className="rounded-xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100">
                    {student.name}
                  </h2>
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    title={student.genderLabel}
                    aria-label={`Пол: ${student.genderLabel}`}
                  >
                    {student.gender === 'F' ? 'Ж' : 'М'}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="flex min-w-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50/90 px-2 py-2 text-center shadow-sm">
                    <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{student.birthYearLabel}</span>
                  </div>
                  <div className="flex min-w-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-2 py-2 text-center shadow-sm">
                    <span className="break-words text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                      {student.weightCategoryLine}
                    </span>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="text-left">
                  <DashboardTechnicalStrip snapshot={snapshotsByStudentId.get(student.id)} />
                </div>
              </button>
            ))}
        </section>
      </div>
    </main>
  )
}

export default HomePage

