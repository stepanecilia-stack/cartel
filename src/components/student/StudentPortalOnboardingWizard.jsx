import { useMemo, useState } from 'react'
import {
  KNOWLEDGE_THREE_IMAGES,
  MOTOR_SKILL_STAGES,
  ONBOARDING_STEP_ORDER,
  KNOWLEDGE_GUIDE_STEP_ORDER,
  TRAINING_GOAL_OPTIONS,
  normalizePortalTrainingGoals,
} from '../../constants/studentPortalOnboarding.js'
import { formatPortalPersonaName, normalizePortalPersonaId, PORTAL_PERSONAS } from '../../constants/studentPortalPersonas.js'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentPortalReception from './StudentPortalReception.jsx'
import { vk } from '../../utils/vkUi.js'

const highlight = 'font-semibold text-[#2d81e0]'

/**
 * @param {{
 *   mode?: 'full' | 'guide',
 *   initialGoals?: string[] | null,
 *   initialPersonaId?: string | null,
 *   onComplete: (payload: { goals: string[], personaId: string }) => void | Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function StudentPortalOnboardingWizard({
  mode = 'full',
  initialGoals = null,
  initialPersonaId = null,
  onComplete,
  busy = false,
  error = '',
}) {
  const steps = mode === 'guide' ? KNOWLEDGE_GUIDE_STEP_ORDER : ONBOARDING_STEP_ORDER
  const [stepIndex, setStepIndex] = useState(0)
  const [goals, setGoals] = useState(() => new Set(normalizePortalTrainingGoals(initialGoals)))
  const [personaId, setPersonaId] = useState(() => normalizePortalPersonaId(initialPersonaId))

  const stepId = steps[stepIndex] ?? steps[0]
  const isLast = stepIndex >= steps.length - 1

  const toggleGoal = (id) => {
    setGoals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const content = useMemo(() => {
    switch (stepId) {
      case 'welcome':
        return {
          title: '',
          body: <StudentPortalReception compact />,
          action: 'Шагнуть в зал',
          canAdvance: true,
        }
      case 'goal':
        return {
          title: 'Выберите одну или несколько целей занятий',
          body: (
            <ul className="space-y-1.5">
              {TRAINING_GOAL_OPTIONS.map((option) => {
                const selected = goals.has(option.id)
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleGoal(option.id)}
                      className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? 'border-[#2d81e0] bg-[#ecf3fc] ring-1 ring-[#2d81e0]/20'
                          : 'border-[#e7e8ec] bg-white active:bg-[#f0f2f5]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          selected ? 'border-[#2d81e0] bg-[#2d81e0] text-white' : 'border-[#c5d0db] bg-white'
                        }`}
                        aria-hidden
                      >
                        {selected ? '✓' : ''}
                      </span>
                      <span className="text-[14px] font-semibold text-[#2c2d2e]">{option.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ),
          action: 'Дальше',
          canAdvance: goals.size > 0,
        }
      case 'persona':
        return {
          title: 'Выберите виртуального наставника',
          body: (
            <div className="space-y-2">
              <p className={vk.mutedXs}>
                Это не живые люди — три типажа-тренера. У каждого свой характер и стиль общения.
              </p>
              <ul className="space-y-2">
                {PORTAL_PERSONAS.map((persona) => {
                  const selected = personaId === persona.id
                  return (
                    <li key={persona.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPersonaId(persona.id)}
                        className={`flex w-full gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                          selected
                            ? 'border-[#2d81e0] bg-[#ecf3fc] ring-1 ring-[#2d81e0]/20'
                            : 'border-[#e7e8ec] bg-white active:bg-[#f0f2f5]'
                        }`}
                      >
                        <StudentPersonaAvatar personaId={persona.id} size="xl" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-bold leading-tight text-[#2c2d2e]">
                            {formatPortalPersonaName(persona)}
                          </p>
                          <p className={`mt-0.5 text-[12px] ${vk.mutedXs}`}>{persona.roleLabel}</p>
                          <p className={`mt-1 ${vk.mutedXs}`}>{persona.tagline}</p>
                          <p className="mt-1 text-[12px] italic leading-snug text-[#2c2d2e]">
                            «{persona.sampleQuote}»
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ),
          action: 'Дальше',
          canAdvance: Boolean(personaId),
        }
      case 'path':
        return {
          title: 'Этапы освоения',
          body: (
            <div className="space-y-2">
              <p className={vk.mutedXs}>Любой технический элемент проходит четыре этапа освоения</p>
              <ol className="space-y-1.5">
                {MOTOR_SKILL_STAGES.map((stage, index) => (
                  <li
                    key={stage.key}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-semibold ${
                      stage.active
                        ? 'bg-[#2d81e0] text-white shadow-[0_4px_14px_rgba(45,129,224,0.35)] ring-2 ring-[#2d81e0]/40'
                        : 'bg-[#f0f2f5] text-[#818c99]'
                    }`}
                  >
                    <span className="tabular-nums opacity-90">{index + 1}.</span>
                    <span className={stage.active ? 'text-[15px] font-bold tracking-wide' : ''}>
                      {stage.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ),
          action: 'Дальше',
          canAdvance: true,
        }
      case 'knowledge-what':
        return {
          title: 'Что такое «Знание»',
          body: (
            <p className={`${vk.muted} leading-snug`}>
              Технический элемент освоен на уровне «Знание», если сформированы три образа:{' '}
              <span className={highlight}>логический</span>, <span className={highlight}>зрительный</span> и{' '}
              <span className={highlight}>кинестетический</span>.
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
              Только когда есть все три образа — логический, зрительный и кинестетический. Иначе «Знание» ещё
              не сформировано.
            </p>
          ),
          action: 'К программе',
          canAdvance: true,
        }
      default:
        return { title: '', body: null, action: 'Дальше', canAdvance: true }
    }
  }, [stepId, goals, personaId, busy])

  const handleAdvance = () => {
    if (!content.canAdvance || busy) return
    if (isLast) {
      void onComplete({ goals: [...goals], personaId })
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
        {content.title ? <h2 className={vk.h2}>{content.title}</h2> : null}
        <div className={content.title ? 'mt-2' : ''}>{content.body}</div>
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
