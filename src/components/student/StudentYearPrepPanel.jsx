import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { buildAnnualPrepPlan } from '../../utils/annualPrepPlan.js'
import { normalizeCompetitionRange } from '../../data/competitionLevels.js'
import {
  competitionIdentityKey,
  competitionUsesMicroPrep,
  dedupePlannedCompetitions,
  formatCompetitionRange,
  getCompetitionMeta,
  isConfirmedStart,
  newPlannedCompetitionId,
  pickNearestFutureCompetition,
} from '../../utils/plannedCompetitions.js'
import { seasonModeAllowsMicroPrep } from '../../data/seasonGoals.js'
import { competitionDateToInputString, normalizeCompetitionDateISO } from '../../utils/competitionDate.js'
import { monthYearLabelRu } from '../../utils/prepCalendarGrid.js'
import {
  buildSeasonMonthDays,
  countCompetitionsInMonth,
} from '../../utils/prepSeasonCalendar.js'
import { vk } from '../../utils/vkUi.js'
import { PrepCoachMissionFromResolved } from './PrepCoachMission.jsx'
import PrepMethodologyBlock from './PrepMethodologyBlock.jsx'
import PrepDayDetail from './PrepDayDetail.jsx'
import PrepFocusDayStrip from './PrepFocusDayStrip.jsx'
import PrepMicroCycleRoadmap from './PrepMicroCycleRoadmap.jsx'
import PrepMonthEventStrip from './PrepMonthEventStrip.jsx'
import PrepRoadmapBar from './PrepRoadmapBar.jsx'
import PrepSeasonCalendar from './PrepSeasonCalendar.jsx'
import PrepSeasonGoal from './PrepSeasonGoal.jsx'
import PrepSeasonStarts from './PrepSeasonStarts.jsx'
import PrepSelectedDayStarts from './PrepSelectedDayStarts.jsx'

/**
 * @param {{
 *   plannedCompetitions: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *   onPlannedChange: (list: import('../../utils/plannedCompetitions.js').PlannedCompetition[]) => void,
 *   onRemoveCompetition: (id: string) => void | Promise<void>,
 *   onSave: () => void,
 *   saveBusy: boolean,
 *   saveError: string,
 *   saveOk: boolean,
 *   canSave: boolean,
 *   prepContext: { ageInt?: number | null, studentName?: string | null },
 *   seasonGoal: import('../../data/seasonGoals.js').SeasonGoalId,
 *   nextSeasonGoal: import('../../data/seasonGoals.js').SeasonGoalId,
 *   ladderClosed: boolean,
 *   onSeasonGoalChange: (id: import('../../data/seasonGoals.js').SeasonGoalId) => void,
 *   onNextSeasonGoalChange: (id: import('../../data/seasonGoals.js').SeasonGoalId) => void,
 *   onLadderClosedChange: (v: boolean) => void,
 *   seasonSettingsBusy?: boolean,
 *   federationCalendarHint?: string,
 *   showingFederationDefaults?: boolean,
 *   onRestoreTypicalCalendar?: () => void | Promise<void>,
 * }} props
 */
