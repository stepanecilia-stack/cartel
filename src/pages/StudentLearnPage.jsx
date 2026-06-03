import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TechnicalAtomMedia from '../components/TechnicalAtomMedia.jsx'
import { getTechnicalProgramAtomsCache, subscribeTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import {
  fetchStudentForPortalSession,
  logoutStudentPortal,
  saveStudentPortalKnowledge,
} from '../services/studentPortalService.js'
import { loadLegacyTechnicalAtoms, TECHNIQUE_LEVEL2_ATOMS, TECH_DOMINANCE_OPTIONS } from '../utils/ksrUtils.js'
import { displayNameFromStudent } from '../utils/studentModel.js'
import {
  applyStudentKnowledgeMark,
  canStudentMarkKnowledge,
  countAtomsAtKnowledgeOrAbove,
  isTierCompleteForStudentPortal,
  resolveStudentPortalFocusIndex,
  STUDENT_PORTAL_LEVEL,
} from '../utils/studentPortalProgress.js'
import {
  normalizeStudentTechnicalData,
  orderTechnicalAtomsForProgram,
} from '../utils/technicalProgramProgress.js'
import { mergeWithRequiredLevel3Combinations } from '../utils/techniqueCatalog.js'
import { readPortalSession, clearPortalSession } from '../utils/studentPortalAuth.js'
import { formatFirestoreErrorMessage } from '../utils/firestoreErrorMessage.js'
import { vk } from '../utils/vkUi.js'

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
  const [technicalAtoms, setTechnicalAtoms] = useState(() => getTechnicalProgramAtomsCache() ?? [])
  const [tier, setTier] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session?.studentId) {
      navigate('/student-login', { replace: true })
      return undefined
    }
    let cancelled = false
    const run = async () => {
      try {
        const [s, atoms] = await Promise.all([
          fetchStudentForPortalSession(session.studentId),
          technicalAtoms.length ? Promise.resolve(technicalAtoms) : loadLegacyTechnicalAtoms(),
        ])
        if (cancelled) return
        setStudent(s)
        if (atoms?.length) setTechnicalAtoms(atoms)
      } catch (e) {
        if (cancelled) return
        console.error(e)
        clearPortalSession()
        setLoadError(formatFirestoreErrorMessage(e) || e?.message || 'Сессия недействительна.')
      }
    }
    void run()
    const unsub = subscribeTechnicalProgramAtomsCache((list) => {
      if (list?.length) setTechnicalAtoms(list)
    })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [session?.studentId, navigate, technicalAtoms.length])

  const orderedL1 = useMemo(() => orderTechnicalAtomsForProgram(technicalAtoms), [technicalAtoms])
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const orderedL3 = useMemo(() => {
    const combos = mergeWithRequiredLevel3Combinations(student?.technicalCombinations)
    return combos.map((c, index) => ({
      ...c,
      kind: 'combo',
      number: index + 1,
      name: c.name ?? `Комбо ${index + 1}`,
    }))
  }, [student?.technicalCombinations])

  const technicalData = useMemo(
    () => normalizeStudentTechnicalData(student?.technicalData),
    [student?.technicalData],
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
  const focusAtom = atomsForTier[focusIndex] ?? null
  const doneCount = countAtomsAtKnowledgeOrAbove(atomsForTier, technicalData)
  const total = atomsForTier.length
  const tierComplete = total > 0 && doneCount >= total

  const canMark = focusAtom && canStudentMarkKnowledge(atomsForTier, technicalData, focusAtom.id)

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
      setPlaying(false)
    } catch (e) {
      console.error(e)
      setSaveError(formatFirestoreErrorMessage(e) || 'Не удалось сохранить.')
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
          <Link to="/student-login" className={vk.btnPrimary}>
            Войти снова
          </Link>
        </div>
      </main>
    )
  }

  if (!student) {
    return (
      <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
        <p className={`text-center ${vk.muted}`}>Загрузка программы…</p>
      </main>
    )
  }

  const name = displayNameFromStudent(student)

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-lg space-y-2`}>
        <header className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <h1 className={vk.h1Lg}>Моя программа</h1>
            <p className={vk.mutedXs}>{name}</p>
          </div>
          <button type="button" onClick={() => void handleLogout()} className={vk.btnSecondary}>
            Выйти
          </button>
        </header>

        <p className={vk.noticeInfo}>
          В кабинете вы отмечаете только «{KNOWLEDGE_LABEL}». Уровни «Умение» и выше ставит тренер на занятии.
        </p>

        <nav className={`${vk.segmentBar} p-0.5`} aria-label="Этап программы">
          {[1, 2, 3].map((t) => {
            const disabled = !tierUnlocked[t]
            const active = tier === t
            const count = t === 1 ? orderedL1.length : t === 2 ? orderedL2.length : orderedL3.length
            if (count === 0 && t !== 1) return null
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setTier(t)
                  setPlaying(false)
                }}
                className={`min-w-0 flex-1 rounded-md px-1 py-1.5 text-[11px] font-medium sm:text-[12px] ${
                  active ? vk.segmentBtnActive : disabled ? 'opacity-40' : vk.segmentBtnInactive
                }`}
              >
                {tierLabel(t)}
              </button>
            )
          })}
        </nav>

        {!tierUnlocked[tier] ? (
          <p className={vk.mutedXs}>Сначала отметьте все приёмы предыдущего этапа как «{KNOWLEDGE_LABEL}».</p>
        ) : total === 0 ? (
          <p className={vk.mutedXs}>На этом этапе пока нет элементов.</p>
        ) : (
          <section className={`${vk.cardPadded} space-y-2`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold tabular-nums text-[#2d81e0]">
                {doneCount} / {total}
              </span>
              <span className={vk.mutedXs}>{tierLabel(tier)}</span>
            </div>

            {tierComplete ? (
              <p className="text-[13px] font-medium text-[#4bb34b]">
                Этап «{tierLabel(tier)}» пройден по знанию.{' '}
                {tier < 3 ? 'Перейдите на следующую вкладку.' : 'Покажите прогресс тренеру.'}
              </p>
            ) : focusAtom ? (
              <>
                <div className="mx-auto w-full max-w-[12rem]">
                  <TechnicalAtomMedia
                    atom={focusAtom}
                    className="aspect-[4/5] w-full rounded-lg"
                    playing={playing}
                    onTogglePlay={() => setPlaying((p) => !p)}
                    previewable={false}
                  />
                </div>
                <h2 className={vk.h2}>
                  <span className="text-[#818c99]">#{focusAtom.number}</span> {focusAtom.name}
                </h2>
                {focusAtom.howTo ? <p className={`${vk.mutedXs} whitespace-pre-wrap`}>{focusAtom.howTo}</p> : null}

                {canMark ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleMark()}
                    className={`w-full ${vk.btnPrimary}`}
                  >
                    {saving ? 'Сохранение…' : `Понял — отметить «${KNOWLEDGE_LABEL}» и далее`}
                  </button>
                ) : (
                  <p className={vk.mutedXs}>Этот приём уже отмечен. Переходите к следующему в списке.</p>
                )}
              </>
            ) : null}

            {saveError ? <p className={vk.error}>{saveError}</p> : null}
          </section>
        )}
      </div>
    </main>
  )
}
