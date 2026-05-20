/**
 * @param {{ contraindications?: string | null }} exercise
 */
export function hasExerciseContraindications(exercise) {
  const t = exercise?.contraindications
  return typeof t === 'string' && t.trim().length > 0
}

/**
 * Красный «!» — заполнены противопоказания.
 * @param {{ text?: string | null, className?: string }} props
 */
export default function ExerciseContraindicationMark({ text, className = '' }) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return null

  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e64646] text-[11px] font-bold leading-none text-white ${className}`}
      title={`Противопоказания: ${trimmed}`}
      aria-label={`Противопоказания: ${trimmed}`}
    >
      !
    </span>
  )
}
