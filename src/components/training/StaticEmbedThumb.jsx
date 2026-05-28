/** Статичная иконка «есть видео» без iframe — для миниатюр в сетке. */
export default function StaticEmbedThumb({ className = '' }) {
  return (
    <span
      className={`flex h-full w-full items-center justify-center bg-[#ecf3fc] text-[#2d81e0] ${className}`}
      aria-hidden
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7L8 5z" />
      </svg>
    </span>
  )
}
