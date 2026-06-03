import {
  KNOWLEDGE_THREE_IMAGES,
  MOTOR_SKILL_STAGES,
  STUDENT_KNOWLEDGE_INTRO_IMAGE,
} from '../../constants/studentPortalKnowledgeGuide.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{ onContinue?: () => void, showContinue?: boolean }} props
 */
export default function StudentKnowledgeIntro({ onContinue, showContinue = true }) {
  return (
    <section className={`${vk.cardPadded} space-y-3`}>
      <div>
        <h2 className={vk.h2}>Как мы учим технику</h2>
        <p className={`mt-1 ${vk.mutedXs}`}>
          Чтобы техника была сильной и точной, навык проходит четыре этапа. Сейчас вы на первом.
        </p>
      </div>

      <ol className="flex flex-wrap gap-1.5">
        {MOTOR_SKILL_STAGES.map((stage) => (
          <li
            key={stage.key}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              stage.active
                ? 'bg-[#ecf3fc] text-[#2d81e0]'
                : 'bg-[#f0f2f5] text-[#818c99]'
            }`}
          >
            {stage.label}
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-2.5">
        <p className="text-[13px] font-semibold text-[#2c2d2e]">Этап «Знание»</p>
        <p className={`mt-1 ${vk.mutedXs}`}>
          В программе вы отмечаете только его. «Умение», «Навык» и «Автоматизация» — на тренировке с тренером.
        </p>
      </div>

      <img
        src={STUDENT_KNOWLEDGE_INTRO_IMAGE}
        alt="Логика, зрение и кинестетика — три образа этапа «Знание»"
        className="w-full rounded-lg border border-[#e7e8ec] bg-white"
        loading="lazy"
        decoding="async"
      />

      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-[#2c2d2e]">Три образа — все обязательны</p>
        <ul className="space-y-2">
          {KNOWLEDGE_THREE_IMAGES.map((item) => (
            <li key={item.key} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ecf3fc] text-[10px] font-bold text-[#2d81e0]">
                {item.key === 'logic' ? '1' : item.key === 'vision' ? '2' : '3'}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#2c2d2e]">{item.title}</p>
                <p className={vk.mutedXs}>{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className={`rounded-lg bg-[#fff8e6] px-2.5 py-2 text-[12px] leading-snug text-[#2c2d2e]`}>
          Не жмите «Понял», пока нет всех трёх образов. Иначе «Знание» ещё не сформировано.
        </p>
      </div>

      {showContinue && onContinue ? (
        <button type="button" onClick={onContinue} className={`w-full ${vk.btnPrimary}`}>
          Понятно — к программе
        </button>
      ) : null}
    </section>
  )
}
