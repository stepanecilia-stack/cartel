import { normalizeTechnicalDominanceKey } from '../utils/ksrUtils'

export const NORM_MEDAL_CHIP = {
  gold: {
    emoji: '🥇',
    label: 'Золото',
    shell:
      'border-amber-200/90 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/90 text-amber-950 shadow-sm ring-1 ring-amber-200/50',
    disc: 'bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-amber-100/80',
  },
  silver: {
    emoji: '🥈',
    label: 'Серебро',
    shell:
      'border-slate-300/80 bg-gradient-to-br from-slate-50 via-slate-100/95 to-slate-50 text-slate-900 shadow-sm ring-1 ring-slate-200/60',
    disc: 'bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-slate-200/70',
  },
  bronze: {
    emoji: '🥉',
    label: 'Бронза',
    shell:
      'border-orange-200/90 bg-gradient-to-br from-orange-50 via-amber-50/80 to-orange-100/70 text-orange-950 shadow-sm ring-1 ring-orange-200/45',
    disc: 'bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-orange-100/80',
  },
  red: {
    emoji: null,
    label: 'Зона роста',
    shell:
      'border-red-200/90 bg-gradient-to-br from-red-50 to-rose-50/90 text-red-950 shadow-sm ring-1 ring-red-200/50',
    disc: 'bg-white/95 ring-1 ring-red-100/80',
  },
}

export function NormGoldGoalIcon() {
  const g = NORM_MEDAL_CHIP.gold
  return (
    <span
      className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-amber-200/90 ${g.disc} text-[17px] leading-none shadow-sm`}
      aria-hidden
    >
      <span className="translate-y-px drop-shadow-sm">🥇</span>
    </span>
  )
}

export function NormMedalChip({ status, size = 'md' }) {
  const key = status === 'gold' || status === 'silver' || status === 'bronze' || status === 'red' ? status : null
  if (!key) {
    return <span className="text-xs font-medium text-slate-500">—</span>
  }
  const cfg = NORM_MEDAL_CHIP[key]
  const compact = size === 'sm'
  const shellPad = compact ? 'gap-1 px-2 py-0.5' : 'gap-1.5 px-2.5 py-1'
  const discSize = compact ? 'h-6 w-6 min-h-6 min-w-6' : 'h-7 w-7 min-h-7 min-w-7'
  const emojiClass = compact ? 'text-[15px] leading-none' : 'text-lg leading-none'
  const labelClass = compact ? 'text-[11px] font-semibold tracking-tight' : 'text-xs font-semibold tracking-tight'

  return (
    <span className={`inline-flex items-center rounded-full border ${shellPad} ${cfg.shell}`} title={cfg.label}>
      <span
        className={`inline-flex ${discSize} flex-shrink-0 items-center justify-center rounded-full ${cfg.disc} ${emojiClass}`}
        aria-hidden
      >
        {cfg.emoji ? (
          <span className="translate-y-[0.5px] drop-shadow-sm">{cfg.emoji}</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-red-500`}
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7 4.5h2v5H7v-5Zm0 6.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" />
          </svg>
        )}
      </span>
      <span className={labelClass}>{cfg.label}</span>
    </span>
  )
}

export function AutomationLevelBadge() {
  return (
    <span
      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-emerald-700 bg-emerald-500 text-white shadow-sm"
      title="Автоматизм"
      aria-label="Уровень автоматизма"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

export function TechnicalLevelIndicators({ level }) {
  const k = normalizeTechnicalDominanceKey(level)
  if (k === 'NOT_LEARNED') {
    return <span className="text-[11px] font-medium tabular-nums text-slate-400">—</span>
  }
  if (k === 'KNOWLEDGE') return <NormMedalChip status="bronze" size="sm" />
  if (k === 'MOTOR_SKILL_LEVEL_1') return <NormMedalChip status="silver" size="sm" />
  if (k === 'MOTOR_SKILL_LEVEL_2') return <NormMedalChip status="gold" size="sm" />
  if (k === 'AUTOMATED') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <NormMedalChip status="gold" size="sm" />
        <AutomationLevelBadge />
      </span>
    )
  }
  return null
}
