import { useState, useCallback, useEffect, useRef } from 'react'
import { useInView } from '../hooks/useInView.js'
import { resolveTechnicalAtomMedia } from '../utils/technicalAtomMedia.js'
import { pickWebmCoverTime } from '../utils/webmCoverFrame.js'
import StaticEmbedThumb from './training/StaticEmbedThumb.jsx'
import MediaLightbox from './MediaLightbox.jsx'

const PREVIEWABLE_KINDS = new Set(['webm', 'embed', 'link'])

function PlayOverlay({ compact = false }) {
  return (
    <span
      className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
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

function WebmPlaceholder() {
  return <StaticEmbedThumb className="bg-[#1a1a1a] text-white/90" />
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
 *   lazyVideo?: boolean,
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
  lazyVideo = true,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef(null)
  const coverSeekDoneRef = useRef(false)
  const media = resolveTechnicalAtomMedia(atom)
  const displayTitle = title ?? atom?.name ?? ''
  const coverSeed = atom?.id ?? media.src
  const isWebm = media.kind === 'webm'

  const { ref: inViewRef, inView } = useInView({
    rootMargin: '120px 0px',
    enabled: isWebm && lazyVideo,
  })

  const shouldLoadVideo = isWebm && (!lazyVideo || inView || playing)

  const canPreview = previewable && PREVIEWABLE_KINDS.has(media.kind)
  const tapToPlayWebm = isWebm && typeof onTogglePlay === 'function'
  const showPlayOverlay = isWebm && !playing
  const showPausedDim = isWebm && !playing

  const seekCoverFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || playing) return
    const t = pickWebmCoverTime(video.duration, coverSeed)
    if (Math.abs(video.currentTime - t) > 0.05) {
      video.currentTime = t
    } else {
      video.pause()
    }
  }, [playing, coverSeed])

  useEffect(() => {
    coverSeekDoneRef.current = false
    setVideoError(false)
  }, [media.src])

  useEffect(() => {
    if (!shouldLoadVideo) {
      coverSeekDoneRef.current = false
    }
  }, [shouldLoadVideo])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !isWebm || !shouldLoadVideo) return
    if (playing) {
      video.loop = true
      void video.play().catch(() => {})
      return
    }
    video.loop = false
    video.pause()
    if (coverSeekDoneRef.current && video.readyState >= 2) {
      seekCoverFrame()
    }
  }, [playing, isWebm, shouldLoadVideo, seekCoverFrame])

  const handleLoadedMetadata = useCallback(() => {
    if (playing || coverSeekDoneRef.current) return
    coverSeekDoneRef.current = true
    seekCoverFrame()
  }, [playing, seekCoverFrame])

  const handleSeeked = useCallback(() => {
    if (!playing) videoRef.current?.pause()
  }, [playing])

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
  if (isWebm) {
    if (!shouldLoadVideo) {
      thumb = <WebmPlaceholder />
    } else if (videoError) {
      thumb = <WebmPlaceholder />
    } else {
      thumb = (
        <video
          ref={videoRef}
          src={media.src}
          className="h-full w-full object-cover bg-[#0f0f0f]"
          muted
          playsInline
          preload={playing ? 'auto' : 'metadata'}
          disablePictureInPicture
          aria-hidden
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onError={() => setVideoError(true)}
        />
      )
    }
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

  const frameInner = (
    <>
      {thumb}
      {showPausedDim ? (
        <span className="pointer-events-none absolute inset-0 z-[1] bg-black/35" aria-hidden />
      ) : null}
      {showPlayOverlay ? <PlayOverlay compact={compactThumb} /> : null}
    </>
  )

  return (
    <>
      {isClickable ? (
        <div
          ref={isWebm && lazyVideo ? inViewRef : undefined}
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
          {frameInner}
        </div>
      ) : (
        <div ref={isWebm && lazyVideo ? inViewRef : undefined} className={frameClass}>
          {frameInner}
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
