import { TRAINING_GOAL_OPTIONS } from '../../constants/studentPortalOnboarding.js'
import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'

/**
 * @param {{ checked: boolean }} props
 */
function FormCheckbox({ checked }) {
  return (
    <span
      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2 bg-[#fffef9] transition-colors ${
        checked ? 'border-[#1e4a8c]' : 'border-[#2c2d2e]/70'
      }`}
      aria-hidden
    >
      {checked ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[#1e4a8c]" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3 8.5 L6.5 12 L13 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

/**
 * Анкета на столе ресепшена: лист с галочками в графах.
 * @param {{
 *   selectedGoals: Set<string>,
 *   onToggleGoal: (id: string) => void,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export default function StudentReceptionQuestionnaire({
  selectedGoals,
  onToggleGoal,
  disabled = false,
  className = '',
}) {
  const { sceneSrc, questionnaireTitle, questionnaireSubtitle, questionnaireHint } = STUDENT_PORTAL_RECEPTION

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[#e7e8ec] ${className}`}>
      <div className="relative min-h-[320px] bg-[#3d342c] sm:min-h-[360px]">
        <img
          src={sceneSrc}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_78%] opacity-95"
          loading="eager"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-black/25" />

        <div className="relative flex min-h-[320px] items-end justify-center px-3 pb-4 pt-10 sm:min-h-[360px] sm:px-5 sm:pb-6 sm:pt-12">
          <div
            className="w-full max-w-[340px] rotate-[1.2deg] shadow-[0_18px_40px_rgba(0,0,0,0.35),0_2px_0_rgba(255,255,255,0.15)_inset] sm:max-w-[380px]"
            style={{
              background:
                'linear-gradient(165deg, #fffef9 0%, #f9f6ee 45%, #f3efe4 100%)',
            }}
          >
            <div className="border border-[#d8d0c4]/80 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="border-b border-[#2c2d2e]/15 pb-2.5">
                <p className="font-serif text-[10px] font-bold uppercase tracking-[0.2em] text-[#818c99] sm:text-[11px]">
                  Cartel · академия бокса
                </p>
                <h3 className="mt-1 font-serif text-[17px] font-bold leading-tight text-[#2c2d2e] sm:text-[18px]">
                  {questionnaireTitle}
                </h3>
                <p className="mt-1 text-[12px] leading-snug text-[#5c6670] sm:text-[13px]">{questionnaireSubtitle}</p>
              </div>

              <ul className="mt-2.5 space-y-0" role="group" aria-label={questionnaireSubtitle}>
                {TRAINING_GOAL_OPTIONS.map((option, index) => {
                  const selected = selectedGoals.has(option.id)
                  return (
                    <li
                      key={option.id}
                      className={index > 0 ? 'border-t border-dotted border-[#2c2d2e]/12' : ''}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleGoal(option.id)}
                        className={`flex w-full items-start gap-3 py-2.5 text-left transition-colors touch-manipulation sm:py-3 ${
                          disabled ? 'opacity-60' : 'active:bg-[#2d81e0]/5'
                        } ${selected ? 'bg-[#2d81e0]/[0.04]' : ''}`}
                        aria-pressed={selected}
                      >
                        <FormCheckbox checked={selected} />
                        <span
                          className={`text-[13px] leading-snug sm:text-[14px] ${
                            selected ? 'font-semibold text-[#1e4a8c]' : 'text-[#2c2d2e]'
                          }`}
                        >
                          {option.title}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <p className="mt-2 border-t border-dotted border-[#2c2d2e]/12 pt-2 text-[10px] italic text-[#818c99] sm:text-[11px]">
                {questionnaireHint}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
