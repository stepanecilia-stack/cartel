import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { randomBytes } from 'node:crypto'

const BOT_USERNAME = 'CartelCoachBot'
const LINK_TOKEN_TTL_MS = 30 * 60 * 1000
/** Учеников на странице (клавиатура 2 колонки). */
const STUDENTS_PAGE_SIZE = 20

export { BOT_USERNAME, STUDENTS_PAGE_SIZE }

function db() {
  return getFirestore()
}

/**
 * @param {string} coachId
 */
export async function getCoachProfile(coachId) {
  if (!coachId) return null
  const snap = await db().collection('coaches').doc(coachId).get()
  return snap.exists ? { id: snap.id, ...snap.data() } : null
}

/**
 * @param {string} coachId
 */
export async function getCoachStudents(coachId) {
  if (!coachId) return []
  const col = db().collection('students')
  const [a, b, c] = await Promise.all([
    col.where('coach_ids', 'array-contains', coachId).get().catch(() => ({ docs: [] })),
    col.where('coachId', '==', coachId).get().catch(() => ({ docs: [] })),
    col.where('coachIds', 'array-contains', coachId).get().catch(() => ({ docs: [] })),
  ])
  const map = new Map()
  for (const snap of [...a.docs, ...b.docs, ...c.docs]) {
    map.set(snap.id, { id: snap.id, ...snap.data() })
  }
  return [...map.values()].sort((x, y) =>
    displayName(x).localeCompare(displayName(y), 'ru'),
  )
}

/**
 * @param {string} studentId
 */
export async function getStudentById(studentId) {
  if (!studentId) return null
  const snap = await db().collection('students').doc(studentId).get()
  return snap.exists ? { id: snap.id, ...snap.data() } : null
}

/** @param {object | null | undefined} student */
export function displayName(student) {
  if (!student) return '—'
  const name = String(student.name ?? student.fullName ?? '').trim()
  if (name) return name
  const first = String(student.firstName ?? '').trim()
  const last = String(student.lastName ?? '').trim()
  return [first, last].filter(Boolean).join(' ') || 'Без имени'
}

/**
 * @param {string} telegramUserId
 */
export async function getCoachIdByTelegramUser(telegramUserId) {
  const snap = await db().collection('coach_telegram_links').doc(String(telegramUserId)).get()
  if (!snap.exists) return null
  const coachId = snap.data()?.coachId
  return typeof coachId === 'string' && coachId ? coachId : null
}

/**
 * @param {string} coachId
 * @param {string} telegramUserId
 * @param {number} chatId
 */
export async function linkTelegramUser(coachId, telegramUserId, chatId) {
  const ref = db().collection('coach_telegram_links').doc(String(telegramUserId))
  await ref.set({
    coachId,
    chatId,
    linkedAt: FieldValue.serverTimestamp(),
  })
  await db()
    .collection('coaches')
    .doc(coachId)
    .collection('integrations')
    .doc('telegram')
    .set(
      {
        telegramUserId: String(telegramUserId),
        chatId,
        linkedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
}

/**
 * @param {string} coachId
 */
export async function createLinkToken(coachId) {
  const token = randomBytes(18).toString('hex')
  const expiresAt = Timestamp.fromMillis(Date.now() + LINK_TOKEN_TTL_MS)
  await db().collection('coach_telegram_link_tokens').doc(token).set({
    coachId,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  })
  return {
    token,
    url: `https://t.me/${BOT_USERNAME}?start=${token}`,
    expiresAt: expiresAt.toMillis(),
  }
}

/**
 * @param {string} token
 * @param {string} telegramUserId
 * @param {number} chatId
 */
export async function consumeLinkToken(token, telegramUserId, chatId) {
  const ref = db().collection('coach_telegram_link_tokens').doc(token)
  const snap = await ref.get()
  if (!snap.exists) return { ok: false, error: 'Ссылка недействительна. Получите новую в приложении Cartel.' }
  const data = snap.data()
  const coachId = data?.coachId
  const expiresAt = data?.expiresAt?.toMillis?.() ?? 0
  if (!coachId) return { ok: false, error: 'Ссылка повреждена.' }
  if (expiresAt < Date.now()) {
    await ref.delete().catch(() => {})
    return { ok: false, error: 'Ссылка истекла. Откройте новую из приложения.' }
  }
  await linkTelegramUser(coachId, telegramUserId, chatId)
  await ref.delete().catch(() => {})
  return { ok: true, coachId }
}

/**
 * @param {string} coachId
 */
export async function getTelegramSession(coachId) {
  const snap = await db()
    .collection('coaches')
    .doc(coachId)
    .collection('integrations')
    .doc('telegram')
    .get()
  return snap.exists ? snap.data() : {}
}

/**
 * @param {string} coachId
 * @param {{ activeStudentId?: string | null, pendingTrainingRoster?: object | null, pendingAgentWrite?: object | null }} patch
 */
export async function updateTelegramSession(coachId, patch) {
  await db()
    .collection('coaches')
    .doc(coachId)
    .collection('integrations')
    .doc('telegram')
    .set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

/**
 * @param {string} coachId
 * @param {'user' | 'assistant'} role
 * @param {string} content
 */
export async function appendTelegramChatMessage(coachId, role, content) {
  const text = String(content ?? '').trim()
  if (!text) return
  await db()
    .collection('coaches')
    .doc(coachId)
    .collection('telegram_chat')
    .add({
      role,
      content: text.slice(0, 4000),
      source: 'telegram',
      createdAt: FieldValue.serverTimestamp(),
    })
}

/**
 * @param {string} coachId
 * @param {number} [limit]
 */
export async function getRecentTelegramChatMessages(coachId, limit = 10) {
  if (!coachId) return []
  try {
    const snap = await db()
      .collection('coaches')
      .doc(coachId)
      .collection('telegram_chat')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    return snap.docs
      .map((doc) => doc.data())
      .reverse()
      .filter((m) => m?.content)
  } catch (err) {
    console.warn('getRecentTelegramChatMessages', err)
    return []
  }
}

/** @param {Record<string, unknown>} data */
function legacyNormFromFirestore(data) {
  const gold = Number(data.gold)
  const silver = Number(data.silver)
  const bronze = Number(data.bronze)
  const category = String(data.category ?? '').trim()
  return {
    category: category === 'functional' ? 'physical' : category,
    testId: String(data.testId ?? '').trim(),
    testName: String(data.testName ?? '').trim(),
    description: String(data.description ?? '').trim(),
    ageGroup: String(data.ageGroup ?? '').trim(),
    gender: String(data.gender ?? '').trim(),
    unit: String(data.unit ?? '').trim(),
    gold: Number.isFinite(gold) ? gold : NaN,
    silver: Number.isFinite(silver) ? silver : NaN,
    bronze: Number.isFinite(bronze) ? bronze : NaN,
    measureType: String(data.measureType ?? '').trim(),
  }
}

/** @returns {Promise<object[]>} */
export async function loadLegacyNorms() {
  const snap = await db().collection('legacy_norms').get()
  return snap.docs.map((d) => legacyNormFromFirestore(d.data()))
}
