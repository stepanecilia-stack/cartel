import { FieldValue, getFirestore } from 'firebase-admin/firestore'

/** Vertex AI Gemini 2.5 Flash (USD per 1M tokens). */
export const PORTAL_AI_INPUT_USD_PER_M = 0.3
export const PORTAL_AI_OUTPUT_USD_PER_M = 2.5

/**
 * @param {unknown} payload
 */
export function extractVertexUsage(payload) {
  const meta = payload?.usageMetadata
  if (!meta || typeof meta !== 'object') {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  }
  const inputTokens = Number(meta.promptTokenCount ?? meta.prompt_token_count ?? 0) || 0
  const outputTokens =
    Number(meta.candidatesTokenCount ?? meta.candidates_token_count ?? 0) || 0
  const totalTokens = Number(meta.totalTokenCount ?? meta.total_token_count ?? 0) || inputTokens + outputTokens
  return { inputTokens, outputTokens, totalTokens }
}

/**
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
export function estimatePortalAiUsd(inputTokens, outputTokens) {
  return (inputTokens * PORTAL_AI_INPUT_USD_PER_M + outputTokens * PORTAL_AI_OUTPUT_USD_PER_M) / 1_000_000
}

function currentMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

/**
 * @param {{
 *   kind: 'chat' | 'memory' | 'transcribe',
 *   inputTokens: number,
 *   outputTokens: number,
 *   modelId?: string,
 * }} params
 */
export async function recordPortalAiUsage({ kind, inputTokens, outputTokens, modelId = '' }) {
  const input = Math.max(0, Math.round(Number(inputTokens) || 0))
  const output = Math.max(0, Math.round(Number(outputTokens) || 0))
  if (input === 0 && output === 0) return

  const estimatedUsd = estimatePortalAiUsd(input, output)
  const monthKey = currentMonthKey()
  const db = getFirestore()

  /** @type {Record<string, unknown>} */
  const increments = {
    inputTokens: FieldValue.increment(input),
    outputTokens: FieldValue.increment(output),
    totalTokens: FieldValue.increment(input + output),
    chatCalls: FieldValue.increment(kind === 'chat' ? 1 : 0),
    memoryCalls: FieldValue.increment(kind === 'memory' ? 1 : 0),
    estimatedUsd: FieldValue.increment(estimatedUsd),
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (modelId) {
    increments.lastModelId = modelId
  }

  await Promise.all([
    db.collection('portal_ai_usage').doc('totals').set(increments, { merge: true }),
    db.collection('portal_ai_usage').doc(monthKey).set({ monthKey, ...increments }, { merge: true }),
  ])
}
