import { useState, useCallback, useEffect, useRef } from 'react'
import { resolveTechnicalAtomMedia } from '../utils/technicalAtomMedia.js'
import StaticEmbedThumb from './training/StaticEmbedThumb.jsx'
import MediaLightbox from './MediaLightbox.jsx'

const PREVIEWABLE_KINDS = new Set(['webm', 'embed', 'link', 'poster'])

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

function CoverImage({ src, className = '' }) {
  return (
    <img
      src={src}
      alt=""
      className={`h-full w-full object-cover ${className}`}
      loading="lazy"
      decoding="async"
    />
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
 *   stopClickPropagation?: boolean,
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
  stopClickPropagation = true,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef(null)
  const media = resolveTechnicalAtomMedia(atom)
  const displayTitle = title ?? atom?.name ?? ''
  const isWebm = media.kind === 'webm'
  const tierCoverSrc = isWebm ? media.tierCoverSrc : null

  const canPreview = previewable && PREVIEWABLE_KINDS.has(media.kind)
  const tapToPlayWebm = isWebm && typeof onTogglePlay === 'function'
  const showPlayOverlay = isWebm && !playing
  const shouldLoadVideo = isWebm && playing

  useEffect(() => {
    setVideoError(false)
  }, [media.src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldLoadVideo) return
    video.loop = true
    void video.play().catch(() => {})
  }, [playing, shouldLoadVideo, media.src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || shouldLoadVideo) return
    video.pause()
  }, [shouldLoadVideo])

  const openPreview = useCallback(
    (e) => {
      if (stopClickPropagation) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (canPreview) setLightboxOpen(true)
    },
    [canPreview, stopClickPropagation],
  )

  const handleActivate = useCallback(
    (e) => {
      if (stopClickPropagation) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (tapToPlayWebm) {
        if (playing && canPreview) {
          setLightboxOpen(true)
          return
        }
        onTogglePlay()
        return
      }
      if (canPreview) setLightboxOpen(true)
    },
    [tapToPlayWebm, playing, canPreview, onTogglePlay, stopClickPropagation],
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
    if (shouldLoadVideo && !videoError) {
      thumb = (
        <video
          key={media.src}
          ref={videoRef}
          src={media.src}
          className="h-full w-full object-cover bg-[#0f0f0f]"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
          onError={() => setVideoError(true)}
        />
      )
    } else if (tierCoverSrc) {
      thumb = <CoverImage src={tierCoverSrc} />
    } else {
      thumb = <StaticEmbedThumb className={videoError && playing ? 'bg-[#f0f2f5] text-[#818c99]' : ''} />
    }
  } else if (media.kind === 'poster') {
    thumb = <CoverImage src={media.src} />
  } else {
    thumb = <StaticEmbedThumb />
  }

  const frameClass = `relative overflow-hidden ${className}`
  const isClickable = tapToPlayWebm || canPreview

  const frameInner = (
    <>
      {thumb}
      {showPlayOverlay ? <PlayOverlay compact={compactThumb} /> : null}
    </>
  )

  const lightboxMedia =
    isWebm && playing
      ? { kind: 'webm', src: media.src }
      : media.kind === 'poster'
        ? media
        : media

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
                ? canPreview
                  ? `На весь экран: ${displayTitle || 'видео'}`
                  : `Пауза: ${displayTitle || 'видео'}`
                : `Воспроизвести: ${displayTitle || 'видео'}`
              : `Увеличить: ${displayTitle || 'медиа'}`
          }
        >
          {frameInner}
        </div>
      ) : (
        <div className={frameClass}>{frameInner}</div>
      )}
      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        media={lightboxMedia}
        title={displayTitle}
      />
    </>
  )
}
