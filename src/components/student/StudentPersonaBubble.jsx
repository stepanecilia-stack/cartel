import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import { getPortalPersona, formatPortalPersonaName } from '../../constants/studentPortalPersonas.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{ personaId?: unknown, message?: string | null, compact?: boolean }} props
 */
export default function StudentPersonaBubble({ personaId, message, compact = false }) {
  const persona = getPortalPersona(personaId)
  if (!message) return null

  return (
    <div
      className={`flex gap-2 rounded-lg border border-[#e7e8ec] bg-white ${
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2'
      }`}
    >
      <StudentPersonaAvatar personaId={persona.id} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-tight text-[#2c2d2e]">{formatPortalPersonaName(persona)}</p>
        <p className={vk.mutedXs}>{persona.roleLabel}</p>
        <p className={`mt-0.5 ${compact ? 'text-[12px]' : 'text-[13px]'} leading-snug text-[#2c2d2e]`}>
          {message}
        </p>
      </div>
    </div>
  )
}
