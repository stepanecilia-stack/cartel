import { getProgramTierCoverSrcForAtom } from './technicalProgramTierCovers.js'

/**
 * @param {{ media?: { webmSrc?: string | null }; embedUrl?: string; videoLink?: string }} atom
 * @param {{ tierCoverSrc?: string | null }} [options]
 */
export function resolveTechnicalAtomMedia(atom, options = {}) {
  const media = atom?.media && typeof atom.media === 'object' ? atom.media : {}
  const webm = typeof media.webmSrc === 'string' ? media.webmSrc.trim() : ''
  const embed = typeof atom.embedUrl === 'string' ? atom.embedUrl.trim() : ''
  const link = typeof atom.videoLink === 'string' ? atom.videoLink.trim() : ''
  const tierCover =
    (typeof options.tierCoverSrc === 'string' ? options.tierCoverSrc.trim() : '') ||
    getProgramTierCoverSrcForAtom(atom) ||
    ''

  if (webm) return { kind: 'webm', src: webm, tierCoverSrc: tierCover || null }
  if (embed) return { kind: 'embed', src: embed }
  if (link) return { kind: 'link', src: link }
  if (tierCover) return { kind: 'poster', src: tierCover }
  return { kind: 'none', src: '' }
}

/** WebM — воспроизведение по нажатию (без превью-кадра на карточке). */
export function hasLoopingPreviewMedia(atom) {
  return resolveTechnicalAtomMedia(atom).kind === 'webm'
}
