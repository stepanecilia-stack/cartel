export function normCardToneByStatus(status) {
  if (status === 'gold')
    return [
      'border-amber-500',
      'bg-gradient-to-br from-yellow-100 via-amber-200/95 to-yellow-300/75',
      'shadow-[0_10px_28px_-8px_rgba(234,179,8,0.55),inset_0_1px_0_rgba(255,255,255,0.75)]',
      'ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white',
    ].join(' ')
  if (status === 'silver')
    return [
      'border-slate-500',
      'bg-gradient-to-br from-slate-300/80 via-slate-200 to-sky-100',
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.65),0_6px_18px_-6px_rgba(51,65,85,0.22)]',
    ].join(' ')
  if (status === 'bronze')
    return [
      'border-orange-600',
      'bg-gradient-to-br from-orange-200/90 via-orange-50 to-amber-900/20',
      'shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45),0_4px_14px_-6px_rgba(234,88,12,0.2)]',
    ].join(' ')
  if (status === 'red')
    return 'border-red-400 bg-red-50 shadow-[0_4px_14px_-6px_rgba(239,68,68,0.2)]'
  return 'border-slate-200 bg-white shadow-sm'
}

export function normScoreToneByStatus(status) {
  if (status === 'gold') return 'text-amber-900'
  if (status === 'silver') return 'text-slate-800'
  if (status === 'bronze') return 'text-orange-900'
  if (status === 'red') return 'text-red-800'
  return 'text-slate-700'
}
