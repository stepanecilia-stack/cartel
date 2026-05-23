import { memo, useMemo } from 'react'
import { CARTEL_STAGES } from '../../data/cartelParticipation.js'
import { buildCartelCoachDirective } from '../../utils/cartelCoachDirective.js'
import { vk } from '../../utils/vkUi.js'
import CartelCoachStageControl from './CartelCoachStageControl.jsx'
import CartelStageProgress from './CartelStageProgress.jsx'

/**
 * @param {{
 *   student?: Record<string, unknown> | null,
 *   allNorms?: object[],
 *   kd?: number,
 *   techniquePercent?: number,
 *   atomsAtSkill?: number,
 *   totalAtoms?: number,
 *   effectiveKsr?: number,
 *   year: number,
 *   ageInt?: number | null,
 *   calendarItems: import('../../utils/plannedCompetitions.js').PlannedCompetition[],
 *   focusCompetitionId?: string | null,
 *   selectedISO: string,
 *   seasonBlocks: import('../../utils/seasonPlan.js').SeasonBlock[],
 *   seasonCheckpoints: import('../../utils/seasonPlan.js').SeasonCheckpoint[],
 *   canSave?: boolean,
 *   onOpenTab?: (tabId: string) => void,
 *   onConfirmCartelStage?: (
 *     stage: import('../../data/cartelParticipation.js').CartelStageId,
 *     opts?: { earlyAccess?: boolean, note?: string },
 *   ) => void | Promise<void>,
 *   onAddSparring?: () => void | Promise<void>,
 *   onAddMatch?: () => void | Promise<void>,
 *   onToggleSpecialPass?: () => void | Promise<void>,
 *   onSaveCartelDocuments?: (docs: import('../../data/cartelDocuments.js').CartelDocumentsMap) => void | Promise<void>,
 *   onApplyRecommendedPlan?: () => void | Promise<void>,
 *   onAddEvent?: () => void,
 *   stageBusy?: boolean,
 *   applyBusy?: boolean,
 * }} props
 */
