/**
 * @param {string} token
 * @param {string} method
 * @param {Record<string, unknown>} body
 */
export async function telegramApi(token, method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!data?.ok) {
    const desc = data?.description ?? res.statusText
    throw new Error(`Telegram ${method}: ${desc}`)
  }
  return data
}

/**
 * @param {string} token
 * @param {number | string} chatId
 * @param {string} text
 * @param {Record<string, unknown>} [extra]
 */
export async function sendTelegramMessage(token, chatId, text, extra = {}) {
  const chunks = splitTelegramText(text, 4000)
  let last = null
  for (const chunk of chunks) {
    last = await telegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'HTML',
      ...extra,
    })
  }
  return last
}

/**
 * @param {string} text
 * @param {number} maxLen
 */
export function splitTelegramText(text, maxLen = 4000) {
  const raw = String(text ?? '').trim()
  if (!raw) return ['…']
  if (raw.length <= maxLen) return [raw]
  const parts = []
  let rest = raw
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('\n', maxLen)
    if (cut < maxLen * 0.5) cut = maxLen
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

/**
 * Inline-кнопки в два столбца (по 2 кнопки в ряд).
 * @param {Array<{ text: string, callback_data?: string, url?: string }>} buttons
 */
export function layoutButtonsInTwoColumns(buttons) {
  const rows = []
  for (let i = 0; i < buttons.length; i += 2) {
    const row = [buttons[i]]
    if (buttons[i + 1]) row.push(buttons[i + 1])
    rows.push(row)
  }
  return rows
}

/**
 * @param {string} token
 * @param {string} fileId
 * @returns {Promise<Buffer>}
 */
export async function downloadTelegramFile(token, fileId) {
  const meta = await telegramApi(token, 'getFile', { file_id: fileId })
  const filePath = meta?.result?.file_path
  if (!filePath) throw new Error('Telegram getFile: missing file_path')
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Telegram file download: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('Telegram file download: empty')
  return buf
}

/** @param {string} raw */
export function escapeTelegramHtml(raw) {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
