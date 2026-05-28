import { useEffect, useMemo, useRef, useState } from 'react'
import TechnicalAtomMedia from '../TechnicalAtomMedia.jsx'
import { getAtomReinforcementTotal } from '../../utils/atomReinforcement.js'
import {
  isAtomReinforceableInIsolation,
  NON_ISOLATED_REINFORCEMENT_SYMBOL,
  NON_ISOLATED_REINFORCEMENT_TITLE,
} from '../../utils/atomReinforcementEligibility.js'
import { hasLoopingPreviewMedia } from '../../utils/technicalAtomMedia.js'
import { vk } from '../../utils/vkUi.js'

/** Счётчик отработок или метка «только в связке». */
function ReinforcementCornerBadge({ total, compact = false, reinforceable = true }) {
  if (!reinforceable) {
    return (
      <span
        className={`pointer-events-none absolute z-20 rounded-md font-bold leading-none shadow-sm ${
          compact
            ? 'right-0 top-0 px-0.5 py-px text-[9px]'
            : 'right-1 top-1 px-1 py-0.5 text-[12px]'
        } bg-[#818c99]/90 text-white`}
        title={NON_ISOLATED_REINFORCEMENT_TITLE}
      >
        {NON_ISOLATED_REINFORCEMENT_SYMBOL}
      </span>
    )
  }

  return (
    <span
      className={`pointer-events-none absolute z-20 rounded-md font-bold tabular-nums leading-none shadow-sm ${
        compact
          ? 'right-0 top-0 min-w-[1.1rem] px-0.5 py-px text-[8px]'
          : 'right-1 top-1 min-w-[1.35rem] px-1 py-0.5 text-[11px]'
      } ${total > 0 ? 'bg-[#2c2d2e]/85 text-white' : 'bg-white/90 text-[#818c99]'}`}
      title={`Всего отработок в зале: ${total}`}
    >
      {total > 0 ? `×${total}` : '0'}
    </span>
  )
}

function PracticedTodayOverlay({ compact = false }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#4bb34b]/20"
      aria-hidden
    >
      <span
        className={`flex items-center justify-center rounded-full bg-[#4bb34b] font-bold text-white shadow-md ${
          compact ? 'h-5 w-5 text-[12px]' : 'h-11 w-11 text-[22px]'
        }`}
      >
        ✓
      </span>
    </div>
  )
}

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

function UnlockedNoVideoPlaceholder({ atom, compact = false, practicedToday = false }) {
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center gap-1 ${
        practicedToday ? 'bg-[#e8f5e9]' : 'bg-[#f0f2f5]'
      } text-[#818c99] ${compact ? 'p-1' : 'p-3'}`}
    >
      {!practicedToday ? (
        <span className={compact ? 'text-lg' : 'text-2xl'} aria-hidden>
          ✓
        </span>
      ) : null}
      {!compact && !practicedToday ? (
        <span className="text-[11px] font-medium text-[#4bb34b]">Без превью</span>
      ) : null}
      <span className={`line-clamp-2 text-center ${compact ? 'text-[8px]' : 'text-[12px]'}`}>{atom?.name}</span>
      {practicedToday ? <PracticedTodayOverlay compact={compact} /> : null}
    </div>
  )
}

