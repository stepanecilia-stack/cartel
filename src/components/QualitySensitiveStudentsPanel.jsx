import { useEffect, useState } from 'react'
import { pickDoseForAge } from '../utils/exerciseDoseByAge.js'
import {
  countExerciseCompletions,
  countExerciseCompletionsToday,
} from '../utils/motorQualityWorkLog.js'
import { vk } from '../utils/vkUi.js'

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
  const markingMode = Boolean(selectedExercise && onToggleCompletion)

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

  const sectionTitle = isSensitive ? 'Сенситивный период' : 'Остальные'

  return (
    <section className={markingMode ? 'space-y-1' : `${vk.notice} space-y-1.5`}>
      <div className={markingMode ? 'flex items-baseline justify-between gap-2 px-0.5' : ''}>
        <h2 className={markingMode ? 'text-[12px] font-semibold text-[#818c99]' : 'text-[13px] font-semibold text-[#2c2d2e]'}>
          {sectionTitle}
          {students.length > 0 ? (
            <span className="ml-1 font-normal tabular-nums">({students.length})</span>
          ) : null}
        </h2>
        {!markingMode ? (
          <p className={vk.mutedXs}>
            {isSensitive
              ? `Окно «${qualityTitle}».`
              : 'Вне окна — квадратик на карточке серый.'}
          </p>
        ) : null}
        {!markingMode && isSensitive ? (
          <p className={vk.mutedXs}>Выберите упражнение выше.</p>
        ) : null}
      </div>

      {completionError ? (
        <p className="px-0.5 text-[12px] text-[#e64646]" role="alert">
          {completionError}
        </p>
      ) : null}

      {loading ? <p className={`px-0.5 ${vk.mutedXs}`}>Загрузка…</p> : null}

      {isSensitive && error ? (
        <p className="px-0.5 text-[12px] text-[#e64646]" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && isSensitive && !error && students.length === 0 ? (
        <p className={`px-0.5 ${vk.mutedXs}`}>Сейчас никто в окне.</p>
      ) : null}

      {!loading && !isSensitive && students.length === 0 ? (
        <p className={`px-0.5 ${vk.mutedXs}`}>Все в списке выше.</p>
      ) : null}

      {!loading && students.length > 0 ? (
        <ul
          className={`${vk.list} ${markingMode ? 'max-h-[min(42vh,16rem)] overflow-y-auto' : ''}`}
        >
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

            const metaParts = [
              `${student.ageInt} лет`,
              yearShort,
              todayCount > 0 ? `сегодня ×${todayCount}` : null,
              totalCount > 0 ? `всего ×${totalCount}` : null,
            ].filter(Boolean)

            return (
              <li key={student.id} className="border-t border-[#e7e8ec] first:border-t-0">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 ${
                    pending ? 'bg-[#ecf3fc]' : todayCount > 0 ? 'bg-[#f7fcf8]' : 'bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {onOpenStudent ? (
                      <button
                        type="button"
                        onClick={() => onOpenStudent(student)}
                        className="block max-w-full truncate text-left text-[15px] font-medium leading-5 text-[#2c2d2e] active:opacity-80"
                      >
                        {student.name}
                      </button>
                    ) : (
                      <span className="block truncate text-[15px] font-medium leading-5 text-[#2c2d2e]">
                        {student.name}
                      </span>
                    )}
                    <p className="truncate text-[11px] leading-4 text-[#818c99]">
                      {metaParts.join(' · ')}
                    </p>
                  </div>

                  {markingMode && dose ? (
                    <span
                      className="hidden max-w-[5.5rem] shrink-0 truncate rounded bg-[#fff8e6] px-1.5 py-0.5 text-[10px] font-medium leading-4 text-[#2c2d2e] sm:inline-block sm:max-w-[7rem]"
                      title={dose.text}
                    >
                      {dose.text}
                    </span>
                  ) : null}

                  {markingMode && !dose ? (
                    <span className={`hidden shrink-0 ${vk.mutedXs} sm:inline`}>—</span>
                  ) : null}

                  {markingMode ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {todayCount > 0 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRevokeClick(student)}
                          className="hidden text-[11px] font-medium text-[#818c99] underline-offset-2 hover:text-[#2c2d2e] sm:inline"
                          title="Снять отметку за сегодня"
                        >
                          Снять
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleMarkClick(student)}
                        className={vk.btnCompact}
                      >
                        {busy ? '…' : 'Отметить'}
                      </button>
                    </div>
                  ) : null}
                </div>

                {markingMode && dose ? (
                  <p
                    className="truncate border-t border-[#f0f2f5] bg-[#fffbeb] px-2.5 py-0.5 text-[10px] font-medium text-[#2c2d2e] sm:hidden"
                    title={dose.text}
                  >
                    {dose.text}
                  </p>
                ) : null}

                {pending && onToggleCompletion ? (
                  <div
                    className="flex items-center gap-1.5 border-t border-[#e7e8ec] bg-[#ecf3fc] px-2.5 py-1"
                    role="status"
                  >
                    <p className="min-w-0 flex-1 truncate text-[11px] text-[#2c2d2e]">
                      {pending === 'accept' ? 'В журнал?' : 'Снять за сегодня?'}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleConfirmPending(student)}
                      className={vk.btnCompact}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPendingAction(null)}
                      className={vk.btnCompactSecondary}
                    >
                      Нет
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
