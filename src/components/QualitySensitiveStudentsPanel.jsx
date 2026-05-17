import { pickDoseForAge } from '../utils/exerciseDoseByAge.js'

/**
 * @param {{
 *   qualityTitle: string,
 *   students: { id: string, name: string, ageInt: number, birthYearLabel?: string | null }[],
 *   loading: boolean,
 *   error: string,
 *   selectedExercise?: { id: string, title: string, doseUnder12?: string, dose13to15?: string, dose16Plus?: string } | null,
 *   onOpenStudent?: (student: object) => void,
 * }} props
 */
export default function QualitySensitiveStudentsPanel({
  qualityTitle,
  students,
  loading,
  error,
  selectedExercise,
  onOpenStudent,
}) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
          Сейчас сенситивный период
        </h2>
        <p className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
          Ваши спортсмены, у которых по возрасту сейчас открыто окно для «{qualityTitle}».
        </p>
        {selectedExercise ? (
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
            Объём для упражнения: «{selectedExercise.title}»
          </p>
        ) : (
          <p className="text-xs text-emerald-800/70 dark:text-emerald-300/80">
            Нажмите на упражнение ниже — рядом с именем появится рекомендуемый объём.
          </p>
        )}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-emerald-900/70 dark:text-emerald-200/70">Загрузка списка…</p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && students.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-900/70 dark:text-emerald-200/70">
          Среди ваших спортсменов сейчас никто не попадает в сенситивный период по этому качеству (или не указан
          год рождения).
        </p>
      ) : null}

      {!loading && !error && students.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {students.map((student) => {
            const dose = selectedExercise ? pickDoseForAge(student.ageInt, selectedExercise) : null
            return (
              <li key={student.id}>
                <div
                  className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 shadow-sm dark:bg-slate-900 ${
                    dose
                      ? 'border-amber-300 ring-1 ring-amber-200 dark:border-amber-600/60 dark:ring-amber-900/40'
                      : 'border-emerald-200/80 dark:border-emerald-800/60'
                  }`}
                >
                  {onOpenStudent ? (
                    <button
                      type="button"
                      onClick={() => onOpenStudent(student)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
                        {student.ageInt} лет
                        {student.birthYearLabel ? ` · ${student.birthYearLabel}` : ''}
                      </span>
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
                        {student.ageInt} лет
                        {student.birthYearLabel ? ` · ${student.birthYearLabel}` : ''}
                      </span>
                    </div>
                  )}
                  {selectedExercise ? (
                    <div className="shrink-0 text-right">
                      {dose ? (
                        <p className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-950 dark:bg-amber-500/25 dark:text-amber-100">
                          {dose.text}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">объём не задан</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
