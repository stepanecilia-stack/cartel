import { useState, useCallback, useEffect, useRef } from 'react'
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
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef(null)
  const coverSeekDoneRef = useRef(false)
  const media = resolveTechnicalAtomMedia(atom)
  const displayTitle = title ?? atom?.name ?? ''
  const coverSeed = atom?.id ?? media.src

  const canPreview = previewable && PREVIEWABLE_KINDS.has(media.kind)
  const tapToPlayWebm = media.kind === 'webm' && typeof onTogglePlay === 'function'
  const showPlayOverlay = media.kind === 'webm' && !playing
  const isWebm = media.kind === 'webm'

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
    const video = videoRef.current
    if (!video || !isWebm || !media.src) return
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
  }, [playing, isWebm, media.src, seekCoverFrame])

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
    thumb = videoError ? (
      <StaticEmbedThumb className="bg-[#1a1a1a] text-white/90" />
    ) : (
      <>
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
        {!playing ? (
          <span className="pointer-events-none absolute inset-0 z-[1] bg-black/35" aria-hidden />
        ) : null}
      </>
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
