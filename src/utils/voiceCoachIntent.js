/**
 * Распознавание намерения из текста (эвристики + опционально OpenAI JSON).
 * Схема действия для LLM и валидации:
 * { "type": "generate_program" | "update_technical_level" | "unknown",
 *   "student_query": string | null,
 *   "skill_query": string | null,
 *   "level_query": string | null }
 */

const JSON_INTENT_SCHEMA = `Верни ТОЛЬКО JSON без markdown:
{
  "type": "generate_program" | "update_technical_level" | "unknown",
  "student_query": string | null,
  "skill_query": string | null,
  "level_query": string | null
}
Правила:
- generate_program: тренер просит план/программу тренировки для ученика (по имени).
- update_technical_level: тренер говорит что ученик освоил элемент техники на уровень (имя + элемент + уровень).
- unknown: если не уверен или речь не про эти сценарии.
Заполни student_query/skill_query/level_query фразами как в речи (для последующего fuzzy match).`

function normalizeRu(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"""']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @returns {{ type: string, student_query?: string|null, skill_query?: string|null, level_query?: string|null }}
 */
export function heuristicVoiceIntent(raw) {
  const text = normalizeRu(raw)
  if (!text) return { type: 'unknown', student_query: null, skill_query: null, level_query: null }

  const upd =
    /(?:ученик|спортсмен)\s+(.+?)\s+(?:освоил|сделал|показал)\s+(.+?)\s+на\s+(?:уровень|уровне)\s+(.+)/i.exec(
      text,
    )
  if (upd) {
    return {
      type: 'update_technical_level',
      student_query: upd[1].trim(),
      skill_query: upd[2].trim(),
      level_query: upd[3].trim(),
    }
  }

  const upd2 = /(.+?)\s+освоил\s+(.+?)\s+на\s+(?:уровень|уровне)\s+(.+)/i.exec(text)
  if (upd2 && upd2[1].length < 60) {
    return {
      type: 'update_technical_level',
      student_query: upd2[1].trim(),
      skill_query: upd2[2].trim(),
      level_query: upd2[3].trim(),
    }
  }

  const gen =
    /(?:составь|сделай|подготовь|нужна|дай|сгенерируй)\s+(?:мне\s+)?(?:программ\w*|план\w*)(?:\s+трениров\w*)?(?:\s+для|\s+ученик\w*)?\s+(.+)/i.exec(
      text,
    )
  if (gen) {
    let rest = gen[1].trim()
    rest = rest.replace(/^(для|ученик\w*)\s+/i, '').trim()
    rest = rest.replace(/[.!?]$/g, '').trim()
    if (rest.length >= 2) {
      return {
        type: 'generate_program',
        student_query: rest,
        skill_query: null,
        level_query: null,
      }
    }
  }

  const gen2 = /программ\w*(?:\s+трениров\w*)?\s+(?:для|на)\s+(.+)/i.exec(text)
  if (gen2) {
    const rest = gen2[1].replace(/[.!?]$/g, '').trim()
    if (rest.length >= 2) {
      return { type: 'generate_program', student_query: rest, skill_query: null, level_query: null }
    }
  }

  return { type: 'unknown', student_query: null, skill_query: null, level_query: null }
}

function safeParseJsonObject(s) {
  try {
    const o = JSON.parse(s)
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null
  } catch {
    return null
  }
}

function coerceIntent(o) {
  if (!o) return null
  const type = typeof o.type === 'string' ? o.type : 'unknown'
  const allowed = new Set(['generate_program', 'update_technical_level', 'unknown'])
  const t = allowed.has(type) ? type : 'unknown'
  return {
    type: t,
    student_query: o.student_query == null ? null : String(o.student_query),
    skill_query: o.skill_query == null ? null : String(o.skill_query),
    level_query: o.level_query == null ? null : String(o.level_query),
  }
}

/**
 * @param {string} transcript
 * @param {{ openAiApiKey?: string }} opts
 */
export async function classifyVoiceTranscript(transcript, opts = {}) {
  const key = typeof opts.openAiApiKey === 'string' ? opts.openAiApiKey.trim() : ''
  const fallback = heuristicVoiceIntent(transcript)

  if (!key) {
    return { intent: fallback, source: 'heuristic' }
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: JSON_INTENT_SCHEMA },
          { role: 'user', content: transcript },
        ],
      }),
    })
    if (!res.ok) {
      return { intent: fallback, source: 'heuristic_openai_http_error', error: `${res.status}` }
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      return { intent: fallback, source: 'heuristic_openai_empty' }
    }
    const parsed = coerceIntent(safeParseJsonObject(content))
    if (!parsed) return { intent: fallback, source: 'heuristic_openai_bad_json' }
    if (parsed.type === 'unknown' && fallback.type !== 'unknown') {
      return { intent: fallback, source: 'heuristic_preferred_over_unknown_llm' }
    }
    return { intent: parsed, source: 'openai' }
  } catch (e) {
    return {
      intent: fallback,
      source: 'heuristic_openai_exception',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
