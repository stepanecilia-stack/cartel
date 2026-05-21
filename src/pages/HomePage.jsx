import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AddStudentModal from '../components/AddStudentModal'
import { useCoachStudents } from '../hooks/useCoachStudents.js'
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

function HomePage({ onSelectStudent, coachId, isProgramAdmin = false }) {
  const { students, isLoading, loadError } = useCoachStudents(coachId)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [birthYearFilter, setBirthYearFilter] = useState('all')
  const [weightFilter, setWeightFilter] = useState('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

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

  const dashboardActions = useMemo(() => {
    const actions = [
      {
        key: 'add',
        label: 'Добавить ученика',
        icon: '+',
        iconClass: 'bg-[#2d81e0] text-white text-xl font-light',
        onClick: () => setAddModalOpen(true),
      },
      {
        key: 'group',
        label: 'Прогресс техники',
        icon: '⇉',
        iconClass: 'bg-[#e5f1fb] text-[#2d81e0] text-base',
        to: '/group-training',
      },
      {
        key: 'norms',
        label: 'Сдать норматив',
        icon: '✓',
        iconClass: 'bg-[#e8f9ed] text-[#4bb34b] text-base font-bold',
        to: '/bulk-norms',
      },
      {
        key: 'qualities',
        label: 'База упражнений',
        icon: '◎',
        iconClass: 'bg-[#f0ebfa] text-[#735ce6] text-base',
        to: '/qualities',
      },
    ]
    if (isProgramAdmin) {
      actions.push({
        key: 'elements',
        label: 'Элементы техники',
        icon: '▣',
        iconClass: 'bg-[#fff8e6] text-[#e6a817] text-base',
        to: '/technical-elements',
      })
    }
    return actions
  }, [isProgramAdmin])

  const vkTileClass =
    'flex min-h-[4.25rem] w-full touch-manipulation flex-col items-center justify-start gap-1 rounded-md px-0.5 py-1.5 text-center active:bg-[#f5f6f8] dark:active:bg-[#2c2d2e] sm:min-h-[4.5rem]'

  const renderVkAction = (action) => {
    const content = (
      <>
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${action.iconClass}`}
        >
          {action.icon}
        </span>
        <span className="line-clamp-2 text-[11px] font-medium leading-[13px] text-[#2c2d2e] dark:text-[#e1e3e6]">
          {action.label}
        </span>
      </>
    )
    if (action.to) {
      return (
        <Link key={action.key} to={action.to} className={vkTileClass}>
          {content}
        </Link>
      )
    }
    return (
      <button key={action.key} type="button" onClick={action.onClick} className={vkTileClass}>
        {content}
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-[#edeef0] px-2 py-2 font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] text-[#2c2d2e] dark:bg-[#141414] dark:text-[#e1e3e6] sm:px-4 sm:py-3">
      <AddStudentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        coachId={coachId}
        studentIds={studentIds}
      />
      <div className="mx-auto max-w-6xl space-y-2">
        <header className="space-y-2">
          <h1 className="px-0.5 text-[17px] font-semibold leading-5 text-[#2c2d2e] dark:text-[#e1e3e6] sm:text-xl">
            Дашборд учеников
          </h1>
          <nav
            className="grid grid-cols-4 gap-0 rounded-[10px] bg-white px-0.5 py-1 dark:bg-[#232324]"
            aria-label="Быстрые действия"
          >
            {dashboardActions.map((action) => renderVkAction(action))}
          </nav>
        </header>

        {loadError && (
          <div className="rounded-[10px] bg-white px-3 py-2.5 text-[13px] text-[#e64646] dark:bg-[#232324]">
            {loadError}
          </div>
        )}

        {isLoading && (
          <div className="rounded-[10px] bg-white px-3 py-4 text-center text-[13px] text-[#818c99] dark:bg-[#232324] dark:text-[#939393]">
            Загрузка данных...
          </div>
        )}

        {studentsWithKsr.length === 0 && !loadError && !isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:p-6">
            Пока нет ни одного ученика. Нажмите «Добавить ученика» выше — откроется окно, куда можно вписать нового или ввести код от другого тренера.
          </div>
        )}

        {studentsWithKsr.length > 0 && !isLoading && (
          <section className="rounded-[10px] bg-white p-2 dark:bg-[#232324] sm:p-2.5">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-2 lg:col-span-1">
                <label htmlFor="dashboard-search" className="mb-1 block text-[13px] font-normal text-[#818c99] dark:text-[#939393]">
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
                    className="h-9 w-full rounded-lg bg-[#f0f2f5] px-3 text-[15px] leading-5 text-[#2c2d2e] placeholder:text-[#818c99] outline-none focus:bg-[#ebedf0] dark:bg-[#2c2d2e] dark:text-[#e1e3e6] dark:placeholder:text-[#939393]"
                  />
                  <button
                    type="button"
                    onClick={() => setFiltersExpanded((prev) => !prev)}
                    className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-1 rounded-lg bg-[#f0f2f5] px-3 text-[13px] font-medium text-[#2d81e0] active:bg-[#ebedf0] dark:bg-[#2c2d2e] dark:text-[#71aaeb] md:hidden"
                    aria-expanded={filtersExpanded}
                    aria-controls="dashboard-mobile-filters"
                  >
                    Фильтры
                    {activeFiltersCount > 0 && (
                      <span className="rounded-full bg-[#2d81e0] px-1.5 py-0.5 text-[11px] font-semibold text-white">
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
          <div className="rounded-[10px] bg-white px-3 py-3 text-center text-[13px] text-[#818c99] dark:bg-[#232324] dark:text-[#939393]">
            По выбранным фильтрам спортсмены не найдены.
          </div>
        )}

        <section className="overflow-hidden rounded-[10px] bg-white dark:bg-[#232324] sm:grid sm:grid-cols-2 sm:gap-px sm:bg-[#e7e8ec] sm:dark:bg-[#363738] lg:grid-cols-3">
          {filteredStudents.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelectStudent?.(student)}
                className="w-full touch-manipulation border-t border-[#e7e8ec] bg-white px-3 py-2.5 text-left first:border-t-0 active:bg-[#f5f6f8] dark:border-[#363738] dark:bg-[#232324] dark:active:bg-[#2c2d2e] sm:border-t-0 sm:p-3"
              >
                <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-medium leading-5 text-[#2c2d2e] dark:text-[#e1e3e6]">
                      {student.name}
                    </h2>
                    {student.lastChange ? (
                      <p
                        className={`mt-0.5 line-clamp-2 text-[10px] leading-snug sm:line-clamp-1 sm:truncate sm:text-[11px] ${
                          student.lastChange.isStale
                            ? 'text-amber-800 dark:text-amber-300'
                            : 'text-[#818c99] dark:text-[#939393]'
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
                        className="inline-flex shrink-0 rounded px-1.5 py-0.5 text-[12px] font-normal tabular-nums leading-none text-[#818c99] dark:text-[#939393]"
                        title={`Год рождения: ${student.birthYearLabel}`}
                      >
                        {student.birthYearLabel}
                      </span>
                      <span
                        className="inline-flex min-w-0 max-w-[10.5rem] truncate rounded bg-[#f0f2f5] px-1.5 py-0.5 text-[12px] font-normal leading-none text-[#818c99] dark:bg-[#2c2d2e] dark:text-[#939393] sm:max-w-none"
                        title={student.weightCategoryLine}
                      >
                        <span className="truncate sm:hidden">{student.weightCategoryShort}</span>
                        <span className="hidden truncate sm:inline">{student.weightCategoryLine}</span>
                      </span>
                    </div>
                  </div>
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f2f5] text-[12px] font-medium text-[#818c99] dark:bg-[#2c2d2e] dark:text-[#939393]"
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

