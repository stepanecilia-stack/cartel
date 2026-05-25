/** Подпись тренера для списков админки. */
export function displayCoachLabel(coach) {
  if (!coach || typeof coach !== 'object') return '—'
  const name = [coach.firstName, coach.lastName].filter(Boolean).join(' ').trim()
  if (name) return name
  if (typeof coach.email === 'string' && coach.email.trim()) return coach.email.trim()
  if (typeof coach.id === 'string' && coach.id) return coach.id.slice(0, 8) + '…'
  return '—'
}
