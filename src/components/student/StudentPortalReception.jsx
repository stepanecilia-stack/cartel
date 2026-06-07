import { STUDENT_PORTAL_RECEPTION } from '../../constants/studentPortalReception.js'

/**
 * @param {{
 *   compact?: boolean,
 *   showSubtitle?: boolean,
 *   className?: string,
 * }} props
 */
export default function StudentPortalReception({ compact = false, showSubtitle = true, className = '' }) {
  const { sceneSrc, bunnySrc, adminName, adminTitle, welcomeTitle, welcomeSubtitle } =
    STUDENT_PORTAL_RECEPTION

  return (
    <div
      className={`relative overflow-hidden rounded-[10px] border border-[#e7e8ec] bg-[#2c2d2e] ${
        compact ? 'min-h-[220px]' : 'min-h-[280px] sm:min-h-[320px]'
      } ${className}`}
    >
      <img
        src={sceneSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="eager"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419]/92 via-[#0f1419]/35 to-[#0f1419]/10" />

      <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-3 sm:p-4">
        <div className={`flex items-end gap-2 sm:gap-3 ${compact ? '' : 'sm:gap-4'}`}>
          <div
            className={`relative shrink-0 ${compact ? 'w-[88px] sm:w-[100px]' : 'w-[100px] sm:w-[120px]'}`}
          >
            <img
              src={bunnySrc}
              alt={adminName}
              className="w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="mb-1 min-w-0 flex-1">
            <div className="relative rounded-xl rounded-bl-sm bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:px-3.5 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2d81e0] sm:text-[11px]">
                {adminTitle}
              </p>
              <h2
                className={`mt-0.5 font-semibold leading-snug text-[#2c2d2e] ${
                  compact ? 'text-[13px] sm:text-[14px]' : 'text-[14px] sm:text-[15px]'
                }`}
              >
                {welcomeTitle}
              </h2>
              {showSubtitle ? (
                <p className="mt-1 text-[12px] leading-snug text-[#818c99] sm:text-[13px]">{welcomeSubtitle}</p>
              ) : null}
            </div>
            <p className="mt-1.5 pl-1 text-[11px] font-medium text-white/90">{adminName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
