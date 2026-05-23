/**
 * @typedef {'boxingPassport' | 'qualificationBook' | 'mriBrain' | 'umo' | 'insurance'} CartelDocumentKey
 */

/**
 * @typedef {Partial<Record<CartelDocumentKey, { done?: boolean, dateISO?: string }>>} CartelDocumentsMap
 */

/** @type {Array<{ key: CartelDocumentKey, label: string, hint?: string, requiresDate?: boolean, validityYears?: number, validityMonths?: number }>} */
export const CARTEL_DOCUMENT_DEFS = [
  { key: 'boxingPassport', label: 'Паспорт боксёра' },
  { key: 'qualificationBook', label: 'Квалификационная книжка' },
  {
    key: 'mriBrain',
    label: 'МРТ головного мозга',
    hint: 'Действует 2 года с даты исследования',
    requiresDate: true,
    validityYears: 2,
  },
  {
    key: 'umo',
    label: 'УМО',
    hint: 'Действует 6 месяцев с даты прохождения',
    requiresDate: true,
    validityMonths: 6,
  },
  { key: 'insurance', label: 'Спортивная страховка' },
]

/**
 * @param {unknown} raw
 * @returns {CartelDocumentsMap}
 */
export function normalizeCartelDocuments(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  /** @type {CartelDocumentsMap} */
  const out = {}
  for (const def of CARTEL_DOCUMENT_DEFS) {
    const row = raw[def.key]
    if (!row || typeof row !== 'object') continue
    const dateISO = typeof row.dateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.dateISO) ? row.dateISO : ''
    out[def.key] = {
      done: Boolean(row.done),
      ...(dateISO ? { dateISO } : {}),
    }
  }
  return out
}

/**
 * @param {string} dateISO
 * @param {{ validityYears?: number, validityMonths?: number }} def
 * @param {Date} [today]
 */
export function isCartelDocumentDateValid(dateISO, def, today = new Date()) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false
  const start = new Date(`${dateISO}T12:00:00`)
  if (Number.isNaN(start.getTime())) return false
  const end = new Date(start)
  if (def.validityYears) {
    end.setFullYear(end.getFullYear() + def.validityYears)
  } else if (def.validityMonths) {
    end.setMonth(end.getMonth() + def.validityMonths)
  } else {
    return true
  }
  const t = today.getTime()
  return t >= start.getTime() && t <= end.getTime()
}

/**
 * @param {CartelDocumentsMap} docs
 * @param {Date} [today]
 */
export function isCartelDocumentComplete(docs, key, today = new Date()) {
  const def = CARTEL_DOCUMENT_DEFS.find((d) => d.key === key)
  if (!def) return false
  const row = docs[key]
  if (!row?.done) return false
  if (def.requiresDate) {
    return isCartelDocumentDateValid(row.dateISO ?? '', def, today)
  }
  return true
}

/**
 * @param {CartelDocumentsMap} docs
 * @param {Date} [today]
 */
export function countCartelDocumentsComplete(docs, today = new Date()) {
  let n = 0
  for (const def of CARTEL_DOCUMENT_DEFS) {
    if (isCartelDocumentComplete(docs, def.key, today)) n += 1
  }
  return n
}
