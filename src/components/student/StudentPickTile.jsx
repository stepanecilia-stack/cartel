/** Карточка выбора ученика (сетка на групповых экранах). */

export function splitDisplayName(displayName) {
  const parts = String(displayName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length <= 1) return { primary: displayName || '—', secondary: '' }
  return { primary: parts[0], secondary: parts.slice(1).join(' ') }
}

/**
 * @param {{
 *   student: { displayName: string, photoUrl?: string, initials?: string },
 *   checked: boolean,
 *   onToggle: () => void,
 * }} props
 */
export function StudentPickTile({ student, checked, onToggle }) {
  const photo = student.photoUrl
  const { primary, secondary } = splitDisplayName(student.displayName)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`relative flex min-h-[5.25rem] touch-manipulation flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center transition active:scale-[0.98] ${
        checked
          ? 'border-[#2d81e0] bg-[#ecf3fc] shadow-sm ring-1 ring-[#2d81e0]/25'
          : 'border-[#e7e8ec] bg-[#f7f8fa] hover:border-[#d3d9de] hover:bg-[#f0f2f5] active:bg-[#ebedf0]'
      }`}
    >
      <span className="relative shrink-0">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-9 w-9 rounded-full border border-[#e7e8ec] object-cover"
          />
        ) : (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold ${
              checked
                ? 'border-[#2d81e0]/40 bg-white text-[#2d81e0]'
                : 'border-[#e7e8ec] bg-white text-[#818c99]'
            }`}
            aria-hidden
          >
            {student.initials ?? '?'}
          </span>
        )}
        {checked ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2d81e0] text-[10px] font-bold leading-none text-white shadow"
            aria-hidden
          >
            ✓
          </span>
        ) : null}
      </span>
      <span className="min-w-0 w-full leading-tight">
        <span className="block truncate text-[12px] font-semibold text-[#2c2d2e]">{primary}</span>
        {secondary ? (
          <span className="mt-0.5 block truncate text-[11px] text-[#818c99]">{secondary}</span>
        ) : null}
      </span>
    </button>
  )
}
