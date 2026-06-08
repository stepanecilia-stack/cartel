import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TechnicalAtomMedia from './TechnicalAtomMedia.jsx'
import { resolveTechnicalAtomMediaSlides } from '../utils/technicalAtomMediaSlides.js'

const SWIPE_THRESHOLD_PX = 48

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
 *   slides?: Array<{
 *     key: string,
 *     label: string,
 *     atom: object,
 *     media?: object,
 *     defaultMuted?: boolean,
 *     showSoundToggle?: boolean,
 *     showSpeedToggle?: boolean,
 *   }>,
 *   onSlideChange?: (index: number) => void,
 * }} props
 */
export default function TechnicalAtomMediaCarousel({
  atom,
  className = '',
  playing = false,
  onPlayingChange,
  previewable = true,
  autoPlay = false,
  slides: slidesProp = null,
  onSlideChange,
}) {
  const slides = useMemo(
    () => slidesProp ?? resolveTechnicalAtomMediaSlides(atom),
    [atom, slidesProp],
  )
  const onPlayingChangeRef = useRef(onPlayingChange)
  const touchStartXRef = useRef(null)
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
    if (autoPlay) {
      onPlayingChangeRef.current?.(slides[0]?.media?.kind === 'webm')
    } else {
      onPlayingChangeRef.current?.(false)
    }
  }, [atom?.id, autoPlay, slides])

  const goToIndex = useCallback(
    (index) => {
      const next = Math.max(0, Math.min(index, slides.length - 1))
      setActiveIndex(next)
      syncPlaybackForIndex(next)
      onSlideChange?.(next)
    },
    [slides.length, syncPlaybackForIndex, onSlideChange],
  )

  const handleTouchStart = useCallback((event) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
  }, [])

  const handleTouchEnd = useCallback(
    (event) => {
      const startX = touchStartXRef.current
      touchStartXRef.current = null
      if (startX == null) return
      const endX = event.changedTouches[0]?.clientX
      if (endX == null) return
      const delta = endX - startX
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
      if (delta < 0) goToIndex(activeIndex + 1)
      else goToIndex(activeIndex - 1)
    },
    [activeIndex, goToIndex],
  )

  if (slides.length <= 1) {
    return (
      <TechnicalAtomMedia
        atom={atom}
        className={className}
        playing={playing}
        onTogglePlay={() => onPlayingChange?.(!playing)}
        previewable={previewable}
        videoFit="contain"
      />
    )
  }

  const atStart = activeIndex <= 0
  const atEnd = activeIndex >= slides.length - 1
  const viewportClass = className || 'h-[min(72dvh,680px)] w-full'
  const slideSharePct = 100 / slides.length
  const trackOffsetPct = activeIndex * slideSharePct

  return (
    <div className="space-y-3">
      <div
        className={`relative overflow-hidden ${viewportClass}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${trackOffsetPct}%)`,
          }}
          aria-live="polite"
        >
          {slides.map((slide, index) => (
            <div
              key={slide.key}
              className="h-full shrink-0"
              style={{ width: `${slideSharePct}%` }}
              aria-hidden={index !== activeIndex}
            >
              <TechnicalAtomMedia
                atom={slide.atom}
                className="h-full w-full"
                playing={playing && activeIndex === index}
                onTogglePlay={() => {
                  if (activeIndex !== index) goToIndex(index)
                  onPlayingChange?.(!(playing && activeIndex === index))
                }}
                previewable={previewable}
                title={slide.label}
                videoFit="contain"
                showSoundToggle={slide.showSoundToggle ?? slide.key === 'detail'}
                showSpeedToggle={slide.showSpeedToggle ?? slide.key === 'detail'}
                defaultMuted={slide.defaultMuted ?? true}
                carouselSlide
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={atStart}
          onClick={() => goToIndex(activeIndex - 1)}
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
          onClick={() => goToIndex(activeIndex + 1)}
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
            onClick={() => goToIndex(activeIndex - 1)}
            label="Предыдущее видео"
          />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => goToIndex(index)}
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
            onClick={() => goToIndex(activeIndex + 1)}
            label="Следующее видео"
          />
        </div>
      </div>
    </div>
  )
}
