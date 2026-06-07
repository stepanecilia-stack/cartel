import { useMemo, useState } from 'react'
import {
  KNOWLEDGE_THREE_IMAGES,
  MOTOR_SKILL_STAGES,
  ONBOARDING_STEP_ORDER,
  KNOWLEDGE_GUIDE_STEP_ORDER,
  TRAINING_GOAL_OPTIONS,
} from '../../constants/studentPortalOnboarding.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   mode?: 'full' | 'guide',
 *   initialGoal?: string | null,
 *   onComplete: (payload: { goal: string | null }) => void | Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function StudentPortalOnboardingWizard({
  mode = 'full',
  initialGoal = null,
  onComplete,
  busy = false,
  error = '',
}) {
  const steps = mode === 'guide' ? KNOWLEDGE_GUIDE_STEP_ORDER : ONBOARDING_STEP_ORDER
  const [stepIndex, setStepIndex] = useState(0)
  const [goal, setGoal] = useState(initialGoal)

  const stepId = steps[stepIndex] ?? steps[0]
  const isLast = stepIndex >= steps.length - 1

  const content = useMemo(() => {
    switch (stepId) {
      case 'welcome':
        return {
          title: 'Добро пожаловать в кабинет',
          body: (
            <p className={`${vk.muted} leading-snug`}>
              Здесь вы <span className="font-medium text-[#2c2d2e]">сами</span> проходите программу дома.
              Отметки тренера в зале сюда не переносятся — начинаем с первого приёма.
            </p>
          ),
          action: 'Дальше',
          canAdvance: true,
        }
      case 'goal':
        return {
          title: 'Зачем вы занимаетесь?',
          body: (
            <div className="space-y-2">
              <p className={vk.mutedXs}>Выберите один вариант — тренер увидит ваш ответ в карточке.</p>
              <ul className="space-y-1.5">
                {TRAINING_GOAL_OPTIONS.map((option) => {
                  const selected = goal === option.id
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setGoal(option.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? 'border-[#2d81e0] bg-[#ecf3fc] ring-1 ring-[#2d81e0]/20'
                            : 'border-[#e7e8ec] bg-white active:bg-[#f0f2f5]'
                        }`}
                      >
                        <p className="text-[14px] font-semibold text-[#2c2d2e]">{option.title}</p>
                        <p className={`mt-0.5 ${vk.mutedXs}`}>{option.subtitle}</p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ),
          action: 'Дальше',
          canAdvance: Boolean(goal),
        }
      case 'path':
        return {
          title: 'Четыре этапа навыка',
          body: (
            <div className="space-y-2">
              <p className={vk.mutedXs}>Сейчас вы на первом. Остальные — с тренером на занятии.</p>
              <ol className="space-y-1.5">
                {MOTOR_SKILL_STAGES.map((stage) => (
                  <li
                    key={stage.key}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-semibold ${
                      stage.active
                        ? 'bg-[#ecf3fc] text-[#2d81e0] ring-1 ring-[#2d81e0]/20'
                        : 'bg-[#f0f2f5] text-[#818c99]'
                    }`}
                  >
                    <span>{stage.label}</span>
                    {stage.active ? (
                      <span className="text-[11px] font-medium">вы здесь</span>
                    ) : (
                      <span className="text-[11px] font-normal">в зале</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ),
          action: 'Понятно',
          canAdvance: true,
        }
      case 'knowledge-what':
        return {
          title: 'Что такое «Знание»',
          body: (
            <p className={`${vk.muted} leading-snug`}>
              Это когда приём <span className="font-medium text-[#2c2d2e]">понятен головой и телом</span>, но вы
              ещё не отрабатываете его на скорости в спарринге. В кабинете вы как раз формируете «Знание».
            </p>
          ),
          action: 'Дальше',
          canAdvance: true,
        }
      case 'logic':
        return {
          title: KNOWLEDGE_THREE_IMAGES[0].title,
          body: (
            <p className={`${vk.muted} leading-snug`}>{KNOWLEDGE_THREE_IMAGES[0].text}</p>
          ),
          action: 'Понял',
          canAdvance: true,
        }
      case 'vision':
        return {
          title: KNOWLEDGE_THREE_IMAGES[1].title,
          body: (
            <p className={`${vk.muted} leading-snug`}>{KNOWLEDGE_THREE_IMAGES[1].text}</p>
          ),
          action: 'Понял',
          canAdvance: true,
        }
      case 'kinesthesia':
        return {
          title: KNOWLEDGE_THREE_IMAGES[2].title,
          body: (
            <p className={`${vk.muted} leading-snug`}>{KNOWLEDGE_THREE_IMAGES[2].text}</p>
          ),
          action: 'Понял',
          canAdvance: true,
        }
      case 'knowledge-rule':
        return {
          title: 'Когда жать «Понял»',
          body: (
            <p className={`${vk.muted} leading-snug`}>
              Только когда есть все три образа — логика, зрение и ощущение в теле. Иначе «Знание» ещё не
              сформировано, и лучше пересмотреть ролик.
            </p>
          ),
          action: 'К первому приёму',
          canAdvance: true,
        }
      default:
        return { title: '', body: null, action: 'Дальше', canAdvance: true }
    }
  }, [stepId, goal, busy])

  const handleAdvance = () => {
    if (!content.canAdvance || busy) return
    if (isLast) {
      void onComplete({ goal: mode === 'full' ? goal : initialGoal ?? goal })
      return
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  const handleBack = () => {
    if (busy || stepIndex === 0) return
    setStepIndex((i) => Math.max(0, i - 1))
  }

  return (
    <section className={`${vk.cardPadded} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${vk.mutedXs} tabular-nums`}>
          {stepIndex + 1} / {steps.length}
        </p>
        <div className="flex gap-1">
          {steps.map((id, i) => (
            <span
              key={id}
              className={`h-1.5 w-1.5 rounded-full ${i <= stepIndex ? 'bg-[#2d81e0]' : 'bg-[#dce1e6]'}`}
              aria-hidden
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className={vk.h2}>{content.title}</h2>
        <div className="mt-2">{content.body}</div>
      </div>

      {error ? <p className={vk.error}>{error}</p> : null}

      <div className="flex gap-2">
        {stepIndex > 0 ? (
          <button type="button" disabled={busy} onClick={handleBack} className={`flex-1 ${vk.btnSecondary}`}>
            Назад
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy || !content.canAdvance}
          onClick={handleAdvance}
          className={`${stepIndex > 0 ? 'flex-1' : 'w-full'} ${vk.btnPrimary}`}
        >
          {busy ? 'Сохранение…' : content.action}
        </button>
      </div>
    </section>
  )
}
