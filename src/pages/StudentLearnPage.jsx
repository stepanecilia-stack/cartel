import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AtomStudyPanel from '../components/AtomStudyPanel.jsx'
import { useTechnicalProgramAtoms } from '../hooks/useTechnicalProgramAtoms.js'
import {
  fetchStudentForPortalSession,
  logoutStudentPortal,
  saveStudentPortalKnowledge,
} from '../services/studentPortalService.js'
import { TECH_DOMINANCE_OPTIONS } from '../utils/ksrUtils.js'
import { displayNameFromStudent } from '../utils/studentModel.js'
import {
  applyStudentKnowledgeMark,
  canStudentMarkKnowledge,
  countAtomsAtKnowledgeOrAbove,
  isTierCompleteForStudentPortal,
  countLeadingKnowledgeAtoms,
  hasStudentPortalKnowledgeProgress,
  resolveStudentPortalBrowseMaxIndex,
  resolveStudentPortalFocusIndex,
  resolveStudentPortalResumeTier,
  isAtomMarkedKnowledge,
  STUDENT_PORTAL_LEVEL,
} from '../utils/studentPortalProgress.js'
import { normalizeStudentTechnicalData } from '../utils/technicalProgramProgress.js'
import { mapCombinationsToDisplayAtoms } from '../utils/techniqueCatalog.js'
import { readPortalSession, clearPortalSession } from '../utils/studentPortalAuth.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import { vk } from '../utils/vkUi.js'
import StudentKnowledgeIntro from '../components/student/StudentKnowledgeIntro.jsx'
import {
  dismissStudentKnowledgeIntro,
  isStudentKnowledgeIntroDismissed,
} from '../constants/studentPortalKnowledgeGuide.js'

const KNOWLEDGE_LABEL = TECH_DOMINANCE_OPTIONS.find((o) => o.key === STUDENT_PORTAL_LEVEL)?.label ?? 'Знание'

function tierLabel(tier) {
  if (tier === 2) return 'Ур. 2'
  if (tier === 3) return 'Комбо'
  return 'Программа'
}

