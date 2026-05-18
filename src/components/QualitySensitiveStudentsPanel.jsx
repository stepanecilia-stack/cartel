import { useEffect, useState } from 'react'
import { pickDoseForAge } from '../utils/exerciseDoseByAge.js'
import {
  countExerciseCompletions,
  countExerciseCompletionsToday,
} from '../utils/motorQualityWorkLog.js'

/**
 * @param {{
 *   variant?: 'sensitive' | 'others',
 *   qualityTitle: string,
 *   qualitySlug: string,
 *   students: object[],
 *   loading: boolean,
 *   error: string,
 *   selectedExercise?: { id: string, title: string, doseUnder12?: string, dose13to15?: string, dose16Plus?: string } | null,
 *   completionBusyId?: string | null,
 *   completionError?: string,
 *   onOpenStudent?: (student: object) => void,
 *   onToggleCompletion?: (student: object, checked: boolean) => void | Promise<boolean>,
 * }} props
 */
export default function QualitySensitiveStudentsPanel({
  variant = 'sensitive',
  qualityTitle,
  qualitySlug,
  students,
  loading,
  error,
  selectedExercise,
  completionBusyId,
  completionError,
  onOpenStudent,
  onToggleCompletion,
}) {
  /** @type {[{ studentId: string, type: 'accept' | 'revoke' } | null, Function]} */
  const [pendingAction, setPendingAction] = useState(null)

  const isSensitive = variant === 'sensitive'

  useEffect(() => {
    setPendingAction(null)
  }, [selectedExercise?.id])

  const handleMarkClick = (student) => {
    if (!onToggleCompletion || completionBusyId) return
    setPendingAction({ studentId: student.id, type: 'accept' })
  }

  const handleRevokeClick = (student) => {
    if (!onToggleCompletion || completionBusyId) return
    setPendingAction({ studentId: student.id, type: 'revoke' })
  }

  const handleConfirmPending = async (student) => {
    if (!pendingAction || pendingAction.studentId !== student.id || !onToggleCompletion) return
    const checked = pendingAction.type === 'accept'
    const ok = await onToggleCompletion(student, checked)
    if (ok) setPendingAction(null)
  }

  const sectionClass = isSensitive
    ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30'
    : 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40'

  return (
    <section className={`rounded-xl border p-4 sm:p-5 ${sectionClass}`}>
      <div className="space-y-1">
        <h2
          className={`text-sm font-semibold ${
            isSensitive
              ? 'text-emerald-950 dark:text-emerald-100'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {isSensitive ? 'Сейчас сенситивный период' : 'Остальные спортсмены'}
        </h2>
        <p
          className={`text-xs leading-relaxed ${
            isSensitive
              ? 'text-emerald-900/80 dark:text-emerald-200/80'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isSensitive
            ? `Ваши спортсмены, у которых по возрасту сейчас открыто окно для «${qualityTitle}».`
            : `Можно отметить выполнение и вне сенситивного окна — квадратик на карточке будет серым.`}
        </p>
        {selectedExercise ? (
          <p
            className={`text-xs font-medium ${
              isSensitive
                ? 'text-emerald-800 dark:text-emerald-300'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            «{selectedExercise.title}» — каждое подтверждение добавляет квадрат в карточке ученика (в том числе
            через несколько дней).
          </p>
        ) : isSensitive ? (
          <p className="text-xs text-emerald-800/70 dark:text-emerald-300/80">
            Нажмите на упражнение ниже — появится объём и кнопка «Отметить».
          </p>
        ) : null}
      </div>

      {isSensitive && completionError ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">
          {completionError}
        </p>
      ) : null}

      {loading ? (
        <p
          className={`mt-3 text-sm ${
            isSensitive
              ? 'text-emerald-900/70 dark:text-emerald-200/70'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Загрузка списка…
        </p>
      ) : null}

      {isSensitive && error ? (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && isSensitive && !error && students.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-900/70 dark:text-emerald-200/70">
          Среди ваших спортсменов сейчас никто не попадает в сенситивный период по этому качеству (или не указан
          год рождения). Отметить выполнение можно в блоке ниже.
        </p>
      ) : null}

      {!loading && !isSensitive && students.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Все спортсмены с возрастом уже в списке выше.</p>
      ) : null}

      {!loading && students.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {students.map((student) => {
            const dose = selectedExercise ? pickDoseForAge(student.ageInt, selectedExercise) : null
            const totalCount =
              selectedExercise && qualitySlug
                ? countExerciseCompletions(student.motorQualityWorkLog, qualitySlug, selectedExercise.id)
                : 0
            const todayCount =
              selectedExercise && qualitySlug
                ? countExerciseCompletionsToday(student.motorQualityWorkLog, qualitySlug, selectedExercise.id)
                : 0
            const busy = completionBusyId === student.id
            const pending =
              pendingAction?.studentId === student.id ? pendingAction.type : null

            return (
              <li key={student.id}>
                <div
                  className={`rounded-lg border bg-white shadow-sm dark:bg-slate-900 ${
                    pending
                      ? 'border-blue-300 ring-1 ring-blue-200 dark:border-blue-700 dark:ring-blue-900/50'
                      : dose
                        ? 'border-amber-300 ring-1 ring-amber-200 dark:border-amber-600/60 dark:ring-amber-900/40'
                        : isSensitive
                          ? 'border-emerald-200/80 dark:border-emerald-800/60'
                          : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
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
                          {totalCount > 0 ? (
                            <span className="text-slate-500"> · выполнений: {totalCount}</span>
                          ) : null}
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

                    {selectedExercise && onToggleCompletion ? (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {todayCount > 0 ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
                            сегодня ×{todayCount}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleMarkClick(student)}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                          Отметить
                        </button>
                        {todayCount > 0 ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRevokeClick(student)}
                            className="text-[10px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            Отменить последнюю за сегодня
                          </button>
                        ) : null}
                      </div>
                    ) : null}

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

                  {pending && onToggleCompletion ? (
                    <div
                      className="flex flex-wrap items-center gap-2 border-t border-blue-100 bg-blue-50/90 px-3 py-2 dark:border-blue-900/50 dark:bg-blue-950/40"
                      role="status"
                    >
                      <p className="min-w-0 flex-1 text-xs text-blue-950 dark:text-blue-100">
                        {pending === 'accept'
                          ? 'Добавить выполнение в журнал? (новый квадрат в карточке ученика)'
                          : 'Убрать последнюю отметку за сегодня по этому упражнению?'}
                      </p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConfirmPending(student)}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                          {pending === 'accept' ? 'Подтвердить' : 'Снять'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingAction(null)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          Отмена
                        </button>
                      </div>
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
