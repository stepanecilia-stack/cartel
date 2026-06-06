import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TechnicalAtomMedia from './TechnicalAtomMedia.jsx'
import { resolveTechnicalAtomMediaSlides } from '../utils/technicalAtomMediaSlides.js'

function CarouselNavButton({ direction, disabled, onClick, label }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2d81e0] bg-white text-[#2d81e0] shadow-md transition-transform active:scale-95 disabled:border-[#d3d9de] disabled:bg-[#f0f2f5] disabled:text-[#aeb7c2] disabled:shadow-none sm:h-12 sm:w-12"
      aria-label={label}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6" aria-hidden>
        {direction === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  )
}

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
  const slides = useMemo(() => resolveTechnicalAtomMediaSlides(atom), [atom])
  const scrollRef = useRef(null)
  const onPlayingChangeRef = useRef(onPlayingChange)
  const [activeIndex, setActiveIndex] = useState(0)

  onPlayingChangeRef.current = onPlayingChange

  const syncPlaybackForIndex = useCallback(
    (index) => {
      if (!autoPlay) return
      const kind = slides[index]?.media?.kind
      onPlayingChangeRef.current?.(kind === 'webm')
    },
    [autoPlay, slides],
  )

  useEffect(() => {
    setActiveIndex(0)
    const el = scrollRef.current
    if (el) el.scrollLeft = 0
    if (autoPlay) {
      onPlayingChangeRef.current?.(slides[0]?.media?.kind === 'webm')
    } else {
      onPlayingChangeRef.current?.(false)
    }
  }, [atom?.id, autoPlay, slides])

  const scrollToIndex = useCallback(
    (index) => {
      const el = scrollRef.current
      if (!el) return
      const next = Math.max(0, Math.min(index, slides.length - 1))
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
      setActiveIndex(next)
      syncPlaybackForIndex(next)
    },
    [slides.length, syncPlaybackForIndex],
  )

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    setActiveIndex((prev) => {
      if (next === prev) return prev
      syncPlaybackForIndex(next)
      return next
    })
  }, [syncPlaybackForIndex])

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

  const atStart = activeIndex <= 0
  const atEnd = activeIndex >= slides.length - 1
  const viewportClass = className || 'h-[min(72dvh,680px)] w-full'

  return (
    <div className="space-y-3">
      <div className={`relative ${viewportClass}`}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: 'pan-x pinch-zoom' }}
          aria-roledescription="carousel"
          aria-label={`Медиа: ${atom?.name ?? 'приём'}`}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.key}
              className="flex min-h-full min-w-full shrink-0 snap-center snap-always items-stretch"
              aria-hidden={index !== activeIndex}
            >
              <TechnicalAtomMedia
                atom={slide.atom}
                className="h-full w-full"
                playing={playing && activeIndex === index}
                onTogglePlay={() => {
                  if (activeIndex !== index) scrollToIndex(index)
                  onPlayingChange?.(!(playing && activeIndex === index))
                }}
                previewable={previewable}
                title={slide.label}
                videoFit="contain"
                showSoundToggle
                carouselSlide
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={atStart}
          onClick={() => scrollToIndex(activeIndex - 1)}
          className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 sm:inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/90 bg-[#2d81e0]/95 text-white shadow-lg disabled:pointer-events-none disabled:opacity-0"
          aria-label="Предыдущее видео"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          disabled={atEnd}
          onClick={() => scrollToIndex(activeIndex + 1)}
          className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 sm:inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/90 bg-[#2d81e0]/95 text-white shadow-lg disabled:pointer-events-none disabled:opacity-0"
          aria-label="Следующее видео"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="rounded-xl border border-[#e7e8ec] bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <CarouselNavButton
            direction="prev"
            disabled={atStart}
            onClick={() => scrollToIndex(activeIndex - 1)}
            label="Предыдущее видео"
          />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  className={`rounded-full transition-all ${
                    index === activeIndex
                      ? 'h-3 w-8 bg-[#2d81e0] shadow-sm'
                      : 'h-3 w-3 bg-[#c5ccd3] hover:bg-[#aeb7c2]'
                  }`}
                  aria-label={`${slide.label}, ${index + 1} из ${slides.length}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                />
              ))}
            </div>
            <p className="truncate text-center text-[13px] font-semibold text-[#2c2d2e]">
              {slides[activeIndex]?.label}
            </p>
            <p className="text-center text-[11px] font-medium text-[#818c99]">
              {activeIndex + 1} из {slides.length} · смахните влево
            </p>
          </div>
          <CarouselNavButton
            direction="next"
            disabled={atEnd}
            onClick={() => scrollToIndex(activeIndex + 1)}
            label="Следующее видео"
          />
        </div>
      </div>
    </div>
  )
}
