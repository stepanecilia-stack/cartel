import { useMemo } from 'react'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import StudentTechniqueVideoBlock from './StudentTechniqueVideoBlock.jsx'

/**
 * Оба ролика «Знания» друг под другом — без карусели.
 * @param {{ atom: object, className?: string }} props
 */
export default function StudentAtomStudyVideos({ atom, className = 'h-[min(40dvh,360px)] w-full' }) {
  const slides = useMemo(() => resolveKnowledgeLearningSlides(atom), [atom])

  return (
    <div className="space-y-4">
      {slides.map((slide) => (
        <StudentTechniqueVideoBlock
          key={slide.key}
          slide={slide}
          className={className}
          autoPlayWebm={false}
        />
      ))}
    </div>
  )
}
