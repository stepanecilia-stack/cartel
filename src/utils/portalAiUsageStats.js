/**
 * @typedef {{
 *   inputTokens: number,
 *   outputTokens: number,
 *   totalTokens: number,
 *   chatCalls: number,
 *   memoryCalls: number,
 *   estimatedUsd: number,
 *   updatedAt?: unknown,
 *   monthKey?: string,
 *   lastModelId?: string,
 * }} PortalAiUsageStats
 */

/** @param {unknown} raw */
export function normalizePortalAiUsageStats(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      chatCalls: 0,
      memoryCalls: 0,
      estimatedUsd: 0,
    }
  }
  const o = /** @type {Record<string, unknown>} */ (raw)
  return {
    inputTokens: Number(o.inputTokens) || 0,
    outputTokens: Number(o.outputTokens) || 0,
    totalTokens: Number(o.totalTokens) || 0,
    chatCalls: Number(o.chatCalls) || 0,
    memoryCalls: Number(o.memoryCalls) || 0,
    estimatedUsd: Number(o.estimatedUsd) || 0,
    updatedAt: o.updatedAt ?? null,
    monthKey: typeof o.monthKey === 'string' ? o.monthKey : undefined,
    lastModelId: typeof o.lastModelId === 'string' ? o.lastModelId : undefined,
  }
}
