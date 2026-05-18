import { useEffect, useState } from 'react'
import { pickDoseForAge } from '../utils/exerciseDoseByAge.js'
import {
  countExerciseCompletions,
  countExerciseCompletionsToday,
} from '../utils/motorQualityWorkLog.js'

function birthYearShort(label) {
  if (!label || typeof label !== 'string') return null
  const s = label.replace(/\s*г\.?\s*р\.?/gi, '').trim()
  return s || label
}

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
    <section className={`rounded-lg border p-2.5 sm:rounded-xl sm:p-4 md:p-5 ${sectionClass}`}>
      <div className="space-y-1">
        <h2
          className={`text-xs font-semibold sm:text-sm ${
            isSensitive
              ? 'text-emerald-950 dark:text-emerald-100'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {isSensitive ? 'Сейчас сенситивный период' : 'Остальные спортсмены'}
        </h2>
        <p
          className={`text-[11px] leading-snug sm:text-xs sm:leading-relaxed ${
            isSensitive
              ? 'text-emerald-900/80 dark:text-emerald-200/80'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isSensitive
            ? `Спортсмены в окне «${qualityTitle}».`
            : `Вне сенситивного окна — квадратик на карточке будет серым.`}
        </p>
        {selectedExercise ? (
          <p
            className={`text-[11px] font-medium sm:text-xs ${
              isSensitive
                ? 'text-emerald-800 dark:text-emerald-300'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            «{selectedExercise.title}» — «Отметить» → «Подтвердить».
          </p>
        ) : isSensitive ? (
          <p className="text-[11px] text-emerald-800/70 sm:text-xs dark:text-emerald-300/80">
            Выберите упражнение ниже — появится объём и кнопка.
          </p>
        ) : null}
      </div>

      {completionError ? (
        <p className="mt-2 text-xs text-red-700 sm:text-sm dark:text-red-300" role="alert">
          {completionError}
        </p>
      ) : null}

      {loading ? (
        <p
          className={`mt-2 text-xs sm:mt-3 sm:text-sm ${
            isSensitive
              ? 'text-emerald-900/70 dark:text-emerald-200/70'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Загрузка списка…
        </p>
      ) : null}

      {isSensitive && error ? (
        <p className="mt-2 text-xs text-red-700 sm:mt-3 sm:text-sm dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && isSensitive && !error && students.length === 0 ? (
        <p className="mt-2 text-xs text-emerald-900/70 sm:mt-3 sm:text-sm dark:text-emerald-200/70">
          Сейчас никто не в сенситивном периоде. Отметить можно в блоке «Остальные спортсмены» ниже.
        </p>
      ) : null}

      {!loading && !isSensitive && students.length === 0 ? (
        <p className="mt-2 text-xs text-slate-600 sm:mt-3 sm:text-sm dark:text-slate-400">
          Все спортсмены уже в списке выше.
        </p>
      ) : null}

      {!loading && students.length > 0 ? (
        <ul className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
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
            const yearShort = birthYearShort(student.birthYearLabel)

            return (
              <li key={student.id}>
                <div
                  className={`overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-900 ${
                    pending
                      ? 'border-blue-300 ring-1 ring-blue-200 dark:border-blue-700 dark:ring-blue-900/50'
                      : dose
                        ? 'border-amber-300/90 ring-1 ring-amber-200/80 dark:border-amber-600/50 dark:ring-amber-900/30'
                        : isSensitive
                          ? 'border-emerald-200/80 dark:border-emerald-800/60'
                          : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
                    <div className="flex items-start gap-2">
                      {onOpenStudent ? (
                        <button
                          type="button"
                          onClick={() => onOpenStudent(student)}
                          className="min-w-0 flex-1 text-left active:opacity-80"
                        >
                          <span className="block truncate text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-base">
                            {student.name}
                          </span>
                        </button>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-base">
                          {student.name}
                        </span>
                      )}
                      {todayCount > 0 ? (
                        <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
                          сегодня ×{todayCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-600 sm:text-xs dark:text-slate-400">
                      <span className="tabular-nums">{student.ageInt} лет</span>
                      {yearShort ? (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span
                            className="tabular-nums"
                            title={student.birthYearLabel ?? undefined}
                          >
                            <span className="sm:hidden">{yearShort}</span>
                            <span className="hidden sm:inline">{student.birthYearLabel}</span>
                          </span>
                        </>
                      ) : null}
                      {totalCount > 0 ? (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-slate-500">×{totalCount}</span>
                        </>
                      ) : null}
                    </div>

                    {selectedExercise && dose ? (
                      <p
                        className="mt-1.5 w-full rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1 text-center text-[11px] font-semibold leading-snug text-amber-950 dark:border-amber-700/50 dark:bg-amber-500/15 dark:text-amber-100 sm:text-xs"
                        title={dose.text}
                      >
                        {dose.text}
                      </p>
                    ) : null}

                    {selectedExercise && !dose ? (
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Объём не задан</p>
                    ) : null}

                    {selectedExercise && onToggleCompletion ? (
                      <div className="mt-2 flex flex-col gap-1.5 sm:mt-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleMarkClick(student)}
                          className="w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 sm:w-auto sm:py-1.5 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                          Отметить
                        </button>
                        {todayCount > 0 ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRevokeClick(student)}
                            className="w-full text-center text-[10px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline sm:w-auto sm:text-left dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            Отменить последнюю за сегодня
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {pending && onToggleCompletion ? (
                    <div
                      className="flex flex-col gap-2 border-t border-blue-100 bg-blue-50/90 px-2.5 py-2 sm:flex-row sm:items-center sm:px-3 dark:border-blue-900/50 dark:bg-blue-950/40"
                      role="status"
                    >
                      <p className="text-[11px] leading-snug text-blue-950 sm:text-xs dark:text-blue-100">
                        {pending === 'accept'
                          ? 'Добавить выполнение в журнал?'
                          : 'Убрать последнюю отметку за сегодня?'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConfirmPending(student)}
                          className="flex-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:flex-none sm:py-1 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                          {pending === 'accept' ? 'Подтвердить' : 'Снять'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingAction(null)}
                          className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:flex-none sm:py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
