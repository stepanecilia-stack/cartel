import { useEffect, useMemo, useRef, useState } from 'react'
import TechnicalAtomMedia from '../TechnicalAtomMedia.jsx'
import { hasLoopingPreviewMedia } from '../../utils/technicalAtomMedia.js'
import { vk } from '../../utils/vkUi.js'

function LockedAtomPlaceholder({ atom, compact = false }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#e7e8ec] to-[#d8dbe0] text-[#818c99] ${
        compact ? 'gap-0.5 p-1' : 'gap-1.5 p-3'
      }`}
      aria-hidden
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 80"
        className={compact ? 'h-8 w-8 opacity-45' : 'h-16 w-16 opacity-40'}
        fill="currentColor"
      >
        <circle cx="32" cy="14" r="10" />
        <path d="M12 72c4-14 14-22 20-22s16 8 20 22H12z" />
      </svg>
      {!compact ? <span className="text-[11px] font-semibold uppercase tracking-wide">Не открыто</span> : null}
      <span className={`tabular-nums ${compact ? 'text-[9px]' : 'text-[12px] font-medium'}`}>#{atom?.number ?? '—'}</span>
    </div>
  )
}

function UnlockedNoVideoPlaceholder({ atom, compact = false }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-[#f0f2f5] text-[#818c99] ${
        compact ? 'p-1' : 'p-3'
      }`}
    >
      <span className={compact ? 'text-lg' : 'text-2xl'} aria-hidden>
        ✓
      </span>
      {!compact ? <span className="text-[11px] font-medium text-[#4bb34b]">Без превью</span> : null}
      <span className={`line-clamp-2 text-center ${compact ? 'text-[8px]' : 'text-[12px]'}`}>{atom?.name}</span>
    </div>
  )
}

function AtomPreviewFrame({ atom, unlocked, compact, title }) {
  const frameClass = compact
    ? 'relative h-14 w-11 shrink-0 overflow-hidden rounded-md border'
    : 'relative aspect-[4/5] w-full max-w-[200px] overflow-hidden rounded-[10px] border-2'

  const borderClass = unlocked
    ? hasLoopingPreviewMedia(atom)
      ? 'border-[#2d81e0] shadow-sm'
      : 'border-[#4bb34b]/60'
    : 'border-[#d3d9de]'

  if (!unlocked) {
    return (
      <div className={`${frameClass} ${borderClass}`} title={title}>
        <LockedAtomPlaceholder atom={atom} compact={compact} />
      </div>
    )
  }

  if (!hasLoopingPreviewMedia(atom)) {
    return (
      <div className={`${frameClass} ${borderClass}`} title={title}>
        <UnlockedNoVideoPlaceholder atom={atom} compact={compact} />
      </div>
    )
  }

  return (
    <div className={`${frameClass} ${borderClass} bg-[#0f0f0f]`} title={title}>
      <TechnicalAtomMedia
        atom={atom}
        className="h-full w-full"
        previewable={!compact}
        title={atom?.name}
      />
    </div>
  )
}

/**
 * Дискретный прогресс по программе: ±1, превью, лента шагов.
 */
