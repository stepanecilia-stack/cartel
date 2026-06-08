/** Синхронно с functions/portalAiUsage.js — Vertex Gemini 2.5 Flash. */
export const PORTAL_AI_INPUT_USD_PER_M = 0.3
export const PORTAL_AI_OUTPUT_USD_PER_M = 2.5
export const PORTAL_AI_USD_TO_RUB = 95

/**
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
export function estimatePortalAiUsd(inputTokens, outputTokens) {
  const input = Number(inputTokens) || 0
  const output = Number(outputTokens) || 0
  return (input * PORTAL_AI_INPUT_USD_PER_M + output * PORTAL_AI_OUTPUT_USD_PER_M) / 1_000_000
}

/** @param {number} usd */
export function formatPortalAiUsd(usd) {
  const n = Number(usd) || 0
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}

/** @param {number} usd */
export function formatPortalAiRub(usd) {
  const rub = (Number(usd) || 0) * PORTAL_AI_USD_TO_RUB
  if (rub < 1) return `${rub.toFixed(2)} ₽`
  return `${rub.toFixed(0)} ₽`
}

/** @param {number | null | undefined} n */
export function formatTokenCount(n) {
  const v = Number(n) || 0
  return v.toLocaleString('ru-RU')
}

export function currentPortalAiMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}
