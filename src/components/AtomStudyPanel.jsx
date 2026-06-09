import StudentAtomStudyVideos from './student/StudentAtomStudyVideos.jsx'

/**
 * Повторный просмотр пройденного элемента — оба ролика + ряд образов.
 * @param {{ atom: object }} props
 */
export default function AtomStudyPanel({ atom }) {
  if (!atom) return null
  return <StudentAtomStudyVideos atom={atom} />
}
