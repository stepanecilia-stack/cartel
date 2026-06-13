/**
 * Цитата в стиле Telegram: вертикальная полоска + фон.
 * @param {{ text: string, label?: string, className?: string }} props
 */
export default function CoachBridgeQuote({ text, label = '', className = '' }) {
  return (
    <blockquote
      className={`relative overflow-hidden rounded-r-lg border-l-[3px] border-[#2d81e0] bg-[#eef0f3] py-2 pl-3 pr-2.5 ${className}`}
    >
      {label ? (
        <p className="mb-0.5 text-[12px] font-semibold leading-tight text-[#2d81e0]">{label}</p>
      ) : null}
      <p className="whitespace-pre-wrap text-[14px] leading-snug text-[#2c2d2e]">{text}</p>
    </blockquote>
  )
}
