import { useEffect, useState } from 'react'
import TechnicalAtomMedia from '../TechnicalAtomMedia.jsx'
import KnowledgeVideoCornerBadges, {
  resolveKnowledgeBadgeKeysForSlide,
} from './KnowledgeVideoCornerBadges.jsx'

/** Портретный ролик — без фиксированной высоты карусели. */
export const STUDENT_TECHNIQUE_VIDEO_CLASS = 'aspect-[9/16] w-full'

/**
 * Один ролик — без карусели и перелистывания.
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
 *   showLabel?: boolean,
 *   showCornerBadges?: boolean,
 * }} props
 */
export default function StudentTechniqueVideoBlock({
  slide,
  playing: playingProp,
  onPlayingChange: onPlayingChangeProp,
  className = STUDENT_TECHNIQUE_VIDEO_CLASS,
  autoPlayWebm = true,
  badgeKeys: badgeKeysProp,
  showLabel = true,
  showCornerBadges = true,
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
    <div className={showLabel ? 'space-y-2' : undefined}>
      {showLabel ? <p className="text-[13px] font-semibold text-[#2c2d2e]">{slide.label}</p> : null}
      <div className="relative mx-auto w-full max-w-[min(100%,17.5rem)] overflow-hidden rounded-xl sm:max-w-xs">
        {showCornerBadges ? <KnowledgeVideoCornerBadges imageKeys={badgeKeys} /> : null}
        <TechnicalAtomMedia
          atom={slide.atom}
          className={className}
          playing={playing}
          onTogglePlay={() => onPlayingChange(!playing)}
          previewable
          videoFit="cover"
          showSoundToggle={slide.showSoundToggle ?? false}
          showSpeedToggle={slide.showSpeedToggle ?? false}
          defaultMuted={slide.defaultMuted ?? true}
          inlinePlayer
          title={slide.label}
        />
      </div>
    </div>
  )
}
