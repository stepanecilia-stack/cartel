import { memo, useEffect, useMemo } from 'react'
import {
  COMPETITION_TRACKS,
  addDaysISO,
  getCompetitionMeta,
  stagesForTrack,
} from '../../data/competitionLevels.js'
import { formatStartWithStatus } from '../../utils/plannedCompetitions.js'
import { competitionDateToInputString } from '../../utils/competitionDate.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   plannedCompetitions: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *   focusId: string | null,
 *   draftTrack: string,
 *   draftStage: string,
 *   draftDate: string,
 *   draftEndDate: string,
 *   draftTitle: string,
 *   draftNewCycle: boolean,
 *   draftDateStatus: 'confirmed' | 'orientir',
 *   onDraftTrack: (v: string) => void,
 *   onDraftStage: (v: string) => void,
 *   onDraftDate: (v: string) => void,
 *   onDraftEndDate: (v: string) => void,
 *   onDraftTitle: (v: string) => void,
 *   onDraftNewCycle: (v: boolean) => void,
 *   onDraftDateStatus: (v: 'confirmed' | 'orientir') => void,
 *   onAdd: () => void,
 *   onFocus: (c: import('../../utils/plannedCompetitions.js').PlannedCompetition) => void,
 *   onRemove: (id: string) => void | Promise<void>,
 *   removeBusy?: boolean,
 *   onSave: () => void,
 *   saveBusy: boolean,
 *   saveError: string,
 *   saveOk: boolean,
 *   canSave: boolean,
 *   calendarHint?: string,
 *   showingFederationDefaults?: boolean,
 *   onRestoreTypicalCalendar?: () => void | Promise<void>,
 * }} props
 */
