export const MARKER_READY_FOR_STAGES = '||READY_FOR_STAGES||'
export const MARKER_QUIZ_PASS = '||QUIZ_PASS||'

/**
 * @param {string} raw
 */
export function parsePersonaChatMarkers(raw) {
  let text = String(raw ?? '')
  const readyForStages = text.includes(MARKER_READY_FOR_STAGES)
  const quizPass = text.includes(MARKER_QUIZ_PASS)
  for (const marker of [MARKER_READY_FOR_STAGES, MARKER_QUIZ_PASS]) {
    text = text.split(marker).join('')
  }
  return {
    displayReply: text.trim(),
    readyForStages,
    quizPass,
  }
}
