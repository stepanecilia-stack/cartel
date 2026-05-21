const WEEK_HEADERS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** @param {Date} d */
export function localDateISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** @param {string} iso */
export function monthYearLabelRu(iso) {
  const d = new Date(iso + 'T12:00:00')
  const months = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ]
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Сетка календаря: недели пн–вс, padding до полных недель.
 * @param {Array<{ dateISO: string }>} calendarDays — подряд от сегодня до старта
 */
export function buildPrepCalendarWeeks(calendarDays) {
  if (!calendarDays.length) return { weekHeaders: WEEK_HEADERS, weeks: [], monthSpans: [] }

  const byIso = new Map(calendarDays.map((d) => [d.dateISO, d]))
  const first = new Date(calendarDays[0].dateISO + 'T12:00:00')
  const last = new Date(calendarDays[calendarDays.length - 1].dateISO + 'T12:00:00')

  const gridStart = new Date(first)
  const dow = gridStart.getDay()
  const mondayBack = dow === 0 ? 6 : dow - 1
  gridStart.setDate(gridStart.getDate() - mondayBack)

  const gridEnd = new Date(last)
  const dowEnd = gridEnd.getDay()
  const sundayFwd = dowEnd === 0 ? 0 : 7 - dowEnd
  gridEnd.setDate(gridEnd.getDate() + sundayFwd)

  const weeks = []
  const monthSpans = []
  let cursor = new Date(gridStart)
  let weekIndex = 0

  while (cursor <= gridEnd) {
    const week = []
    for (let col = 0; col < 7; col++) {
      const iso = localDateISO(cursor)
      const inRange = cursor >= first && cursor <= last
      const day = byIso.get(iso)
      week.push(
        inRange && day
          ? { kind: 'day', day }
          : { kind: 'pad', dateISO: iso, dayNum: cursor.getDate() },
      )
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)

    const firstInWeek = week.find((c) => c.kind === 'day')
    if (firstInWeek) {
      const label = monthYearLabelRu(firstInWeek.day.dateISO)
      const prev = monthSpans[monthSpans.length - 1]
      if (!prev || prev.label !== label) {
        monthSpans.push({ weekIndex, label })
      }
    }
    weekIndex++
  }

  return { weekHeaders: WEEK_HEADERS, weeks, monthSpans }
}
