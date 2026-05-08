import { useCallback, useEffect, useMemo, useState } from 'react'
import AddStudentModal from '../components/AddStudentModal'
import BiometricPotentialBar from '../components/BiometricPotentialBar'
import { getCoachStudents } from '../services/firebaseService'
import { calculateKsrAndKsp, findGoldStandardRow } from '../utils/ksrUtils'
import {
  coerceScores,
  displayNameFromStudent,
  formatBirthYearRu,
  studentAthleteShape,
} from '../utils/studentModel'

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

  const studentsWithKsr = useMemo(
    () =>
      students.map((raw) => {
        const shaped = studentAthleteShape(raw)
        const scores = coerceScores(raw.scores)
        const ksrKsp = calculateKsrAndKsp(shaped, scores)
        const kspPercent = Math.max(0, Math.min(100, Number(ksrKsp.ksp) || 0))
        const basePercent = Math.max(0, Math.min(100, Number(ksrKsp.baseKSR) || 0))
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
          kspPercent,
          basePercent,
        }
      }),
    [students],
  )

  const filteredStudents = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery)
    return studentsWithKsr.filter((student) => {
      const byQuery =
        !normalizedQuery || student.nameSearch.includes(normalizedQuery)
      const byGender = genderFilter === 'all' || student.gender === genderFilter
      const byBirthYear =
        birthYearFilter === 'all' || String(student.birthYearNum ?? '') === birthYearFilter
      const byWeight = weightFilter === 'all' || student.weightCategoryLine === weightFilter
      return byQuery && byGender && byBirthYear && byWeight
    })
  }, [studentsWithKsr, searchQuery, genderFilter, birthYearFilter, weightFilter])

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

  const studentIds = useMemo(() => students.map((s) => s.id), [students])

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 sm:px-6 sm:py-12">
      <AddStudentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        coachId={coachId}
        studentIds={studentIds}
        onListChanged={loadStudents}
      />
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-4">
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            Cartel Boxing
          </span>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Дашборд учеников
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <span className="text-base leading-none">+</span>
              Добавить ученика
            </button>
          </div>
        </header>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Загрузка данных...
          </div>
        )}

        {studentsWithKsr.length === 0 && !loadError && !isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            Пока нет ни одного ученика. Нажмите синюю кнопку «Добавить ученика» выше — откроется окно, куда можно
            вписать нового или ввести код от другого тренера.
          </div>
        )}

        {studentsWithKsr.length > 0 && !isLoading && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-1">
                <label htmlFor="dashboard-search" className="mb-1 block text-xs font-medium text-slate-600">
                  Поиск по ФИО
                </label>
                <input
                  id="dashboard-search"
                  type="text"
                  list="student-name-suggestions"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Начните вводить имя..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
                <datalist id="student-name-suggestions">
                  {suggestedNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="dashboard-gender" className="mb-1 block text-xs font-medium text-slate-600">
                  Пол
                </label>
                <select
                  id="dashboard-gender"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Все</option>
                  <option value="M">Мужской</option>
                  <option value="F">Женский</option>
                </select>
              </div>
              <div>
                <label htmlFor="dashboard-birth-year" className="mb-1 block text-xs font-medium text-slate-600">
                  Год рождения
                </label>
                <select
                  id="dashboard-birth-year"
                  value={birthYearFilter}
                  onChange={(e) => setBirthYearFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Все</option>
                  {birthYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dashboard-weight-category" className="mb-1 block text-xs font-medium text-slate-600">
                  Весовая категория
                </label>
                <select
                  id="dashboard-weight-category"
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
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
          </section>
        )}

        {studentsWithKsr.length > 0 && filteredStudents.length === 0 && !isLoading && !loadError && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
            По выбранным фильтрам спортсмены не найдены.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {filteredStudents.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelectStudent?.(student)}
                className="rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <h2 className="text-lg font-semibold leading-snug text-slate-900">{student.name}</h2>
                <div className="mt-2.5 grid min-h-[2.75rem] grid-cols-2 gap-2">
                  <div className="flex min-w-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50/90 px-2 py-2 text-center shadow-sm">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{student.birthYearLabel}</span>
                  </div>
                  <div className="flex min-w-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-2 text-center shadow-sm">
                    <span className="break-words text-sm font-semibold leading-tight text-slate-900">
                      {student.weightCategoryLine}
                    </span>
                  </div>
                </div>
                <BiometricPotentialBar
                  className="mt-3"
                  compact
                  kspPercent={student.kspPercent}
                  basePercent={student.basePercent}
                />
              </button>
            ))}
        </section>
      </div>
    </main>
  )
}

export default HomePage

