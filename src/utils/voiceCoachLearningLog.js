const STORAGE_KEY = 'cartel_voice_learning_log_v1'
const MAX_ENTRIES = 120

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeAll(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ENTRIES)))
  } catch {
    /* quota */
  }
}

/**
 * @param {object} entry
 * @param {string} entry.ts ISO
 * @param {string} entry.transcript
 * @param {object} [entry.intent]
 * @param {string} entry.outcome — executed | clarify | error | cancelled
 * @param {string} [entry.detail]
 * @param {object} [entry.confidence] — числа 0..1 для отладки
 */
export function appendVoiceCoachLog(entry) {
  if (typeof window === 'undefined') return
  const row = {
    ts: entry.ts || new Date().toISOString(),
    transcript: String(entry.transcript ?? ''),
    intent: entry.intent && typeof entry.intent === 'object' ? entry.intent : null,
    outcome: String(entry.outcome ?? 'unknown'),
    detail: entry.detail != null ? String(entry.detail) : '',
    confidence: entry.confidence && typeof entry.confidence === 'object' ? entry.confidence : null,
  }
  const next = [...readAll(), row]
  writeAll(next)
}

export function getVoiceCoachLogs() {
  if (typeof window === 'undefined') return []
  return readAll()
}

export function clearVoiceCoachLogs() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
