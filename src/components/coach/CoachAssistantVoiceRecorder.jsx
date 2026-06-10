import { vk } from '../../utils/vkUi.js'

/**
 * Панель записи голосового (стиль Telegram).
 * @param {{
 *   elapsedLabel: string,
 *   processing?: boolean,
 *   onCancel: () => void,
 *   onSend: () => void,
 * }} props
 */
export default function CoachAssistantVoiceRecorder({
  elapsedLabel,
  processing = false,
  onCancel,
  onSend,
}) {
  return (
    <div className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-[#5181b8]/30 bg-[#ecf3fc] px-2.5 py-1.5">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tabular-nums text-[#2c2d2e]">{elapsedLabel}</p>
        <p className="truncate text-[11px] text-[#818c99]">
          {processing ? 'Расшифровка…' : 'Нажмите → чтобы отправить'}
        </p>
      </div>
      <button
        type="button"
        disabled={processing}
        onClick={onCancel}
        className={`${vk.btnSecondary} shrink-0 px-2 py-1 text-[12px]`}
        aria-label="Отменить запись"
      >
        ✕
      </button>
      <button
        type="button"
        disabled={processing}
        onClick={onSend}
        className={`shrink-0 ${vk.btnPrimary} px-3 py-1.5`}
        aria-label="Отправить голосовое"
      >
        →
      </button>
    </div>
  )
}
