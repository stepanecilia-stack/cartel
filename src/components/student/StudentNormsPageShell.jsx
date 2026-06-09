/**
 * Оболочка страницы нормативов.
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export default function StudentNormsPageShell({ children, className = '' }) {
  return <div className={`min-h-[100dvh] bg-[#edeef0] ${className}`}>{children}</div>
}
