import {
  generateOpaqueShareToken,
  getCoachProfile,
  setPublicLeaderboardShareDocument,
} from './firebaseService.js'
import { getCoachStudentsForCoach } from '../data/coachStudentsCache.js'
import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import { loadNormsOnce } from '../data/normsCache.js'
import { loadTechnicalProgramAtomsOnce } from './technicalProgramAtomsService.js'
import {
  buildPublicLeaderboardPayload,
  isValidLeaderboardShareToken,
} from '../utils/publicLeaderboardPayload.js'

let normsCache = null
let atomsCache = null
let normsAtomsPromise = null

async function getNormsAndAtoms() {
  if (normsCache && atomsCache) return { norms: normsCache, atoms: atomsCache }
  if (!normsAtomsPromise) {
    normsAtomsPromise = Promise.all([
      loadNormsOnce().catch(() => []),
      loadTechnicalProgramAtomsOnce()
        .then(() => getTechnicalProgramAtomsCache().level1)
        .catch(() => getTechnicalProgramAtomsCache().level1),
    ]).then(([norms, atoms]) => {
      normsCache = norms
      atomsCache = atoms
      return { norms, atoms }
    })
  }
  return normsAtomsPromise
}

/**
 * @param {string[]} allIds
 * @param {unknown} saved
 */
/**
 * Состав рейтинга из профиля тренера.
 * undefined / null — ещё не настраивали → все ученики.
 * [] — явно пустой состав («Снять всех»).
 */
export function resolveCuratedStudentIds(allIds, saved) {
  if (saved == null) return [...allIds]
  if (!Array.isArray(saved)) return [...allIds]
  if (saved.length === 0) return []
  const allowed = new Set(allIds)
  return saved.filter((id) => allowed.has(id))
}

/**
 * @param {Record<string, unknown> | null} profile
 */
export function coachDisplayNameFromProfile(profile) {
  if (!profile) return 'Тренер'
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim()
  return name || profile.email || 'Тренер'
}

/**
 * @param {string} coachId
 * @param {object} options
 */
export async function publishLeaderboardShare(coachId, options = {}) {
  const profile = options.profile ?? (await getCoachProfile(coachId))
  if (!profile) throw new Error('Профиль тренера не найден')

  let token = profile.leaderboardShareToken
  if (!isValidLeaderboardShareToken(token)) {
    token = generateOpaqueShareToken()
  }

  const allStudents = options.students ?? (await getCoachStudentsForCoach(coachId))
  const allIds = allStudents.map((s) => s.id)
  const curatedIds = resolveCuratedStudentIds(allIds, options.curatedStudentIds ?? profile.leaderboardCuratedStudentIds)
  const curatedSet = new Set(curatedIds)
  const curatedStudents = allStudents.filter((s) => curatedSet.has(s.id))

  const { norms, atoms } = await getNormsAndAtoms()
  const defaultCategoryId =
    options.defaultCategoryId ?? profile.leaderboardShareCategory ?? 'overall'

  const payload = buildPublicLeaderboardPayload({
    coachDisplayName: coachDisplayNameFromProfile(profile),
    students: curatedStudents,
    allNorms: norms,
    technicalAtoms: atoms,
    defaultCategoryId,
  })

  await setPublicLeaderboardShareDocument(token, {
    payload,
    ownerCoachId: coachId,
  })

  return { token, payload, curatedIds }
}

const pendingCoachIds = new Set()
let syncTimer = null

/** Отложенная публикация публичного рейтинга (после сохранения ученика и т.п.). */
export function scheduleLeaderboardShareSync(coachId) {
  if (!coachId) return
  pendingCoachIds.add(coachId)
  clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    const ids = [...pendingCoachIds]
    pendingCoachIds.clear()
    for (const id of ids) {
      try {
        const profile = await getCoachProfile(id)
        if (!profile?.leaderboardShareToken || !isValidLeaderboardShareToken(profile.leaderboardShareToken)) {
          continue
        }
        await publishLeaderboardShare(id, { profile })
      } catch (e) {
        console.warn('[scheduleLeaderboardShareSync]', id, e)
      }
    }
  }, 4500)
}
