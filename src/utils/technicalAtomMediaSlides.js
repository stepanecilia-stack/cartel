import {
  atomDetailWebmSrc,
  atomHasAnyWebm,
  atomMainWebmSrc,
  resolveTechnicalAtomMedia,
} from './technicalAtomMedia.js'

export const ATOM_MEDIA_SLIDE_LABELS = {
  demo: 'Демонстрация',
  detail: 'Подробное объяснение',
}

/** Атом только с WebM второго слайда (подробное объяснение). */
export function buildAtomDetailMediaSlice(atom) {
  const media = atom?.media && typeof atom.media === 'object' ? atom.media : {}
  return {
    ...atom,
    media: {
      posterSrc: media.detailPosterSrc ?? null,
      webmSrc: media.detailWebmSrc ?? null,
    },
  }
}

/**
 * @param {object} atom
 * @param {string} webmSrc
 * @param {string | null | undefined} [posterSrc]
 */
function atomWithWebm(atom, webmSrc, posterSrc = null) {
  return {
    ...atom,
    media: {
      ...(atom.media ?? {}),
      webmSrc,
      posterSrc: posterSrc ?? atom.media?.posterSrc ?? null,
    },
  }
}

/**
 * Слайды карусели: два WebM при наличии хотя бы одного ролика.
 * Второй слайд — detailWebmSrc или повтор первого.
 * @returns {Array<{ key: string, label: string, atom: object, media: ReturnType<typeof resolveTechnicalAtomMedia>, defaultMuted?: boolean, showSoundToggle?: boolean, showSpeedToggle?: boolean }>}
 */
export function resolveTechnicalAtomMediaSlides(atom) {
  const mainWebm = atomMainWebmSrc(atom)
  const detailWebm = atomDetailWebmSrc(atom)

  if (!atomHasAnyWebm(atom)) {
    return [
      {
        key: 'demo',
        label: ATOM_MEDIA_SLIDE_LABELS.demo,
        atom,
        media: resolveTechnicalAtomMedia(atom),
      },
    ]
  }

  const visualAtom = mainWebm ? atom : atomWithWebm(atom, detailWebm, atom.media?.detailPosterSrc)
  const logicAtom = detailWebm ? buildAtomDetailMediaSlice(atom) : atomWithWebm(atom, mainWebm)

  return [
    {
      key: 'demo',
      label: ATOM_MEDIA_SLIDE_LABELS.demo,
      atom: visualAtom,
      media: resolveTechnicalAtomMedia(visualAtom),
      defaultMuted: true,
      showSoundToggle: false,
      showSpeedToggle: false,
    },
    {
      key: 'detail',
      label: ATOM_MEDIA_SLIDE_LABELS.detail,
      atom: logicAtom,
      media: resolveTechnicalAtomMedia(logicAtom),
      defaultMuted: false,
      showSoundToggle: true,
      showSpeedToggle: true,
    },
  ]
}

/** Отдельный WebM для второго слайда (не повтор первого). */
export function atomHasDetailMediaSlide(atom) {
  return Boolean(atomDetailWebmSrc(atom))
}
