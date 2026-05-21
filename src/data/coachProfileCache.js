/** @type {string | null} */
let cachedUid = null
/** @type {Record<string, unknown> | null} */
let cachedProfile = null

/**
 * @param {string | null | undefined} uid
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function setCoachProfileCache(uid, profile) {
  cachedUid = uid ?? null
  cachedProfile = profile && typeof profile === 'object' ? profile : null
}

export function clearCoachProfileCache() {
  cachedUid = null
  cachedProfile = null
}

/**
 * @param {string | undefined | null} uid
 */
export function getCoachProfileCache(uid) {
  if (!uid || uid !== cachedUid) return null
  return cachedProfile
}
