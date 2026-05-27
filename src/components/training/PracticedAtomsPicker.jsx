import { memo, useMemo, useState } from 'react'
import AtomReinforcementStars from '../AtomReinforcementStars.jsx'
import { getAtomReinforcementTotal } from '../../utils/atomReinforcement.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   sections: { id: string, label: string, atoms: object[] }[],
 *   practicedAtomIds?: string[] | Set<string>,
 *   onTogglePracticed: (atomId: string) => void,
 *   reinforcementMap?: Record<string, { total?: number }>,
 * }} props
 */
function PracticedAtomsPicker({
  sections,
  practicedAtomIds,
  onTogglePracticed,
  reinforcementMap,
  compact = false,
}) {
  const [query, setQuery] = useState('')

  const practicedSet = useMemo(
    () =>
      practicedAtomIds instanceof Set
        ? practicedAtomIds
        : new Set(Array.isArray(practicedAtomIds) ? practicedAtomIds : []),
    [practicedAtomIds],
  )

  const allAtoms = useMemo(
    () => sections.flatMap((s) => s.atoms.map((atom) => ({ ...atom, sectionLabel: s.label }))),
    [sections],
  )

  const markedInSections = useMemo(() => {
    let n = 0
    for (const atom of allAtoms) {
      if (practicedSet.has(atom.id)) n += 1
    }
    return n
  }, [allAtoms, practicedSet])

  const q = query.trim().toLowerCase()
  const filteredSections = useMemo(() => {
    if (!q) return sections
    return sections
      .map((section) => ({
        ...section,
        atoms: section.atoms.filter((atom) => {
          const name = String(atom.name ?? '').toLowerCase()
          const num = String(atom.number ?? '')
          return name.includes(q) || num.includes(q)
        }),
      }))
      .filter((section) => section.atoms.length > 0)
  }, [sections, q])

  if (allAtoms.length === 0) {
    return (
      <p className={compact ? vk.mutedXs : `mt-2 ${vk.mutedXs}`}>
        Нет пройденных приёмов — сдвиньте прогресс кнопкой + в списке.
      </p>
    )
  }

  const body = (
      <div className={compact ? 'space-y-2' : 'space-y-2 border-t border-[#e7e8ec] px-2.5 pb-2.5 pt-2'}>
        {allAtoms.length > 10 ? (
          <label className="block">
            <span className="sr-only">Поиск приёма</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Номер или название"
              className={`${vk.input} h-8 text-[14px]`}
            />
          </label>
        ) : null}

        {filteredSections.length === 0 ? (
          <p className={vk.mutedXs}>Ничего не найдено</p>
        ) : (
          filteredSections.map((section) => (
            <div key={section.id}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">
                {section.label}
                <span className="ml-1 font-normal tabular-nums">({section.atoms.length})</span>
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${section.label}: отработка`}>
                {section.atoms.map((atom) => {
                  const practiced = practicedSet.has(atom.id)
                  return (
                    <button
                      key={atom.id}
                      type="button"
                      onClick={() => onTogglePracticed(atom.id)}
                      aria-pressed={practiced}
                      className={`inline-flex max-w-[11rem] touch-manipulation flex-col items-start gap-0.5 rounded-lg border px-1.5 py-1 text-left transition-colors sm:max-w-[12rem] ${
                        practiced
                          ? 'border-[#4bb34b] bg-[#e8f5e9] ring-1 ring-[#4bb34b]/40'
                          : 'border-[#e7e8ec] bg-white active:bg-[#f0f2f5]'
                      }`}
                    >
                      <span className="flex w-full items-center gap-1.5">
                        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#818c99]">
                          #{atom.number ?? '—'}
                        </span>
                        <span className="min-w-0 truncate text-[12px] font-medium leading-tight text-[#2c2d2e]">
                          {atom.name}
                        </span>
                      </span>
                      <AtomReinforcementStars
                        total={getAtomReinforcementTotal(reinforcementMap, atom.id)}
                        size="sm"
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {!compact ? (
          <p className={vk.mutedXs}>Тап по приёму — отработали сегодня. Повторный тап снимает отметку.</p>
        ) : null}
      </div>
  )

  if (compact) {
    return (
      <div>
        <p className={`mb-2 ${vk.mutedXs}`}>
          {markedInSections > 0
            ? `Отмечено сегодня: ${markedInSections}`
            : `${allAtoms.length} приёмов · тап для отметки`}
        </p>
        {body}
      </div>
    )
  }

  return (
    <details className="mt-2 rounded-[10px] border border-[#e7e8ec] bg-[#fafbfc] open:bg-white" open>
      <summary className="cursor-pointer list-none px-2.5 py-2 text-[13px] font-semibold text-[#2c2d2e] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span>Отработка · пройденный материал</span>
          <span className="rounded-full bg-[#ecf3fc] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#2d81e0]">
            {markedInSections > 0 ? `${markedInSections} сегодня` : `${allAtoms.length} доступно`}
          </span>
        </span>
      </summary>
      {body}
    </details>
  )
}

export default memo(PracticedAtomsPicker)

/**
 * Секции пройденного материала для отметки отработки (макс. сессия и сохранённый прогресс).
 */
export function buildPassedAtomsPracticeSections({
  orderedL1,
  orderedL2,
  orderedL3,
  progress1,
  progress2,
  progress3,
  baseline1,
  baseline2,
  baseline3,
}) {
  /** @type {{ id: string, label: string, atoms: object[] }[]} */
  const sections = []
  const p1 = Math.max(progress1, baseline1)
  if (p1 > 0 && orderedL1?.length) {
    sections.push({
      id: 'l1',
      label: 'Программа',
      atoms: orderedL1.slice(0, Math.min(p1, orderedL1.length)),
    })
  }
  const p2 = Math.max(progress2, baseline2)
  if (p2 > 0 && orderedL2?.length) {
    sections.push({
      id: 'l2',
      label: 'Ур. 2',
      atoms: orderedL2.slice(0, Math.min(p2, orderedL2.length)),
    })
  }
  const p3 = Math.max(progress3, baseline3)
  if (p3 > 0 && orderedL3?.length) {
    sections.push({
      id: 'l3',
      label: 'Комбо',
      atoms: orderedL3.slice(0, Math.min(p3, orderedL3.length)),
    })
  }
  return sections
}
