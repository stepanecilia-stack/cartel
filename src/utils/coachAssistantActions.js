import { parseBridgeDeliveredChatContent } from './coachBridgeChat.js'

const NORM_MARKER_RE = /\|\|COACH_SAVE_NORM:(\{[\s\S]*?\})\|\|/

/** @type {RegExp[]} */
const BRIDGE_MARKER_RES = [
  /\|\|COACH_BRIDGE_TO_STUDENT:(\{[\s\S]*?\})\|\|/,
  /COACH_BRIDGE_TO_STUDENT\s*:?\s*(\{[\s\S]*?\})\s*(?:\n|$)/,
  /`+\s*COACH_BRIDGE_TO_STUDENT\s*`+\s*:?\s*(\{[\s\S]*?\})/,
]

/**
 * @param {unknown} parsed
 */
function bridgeActionFromParsed(parsed) {
  if (!parsed || typeof parsed !== 'object') return null
  const draftToStudent = String(parsed.draftToStudent ?? parsed.text ?? '').trim()
  if (!draftToStudent) return null
  return {
    studentId: String(parsed.studentId ?? '').trim(),
    draftToStudent: draftToStudent.slice(0, 2000),
    reason: String(parsed.reason ?? '').trim().slice(0, 500),
  }
}

/**
 * @param {string} working
 */
function stripLeakedBridgeMarkerText(working) {
  return String(working ?? '')
    .replace(/\|\|COACH_BRIDGE_TO_STUDENT:[\s\S]*?\|\|/g, '')
    .replace(/^\s*COACH_BRIDGE_TO_STUDENT\s*:?\s*.*$/gim, '')
    .replace(/^\s*`+\s*COACH_BRIDGE_TO_STUDENT\s*`+\s*:?\s*.*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Убирает ложные «отправлено» и служебные хвосты из текста для тренера.
 * @param {string} displayReply
 * @param {boolean} [hasBridgeDraft]
 */
export function sanitizeBridgeAssistantDisplay(displayReply, hasBridgeDraft = false) {
  let text = stripLeakedBridgeMarkerText(displayReply)
  if (!hasBridgeDraft) return text

  text = text
    .replace(/\bсогласовано\.?\s*/gi, '')
    .replace(/\bчерновик\s+отправлен\.?\s*/gi, '')
    .replace(/\bотправлен\s+в\s+кабинет\.?\s*/gi, '')
    .replace(/\bотправить\s*\?\s*$/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
}

/**
 * @param {string} raw
 */
export function parseCoachAssistantMarkers(raw) {
  const text = String(raw ?? '')
  let working = text.trim()

  let normAction = null
  const normMatch = working.match(NORM_MARKER_RE)
  if (normMatch) {
    try {
      const parsed = JSON.parse(normMatch[1])
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
    working = working.replace(NORM_MARKER_RE, '').trim()
  }

  let bridgeAction = null
  for (const re of BRIDGE_MARKER_RES) {
    const bridgeMatch = working.match(re)
    if (!bridgeMatch) continue
    try {
      const action = bridgeActionFromParsed(JSON.parse(bridgeMatch[1]))
      if (action) {
        bridgeAction = action
        working = working.replace(bridgeMatch[0], '').trim()
        break
      }
    } catch {
      /* try next pattern */
    }
  }

  working = stripLeakedBridgeMarkerText(working)
  working = sanitizeBridgeAssistantDisplay(working, Boolean(bridgeAction))

  return { displayReply: working, normAction, bridgeAction }
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

/**
 * @param {string} text
 */
export function isBridgeDraftSendConfirmation(text) {
  const t = String(text ?? '').trim().toLowerCase()
  if (!t || t.length > 80) return false
  return /^(да|ок|окей|отправ|отправляй|отправь|шли|улетай|confirm|yes)\b/.test(t)
}

/**
 * @param {string} content
 */
export function formatCoachAssistantMessageForDisplay(content) {
  const raw = String(content ?? '')
  if (parseBridgeDeliveredChatContent(raw)) return raw
  if (/COACH_BRIDGE_TO_STUDENT/i.test(raw)) {
    const cleaned = sanitizeBridgeAssistantDisplay(raw, true)
    return cleaned || 'Черновик готов — проверьте блок «Сообщение в кабинет» ниже и нажмите «Отправить».'
  }
  return raw
}
