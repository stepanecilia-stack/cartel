import { memo, useEffect, useMemo, useState } from 'react'
import { loadNormsOnce } from '../data/normsCache.js'
import { loadLegacyTechnicalAtoms } from '../utils/ksrUtils.js'
import { migrateStudentTests } from '../utils/normsCategory.js'
import SeasonCalendarPanel from './calendar/SeasonCalendarPanel.jsx'

const noop = () => {}

/**
 * Сезон на публичной ссылке — тот же вид, что у ученика у тренера, без редактирования.
 * @param {{
 *   season?: object | null,
 *   displayName?: string,
 *   athlete?: { birthYear?: number, gender?: string, height?: number, reach?: number, weight?: number, birthDate?: string | null } | null,
 *   physicalItems?: Array<{ id?: string, hasResult?: boolean, resultValue?: number | null, resultDisplay?: string, status?: string, normalizedScore?: number | null }>,
 * }} props
 */
function ShareSeasonPanel({ season, displayName = '', athlete = null, physicalItems = [] }) {
  const [allNorms, setAllNorms] = useState([])
  const [level1Atoms, setLevel1Atoms] = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([loadNormsOnce(), loadLegacyTechnicalAtoms()])
      .then(([norms, atoms]) => {
        if (!cancelled) {
          setAllNorms(norms)
          setLevel1Atoms(Array.isArray(atoms) ? atoms : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllNorms([])
          setLevel1Atoms([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const studentRecord = useMemo(() => {
    if (!season?.studentId) return null
    const base = season.student && typeof season.student === 'object' ? season.student : {}
    const ath = athlete && typeof athlete === 'object' ? athlete : {}

    let physical =
      base.tests?.physical && typeof base.tests.physical === 'object'
        ? base.tests.physical
        : migrateStudentTests(base.tests).physical

    const hasPhysicalRows = physical && Object.keys(physical).length > 0
    if (!hasPhysicalRows && Array.isArray(physicalItems) && physicalItems.length > 0) {
      const fromItems = {}
      for (const item of physicalItems) {
        if (!item?.id || !item.hasResult || item.resultValue == null) continue
        if (!Number.isFinite(Number(item.resultValue))) continue
        fromItems[item.id] = {
          result: Number(item.resultValue),
          resultRaw: item.resultDisplay ?? undefined,
          status: item.status,
          normalizedScore: item.normalizedScore ?? undefined,
        }
      }
      if (Object.keys(fromItems).length > 0) physical = fromItems
    }

    return {
      ...base,
      id: season.studentId,
      birthYear: ath.birthYear ?? base.birthYear,
      gender: ath.gender === 'F' || base.gender === 'F' ? 'F' : 'M',
      height: Number(ath.height ?? base.height) || 0,
      reach: Number(ath.reach ?? base.reach) || 0,
      weight: Number(ath.weight ?? base.weight) || 0,
      birthDate: ath.birthDate ?? base.birthDate ?? null,
      tests: {
        physical,
        functional: {},
      },
    }
  }, [season, athlete, physicalItems])

  if (!season?.studentId || !studentRecord) {
    return <p className="text-[13px] text-[#818c99]">Попросите тренера обновить ссылку «Поделиться прогрессом».</p>
  }

  const metrics = season.metrics ?? {}

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
      allNorms={allNorms}
      level1Atoms={level1Atoms}
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
