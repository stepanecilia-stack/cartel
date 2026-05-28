import { useState, useCallback, useEffect, useRef } from 'react'
import { resolveTechnicalAtomMedia } from '../utils/technicalAtomMedia.js'
import StaticEmbedThumb from './training/StaticEmbedThumb.jsx'
import MediaLightbox from './MediaLightbox.jsx'

const PREVIEWABLE_KINDS = new Set(['gif', 'webm', 'embed', 'link'])

function WebmPausedThumb({ posterSrc }) {
  if (posterSrc) {
    return (
      <img
        src={posterSrc}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover bg-[#0f0f0f]"
      />
    )
  }
  return <StaticEmbedThumb className="bg-[#1a1a1a] text-white/90" />
}

function PlayOverlay({ compact = false }) {
  return (
    <span
      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
      aria-hidden
    >
      <span
        className={`flex items-center justify-center rounded-full bg-white/90 text-[#2d81e0] shadow ${
          compact ? 'h-7 w-7' : 'h-9 w-9'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={compact ? 14 : 18}
          height={compact ? 14 : 18}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </span>
    </span>
  )
}

/**
 * @param {{
 *   atom: object,
 *   className?: string,
 *   previewable?: boolean,
 *   title?: string,
 *   playing?: boolean,
 *   onTogglePlay?: () => void,
 *   compactThumb?: boolean,
 * }} props
 */
export default function TechnicalAtomMedia({
  atom,
  className = '',
  previewable = true,
  title,
  playing = false,
  onTogglePlay,
  compactThumb = false,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [videoSrc, setVideoSrc] = useState('')
  const videoRef = useRef(null)
  const media = resolveTechnicalAtomMedia(atom)
  const displayTitle = title ?? atom?.name ?? ''

  const canPreview = previewable && PREVIEWABLE_KINDS.has(media.kind)
  const tapToPlayWebm = media.kind === 'webm' && typeof onTogglePlay === 'function'
  const posterSrc = media.kind === 'webm' ? media.poster : ''
  const showPlayOverlay = media.kind === 'webm' && !playing

  useEffect(() => {
    if (media.kind !== 'webm') return
    if (playing) {
      setVideoSrc(media.src)
      return
    }
    setVideoSrc('')
    const video = videoRef.current
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [playing, media.kind, media.src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || media.kind !== 'webm' || !videoSrc) return
    if (playing) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [playing, media.kind, videoSrc])

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
    thumb =
      playing && videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="h-full w-full object-cover bg-[#0f0f0f]"
          muted
          playsInline
          loop
          preload="auto"
          disablePictureInPicture
          aria-hidden
        />
      ) : (
        <WebmPausedThumb posterSrc={posterSrc} />
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

  const frameClass = `relative overflow-hidden ${className}`
  const isClickable = tapToPlayWebm || canPreview

  return (
    <>
      {isClickable ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleActivate}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleActivate(e)
          }}
          className={`cursor-pointer active:opacity-90 ${frameClass}`}
          aria-label={
            tapToPlayWebm
              ? playing
                ? `Пауза: ${displayTitle || 'видео'}`
                : `Воспроизвести: ${displayTitle || 'видео'}`
              : `Увеличить: ${displayTitle || 'медиа'}`
          }
        >
          {thumb}
          {showPlayOverlay ? <PlayOverlay compact={compactThumb} /> : null}
        </div>
      ) : (
        <div className={frameClass}>
          {thumb}
          {showPlayOverlay ? <PlayOverlay compact={compactThumb} /> : null}
        </div>
      )}
      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        media={media}
        title={displayTitle}
      />
    </>
  )
}