export default function TechniqueTierStepper({
  atoms,
  value,
  onChange,
  tierLabel = 'Ур.1',
  accent = false,
  practicedAtomIds,
  onTogglePracticed,
  passedCount: passedCountProp,
}) {
  const total = atoms.length
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), total)
  const passedCount = Math.min(
    Math.max(Number(passedCountProp ?? safeValue) || 0, safeValue),
    total,
  )
  const stripRef = useRef(null)
  const [pulseKey, setPulseKey] = useState(0)

  const spotlightIndex = useMemo(() => {
    if (total === 0) return 0
    if (safeValue <= 0) return 0
    if (safeValue >= total) return total - 1
    return safeValue - 1
  }, [safeValue, total])

  const spotlightAtom = atoms[spotlightIndex] ?? null
  const nextAtom = safeValue < total ? atoms[safeValue] : null
  const spotlightUnlocked = safeValue > 0 && safeValue <= total

  useEffect(() => {
    const el = stripRef.current
    if (!el || total === 0) return
    const target = el.querySelector(`[data-slot-index="${spotlightIndex}"]`)
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [spotlightIndex, total, safeValue])

  const step = (delta) => {
    const next = Math.min(Math.max(safeValue + delta, 0), total)
    if (next === safeValue) return
    onChange(next)
    if (delta > 0) setPulseKey((k) => k + 1)
  }

  if (total === 0) {
    return <p className={vk.mutedXs}>Программа пуста</p>
  }

  const accentBtn = accent
    ? 'bg-[#6f3ff5] active:bg-[#5e36d6] disabled:opacity-40'
    : 'bg-[#2d81e0] active:bg-[#2875cc] disabled:opacity-40'

  const practicedSet =
    practicedAtomIds instanceof Set
      ? practicedAtomIds
      : new Set(Array.isArray(practicedAtomIds) ? practicedAtomIds : [])
  const canMarkPracticed = typeof onTogglePracticed === 'function'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">{tierLabel}</p>
        <span className="text-[12px] font-semibold tabular-nums text-[#2c2d2e]">
          {safeValue}/{total}
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div key={pulseKey} className="w-full shrink-0 sm:w-[200px]">
          {spotlightAtom ? (
            <AtomPreviewFrame
              atom={spotlightAtom}
              unlocked={spotlightUnlocked}
              title={
                spotlightUnlocked
                  ? `${spotlightAtom.name} — открыто`
                  : `${spotlightAtom.name} — ещё не открыто`
              }
            />
          ) : null}
          {spotlightAtom ? (
            <p className="mt-1.5 text-center text-[13px] font-semibold leading-snug text-[#2c2d2e] sm:text-left">
              <span className="text-[#818c99]">#{spotlightAtom.number}</span> {spotlightAtom.name}
            </p>
          ) : null}
          {canMarkPracticed && spotlightUnlocked && spotlightAtom ? (
            <button
              type="button"
              onClick={() => onTogglePracticed(spotlightAtom.id)}
              className={`mt-1.5 w-full sm:w-auto ${
                practicedSet.has(spotlightAtom.id)
                  ? 'rounded-full bg-[#2d81e0] px-2.5 py-1 text-[12px] font-semibold text-white'
                  : vk.btnCompactSecondary
              }`}
            >
              {practicedSet.has(spotlightAtom.id) ? 'Отработан сегодня' : 'Отметить отработку'}
            </button>
          ) : null}
          {nextAtom && safeValue < total ? (
            <p className={`mt-0.5 text-center ${vk.mutedXs} sm:text-left`}>
              Следующий: #{nextAtom.number} {nextAtom.name}
            </p>
          ) : safeValue >= total && total > 0 ? (
            <p className="mt-0.5 text-center text-[12px] font-medium text-[#4bb34b] sm:text-left">
              Уровень закрыт
            </p>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={safeValue <= 0}
              className={`flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-[22px] font-light text-white ${accentBtn}`}
              aria-label="На шаг назад"
            >
              −
            </button>
            <span className="min-w-[4.5rem] text-center text-[15px] font-semibold tabular-nums text-[#2c2d2e]">
              {safeValue} / {total}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={safeValue >= total}
              className={`flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-[22px] font-light text-white ${accentBtn}`}
              aria-label="Открыть следующий приём"
            >
              +
            </button>
          </div>

          <div
            ref={stripRef}
            className="flex gap-1 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:thin]"
            role="list"
            aria-label="Шаги программы"
          >
            {atoms.map((atom, index) => {
              const unlocked = index < passedCount
              const practicedToday = practicedSet.has(atom.id)
              const ringClass = [
                index === spotlightIndex ? 'ring-2 ring-[#2d81e0] ring-offset-1' : '',
                practicedToday ? 'ring-2 ring-[#4bb34b] ring-offset-1' : '',
              ]
                .filter(Boolean)
                .join(' ')
              const tile = (
                <AtomPreviewFrame
                  atom={atom}
                  unlocked={unlocked}
                  compact
                  title={atom.name}
                />
              )
              return (
                <div
                  key={atom.id}
                  data-slot-index={index}
                  role="listitem"
                  className={`snap-center rounded-md ${ringClass}`}
                >
                  {canMarkPracticed && unlocked ? (
                    <button
                      type="button"
                      onClick={() => onTogglePracticed(atom.id)}
                      className="touch-manipulation rounded-md text-left"
                      aria-pressed={practicedToday}
                      aria-label={
                        practicedToday
                          ? `${atom.name}, отработан сегодня — снять`
                          : `${atom.name}, отметить отработку`
                      }
                    >
                      {tile}
                    </button>
                  ) : (
                    tile
                  )}
                </div>
              )
            })}
          </div>
          <p className={`text-center ${vk.mutedXs}`}>
            {canMarkPracticed
              ? 'Кнопки +/− — прогресс. Тап по миниатюре пройденного — отработали сегодня.'
              : 'Только кнопки + и − — по одному приёму'}
          </p>
        </div>
      </div>
    </div>
  )
}
