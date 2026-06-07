import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'

/**
 * Зайка на ресепшене: монолог в диалоговом облачке.
 * @param {{ className?: string }} props
 */
export default function StudentReceptionMonologue({ className = '' }) {
  const { sceneSrc, bunnySrc, adminName, adminRole, welcomeMonologue } = STUDENT_PORTAL_RECEPTION

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-white ${className}`}>
      <div className="relative h-[88px] w-full bg-[#1a1f24] sm:h-[100px]">
        <img
          src={sceneSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-95"
          loading="eager"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>

      <div className="flex items-start gap-2.5 px-3 pb-3 pt-0 sm:gap-3 sm:px-4 sm:pb-4">
        <div className="-mt-10 shrink-0 sm:-mt-11">
          <div className="h-[72px] w-[72px] overflow-hidden rounded-full border-[3px] border-white bg-[#f0f2f5] shadow-md sm:h-20 sm:w-20">
            <img
              src={bunnySrc}
              alt={adminName}
              className="h-full w-full object-cover object-top"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <div className="relative rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-[#f0f2f5] px-3 py-2.5 shadow-sm">
            <p className="text-[11px] font-semibold text-[#2d81e0]">
              {adminName} · {adminRole}
            </p>
            <p className="mt-1.5 text-[14px] leading-snug text-[#2c2d2e]">{welcomeMonologue}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
