export const STUDENT_PORTAL_LEVEL = 'KNOWLEDGE'

/** Нормализация самостоятельного прогресса ученика в кабинете (отдельно от technicalData тренера). */
export function normalizePortalKnowledgeData(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!key || key.startsWith('_')) continue
    if (!value || typeof value !== 'object') continue
    const level = String(value.level ?? '').trim().toUpperCase()
    if (level === STUDENT_PORTAL_LEVEL) {
      out[key] = { level: STUDENT_PORTAL_LEVEL }
    }
  }
  return out
}

export function normalizePortalKnowledgeDataForSave(raw) {
  return normalizePortalKnowledgeData(raw)
}
