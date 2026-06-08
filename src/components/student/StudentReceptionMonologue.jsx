import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'

/**
 * Зайка на ресепшене: монолог — аватар + облако; опционально сцена зала сверху.
 * @param {{ message?: string, compact?: boolean, children?: import('react').ReactNode, className?: string }} props
 */
export default function StudentReceptionMonologue({ message, compact = false, children, className = '' }) {
  const { sceneSrc, bunnySrc, adminName, adminRole, welcomeMonologue } = STUDENT_PORTAL_RECEPTION
  const monologue = message ?? welcomeMonologue

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-white ${className}`}>
      {!compact ? (
        <div className="relative aspect-[4/3] max-h-[min(38vh,280px)] w-full bg-[#1a1f24] sm:max-h-[min(42vh,320px)]">
          <img
            src={sceneSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent sm:h-14" />
        </div>
      ) : null}

      <div className={`flex items-start gap-3 sm:gap-4 ${compact ? 'p-3 sm:p-4' : 'p-3 sm:p-4'}`}>
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-[#f0f2f5] shadow-md ring-1 ring-[#e7e8ec] sm:h-20 sm:w-20">
          <img
            src={bunnySrc}
            alt={adminName}
            className="h-full w-full object-cover object-top"
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-[#f0f2f5] px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
            <p className="text-[11px] font-semibold text-[#2d81e0] sm:text-[12px]">
              {adminName} · {adminRole}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] leading-snug text-[#2c2d2e] sm:text-[15px] sm:leading-relaxed">
              {monologue}
            </p>
          </div>
        </div>
      </div>

      {children ? <div className="space-y-2 px-3 pb-3 sm:px-4 sm:pb-4">{children}</div> : null}
    </div>
  )
}
