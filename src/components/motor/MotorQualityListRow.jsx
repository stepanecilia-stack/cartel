import { Link } from 'react-router-dom'
import SensitiveAgeScale from '../SensitiveAgeScale.jsx'

/**
 * @param {{
 *   title: string,
 *   slug: string,
 *   exerciseCount: number,
 *   exerciseCountLabel: string,
 *   sensitiveAgeSet?: Set<number>,
 * }} props
 */
export default function MotorQualityListRow({
  title,
  slug,
  exerciseCount,
  exerciseCountLabel,
  sensitiveAgeSet,
}) {
  const hasExercises = exerciseCount > 0

  return (
    <li>
      <Link
        to={`/qualities/${slug}`}
        className="block touch-manipulation rounded-[10px] border border-[#e7e8ec] bg-white px-3 py-2.5 shadow-sm active:bg-[#f5f6f8]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-5 text-[#2c2d2e]">{title}</p>
            <p
              className={`mt-0.5 text-[12px] tabular-nums leading-4 ${
                hasExercises ? 'text-[#818c99]' : 'text-[#aeb7c2]'
              }`}
            >
              {exerciseCount} {exerciseCountLabel}
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-[18px] font-light leading-none text-[#c4c8cc]" aria-hidden>
            ›
          </span>
        </div>
        {sensitiveAgeSet?.size > 0 ? (
          <SensitiveAgeScale
            sensitiveAges={sensitiveAgeSet}
            compact
            showCaption={false}
            className="mt-2 border-t border-[#f0f2f5] pt-2"
          />
        ) : null}
      </Link>
    </li>
  )
}
