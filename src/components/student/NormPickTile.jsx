import { isMinuteSecondNorm } from '../../utils/normTestsStorage.js'

/**
 * @param {{
 *   norm: { testName?: string, unit?: string, description?: string },
 *   selected: boolean,
 *   onSelect: () => void,
 * }} props
 */
export function NormPickTile({ norm, selected, onSelect }) {
  const name = norm.testName || 'Без названия'
  const unit = String(norm.unit ?? '').trim()
  const timeNorm = isMinuteSecondNorm(norm)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex w-full touch-manipulation flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition active:scale-[0.99] ${
        selected
          ? 'border-[#2d81e0] bg-[#ecf3fc] shadow-sm ring-1 ring-[#2d81e0]/25'
          : 'border-[#e7e8ec] bg-[#f7f8fa] hover:border-[#d3d9de] hover:bg-[#f0f2f5] active:bg-[#ebedf0]'
      }`}
    >
      {selected ? (
        <span
          className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2d81e0] text-[10px] font-bold leading-none text-white"
          aria-hidden
        >
          ✓
        </span>
      ) : null}
      <span className="line-clamp-2 pr-5 text-[13px] font-semibold leading-snug text-[#2c2d2e]">{name}</span>
      <span className="flex flex-wrap gap-1">
        {unit ? (
          <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-[#818c99]">
            {unit}
          </span>
        ) : null}
        {timeNorm ? (
          <span className="rounded bg-[#ecf3fc] px-1.5 py-0.5 text-[10px] font-medium text-[#2d81e0]">
            мм:сс
          </span>
        ) : null}
      </span>
    </button>
  )
}
