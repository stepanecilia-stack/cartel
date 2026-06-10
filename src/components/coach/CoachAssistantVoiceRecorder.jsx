/**
 * Панель записи: удержание → запись, отпускание → отправка, влево → отмена.
 * @param {{
 *   elapsedLabel: string,
 *   levels: number[],
 *   slidePx?: number,
 *   cancelPending?: boolean,
 *   processing?: boolean,
 *   onCancel: () => void,
 * }} props
 */
export default function CoachAssistantVoiceRecorder({
  elapsedLabel,
  levels,
  slidePx = 0,
  cancelPending = false,
  processing = false,
  onCancel,
}) {
  const hint = processing
    ? 'Расшифровка…'
    : cancelPending
      ? 'Отпустите — отмена'
      : 'Удерживайте микрофон · отпустите — отправить · влево — отмена'

  return (
    <div
      className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-[#dce1e6] bg-white px-3 py-2 shadow-sm"
      style={{ transform: `translateX(${Math.max(slidePx, -96)}px)`, transition: slidePx ? 'none' : 'transform 120ms ease-out' }}
    >
      <button
        type="button"
        disabled={processing}
        onClick={onCancel}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] ${
          cancelPending ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
        }`}
        aria-label="Отменить"
      >
        ✕
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!processing ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          ) : null}
          <span className="text-[15px] font-semibold tabular-nums text-[#2c2d2e]">{elapsedLabel}</span>
          <div className="flex h-6 flex-1 items-end justify-center gap-0.5 px-1">
            {levels.map((level, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-[#5181b8] transition-[height] duration-75"
                style={{ height: `${Math.round(8 + level * 18)}px`, opacity: 0.45 + level * 0.55 }}
              />
            ))}
          </div>
        </div>
        <p className={`truncate text-[11px] ${cancelPending ? 'text-red-600' : 'text-[#818c99]'}`}>{hint}</p>
      </div>
    </div>
  )
}
