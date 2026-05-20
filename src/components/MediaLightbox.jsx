import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { vk } from '../utils/vkUi.js'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   media: { kind: string, src: string },
 *   title?: string,
 * }} props
 */
export default function MediaLightbox({ open, onClose, media, title = '' }) {
  useEffect(() => {
    if (!open) return undefined
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
  }, [open, onClose])

  if (!open || !media?.src) return null

  const label = title ? `Просмотр: ${title}` : 'Просмотр медиа'

  let body = null
  if (media.kind === 'gif') {
    body = (
      <img
        src={media.src}
        alt=""
        className="max-h-[min(82vh,720px)] max-w-[min(92vw,960px)] rounded-lg object-contain shadow-lg"
      />
    )
  } else if (media.kind === 'webm') {
    body = (
      <video
        src={media.src}
        className="max-h-[min(82vh,720px)] max-w-[min(92vw,960px)] rounded-lg bg-black object-contain shadow-lg"
        autoPlay
        loop
        muted
        playsInline
        controls
      />
    )
  } else if (media.kind === 'embed') {
    body = (
      <div className="w-[min(92vw,720px)] overflow-hidden rounded-lg bg-black shadow-lg">
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
        className="relative flex max-h-[94vh] w-full max-w-4xl flex-col items-center justify-center p-2 sm:p-4"
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
