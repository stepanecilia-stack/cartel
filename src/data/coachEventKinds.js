/** @typedef {'practice' | 'competition'} CoachEventKind */

/** @type {Record<CoachEventKind, { label: string, short: string, chip: string, bar: string }>} */
export const COACH_EVENT_KIND_STYLES = {
  practice: {
    label: 'Боевая практика',
    short: 'бп',
    chip: 'bg-teal-100 border-teal-500 text-teal-950',
    bar: 'bg-teal-500',
  },
  competition: {
    label: 'Соревнования',
    short: 'сор',
    chip: 'bg-orange-100 border-orange-500 text-orange-950',
    bar: 'bg-orange-500',
  },
}

/** Подсветка выбираемого периода (до сохранения). */
export const CALENDAR_RANGE_PICK_STYLE = {
  chip: 'bg-sky-100 border-sky-400 border-dashed text-sky-950',
  bar: 'bg-sky-400',
}

/** Типовой календарь Минспорта — единый нейтральный стиль. */
export const ORIENTIR_CALENDAR_STYLE = {
  label: 'Ориентир',
  short: '~',
  chip: 'bg-slate-50 border-slate-200 border-dashed text-slate-500',
  bar: 'bg-slate-300/70',
}

/**
 * @param {{ eventKind?: CoachEventKind, track?: string, dateStatus?: string } | null | undefined} item
 */
export function getCalendarItemStyle(item) {
  if (item?.dateStatus === 'orientir') {
    return ORIENTIR_CALENDAR_STYLE
  }
  if (item?.eventKind && COACH_EVENT_KIND_STYLES[item.eventKind]) {
    return COACH_EVENT_KIND_STYLES[item.eventKind]
  }
  if (item?.track === 'match') return COACH_EVENT_KIND_STYLES.practice
  if (item?.track === 'federation') return COACH_EVENT_KIND_STYLES.competition
  return {
    label: 'Событие',
    short: '·',
    chip: 'bg-slate-100 border-slate-300 text-slate-800',
    bar: 'bg-slate-400',
  }
}
