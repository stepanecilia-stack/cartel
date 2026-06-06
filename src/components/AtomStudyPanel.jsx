import { useState } from 'react'
import TechnicalAtomMediaCarousel from './TechnicalAtomMediaCarousel.jsx'
import AtomBookSheet from './student/AtomBookSheet.jsx'

/**
 * Карусель + книжный лист — единый блок просмотра атома (ученик / тренер).
 * @param {{
 *   atom: object,
 *   playing?: boolean,
 *   onPlayingChange?: (playing: boolean) => void,
 *   autoPlay?: boolean,
 *   carouselClassName?: string,
 * }} props
 */
export default function AtomStudyPanel({
  atom,
  playing: playingProp,
  onPlayingChange: onPlayingChangeProp,
  autoPlay = true,
  carouselClassName = 'h-[min(72dvh,680px)] w-full',
}) {
  const [playingInternal, setPlayingInternal] = useState(false)
  const controlled = typeof onPlayingChangeProp === 'function'
  const playing = controlled ? Boolean(playingProp) : playingInternal
  const onPlayingChange = controlled ? onPlayingChangeProp : setPlayingInternal

  if (!atom) return null

  return (
    <div className="space-y-3">
      <div className="w-full overflow-hidden rounded-lg bg-[#0f0f0f]">
        <TechnicalAtomMediaCarousel
          atom={atom}
          className={carouselClassName}
          playing={playing}
          onPlayingChange={onPlayingChange}
          previewable
          autoPlay={autoPlay}
        />
      </div>
      <AtomBookSheet
        number={atom.number}
        name={atom.name}
        description={atom.howTo}
        chainPreview={atom.chainPreview}
      />
    </div>
  )
}
