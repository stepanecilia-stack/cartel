import { MOTOR_SKILL_STAGES } from '../../constants/studentPortalOnboarding.js'
import { MOTOR_SKILL_STAGES_ILLUSTRATION } from '../../constants/studentPortalIllustrations.js'
import { vk } from '../../utils/vkUi.js'

/**
 * Схема четырёх этапов с подсветкой «Знание».
 */
export default function StudentMotorStagesHighlight() {
  return (
    <figure className="overflow-hidden rounded-xl border border-[#e7e8ec] bg-white">
      <div className="relative bg-[#fafbfc] p-2">
        <img
          src={MOTOR_SKILL_STAGES_ILLUSTRATION}
          alt="Четыре этапа: Знание, Умение, Навык, Автоматизация"
          className="w-full rounded-lg object-contain"
          loading="eager"
          decoding="async"
        />
        <div
          className="pointer-events-none absolute left-2 top-2 h-[calc(100%-1rem)] w-[calc(25%-0.25rem)] rounded-lg ring-4 ring-[#2d81e0] ring-offset-2 ring-offset-[#fafbfc] sm:left-3 sm:top-3 sm:h-[calc(100%-1.5rem)]"
          aria-hidden
        />
      </div>
      <figcaption className="space-y-2 border-t border-[#e7e8ec] px-3 py-2.5">
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {MOTOR_SKILL_STAGES.map((stage, index) => (
            <li
              key={stage.key}
              className={`rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold sm:text-[12px] ${
                index === 0
                  ? 'bg-[#ecf3fc] text-[#2d81e0] ring-1 ring-[#2d81e0]/30'
                  : 'bg-[#f0f2f5] text-[#818c99]'
              }`}
            >
              {stage.label}
            </li>
          ))}
        </ol>
        <p className={`${vk.mutedXs} text-center`}>
          Сейчас вы на этапе «Знание» — только начало пути.
        </p>
      </figcaption>
    </figure>
  )
}
