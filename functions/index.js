import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { onRequest } from 'firebase-functions/v2/https'
import { GoogleAuth } from 'google-auth-library'
import { extractVertexUsage, recordPortalAiUsage } from './portalAiUsage.js'

if (!getApps().length) {
  initializeApp()
}

const GCP_PROJECT = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'cartel-academy'
const GCP_LOCATION = 'europe-west1'
/** Vertex AI model IDs (must include version suffix where required). */
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash-002']

const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^http:\/\/172\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^https:\/\/cartel-academy\.web\.app$/,
  /^https:\/\/cartel-academy\.firebaseapp\.com$/,
]

/**
 * @param {string | undefined} origin
 */
function isAllowedOrigin(origin) {
  if (!origin) return false
  return ALLOWED_ORIGINS.some((rule) => rule.test(origin))
}

/**
 * @param {import('firebase-functions/v2/https').Request} req
 * @param {import('firebase-functions/v2/https').Response} res
 */
function applyCors(req, res) {
  const origin = req.headers.origin
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Max-Age', '3600')
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 */
function buildGeminiContents(messages) {
  /** @type {Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }>} */
  const contents = []

  for (const m of messages) {
    if (!m?.role || !m?.content) continue
    const role = m.role === 'assistant' ? 'model' : 'user'
    const text = String(m.content).slice(0, 2000)
    const last = contents[contents.length - 1]
    if (last?.role === role) {
      last.parts[0].text = `${last.parts[0].text}\n${text}`.slice(0, 2000)
    } else {
      contents.push({ role, parts: [{ text }] })
    }
  }

  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({
      role: 'user',
      parts: [{ text: 'Начало диалога с тренером.' }],
    })
  }

  const last = contents[contents.length - 1]
  if (!last || last.role !== 'user') {
    throw new Error('Последнее сообщение должно быть от ученика.')
  }

  return contents
}

async function getVertexAccessToken() {
  const client = await googleAuth.getClient()
  const tokenResponse = await client.getAccessToken()
  if (!tokenResponse.token) {
    throw new Error('Не удалось получить OAuth-токен service account Cloud Function.')
  }
  return tokenResponse.token
}

/**
 * @param {string} accessToken
 * @param {string} modelId
 * @param {string} systemPrompt
 * @param {ReturnType<typeof buildGeminiContents>} contents
 */
