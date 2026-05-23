/** @typedef {'ofp' | 'sfp' | 'sttm' | 'base' | 'recovery'} SeasonBlockPhase */
/** @typedef {'med' | 'norm' | 'sparring' | 'match' | 'other'} SeasonCheckpointKind */

/** @type {Record<SeasonBlockPhase, { label: string, short: string, chip: string, bar: string }>} */
export const SEASON_BLOCK_PHASE_STYLES = {
  ofp: {
    label: 'ОФП',
    short: 'О',
    chip: 'bg-emerald-50 border-emerald-400 text-emerald-900',
    bar: 'bg-emerald-500',
  },
  sfp: {
    label: 'СФП',
    short: 'С',
    chip: 'bg-sky-50 border-sky-400 text-sky-900',
    bar: 'bg-sky-500',
  },
  sttm: {
    label: 'СТТМ',
    short: 'Т',
    chip: 'bg-violet-50 border-violet-400 text-violet-900',
    bar: 'bg-violet-500',
  },
  base: {
    label: 'База',
    short: 'Б',
    chip: 'bg-amber-50 border-amber-400 text-amber-900',
    bar: 'bg-amber-500',
  },
  recovery: {
    label: 'Восстановление',
    short: 'В',
    chip: 'bg-slate-100 border-slate-300 text-slate-700',
    bar: 'bg-slate-400',
  },
}

/** @type {Record<SeasonCheckpointKind, { label: string, short: string, chip: string, bar: string }>} */
export const SEASON_CHECKPOINT_KIND_STYLES = {
  med: {
    label: 'Медосмотр',
    short: 'М',
    chip: 'bg-rose-50 border-rose-300 text-rose-900',
    bar: 'bg-rose-500',
  },
  norm: {
    label: 'Норматив',
    short: 'Н',
    chip: 'bg-orange-50 border-orange-300 text-orange-900',
    bar: 'bg-orange-500',
  },
  sparring: {
    label: 'Спарринг',
    short: 'С',
    chip: 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-900',
    bar: 'bg-fuchsia-500',
  },
  match: {
    label: 'Матч',
    short: 'Мт',
    chip: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    bar: 'bg-indigo-500',
  },
  other: {
    label: 'Контроль',
    short: 'К',
    chip: 'bg-slate-50 border-slate-300 text-slate-800',
    bar: 'bg-slate-500',
  },
}

/**
 * @param {{ planKind?: string, blockPhase?: SeasonBlockPhase, checkpointKind?: SeasonCheckpointKind } | null | undefined} item
 */
export function getSeasonPlanStyle(item) {
  if (!item?.planKind) return null
  if (item.planKind === 'block') {
    const phase = item.blockPhase && SEASON_BLOCK_PHASE_STYLES[item.blockPhase]
    return phase ?? SEASON_BLOCK_PHASE_STYLES.base
  }
  if (item.planKind === 'checkpoint') {
    const kind = item.checkpointKind && SEASON_CHECKPOINT_KIND_STYLES[item.checkpointKind]
    return kind ?? SEASON_CHECKPOINT_KIND_STYLES.other
  }
  return null
}
