import { countMotorQualitySquares } from './leaderboardMetrics.js'
import { computeAthleteAgeYears, studentAthleteShape } from './studentModel.js'
import {
  getSensitiveMotorQualities,
  orderSensitiveQualitiesForBoxing,
  SENSITIVE_TABLE_MAX_AGE,
  SENSITIVE_TABLE_MIN_AGE,
} from './sensitivePeriods.js'
import { buildSensitivePeriodTimer } from './sensitivePeriodTimer.js'

/** @param {'missed' | 'comfort' | 'warn' | 'critical'} tone */
function urgencyLabelRu(tone) {
  if (tone === 'critical') return 'срочно'
  if (tone === 'warn') return 'скоро закроется'
  if (tone === 'comfort') return 'в окне'
  return 'пропущено'
}

/** @param {'active' | 'missed' | 'future'} status */
function statusLabelRu(status) {
  if (status === 'active') return 'сейчас'
  if (status === 'future') return 'впереди'
  return 'закрыто'
}

function formatPeriodDates(start, end) {
  const fmt = (d) =>
    d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${fmt(start)}–${fmt(end)}`
}

/**
 * @param {object} student
 */
export function buildStudentSensitivePeriodSnapshot(student) {
  const shape = studentAthleteShape(student)
  const timer = buildSensitivePeriodTimer({
    birthYear: shape.birthYear,
    birthDate: shape.birthDate ?? student?.birthDate,
  })
  const ageYears = computeAthleteAgeYears(shape.birthYear)
  const ageTable = getSensitiveMotorQualities(ageYears)
  const motorLog = countMotorQualitySquares(student?.motorQualityWorkLog)

  if (!timer.ready) {
    return {
      ready: false,
      reason: timer.reason ?? 'no_birth_date',
      ageInt: ageTable.ageInt,
      motorLog,
    }
  }

  const items = timer.items ?? []
  const active = items.filter((i) => i.status === 'active')
  const future = items.filter((i) => i.status === 'future')
  const missed = items.filter((i) => i.status === 'missed')
  const futureSoon = future.filter((i) => i.urgencyTone === 'critical' || i.urgencyTone === 'warn')
  const activeOrdered = [...active].sort((a, b) => {
    const order = { critical: 0, warn: 1, comfort: 2, missed: 3 }
    return (order[a.urgencyTone] ?? 9) - (order[b.urgencyTone] ?? 9)
  })

  return {
    ready: true,
    ageLabel: timer.ageLabel,
    ageInt: ageTable.ageInt,
    active,
    activeOrdered,
    futureSoon,
    missed,
    ageTable,
    motorLog,
  }
}

/**
 * @param {import('./sensitivePeriodTimer.js').SensitivePeriodTimerItem} item
 */
function formatTimerItemLine(item, detailed) {
  const base = `«${item.title}» — ${statusLabelRu(item.status)}, ${urgencyLabelRu(item.urgencyTone)}`
  if (!detailed) {
    if (item.status === 'active') return `${base}, ${item.counterLabel.toLowerCase()}`
    if (item.status === 'future' && item.urgencyTone !== 'comfort') {
      return `${base}, ${item.counterLabel.toLowerCase()}`
    }
    return null
  }
  return `${base}, окно ${formatPeriodDates(item.startDate, item.endDate)}, ${item.counterLabel}`
}

/**
 * @param {object} student
 * @param {boolean} [detailed]
 */
export function formatStudentSensitivePeriodsBrief(student, detailed = false) {
  const snap = buildStudentSensitivePeriodSnapshot(student)

  if (!snap.ready) {
    if (snap.reason === 'no_birth_date') {
      return 'сенситивные периоды: год рождения не указан — окна не рассчитать'
    }
    return 'сенситивные периоды: нет даты рождения для расчёта'
  }

  const lines = []
  const agePart = snap.ageLabel ? `возраст ${snap.ageLabel}` : `возраст ${snap.ageInt ?? '—'} лет`
  lines.push(`сенситивные периоды (${agePart})`)

  if (snap.activeOrdered.length) {
    const activeBits = snap.activeOrdered
      .map((item) => formatTimerItemLine(item, detailed))
      .filter(Boolean)
    if (activeBits.length) {
      lines.push(
        detailed
          ? `  активные окна (${snap.activeOrdered.length}): ${activeBits.join('; ')}`
          : `активные (${snap.activeOrdered.length}): ${activeBits.join('; ')}`,
      )
    }
  } else {
    lines.push(
      detailed
        ? '  активных окон сейчас нет (по справочнику Cartel)'
        : 'активных окон сейчас нет',
    )
  }

  const tableActive = orderSensitiveQualitiesForBoxing(snap.ageTable.qualities ?? [])
  if (tableActive.length) {
    const tableLine = `по возрасту в таблице качеств (${snap.ageInt} лет): ${tableActive.join(', ')}`
    lines.push(detailed ? `  ${tableLine}` : tableLine)
  } else if (snap.ageTable.reason === 'below_table') {
    lines.push(
      detailed
        ? `  возраст ниже ${SENSITIVE_TABLE_MIN_AGE} лет — таблица сенситивных качеств не применяется`
        : `возраст ниже ${SENSITIVE_TABLE_MIN_AGE} лет`,
    )
  } else if (snap.ageTable.reason === 'above_table') {
    lines.push(
      detailed
        ? `  возраст старше ${SENSITIVE_TABLE_MAX_AGE} лет — таблица сенситивных качеств не применяется`
        : `возраст старше ${SENSITIVE_TABLE_MAX_AGE} лет`,
    )
  }

  if (detailed && snap.futureSoon.length) {
    const futureBits = snap.futureSoon
      .slice(0, 5)
      .map((item) => formatTimerItemLine(item, true))
      .filter(Boolean)
    if (futureBits.length) {
      lines.push(`  скоро откроются: ${futureBits.join('; ')}`)
    }
  }

  if (detailed && snap.missed.length) {
    const recentMissed = [...snap.missed]
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
      .slice(0, 4)
    const missedBits = recentMissed.map((item) => formatTimerItemLine(item, true)).filter(Boolean)
    if (missedBits.length) {
      lines.push(`  недавно закрытые окна: ${missedBits.join('; ')}`)
    }
  }

  const { total, sensitive, outside } = snap.motorLog
  if (total > 0) {
    lines.push(
      detailed
        ? `  журнал моторных качеств: отметок ${total} (в сенситивном окне: ${sensitive}, вне окна: ${outside})`
        : `журнал моторных качеств: ${total} отметок (в сенситиве: ${sensitive})`,
    )
  }

  return lines.join(detailed ? '\n' : '; ')
}
