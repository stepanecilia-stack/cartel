import { getProgramTierCoverSrcForAtom } from './technicalProgramTierCovers.js'

/** @param {unknown} value */
export function trimAtomWebmSrc(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * @param {object | null | undefined} atom
 */
export function atomMainWebmSrc(atom) {
  return trimAtomWebmSrc(atom?.media?.webmSrc)
}

/**
 * @param {object | null | undefined} atom
 */
export function atomDetailWebmSrc(atom) {
  return trimAtomWebmSrc(atom?.media?.detailWebmSrc)
}

/**
 * @param {object | null | undefined} atom
 */
export function atomHasAnyWebm(atom) {
  return Boolean(atomMainWebmSrc(atom) || atomDetailWebmSrc(atom))
}

/**
 * @param {{ media?: { webmSrc?: string | null, posterSrc?: string | null } }} atom
 * @param {{ tierCoverSrc?: string | null }} [options]
 */
export function resolveTechnicalAtomMedia(atom, options = {}) {
  const media = atom?.media && typeof atom.media === 'object' ? atom.media : {}
  const webm = trimAtomWebmSrc(media.webmSrc)
  const poster = trimAtomWebmSrc(media.posterSrc)
  const tierCover =
    (typeof options.tierCoverSrc === 'string' ? options.tierCoverSrc.trim() : '') ||
    getProgramTierCoverSrcForAtom(atom) ||
    ''

  if (webm) return { kind: 'webm', src: webm, tierCoverSrc: tierCover || null }
  if (poster) return { kind: 'poster', src: poster }
  if (tierCover) return { kind: 'poster', src: tierCover }
  return { kind: 'none', src: '' }
}

/** WebM — воспроизведение по нажатию (без превью-кадра на карточке). */
export function hasLoopingPreviewMedia(atom) {
  return resolveTechnicalAtomMedia(atom).kind === 'webm'
}
