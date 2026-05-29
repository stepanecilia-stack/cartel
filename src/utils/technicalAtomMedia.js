/**
 * @param {{ media?: { posterSrc?: string | null; webmSrc?: string | null; gifSrc?: string | null }; embedUrl?: string; videoLink?: string }} atom
 */
export function resolveTechnicalAtomMedia(atom) {
  const media = atom?.media && typeof atom.media === 'object' ? atom.media : {}
  const webm = typeof media.webmSrc === 'string' ? media.webmSrc.trim() : ''
  const posterFromField = typeof media.posterSrc === 'string' ? media.posterSrc.trim() : ''
  /** Старые записи с GIF — показываем как постер, без автоплея. */
  const legacyGif = typeof media.gifSrc === 'string' ? media.gifSrc.trim() : ''
  const poster = posterFromField || legacyGif
  const embed = typeof atom.embedUrl === 'string' ? atom.embedUrl.trim() : ''
  const link = typeof atom.videoLink === 'string' ? atom.videoLink.trim() : ''

  if (webm) return { kind: 'webm', src: webm, poster }
  if (poster) return { kind: 'poster', src: poster, poster }
  if (embed) return { kind: 'embed', src: embed, poster: '' }
  if (link) return { kind: 'link', src: link, poster: '' }
  return { kind: 'none', src: '', poster: '' }
}

/** WebM или постер — превью на карточке тренировки. */
export function hasLoopingPreviewMedia(atom) {
  const kind = resolveTechnicalAtomMedia(atom).kind
  return kind === 'webm' || kind === 'poster'
}
