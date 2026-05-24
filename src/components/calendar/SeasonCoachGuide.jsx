import { memo, useMemo } from 'react'
import { CARTEL_STAGES } from '../../data/cartelParticipation.js'
import { buildCartelCoachDirective } from '../../utils/cartelCoachDirective.js'
import { vk } from '../../utils/vkUi.js'
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
  const busy = stageBusy || applyBusy

  return (
    <section className="rounded-[10px] border border-[#e7e8ec] bg-white p-3 shadow-sm">
      <div className="flex gap-1">
        {CARTEL_STAGES.map((s, i) => (
          <div
            key={s.id}
            title={s.subtitle}
            className={`h-1.5 flex-1 rounded-full ${i <= stageIndex ? 'bg-[#2d81e0]' : 'bg-[#e7e8ec]'}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-[#818c99]">
        Этап {stageIndex + 1}/5: <span className="font-semibold text-[#2c2d2e]">{d.stageTitle}</span>
        {d.earlyAccess ? (
          <span className="ml-1 font-medium text-amber-800"> · досрочно</span>
        ) : null}
      </p>

      {d.checklist.length > 0 ? (
        <>
          <h3 className="mt-3 text-[14px] font-semibold text-[#2c2d2e]">{d.headline}</h3>
          <ul className="mt-2 space-y-1.5">
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
                <span className="min-w-0">
                  <span className={item.done ? 'text-[#818c99] line-through' : 'text-[#2c2d2e]'}>
                    {item.label}
                  </span>
                  {item.hint ? (
                    <span className="mt-0.5 block text-[11px] text-[#818c99]">{item.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <CartelStageProgress
        stage={d.confirmedStage}
        documents={d.cartelMetrics?.documents}
        canSave={canSave}
        busy={busy}
        onSaveDocuments={onSaveCartelDocuments}
      />

      {d.primaryAction ? (
        <button
          type="button"
          className={`${vk.btnPrimary} mt-3 w-full`}
          disabled={!canSave || busy}
          onClick={() => runAction(d.primaryAction)}
        >
          {d.primaryAction.label}
        </button>
      ) : null}

      {d.secondaryAction ? (
        <button
          type="button"
          className={`${vk.btnSecondary} mt-2 w-full`}
          disabled={!canSave || busy}
          onClick={() => runAction(d.secondaryAction)}
        >
          {d.secondaryAction.label}
        </button>
      ) : null}
    </section>
  )
}

export default memo(SeasonCoachGuide)
