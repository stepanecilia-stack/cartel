import {
  buildJuniorDaySlots,
  buildJuniorPriorities,
  formatJuniorPrepDayLabel,
  getJuniorWorkModes,
  juniorAgeBandLabel,
  resolveJuniorAgeBand,
  resolveJuniorPrepPhase,
} from '../data/juniorPrepTracks.js'
import { isPrepTransitionDay } from '../data/cartelPrepMethodology.js'
import { daysUntilCompetition } from './competitionDate.js'
import { localDateISO } from './prepCalendarGrid.js'

/**
 * @param {{ competitionDate?: string, competitionTitle?: string, ageInt?: number | null }} ctx
 * @returns {object | null}
 */
export function buildCompetitionPrepPlan(ctx) {
  const dateISO = ctx.competitionDate
  const daysUntil = daysUntilCompetition(dateISO)
  if (daysUntil == null) return null

  const ageInt = ctx.ageInt ?? null
  const ageBand = resolveJuniorAgeBand(ageInt)

  if (!ageBand) {
    return {
      competitionDate: dateISO,
      competitionTitle: ctx.competitionTitle ?? '',
      daysUntil,
      unsupported: true,
      ageInt,
      message:
        ageInt != null && ageInt < 13
          ? 'Подготовка к старту рассчитана на 13–16 лет.'
          : ageInt != null && ageInt > 16
            ? 'Для 17+ лет отдельный цикл пока не подключён.'
            : 'Укажите год рождения на вкладке «Карта».',
    }
  }

  const phase = resolveJuniorPrepPhase(daysUntil)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = daysUntil < 0 ? 0 : daysUntil + 1
  const calendarDays = []

  for (let i = 0; i < horizon; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const iso = localDateISO(d)
    const daysOnDay = Math.max(0, daysUntil - i)
    const dayPhase = resolveJuniorPrepPhase(daysOnDay)
    const slots = buildJuniorDaySlots(ageBand, dayPhase.id, i, daysOnDay)
    const isTransitionDay =
      dayPhase.id !== 'fight' &&
      dayPhase.id !== 'preFight' &&
      isPrepTransitionDay(daysOnDay, i)

    calendarDays.push({
      dateISO: iso,
      dayLabel: formatJuniorPrepDayLabel(d),
      isToday: i === 0,
      isFightDay: iso === dateISO,
      isTransitionDay,
      daysUntilOnDay: daysOnDay,
      phase: dayPhase,
      slots,
    })
  }

  return {
    unsupported: false,
    ageBand,
    ageBandLabel: juniorAgeBandLabel(ageBand),
    competitionDate: dateISO,
    competitionTitle: ctx.competitionTitle ?? '',
    daysUntil,
    phase,
    workModes: getJuniorWorkModes(ageBand, phase.id),
    calendarDays,
    todayPlan: calendarDays[0] ?? null,
    priorities: buildJuniorPriorities(ageBand, phase),
  }
}
