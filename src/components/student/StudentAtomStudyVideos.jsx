import { useMemo } from 'react'
import { resolveKnowledgeLearningSlides } from '../../utils/knowledgeLearningSlides.js'
import StudentTechniqueVideoBlock, {
  STUDENT_TECHNIQUE_VIDEO_CLASS,
} from './StudentTechniqueVideoBlock.jsx'

/**
 * Оба ролика «Знания» друг под другом — без карусели.
 * @param {{ atom: object, className?: string }} props
 */
export default function StudentAtomStudyVideos({ atom, className = STUDENT_TECHNIQUE_VIDEO_CLASS }) {
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
