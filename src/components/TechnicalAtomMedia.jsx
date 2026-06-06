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

function CoverImage({ src, className = '', fit = 'cover' }) {
  return (
    <img
      src={src}
      alt=""
      className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`}
      loading="lazy"
      decoding="async"
    />
  )
}

function SoundToggleButton({ muted, onToggle, prominent = false }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      className={`absolute z-[4] flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 ${
        prominent
          ? muted
            ? 'bottom-3 right-3 h-14 w-14 animate-pulse bg-amber-400 text-[#1a1200] ring-4 ring-amber-300/80 sm:bottom-4 sm:right-4 sm:h-16 sm:w-16'
            : 'bottom-3 right-3 h-12 w-12 bg-white/95 text-[#2c2d2e] sm:bottom-4 sm:right-4 sm:h-14 sm:w-14'
          : muted
            ? 'bottom-1.5 right-1.5 h-9 w-9 bg-amber-400 text-[#1a1200] ring-2 ring-amber-300'
            : 'bottom-1.5 right-1.5 h-8 w-8 bg-white/95 text-[#2c2d2e]'
      }`}
      aria-pressed={!muted}
      aria-label={muted ? 'Включить звук' : 'Выключить звук'}
      title={muted ? 'Включить звук' : 'Выключить звук'}
    >
      {muted ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={prominent ? 'h-8 w-8' : 'h-5 w-5'}
          aria-hidden
        >
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={prominent ? 'h-7 w-7' : 'h-5 w-5'}
          aria-hidden
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
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
 *   videoFit?: 'cover' | 'contain',
 *   showSoundToggle?: boolean,
 *   carouselSlide?: boolean,
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
  videoFit = 'cover',
  showSoundToggle = false,
  carouselSlide = false,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [audioMuted, setAudioMuted] = useState(true)
  const videoRef = useRef(null)
  const media = resolveTechnicalAtomMedia(atom)
  const displayTitle = title ?? atom?.name ?? ''
  const isWebm = media.kind === 'webm'
  const tierCoverSrc = isWebm ? media.tierCoverSrc : null
  const letterbox = videoFit === 'contain'

  const canPreview = previewable && PREVIEWABLE_KINDS.has(media.kind)
  const tapToPlayWebm = isWebm && typeof onTogglePlay === 'function'
  const showPlayOverlay = isWebm && !playing
  const shouldLoadVideo = isWebm && playing
  const showSoundControl = showSoundToggle && isWebm && playing && !videoError

  useEffect(() => {
    setVideoError(false)
    setAudioMuted(true)
  }, [media.src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldLoadVideo) return
    video.loop = true
    video.muted = audioMuted
    void video.play().catch(() => {})
  }, [playing, shouldLoadVideo, media.src, audioMuted])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = audioMuted
  }, [audioMuted])

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
          className={`h-full w-full bg-[#0f0f0f] ${letterbox ? 'object-contain' : 'object-cover'}`}
          muted={audioMuted}
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
          onError={() => setVideoError(true)}
        />
      )
    } else if (tierCoverSrc) {
      thumb = <CoverImage src={tierCoverSrc} fit={videoFit} />
    } else {
      thumb = <StaticEmbedThumb className={videoError && playing ? 'bg-[#f0f2f5] text-[#818c99]' : ''} />
    }
  } else if (media.kind === 'poster') {
    thumb = <CoverImage src={media.src} fit={videoFit} />
  } else {
    thumb = <StaticEmbedThumb />
  }

  const frameClass = `relative overflow-hidden ${letterbox ? 'bg-[#0f0f0f]' : ''} ${className}`
  const isClickable = !carouselSlide && (tapToPlayWebm || canPreview)

  const frameInner = (
    <>
      {thumb}
      {showPlayOverlay ? <PlayOverlay compact={compactThumb} /> : null}
      {showSoundControl ? (
        <SoundToggleButton
          muted={audioMuted}
          onToggle={() => setAudioMuted((m) => !m)}
          prominent={showSoundToggle && !compactThumb}
        />
      ) : null}
      {showSoundControl && audioMuted && showSoundToggle && !compactThumb ? (
        <span className="pointer-events-none absolute bottom-3 left-3 z-[3] rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300 sm:bottom-4 sm:left-4 sm:text-xs">
          Без звука
        </span>
      ) : null}
      {carouselSlide && canPreview ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setLightboxOpen(true)
          }}
          className="pointer-events-auto absolute right-3 top-3 z-[4] rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm sm:text-xs"
        >
          На весь экран
        </button>
      ) : null}
    </>
  )

  const lightboxMedia =
    isWebm && playing
      ? { kind: 'webm', src: media.src, startMuted: audioMuted }
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
        <div className={frameClass} style={carouselSlide ? { touchAction: 'pan-x pinch-zoom' } : undefined}>
          {frameInner}
        </div>
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
