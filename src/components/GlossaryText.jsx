import { memo } from 'react'
import { BOXING_GLOSSARY, splitGlossaryText } from '../data/boxingGlossary.js'

/**
 * Одно сокращение с подсказкой при наведении.
 * @param {{ children: string, className?: string }} props
 */
export function GlossaryAbbr({ children, className = '' }) {
  const token = String(children ?? '').trim()
  const tip = BOXING_GLOSSARY[token]
  if (!tip) return <span className={className}>{children}</span>

  return (
    <span
      className={`group/abbr relative inline cursor-help border-b border-dotted border-[#aeb7c2] ${className}`}
      title={tip}
    >
      {token}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-50 hidden w-max max-w-[min(16rem,70vw)] -translate-x-1/2 rounded-md bg-[#2c2d2e] px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-md group-hover/abbr:block"
      >
        {tip}
      </span>
    </span>
  )
}

/**
 * Текст с автоподсветкой сокращений из глоссария.
 * @param {{ text: string, className?: string, as?: 'span' | 'p' | 'div' }} props
 */
function GlossaryText({ text, className = '', as: Tag = 'span' }) {
  const parts = splitGlossaryText(text)

  return (
    <Tag className={className}>
      {parts.map((part, i) =>
        part.type === 'abbr' ? (
          <GlossaryAbbr key={`${i}-${part.value}`}>{part.value}</GlossaryAbbr>
        ) : (
          <span key={`${i}-t`}>{part.value}</span>
        ),
      )}
    </Tag>
  )
}

export default memo(GlossaryText)
