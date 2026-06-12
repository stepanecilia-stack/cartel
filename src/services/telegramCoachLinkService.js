import { ensureAuth, firebaseConfig, isFirebaseConfigured } from './firebaseService.js'

const REGION = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west1'
const PROJECT_ID = firebaseConfig.projectId

function functionsUrl(name) {
  return `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`
}

async function getIdToken() {
  if (!isFirebaseConfigured) throw new Error('Firebase не настроен')
  const user = ensureAuth().currentUser
  if (!user) throw new Error('Войдите как тренер.')
  return user.getIdToken()
}

/** @param {string} path */
async function postAuthed(path, body = {}) {
  const idToken = await getIdToken()
  const response = await fetch(functionsUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  })
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || response.statusText)
  }
  return data
}

/** @returns {Promise<{ url: string, botUsername: string, expiresAt: number }>} */
export async function createTelegramCoachLink() {
  return postAuthed('telegramCreateLinkToken')
}

/**
 * Однократно после деплоя: привязать webhook Telegram к URL функции.
 * @param {string} webhookUrl — URL из Firebase Console → Functions → telegramCoachWebhook
 */
export async function setupTelegramCoachWebhook(webhookUrl) {
  return postAuthed('telegramSetupWebhook', { webhookUrl: String(webhookUrl).trim() })
}
