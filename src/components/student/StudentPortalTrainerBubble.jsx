import StudentPersonaAvatar from './StudentPersonaAvatar.jsx'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'

/**
 * Реплика виртуального тренера — аватар и текст.
 * @param {{ personaId?: unknown, children: import('react').ReactNode, className?: string }} props
 */
export default function StudentPortalTrainerBubble({ personaId, children, className = '' }) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)

  return (
    <div className={`flex gap-2.5 ${className}`}>
      <StudentPersonaAvatar personaId={persona.id} size="md" />
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[11px] font-semibold text-[#2d81e0]">{name}</p>
        <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
          {children}
        </div>
      </div>
    </div>
  )
}
