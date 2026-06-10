import { useEffect, useRef, useState } from 'react'

/**
 * @param {{
 *   mode: 'recording' | 'preview' | 'processing',
 *   elapsedLabel: string,
 *   previewDurationLabel?: string,
 *   audioUrl?: string,
 *   levels: number[],
 *   cancelPending?: boolean,
 *   onCancel: () => void,
 *   onSend: () => void,
 * }} props
 */
export default function CoachAssistantVoiceRecorder({
  mode,
  elapsedLabel,
  previewDurationLabel = '',
  audioUrl = '',
  levels,
  cancelPending = false,
  onCancel,
  onSend,
}) {
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null))
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPlaying(false)
  }, [audioUrl, mode])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  if (mode === 'preview' || mode === 'processing') {
    const busy = mode === 'processing'
    return (
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#dce1e6] bg-white shadow-sm">
        <div className="flex min-h-12 items-center gap-2 px-2.5 py-2 sm:px-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform active:scale-95 disabled:opacity-45"
            aria-label="Удалить"
          >
            🗑
          </button>

          <button
            type="button"
            disabled={busy || !audioUrl}
            onClick={togglePlay}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5181b8] text-white transition-transform active:scale-95 disabled:opacity-45"
            aria-label={playing ? 'Пауза' : 'Прослушать'}
          >
            {playing ? (
              <span className="text-[11px] font-bold">❚❚</span>
            ) : (
              <span className="ml-0.5 text-[13px]">▶</span>
            )}
          </button>

          {audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
              preload="auto"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 rounded-full bg-[#5181b8]/15">
                <div
                  className={`h-full rounded-full bg-[#5181b8]/70 ${playing ? 'w-2/3 animate-pulse' : 'w-1/3'}`}
                />
              </div>
              <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[#2c2d2e]">
                {previewDurationLabel || elapsedLabel}
              </span>
            </div>
            <p className="truncate text-[11px] text-[#818c99]">
              {busy ? 'Отправка…' : 'Прослушайте и нажмите →'}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5181b8] text-[18px] text-white transition-transform active:scale-95 disabled:opacity-45"
            aria-label="Отправить"
          >
            →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-full min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
        cancelPending ? 'border-red-300 bg-red-50' : 'border-[#dce1e6]'
      }`}
    >
      <div className="flex min-h-12 items-center gap-2 px-2.5 py-2 sm:px-3">
        <button
          type="button"
          onClick={onCancel}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px] transition-transform active:scale-95 ${
            cancelPending ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
          }`}
          aria-label="Отменить"
        >
          ✕
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[#2c2d2e]">{elapsedLabel}</span>
            <div className="flex h-6 min-w-0 flex-1 items-end justify-center gap-0.5">
              {levels.map((level, i) => (
                <span
                  key={i}
                  className="w-0.5 shrink-0 rounded-full bg-[#5181b8] transition-[height] duration-75"
                  style={{ height: `${Math.round(6 + level * 16)}px`, opacity: 0.45 + level * 0.55 }}
                />
              ))}
            </div>
          </div>
          <p className={`truncate text-[11px] ${cancelPending ? 'text-red-600' : 'text-[#818c99]'}`}>
            {cancelPending ? 'Отпустите — отмена' : 'Отпустите — прослушать'}
          </p>
        </div>
      </div>
    </div>
  )
}
