import { memo, useMemo } from 'react'
import {
  buildNormChartPoints,
  normChartPointColor,
  normChartYDomain,
} from '../../utils/normHistoryChart.js'
import { formatNormGoldLabel } from '../../utils/normTestsStorage.js'
import { vk } from '../../utils/vkUi.js'

const W = 360
const H = 160
const PAD = { top: 14, right: 12, bottom: 28, left: 44 }

/**
 * @param {{
 *   norm: object,
 *   row: Record<string, unknown> | null | undefined,
 * }} props
 */
function NormHistoryChart({ norm, row }) {
  const points = useMemo(() => buildNormChartPoints(norm, row), [norm, row])
  const domain = useMemo(() => normChartYDomain(points, norm), [points, norm])

  const layout = useMemo(() => {
    if (points.length === 0) return null

    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const spanY = Math.max(domain.max - domain.min, 0.001)
    const n = points.length

    const toX = (i) => PAD.left + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
    const toY = (value) => PAD.top + innerH - ((value - domain.min) / spanY) * innerH

    const coords = points.map((p, i) => ({
      ...p,
      x: toX(i),
      y: toY(p.result),
    }))

    const pathD =
      coords.length >= 2
        ? coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
        : ''

    const thresholds = [
      { key: 'gold', label: 'Золото', color: '#ffa000' },
      { key: 'silver', label: 'Серебро', color: '#aeb7c2' },
      { key: 'bronze', label: 'Бронза', color: '#cd7f32' },
    ]
      .map(({ key, label, color }) => {
        const value = Number(norm?.[key])
        if (!Number.isFinite(value)) return null
        return { key, label, color, value, y: toY(value) }
      })
      .filter(Boolean)

    const yTicks = [domain.min, domain.max].map((value) => ({
      value,
      y: toY(value),
      label: formatTickLabel(norm, value),
    }))

    return { coords, pathD, thresholds, yTicks, innerW }
  }, [points, domain, norm])

  if (points.length === 0) {
    return (
      <p className={`rounded-lg bg-[#f0f2f5] px-3 py-4 text-center ${vk.mutedXs}`}>
        Пока нет принятых результатов. После сохранения зачёта тренером здесь появится график.
      </p>
    )
  }

  if (points.length === 1 && layout) {
    const p = layout.coords[0]
    return (
      <div className="space-y-2">
        <div className="rounded-lg bg-[#f0f2f5] px-3 py-3 text-center">
          <p className="text-[11px] text-[#818c99]">{p.dateLabel}</p>
          <p className="mt-0.5 text-[22px] font-bold tabular-nums text-[#2c2d2e]">{p.resultDisplay}</p>
          {p.normalizedScore != null ? (
            <p className="mt-0.5 text-[12px] tabular-nums text-[#818c99]">балл {p.normalizedScore}</p>
          ) : null}
          <p className="mt-2 text-[11px] text-[#818c99]">
            Золото: {formatNormGoldLabel(norm)} · нужна ещё одна точка для линии
          </p>
        </div>
      </div>
    )
  }

  if (!layout) return null

  return (
    <div className="rounded-lg bg-[#f0f2f5] px-2 py-2">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mx-auto block max-w-full" aria-hidden>
        {layout.yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#e7e8ec"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#818c99"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {layout.thresholds.map((t) => (
          <g key={t.key}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke={t.color}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.85"
            />
          </g>
        ))}

        {layout.pathD ? (
          <path
            d={layout.pathD}
            fill="none"
            stroke="#2d81e0"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {layout.coords.map((c) => (
          <g key={c.id}>
            <circle cx={c.x} cy={c.y} r="4.5" fill="white" stroke={normChartPointColor(c.status)} strokeWidth="2" />
            <text x={c.x} y={H - 8} textAnchor="middle" fontSize="9" fill="#818c99">
              {c.dateLabel}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] text-[#818c99]">
        {layout.thresholds.map((t) => (
          <span key={t.key} className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 border-t border-dashed" style={{ borderColor: t.color }} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function formatTickLabel(norm, value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (Math.abs(n) >= 100 || Number.isInteger(n)) return String(Math.round(n))
  return n.toFixed(1)
}

export default memo(NormHistoryChart)
