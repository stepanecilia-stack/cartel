import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { vk } from '../utils/vkUi.js'

function LightboxSoundToggle({ muted, onToggle }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`absolute bottom-3 right-3 z-10 flex h-14 w-14 items-center justify-center rounded-full shadow-lg sm:bottom-4 sm:right-4 sm:h-16 sm:w-16 ${
        muted ? 'animate-pulse bg-amber-400 text-[#1a1200] ring-4 ring-amber-300/80' : 'bg-white/95 text-[#2c2d2e]'
      }`}
      aria-label={muted ? 'Включить звук' : 'Выключить звук'}
    >
      {muted ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden>
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  )
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   media: { kind: string, src: string, startMuted?: boolean },
 *   title?: string,
 * }} props
 */
export default function MediaLightbox({ open, onClose, media, title = '' }) {
  const [audioMuted, setAudioMuted] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setAudioMuted(media?.startMuted !== false)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, media?.src, media?.startMuted])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = audioMuted
  }, [audioMuted, open, media?.src])

  if (!open || !media?.src) return null

  const label = title ? `Просмотр: ${title}` : 'Просмотр медиа'

  let body = null
  if (media.kind === 'gif' || media.kind === 'poster') {
    body = (
      <img
        src={media.src}
        alt=""
        className="max-h-[min(92dvh,960px)] max-w-[min(96vw,960px)] rounded-lg object-contain shadow-lg"
      />
    )
  } else if (media.kind === 'webm') {
    body = (
      <div className="relative">
        <video
          ref={videoRef}
          src={media.src}
          className="max-h-[min(92dvh,960px)] max-w-[min(96vw,960px)] rounded-lg bg-black object-contain shadow-lg"
          autoPlay
          loop
          muted={audioMuted}
          playsInline
          controls
        />
        <LightboxSoundToggle muted={audioMuted} onToggle={() => setAudioMuted((m) => !m)} />
      </div>
    )
  } else if (media.kind === 'embed') {
    body = (
      <div className="w-[min(96vw,960px)] overflow-hidden rounded-lg bg-black shadow-lg">
        <div className="relative aspect-video w-full">
          <iframe
            src={media.src}
            title={label}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  } else {
    body = (
      <div className={`${vk.cardPadded} max-w-sm text-center`}>
        <p className={vk.muted}>Внешняя ссылка на видео</p>
        <a href={media.src} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block ${vk.link}`}>
          Открыть в новой вкладке
        </a>
      </div>
    )
  }

  return createPortal(
    <div
      className={vk.modalOverlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative flex min-h-[50dvh] max-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center p-2 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-1 top-1 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#2c2d2e] shadow active:bg-[#f0f2f5] sm:right-2 sm:top-2"
          aria-label="Закрыть"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        {body}
      </div>
    </div>,
    document.body,
  )
}
