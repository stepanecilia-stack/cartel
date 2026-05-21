import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { CARTEL_PREP_AUTHORS } from '../../data/cartelPrepMethodology.js'
import { buildAnnualPrepPlan } from '../../utils/annualPrepPlan.js'
import {
  newPlannedCompetitionId,
  normalizePlannedCompetitions,
  pickNearestFutureCompetition,
} from '../../utils/plannedCompetitions.js'
import { competitionDateToInputString, normalizeCompetitionDateISO } from '../../utils/competitionDate.js'
import { vk } from '../../utils/vkUi.js'
import PrepMethodologyBlock from './PrepMethodologyBlock.jsx'
import PrepPhaseTasks from './PrepPhaseTasks.jsx'
import PrepYearCalendar from './PrepYearCalendar.jsx'
import StudentPrepTimeline from './StudentPrepTimeline.jsx'

/**
 * @param {{
 *   plannedCompetitions: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *   onPlannedChange: (list: import('../../utils/plannedCompetitions.js').PlannedCompetition[]) => void,
 *   onSave: () => void,
 *   saveBusy: boolean,
 *   saveError: string,
 *   saveOk: boolean,
 *   canSave: boolean,
 *   prepContext: { ageInt?: number | null },
 * }} props
 */
function StudentYearPrepPanel({
  plannedCompetitions,
  onPlannedChange,
  onSave,
  saveBusy,
  saveError,
  saveOk,
  canSave,
  prepContext,
}) {
  const [focusId, setFocusId] = useState(null)
  const [draftDate, setDraftDate] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [year, setYear] = useState(() => new Date().getFullYear())

  const nearest = useMemo(
    () => pickNearestFutureCompetition(plannedCompetitions),
    [plannedCompetitions],
  )

  useEffect(() => {
    if (!focusId && nearest) setFocusId(nearest.id)
    if (focusId && !plannedCompetitions.some((c) => c.id === focusId)) {
      setFocusId(nearest?.id ?? null)
    }
  }, [focusId, nearest, plannedCompetitions])

  const plan = useMemo(
    () =>
      buildAnnualPrepPlan({
        year,
        ageInt: prepContext.ageInt ?? null,
        plannedCompetitions,
        focusCompetitionId: focusId,
      }),
    [year, prepContext.ageInt, plannedCompetitions, focusId],
  )

  const calendarCells = useMemo(
    () =>
      plan.yearDays.map((d) => ({
        ...d,
        useMicroPhase: Boolean(d.inFocusPrep && d.microPhase),
        microPhase: d.microPhase,
        phase:
          d.inFocusPrep && d.microPhase
            ? d.microPhase
            : { id: d.annualPeriod.id, short: d.annualPeriod.short },
      })),
    [plan.yearDays],
  )

  const defaultISO =
    plan.yearDays.find((d) => d.isToday)?.dateISO ?? plan.yearDays[0]?.dateISO ?? ''
  const [selectedISO, setSelectedISO] = useState(defaultISO)

  useEffect(() => {
    if (!plan.yearDays.some((d) => d.dateISO === selectedISO)) {
      setSelectedISO(defaultISO)
    }
  }, [plan.yearDays, defaultISO, selectedISO])

  const selected = useMemo(
    () => plan.yearDays.find((d) => d.dateISO === selectedISO) ?? plan.yearDays[0],
    [plan.yearDays, selectedISO],
  )

  const addCompetition = useCallback(() => {
    const iso = normalizeCompetitionDateISO(draftDate)
    if (!iso) return
    if (plannedCompetitions.some((c) => c.dateISO === iso)) return
    const next = [
      ...plannedCompetitions,
      { id: newPlannedCompetitionId(iso), dateISO: iso, title: draftTitle.trim() },
    ].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    onPlannedChange(next)
    setFocusId(next.find((c) => c.dateISO === iso)?.id ?? null)
    setDraftDate('')
    setDraftTitle('')
    if (!iso.startsWith(String(year))) setYear(Number(iso.slice(0, 4)))
  }, [draftDate, draftTitle, onPlannedChange, plannedCompetitions, year])

  const removeCompetition = useCallback(
    (id) => {
      const next = plannedCompetitions.filter((c) => c.id !== id)
      onPlannedChange(next)
      if (focusId === id) setFocusId(pickNearestFutureCompetition(next)?.id ?? null)
    },
    [focusId, onPlannedChange, plannedCompetitions],
  )

  const showMicroTimeline =
    plan.focusPrepPlan &&
    !plan.focusPrepPlan.unsupported &&
    plan.focusPrepPlan.calendarDays?.length > 0

  const selectedStyle =
    selected?.inFocusPrep && selected.microPhase ? selected.microPhase : selected?.annualPeriod

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2">
        <p className="text-[12px] font-semibold text-[#2c2d2e]">Годичный цикл Cartel</p>
        <p className="mt-0.5 text-[11px] text-[#818c99]">
          Методика {CARTEL_PREP_AUTHORS} · весна–лето / осень–зима
        </p>
        {plan.todayAnnual ? (
          <div className={`mt-2 rounded-lg border px-2 py-1.5 ${vk.notice}`}>
            <p className="text-[12px] font-medium text-[#2c2d2e]">
              Сейчас: {plan.todayAnnual.label}
              <span className="text-[#818c99]"> ({plan.todayAnnual.monthsLabel})</span>
            </p>
            <PrepPhaseTasks tasks={plan.todayAnnual.tasks} compact />
          </div>
        ) : null}
      </div>

      <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2">
        <p className="text-[12px] font-semibold text-[#2c2d2e]">Плановые старты</p>
        <div className={`mt-2 ${vk.formGrid2}`}>
          <label className="block">
            <span className={vk.label}>Дата</span>
            <input
              type="date"
              className={vk.input}
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={vk.label}>Название</span>
            <input
              type="text"
              className={vk.input}
              placeholder="Первенство, кубок…"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className={`mt-2 ${vk.btnSecondary}`}
          disabled={!competitionDateToInputString(draftDate)}
          onClick={addCompetition}
        >
          Добавить старт
        </button>

        {plannedCompetitions.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {plannedCompetitions.map((c) => (
              <li
                key={c.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 ${
                  focusId === c.id ? 'border-[#2d81e0] bg-[#ecf3fc]' : 'border-[#e7e8ec]'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-[12px]"
                  onClick={() => {
                    setFocusId(c.id)
                    setSelectedISO(c.dateISO)
                    if (!c.dateISO.startsWith(String(year))) setYear(Number(c.dateISO.slice(0, 4)))
                  }}
                >
                  <span className="font-medium text-[#2c2d2e]">{c.dateISO}</span>
                  {c.title ? (
                    <span className="text-[#818c99]"> · {c.title}</span>
                  ) : (
                    <span className="text-[#818c99]"> · старт</span>
                  )}
                </button>
                <button
                  type="button"
                  className="text-[11px] text-[#818c99] hover:text-rose-600"
                  onClick={() => removeCompetition(c.id)}
                  aria-label="Удалить"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-2 ${vk.mutedXs}`}>Добавьте предполагаемые даты — на календаре появятся ★</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canSave || saveBusy}
            onClick={onSave}
            className={vk.btnPrimary}
          >
            {saveBusy ? '…' : 'Сохранить'}
          </button>
          {saveError ? <p className={vk.error}>{saveError}</p> : null}
          {saveOk && !saveError ? <p className={vk.success}>Сохранено</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-[#818c99]">Год</span>
        <button
          type="button"
          className={vk.btnSecondary}
          onClick={() => setYear((y) => y - 1)}
        >
          ←
        </button>
        <span className="text-[13px] font-semibold tabular-nums">{year}</span>
        <button
          type="button"
          className={vk.btnSecondary}
          onClick={() => setYear((y) => y + 1)}
        >
          →
        </button>
        {plan.focusCompetition ? (
          <span className={`ml-auto ${vk.mutedXs}`}>
            Фокус: {plan.focusCompetition.title || plan.focusCompetition.dateISO}
          </span>
        ) : null}
      </div>

      {plan.unsupported ? (
        <p className={vk.noticeWarn}>Укажите год рождения на вкладке «Карта» (13–16 лет).</p>
      ) : (
        <>
          <PrepYearCalendar
            yearDays={calendarCells}
            selectedISO={selectedISO}
            onSelect={setSelectedISO}
          />

          {selected ? (
            <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-3 py-2">
              <p className="text-[13px] font-semibold text-[#2c2d2e]">
                {selected.dateISO}
                {selected.isFightDay ? (
                  <span className="ml-1 text-rose-700">
                    · {selected.competitions?.map((c) => c.title || 'Старт').join(', ')}
                  </span>
                ) : null}
              </p>
              <p className="text-[12px] text-[#818c99]">
                {selected.inFocusPrep && selected.microPhase
                  ? `Микроцикл к старту: ${selected.microPhase.label}`
                  : `Годичный период: ${selected.annualPeriod.label}`}
              </p>
              {selectedStyle?.tasks ? <PrepPhaseTasks tasks={selectedStyle.tasks} compact /> : null}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(selected.slots ?? selected.annualSlots)?.map((slot) => (
                  <div key={slot.id} className="rounded-lg border border-[#e7e8ec] px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase text-[#2d81e0]">{slot.label}</p>
                    <ul className="mt-0.5 text-[12px] text-[#2c2d2e]">
                      {slot.items.map((item, i) => (
                        <li key={i}>· {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showMicroTimeline && plan.focusPrepPlan ? (
            <div className="border-t border-[#e7e8ec] pt-3">
              <p className="mb-2 text-[12px] font-semibold text-[#2c2d2e]">
                Подготовка к выбранному старту
              </p>
              <StudentPrepTimeline
                calendarDays={plan.focusPrepPlan.calendarDays}
                currentPhase={plan.focusPrepPlan.phase}
                daysUntil={plan.focusPrepPlan.daysUntil}
                ageBandLabel={plan.focusPrepPlan.ageBandLabel}
                priorities={plan.focusPrepPlan.priorities}
                competitionDate={plan.focusPrepPlan.competitionDate}
                hideMethodology
                hideCalendar
              />
            </div>
          ) : null}
        </>
      )}

      <details className="rounded-[10px] border border-[#e7e8ec] bg-white">
        <summary className="cursor-pointer px-2.5 py-2 text-[12px] font-medium text-[#2c2d2e]">
          Методика этапов (ОФП / СФП / СТТМ)
        </summary>
        <div className="border-t border-[#e7e8ec] px-1 pb-2 pt-1">
          <PrepMethodologyBlock activePhaseId={plan.focusPrepPlan?.phase?.id} />
        </div>
      </details>
    </div>
  )
}

export default memo(StudentYearPrepPanel)
