import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'
import {
  formatPortalPersonaName,
  PORTAL_PERSONAS,
} from '../../constants/studentPortalPersonas.js'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentReceptionMonologue from './StudentReceptionMonologue.jsx'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   selectedId?: string | null,
 *   onSelect: (id: string) => void,
 *   onConfirm: (id: string) => void,
 *   onWizardBack?: () => void,
 *   disabled?: boolean,
 * }} props
 */
export default function StudentPersonaIntroFlow({
  onSelect,
  onConfirm,
  onWizardBack,
  disabled = false,
}) {
  const choose = (id) => {
    onSelect(id)
    onConfirm(id)
  }

  const btnPrimary = `w-full ${vk.btnPrimary}`
  const btnSecondary = `w-full ${vk.btnSecondary}`

  return (
    <div className="space-y-3">
      <StudentReceptionMonologue compact message={STUDENT_PORTAL_RECEPTION.trainersIntroMonologue}>
        <ul className="space-y-2">
          {PORTAL_PERSONAS.map((persona) => {
            const name = formatPortalPersonaName(persona)
            return (
              <li key={persona.id} className="rounded-lg border border-[#e7e8ec] bg-white p-3">
                <div className="flex gap-3">
                  <StudentPersonaAvatar personaId={persona.id} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold leading-tight text-[#2c2d2e]">{name}</p>
                    <p className={`mt-1.5 text-[13px] leading-snug text-[#2c2d2e]`}>{persona.teaser}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => choose(persona.id)}
                  className={`mt-2.5 ${btnPrimary}`}
                >
                  Выбрать
                </button>
              </li>
            )
          })}
        </ul>
      </StudentReceptionMonologue>
      {onWizardBack ? (
        <button type="button" disabled={disabled} onClick={onWizardBack} className={btnSecondary}>
          Назад к анкете
        </button>
      ) : null}
    </div>
  )
}
