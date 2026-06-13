import { memo } from 'react'
import {
  FEDERATION_TOURNAMENT_HINTS,
  FEDERATION_TOURNAMENT_HINTS_NOTE,
} from '../../data/federationTournamentHints.js'
import { vk } from '../../utils/vkUi.js'

function FederationTournamentHints() {
  return (
    <section className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-3 py-3">
      <h3 className="text-[13px] font-semibold text-[#2c2d2e]">
        Когда обычно проходят календарные турниры
      </h3>
      <p className={`${vk.mutedXs} mt-1`}>{FEDERATION_TOURNAMENT_HINTS_NOTE}</p>

      <div className="mt-3 space-y-3">
        {FEDERATION_TOURNAMENT_HINTS.map((row) => (
          <div key={row.cohort}>
            <p className="text-[12px] font-semibold text-[#2c2d2e]">{row.cohort}</p>
            <ul className="mt-1 space-y-0.5">
              {row.ladder.map((step) => (
                <li key={`${row.cohort}-${step.stage}`} className="text-[12px] text-[#818c99]">
                  <span className="font-medium text-[#2c2d2e]">{step.stage}</span>
                  <span className="text-[#aeb7c2]"> · </span>
                  {step.when}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export default memo(FederationTournamentHints)
