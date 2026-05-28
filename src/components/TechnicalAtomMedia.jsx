import { useState, useCallback } from 'react'
import { resolveTechnicalAtomMedia } from '../utils/technicalAtomMedia.js'
import LoopingWebmPreview from './LoopingWebmPreview.jsx'
import MediaLightbox from './MediaLightbox.jsx'

const PREVIEWABLE_KINDS = new Set(['gif', 'webm', 'embed', 'link'])

/**
 * Превью GIF / WebM (и embed) с лайтбоксом по клику — без ухода со страницы.
 * @param {{
 *   atom: object,
 *   className?: string,
 *   previewable?: boolean,
 *   title?: string,
 *   webmPriority?: 'high' | 'normal',
 *   webmAlwaysPlay?: boolean,
 *   webmIntersectionRoot?: Element | null,
 * }} props
 */
export default function TechnicalAtomMedia({
  atom,
  className = '',
  previewable = true,
  title,
  webmPriority = 'normal',
  webmAlwaysPlay = false,
  webmIntersectionRoot = null,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const media = resolveTechnicalAtomMedia(atom)
  const displayTitle = title ?? atom?.name ?? ''

  const canPreview = previewable && PREVIEWABLE_KINDS.has(media.kind)

  const openPreview = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (canPreview) setLightboxOpen(true)
    },
    [canPreview],
  )

  const wrapPreviewable = (node) => {
    if (!canPreview) {
      return <div className={`relative overflow-hidden ${className}`}>{node}</div>
    }
    const isLooping = media.kind === 'gif' || media.kind === 'webm'
    if (isLooping) {
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={openPreview}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openPreview(e)
          }}
          className={`relative cursor-pointer overflow-hidden active:opacity-90 ${className}`}
          aria-label={`Увеличить: ${displayTitle || 'медиа'}`}
        >
          {node}
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={openPreview}
        className={`relative shrink-0 overflow-hidden rounded-md bg-[#f0f2f5] active:opacity-90 ${className}`}
        aria-label={`Увеличить: ${displayTitle || 'медиа'}`}
      >
        {node}
      </button>
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
      <LoopingWebmPreview
        src={media.src}
        priority={webmPriority}
        alwaysPlay={webmAlwaysPlay}
        intersectionRoot={webmIntersectionRoot}
        className="h-full w-full"
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
      {wrapPreviewable(thumb)}
      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        media={media}
        title={displayTitle}
      />
    </>
  )
}
