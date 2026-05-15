import { useMemo } from 'react'

const MAX_STATURE_PX = 200
const PAD_TOP = 32
const PAD_BOTTOM = 6
const VIEW_W = 64
const VIEW_H = 100
const FLOOR_Y = 100
const CROWN_Y = 3
const STATURE_UNITS = FLOOR_Y - CROWN_Y
/** При размах ≈ росту: fingertip–fingertip ~98% высоты фигуры в viewBox. */
const WINGSPAN_TO_STATURE = 0.98
const HIP_Y = 56
const SHOULDER_Y = 24
const CX = VIEW_W / 2

export function referenceWeightFromStandardRow(standardRow) {
  if (!standardRow || typeof standardRow !== 'object') return null
  const wMin = Number(standardRow.weightMin)
  const wMax = Number(standardRow.weightMax)
  if (!Number.isFinite(wMin)) return null
  if (standardRow.openTop) return wMin + 3
  if (Number.isFinite(wMax) && wMax > wMin) return (wMin + wMax) / 2
  return wMin
}

export function computeBulkScale(athleteWeightKg, referenceWeightKg) {
  const aw = Number(athleteWeightKg)
  const rw = Number(referenceWeightKg)
  if (!Number.isFinite(aw) || aw < 20 || !Number.isFinite(rw) || rw < 20) return 1
  return Math.min(Math.max(Math.sqrt(aw / rw), 0.78), 1.35)
}

/** Полный размах (средний палец — средний палец) в единицах viewBox. */
function fullWingspanUnits(reachCm, heightCm, spanScaleHeightCm) {
  const scaleH = Number(spanScaleHeightCm) || Number(heightCm)
  const h = Number(heightCm)
  const r = Number(reachCm)
  if (!Number.isFinite(scaleH) || scaleH < 80) return STATURE_UNITS * WINGSPAN_TO_STATURE
  const reach = Number.isFinite(r) && r > 0 ? r : Number.isFinite(h) && h > 0 ? h : scaleH
  const ratio = Math.min(Math.max(reach / scaleH, 0.88), 1.16)
  return STATURE_UNITS * WINGSPAN_TO_STATURE * ratio
}

/** Руки опущены вдоль корпуса; длина плечо→локоть→кисть ≈ (размах − плечи) / 2. */
function armSegmentsRelaxed(shoulderHalf, fullWingspan) {
  const shoulderBreadth = shoulderHalf * 2
  const armPath = Math.max((fullWingspan - shoulderBreadth) / 2, 28)
  const upperLen = armPath * 0.46
  const foreLen = armPath * 0.54

  const buildSide = (sign) => {
    const sx = CX + sign * shoulderHalf
    const sy = SHOULDER_Y
    const ex = sx + sign * upperLen * 0.32
    const ey = sy + upperLen * 0.93
    const hx = ex + sign * foreLen * 0.3
    const hy = ey + foreLen * 0.88
    return {
      segments: [
        [sx, sy, ex, ey],
        [ex, ey, hx, hy],
      ],
    }
  }

  const left = buildSide(-1)
  const right = buildSide(1)
  return {
    left: left.segments,
    right: right.segments,
  }
}

function stickmanSize(staturePx) {
  const unit = staturePx / STATURE_UNITS
  return {
    unit,
    width: VIEW_W * unit,
    height: VIEW_H * unit,
  }
}

