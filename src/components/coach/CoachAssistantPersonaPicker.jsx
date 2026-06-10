import { PORTAL_PERSONAS, formatPortalPersonaName } from '../../constants/studentPortalPersonas.js'
import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   value: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   onChange: (id: import('../../constants/studentPortalPersonas.js').PortalPersonaId) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function CoachAssistantPersonaPicker({ value, onChange, disabled = false }) {
  return (
    <div className="space-y-1.5">
      <p className={vk.mutedXs}>Помощник-коллега</p>
      <div className="flex flex-wrap gap-2">
        {PORTAL_PERSONAS.map((persona) => {
          const active = persona.id === value
          return (
            <button
              key={persona.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(persona.id)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-colors sm:max-w-[11rem] ${
                active
                  ? 'border-[#2d81e0] bg-[#ecf3fc] ring-1 ring-[#2d81e0]/30'
                  : 'border-[#e7e8ec] bg-white hover:border-[#2d81e0]/40'
              } disabled:opacity-50`}
            >
              <StudentPersonaAvatar personaId={persona.id} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#2c2d2e]">
                  {formatPortalPersonaName(persona)}
                </span>
                <span className="block truncate text-[10px] text-[#818c99]">{persona.tagline}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
