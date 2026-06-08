import { useState } from 'react'
import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'
import {
  formatPortalPersonaName,
  PORTAL_PERSONAS,
} from '../../constants/studentPortalPersonas.js'
import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import StudentPersonaGymStory from './StudentPersonaGymStory.jsx'
import StudentReceptionMonologue from './StudentReceptionMonologue.jsx'
import { vk } from '../../utils/vkUi.js'

/** @typedef {'hub' | 'detail'} PersonaIntroPhase */

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
  const [phase, setPhase] = useState(/** @type {PersonaIntroPhase} */ ('hub'))
  const [focusId, setFocusId] = useState(/** @type {string | null} */ (null))

  const focusPersona = PORTAL_PERSONAS.find((p) => p.id === focusId) ?? null
  const focusName = focusPersona ? formatPortalPersonaName(focusPersona) : ''

  const openDetail = (id) => {
    setFocusId(id)
    setPhase('detail')
  }

  const backToHub = () => {
    setPhase('hub')
    setFocusId(null)
  }

  const choose = (id) => {
    onSelect(id)
    onConfirm(id)
  }

  const btnPrimary = `w-full ${vk.btnPrimary}`
  const btnSecondary = `w-full ${vk.btnSecondary}`

  if (phase === 'detail' && focusPersona) {
    return (
      <div className="space-y-3">
        <StudentPersonaGymStory persona={focusPersona} />
        <div className="flex flex-col gap-2">
          <button type="button" disabled={disabled} onClick={() => choose(focusPersona.id)} className={btnPrimary}>
            Выбрать {focusName}
          </button>
          <button type="button" disabled={disabled} onClick={backToHub} className={btnSecondary}>
            Послушать про другого
          </button>
        </div>
      </div>
    )
  }

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
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#2d81e0]">
                      {persona.teachingManner}
                    </p>
                    <p className={`mt-1.5 text-[13px] leading-snug text-[#2c2d2e]`}>{persona.teaser}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => openDetail(persona.id)}
                  className={`mt-2.5 w-full ${vk.btnPrimary}`}
                >
                  Подробнее
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
