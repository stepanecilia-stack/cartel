import { resolveTechnicalAtomMedia } from './technicalAtomMedia.js'

export const ATOM_MEDIA_SLIDE_LABELS = {
  demo: 'Демонстрация',
  detail: 'Подробное объяснение',
}

/** Атом только с медиа второго слайда (подробное объяснение). */
export function buildAtomDetailMediaSlice(atom) {
  const media = atom?.media && typeof atom.media === 'object' ? atom.media : {}
  return {
    ...atom,
    videoLink: typeof media.detailVideoLink === 'string' ? media.detailVideoLink.trim() : '',
    embedUrl: typeof media.detailEmbedUrl === 'string' ? media.detailEmbedUrl.trim() : '',
    media: {
      posterSrc: media.detailPosterSrc ?? null,
      webmSrc: media.detailWebmSrc ?? null,
    },
  }
}

/**
 * Слайды карусели атома: демонстрация + (опционально) подробное видео.
 * @returns {Array<{ key: string, label: string, atom: object, media: ReturnType<typeof resolveTechnicalAtomMedia> }>}
 */
export function resolveTechnicalAtomMediaSlides(atom) {
  const mainMedia = resolveTechnicalAtomMedia(atom)
  const slides = [
    {
      key: 'demo',
      label: ATOM_MEDIA_SLIDE_LABELS.demo,
      atom,
      media: mainMedia,
    },
  ]

  const detailAtom = buildAtomDetailMediaSlice(atom)
  const detailMedia = resolveTechnicalAtomMedia(detailAtom)
  if (detailMedia.kind !== 'none') {
    slides.push({
      key: 'detail',
      label: ATOM_MEDIA_SLIDE_LABELS.detail,
      atom: detailAtom,
      media: detailMedia,
    })
  }

  return slides
}

export function atomHasDetailMediaSlide(atom) {
  return resolveTechnicalAtomMediaSlides(atom).length > 1
}
