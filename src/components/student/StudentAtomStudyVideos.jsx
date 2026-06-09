import { useMemo } from 'react'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import StudentTechniqueVideoBlock from './StudentTechniqueVideoBlock.jsx'

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
    </div>
  )
}
