import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AddStudentModal from '../components/AddStudentModal'
import { getCoachStudents } from '../services/firebaseService'
import { findGoldStandardRow } from '../utils/ksrUtils'
import { resolveStudentLastChange } from '../utils/studentLastChange.js'
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

/** Короткая подпись веса для узких экранов. */
function formatDashboardWeightCategoryShort(fullLine) {
  if (!fullLine || fullLine === '—') return fullLine
  return fullLine.replace(/\s*\(вес из анкеты\)/i, '').trim()
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
        const birthYearNum = Number(shaped.birthYear) || null
        const birthYearLabel = formatBirthYearRu(shaped.birthYear) || 'не указан'
        const weightCategoryLine = formatDashboardWeightCategory(shaped)
        const weightCategoryShort = formatDashboardWeightCategoryShort(weightCategoryLine)
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
          weightCategoryShort,
          lastChange: resolveStudentLastChange(raw),
        }
      }),
    [students],
  )

  const filteredStudents = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery)
    const list = studentsWithKsr.filter((student) => {
      const byQuery =
        !normalizedQuery || student.nameSearch.includes(normalizedQuery)
      const byGender = genderFilter === 'all' || student.gender === genderFilter
      const byBirthYear =
        birthYearFilter === 'all' || String(student.birthYearNum ?? '') === birthYearFilter
      const byWeight = weightFilter === 'all' || student.weightCategoryLine === weightFilter
      return byQuery && byGender && byBirthYear && byWeight
    })
    return [...list].sort((a, b) => {
      const aMs = a.lastChange?.ms ?? 0
      const bMs = b.lastChange?.ms ?? 0
      if (bMs !== aMs) return bMs - aMs
      return a.nameSearch.localeCompare(b.nameSearch, 'ru')
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

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (genderFilter !== 'all') count += 1
    if (birthYearFilter !== 'all') count += 1
    if (weightFilter !== 'all') count += 1
    return count
  }, [genderFilter, birthYearFilter, weightFilter])

  const studentIds = useMemo(() => students.map((s) => s.id), [students])

  const dashboardActions = [
    {
      key: 'add',
      label: 'Добавить ученика',
      icon: '+',
      className:
        'border-blue-600 bg-blue-600 text-white shadow-md hover:bg-blue-700 active:bg-blue-800 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
      onClick: () => setAddModalOpen(true),
    },
    {
      key: 'group',
      label: 'Прогресс техники',
      icon: '⇉',
      to: '/group-training',
      className:
        'border-blue-200 bg-white text-blue-800 shadow-sm hover:bg-blue-50 active:bg-blue-100 dark:border-blue-500/40 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800',
    },
    {
      key: 'norms',
      label: 'Сдать норматив',
      icon: '✓',
      to: '/bulk-norms',
      className:
        'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm hover:bg-emerald-100 active:bg-emerald-200/80 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/50',
    },
    {
      key: 'qualities',
      label: 'База упражнений',
      icon: '◎',
      to: '/qualities',
      className:
        'border-violet-200 bg-violet-50 text-violet-900 shadow-sm hover:bg-violet-100 active:bg-violet-200/80 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50',
    },
  ]

  const actionButtonClass = (className) =>
    `inline-flex min-h-[4rem] w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center text-[13px] font-semibold leading-snug sm:min-h-[3.5rem] sm:flex-row sm:gap-2 sm:px-4 sm:py-4 sm:text-base ${className}`

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6">
      <AddStudentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        coachId={coachId}
        studentIds={studentIds}
        onListChanged={loadStudents}
      />
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
        <header className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl md:text-4xl">
            Дашборд учеников
          </h1>
          <nav className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4" aria-label="Быстрые действия">
            {dashboardActions.map((action) => {
              const content = (
                <>
                  <span aria-hidden className="text-lg leading-none sm:text-xl">
                    {action.icon}
                  </span>
                  <span>{action.label}</span>
                </>
              )
              if (action.to) {
                return (
                  <Link key={action.key} to={action.to} className={actionButtonClass(action.className)}>
                    {content}
                  </Link>
                )
              }
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className={actionButtonClass(action.className)}
                >
                  {content}
                </button>
              )
            })}
          </nav>
        </header>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:p-6">
            Загрузка данных...
          </div>
        )}

        {studentsWithKsr.length === 0 && !loadError && !isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:p-6">
            Пока нет ни одного ученика. Нажмите синюю кнопку «Добавить ученика» выше — откроется окно, куда можно
            вписать нового или ввести код от другого тренера.
          </div>
        )}

        {studentsWithKsr.length > 0 && !isLoading && (
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-4">
            <div className="grid gap-3 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-1">
                <label htmlFor="dashboard-search" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
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
                    className="min-h-[2.75rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setFiltersExpanded((prev) => !prev)}
                    className="inline-flex min-h-[2.75rem] shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 md:hidden"
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
                <label htmlFor="dashboard-gender" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                  Пол
                </label>
                <select
                  id="dashboard-gender"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="min-h-[2.75rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 sm:text-sm"
                >
                  <option value="all">Все</option>
                  <option value="M">Мужской</option>
                  <option value="F">Женский</option>
                </select>
              </div>
              <div className={`${filtersExpanded ? 'block' : 'hidden'} md:block`}>
                <label htmlFor="dashboard-birth-year" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                  Год рождения
                </label>
                <select
                  id="dashboard-birth-year"
                  value={birthYearFilter}
                  onChange={(e) => setBirthYearFilter(e.target.value)}
                  className="min-h-[2.75rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 sm:text-sm"
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
                <label htmlFor="dashboard-weight-category" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                  Весовая категория
                </label>
                <select
                  id="dashboard-weight-category"
                  value={weightFilter}
                  onChange={(e) => setWeightFilter(e.target.value)}
                  className="min-h-[2.75rem] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 sm:text-sm"
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
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
            По выбранным фильтрам спортсмены не найдены.
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {filteredStudents.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelectStudent?.(student)}
                className="min-h-[4.5rem] touch-manipulation rounded-xl border border-slate-100 bg-white p-3.5 text-left shadow-sm transition-shadow active:bg-slate-50 active:shadow-inner hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800 sm:p-4"
              >
                <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">
                      {student.name}
                    </h2>
                    {student.lastChange ? (
                      <p
                        className={`mt-0.5 line-clamp-2 text-[10px] leading-snug sm:line-clamp-1 sm:truncate sm:text-[11px] ${
                          student.lastChange.isStale
                            ? 'text-amber-800 dark:text-amber-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                        title={[
                          student.lastChange.coachName
                            ? `Изменил: ${student.lastChange.coachName}`
                            : null,
                          student.lastChange.sectionLabel
                            ? `Раздел: ${student.lastChange.sectionLabel}`
                            : null,
                          student.lastChange.dateLabel,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      >
                        {student.lastChange.isStale ? (
                          <span className="mr-0.5" aria-hidden>
                            ⚠️
                          </span>
                        ) : null}
                        {student.lastChange.coachName ? (
                          <span className="font-medium">{student.lastChange.coachName}</span>
                        ) : (
                          <span>Изменение</span>
                        )}
                        {student.lastChange.sectionLabel ? (
                          <>
                            <span className="text-slate-400"> · </span>
                            <span>{student.lastChange.sectionLabel}</span>
                          </>
                        ) : null}
                        <span className="text-slate-400"> · </span>
                        <span className="tabular-nums">{student.lastChange.dateLabel}</span>
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1 sm:mt-2 sm:gap-1.5">
                      <span
                        className="inline-flex shrink-0 rounded border border-blue-100 bg-blue-50/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums leading-none text-slate-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-slate-200 sm:text-xs"
                        title={`Год рождения: ${student.birthYearLabel}`}
                      >
                        {student.birthYearLabel}
                      </span>
                      <span
                        className="inline-flex min-w-0 max-w-[10.5rem] truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-slate-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 sm:max-w-none sm:text-xs"
                        title={student.weightCategoryLine}
                      >
                        <span className="truncate sm:hidden">{student.weightCategoryShort}</span>
                        <span className="hidden truncate sm:inline">{student.weightCategoryLine}</span>
                      </span>
                    </div>
                  </div>
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:h-7 sm:w-7 sm:rounded-md sm:text-xs"
                    title={student.genderLabel}
                    aria-label={`Пол: ${student.genderLabel}`}
                  >
                    {student.gender === 'F' ? 'Ж' : 'М'}
                  </span>
                </div>
              </button>
            ))}
        </section>
      </div>
    </main>
  )
}

export default HomePage

