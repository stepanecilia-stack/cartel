import { memo, useEffect, useMemo, useState } from 'react'
import { mergeWithRequiredLevel3Combinations } from '../../utils/techniqueCatalog.js'
import { countLeadingMasteredAtoms } from '../../utils/studentTechnicalUpdate.js'
import { vk } from '../../utils/vkUi.js'

/** @typedef {{ l1: number, l2: number, l3: number }} TechniqueSliderTiers */

export function TrainingRangeSlider({ min, max, value, onChange, ariaLabel, variant = 'primary' }) {
  const fillPercent = max > 0 ? (value / max) * 100 : 0
  const fillClass = variant === 'accent' ? 'bg-[#6f3ff5]' : 'bg-[#2d81e0]'
  const thumbBorderClass =
    variant === 'accent'
      ? '[&::-moz-range-thumb]:border-[#6f3ff5] [&::-webkit-slider-thumb]:border-[#6f3ff5]'
      : '[&::-moz-range-thumb]:border-[#2d81e0] [&::-webkit-slider-thumb]:border-[#2d81e0]'

  return (
    <div className="relative flex h-9 items-center sm:h-8">
      <div
        className="pointer-events-none absolute inset-x-0 h-2 overflow-hidden rounded-full bg-[#e7e8ec]"
        aria-hidden
      >
        <div className={`h-full ${fillClass}`} style={{ width: `${fillPercent}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={max <= 0}
        className={`relative z-10 h-9 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 ${thumbBorderClass} [&::-moz-range-progress]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md sm:[&::-moz-range-thumb]:h-5 sm:[&::-moz-range-thumb]:w-5 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[calc((0.5rem-1.5rem)/2)] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md sm:[&::-webkit-slider-thumb]:mt-[calc((0.5rem-1.25rem)/2)] sm:[&::-webkit-slider-thumb]:h-5 sm:[&::-webkit-slider-thumb]:w-5`}
      />
    </div>
  )
}

/**
 * @param {{
 *   level1Atoms: object[],
 *   level2Atoms: object[],
 *   combinations?: unknown,
 *   technicalData?: Record<string, { level?: string }>,
 *   canSave?: boolean,
 *   saveStatus?: 'idle' | 'saving' | 'saved' | 'error',
 *   onSliderChange: (tiers: TechniqueSliderTiers) => void,
 * }} props
 */
function TechniqueProgressSliders({
  level1Atoms,
  level2Atoms,
  combinations = [],
  technicalData = {},
  canSave = true,
  saveStatus = 'idle',
  onSliderChange,
}) {
  const orderedL3 = useMemo(
    () => mergeWithRequiredLevel3Combinations(combinations),
    [combinations],
  )
  const l3Atoms = useMemo(() => orderedL3.map((c) => ({ id: c.id, name: c.name })), [orderedL3])

  const total1 = level1Atoms.length
  const total2 = level2Atoms.length
  const total3 = l3Atoms.length

  const baseline1 = useMemo(
    () => countLeadingMasteredAtoms(level1Atoms, technicalData),
    [level1Atoms, technicalData],
  )
  const baseline2 = useMemo(
    () => countLeadingMasteredAtoms(level2Atoms, technicalData),
    [level2Atoms, technicalData],
  )
  const baseline3 = useMemo(
    () => countLeadingMasteredAtoms(l3Atoms, technicalData),
    [l3Atoms, technicalData],
  )

  const [slider1, setSlider1] = useState(baseline1)
  const [slider2, setSlider2] = useState(baseline2)
  const [slider3, setSlider3] = useState(baseline3)
  const [showTier2, setShowTier2] = useState(() => total1 > 0 && baseline1 >= total1)
  const [showTier3, setShowTier3] = useState(() => total2 > 0 && baseline2 >= total2 && total3 > 0)

  useEffect(() => {
    setSlider1(baseline1)
  }, [baseline1])
  useEffect(() => {
    setSlider2(baseline2)
  }, [baseline2])
  useEffect(() => {
    setSlider3(baseline3)
  }, [baseline3])

  useEffect(() => {
    if (total1 > 0 && slider1 >= total1) setShowTier2(true)
  }, [slider1, total1])

  useEffect(() => {
    if (total2 > 0 && slider2 >= total2) setShowTier3(true)
  }, [slider2, total2])

  const emit = (next1, next2, next3) => {
    if (!canSave) return
    onSliderChange({ l1: next1, l2: next2, l3: next3 })
  }

  const statusLine =
    saveStatus === 'saving'
      ? 'Сохранение…'
      : saveStatus === 'saved'
        ? 'Сохранено'
        : saveStatus === 'error'
          ? 'Ошибка сохранения'
          : null

  const statusClass =
    saveStatus === 'error'
      ? 'text-[#e64646]'
      : saveStatus === 'saved'
        ? 'text-[#4bb34b]'
        : 'text-[#818c99]'

  const renderTierHint = (ordered, value, total) => {
    const current = value >= 1 && value <= total ? ordered[value - 1] : null
    const next = value < total ? ordered[value] : null
    if (!current && !(value === total && total > 0)) {
      return <p className={`mt-0.5 ${vk.mutedXs}`}>Не начато</p>
    }
    return (
      <div className={`mt-0.5 ${vk.mutedXs} leading-snug`}>
        {current ? (
          <p className="line-clamp-2" title={current.name}>
            <span className="font-semibold text-[#2d81e0]">Шаг {value}.</span> {current.name}
          </p>
        ) : null}
        {next ? (
          <p className="mt-0.5 line-clamp-1" title={next.name}>
            Дальше: {next.name}
          </p>
        ) : value === total && total > 0 ? (
          <p className="mt-0.5 font-medium text-[#4bb34b]">Уровень закрыт</p>
        ) : null}
      </div>
    )
  }

  const renderTierBlock = (tierNum, total, value, ordered, variant, onValueChange) => {
    if (total <= 0) return null
    const label = tierNum === 3 ? 'Ур.3 · комбинации' : tierNum === 2 ? 'Ур.2' : 'Ур.1 · программа'
    const sliderVariant = tierNum === 3 ? 'accent' : 'primary'
    return (
      <div className="border-t border-[#e7e8ec] pt-2 first:border-t-0 first:pt-0">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">{label}</p>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#2c2d2e]">
            {value}/{total}
          </span>
        </div>
        <TrainingRangeSlider
          min={0}
          max={total}
          value={value}
          variant={sliderVariant}
          ariaLabel={label}
          onChange={(e) => {
            if (!canSave) return
            const raw = Number(e.target.value)
            const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), total)
            onValueChange(next)
          }}
        />
        {renderTierHint(ordered, value, total)}
      </div>
    )
  }

  if (total1 === 0 && total2 === 0 && total3 === 0) return null

  return (
    <section className={`${vk.cardPadded} space-y-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[#2c2d2e]">Прогресс по шагам</p>
          <p className={`${vk.mutedXs} mt-0.5`}>
            Как на «Прогресс техники»: ползунок ставит приёмы на «Умение». Ур.2–3 после закрытия
            предыдущего.
          </p>
        </div>
        {statusLine ? <span className={`text-[11px] font-medium ${statusClass}`}>{statusLine}</span> : null}
      </div>

      <div className="space-y-2">
        {renderTierBlock(1, total1, slider1, level1Atoms, 'primary', (next) => {
          setSlider1(next)
          emit(next, slider2, slider3)
        })}

        {showTier2 && total2 > 0
          ? renderTierBlock(2, total2, slider2, level2Atoms, 'primary', (next) => {
              setSlider2(next)
              emit(slider1, next, slider3)
            })
          : null}

        {showTier3 && total3 > 0
          ? renderTierBlock(3, total3, slider3, l3Atoms, 'accent', (next) => {
              setSlider3(next)
              emit(slider1, slider2, next)
            })
          : null}
      </div>
    </section>
  )
}

export default memo(TechniqueProgressSliders)
