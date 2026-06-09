import { useMemo } from 'react'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import StudentKnowledgeImageRow from './StudentKnowledgeImageRow.jsx'
import StudentTechniqueVideoBlock from './StudentTechniqueVideoBlock.jsx'

/** Все три образа подсвечены при повторном просмотре пройденного материала. */
const REVIEW_KNOWLEDGE_KEYS = ['vision', 'logic', 'kinesthesia']

/**
 * Оба ролика «Знания» — тот же портретный плеер, что в пошаговом инструктораже.
 * @param {{ atom: object }} props
 */
export default function StudentAtomStudyVideos({ atom }) {
  const slides = useMemo(() => resolveKnowledgeLearningSlides(atom), [atom])

  return (
    <div className="space-y-3">
      {slides.map((slide) => (
        <StudentTechniqueVideoBlock
          key={slide.key}
          slide={slide}
          autoPlayWebm={false}
          showLabel={slides.length > 1}
        />
      ))}
      <StudentKnowledgeImageRow activeKeys={REVIEW_KNOWLEDGE_KEYS} />
    </div>
  )
}
