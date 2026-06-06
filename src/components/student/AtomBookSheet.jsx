/**
 * «Книжный лист» под каруселью атома — ощущение открытой книги.
 * @param {{
 *   number?: string | number | null,
 *   name: string,
 *   description?: string | null,
 *   chainPreview?: string | null,
 *   compact?: boolean,
 * }} props
 */
export default function AtomBookSheet({
  number,
  name,
  description = '',
  chainPreview = '',
  compact = false,
}) {
  const text = typeof description === 'string' ? description.trim() : ''
  const chain = typeof chainPreview === 'string' ? chainPreview.trim() : ''
  const numberLabel = number != null && String(number).trim() !== '' ? String(number) : null

  return (
    <div
      className={`relative mx-auto w-full ${compact ? 'max-w-sm' : 'max-w-lg'}`}
      aria-label={name ? `Описание: ${name}` : 'Описание приёма'}
    >
      {/* Тень под «книгой» */}
      <div
        className="pointer-events-none absolute inset-x-3 -bottom-1.5 h-4 rounded-[50%] bg-black/10 blur-md"
        aria-hidden
      />

      <div className="relative flex overflow-hidden rounded-lg shadow-[0_8px_28px_rgba(44,45,46,0.12)] ring-1 ring-[#e8e0d4]">
        {/* Левая страница (форзац) */}
        <div
          className={`relative hidden shrink-0 bg-gradient-to-br from-[#f3ebe0] to-[#ebe3d6] sm:block ${
            compact ? 'w-[28%]' : 'w-[34%]'
          }`}
          aria-hidden
        >
          <div className="absolute inset-y-0 right-0 w-px bg-[#d9cfc0]/80" />
          <div className="absolute inset-y-3 right-0 w-3 bg-gradient-to-l from-black/[0.07] to-transparent" />
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 py-6 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a89882]">
              Cartel
            </span>
            <span className="font-serif text-[11px] leading-snug text-[#8a7968]">Техника</span>
            {numberLabel ? (
              <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#d9cfc0] bg-[#faf6f0]/80 font-serif text-sm font-semibold text-[#6b5a49]">
                {numberLabel}
              </span>
            ) : null}
          </div>
        </div>

        {/* Корешок / сгиб */}
        <div
          className="relative w-2 shrink-0 bg-gradient-to-r from-[#ddd4c8] via-[#f5f0e8] to-[#faf7f2] sm:w-2.5"
          aria-hidden
        >
          <div className="absolute inset-y-0 left-0 w-px bg-white/50" />
          <div className="absolute inset-y-0 right-0 w-px bg-[#d5cbbd]/90" />
        </div>

        {/* Правая страница — заголовок и текст */}
        <div className="relative min-w-0 flex-1 bg-gradient-to-br from-[#fffdf9] via-[#faf7f2] to-[#f5efe6] px-4 py-4 sm:px-5 sm:py-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(transparent, transparent 27px, rgba(180,160,130,0.08) 27px, rgba(180,160,130,0.08) 28px)',
            }}
            aria-hidden
          />

          <div className="relative space-y-3">
            <header className="space-y-1.5 border-b border-[#e8dfd3] pb-3">
              {numberLabel ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89882] sm:hidden">
                  #{numberLabel}
                </p>
              ) : null}
              <h2
                className={`font-serif font-semibold leading-snug text-[#2c241c] ${
                  compact ? 'text-base' : 'text-lg sm:text-xl'
                }`}
              >
                {name}
              </h2>
              {chain ? (
                <p className="text-[11px] font-medium text-[#9a8b7a]">Цепочка: {chain}</p>
              ) : null}
            </header>

            {text ? (
              <p
                className={`whitespace-pre-wrap font-serif leading-relaxed text-[#3d342c] ${
                  compact ? 'text-[13px]' : 'text-[14px] sm:text-[15px]'
                }`}
              >
                {text}
              </p>
            ) : (
              <p className="font-serif text-[13px] italic leading-relaxed text-[#b0a090] sm:text-[14px]">
                Описание скоро появится — тренер добавит его в каталоге техники.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