async function callVertexGenerateContent(accessToken, modelId, systemPrompt, contents) {
  const url =
    `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}` +
    `/locations/${GCP_LOCATION}/publishers/google/models/${modelId}:generateContent`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt.slice(0, 8000) }] },
      contents,
      generationConfig: {
        temperature: 0.92,
        topP: 0.9,
        maxOutputTokens: 1024,
        ...(modelId.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
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

  const finishReason = candidate?.finishReason
  if (finishReason === 'MAX_TOKENS' && text) {
    console.warn(`portalPersonaChat: ${modelId} hit MAX_TOKENS, reply may be truncated`)
  }

  return {
    text,
    modelId,
    usage: extractVertexUsage(payload),
  }
}

/**
 * @param {string} systemPrompt
 * @param {Array<{ role?: string, content?: string }>} messages
 */
async function generatePersonaReply(systemPrompt, messages) {
  const contents = buildGeminiContents(messages)
  const accessToken = await getVertexAccessToken()

  let lastError = 'Vertex Gemini request failed'
  for (const modelId of GEMINI_MODELS) {
    try {
      const result = await callVertexGenerateContent(accessToken, modelId, systemPrompt, contents)
      if (result.text) return result
      lastError = `empty reply from ${modelId}`
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = err && typeof err === 'object' && 'status' in err ? err.status : null
      lastError = message
      // Try next model on not-found / access errors
      if (status !== 404 && status !== 403 && !/not found|does not have access/i.test(message)) {
        throw err instanceof Error ? err : new Error(message)
      }
      console.warn(`portalPersonaChat: model ${modelId} unavailable, trying next`, message)
    }
  }

  throw new Error(String(lastError))
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 */
function formatDialogForSummary(messages) {
  return messages
    .filter((m) => m?.role && m?.content)
    .map((m) => {
      const who = m.role === 'assistant' ? 'Тренер' : 'Ученик'
      return `${who}: ${String(m.content).slice(0, 500)}`
    })
    .join('\n')
}

/**
 * @param {string} text
 */
function parseMemoryJson(text) {
  if (!text) return null
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    if (!parsed || typeof parsed !== 'object') return null
    return {
      levelNotes: typeof parsed.levelNotes === 'string' ? parsed.levelNotes.trim().slice(0, 800) : '',
      conversationSummary:
        typeof parsed.conversationSummary === 'string'
          ? parsed.conversationSummary.trim().slice(0, 1200)
          : '',
    }
  } catch {
    return null
  }
}

/**
 * @param {Array<{ role?: string, content?: string }>} messages
 * @param {{ levelNotes?: string, conversationSummary?: string }} existingMemory
 * @param {unknown} trainingGoals
 * @param {string} context
 */
async function summarizePersonaMemory(messages, existingMemory, trainingGoals, context) {
  const dialog = formatDialogForSummary(messages)
  const goalsText = Array.isArray(trainingGoals)
    ? trainingGoals.filter((g) => typeof g === 'string').join(', ')
    : ''

  const prompt = [
    'Ты — служебный модуль Cartel Boxing. Обнови крупные пометки о ученике по переписке с виртуальным тренером.',
    'Верни ТОЛЬКО JSON без markdown:',
    '{"levelNotes":"...","conversationSummary":"..."}',
    '',
    'levelNotes — до 800 символов: опыт, уровень, цели, мотивация, страхи, самооценка. Крупные блоки, без мелочей.',
    'conversationSummary — до 1200 символов: тон ученика, о чём говорили, как с ним лучше общаться, что важно помнить.',
    'Объедини новое с уже известным — не теряй важное из старых пометок, убирай устаревшее.',
    '',
    goalsText ? `Цели из анкеты: ${goalsText}` : '',
    existingMemory.levelNotes ? `Текущие пометки об уровне:\n${existingMemory.levelNotes}` : '',
    existingMemory.conversationSummary
      ? `Текущее резюме общения:\n${existingMemory.conversationSummary}`
      : '',
    context ? `Контекст сессии: ${context}` : '',
    dialog ? `\nДиалог:\n${dialog}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const accessToken = await getVertexAccessToken()
  const contents = [{ role: 'user', parts: [{ text: prompt.slice(0, 12000) }] }]

  let lastError = 'Memory summarize failed'
  for (const modelId of GEMINI_MODELS) {
    try {
      const result = await callVertexGenerateContent(
        accessToken,
        modelId,
        'Ты возвращаешь только валидный JSON с полями levelNotes и conversationSummary. Без пояснений.',
        contents,
      )
      const parsed = parseMemoryJson(result.text)
      if (parsed && (parsed.levelNotes || parsed.conversationSummary)) {
        return { memory: parsed, usage: result.usage, modelId: result.modelId }
      }
      lastError = `invalid JSON from ${modelId}`
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  throw new Error(String(lastError))
}

/**
 * HTTP endpoint (явный CORS для localhost).
 * POST + Authorization: Bearer <Firebase ID token>
 */
export const portalPersonaChat = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 20,
    invoker: 'public',
  },
  async (req, res) => {
    applyCors(req, res)

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method-not-allowed' })
      return
    }

    try {
      const authHeader = req.headers.authorization ?? ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!token) {
        res.status(401).json({ error: 'unauthenticated' })
        return
      }

      await getAuth().verifyIdToken(token)

      const { personaId, messages, systemPrompt, context } = req.body ?? {}

      if (!personaId || !Array.isArray(messages) || !systemPrompt) {
        res.status(400).json({ error: 'invalid-argument' })
        return
      }

      const result = await generatePersonaReply(systemPrompt, messages)
      if (!result.text) {
        res.status(500).json({ error: 'empty-reply' })
        return
      }

      await recordPortalAiUsage({
        kind: 'chat',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        modelId: result.modelId,
      })

      res.status(200).json({
        reply: result.text.slice(0, 2500),
        personaId,
        context: context ?? null,
        usage: result.usage,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('portalPersonaChat error', detail, err)
      res.status(500).json({ error: 'internal', detail })
    }
  },
)

export const portalPersonaMemoryRefresh = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 10,
    invoker: 'public',
  },
  async (req, res) => {
    applyCors(req, res)

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method-not-allowed' })
      return
    }

    try {
      const authHeader = req.headers.authorization ?? ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!token) {
        res.status(401).json({ error: 'unauthenticated' })
        return
      }

      await getAuth().verifyIdToken(token)

      const { messages, existingMemory, trainingGoals, context } = req.body ?? {}
      if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'invalid-argument' })
        return
      }

      const result = await summarizePersonaMemory(
        messages,
        {
          levelNotes:
            typeof existingMemory?.levelNotes === 'string' ? existingMemory.levelNotes : '',
          conversationSummary:
            typeof existingMemory?.conversationSummary === 'string'
              ? existingMemory.conversationSummary
              : '',
        },
        trainingGoals ?? null,
        typeof context === 'string' ? context : 'general',
      )

      await recordPortalAiUsage({
        kind: 'memory',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        modelId: result.modelId,
      })

      res.status(200).json({
        ...result.memory,
        usage: result.usage,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('portalPersonaMemoryRefresh error', detail, err)
      res.status(500).json({ error: 'internal', detail })
    }
  },
)
