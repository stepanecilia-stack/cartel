import { normalizeTechnicalDominanceKey, TECH_DOMINANCE_OPTIONS } from '../utils/ksrUtils'

function levelDotClass(levelKey) {
  const k = normalizeTechnicalDominanceKey(levelKey)
  if (k === 'NOT_LEARNED')
    return 'border border-slate-500 bg-slate-900 shadow-sm dark:border-slate-500 dark:bg-slate-800'
  if (k === 'KNOWLEDGE') return 'border border-emerald-300/80 bg-emerald-200 dark:border-emerald-600/60 dark:bg-emerald-400/90'
  if (k === 'MOTOR_SKILL_LEVEL_1') return 'border border-emerald-600 bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-400'
  if (k === 'MOTOR_SKILL_LEVEL_2') return 'border border-emerald-900/40 bg-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-600'
  if (k === 'AUTOMATED')
    return 'border border-emerald-900/50 bg-emerald-700 ring-1 ring-emerald-500/50 dark:border-emerald-300/40 dark:bg-emerald-600'
  return 'border border-slate-400 bg-slate-200 dark:border-slate-500 dark:bg-slate-600'
}

function levelLabel(levelKey) {
  const k = normalizeTechnicalDominanceKey(levelKey)
  const row = TECH_DOMINANCE_OPTIONS.find((o) => o.key === k)
  return row?.label ?? '—'
}

function TechnicalLevelDot({ levelKey, size = 'md', showCheck }) {
  const k = normalizeTechnicalDominanceKey(levelKey)
  const sm = size === 'sm'
  const circle = `${sm ? 'h-3 w-3' : 'h-4 w-4'} shrink-0 rounded-full ${levelDotClass(levelKey)}`
  if (k === 'AUTOMATED' && showCheck) {
    return (
      <span className="relative inline-flex shrink-0">
        <span className={circle} aria-hidden />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className={`${sm ? 'h-2 w-2' : 'h-2.5 w-2.5'} text-white`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        </span>
      </span>
    )
  }
  return <span className={circle} aria-hidden />
}

function truncateLabel(name, max = 42) {
  const s = String(name ?? '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/**
 * Компактная строка «текущий атом + уровень» и раскрываемая цепочка из 5 узлов (дашборд).
 */
export default function DashboardTechnicalStrip({ snapshot }) {
  if (!snapshot || snapshot.empty) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
        Программа техники не загружена или пуста.
      </div>
    )
  }

  const { focus, window, data, pairWorkEligible, pairWorkUmenieCount, pairWorkRequired } = snapshot
  const atom = focus?.atom
  const num = atom?.number != null && atom.number !== '' ? `#${atom.number}` : ''
  const fullName = String(atom?.name ?? '—').trim()
  const line = [num, truncateLabel(fullName, 38)].filter(Boolean).join(' ')
  const levelKey = focus?.levelKey ?? 'NOT_LEARNED'
  const roleHint =
    focus?.role === 'next_locked'
      ? 'Следующий по программе (ожидает предыдущий элемент)'
      : focus?.role === 'trail'
        ? 'Доработка уровня по программе'
        : focus?.role === 'all_done'
          ? 'Открытые элементы на автоматизме'
          : null

  const slots = window?.slots ?? []

  return (
    <div className="mt-3 space-y-2">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Техника · фокус</p>
          <p className="mt-0.5 truncate text-sm font-medium leading-snug text-slate-900 dark:text-slate-100" title={fullName}>
            {line || '—'}
          </p>
          {roleHint ? <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{roleHint}</p> : null}
          <p
            className={`mt-1 text-[11px] font-medium leading-snug ${
              pairWorkEligible ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Допуск к парам: {pairWorkEligible ? 'есть' : 'нет'} (первые {pairWorkRequired ?? 8}: {pairWorkUmenieCount ?? 0}/{pairWorkRequired ?? 8} на «Умение»+)
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <TechnicalLevelDot levelKey={levelKey} size="md" showCheck />
          <span className="max-w-[5.5rem] text-right text-[10px] leading-tight text-slate-600 dark:text-slate-300">
            {levelLabel(levelKey)}
          </span>
        </div>
      </div>

      <details className="group rounded-lg border border-slate-200 bg-slate-50/90 dark:border-slate-600 dark:bg-slate-800/60">
        <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1">
            Цепочка программы (5)
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-180" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div className="border-t border-slate-200 px-1 pb-3 pt-3 dark:border-slate-600 sm:px-2">
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {slots.map((slot, i) => (
              <div key={slot.kind === 'atom' && slot.atom?.id ? slot.atom.id : `pad-${i}`} className="flex min-w-0 flex-col items-center border-l border-slate-200 pl-1 first:border-l-0 first:pl-0 dark:border-slate-600 sm:pl-2">
                <div className="flex w-full min-w-0 flex-col items-center px-0.5">
                  {slot.kind !== 'atom' || !slot.atom ? (
                    <>
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/80 dark:border-slate-500 dark:bg-slate-900/80"
                        aria-hidden
                      />
                      <span className="mt-1 block min-h-[2.25rem] w-full text-center text-[9px] leading-tight text-slate-400">—</span>
                    </>
                  ) : (
                    <>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          slot.isCurrent ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-900' : ''
                        }`}
                      >
                        <TechnicalLevelDot levelKey={normalizeTechnicalDominanceKey(data[slot.atom.id]?.level)} showCheck />
                      </div>
                      <p
                        className={`mt-1 line-clamp-3 min-h-[2.25rem] w-full text-center text-[9px] leading-tight ${
                          slot.isCurrent ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'
                        }`}
                        title={`${slot.atom.number != null ? `#${slot.atom.number} ` : ''}${slot.atom.name ?? ''}`}
                      >
                        {slot.atom.number != null ? <span className="tabular-nums text-slate-500">#{slot.atom.number} </span> : null}
                        {truncateLabel(slot.atom.name, 22)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            Цвет узла — уровень освоения элемента. Обводка — текущий фокус по программе.
          </p>
        </div>
      </details>
    </div>
  )
}
