import { GoogleAuth } from 'google-auth-library'
import { extractVertexUsage } from './portalAiUsage.js'

const GCP_PROJECT = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'cartel-academy'
const GCP_LOCATION = 'europe-west1'
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash-002']

const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})

async function getVertexAccessToken() {
  const client = await googleAuth.getClient()
  const tokenResponse = await client.getAccessToken()
  if (!tokenResponse.token) {
    throw new Error('Не удалось получить OAuth-токен service account Cloud Function.')
  }
  return tokenResponse.token
}

/**
 * @param {unknown} payload
 */
function extractGroundingSources(payload) {
  const chunks = payload?.candidates?.[0]?.groundingMetadata?.groundingChunks
  if (!Array.isArray(chunks)) return []
  const urls = []
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri
    if (typeof uri === 'string' && uri.startsWith('http')) urls.push(uri)
  }
  return [...new Set(urls)].slice(0, 3)
}

/**
 * @param {string} accessToken
 * @param {string} modelId
 * @param {string} systemPrompt
 * @param {Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }>} contents
 * @param {{ temperature?: number, maxOutputTokens?: number, useGoogleSearch?: boolean }} [config]
 */
async function callVertexGenerateContent(accessToken, modelId, systemPrompt, contents, config = {}) {
  const url =
    `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}` +
    `/locations/${GCP_LOCATION}/publishers/google/models/${modelId}:generateContent`

  /** @type {Record<string, unknown>} */
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt.slice(0, 8000) }] },
    contents,
    generationConfig: {
      temperature: config.temperature ?? 0.88,
      topP: 0.9,
      maxOutputTokens: config.maxOutputTokens ?? 1024,
      ...(modelId.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  }

  if (config.useGoogleSearch) {
    body.tools = [{ googleSearch: {} }]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const msg =
      payload?.error?.message ||
      payload?.error?.status ||
      `Vertex Gemini HTTP ${response.status}`
    const err = new Error(String(msg))
    // @ts-expect-error attach status for fallback logic
    err.status = response.status
    throw err
  }

  const candidate = payload?.candidates?.[0]
  const parts = candidate?.content?.parts
  const text = Array.isArray(parts)
    ? parts
        .filter((p) => p && !p.thought)
        .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
        .join('')
        .trim()
    : ''

  return {
    text,
    modelId,
    usage: extractVertexUsage(payload),
    sources: extractGroundingSources(payload),
  }
}

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ temperature?: number, maxOutputTokens?: number, useGoogleSearch?: boolean }} [config]
 */
export async function generateGeminiReply(systemPrompt, userPrompt, config = {}) {
  const contents = [{ role: 'user', parts: [{ text: String(userPrompt).slice(0, 12000) }] }]
  const accessToken = await getVertexAccessToken()

  const models = config.useGoogleSearch
    ? ['gemini-2.5-flash', 'gemini-2.0-flash-001']
    : GEMINI_MODELS

  let lastError = 'Vertex Gemini request failed'
  for (const modelId of models) {
    try {
      const result = await callVertexGenerateContent(
        accessToken,
        modelId,
        systemPrompt,
        contents,
        config,
      )
      if (result.text) return result
      lastError = `empty reply from ${modelId}`
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = err && typeof err === 'object' && 'status' in err ? err.status : null
      lastError = message
      if (status !== 404 && status !== 403 && !/not found|does not have access/i.test(message)) {
        throw err instanceof Error ? err : new Error(message)
      }
      console.warn(`generateGeminiReply: model ${modelId} unavailable, trying next`, message)
    }
  }

  throw new Error(String(lastError))
}
