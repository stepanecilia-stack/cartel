import { memo, useMemo } from 'react'
import { buildCompetitionPrepPlan } from '../../utils/competitionPrepPlan.js'
import { competitionDateToInputString } from '../../utils/competitionDate.js'
import { vk } from '../../utils/vkUi.js'
import StudentPrepTimeline from './StudentPrepTimeline.jsx'

/**
 * @param {{
 *   competitionDate: string,
 *   competitionTitle: string,
 *   onCompetitionDateChange: (v: string) => void,
 *   onCompetitionTitleChange: (v: string) => void,
 *   onSave: () => void,
 *   saveBusy: boolean,
 *   saveError: string,
 *   saveOk: boolean,
 *   canSave: boolean,
 *   prepContext: { ageInt?: number | null },
 * }} props
 */
function StudentCompetitionPrepPanel({
  competitionDate,
  competitionTitle,
  onCompetitionDateChange,
  onCompetitionTitleChange,
  onSave,
  saveBusy,
  saveError,
  saveOk,
  canSave,
  prepContext,
}) {
  const plan = useMemo(
    () =>
      competitionDateToInputString(competitionDate)
        ? buildCompetitionPrepPlan({
            ageInt: prepContext.ageInt ?? null,
            competitionDate: competitionDateToInputString(competitionDate),
            competitionTitle,
          })
        : null,
    [prepContext.ageInt, competitionDate, competitionTitle],
  )

  const showTimeline =
    plan &&
    !plan.unsupported &&
    plan.phase?.id !== 'past' &&
    plan.phase?.id !== 'none' &&
    plan.calendarDays?.length > 0

  return (
    <div className="space-y-3">
      <div className={vk.formGrid2}>
        <label className="block">
          <span className={vk.label}>Дата соревнований</span>
          <input
            type="date"
            className={vk.input}
            min={new Date().toISOString().slice(0, 10)}
            value={competitionDate}
            onChange={(e) => onCompetitionDateChange(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={vk.label}>Турнир / старт (необязательно)</span>
          <input
            type="text"
            className={vk.input}
            placeholder="Чемпионат, кубок…"
            value={competitionTitle}
            onChange={(e) => onCompetitionTitleChange(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canSave || saveBusy || !competitionDateToInputString(competitionDate)}
          onClick={onSave}
          className={vk.btnPrimary}
        >
          {saveBusy ? '…' : 'Сохранить дату'}
        </button>
        {saveError ? (
          <p className={vk.error} role="alert">
            {saveError}
          </p>
        ) : null}
        {saveOk && !saveError ? <p className={vk.success}>Сохранено</p> : null}
      </div>

      {!plan ? (
        <p className={vk.mutedXs}>
          Укажите дату старта — план по методике Филимонова и Степанца (ОФП → СФП → СТТМ), 13–16
          лет, раунд 2:15.
        </p>
      ) : null}

      {plan?.unsupported ? <p className={vk.noticeWarn}>{plan.message}</p> : null}

      {plan && !plan.unsupported && plan.phase?.id === 'past' ? (
        <p className={vk.noticeWarn}>Дата в прошлом — укажите предстоящий старт.</p>
      ) : null}

      {showTimeline ? (
        <StudentPrepTimeline
          calendarDays={plan.calendarDays}
          currentPhase={plan.phase}
          daysUntil={plan.daysUntil}
          ageBandLabel={plan.ageBandLabel}
          priorities={plan.priorities}
          competitionDate={plan.competitionDate}
        />
      ) : null}
    </div>
  )
}

export default memo(StudentCompetitionPrepPanel)
