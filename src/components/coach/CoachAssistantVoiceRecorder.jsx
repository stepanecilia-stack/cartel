import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CANCEL_SLIDE_PX, LOCK_SLIDE_PX } from '../../hooks/useCoachVoiceRecorder.js'

function LockIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3Z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Z" />
    </svg>
  )
}

/**
 * @param {{
 *   mode: 'recording' | 'preview' | 'processing',
 *   elapsedLabel: string,
 *   previewDurationLabel?: string,
 *   audioUrl?: string,
 *   levels: number[],
 *   locked?: boolean,
 *   slidePx?: number,
 *   slideUpPx?: number,
 *   pointerX?: number,
 *   pointerY?: number,
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
  slidePx = 0,
  slideUpPx = 0,
  pointerX = 0,
  pointerY = 0,
  lockPending = false,
  cancelPending = false,
  onCancel,
  onStop,
  onSend,
}) {
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null))
  const [playing, setPlaying] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

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

  const lockProgress = Math.min(1, slideUpPx / LOCK_SLIDE_PX)
  const cancelProgress = Math.min(1, Math.abs(slidePx) / CANCEL_SLIDE_PX)
  const panelShift = locked ? 0 : slidePx * 0.35

  const floating =
    mode === 'recording' && !locked && typeof document !== 'undefined'
      ? createPortal(
          <>
            {slideUpPx > 6 ? (
              <div
                className="pointer-events-none fixed z-[9999] flex flex-col items-center"
                style={{
                  left: pointerX,
                  top: pointerY - 56 - slideUpPx * 0.4,
                  transform: `translate(-50%, 0) scale(${0.75 + lockProgress * 0.35})`,
                  opacity: 0.4 + lockProgress * 0.6,
                  transition: 'transform 40ms linear, opacity 40ms linear',
                }}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-colors duration-100 ${
                    lockPending ? 'bg-[#5181b8] text-white' : 'bg-white text-[#818c99]'
                  }`}
                >
                  <LockIcon />
                </div>
              </div>
            ) : null}

            {slidePx < -8 ? (
              <div
                className="pointer-events-none fixed z-[9999] flex items-center gap-1.5"
                style={{
                  left: Math.max(16, pointerX + slidePx * 0.5 - 40),
                  top: pointerY - 22,
                  transform: `translate(0, -50%) scale(${0.8 + cancelProgress * 0.35})`,
                  opacity: 0.45 + cancelProgress * 0.55,
                  transition: 'transform 40ms linear, opacity 40ms linear',
                }}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-colors duration-100 ${
                    cancelPending ? 'bg-red-500 text-white' : 'bg-white text-red-400'
                  }`}
                >
                  <TrashIcon className="h-[18px] w-[18px]" />
                </div>
              </div>
            ) : null}
          </>,
          document.body,
        )
      : null

  if (mode === 'preview' || mode === 'processing') {
    const busy = mode === 'processing'
    return (
      <>
        {floating}
        <div
          className={`w-full min-w-0 transition-all duration-200 ease-out ${
            entered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          <div className="flex min-h-[52px] items-center gap-2 rounded-full border border-[#dce1e6] bg-white px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#818c99] transition-transform duration-100 active:scale-90 disabled:opacity-45"
              aria-label="Удалить"
            >
              <TrashIcon className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              disabled={busy || !audioUrl}
              onClick={togglePlay}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5181b8] text-white transition-transform duration-100 active:scale-90 disabled:opacity-45"
              aria-label={playing ? 'Пауза' : 'Прослушать'}
            >
              {playing ? (
                <span className="text-[12px] font-bold tracking-tighter">❚❚</span>
              ) : (
                <span className="ml-0.5 text-[14px]">▶</span>
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

            <div className="min-w-0 flex-1 px-1">
              <div className="flex h-7 items-center gap-0.5">
                {levels.slice(0, 24).map((level, i) => (
                  <span
                    key={i}
                    className="w-[2px] shrink-0 rounded-full bg-[#5181b8]"
                    style={{
                      height: `${Math.round(4 + level * 20)}px`,
                      opacity: playing ? 0.5 + level * 0.5 : 0.25 + level * 0.35,
                    }}
                  />
                ))}
              </div>
            </div>

            <span className="shrink-0 pr-1 text-[15px] font-medium tabular-nums text-[#2c2d2e]">
              {previewDurationLabel || elapsedLabel}
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={onSend}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5181b8] text-[20px] text-white transition-transform duration-100 active:scale-90 disabled:opacity-45"
              aria-label="Отправить"
            >
              →
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {floating}
      <div
        className="w-full min-w-0"
        style={{
          transform: entered ? `translateX(${panelShift}px)` : 'translateY(4px)',
          opacity: entered ? 1 : 0,
          transition: locked
            ? 'opacity 200ms ease-out'
            : 'transform 50ms linear, opacity 200ms ease-out',
        }}
      >
        <div
          className={`flex min-h-[52px] items-center gap-2 rounded-full px-2 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-colors duration-150 ${
            cancelPending ? 'bg-red-50' : 'bg-white'
          }`}
        >
          <button
            type="button"
            onClick={onCancel}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-100 active:scale-90 ${
              cancelPending ? 'bg-red-500 text-white' : 'text-[#818c99]'
            }`}
            aria-label="Отменить"
          >
            <TrashIcon className="h-[18px] w-[18px]" />
          </button>

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex h-7 items-center gap-[2px]">
              {levels.map((level, i) => (
                <span
                  key={i}
                  className="w-[2px] shrink-0 rounded-full bg-[#5181b8] transition-[height] duration-75"
                  style={{ height: `${Math.round(4 + level * 22)}px`, opacity: 0.35 + level * 0.65 }}
                />
              ))}
            </div>
          </div>

          <span className="shrink-0 text-[15px] font-medium tabular-nums text-[#2c2d2e]">{elapsedLabel}</span>

          {locked ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5181b8] transition-transform duration-100 active:scale-90"
              aria-label="Закончить запись"
            >
              <span className="h-3.5 w-3.5 rounded-[3px] bg-white" />
            </button>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
