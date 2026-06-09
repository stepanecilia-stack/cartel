/** @param {{ kind: 'vision' | 'logic' | 'kinesthesia', className?: string }} props */
export default function KnowledgeImageIcon({ kind, className = '' }) {
  if (kind === 'vision') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <path
          d="M12 4.75C7.2 4.75 3.75 8.6 3.75 12c0 3.4 3.45 7.25 8.25 7.25S20.25 15.4 20.25 12C20.25 8.6 16.8 4.75 12 4.75Z"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.65" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    )
  }

  if (kind === 'logic') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <path
          d="M8.25 6.25C6.4 7.1 5.25 8.85 5.25 11c0 1.55.55 2.85 1.55 3.75-.75.75-1.2 1.85-1 3 .25 1.55 1.55 2.75 3.45 3H12"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.75 6.25c1.85.85 3 2.6 3 4.75 0 1.55-.55 2.85-1.55 3.75.75.75 1.2 1.85 1 3-.25 1.55-1.55 2.75-3.45 3H12"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 5.5v14" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path
          d="M8 10.25c.85.55 1.75.7 2.65.35M7.35 13.25c1.1.65 2.35.75 3.4.2"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <path
          d="M16 10.25c-.85.55-1.75.7-2.65.35M16.65 13.25c-1.1.65-2.35.75-3.4.2"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <path d="M10.25 19.25h3.5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="5.25" r="2.15" stroke="currentColor" strokeWidth="1.55" />
      <path d="M12 7.4v4.8" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path
        d="M7.75 11.25 12 13.75 16.25 11.25"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.75 13.75 8.25 18.75" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M14.25 13.75 15.75 18.75" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M11.25 18.75h1.5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path
        d="M8.75 10.5c-.75.85-.75 2 0 2.85M15.25 10.5c.75.85.75 2 0 2.85"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
