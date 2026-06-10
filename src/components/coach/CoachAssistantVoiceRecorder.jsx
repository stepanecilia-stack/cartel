/**
 * Панель записи: удержание → запись, отпускание → отправка, влево → отмена.
 * @param {{
 *   elapsedLabel: string,
 *   levels: number[],
 *   cancelPending?: boolean,
 *   processing?: boolean,
 *   recording?: boolean,
 *   onCancel: () => void,
 *   onSend?: () => void,
 * }} props
 */
export default function CoachAssistantVoiceRecorder({
  elapsedLabel,
  levels,
  cancelPending = false,
  processing = false,
  recording = false,
  onCancel,
  onSend,
}) {
  const hint = processing
    ? 'Расшифровка…'
    : cancelPending
      ? 'Отпустите — отмена'
      : recording
        ? 'Отпустите палец или нажмите «Готово»'
        : 'Запись…'

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-full border border-[#dce1e6] bg-white shadow-sm">
      <div
        className={`flex min-h-11 items-center gap-2 px-2.5 py-2 sm:gap-2 sm:px-3 ${
          cancelPending ? 'bg-red-50' : ''
        }`}
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
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!processing ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            ) : null}
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[#2c2d2e]">{elapsedLabel}</span>
            <div className="flex h-6 min-w-0 flex-1 items-end justify-center gap-0.5">
              {levels.map((level, i) => (
                <span
                  key={i}
                  className="w-0.5 shrink-0 rounded-full bg-[#5181b8] transition-[height] duration-75 sm:w-1"
                  style={{ height: `${Math.round(6 + level * 16)}px`, opacity: 0.45 + level * 0.55 }}
                />
              ))}
            </div>
          </div>
          <p className={`truncate text-[10px] sm:text-[11px] ${cancelPending ? 'text-red-600' : 'text-[#818c99]'}`}>
            {hint}
          </p>
        </div>

        {recording && !processing && onSend ? (
          <button
            type="button"
            onClick={onSend}
            className="shrink-0 rounded-full bg-[#5181b8] px-3 py-1.5 text-[13px] font-semibold text-white"
          >
            Готово
          </button>
        ) : null}
      </div>
    </div>
  )
}
