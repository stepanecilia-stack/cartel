/**
 * @param {{ media?: { gifSrc?: string | null; webmSrc?: string | null }; embedUrl?: string; videoLink?: string }} atom
 */
export function resolveTechnicalAtomMedia(atom) {
  const media = atom?.media && typeof atom.media === 'object' ? atom.media : {}
  const gif = typeof media.gifSrc === 'string' ? media.gifSrc.trim() : ''
  const webm = typeof media.webmSrc === 'string' ? media.webmSrc.trim() : ''
  const poster = typeof media.posterSrc === 'string' ? media.posterSrc.trim() : ''
  const embed = typeof atom.embedUrl === 'string' ? atom.embedUrl.trim() : ''
  const link = typeof atom.videoLink === 'string' ? atom.videoLink.trim() : ''

  if (gif) return { kind: 'gif', src: gif, poster: '' }
  if (webm) return { kind: 'webm', src: webm, poster }
  if (embed) return { kind: 'embed', src: embed }
  if (link) return { kind: 'link', src: link }
  return { kind: 'none', src: '' }
}

/** GIF / WebM — автопревью в карточке тренировки. */
export function hasLoopingPreviewMedia(atom) {
  const kind = resolveTechnicalAtomMedia(atom).kind
  return kind === 'gif' || kind === 'webm'
}