function StudentYearPrepPanel({
  plannedCompetitions,
  onPlannedChange,
  onRemoveCompetition,
  onSave,
  saveBusy,
  saveError,
  saveOk,
  canSave,
  prepContext,
  seasonGoal,
  nextSeasonGoal,
  ladderClosed,
  onSeasonGoalChange,
  onNextSeasonGoalChange,
  onLadderClosedChange,
  seasonSettingsBusy = false,
  federationCalendarHint = '',
  showingFederationDefaults = false,
  onRestoreTypicalCalendar,
}) {
  const [focusId, setFocusId] = useState(null)
  const [draftTrack, setDraftTrack] = useState('spartakiad')
  const [draftStage, setDraftStage] = useState('russia')
  const [draftDate, setDraftDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNewCycle, setDraftNewCycle] = useState(false)
  const [draftDateStatus, setDraftDateStatus] = useState(/** @type {'confirmed' | 'orientir'} */ ('confirmed'))
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

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

  const todayIso = useMemo(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }, [])

  const [selectedISO, setSelectedISO] = useState(todayIso)

  useEffect(() => {
    const today = new Date()
    setViewMonth(today.getFullYear() === year ? today.getMonth() : 0)
  }, [year])

  const seasonMonthDays = useMemo(
    () => buildSeasonMonthDays(year, viewMonth, plannedCompetitions, focusId, todayIso),
    [year, viewMonth, plannedCompetitions, focusId, todayIso],
  )

  const monthEventCounts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => countCompetitionsInMonth(year, m, plannedCompetitions)),
    [year, plannedCompetitions],
  )

  const monthLabel = useMemo(() => {
    const iso = `${year}-${String(viewMonth + 1).padStart(2, '0')}-01`
    return monthYearLabelRu(iso)
  }, [year, viewMonth])

  const selectedDayCompetitions = useMemo(() => {
    const row = seasonMonthDays.find((d) => d.dateISO === selectedISO)
    return row?.competitions ?? []
  }, [seasonMonthDays, selectedISO])

  const plan = useMemo(
    () =>
      buildAnnualPrepPlan({
        year,
        ageInt: prepContext.ageInt ?? null,
        plannedCompetitions,
        focusCompetitionId: focusId,
        seasonGoal,
        nextSeasonGoal,
        ladderClosed,
      }),
    [year, prepContext.ageInt, plannedCompetitions, focusId, seasonGoal, nextSeasonGoal, ladderClosed],
  )

  const selected = useMemo(
    () => plan.yearDays.find((d) => d.dateISO === selectedISO) ?? null,
    [plan.yearDays, selectedISO],
  )

  const focusLabel = useMemo(() => {
    const c = plan.focusCompetition
    if (!c) return null
    const meta = getCompetitionMeta(c)
    const range = formatCompetitionRange(c)
    return `${meta.label} · ${range}${c.title ? ` · ${c.title}` : ''}`
  }, [plan.focusCompetition])

  const goToday = useCallback(() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setYear(y)
    setViewMonth(m)
    setSelectedISO(iso)
  }, [])

  const addCompetition = useCallback(() => {
    const iso = normalizeCompetitionDateISO(draftDate)
    const endRaw = competitionDateToInputString(draftEndDate) || iso
    if (!iso) return
    const range = normalizeCompetitionRange(iso, endRaw)
    const item = {
      id: newPlannedCompetitionId(iso),
      dateISO: range.dateISO,
      dateEndISO: range.dateEndISO,
      title: draftTitle.trim(),
      track: draftTrack,
      stage: draftTrack === 'experience' || draftTrack === 'match' ? null : draftStage,
      newLadderCycle:
        draftTrack === 'federation' && (draftStage === 'pmo' || draftStage === 'chmo') && draftNewCycle,
      dateStatus: draftDateStatus,
    }
    const key = competitionIdentityKey(item)
    if (plannedCompetitions.some((c) => competitionIdentityKey(c) === key)) return
    const next = dedupePlannedCompetitions([...plannedCompetitions, item])
    onPlannedChange(next)
    setFocusId(item.id)
    setDraftDate('')
    setDraftEndDate('')
    setDraftTitle('')
    setDraftNewCycle(false)
    setSelectedISO(iso)
    setViewMonth(new Date(iso + 'T12:00:00').getMonth())
    if (!iso.startsWith(String(year))) setYear(Number(iso.slice(0, 4)))
  }, [
    draftDate,
    draftDateStatus,
    draftEndDate,
    draftStage,
    draftTrack,
    draftNewCycle,
    draftTitle,
    onPlannedChange,
    plannedCompetitions,
    year,
  ])

  const removeCompetition = useCallback(
    (id) => {
      if (focusId === id) setFocusId(null)
      void onRemoveCompetition(id)
    },
    [focusId, onRemoveCompetition],
  )

  const focusCompetition = useCallback(
    (c) => {
      setFocusId(c.id)
      setSelectedISO(c.dateISO)
      setViewMonth(new Date(c.dateISO + 'T12:00:00').getMonth())
      if (!c.dateISO.startsWith(String(year))) setYear(Number(c.dateISO.slice(0, 4)))
    },
    [year],
  )

  const focusUsesMicro = plan.focusCompetition ? competitionUsesMicroPrep(plan.focusCompetition) : false
  const focusCalendarDays = plan.focusPrepPlan?.calendarDays ?? []
  const showFocusStrip =
    focusUsesMicro && focusCalendarDays.length > 0 && !plan.focusPrepPlan?.unsupported
  const daysUntil = plan.focusPrepPlan?.daysUntil

  const microCoachView = useMemo(() => {
    const focus = plan.focusCompetition
    if (plan.unsupported) {
      return {
        mode: /** @type {'blocked'} */ ('blocked'),
        blockReason: 'Возраст 13–16 на вкладке «Карта»',
      }
    }
    if (!focus) {
      return {
        mode: 'blocked',
        blockReason: 'Нет старта → добавьте отбор, сделайте фокусом',
      }
    }
    if (!focusUsesMicro) {
      return {
        mode: 'blocked',
        blockReason: 'Водокачка/матч — без ОФП→СТТМ. Нужно первенство или спартакиада',
        fightDateISO: focus.dateISO,
      }
    }
    if (!isConfirmedStart(focus)) {
      return {
        mode: /** @type {'preview'} */ ('preview'),
        blockReason: 'Дата ориентир → подтвердите для плана по дням',
        focusCompetition: focus,
        fightDateISO: focus.dateISO,
      }
    }
    const allowsMicro = seasonModeAllowsMicroPrep(plan.seasonMode, {
      ladderClosed,
      focusNewCycle: Boolean(focus.newLadderCycle),
    })
    if (!allowsMicro) {
      return {
        mode: 'preview',
        blockReason: ladderClosed
          ? 'Лестница закрыта → новый город в фокусе'
          : 'Задача «База» → переключите на «Лестница» или «Пик»',
        focusCompetition: focus,
        fightDateISO: focus.dateISO,
      }
    }
    if (plan.focusPrepPlan?.unsupported) {
      return {
        mode: 'blocked',
        blockReason: plan.focusPrepPlan.message ?? 'Микроцикл недоступен для этого возраста.',
        focusCompetition: focus,
      }
    }
    if (plan.focusPrepPlan && !plan.focusPrepPlan.unsupported) {
      return {
        mode: /** @type {'active'} */ ('active'),
        focusCompetition: focus,
        focusPrepPlan: plan.focusPrepPlan,
        fightDateISO: focus.dateISO,
      }
    }
    return {
      mode: 'blocked',
      blockReason: 'Не удалось построить план к старту.',
      focusCompetition: focus,
    }
  }, [plan, focusUsesMicro, ladderClosed])

  const coachResolved = selected?.coachResolved ?? null
  const showMacroCoachMission = microCoachView.mode !== 'active' && coachResolved

  const nearestMeta = nearest ? getCompetitionMeta(nearest) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={vk.btnSecondary} onClick={() => setYear((y) => y - 1)} aria-label="Год назад">
          ←
        </button>
        <span className="min-w-[4rem] text-center text-[15px] font-bold tabular-nums text-[#2c2d2e]">{year}</span>
        <button type="button" className={vk.btnSecondary} onClick={() => setYear((y) => y + 1)} aria-label="Год вперёд">
          →
        </button>
        <button type="button" className={vk.btnSecondary} onClick={goToday}>
          Сегодня
        </button>
        {nearest && nearestMeta ? (
          <span className="ml-auto text-[11px] text-[#818c99]">
            Ближайший:{' '}
            <button
              type="button"
              className="font-semibold text-[#2d81e0] underline-offset-2 hover:underline"
              onClick={() => focusCompetition(nearest)}
            >
              {nearestMeta.short} · {formatCompetitionRange(nearest)}
            </button>
          </span>
        ) : null}
      </div>

      {showingFederationDefaults && federationCalendarHint ? (
        <p className="text-[11px] leading-snug text-[#818c99]">{federationCalendarHint}</p>
      ) : null}

      <PrepMonthEventStrip
        eventCounts={monthEventCounts}
        activeMonth={viewMonth}
        onMonth={setViewMonth}
      />

      <div className="rounded-[12px] border border-[#e7e8ec] bg-white p-3 shadow-sm">
        <PrepSeasonCalendar
          monthDays={seasonMonthDays}
          selectedISO={selectedISO}
          onSelect={(iso) => {
            setSelectedISO(iso)
            setViewMonth(new Date(iso + 'T12:00:00').getMonth())
          }}
          monthLabel={monthLabel}
        />
      </div>

      <PrepSelectedDayStarts
        dateISO={selectedISO}
        competitions={selectedDayCompetitions}
        focusId={focusId}
        onFocus={focusCompetition}
      />

      <details className="rounded-[10px] border border-[#e7e8ec] bg-white">
        <summary className="cursor-pointer px-2.5 py-2 text-[12px] font-medium text-[#2c2d2e]">
          Старты сезона · задача · сохранить
        </summary>
        <div className="space-y-2 border-t border-[#e7e8ec] px-2.5 py-2">
          <PrepSeasonGoal
            seasonGoal={seasonGoal}
            nextSeasonGoal={nextSeasonGoal}
            ladderClosed={ladderClosed}
            onSeasonGoal={onSeasonGoalChange}
            onNextSeasonGoal={onNextSeasonGoalChange}
            onLadderClosed={onLadderClosedChange}
            disabled={seasonSettingsBusy || !canSave}
          />
          <PrepSeasonStarts
            plannedCompetitions={plannedCompetitions}
            focusId={focusId}
            draftTrack={draftTrack}
            draftStage={draftStage}
            draftDate={draftDate}
            draftEndDate={draftEndDate}
            draftTitle={draftTitle}
            draftNewCycle={draftNewCycle}
            draftDateStatus={draftDateStatus}
            onDraftTrack={setDraftTrack}
            onDraftStage={setDraftStage}
            onDraftDate={setDraftDate}
            onDraftEndDate={setDraftEndDate}
            onDraftTitle={setDraftTitle}
            onDraftNewCycle={setDraftNewCycle}
            onDraftDateStatus={setDraftDateStatus}
            onAdd={addCompetition}
            onFocus={focusCompetition}
            onRemove={removeCompetition}
            removeBusy={saveBusy}
            onSave={onSave}
            saveBusy={saveBusy}
            saveError={saveError}
            saveOk={saveOk}
            canSave={canSave}
            calendarHint={federationCalendarHint}
            showingFederationDefaults={showingFederationDefaults}
            onRestoreTypicalCalendar={onRestoreTypicalCalendar}
          />
        </div>
      </details>

      {microCoachView.mode === 'active' || microCoachView.mode === 'preview' ? (
        <details className="rounded-[10px] border border-[#e7e8ec] bg-white">
          <summary className="cursor-pointer px-2.5 py-2 text-[12px] font-medium text-[#2c2d2e]">
            План к старту (ОФП → СТТМ)
            {plan.focusCompetition ? (
              <span className="ml-1 font-normal text-[#818c99]">
                · {getCompetitionMeta(plan.focusCompetition).short}
              </span>
            ) : null}
          </summary>
          <div className="space-y-2 border-t border-[#e7e8ec] px-2.5 py-2">
            <PrepMicroCycleRoadmap
              mode={microCoachView.mode}
              blockReason={microCoachView.blockReason ?? null}
              focusCompetition={microCoachView.focusCompetition ?? plan.focusCompetition}
              focusPrepPlan={microCoachView.focusPrepPlan ?? null}
              fightDateISO={microCoachView.fightDateISO ?? null}
              todayIso={todayIso}
              studentName={prepContext.studentName}
            />
            {showMacroCoachMission ? <PrepCoachMissionFromResolved resolved={coachResolved} /> : null}
            {plan.unsupported ? (
              <p className={vk.noticeWarn}>Укажите год рождения на вкладке «Карта» (13–16 лет).</p>
            ) : (
              <>
                {showFocusStrip ? (
                  <PrepFocusDayStrip
                    calendarDays={focusCalendarDays}
                    selectedISO={selectedISO}
                    onSelect={(iso) => {
                      setSelectedISO(iso)
                      setViewMonth(new Date(iso + 'T12:00:00').getMonth())
                    }}
                  />
                ) : null}
                {selected ? (
                  <PrepDayDetail
                    day={selected}
                    focusLabel={showFocusStrip ? focusLabel : null}
                    daysUntilFocus={daysUntil}
                    phaseMetrics={selected?.microPhase?.metrics ?? null}
                  />
                ) : null}
                {plan.roadmap ? (
                  <PrepRoadmapBar roadmap={plan.roadmap} studentName={prepContext.studentName} />
                ) : null}
              </>
            )}
          </div>
        </details>
      ) : null}

      <details className="rounded-[10px] border border-[#e7e8ec] bg-white">
        <summary className="cursor-pointer px-2.5 py-2 text-[12px] font-medium text-[#2c2d2e]">
          Справка по этапам
        </summary>
        <div className="border-t border-[#e7e8ec] px-1 pb-2 pt-1">
          <PrepMethodologyBlock activePhaseId={plan.focusPrepPlan?.phase?.id} />
        </div>
      </details>
    </div>
  )
}

export default memo(StudentYearPrepPanel)
