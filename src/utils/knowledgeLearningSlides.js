import { atomDetailWebmSrc, resolveTechnicalAtomMedia } from './technicalAtomMedia.js'
import { buildAtomDetailMediaSlice } from './technicalAtomMediaSlides.js'

export const KNOWLEDGE_SLIDE_LABELS = {
  visual: 'Зрительный образ',
  visualLogic: 'Зрительный + логический',
}

/**
 * Два слайда «Знания»: сначала чисто зрительный, затем зрительный + логический (со звуком).
 * @param {object} atom
 */
export function resolveKnowledgeLearningSlides(atom) {
  const visualAtom = atom
  const logicAtom = atomDetailWebmSrc(atom) ? buildAtomDetailMediaSlice(atom) : atom

  return [
    {
      key: 'visual',
      label: KNOWLEDGE_SLIDE_LABELS.visual,
      atom: visualAtom,
      media: resolveTechnicalAtomMedia(visualAtom),
      defaultMuted: true,
      showSoundToggle: false,
      showSpeedToggle: false,
    },
    {
      key: 'visual-logic',
      label: KNOWLEDGE_SLIDE_LABELS.visualLogic,
      atom: logicAtom,
      media: resolveTechnicalAtomMedia(logicAtom),
      defaultMuted: false,
      showSoundToggle: true,
      showSpeedToggle: true,
    },
  ]
}
