import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AtomStudyPanel from '../components/AtomStudyPanel.jsx'
import { useTechnicalProgramAtoms } from '../hooks/useTechnicalProgramAtoms.js'
import {
  fetchStudentForPortalSession,
  logoutStudentPortal,
  saveStudentPortalKnowledge,
  saveStudentPortalOnboarding,
} from '../services/studentPortalService.js'
import { refreshAndSavePortalPersonaMemory } from '../services/portalPersonaMemoryService.js'
import {
  applyOnboardingSkippedMemory,
  applyTrainingGoalsToPersonaMemory,
  normalizePortalPersonaMemory,
} from '../utils/portalPersonaMemory.js'
import { displayNameFromStudent } from '../utils/studentModel.js'
import {
  applyStudentKnowledgeMark,
  canStudentMarkKnowledge,
  countLeadingKnowledgeAtoms,
  countAtomsAtKnowledgeOrAbove,
  resolveStudentPortalBrowseMaxIndex,
  resolveStudentPortalFocusIndex,
  resolveStudentPortalResumeTier,
  isAtomMarkedKnowledge,
  isTierCompleteForStudentPortal,
  studentPortalTierLabel,
} from '../utils/studentPortalProgress.js'
import { normalizePortalKnowledgeData } from '../utils/portalKnowledgeData.js'
import { mapCombinationsToDisplayAtoms } from '../utils/techniqueCatalog.js'
import { readPortalSession, clearPortalSession } from '../utils/studentPortalAuth.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import { vk } from '../utils/vkUi.js'
import StudentPortalOnboardingWizard from '../components/student/StudentPortalOnboardingWizard.jsx'
import StudentPersonaAvatar from '../components/student/StudentPersonaAvatar.jsx'
import StudentPersonaBubble from '../components/student/StudentPersonaBubble.jsx'
import StudentPersonaChatDock from '../components/student/StudentPersonaChatDock.jsx'
import StudentFirstAtomFlow from '../components/student/StudentFirstAtomFlow.jsx'
import StudentTechniquePageShell from '../components/student/StudentTechniquePageShell.jsx'
import StudentTechniqueAtomFlow from '../components/student/StudentTechniqueAtomFlow.jsx'
import StudentPortalGymHub from '../components/student/StudentPortalGymHub.jsx'
import StudentPortalNormsPanel from '../components/student/StudentPortalNormsPanel.jsx'
import {
  isPortalOnboardingComplete,
  normalizePortalTrainingGoals,
} from '../constants/studentPortalOnboarding.js'
import { isGymHubPremiumSection, isPortalPremiumActive } from '../constants/studentPortalPremium.js'
import { getPortalPersona, normalizePortalPersonaId, formatPortalPersonaName } from '../constants/studentPortalPersonas.js'
import { readPortalBridgeState } from '../utils/coachBridgeModel.js'
import { resolveStudentBridgeCoachId } from '../services/coachBridgeService.js'

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
  const [onboardingBusy, setOnboardingBusy] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [personaMessage, setPersonaMessage] = useState('')
  const [resumeReady, setResumeReady] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [hubSection, setHubSection] = useState(
    /** @type {'hub' | 'technique' | 'norms' | 'program' | 'competition'} */ ('hub'),
  )
  const [bridgeCoachId, setBridgeCoachId] = useState('')

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

  useEffect(() => {
    if (!student?.id) {
      setBridgeCoachId('')
      return undefined
    }
    let cancelled = false
    void resolveStudentBridgeCoachId(student.id).then((id) => {
      if (!cancelled) setBridgeCoachId(id || '')
    })
    return () => {
      cancelled = true
    }
  }, [student?.id, student?.portalBridge?.coachId])

  const portalBridge = useMemo(() => readPortalBridgeState(student), [student])

  const orderedL1 = orderedLevel1
  const orderedL2 = orderedLevel2
  const orderedL3 = useMemo(
    () => mapCombinationsToDisplayAtoms(student?.technicalCombinations, orderedLevel3, orderedLevel1),
    [student?.technicalCombinations, orderedLevel3, orderedLevel1],
  )

  const portalKnowledgeData = useMemo(
    () => normalizePortalKnowledgeData(student?.portalKnowledgeData),
    [student?.portalKnowledgeData],
  )
  const portalKnowledgeDataRef = useRef(portalKnowledgeData)
  portalKnowledgeDataRef.current = portalKnowledgeData

  const tierProgress = useMemo(
    () => ({
      1: { total: orderedL1.length, done: countAtomsAtKnowledgeOrAbove(orderedL1, portalKnowledgeData) },
      2: { total: orderedL2.length, done: countAtomsAtKnowledgeOrAbove(orderedL2, portalKnowledgeData) },
      3: { total: orderedL3.length, done: countAtomsAtKnowledgeOrAbove(orderedL3, portalKnowledgeData) },
    }),
    [orderedL1, orderedL2, orderedL3, portalKnowledgeData],
  )

  const tierUnlocked = useMemo(
    () => ({
      1: true,
      2: isTierCompleteForStudentPortal(orderedL1, portalKnowledgeData),
      3: isTierCompleteForStudentPortal(orderedL2, portalKnowledgeData),
    }),
    [orderedL1, orderedL2, portalKnowledgeData],
  )

  const tier2UnlockPulse =
    tierUnlocked[2] &&
    tier === 1 &&
    tierProgress[1].total > 0 &&
    tierProgress[1].done >= tierProgress[1].total

  const atomsForTier = tier === 3 ? orderedL3 : tier === 2 ? orderedL2 : orderedL1
  const focusIndex = resolveStudentPortalFocusIndex(atomsForTier, portalKnowledgeData)
  const browseMaxIndex = resolveStudentPortalBrowseMaxIndex(atomsForTier, portalKnowledgeData)
  const focusAtom = atomsForTier[focusIndex] ?? null
  const leadingDone = countLeadingKnowledgeAtoms(atomsForTier, portalKnowledgeData)
  const total = atomsForTier.length
  const tierComplete =
    total > 0 &&
    (leadingDone >= total || isTierCompleteForStudentPortal(atomsForTier, portalKnowledgeData))

  const safeViewIndex =
    total > 0 ? Math.min(Math.max(0, viewIndex), Math.max(0, browseMaxIndex)) : 0
  const viewAtom = atomsForTier[safeViewIndex] ?? null
  const canGoBack = safeViewIndex > 0
  const canGoForward = safeViewIndex < browseMaxIndex
  const isViewingCurrentStep = safeViewIndex === focusIndex && !tierComplete
  const viewAtomMarked = viewAtom ? isAtomMarkedKnowledge(portalKnowledgeData, viewAtom.id) : false
  const canMark =
    isViewingCurrentStep && viewAtom && canStudentMarkKnowledge(atomsForTier, portalKnowledgeData, viewAtom.id)

  useEffect(() => {
    if (!student?.id || resumeReady) return
    const pk = normalizePortalKnowledgeData(student.portalKnowledgeData)
    const resumeTier = resolveStudentPortalResumeTier(orderedL1, orderedL2, orderedL3, pk)
    const atoms = resumeTier === 3 ? orderedL3 : resumeTier === 2 ? orderedL2 : orderedL1
    const complete = isTierCompleteForStudentPortal(atoms, pk)
    const fi = resolveStudentPortalFocusIndex(atoms, pk)
    setTier(resumeTier)
    setViewIndex(complete ? 0 : fi)
    setPlaying(false)
    setResumeReady(true)
  }, [student, orderedL1, orderedL2, orderedL3, resumeReady])

  useEffect(() => {
    if (!student?.id || !resumeReady) return
    const pk = portalKnowledgeDataRef.current
    const atoms = tier === 3 ? orderedL3 : tier === 2 ? orderedL2 : orderedL1
    const complete = isTierCompleteForStudentPortal(atoms, pk)
    const fi = resolveStudentPortalFocusIndex(atoms, pk)
    setViewIndex(complete ? 0 : fi)
    setPlaying(false)
  }, [tier, student?.id, orderedL1, orderedL2, orderedL3, resumeReady])

  const portalPersonaId = normalizePortalPersonaId(student?.portalPersonaId)
  const persona = getPortalPersona(portalPersonaId)
  const personaMemory = useMemo(
    () => normalizePortalPersonaMemory(student?.portalPersonaMemory),
    [student?.portalPersonaMemory],
  )
  const portalGoals = normalizePortalTrainingGoals(
    student?.portalTrainingGoals ?? student?.portalTrainingGoal,
  )
  const portalPremiumActive = isPortalPremiumActive(student)
  const resolvedHubSection =
    !portalPremiumActive && isGymHubPremiumSection(hubSection) ? 'hub' : hubSection

  const programSectionTitle =
    resolvedHubSection === 'program' ? 'Индивидуальная программа' : 'Техника бокса'

  const showPersonaChatDock = resolvedHubSection !== 'technique' && resolvedHubSection !== 'norms'
  const isTechniqueSection = resolvedHubSection === 'technique'

  const programChatHint = useMemo(() => {
    const parts = [`Этап программы: ${studentPortalTierLabel(tier)}`, `Прогресс: ${leadingDone}/${total || '—'}`]
    if (viewAtom?.name) parts.push(`Сейчас смотрит: «${viewAtom.name}»`)
    if (canMark) parts.push('Может нажать «Понял» после трёх образов')
    else if (viewAtomMarked) parts.push('Элемент уже отмечен')
    else if (!tierUnlocked[tier]) parts.push('Следующий этап пока закрыт')
    return parts.join('. ')
  }, [tier, leadingDone, total, viewAtom?.name, canMark, viewAtomMarked, tierUnlocked])

  const isFirstAtomLearning =
    resolvedHubSection !== 'technique' &&
    tier === 1 &&
    focusAtom &&
    viewAtom?.id === focusAtom.id &&
    focusAtom.id === orderedL1[0]?.id &&
    isViewingCurrentStep &&
    canMark

  const isTechniqueGuidedLearning =
    resolvedHubSection === 'technique' && isViewingCurrentStep && canMark && viewAtom
  const isFirstTechniqueAtom = tier === 1 && viewAtom?.id === orderedL1[0]?.id

  useEffect(() => {
    if (!personaMessage) return undefined
    const t = window.setTimeout(() => setPersonaMessage(''), 4000)
    return () => window.clearTimeout(t)
  }, [personaMessage])

  const handleMark = useCallback(async () => {
    if (!student?.id || !focusAtom || !canMark) return
    setSaving(true)
    setSaveError('')
    setPersonaMessage('')
    try {
      const { ok, next } = applyStudentKnowledgeMark(portalKnowledgeData, focusAtom.id, atomsForTier)
      if (!ok) {
        setPersonaMessage(persona.phrases.markBlocked)
        return
      }
      const saved = await saveStudentPortalKnowledge(student.id, next)
      setStudent((prev) => (prev ? { ...prev, portalKnowledgeData: saved } : prev))
      const nextFocus = resolveStudentPortalFocusIndex(atomsForTier, saved)
      setViewIndex(nextFocus)
      setPlaying(false)
      setPersonaMessage(persona.phrases.markOk)
    } catch (e) {
      console.error(e)
      setSaveError(formatFirestoreErrorMessage(e, { context: 'student_portal' }) || 'Не удалось сохранить.')
      setPersonaMessage(persona.phrases.markSaveFail)
    } finally {
      setSaving(false)
    }
  }, [student?.id, focusAtom, canMark, portalKnowledgeData, atomsForTier, persona])

  const handleLogout = async () => {
    await logoutStudentPortal()
    navigate('/student-login', { replace: true })
  }

  const handleRefreshPersonaMemory = useCallback(
    async (messages, context) => {
      if (!student?.id) return personaMemory
      const userCount = messages.filter((m) => m.role === 'user' && m.content?.trim()).length
      if (userCount === 0) return personaMemory

      try {
        const updated = await refreshAndSavePortalPersonaMemory({
          studentId: student.id,
          messages,
          existingMemory: personaMemory,
          trainingGoals: portalGoals,
          context,
        })
        setStudent((prev) => (prev ? { ...prev, portalPersonaMemory: updated } : prev))
        return updated
      } catch (e) {
        console.warn('[learn] persona memory refresh failed', e)
        return personaMemory
      }
    },
    [student?.id, personaMemory, portalGoals],
  )

  const handleGreetingChatComplete = useCallback(
    async (messages, context = 'onboarding_greeting') => {
      await handleRefreshPersonaMemory(messages, context)
    },
    [handleRefreshPersonaMemory],
  )

  const handleChatSessionClose = useCallback(
    async (messages) => {
      await handleRefreshPersonaMemory(messages, 'program')
    },
    [handleRefreshPersonaMemory],
  )

  const handleOnboardingComplete = useCallback(
    async ({ goals, personaId, skipped = false }) => {
      if (!student?.id) return
      setOnboardingBusy(true)
      setOnboardingError('')
      try {
        const memoryWithGoals = applyTrainingGoalsToPersonaMemory(personaMemory, goals)
        const memoryFinal = skipped ? applyOnboardingSkippedMemory(memoryWithGoals) : memoryWithGoals
        const saved = await saveStudentPortalOnboarding(student.id, {
          goals,
          personaId,
          personaMemory: memoryFinal,
          skipped,
        })
        const now = new Date().toISOString()
        setStudent((prev) =>
          prev
            ? {
                ...prev,
                portalTrainingGoals: saved.goals,
                portalPersonaId: saved.personaId,
                portalOnboardingCompletedAt: now,
                ...(skipped ? { portalOnboardingSkippedAt: now } : {}),
                portalPersonaMemory: saved.personaMemory ?? memoryFinal,
              }
            : prev,
        )
        setGuideOpen(false)
      } catch (e) {
        console.error(e)
        setOnboardingError(
          formatFirestoreErrorMessage(e, { context: 'student_portal' }) || 'Не удалось сохранить.',
        )
      } finally {
        setOnboardingBusy(false)
      }
    },
    [student?.id, personaMemory],
  )

  const handleGuideComplete = useCallback(async () => {
    setGuideOpen(false)
  }, [])

  const onboardingComplete = isPortalOnboardingComplete(student)

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

  if (!onboardingComplete) {
    return (
      <main className="bg-[#edeef0] px-2 pb-3 pt-2 text-[#2c2d2e] sm:px-4">
        <div className="mx-auto w-full max-w-lg space-y-2">
          <StudentPortalOnboardingWizard
            mode="full"
            initialGoals={portalGoals}
            initialPersonaId={student?.portalPersonaId}
            personaMemory={personaMemory}
            busy={onboardingBusy}
            error={onboardingError}
            onGreetingChatComplete={handleGreetingChatComplete}
            onComplete={handleOnboardingComplete}
          />
        </div>
      </main>
    )
  }

  if (guideOpen) {
    return (
      <main className="bg-[#edeef0] px-2 py-3 text-[#2c2d2e] sm:px-4">
        <div className="mx-auto w-full max-w-lg space-y-2">
          <header className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <h1 className={vk.h1Lg}>Как учить</h1>
              <p className={vk.mutedXs}>
                {formatPortalPersonaName(persona)} · {name}
              </p>
            </div>
            <button type="button" onClick={() => setGuideOpen(false)} className={vk.btnSecondary}>
              В зал
            </button>
          </header>
          <StudentPortalOnboardingWizard
            mode="guide"
            initialPersonaId={portalPersonaId}
            initialGoals={portalGoals}
            personaMemory={personaMemory}
            onComplete={handleGuideComplete}
          />
        </div>
      </main>
    )
  }

  if (resolvedHubSection === 'hub') {
    return (
      <main className={`bg-[#edeef0] px-2 py-3 sm:px-4 ${chatOpen ? '' : 'pb-[4.5rem]'}`}>
        <div className="mx-auto w-full max-w-lg">
          <StudentPortalGymHub
            studentName={name}
            premiumActive={portalPremiumActive}
            onSelectSection={setHubSection}
            onOpenGuide={() => setGuideOpen(true)}
            onLogout={() => void handleLogout()}
          />
        </div>
        <StudentPersonaChatDock
          personaId={portalPersonaId}
          open={chatOpen}
          onOpenChange={setChatOpen}
          studentId={student.id}
          bridgeCoachId={bridgeCoachId ?? ''}
          onBridgeChange={(patch) => setStudent((prev) => (prev ? { ...prev, ...patch } : prev))}
          programHint="Главная зала Cartel. Выбери раздел или спроси наставника."
          personaMemory={personaMemory}
          trainingGoals={portalGoals}
          onSessionClose={handleChatSessionClose}
        />
      </main>
    )
  }

  if (resolvedHubSection === 'norms') {
    return (
      <StudentPortalNormsPanel
        student={student}
        personaId={portalPersonaId}
        personaMemory={personaMemory}
        trainingGoals={portalGoals}
        onNormSelfReportsChange={(saved) =>
          setStudent((prev) =>
            prev
              ? {
                  ...prev,
                  portalNormSelfReports: saved.portalNormSelfReports,
                  tests: saved.tests ?? prev.tests,
                }
              : prev,
          )
        }
        onBack={() => setHubSection('hub')}
      />
    )
  }

  const gymAtmosphere = isTechniqueSection
  const programPage = (
    <main
      className={`${gymAtmosphere ? '' : vk.pageWithNav} px-2 py-3 sm:px-4 ${showPersonaChatDock && !chatOpen ? 'pb-[4.5rem]' : ''}`}
    >
      <div className="mx-auto w-full max-w-2xl space-y-2">
        <header
          className={`flex flex-wrap items-center gap-2 ${
            gymAtmosphere
              ? 'rounded-[10px] border border-white/30 bg-white/90 p-2.5 shadow-sm backdrop-blur-md sm:p-3'
              : ''
          }`}
        >
          {!gymAtmosphere ? <StudentPersonaAvatar personaId={portalPersonaId} size="lg" /> : null}
          <div className="min-w-0 flex-1">
            <h1 className={vk.h1Lg}>{programSectionTitle}</h1>
            {!gymAtmosphere ? (
              <>
                <p className="text-[13px] font-bold leading-tight text-[#2c2d2e]">{formatPortalPersonaName(persona)}</p>
                <p className={vk.mutedXs}>{persona.roleLabel}</p>
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => setHubSection('hub')} className={vk.btnSecondary}>
              В зал
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className={`${vk.btnSecondary} text-[12px]`}
            >
              Как учить
            </button>
          </div>
        </header>

        <nav
          className={`${vk.segmentBar} p-0.5 ${
            gymAtmosphere ? 'border border-white/25 bg-white/85 shadow-sm backdrop-blur-md' : ''
          }`}
          aria-label="Этап программы"
        >
          {[1, 2, 3].map((t) => {
            const disabled = !tierUnlocked[t]
            const active = tier === t
            const prog = tierProgress[t]
            const unlockPulse = t === 2 && tier2UnlockPulse && !active
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
                  active
                    ? vk.segmentBtnActive
                    : unlockPulse
                      ? 'tier-unlock-pulse border-2 border-[#4bb34b] bg-[#d4f5d4] font-bold text-[#1a6b1a] shadow-[0_0_14px_rgba(75,179,75,0.75)]'
                      : disabled
                        ? 'opacity-40'
                        : vk.segmentBtnInactive
                }`}
              >
                <span className="block truncate">{studentPortalTierLabel(t)}</span>
                {prog.total > 0 ? (
                  <span className="block tabular-nums text-[10px] opacity-80">
                    {prog.done}/{prog.total}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>

        {!tierUnlocked[tier] ? (
          <StudentPersonaBubble personaId={portalPersonaId} message={persona.phrases.tierLocked} />
        ) : total === 0 ? (
          <p className={vk.mutedXs}>На этом этапе пока нет элементов.</p>
        ) : viewAtom ? (
          <section
            className={`space-y-2 rounded-[10px] p-2 sm:p-3 ${
              gymAtmosphere
                ? 'border border-white/30 bg-white/92 shadow-sm backdrop-blur-md'
                : 'bg-white'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="text-[12px] font-semibold tabular-nums text-[#2d81e0]">
                По порядку: {leadingDone} / {total}
              </span>
              <span className={vk.mutedXs}>{studentPortalTierLabel(tier)}</span>
            </div>

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

            {isTechniqueGuidedLearning ? (
              <StudentTechniqueAtomFlow
                key={`technique-flow-${viewAtom.id}`}
                atom={viewAtom}
                personaId={portalPersonaId}
                personaMemory={personaMemory}
                trainingGoals={portalGoals}
                isFirstAtom={isFirstTechniqueAtom}
                disabled={saving}
                saving={saving}
                onMarkComplete={handleMark}
              />
            ) : isFirstAtomLearning ? (
              <StudentFirstAtomFlow
                atom={viewAtom}
                personaId={portalPersonaId}
                personaMemory={personaMemory}
                trainingGoals={portalGoals}
                disabled={saving}
                saving={saving}
                onMarkComplete={handleMark}
              />
            ) : (
              <>
                <AtomStudyPanel atom={viewAtom} />

                {personaMessage ? (
                  <StudentPersonaBubble personaId={portalPersonaId} message={personaMessage} compact />
                ) : null}

                {canMark ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleMark()}
                    className={`w-full ${vk.btnPrimary}`}
                  >
                    {saving ? 'Сохранение…' : 'Понял'}
                  </button>
                ) : null}
              </>
            )}

            {saveError ? <p className={vk.error}>{saveError}</p> : null}
          </section>
        ) : null}
      </div>

      {showPersonaChatDock ? (
        <StudentPersonaChatDock
          personaId={portalPersonaId}
          open={chatOpen}
          onOpenChange={setChatOpen}
          studentId={student.id}
          bridgeCoachId={bridgeCoachId ?? ''}
          onBridgeChange={(patch) => setStudent((prev) => (prev ? { ...prev, ...patch } : prev))}
          programHint={programChatHint}
          personaMemory={personaMemory}
          trainingGoals={portalGoals}
          onSessionClose={handleChatSessionClose}
        />
      ) : null}
    </main>
  )

  if (gymAtmosphere) {
    return <StudentTechniquePageShell>{programPage}</StudentTechniquePageShell>
  }

  return programPage
}
