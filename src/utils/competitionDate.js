/** @param {unknown} val */
export function competitionDateToInputString(val) {
  if (val == null || val === '') return ''
  const s = String(val).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return ''
  return s
}

/** @param {unknown} val */
export function normalizeCompetitionDateISO(val) {
  const s = competitionDateToInputString(val)
  if (!s) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(s + 'T12:00:00')
  if (target.getTime() < today.getTime() - 86400000 * 365) return null
  return s
}

/** @param {string | null | undefined} dateISO — YYYY-MM-DD */
export function daysUntilCompetition(dateISO) {
  const s = competitionDateToInputString(dateISO)
  if (!s) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(s + 'T12:00:00')
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
