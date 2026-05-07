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
        const birthYearLabel = formatBirthYearRu(shaped.birthYear) || 'не указан'
        const weightCategoryLine = formatDashboardWeightCategory(shaped)
        return {
          ...raw,
          name: displayNameFromStudent(raw),
          birthYearLabel,
          weightCategoryLine,
          kspPercent,
          basePercent,
        }
      }),
    [students],
  )

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

        <section className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {studentsWithKsr.map((student) => (
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

