import StudentAtomStudyVideos from './student/StudentAtomStudyVideos.jsx'

/**
 * Ролики элемента — без карусели (кабинет ученика).
 * @param {{
 *   atom: object,
 *   playing?: boolean,
 *   onPlayingChange?: (playing: boolean) => void,
 *   autoPlay?: boolean,
 *   carouselClassName?: string,
 * }} props
 */
export default function AtomStudyPanel({
  atom,
  carouselClassName = 'h-[min(40dvh,360px)] w-full',
}) {
  if (!atom) return null

  return <StudentAtomStudyVideos atom={atom} className={carouselClassName} />
}