export default function StudentLearnPage() {
  const navigate = useNavigate()
  const session = readPortalSession()
  const [student, setStudent] = useState(null)
  const { orderedLevel1, orderedLevel2, orderedLevel3 } = useTechnicalProgramAtoms()
  const [tier, setTier] = useState(1)
  const [viewIndex, setViewIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const [resumeReady, setResumeReady] = useState(false)

  useEffect(() => {
    if (!session?.studentId) {
      navigate('/student-login', { replace: true })
      return undefined
    }
    let cancelled = false
    const run = async () => {
      try {
        const s = await fetchStudentForPortalSession(session.studentId)
        if (cancelled) return
        setStudent(s)
      } catch (e) {
        if (cancelled) return
        console.error(e)
        const msg =
          formatFirestoreErrorMessage(e, { context: 'student_portal' }) ||
          e?.message ||
          'Не удалось загрузить программу.'
        const revoke =
          /отключён|не найден|нет доступа|недоступен/i.test(msg) || e?.code === 'permission-denied'
        if (revoke) clearPortalSession()
        setLoadError(msg)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [session?.studentId, navigate])

  const orderedL1 = orderedLevel1
  const orderedL2 = orderedLevel2
  const orderedL3 = useMemo(
    () => mapCombinationsToDisplayAtoms(student?.technicalCombinations, orderedLevel3, orderedLevel1),
    [student?.technicalCombinations, orderedLevel3, orderedLevel1],
  )

  const technicalData = useMemo(
    () => normalizeStudentTechnicalData(student?.technicalData),
    [student?.technicalData],
  )
  const technicalDataRef = useRef(technicalData)
  technicalDataRef.current = technicalData

  const tierProgress = useMemo(
    () => ({
      1: { total: orderedL1.length, done: countAtomsAtKnowledgeOrAbove(orderedL1, technicalData) },
      2: { total: orderedL2.length, done: countAtomsAtKnowledgeOrAbove(orderedL2, technicalData) },
      3: { total: orderedL3.length, done: countAtomsAtKnowledgeOrAbove(orderedL3, technicalData) },
    }),
    [orderedL1, orderedL2, orderedL3, technicalData],
  )

  const tierUnlocked = useMemo(
    () => ({
      1: true,
      2: isTierCompleteForStudentPortal(orderedL1, technicalData),
      3: isTierCompleteForStudentPortal(orderedL2, technicalData),
    }),
    [orderedL1, orderedL2, technicalData],
  )

  const atomsForTier = tier === 3 ? orderedL3 : tier === 2 ? orderedL2 : orderedL1
  const focusIndex = resolveStudentPortalFocusIndex(atomsForTier, technicalData)
  const browseMaxIndex = resolveStudentPortalBrowseMaxIndex(atomsForTier, technicalData)
  const focusAtom = atomsForTier[focusIndex] ?? null
  const leadingDone = countLeadingKnowledgeAtoms(atomsForTier, technicalData)
  const total = atomsForTier.length
  const tierComplete =
    total > 0 &&
    (leadingDone >= total || isTierCompleteForStudentPortal(atomsForTier, technicalData))

  const safeViewIndex =
    total > 0 ? Math.min(Math.max(0, viewIndex), Math.max(0, browseMaxIndex)) : 0
  const viewAtom = atomsForTier[safeViewIndex] ?? null
  const canGoBack = safeViewIndex > 0
  const canGoForward = safeViewIndex < browseMaxIndex
  const isViewingCurrentStep = safeViewIndex === focusIndex && !tierComplete
  const viewAtomMarked = viewAtom ? isAtomMarkedKnowledge(technicalData, viewAtom.id) : false
  const canMark =
    isViewingCurrentStep && viewAtom && canStudentMarkKnowledge(atomsForTier, technicalData, viewAtom.id)

  useEffect(() => {
    if (!student?.id || resumeReady) return
    const td = normalizeStudentTechnicalData(student.technicalData)
    const resumeTier = resolveStudentPortalResumeTier(orderedL1, orderedL2, orderedL3, td)
    const atoms = resumeTier === 3 ? orderedL3 : resumeTier === 2 ? orderedL2 : orderedL1
    const complete = isTierCompleteForStudentPortal(atoms, td)
    const fi = resolveStudentPortalFocusIndex(atoms, td)
    setTier(resumeTier)
    setViewIndex(complete ? 0 : fi)
    setPlaying(false)
    const seenIntro = isStudentKnowledgeIntroDismissed(student.id)
    const hasProgress = hasStudentPortalKnowledgeProgress(orderedL1, orderedL2, orderedL3, td)
    setIntroOpen(!seenIntro && !hasProgress)
    setResumeReady(true)
  }, [student, orderedL1, orderedL2, orderedL3, resumeReady])

  useEffect(() => {
    if (!student?.id || !resumeReady) return
    const td = technicalDataRef.current
    const atoms = tier === 3 ? orderedL3 : tier === 2 ? orderedL2 : orderedL1
    const complete = isTierCompleteForStudentPortal(atoms, td)
    const fi = resolveStudentPortalFocusIndex(atoms, td)
    setViewIndex(complete ? 0 : fi)
    setPlaying(false)
  }, [tier, student?.id, orderedL1, orderedL2, orderedL3, resumeReady])

  const handleMark = useCallback(async () => {
    if (!student?.id || !focusAtom || !canMark) return
    setSaving(true)
    setSaveError('')
    try {
      const { ok, next } = applyStudentKnowledgeMark(technicalData, focusAtom.id, atomsForTier)
      if (!ok) {
        setSaveError('Сначала завершите предыдущий приём.')
        return
      }
      const saved = await saveStudentPortalKnowledge(student.id, next)
      setStudent((prev) => (prev ? { ...prev, technicalData: saved } : prev))
      const nextFocus = resolveStudentPortalFocusIndex(atomsForTier, saved)
      setViewIndex(nextFocus)
      setPlaying(false)
    } catch (e) {
      console.error(e)
      setSaveError(formatFirestoreErrorMessage(e, { context: 'student_portal' }) || 'Не удалось сохранить.')
    } finally {
      setSaving(false)
    }
  }, [student?.id, focusAtom, canMark, technicalData, atomsForTier])

  const handleLogout = async () => {
    await logoutStudentPortal()
    navigate('/student-login', { replace: true })
  }

  if (!session?.studentId) return null

  if (loadError) {
    return (
      <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
        <div className={`${vk.containerMid} max-w-md space-y-3`}>
          <p className={vk.error}>{loadError}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={vk.btnSecondary}
              onClick={() => {
                setLoadError('')
                window.location.reload()
              }}
            >
              Повторить
            </button>
            <Link to="/student-login" className={vk.btnPrimary}>
              Войти снова
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!student || !resumeReady) {
    return (
      <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
        <p className={`text-center ${vk.muted}`}>Загрузка программы…</p>
      </main>
    )
  }

  const name = displayNameFromStudent(student)
  const introSeen = isStudentKnowledgeIntroDismissed(student.id)

  const handleIntroContinue = () => {
    if (!introSeen) dismissStudentKnowledgeIntro(student.id)
    setIntroOpen(false)
  }

  if (introOpen) {
    return (
      <main className={`${vk.pageWithNav} px-2 py-3 sm:px-4`}>
        <div className="mx-auto w-full max-w-2xl space-y-2">
          <header>
            <h1 className={vk.h1Lg}>Моя программа</h1>
            <p className={vk.mutedXs}>{name}</p>
          </header>
          <StudentKnowledgeIntro
            onContinue={handleIntroContinue}
            continueLabel={introSeen ? 'Закрыть' : 'Понятно — к программе'}
          />
        </div>
      </main>
    )
  }

  return (
    <main className={`${vk.pageWithNav} px-2 py-3 sm:px-4`}>
      <div className="mx-auto w-full max-w-2xl space-y-2">
        <header className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <h1 className={vk.h1Lg}>Моя программа</h1>
            <p className={vk.mutedXs}>{name}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setIntroOpen(true)}
              className={`${vk.btnSecondary} text-[12px]`}
            >
              Как учить
            </button>
            <button type="button" onClick={() => void handleLogout()} className={vk.btnSecondary}>
              Выйти
            </button>
          </div>
        </header>

        <nav className={`${vk.segmentBar} p-0.5`} aria-label="Этап программы">
          {[1, 2, 3].map((t) => {
            const disabled = !tierUnlocked[t]
            const active = tier === t
            const prog = tierProgress[t]
            if (prog.total === 0 && t !== 1) return null
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setTier(t)
                  setPlaying(false)
                }}
                className={`min-w-0 flex-1 touch-manipulation rounded-md px-1 py-1.5 text-[11px] font-medium sm:text-[12px] ${
                  active ? vk.segmentBtnActive : disabled ? 'opacity-40' : vk.segmentBtnInactive
                }`}
              >
                <span className="block truncate">{tierLabel(t)}</span>
                {prog.total > 0 ? (
                  <span className="block tabular-nums text-[10px] opacity-80">
                    {prog.done}/{prog.total}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>

        {tier === 2 && !isTierCompleteForStudentPortal(orderedL1, technicalData) ? (
          <p className={vk.mutedXs}>
            Новые приёмы ур. 2 откроются после «{KNOWLEDGE_LABEL}» по всей программе (ур. 1). Уровень 1 можно
            смотреть в любой момент.
          </p>
        ) : null}

        {!tierUnlocked[tier] ? (
          <p className={vk.mutedXs}>Сначала завершите предыдущий этап или отметьте его приёмы.</p>
        ) : total === 0 ? (
          <p className={vk.mutedXs}>На этом этапе пока нет элементов.</p>
        ) : viewAtom ? (
          <section className="space-y-2 rounded-[10px] bg-white p-2 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="text-[12px] font-semibold tabular-nums text-[#2d81e0]">
                По порядку: {leadingDone} / {total}
              </span>
              <span className={vk.mutedXs}>{tierLabel(tier)}</span>
            </div>

            {tierComplete ? (
              <p className="text-[13px] font-medium text-[#4bb34b]">
                Этап пройден. Листайте «Назад» / «Далее» для повторения
                {tier < 3 ? ' или откройте следующую вкладку.' : '.'}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!canGoBack}
                onClick={() => {
                  setViewIndex((i) => Math.max(0, i - 1))
                  setPlaying(false)
                }}
                className={`min-w-[4.5rem] ${vk.btnSecondary}`}
              >
                Назад
              </button>
              <span className={`${vk.mutedXs} shrink-0 tabular-nums`}>
                {safeViewIndex + 1} / {total}
                {viewAtomMarked ? ' · ✓' : ''}
              </span>
              <button
                type="button"
                disabled={!canGoForward}
                onClick={() => {
                  setViewIndex((i) => Math.min(browseMaxIndex, i + 1))
                  setPlaying(false)
                }}
                className={`min-w-[4.5rem] ${vk.btnSecondary}`}
              >
                Далее
              </button>
            </div>

            <AtomStudyPanel atom={viewAtom} playing={playing} onPlayingChange={setPlaying} autoPlay />

            {canMark ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleMark()}
                className={`w-full ${vk.btnPrimary}`}
              >
                {saving ? 'Сохранение…' : `Понял — отметить «${KNOWLEDGE_LABEL}» и далее`}
              </button>
            ) : tierComplete ? (
              <p className={vk.mutedXs}>Повторение материала. Отметка «Понял» уже не нужна на этом этапе.</p>
            ) : isViewingCurrentStep && viewAtomMarked ? (
              <p className={vk.mutedXs}>Этот приём уже отмечен. Листайте дальше или вернитесь к программе.</p>
            ) : (
              <p className={vk.mutedXs}>
                Повторение. «Понял» — только на текущем шаге
                {focusAtom ? ` (#${focusAtom.number})` : ''}.
              </p>
            )}

            {saveError ? <p className={vk.error}>{saveError}</p> : null}
          </section>
        ) : null}
      </div>
    </main>
  )
}
