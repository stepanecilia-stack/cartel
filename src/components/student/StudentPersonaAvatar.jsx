import { getPortalPersona, formatPortalPersonaName } from '../../constants/studentPortalPersonas.js'

/**
 * @param {{ personaId?: unknown, size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }} props
 */
export default function StudentPersonaAvatar({ personaId, size = 'md', className = '' }) {
  const persona = getPortalPersona(personaId)
  const dim =
    size === 'sm'
      ? 'h-9 w-9'
      : size === 'lg'
        ? 'h-20 w-20'
        : size === 'xl'
          ? 'h-24 w-24'
          : 'h-12 w-12'

  return (
    <div
      className={`${dim} shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-white ${persona.accentRing} ${className}`}
    >
      <img
        src={persona.portraitSrc}
        alt={formatPortalPersonaName(persona)}
        className="h-full w-full object-cover object-center"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
