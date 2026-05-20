import { resolveTechnicalAtomMedia } from '../utils/technicalAtomMedia.js'

/**
 * Превью GIF / WebM справа в строке элемента.
 */
export default function TechnicalAtomMedia({ atom, className = '' }) {
  const media = resolveTechnicalAtomMedia(atom)

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

  if (media.kind === 'gif') {
    return (
      <img
        src={media.src}
        alt=""
        loading="lazy"
        className={`shrink-0 rounded-md object-cover bg-[#f0f2f5] ${className}`}
      />
    )
  }

  if (media.kind === 'webm') {
    return (
      <video
        src={media.src}
        className={`shrink-0 rounded-md object-cover bg-[#0f0f0f] ${className}`}
        muted
        playsInline
        loop
        preload="metadata"
        aria-label="Демонстрация"
      />
    )
  }

  return (
    <a
      href={media.src}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex shrink-0 items-center justify-center rounded-md bg-[#ecf3fc] text-[#2d81e0] ${className}`}
      title="Открыть видео"
      aria-label="Открыть видео"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M8 5v14l11-7L8 5z" />
      </svg>
    </a>
  )
}
