import { useCallback, useEffect, useRef, useState } from 'react'
import TechnicalAtomMedia from './TechnicalAtomMedia.jsx'
import { resolveTechnicalAtomMediaSlides } from '../utils/technicalAtomMediaSlides.js'

/**
 * Горизонтальная карусель: демонстрация → подробное видео (если задано в каталоге).
 * @param {{
 *   atom: object,
 *   className?: string,
 *   playing?: boolean,
 *   onPlayingChange?: (playing: boolean) => void,
 *   previewable?: boolean,
 *   autoPlay?: boolean,
 * }} props
 */
export default function TechnicalAtomMediaCarousel({
  atom,
  className = '',
  playing = false,
  onPlayingChange,
  previewable = true,
  autoPlay = false,
}) {
  const slides = resolveTechnicalAtomMediaSlides(atom)
  const scrollRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const slideHasWebm = useCallback((index) => slides[index]?.media?.kind === 'webm', [slides])

  useEffect(() => {
    setActiveIndex(0)
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
    if (autoPlay && slideHasWebm(0)) {
      onPlayingChange?.(true)
    } else {
      onPlayingChange?.(false)
    }
  }, [atom?.id, autoPlay, onPlayingChange, slideHasWebm])

  useEffect(() => {
    if (!autoPlay) return
    if (slideHasWebm(activeIndex)) {
      onPlayingChange?.(true)
    } else {
      onPlayingChange?.(false)
    }
  }, [activeIndex, autoPlay, onPlayingChange, slideHasWebm])

  const scrollToIndex = useCallback((index) => {
    const el = scrollRef.current
    if (!el) return
    const next = Math.max(0, Math.min(index, slides.length - 1))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setActiveIndex(next)
    if (autoPlay && slides[next]?.media?.kind === 'webm') {
      onPlayingChange?.(true)
    } else {
      onPlayingChange?.(false)
    }
  }, [slides, autoPlay, onPlayingChange])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    if (next !== activeIndex) {
      setActiveIndex(next)
      if (autoPlay && slides[next]?.media?.kind === 'webm') {
        onPlayingChange?.(true)
      } else {
        onPlayingChange?.(false)
      }
    }
  }, [activeIndex, autoPlay, onPlayingChange, slides])

  if (slides.length <= 1) {
    return (
      <TechnicalAtomMedia
        atom={atom}
        className={className}
        playing={playing}
        onTogglePlay={() => onPlayingChange?.(!playing)}
        previewable={previewable}
        videoFit="contain"
        showSoundToggle
      />
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label={`Медиа: ${atom?.name ?? 'приём'}`}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.key}
            className="w-full shrink-0 snap-center"
            aria-hidden={index !== activeIndex}
          >
            <TechnicalAtomMedia
              atom={slide.atom}
              className={className}
              playing={playing && activeIndex === index}
              onTogglePlay={() => {
                if (activeIndex !== index) scrollToIndex(index)
                onPlayingChange?.(!(playing && activeIndex === index))
              }}
              previewable={previewable}
              title={slide.label}
              videoFit="contain"
              showSoundToggle
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <button
          type="button"
          disabled={activeIndex <= 0}
          onClick={() => scrollToIndex(activeIndex - 1)}
          className="min-w-[2rem] rounded-md px-2 py-1 text-[12px] font-medium text-[#2d81e0] disabled:opacity-30"
          aria-label="Предыдущее видео"
        >
          ‹
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => scrollToIndex(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === activeIndex ? 'bg-[#2d81e0]' : 'bg-[#d3d9de]'
                }`}
                aria-label={`${slide.label}, ${index + 1} из ${slides.length}`}
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
          <p className="truncate text-center text-[11px] font-medium text-[#818c99]">
            {slides[activeIndex]?.label} · {activeIndex + 1}/{slides.length}
          </p>
        </div>
        <button
          type="button"
          disabled={activeIndex >= slides.length - 1}
          onClick={() => scrollToIndex(activeIndex + 1)}
          className="min-w-[2rem] rounded-md px-2 py-1 text-[12px] font-medium text-[#2d81e0] disabled:opacity-30"
          aria-label="Следующее видео"
        >
          ›
        </button>
      </div>
      <p className="px-0.5 text-center text-[10px] text-[#aeb7c2]">Смахните влево — подробное объяснение</p>
    </div>
  )
}