function SeasonCoachGuide({
  student = null,
  allNorms = [],
  kd = 0.25,
  techniquePercent = 0,
  atomsAtSkill = 0,
  totalAtoms = 0,
  effectiveKsr = 0,
  year,
  ageInt = null,
  calendarItems,
  focusCompetitionId = null,
  selectedISO,
  seasonBlocks,
  seasonCheckpoints,
  canSave = true,
  onOpenTab,
  onConfirmCartelStage,
  onAddSparring,
  onAddMatch,
  onToggleSpecialPass,
  onSaveCartelDocuments,
  onApplyRecommendedPlan,
  onAddEvent,
  stageBusy = false,
  applyBusy = false,
}) {
  const d = useMemo(
    () =>
      buildCartelCoachDirective({
        student,
        allNorms,
        confirmedStage: student?.cartelStage,
        kd,
        techniquePercent,
        atomsAtSkill,
        totalAtoms,
        effectiveKsr,
        seasonCheckpoints,
        seasonBlocks,
        calendarItems,
        year,
        ageInt,
        focusCompetitionId,
        selectedISO,
      }),
    [
      student,
      allNorms,
      kd,
      techniquePercent,
      atomsAtSkill,
      totalAtoms,
      effectiveKsr,
      seasonCheckpoints,
      seasonBlocks,
      calendarItems,
      year,
      ageInt,
      focusCompetitionId,
      selectedISO,
    ],
  )

  const runAction = (action) => {
    if (!action) return
    switch (action.type) {
      case 'open_technical':
        onOpenTab?.('technical')
        break
      case 'open_physical':
        onOpenTab?.('physical')
        break
      case 'open_motor':
        onOpenTab?.('motor')
        break
      case 'add_sparring':
        void onAddSparring?.()
        break
      case 'add_match':
        void onAddMatch?.()
        break
      case 'toggle_special_pass':
        void onToggleSpecialPass?.()
        break
      case 'add_event':
        onAddEvent?.()
        break
      case 'apply_plan':
        void onApplyRecommendedPlan?.()
        break
      default:
        break
    }
  }

  const stageIndex = CARTEL_STAGES.findIndex((s) => s.id === d.confirmedStage)

  return (
    <div className="space-y-3">
      <section className="rounded-[12px] border-2 border-[#2d81e0] bg-white p-3 shadow-sm">
        <p className="text-[12px] leading-relaxed text-[#818c99]">{d.cartelRule}</p>

        <div className="mt-3 flex gap-1">
          {CARTEL_STAGES.map((s, i) => (
            <div
              key={s.id}
              title={s.subtitle}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stageIndex ? 'bg-[#2d81e0]' : 'bg-[#e7e8ec]'
              }`}
            />
          ))}
        </div>
        <p className="mt-1 text-[11px] text-[#818c99]">
          Этап {stageIndex + 1}/5: <span className="font-semibold text-[#2c2d2e]">{d.stageTitle}</span> —{' '}
          {d.stageSubtitle}
          {d.earlyAccess ? (
            <span className="ml-1 font-semibold text-amber-800"> · досрочный допуск</span>
          ) : null}
        </p>

        <h3 className="mt-3 text-[16px] font-bold text-[#2c2d2e]">{d.headline}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#2c2d2e]">{d.lead}</p>

        {d.checklist.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {d.checklist.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-[13px]">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    item.done ? 'bg-[#4bb34b] text-white' : 'bg-[#e7e8ec] text-[#818c99]'
                  }`}
                  aria-hidden
                >
                  {item.done ? '✓' : ''}
                </span>
                <span className={item.done ? 'text-[#818c99] line-through' : 'text-[#2c2d2e]'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <CartelStageProgress
          stage={d.confirmedStage}
          documents={d.cartelMetrics?.documents}
          canSave={canSave}
          busy={stageBusy || applyBusy}
          onSaveDocuments={onSaveCartelDocuments}
        />

        <div className="mt-3 rounded-lg bg-[#f5f9ff] px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#2d81e0]">Сегодня в зале</p>
          <ul className="mt-2 space-y-1.5 text-[14px] leading-snug text-[#2c2d2e]">
            {d.trainingToday.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[#2d81e0]">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {d.checkToday ? (
            <p className="mt-2 border-t border-[#2d81e0]/15 pt-2 text-[12px] text-[#818c99]">
              Проверка: {d.checkToday}
            </p>
          ) : null}
        </div>

        {d.primaryAction ? (
          <button
            type="button"
            className={`${vk.btnPrimary} mt-4 w-full`}
            disabled={!canSave || stageBusy || applyBusy}
            onClick={() => runAction(d.primaryAction)}
          >
            {d.primaryAction.label}
          </button>
        ) : null}

        {d.secondaryAction ? (
          <button
            type="button"
            className={`${vk.btnSecondary} mt-2 w-full`}
            disabled={!canSave || stageBusy || applyBusy}
            onClick={() => runAction(d.secondaryAction)}
          >
            {d.secondaryAction.label}
          </button>
        ) : null}

        {d.coachMetricsHint ? (
          <p className="mt-3 text-[12px] leading-snug text-[#818c99]">{d.coachMetricsHint}</p>
        ) : null}

        {d.calendarLocked && d.calendarLockReason ? (
          <p className="mt-3 text-[12px] leading-snug text-amber-950">{d.calendarLockReason}</p>
        ) : null}

        {canSave && onConfirmCartelStage ? (
          <CartelCoachStageControl
            currentStage={d.confirmedStage}
            eligibleStage={d.eligibleStage}
            earlyAccess={d.earlyAccess}
            stageNote={d.stageNote}
            canSave={canSave}
            busy={stageBusy}
            onSetStage={onConfirmCartelStage}
          />
        ) : null}
      </section>
    </div>
  )
}

export default memo(SeasonCoachGuide)
