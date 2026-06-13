export const BRIDGE_DELIVERED_PREFIX = '__BRIDGE_DELIVERED__:'

/**
 * @param {string} text
 * @param {string} [at]
 */
export function buildBridgeDeliveredChatContent(text, at = new Date().toISOString()) {
  return `${BRIDGE_DELIVERED_PREFIX}${JSON.stringify({ text: String(text ?? ''), at })}`
}

/**
 * @param {string} content
 * @returns {{ text: string, at: string } | null}
 */
export function parseBridgeDeliveredChatContent(content) {
  const raw = String(content ?? '')
  if (!raw.startsWith(BRIDGE_DELIVERED_PREFIX)) return null
  try {
    const parsed = JSON.parse(raw.slice(BRIDGE_DELIVERED_PREFIX.length))
    const text = String(parsed?.text ?? '').trim()
    if (!text) return null
    return {
      text,
      at: typeof parsed.at === 'string' ? parsed.at : new Date().toISOString(),
    }
  } catch {
    return null
  }
}
