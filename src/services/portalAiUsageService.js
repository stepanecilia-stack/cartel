import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { currentPortalAiMonthKey } from '../utils/portalAiPricing.js'
import { normalizePortalAiUsageStats } from '../utils/portalAiUsageStats.js'
import { ensureDb } from './firebaseService.js'

const COLLECTION = 'portal_ai_usage'

/**
 * @returns {Promise<{ totals: import('../utils/portalAiUsageStats.js').PortalAiUsageStats, month: import('../utils/portalAiUsageStats.js').PortalAiUsageStats, monthKey: string }>}
 */
export async function fetchPortalAiUsageStats() {
  const db = ensureDb()
  const monthKey = currentPortalAiMonthKey()
  const [totalsSnap, monthSnap] = await Promise.all([
    getDoc(doc(db, COLLECTION, 'totals')),
    getDoc(doc(db, COLLECTION, monthKey)),
  ])
  return {
    totals: normalizePortalAiUsageStats(totalsSnap.exists() ? totalsSnap.data() : null),
    month: normalizePortalAiUsageStats(monthSnap.exists() ? monthSnap.data() : null),
    monthKey,
  }
}

/**
 * @param {(stats: Awaited<ReturnType<typeof fetchPortalAiUsageStats>>) => void} callback
 */
export function subscribePortalAiUsageStats(callback) {
  const db = ensureDb()
  const monthKey = currentPortalAiMonthKey()
  let totals = normalizePortalAiUsageStats(null)
  let month = normalizePortalAiUsageStats(null)

  const emit = () => callback({ totals, month, monthKey })

  const unsubTotals = onSnapshot(doc(db, COLLECTION, 'totals'), (snap) => {
    totals = normalizePortalAiUsageStats(snap.exists() ? snap.data() : null)
    emit()
  })

  const unsubMonth = onSnapshot(doc(db, COLLECTION, monthKey), (snap) => {
    month = normalizePortalAiUsageStats(snap.exists() ? snap.data() : null)
    emit()
  })

  return () => {
    unsubTotals()
    unsubMonth()
  }
}
