import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'

/**
 * Зайка на ресепшене: зал крупно, монолог — аватар + облако снизу.
 * @param {{ className?: string }} props
 */
export default function StudentReceptionMonologue({ className = '' }) {
  const { sceneSrc, bunnySrc, adminName, adminRole, welcomeMonologue } = STUDENT_PORTAL_RECEPTION

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-white ${className}`}>
      <div className="relative aspect-[4/3] w-full bg-[#1a1f24] sm:aspect-[16/10]">
        <img
          src={sceneSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent sm:h-14" />
      </div>

      <div className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
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
            <p className="mt-1.5 text-[14px] leading-snug text-[#2c2d2e] sm:text-[15px] sm:leading-relaxed">
              {welcomeMonologue}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
