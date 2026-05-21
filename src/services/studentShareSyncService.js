/** Debounce публикации public_student_shares после сохранений на карточке. */
const DEBOUNCE_MS = 3500

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const timersByToken = new Map()

/**
 * @param {string} token
 * @param {() => void | Promise<void>} publish
 */
export function scheduleStudentShareSync(token, publish) {
  if (!token || typeof token !== 'string') return

  const prev = timersByToken.get(token)
  if (prev) clearTimeout(prev)

  const handle = setTimeout(() => {
    timersByToken.delete(token)
    Promise.resolve(publish()).catch((e) => {
      console.warn('[scheduleStudentShareSync]', token, e)
    })
  }, DEBOUNCE_MS)

  timersByToken.set(token, handle)
}

export function cancelStudentShareSync(token) {
  if (!token) return
  const t = timersByToken.get(token)
  if (t) clearTimeout(t)
  timersByToken.delete(token)
}
