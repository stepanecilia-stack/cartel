import { useState, useCallback, useEffect, useRef } from 'react'
import { resolveTechnicalAtomMedia } from '../utils/technicalAtomMedia.js'
import MediaLightbox from './MediaLightbox.jsx'

const PREVIEWABLE_KINDS = new Set(['gif', 'webm', 'embed', 'link'])

/**
 * @param {{
 *   atom: object,
 *   className?: string,
 *   previewable?: boolean,
 *   title?: string,
 *   playing?: boolean,
 *   onTogglePlay?: () => void,
 * }} props
 */
export default function TechnicalAtomMedia({
  atom,
  className = '',
  previewable = true,
  title,
  playing = false,
  onTogglePlay,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const videoRef = useRef(null)
  const media = resolveTechnicalAtomMedia(atom)
  const displayTitle = title ?? atom?.name ?? ''

  const canPreview = previewable && PREVIEWABLE_KINDS.has(media.kind)
  const tapToPlayWebm = media.kind === 'webm' && typeof onTogglePlay === 'function'

  useEffect(() => {
    const video = videoRef.current
    if (!video || media.kind !== 'webm') return
    if (playing) {
      void video.play().catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
    }
  }, [playing, media.kind])

  const openPreview = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (canPreview) setLightboxOpen(true)
    },
    [canPreview],
  )

  const handleActivate = useCallback(
    (e) => {
      if (tapToPlayWebm) {
        e.preventDefault()
        e.stopPropagation()
        onTogglePlay()
        return
      }
      if (canPreview) openPreview(e)
    },
    [tapToPlayWebm, onTogglePlay, canPreview, openPreview],
  )

  const wrapInteractive = (node) => {
    if (!tapToPlayWebm && !canPreview) {
      return <div className={`relative overflow-hidden ${className}`}>{node}</div>
    }
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleActivate(e)
        }}
        className={`relative cursor-pointer overflow-hidden active:opacity-90 ${className}`}
        aria-label={
          tapToPlayWebm
            ? playing
              ? `Пауза: ${displayTitle || 'видео'}`
              : `Воспроизвести: ${displayTitle || 'видео'}`
            : `Увеличить: ${displayTitle || 'медиа'}`
        }
      >
        {node}
        {tapToPlayWebm && !playing ? (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
            aria-hidden
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#2d81e0] shadow">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
          </span>
        ) : null}
      </div>
    )
  }

  if (media.kind === 'none') {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-md bg-[#f0f2f5] text-[10px] text-[#aeb7c2] ${className}`}
        aria-hidden
      >
        —
      </div>
    )
  }

  let thumb = null
  if (media.kind === 'gif') {
    thumb = <img src={media.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
  } else if (media.kind === 'webm') {
    thumb = (
      <video
        ref={videoRef}
        src={media.src}
        className="h-full w-full object-cover bg-[#0f0f0f]"
        muted
        playsInline
        loop
        preload="metadata"
        disablePictureInPicture
        aria-hidden
      />
    )
  } else {
    thumb = (
      <span className="flex h-full w-full items-center justify-center bg-[#ecf3fc] text-[#2d81e0]">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </span>
    )
  }

  return (
    <>
      {wrapInteractive(thumb)}
      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        media={media}
        title={displayTitle}
      />
    </>
  )
}
