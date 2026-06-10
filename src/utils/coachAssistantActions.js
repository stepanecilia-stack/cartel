const MARKER_RE = /\|\|COACH_SAVE_NORM:(\{[\s\S]*?\})\|\|/

/**
 * @param {string} raw
 */
export function parseCoachAssistantMarkers(raw) {
  const text = String(raw ?? '')
  const match = text.match(MARKER_RE)
  if (!match) {
    return { displayReply: text.trim(), normAction: null }
  }
  let normAction = null
  try {
    const parsed = JSON.parse(match[1])
    if (parsed?.studentId && parsed?.resultRaw) {
      normAction = {
        studentId: String(parsed.studentId).trim(),
        testId: String(parsed.testId ?? parsed.testName ?? '').trim(),
        resultRaw: String(parsed.resultRaw).trim(),
      }
    }
  } catch {
    normAction = null
  }
  const displayReply = text.replace(MARKER_RE, '').trim()
  return { displayReply, normAction }
}

/**
 * @param {object[]} allNorms
 * @param {string} testIdOrName
 */
export function resolveNormFromCatalog(allNorms, testIdOrName) {
  const key = String(testIdOrName ?? '').trim().toLowerCase()
  if (!key) return null
  const list = Array.isArray(allNorms) ? allNorms : []
  return (
    list.find((n) => String(n.testId ?? '').toLowerCase() === key) ??
    list.find((n) => String(n.testName ?? '').toLowerCase() === key) ??
    list.find((n) => String(n.testName ?? '').toLowerCase().includes(key)) ??
    null
  )
}
