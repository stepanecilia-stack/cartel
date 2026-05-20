import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  subscribeCoachProfile,
  subscribeCoachStudents,
  updateCoachLeaderboardSettings,
} from '../services/firebaseService.js'
import {
  publishLeaderboardShare,
  resolveCuratedStudentIds,
} from '../services/leaderboardShareService.js'
import { getTechnicalProgramAtomsCache, subscribeTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import { loadLegacyNorms } from '../utils/ksrUtils.js'
import { loadTechnicalProgramAtomsOnce } from '../services/technicalProgramAtomsService.js'
import { isValidLeaderboardShareToken } from '../utils/publicLeaderboardPayload.js'

/**
 * @param {string | undefined} coachId
 */
export function useCoachLeaderboard(coachId) {
  const [allStudents, setAllStudents] = useState([])
  const [coachProfile, setCoachProfile] = useState(null)
  const [allNorms, setAllNorms] = useState([])
  const [technicalAtoms, setTechnicalAtoms] = useState(() => getTechnicalProgramAtomsCache().level1)
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareFlash, setShareFlash] = useState(false)
  const [shareError, setShareError] = useState('')
  /** Локально, как на карточке ученика — сразу после создания, не ждём Firestore. */
  const [shareUrlDisplay, setShareUrlDisplay] = useState('')
  const [isLive, setIsLive] = useState(false)

  const curatedIdsRef = useRef([])

  useEffect(() => {
    if (!coachId) {
      setAllStudents([])
      setCoachProfile(null)
      setIsLoading(false)
      return undefined
    }

    setIsLoading(true)
    let studentsReady = false
    let profileReady = false
    let normsReady = false

    const maybeDone = () => {
      if (studentsReady && profileReady && normsReady) setIsLoading(false)
    }

    const unsubStudents = subscribeCoachStudents(
      coachId,
      (list) => {
        setAllStudents(list)
        studentsReady = true
        setIsLive(true)
        maybeDone()
      },
      (err) => {
        console.error(err)
        setLoadError('Не удалось подписаться на список учеников.')
        studentsReady = true
        maybeDone()
      },
    )

    const unsubProfile = subscribeCoachProfile(
      coachId,
      (profile) => {
        setCoachProfile(profile)
        profileReady = true
        maybeDone()
      },
      (err) => {
        console.error(err)
        profileReady = true
        maybeDone()
      },
    )

    const syncAtomsFromCache = () => setTechnicalAtoms(getTechnicalProgramAtomsCache().level1)
    const unsubAtomsCache = subscribeTechnicalProgramAtomsCache(syncAtomsFromCache)
    loadTechnicalProgramAtomsOnce()
      .then(syncAtomsFromCache)
      .catch(() => syncAtomsFromCache())

    loadLegacyNorms()
      .then((norms) => setAllNorms(norms))
      .catch(() => setAllNorms([]))
      .finally(() => {
        normsReady = true
        maybeDone()
      })

    return () => {
      unsubStudents()
      unsubProfile()
      unsubAtomsCache()
      setIsLive(false)
    }
  }, [coachId])

  const curatedIds = useMemo(() => {
    const allIds = allStudents.map((s) => s.id)
    return resolveCuratedStudentIds(allIds, coachProfile?.leaderboardCuratedStudentIds)
  }, [allStudents, coachProfile?.leaderboardCuratedStudentIds])

  curatedIdsRef.current = curatedIds

  const curatedStudents = useMemo(() => {
    const set = new Set(curatedIds)
    return allStudents.filter((s) => set.has(s.id))
  }, [allStudents, curatedIds])

  const shareToken = isValidLeaderboardShareToken(coachProfile?.leaderboardShareToken)
    ? coachProfile.leaderboardShareToken
    : null

  useEffect(() => {
    if (!shareToken || typeof window === 'undefined') return
    setShareUrlDisplay(`${window.location.origin}/leaderboard/share/${shareToken}`)
  }, [shareToken])

  const shareUrl = shareUrlDisplay

  const saveCuratedIds = useCallback(
    async (ids) => {
      if (!coachId) return
      await updateCoachLeaderboardSettings(coachId, {
        leaderboardCuratedStudentIds: ids,
      })
    },
    [coachId],
  )

  const toggleStudentInCurated = useCallback(
    async (studentId) => {
      const set = new Set(curatedIdsRef.current)
      if (set.has(studentId)) set.delete(studentId)
      else set.add(studentId)
      await saveCuratedIds([...set])
    },
    [saveCuratedIds],
  )

  const selectAllCurated = useCallback(async () => {
    await saveCuratedIds(allStudents.map((s) => s.id))
  }, [allStudents, saveCuratedIds])

  const clearAllCurated = useCallback(async () => {
    await saveCuratedIds([])
  }, [saveCuratedIds])

  const ensureShareLink = useCallback(
    async (defaultCategoryId = 'motor') => {
      if (!coachId) return null
      if (curatedIdsRef.current.length === 0) {
        setShareError('Добавьте в рейтинг хотя бы одного ученика.')
        return null
      }
      setShareBusy(true)
      setShareError('')
      try {
        const { token } = await publishLeaderboardShare(coachId, {
          profile: coachProfile,
          students: allStudents,
          curatedStudentIds: curatedIdsRef.current,
          defaultCategoryId,
        })
        await updateCoachLeaderboardSettings(coachId, {
          leaderboardShareToken: token,
          leaderboardCuratedStudentIds: curatedIdsRef.current,
          leaderboardShareCategory: defaultCategoryId,
        })
        const url = `${window.location.origin}/leaderboard/share/${token}`
        setShareUrlDisplay(url)
        return token
      } catch (error) {
        console.error('ensureShareLink:', error)
        const code = error?.code
        if (code === 'permission-denied') {
          setShareError(
            'Нет доступа к базе. В Firebase Console → Firestore → Rules опубликуйте правила с коллекцией public_leaderboard_shares.',
          )
        } else {
          setShareError(error?.message || 'Не удалось создать ссылку. Проверьте интернет и повторите.')
        }
        return null
      } finally {
        setShareBusy(false)
      }
    },
    [coachId, coachProfile, allStudents],
  )

  /** Фоновое обновление payload — без shareBusy, чтобы не дёргать кнопку «Поделиться». */
  const syncShareNow = useCallback(
    async (defaultCategoryId = 'motor') => {
      if (!coachId || !shareToken) return
      try {
        await publishLeaderboardShare(coachId, {
          profile: coachProfile,
          students: allStudents,
          curatedStudentIds: curatedIdsRef.current,
          defaultCategoryId,
        })
        await updateCoachLeaderboardSettings(coachId, {
          leaderboardShareCategory: defaultCategoryId,
        })
      } catch (err) {
        console.warn('syncShareNow', err)
      }
    },
    [coachId, coachProfile, allStudents, shareToken],
  )

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) return
    let copied = false
    try {
      await navigator.clipboard.writeText(shareUrl)
      copied = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        ta.setSelectionRange(0, ta.value.length)
        copied = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        copied = false
      }
    }
    if (!copied) {
      window.prompt('Скопируйте ссылку вручную:', shareUrl)
      return
    }
    setShareFlash(true)
    window.setTimeout(() => setShareFlash(false), 2200)
  }, [shareUrl])

  return {
    allStudents,
    curatedStudents,
    curatedIds,
    coachProfile,
    allNorms,
    technicalAtoms,
    loadError,
    isLoading,
    isLive,
    shareUrl,
    shareToken,
    shareError,
    shareBusy,
    shareFlash,
    saveCuratedIds,
    toggleStudentInCurated,
    selectAllCurated,
    clearAllCurated,
    ensureShareLink,
    syncShareNow,
    copyShareLink,
  }
}
