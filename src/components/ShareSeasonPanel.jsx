import { memo } from 'react'
import SeasonCalendarPanel from './calendar/SeasonCalendarPanel.jsx'

const noop = () => {}

/**
 * Сезон на публичной ссылке — тот же вид, что у ученика у тренера, без редактирования.
 * @param {{ season?: object | null, displayName?: string }} props
 */
function ShareSeasonPanel({ season, displayName = '' }) {
  if (!season?.studentId) {
    return <p className="text-[13px] text-[#818c99]">Попросите тренера обновить ссылку «Поделиться прогрессом».</p>
  }

  const metrics = season.metrics ?? {}
  const studentRecord = {
    ...(season.student ?? {}),
    id: season.studentId,
  }

  return (
    <SeasonCalendarPanel
      shareReadOnly
      canSave={false}
      title={displayName ? `Сезон · ${displayName}` : 'Сезон'}
      calendarItems={season.calendarItems ?? []}
      coachEvents={[]}
      students={[]}
      contextStudentId={season.studentId}
      seasonBlocks={season.seasonBlocks ?? []}
      seasonCheckpoints={season.seasonCheckpoints ?? []}
      ageInt={season.ageInt}
      student={studentRecord}
      kd={metrics.kd ?? 0.25}
      techniquePercent={metrics.techniquePercent ?? 0}
      atomsAtSkill={metrics.atomsAtSkill ?? 0}
      totalAtoms={metrics.totalAtoms ?? 0}
      effectiveKsr={metrics.effectiveKsr ?? 0}
      onCreateEvent={noop}
      onUpdateEvent={noop}
      onRemoveFromEvent={noop}
      onDeleteEvent={noop}
    />
  )
}

export default memo(ShareSeasonPanel)
