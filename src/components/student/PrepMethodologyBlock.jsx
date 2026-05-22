import { memo, useMemo } from 'react'
import {
  CARTEL_PREP_AUTHORS,
  CARTEL_PREP_METHODOLOGY,
  CARTEL_PREP_PHASE_MAP,
} from '../../data/cartelPrepMethodology.js'
import { JUNIOR_PREP_PHASE_GUIDE, JUNIOR_PREP_PHASE_STYLES } from '../../data/juniorPrepTracks.js'
import { GlossaryAbbr } from '../GlossaryText.jsx'
import GlossaryText from '../GlossaryText.jsx'
import PrepPhaseTasks from './PrepPhaseTasks.jsx'

/**
 * @param {{ activePhaseId?: string }} props
 */
function PrepMethodologyBlock({ activePhaseId }) {
  const tasksById = useMemo(
    () => Object.fromEntries(JUNIOR_PREP_PHASE_GUIDE.map((g) => [g.id, g.tasks])),
    [],
  )

  return (
    <div className="space-y-2">
      <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2">
        <p className="text-[12px] font-semibold text-[#2c2d2e]">{CARTEL_PREP_METHODOLOGY.title}</p>
        <p className="mt-0.5 text-[11px] text-[#818c99]">{CARTEL_PREP_METHODOLOGY.subtitle}</p>
        <p className="mt-1 text-[11px]">
          <span className="text-[#818c99]">Методика </span>
          <span className="font-medium text-[#2c2d2e]">{CARTEL_PREP_AUTHORS}</span>
        </p>
      </div>

      <div className="rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">
          Этапы · задача → средство
          <span className="ml-1 font-normal normal-case text-[#aeb7c2]">
            (наведите на <GlossaryAbbr>ОФП</GlossaryAbbr>, <GlossaryAbbr>СФП</GlossaryAbbr>,{' '}
            <GlossaryAbbr>СТТМ</GlossaryAbbr>…)
          </span>
        </p>
        <div className="mt-2 divide-y divide-[#e7e8ec]">
          {CARTEL_PREP_PHASE_MAP.map((row) => {
            const active = row.cartelId === activePhaseId
            const s = JUNIOR_PREP_PHASE_STYLES[row.cartelId] ?? JUNIOR_PREP_PHASE_STYLES.none
            const tasks = tasksById[row.cartelId] ?? []
            return (
              <div
                key={row.cartelId}
                className={`py-1.5 first:pt-0 last:pb-0 ${active ? `rounded-lg border px-2 -mx-0.5 my-1 ${s.chip}` : ''}`}
              >
                <p className="text-[12px] font-semibold text-[#2c2d2e]">
                  <GlossaryAbbr>{row.cartelLabel}</GlossaryAbbr>
                  <span className="ml-1 font-normal text-[#818c99]">{row.days} дн.</span>
                </p>
                <PrepPhaseTasks tasks={tasks} compact />
                <p className="mt-1 text-[10px] text-[#818c99]">
                  <GlossaryText text={`${row.almanac} · ${row.planRef}`} />
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default memo(PrepMethodologyBlock)
