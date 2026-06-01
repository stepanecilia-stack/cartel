/**
 * @param {{ media?: { webmSrc?: string | null }; embedUrl?: string; videoLink?: string }} atom
 */
export function resolveTechnicalAtomMedia(atom) {
  const media = atom?.media && typeof atom.media === 'object' ? atom.media : {}
  const webm = typeof media.webmSrc === 'string' ? media.webmSrc.trim() : ''
  const embed = typeof atom.embedUrl === 'string' ? atom.embedUrl.trim() : ''
  const link = typeof atom.videoLink === 'string' ? atom.videoLink.trim() : ''

  if (webm) return { kind: 'webm', src: webm }
  if (embed) return { kind: 'embed', src: embed }
  if (link) return { kind: 'link', src: link }
  return { kind: 'none', src: '' }
}

/** WebM — превью на карточке (кадр из видео, без отдельного постера). */
export function hasLoopingPreviewMedia(atom) {
  return resolveTechnicalAtomMedia(atom).kind === 'webm'
}
