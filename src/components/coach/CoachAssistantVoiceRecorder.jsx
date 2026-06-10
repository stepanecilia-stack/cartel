import { useEffect, useRef, useState } from 'react'

const LOCK_SLIDE_PX = 72

/**
 * @param {{
 *   mode: 'recording' | 'preview' | 'processing',
 *   elapsedLabel: string,
 *   previewDurationLabel?: string,
 *   audioUrl?: string,
 *   levels: number[],
 *   locked?: boolean,
 *   slideUpPx?: number,
 *   lockPending?: boolean,
 *   cancelPending?: boolean,
 *   onCancel: () => void,
 *   onStop?: () => void,
 *   onSend: () => void,
 * }} props
 */
export default function CoachAssistantVoiceRecorder({
  mode,
  elapsedLabel,
  previewDurationLabel = '',
  audioUrl = '',
  levels,
  locked = false,
  slideUpPx = 0,
  lockPending = false,
  cancelPending = false,
  onCancel,
  onStop,
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

  const lockProgress = Math.min(1, slideUpPx / LOCK_SLIDE_PX)

  return (
    <div className="relative w-full min-w-0">
      {!locked && slideUpPx > 4 ? (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 flex-col items-center"
          style={{ opacity: 0.35 + lockProgress * 0.65 }}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-colors ${
              lockPending ? 'border-[#5181b8] text-[#5181b8]' : 'border-[#dce1e6] text-[#818c99]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3Z" />
            </svg>
          </div>
          <span className="mt-1 text-[10px] font-medium text-[#818c99]">↑ заблокировать</span>
        </div>
      ) : null}

      <div
        className={`w-full min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
          cancelPending ? 'border-red-300 bg-red-50' : locked ? 'border-[#5181b8]/40' : 'border-[#dce1e6]'
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
            <p
              className={`truncate text-[11px] ${
                cancelPending ? 'text-red-600' : locked ? 'text-[#5181b8]' : 'text-[#818c99]'
              }`}
            >
              {cancelPending
                ? 'Отпустите — отмена'
                : locked
                  ? 'Запись без удержания · ■ — закончить'
                  : '↑ заблокировать · ← отмена · отпустите — прослушать'}
            </p>
          </div>

          {locked ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5181b8] transition-transform active:scale-95"
              aria-label="Закончить запись"
            >
              <span className="h-3.5 w-3.5 rounded-sm bg-white" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
