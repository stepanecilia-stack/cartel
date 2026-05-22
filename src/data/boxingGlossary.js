/**
 * Сокращения из «Плана подготовки» / Альманаха (Филимонов, Степанец).
 * @type {Record<string, string>}
 */
export const BOXING_GLOSSARY = {
  ОФП: 'Общая физическая подготовка',
  СФП: 'Специальная физическая подготовка',
  СТТМ: 'Совершенствование техники тактического мастерства',
  ССР: 'Скоростно-силовая работа',
  ОРУ: 'Общеразвивающие упражнения',
  ССУ: 'Скоростно-силовые упражнения',
}

/** @type {RegExp} */
export const BOXING_GLOSSARY_PATTERN = /(ОФП|СФП|СТТМ|ССР|ОРУ|ССУ)/g

/**
 * @param {string} text
 * @returns {Array<{ type: 'text' | 'abbr', value: string }>}
 */
export function splitGlossaryText(text) {
  if (!text || typeof text !== 'string') return [{ type: 'text', value: '' }]
  const parts = []
  let last = 0
  for (const m of text.matchAll(BOXING_GLOSSARY_PATTERN)) {
    const idx = m.index ?? 0
    if (idx > last) parts.push({ type: 'text', value: text.slice(last, idx) })
    parts.push({ type: 'abbr', value: m[0] })
    last = idx + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  if (parts.length === 0) parts.push({ type: 'text', value: text })
  return parts
}

/** @param {string} token */
export function glossaryTip(token) {
  return BOXING_GLOSSARY[token] ?? null
}
