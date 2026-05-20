/** Фон строки норматива по статусу (компактный VK-стиль). */
export function normCardToneByStatus(status) {
  if (status === 'gold') return 'bg-[#fffbeb]'
  if (status === 'silver') return 'bg-[#f5f6f8]'
  if (status === 'bronze') return 'bg-[#fff7ed]'
  if (status === 'red') return 'bg-[#fff0f0]'
  return 'bg-white'
}

export function normScoreToneByStatus(status) {
  if (status === 'gold') return 'text-amber-800'
  if (status === 'silver') return 'text-[#5c6b7a]'
  if (status === 'bronze') return 'text-orange-800'
  if (status === 'red') return 'text-[#e64646]'
  return 'text-[#2c2d2e]'
}