function StickmanFigure({ staturePx, stroke, bulk, reachCm, heightCm, spanScaleHeightCm }) {
  if (!Number.isFinite(staturePx) || staturePx < 40) return null

  const b = Math.min(Math.max(bulk, 0.78), 1.35)
  const shoulderHalf = 8 * b
  const hip = 6 * b
  const fullWingspan = fullWingspanUnits(reachCm, heightCm, spanScaleHeightCm)
  const arms = armSegmentsRelaxed(shoulderHalf, fullWingspan)
  const { width, height } = stickmanSize(staturePx)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMax meet"
      className="block overflow-visible"
      aria-hidden
    >
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={CX} cy="10" r="7" />
        <line x1={CX} y1="17" x2={CX} y2="56" />
        <line x1={CX - shoulderHalf} y1={SHOULDER_Y} x2={CX + shoulderHalf} y2={SHOULDER_Y} />
        {arms.left.map(([x1, y1, x2, y2], i) => (
          <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
        {arms.right.map(([x1, y1, x2, y2], i) => (
          <line key={`r${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
        <line x1={CX - hip} y1="56" x2={CX + hip} y2="56" />
        <line x1={CX - hip} y1="56" x2={CX - 7} y2={FLOOR_Y} />
        <line x1={CX + hip} y1="56" x2={CX + 7} y2={FLOOR_Y} />
      </g>
    </svg>
  )
}

function HeightGuideLine({ bottomPx, label, lineClass, labelClass, dash, align = 'left', labelLift = 0 }) {
  const labelPos =
    align === 'right'
      ? 'right-1 sm:right-2'
      : 'left-1 sm:left-2'

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10"
      style={{ bottom: `${bottomPx}px` }}
    >
      <div
        className={`w-full ${dash ? 'border-t-2 border-dashed' : 'border-t-[3px] border-solid'} ${lineClass}`}
        aria-hidden
      />
      {label ? (
        <span
          className={`absolute ${labelPos} whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums sm:text-[11px] ${labelClass}`}
          style={{ top: -12 + labelLift }}
        >
          {label}
        </span>
      ) : null}
    </div>
  )
}

export default function StandardDuelSilhouettes({
  athleteLabel = 'Спортсмен',
  referenceLabel = 'Эталон',
  athleteHeightCm = 0,
  athleteReachCm = 0,
  athleteWeightKg = 0,
  referenceHeightCm = 0,
  referenceReachCm = 0,
  referenceWeightKg = null,
}) {
  const layout = useMemo(() => {
    const ah = Number(athleteHeightCm) || 0
    const rh = Number(referenceHeightCm) || 0
    const ar = Number(athleteReachCm) || ah
    const rr = Number(referenceReachCm) || rh
    const aw = Number(athleteWeightKg) || 0
    const rw = referenceWeightKg != null ? Number(referenceWeightKg) : null

    if (ah < 80 || rh < 80) return { ready: false }

    const maxH = Math.max(ah, rh)
    const pxPerCm = maxH > MAX_STATURE_PX ? MAX_STATURE_PX / maxH : 1
    const athletePx = ah * pxPerCm
    const refPx = rh * pxPerCm
    const athleteW = stickmanSize(athletePx).width
    const refW = stickmanSize(refPx).width

    return {
      ready: true,
      ah,
      rh,
      ar,
      rr,
      pxPerCm,
      athletePx,
      refPx,
      athleteW,
      refW,
      chartH: Math.max(athletePx, refPx) + PAD_TOP + PAD_BOTTOM,
      scaled: pxPerCm < 1,
      bulkAthlete: computeBulkScale(aw, rw ?? aw),
      spanScaleHeight: maxH,
    }
  }, [
    athleteHeightCm,
    athleteReachCm,
    athleteWeightKg,
    referenceHeightCm,
    referenceReachCm,
    referenceWeightKg,
  ])

  if (!layout.ready) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
        Укажите рост спортсмена и эталон по категории — появится наглядное сравнение.
      </p>
    )
  }

  const deltaH = layout.ah - layout.rh
  const floorY = PAD_BOTTOM
  const athleteHeadY = floorY + layout.athletePx
  const refHeadY = floorY + layout.refPx
  const gapPx = Math.abs(athleteHeadY - refHeadY)
  const lowerHead = Math.min(athleteHeadY, refHeadY)
  const higherHead = Math.max(athleteHeadY, refHeadY)
  const headsClose = gapPx > 0 && gapPx < 22
  const athleteIsTaller = layout.ah > layout.rh
  const deltaLabelBottom = higherHead + 18

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-3 dark:border-slate-600 dark:bg-slate-900 sm:px-3 sm:py-4">
      {layout.scaled ? (
        <p className="text-center text-[10px] text-slate-500 dark:text-slate-400">
          Масштаб уменьшен под экран, пропорции сохранены.
        </p>
      ) : null}

      <div
        className="relative mx-auto mt-2 w-full max-w-lg"
        style={{ height: `${layout.chartH}px` }}
        role="img"
        aria-label={`Сравнение роста: ${athleteLabel} ${Math.round(layout.ah)} см, ${referenceLabel} ${Math.round(layout.rh)} см`}
      >
        <HeightGuideLine
          bottomPx={floorY}
          label="Пол"
          lineClass="border-slate-900 dark:border-slate-100"
          labelClass="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          dash={false}
          align="left"
        />

        {gapPx >= 2 ? (
          <div
            className="pointer-events-none absolute left-[8%] right-[8%] z-[5] border-x border-dotted border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/40"
            style={{ bottom: `${lowerHead}px`, height: `${gapPx}px` }}
            aria-hidden
          />
        ) : null}

        <HeightGuideLine
          bottomPx={athleteHeadY}
          label={`${Math.round(layout.ah)} см`}
          lineClass="border-blue-600 dark:border-blue-400"
          labelClass="bg-blue-50 text-blue-800 dark:bg-blue-950/90 dark:text-blue-200"
          dash
          align="left"
          labelLift={headsClose && athleteIsTaller ? -14 : 0}
        />
        {gapPx >= 2 ? (
          <HeightGuideLine
            bottomPx={refHeadY}
            label={`${Math.round(layout.rh)} см`}
            lineClass="border-red-500 dark:border-red-400"
            labelClass="bg-red-50 text-red-800 dark:bg-red-950/90 dark:text-red-200"
            dash
            align="right"
            labelLift={headsClose && !athleteIsTaller ? -14 : 0}
          />
        ) : null}

        {gapPx >= 2 ? (
          <div
            className="pointer-events-none absolute left-1/2 z-[15] -translate-x-1/2"
            style={{ bottom: `${deltaLabelBottom}px` }}
          >
            <span className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold tabular-nums text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
              Δ рост {deltaH >= 0 ? '+' : ''}
              {deltaH.toFixed(0)} см
            </span>
          </div>
        ) : null}

        <div
          className="absolute left-0 right-0 z-20 flex items-end justify-center gap-6 sm:gap-10"
          style={{ bottom: `${floorY}px` }}
        >
          <div className="flex justify-center" style={{ width: layout.athleteW }}>
            <StickmanFigure
              staturePx={layout.athletePx}
              stroke="#2563eb"
              bulk={layout.bulkAthlete}
              reachCm={layout.ar}
              heightCm={layout.ah}
              spanScaleHeightCm={layout.spanScaleHeight}
            />
          </div>
          <div className="flex justify-center" style={{ width: layout.refW }}>
            <StickmanFigure
              staturePx={layout.refPx}
              stroke="#dc2626"
              bulk={1}
              reachCm={layout.rr}
              heightCm={layout.rh}
              spanScaleHeightCm={layout.spanScaleHeight}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-6 text-[10px] sm:text-xs">
        <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
          <span className="h-0.5 w-4 border-t-2 border-blue-600" aria-hidden />
          {athleteLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-300">
          <span className="h-0.5 w-4 border-t-2 border-red-500" aria-hidden />
          {referenceLabel}
        </span>
      </div>
    </div>
  )
}
