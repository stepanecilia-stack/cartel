import { memo, useEffect, useMemo, useState } from 'react'
import { CARTEL_STAGES, cartelStageMeta } from '../../data/cartelParticipation.js'
import { buildCartelCoachDirective } from '../../utils/cartelCoachDirective.js'
import { checklistForCartelStage } from '../../utils/cartelMetrics.js'
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
 *   level1Atoms?: object[],
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
 *   shareReadOnly?: boolean,
 * }} props
 */
function SeasonCoachGuide({
  student = null,
  allNorms = [],
  kd = 0.25,
  techniquePercent = 0,
  atomsAtSkill = 0,
  totalAtoms = 0,
  level1Atoms = [],
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
  shareReadOnly = false,
}) {
  const [viewStageId, setViewStageId] = useState(
    /** @type {import('../../data/cartelParticipation.js').CartelStageId | null} */ (null),
  )

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
        level1Atoms,
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
      level1Atoms,
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

  const confirmedStage = d.confirmedStage
  const stageIndex = CARTEL_STAGES.findIndex((s) => s.id === confirmedStage)
  const busy = stageBusy || applyBusy

  useEffect(() => {
    setViewStageId(null)
  }, [student?.id, confirmedStage])

  const displayStage =
    viewStageId && CARTEL_STAGES.some((s) => s.id === viewStageId) ? viewStageId : confirmedStage
  const displayIndex = CARTEL_STAGES.findIndex((s) => s.id === displayStage)
  const isViewingPast = displayIndex >= 0 && displayIndex < stageIndex
  const isViewingCurrent = displayStage === confirmedStage
  const displayMeta = cartelStageMeta(displayStage)

  const displayChecklist = useMemo(
    () => checklistForCartelStage(displayStage, d.cartelMetrics),
    [displayStage, d.cartelMetrics],
  )

  const allPastItemsDone =
    isViewingPast && displayChecklist.length > 0 && displayChecklist.every((item) => item.done)

  return (
    <section className="rounded-[10px] border border-[#e7e8ec] bg-white p-3 shadow-sm">
      <div className="flex gap-1" role="tablist" aria-label="Этапы Cartel">
        {CARTEL_STAGES.map((s, i) => {
          const reachable = i <= stageIndex
          const selected = displayStage === s.id
          const completed = i < stageIndex
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${s.title}${completed ? ', пройден' : i === stageIndex ? ', текущий' : ', ещё не открыт'}`}
              title={reachable ? `${s.title}: ${s.subtitle}` : `${s.title} — этап ещё не открыт`}
              disabled={!reachable}
              onClick={() => setViewStageId(s.id)}
              className={[
                'h-2 flex-1 rounded-full transition',
                !reachable
                  ? 'cursor-not-allowed bg-[#e7e8ec]'
                  : selected
                    ? 'bg-[#2d81e0] ring-2 ring-[#2d81e0]/35 ring-offset-1'
                    : completed
                      ? 'bg-[#2d81e0] hover:bg-[#1f6bc4]'
                      : 'bg-[#2d81e0] hover:bg-[#1f6bc4]',
              ].join(' ')}
            />
          )
        })}
      </div>
      <p className="mt-1.5 text-[12px] text-[#818c99]">
        Этап {displayIndex + 1}/5: <span className="font-semibold text-[#2c2d2e]">{displayMeta.title}</span>
        {isViewingPast ? <span className="ml-1 font-medium text-[#4bb34b]"> · пройден</span> : null}
        {!isViewingPast && d.earlyAccess ? (
          <span className="ml-1 font-medium text-amber-800"> · досрочно</span>
        ) : null}
      </p>

      {isViewingPast ? (
        <p className={`mt-2 ${vk.notice} bg-[#e8f7e8] text-[#2c2d2e]`}>
          {allPastItemsDone
            ? `Этап «${displayMeta.title}» закрыт — можно гордиться проделанной работой.`
            : `Этап «${displayMeta.title}» уже позади — вот что удалось на этом отрезке пути.`}
        </p>
      ) : null}

      {isViewingPast ? (
        <button
          type="button"
          className={`mt-2 ${vk.link} text-[12px]`}
          onClick={() => setViewStageId(null)}
        >
          Вернуться к текущему этапу «{cartelStageMeta(confirmedStage).title}»
        </button>
      ) : null}

      {displayChecklist.length > 0 ? (
        <>
          <h3 className="mt-3 text-[14px] font-semibold text-[#2c2d2e]">
            {isViewingPast ? 'Что сделано на этапе' : d.headline}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {displayChecklist.map((item) => (
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
                  <span
                    className={
                      item.done
                        ? isViewingPast
                          ? 'font-medium text-[#2c2d2e]'
                          : 'text-[#818c99] line-through'
                        : 'text-[#2c2d2e]'
                    }
                  >
                    {item.label}
                  </span>
                  {item.hint && !isViewingPast ? (
                    <span className="mt-0.5 block text-[11px] text-[#818c99]">{item.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <CartelStageProgress
        stage={displayStage}
        documents={d.cartelMetrics?.documents}
        canSave={canSave && isViewingCurrent}
        busy={busy}
        onSaveDocuments={isViewingCurrent ? onSaveCartelDocuments : undefined}
      />

      {isViewingCurrent && d.primaryAction ? (
        <button
          type="button"
          className={`${vk.btnPrimary} mt-3 w-full`}
          disabled={!canSave || busy}
          onClick={() => runAction(d.primaryAction)}
        >
          {d.primaryAction.label}
        </button>
      ) : null}

      {isViewingCurrent && d.secondaryAction ? (
        <button
          type="button"
          className={`${vk.btnSecondary} mt-2 w-full`}
          disabled={!canSave || busy}
          onClick={() => runAction(d.secondaryAction)}
        >
          {d.secondaryAction.label}
        </button>
      ) : null}

      {shareReadOnly && isViewingCurrent && !d.primaryAction && !d.secondaryAction ? (
        <p className={`mt-3 ${vk.mutedXs}`}>Дальнейшие шаги согласуйте с тренером в зале.</p>
      ) : null}
    </section>
  )
}

export default memo(SeasonCoachGuide)
