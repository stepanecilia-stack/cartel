import { forwardRef } from 'react'
import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'
import StudentPersonaChat from './StudentPersonaChat.jsx'

/**
 * Чат с наставником на фоне сгенерированной сцены в зале Cartel.
 * @param {import('./StudentPersonaChat.jsx').default extends React.ForwardRefExoticComponent<infer P> ? P & { personaId: unknown }} props
 * @param {import('react').Ref<import('./StudentPersonaChat.jsx').default>} ref
 */
function StudentPersonaGymChat({ personaId, ...chatProps }, ref) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)

  return (
    <div className="relative overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-[#1a1f24] shadow-sm">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src={persona.gymSceneSrc}
          alt=""
          className="h-full w-full object-cover object-[center_20%]"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-white" />
      </div>

      <div className="relative z-10 flex min-h-[min(70vh,620px)] flex-col">
        <div className="pointer-events-none px-3 pb-1 pt-3 sm:px-4">
          <p className="text-[15px] font-bold leading-tight text-white drop-shadow sm:text-[17px]">{name}</p>
        </div>

        <div className="mt-auto flex flex-1 flex-col justify-end bg-gradient-to-t from-white from-[42%] via-white/95 to-transparent px-2 pb-2 pt-6 sm:px-3">
          <StudentPersonaChat ref={ref} personaId={personaId} onGymScene {...chatProps} />
        </div>
      </div>
    </div>
  )
}

export default forwardRef(StudentPersonaGymChat)
