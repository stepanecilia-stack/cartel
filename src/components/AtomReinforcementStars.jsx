import { memo } from 'react'
import {
  getAtomReinforcementTotal,
  reinforcementStarCount,
} from '../utils/atomReinforcement.js'

/**
 * @param {{
 *   total?: number,
 *   reinforcementMap?: Record<string, { total?: number }>,
 *   atomId?: string,
 *   size?: 'sm' | 'md',
 *   showCount?: boolean,
 *   className?: string,
 * }} props
 */
function AtomReinforcementStars({
  total: totalProp,
  reinforcementMap,
  atomId,
  size = 'sm',
  showCount = false,
  className = '',
}) {
  const total =
    totalProp != null
      ? Math.max(0, Math.floor(Number(totalProp) || 0))
      : getAtomReinforcementTotal(reinforcementMap, atomId ?? '')
  const stars = reinforcementStarCount(total)
  const maxStars = 5

  const starClass = size === 'md' ? 'text-[15px]' : 'text-[11px]'
  const countClass = size === 'md' ? 'text-[12px]' : 'text-[10px]'

  const label =
    stars === 0
      ? 'В зале ещё не отрабатывали'
      : `Упрочнение: ${stars} из ${maxStars} звёзд, всего ${total} отработок`

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      title={label}
      aria-label={label}
    >
      {Array.from({ length: maxStars }, (_, i) => (
        <span
          key={i}
          className={`leading-none ${starClass} ${i < stars ? 'text-[#f5a623]' : 'text-[#d3d9de]'}`}
          aria-hidden
        >
          ★
        </span>
      ))}
      {showCount && total > 0 ? (
        <span className={`ml-0.5 tabular-nums text-[#818c99] ${countClass}`}>×{total}</span>
      ) : null}
    </span>
  )
}

export default memo(AtomReinforcementStars)
