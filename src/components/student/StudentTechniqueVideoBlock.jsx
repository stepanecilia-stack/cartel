import { useEffect, useState } from 'react'
import TechnicalAtomMedia from '../TechnicalAtomMedia.jsx'
import KnowledgeVideoCornerBadges, {
  resolveKnowledgeBadgeKeysForSlide,
} from './KnowledgeVideoCornerBadges.jsx'

/**
 * Один ролик с подписью — без карусели и перелистывания.
 * @param {{
 *   slide: {
 *     key: string,
 *     label: string,
 *     atom: object,
 *     defaultMuted?: boolean,
 *     showSoundToggle?: boolean,
 *     showSpeedToggle?: boolean,
 *     media?: { kind?: string },
 *   } | null | undefined,
 *   playing?: boolean,
 *   onPlayingChange?: (playing: boolean) => void,
 *   className?: string,
 *   autoPlayWebm?: boolean,
 *   badgeKeys?: string[],
 * }} props
 */
export default function StudentTechniqueVideoBlock({
  slide,
  playing: playingProp,
  onPlayingChange: onPlayingChangeProp,
  className = 'h-[min(52dvh,440px)] w-full',
  autoPlayWebm = true,
  badgeKeys: badgeKeysProp,
}) {
  const [playingInternal, setPlayingInternal] = useState(false)
  const controlled = typeof onPlayingChangeProp === 'function'
  const playing = controlled ? Boolean(playingProp) : playingInternal
  const onPlayingChange = controlled ? onPlayingChangeProp : setPlayingInternal

  useEffect(() => {
    if (!slide) return
    if (autoPlayWebm && slide.media?.kind === 'webm') {
      onPlayingChange(true)
    } else if (!controlled) {
      setPlayingInternal(false)
    }
  }, [slide?.key, slide?.media?.kind, autoPlayWebm, controlled, onPlayingChange])

  const badgeKeys = badgeKeysProp ?? (slide ? resolveKnowledgeBadgeKeysForSlide(slide.key) : [])

  if (!slide) return null

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-[#2c2d2e]">{slide.label}</p>
      <div className="relative w-full overflow-hidden rounded-lg bg-[#0f0f0f]">
        <KnowledgeVideoCornerBadges imageKeys={badgeKeys} />
        <TechnicalAtomMedia
          atom={slide.atom}
          className={className}
          playing={playing}
          onTogglePlay={() => onPlayingChange(!playing)}
          previewable
          videoFit="contain"
          showSoundToggle={slide.showSoundToggle ?? false}
          showSpeedToggle={slide.showSpeedToggle ?? false}
          defaultMuted={slide.defaultMuted ?? true}
          carouselSlide
          title={slide.label}
        />
      </div>
    </div>
  )
}