function AtomPreviewFrame({
  atom,
  unlocked,
  compact,
  title,
  practicedToday = false,
  reinforcementTotal = 0,
  showReinforcementCount = false,
  reinforceableInIsolation = true,
}) {
  const frameClass = compact
    ? 'relative h-13 w-10 shrink-0 overflow-hidden rounded-md border'
    : 'relative aspect-[4/5] w-full max-w-[184px] overflow-hidden rounded-[10px] border-2'

  const borderClass = practicedToday
    ? 'border-[#4bb34b] shadow-sm'
    : unlocked
      ? hasLoopingPreviewMedia(atom)
        ? 'border-[#2d81e0] shadow-sm'
        : 'border-[#4bb34b]/60'
      : 'border-[#d3d9de]'

  const countBadge =
    showReinforcementCount && unlocked ? (
      <ReinforcementCornerBadge
        total={reinforcementTotal}
        compact={compact}
        reinforceable={reinforceableInIsolation}
      />
    ) : null

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
        <UnlockedNoVideoPlaceholder atom={atom} compact={compact} practicedToday={practicedToday} />
        {countBadge}
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
      {practicedToday ? <PracticedTodayOverlay compact={compact} /> : null}
      {countBadge}
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
  onMarkPracticed,
  passedCount: passedCountProp,
  progressLocked = false,
  reinforcementMap,
}) {
  const total = atoms.length
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), total)
  const passedCount = Math.min(
    Math.max(Number(passedCountProp ?? safeValue) || 0, safeValue),
    total,
  )
  const stripRef = useRef(null)
  const [pulseKey, setPulseKey] = useState(0)

  const progressSpotlightIndex = useMemo(() => {
    if (total === 0) return 0
    if (safeValue <= 0) return 0
    if (safeValue >= total) return total - 1
    return safeValue - 1
  }, [safeValue, total])

  const [focusIndex, setFocusIndex] = useState(progressSpotlightIndex)

  useEffect(() => {
    setFocusIndex((prev) => {
      if (prev >= 0 && prev < passedCount) return prev
      return progressSpotlightIndex
    })
  }, [progressSpotlightIndex, passedCount, total, tierLabel])

  const practicedSet = useMemo(
    () =>
      practicedAtomIds instanceof Set
        ? practicedAtomIds
        : new Set(Array.isArray(practicedAtomIds) ? practicedAtomIds : []),
    [practicedAtomIds],
  )
  const canMarkPracticed = typeof onMarkPracticed === 'function'

  const displayIndex = Math.min(Math.max(focusIndex, 0), Math.max(total - 1, 0))
  const focusAtom = atoms[displayIndex] ?? null
  const focusUnlocked = displayIndex < passedCount
  const focusPracticedToday = focusAtom ? practicedSet.has(focusAtom.id) : false
  const focusReinforceable = focusAtom ? isAtomReinforceableInIsolation(focusAtom) : false

  const nextAtom = safeValue < total ? atoms[safeValue] : null

  useEffect(() => {
    const el = stripRef.current
    if (!el || total === 0) return
    const target = el.querySelector(`[data-slot-index="${displayIndex}"]`)
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [displayIndex, total])

  const step = (delta) => {
    if (progressLocked || typeof onChange !== 'function') return
    const next = Math.min(Math.max(safeValue + delta, 0), total)
    if (next === safeValue) return
    onChange(next)
    const nextSpot =
      next <= 0 ? 0 : next >= total ? total - 1 : next - 1
    setFocusIndex(nextSpot)
    if (delta > 0) setPulseKey((k) => k + 1)
  }

  const handleMarkFocus = () => {
    if (!focusAtom || !canMarkPracticed || !focusUnlocked || focusPracticedToday) return
    if (!isAtomReinforceableInIsolation(focusAtom)) return
    onMarkPracticed(focusAtom.id, focusAtom)
  }

  const displayReinforcementTotal = (atomId, practicedToday) => {
    const saved = getAtomReinforcementTotal(reinforcementMap, atomId)
    return saved + (practicedToday ? 1 : 0)
  }

  if (total === 0) {
    return <p className={vk.mutedXs}>Программа пуста</p>
  }

  const accentBtn = accent
    ? 'bg-[#6f3ff5] active:bg-[#5e36d6] disabled:opacity-40'
    : 'bg-[#2d81e0] active:bg-[#2875cc] disabled:opacity-40'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">{tierLabel}</p>
        <span className="text-[12px] font-semibold tabular-nums text-[#2c2d2e]">
          {safeValue}/{total}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:items-start sm:gap-2.5">
        <div key={pulseKey} className="w-full shrink-0 sm:w-[184px]">
          {focusAtom ? (
            <AtomPreviewFrame
              atom={focusAtom}
              unlocked={focusUnlocked}
              practicedToday={focusPracticedToday}
              reinforcementTotal={displayReinforcementTotal(focusAtom.id, focusPracticedToday)}
              showReinforcementCount={focusUnlocked}
              reinforceableInIsolation={focusReinforceable}
              title={
                !focusReinforceable
                  ? `${focusAtom.name} — ${NON_ISOLATED_REINFORCEMENT_TITLE}`
                  : focusUnlocked
                    ? `${focusAtom.name} — всего отработок: ${displayReinforcementTotal(focusAtom.id, focusPracticedToday)}`
                    : `${focusAtom.name} — ещё не в пройденном`
              }
            />
          ) : null}
          {focusAtom ? (
            <p className="mt-1 text-center text-[12px] font-semibold leading-snug text-[#2c2d2e] sm:text-left">
              <span className="text-[#818c99]">#{focusAtom.number}</span> {focusAtom.name}
              {focusUnlocked && focusReinforceable ? (
                <span className="ml-1.5 tabular-nums text-[#818c99]">
                  ×{displayReinforcementTotal(focusAtom.id, focusPracticedToday)}
                </span>
              ) : null}
              {focusUnlocked && !focusReinforceable ? (
                <span className="ml-1.5 text-[#818c99]" title={NON_ISOLATED_REINFORCEMENT_TITLE}>
                  {NON_ISOLATED_REINFORCEMENT_SYMBOL}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
          {progressLocked ? (
            <p className={`text-center ${vk.mutedXs}`}>
              Выберите миниатюру · отметка на крупном превью. Прогресс (+/−) — на вкладке «прогр.»
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={safeValue <= 0}
                className={`flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-[20px] font-light text-white ${accentBtn}`}
                aria-label="На шаг назад"
              >
                −
              </button>
              <span className="min-w-[4.2rem] text-center text-[14px] font-semibold tabular-nums text-[#2c2d2e]">
                {safeValue} / {total}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={safeValue >= total}
                className={`flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-[20px] font-light text-white ${accentBtn}`}
                aria-label="Открыть следующий приём"
              >
                +
              </button>
            </div>
          )}

          <div
            ref={stripRef}
            className="flex gap-1 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:thin]"
            role="list"
            aria-label="Шаги программы"
          >
            {atoms.map((atom, index) => {
              const unlocked = index < passedCount
              const practicedToday = practicedSet.has(atom.id)
              const reinforceable = isAtomReinforceableInIsolation(atom)
              const isFocused = index === displayIndex
              const ringClass = [
                isFocused ? 'ring-2 ring-[#2d81e0] ring-offset-1' : '',
                practicedToday ? 'ring-2 ring-[#4bb34b]/80 ring-offset-1' : '',
              ]
                .filter(Boolean)
                .join(' ')

              const cumulativeTotal = reinforceable
                ? displayReinforcementTotal(atom.id, practicedToday)
                : 0

              const tile = (
                <AtomPreviewFrame
                  atom={atom}
                  unlocked={unlocked}
                  practicedToday={practicedToday && reinforceable}
                  reinforcementTotal={cumulativeTotal}
                  showReinforcementCount={unlocked}
                  reinforceableInIsolation={reinforceable}
                  compact
                  title={
                    !reinforceable
                      ? `${atom.name} — ${NON_ISOLATED_REINFORCEMENT_TITLE}`
                      : unlocked
                        ? `${atom.name} — всего отработок: ${cumulativeTotal}${practicedToday ? ', сегодня отмечен' : ''}`
                        : `${atom.name} — не в пройденном`
                  }
                />
              )

              return (
                <div
                  key={atom.id}
                  data-slot-index={index}
                  role="listitem"
                  className={`snap-center rounded-md ${ringClass}`}
                >
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => setFocusIndex(index)}
                      className="touch-manipulation rounded-md text-left"
                      aria-current={isFocused ? 'true' : undefined}
                      aria-label={
                        practicedToday
                          ? `${atom.name}, отработан сегодня`
                          : `${atom.name}, показать крупно`
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
          {canMarkPracticed && focusUnlocked && focusAtom && focusReinforceable ? (
            focusPracticedToday ? (
              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-[#4bb34b] sm:justify-start">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4bb34b] text-[11px] text-white">
                  ✓
                </span>
                Отработан сегодня
              </p>
            ) : (
              <button type="button" onClick={handleMarkFocus} className={`w-full sm:w-auto ${vk.btnPrimary}`}>
                Отметить отработку
              </button>
            )
          ) : null}
          {focusUnlocked && focusAtom && !focusReinforceable ? (
            <p className={`${vk.mutedXs} sm:text-left`}>{NON_ISOLATED_REINFORCEMENT_TITLE}</p>
          ) : null}
          {nextAtom && safeValue < total && !progressLocked ? (
            <p className={`text-center ${vk.mutedXs} sm:text-left`}>
              Следующий: #{nextAtom.number} {nextAtom.name}
            </p>
          ) : safeValue >= total && total > 0 ? (
            <p className="text-center text-[12px] font-medium text-[#4bb34b] sm:text-left">
              Уровень закрыт
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
