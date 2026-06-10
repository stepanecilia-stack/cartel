import { useEffect, useRef, useState } from 'react'

/**
 * Голосовое сообщение в чате (как в Telegram).
 * @param {{
 *   durationSec?: number,
 *   audioUrl?: string,
 *   transcript: string,
 * }} props
 */
export default function CoachAssistantVoiceBubble({ durationSec = 0, audioUrl = '', transcript }) {
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null))
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    return () => {
      if (audioUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(audioUrl)
        } catch {
          /* ignore */
        }
      }
    }
  }, [audioUrl])

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

  const label = durationSec > 0 ? `${durationSec} сек` : 'голос'

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {audioUrl ? (
          <>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5181b8] text-white"
              aria-label={playing ? 'Пауза' : 'Прослушать'}
            >
              {playing ? (
                <span className="text-[11px] font-bold">❚❚</span>
              ) : (
                <span className="ml-0.5 text-[12px]">▶</span>
              )}
            </button>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
              preload="metadata"
            />
          </>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5181b8]/15 text-[#5181b8]">
            🎤
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="h-1.5 w-full max-w-[140px] rounded-full bg-[#5181b8]/20">
            <div className="h-full w-2/3 rounded-full bg-[#5181b8]/60" />
          </div>
          <p className="mt-0.5 text-[11px] text-[#818c99]">{label}</p>
        </div>
      </div>
      {transcript ? <p className="text-[14px] leading-snug text-[#2c2d2e]">{transcript}</p> : null}
    </div>
  )
}
