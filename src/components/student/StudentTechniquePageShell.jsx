import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'

/**
 * Оболочка страницы техники — тот же зал Cartel, контент поверх.
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export default function StudentTechniquePageShell({ children, className = '' }) {
  return (
    <div className={`relative min-h-[100dvh] ${className}`}>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <img
          src={STUDENT_PORTAL_RECEPTION.gymTechniqueBgSrc}
          alt=""
          className="h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[#edeef0]/88 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