function PrepSeasonStarts({
  plannedCompetitions,
  focusId,
  draftTrack,
  draftStage,
  draftDate,
  draftEndDate,
  draftTitle,
  draftNewCycle,
  draftDateStatus,
  onDraftTrack,
  onDraftStage,
  onDraftDate,
  onDraftEndDate,
  onDraftTitle,
  onDraftNewCycle,
  onDraftDateStatus,
  onAdd,
  onFocus,
  onRemove,
  removeBusy = false,
  onSave,
  saveBusy,
  saveError,
  saveOk,
  canSave,
  calendarHint = '',
  showingFederationDefaults = false,
  onRestoreTypicalCalendar,
}) {
  const stageOptions = useMemo(() => stagesForTrack(draftTrack), [draftTrack])
  const draftMeta = getCompetitionMeta({
    track: draftTrack,
    stage: stageOptions.length ? draftStage : null,
  })
  const canAdd = competitionDateToInputString(draftDate) && competitionDateToInputString(draftEndDate)
  const showStage = stageOptions.length > 0

  useEffect(() => {
    if (!showStage) return
    if (!stageOptions.some((s) => s.id === draftStage)) {
      onDraftStage(stageOptions[0].id)
    }
  }, [draftTrack, draftStage, onDraftStage, showStage, stageOptions])

  useEffect(() => {
    const start = competitionDateToInputString(draftDate)
    if (!start) return
    const end = competitionDateToInputString(draftEndDate)
    if (end && end >= start) return
    onDraftEndDate(addDaysISO(start, Math.max(0, draftMeta.defaultDays - 1)))
  }, [draftDate, draftEndDate, draftMeta.defaultDays, onDraftEndDate])

  return (
    <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2">
      <p className="text-[13px] font-semibold text-[#2c2d2e]">Старты</p>
      {showingFederationDefaults && calendarHint ? (
        <p className="mt-1 rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-[11px] leading-snug text-amber-950">
          Типовой календарь 2026 · {calendarHint}
        </p>
      ) : (
        <p className="mt-0.5 text-[10px] text-[#818c99]">
          Свой список стартов. Удалите лишнее или верните типовой календарь.
        </p>
      )}

      <div className="mt-2 space-y-2">
        <div className={showStage ? vk.formGrid2 : ''}>
          <label className="block">
            <span className={vk.label}>Ветка</span>
            <select className={vk.input} value={draftTrack} onChange={(e) => onDraftTrack(e.target.value)}>
              {COMPETITION_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {!t.microPrep ? ' — без ОФП→СТТМ' : ''}
                </option>
              ))}
            </select>
          </label>
          {showStage ? (
            <label className="block">
              <span className={vk.label}>Ступень</span>
              <select className={vk.input} value={draftStage} onChange={(e) => onDraftStage(e.target.value)}>
                {stageOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <fieldset className="space-y-1">
          <legend className={vk.label}>Точность даты</legend>
          <div className="flex flex-wrap gap-3 text-[12px]">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="draftDateStatus"
                checked={draftDateStatus === 'confirmed'}
                onChange={() => onDraftDateStatus('confirmed')}
              />
              Подтверждена
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="draftDateStatus"
                checked={draftDateStatus === 'orientir'}
                onChange={() => onDraftDateStatus('orientir')}
              />
              Ориентир (примерно)
            </label>
          </div>
          <p className="text-[10px] text-[#818c99]">
            Ориентир: план по нарастанию этапов; микроцикл к старту — после подтверждения даты.
          </p>
        </fieldset>

        <div className={vk.formGrid2}>
          <label className="block">
            <span className={vk.label}>{draftDateStatus === 'orientir' ? 'Начало (ориентир)' : 'Начало'}</span>
            <input type="date" className={vk.input} value={draftDate} onChange={(e) => onDraftDate(e.target.value)} />
          </label>
          <label className="block">
            <span className={vk.label}>Конец</span>
            <input
              type="date"
              className={vk.input}
              value={draftEndDate}
              min={draftDate || undefined}
              onChange={(e) => onDraftEndDate(e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className={vk.label}>Название</span>
          <input
            type="text"
            className={vk.input}
            placeholder="Сыктывкар, XIII летняя…"
            value={draftTitle}
            onChange={(e) => onDraftTitle(e.target.value)}
          />
        </label>

        {draftTrack === 'federation' && (draftStage === 'pmo' || draftStage === 'chmo') ? (
          <label className="flex items-center gap-2 text-[12px] text-[#2c2d2e]">
            <input
              type="checkbox"
              checked={draftNewCycle}
              onChange={(e) => onDraftNewCycle(e.target.checked)}
              className="rounded border-[#e7e8ec]"
            />
            Первый город — новый отборный сезон
          </label>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={vk.btnSecondary} disabled={!canAdd} onClick={onAdd}>
          + Старт
        </button>
        <button type="button" disabled={!canSave || saveBusy} onClick={onSave} className={vk.btnPrimary}>
          {saveBusy ? '…' : 'Сохранить свой список'}
        </button>
        {!showingFederationDefaults && onRestoreTypicalCalendar ? (
          <button
            type="button"
            className={vk.btnSecondary}
            disabled={saveBusy}
            onClick={() => void onRestoreTypicalCalendar()}
          >
            Типовой календарь
          </button>
        ) : null}
      </div>

      {saveError ? <p className={`mt-1 ${vk.error}`}>{saveError}</p> : null}
      {saveOk && !saveError ? <p className={`mt-1 ${vk.success}`}>Сохранено</p> : null}

      {plannedCompetitions.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {plannedCompetitions.map((c) => {
            const meta = getCompetitionMeta(c)
            const active = focusId === c.id
            return (
              <li
                key={c.id}
                className={[
                  'flex items-stretch gap-1 rounded-lg border',
                  active ? 'border-[#2d81e0] ring-1 ring-[#2d81e0]/30' : 'border-[#e7e8ec]',
                ].join(' ')}
              >
                <button
                  type="button"
                  className={[
                    'flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-[11px]',
                    meta.chip,
                    active ? 'font-semibold' : '',
                  ].join(' ')}
                  onClick={() => onFocus(c)}
                >
                  <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-bold uppercase">{meta.short}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block tabular-nums">{formatStartWithStatus(c)}</span>
                    <span className="block truncate text-[#818c99]">
                      {c.title || meta.label}
                      {c.newLadderCycle ? ' · новый цикл' : ''}
                    </span>
                  </span>
                </button>
                  <button
                    type="button"
                    className="px-2 text-[#818c99] hover:text-rose-600 disabled:opacity-40"
                    disabled={removeBusy || saveBusy}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onRemove(c.id)
                    }}
                    aria-label="Удалить"
                  >
                    ✕
                  </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={`mt-2 ${vk.mutedXs}`}>Нет стартов. Укажите возраст 13–40 на вкладке «Карта».</p>
      )}
    </div>
  )
}

export default memo(PrepSeasonStarts)
