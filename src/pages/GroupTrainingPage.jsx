import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { getCoachStudentsForCoach } from '../data/coachStudentsCache.js'
import { useGroupTrainingSession } from '../hooks/useGroupTrainingSession.js'
import { updateStudentData } from '../services/firebaseService'
import { loadLegacyTechnicalAtoms, TECHNIQUE_LEVEL2_ATOMS } from '../utils/ksrUtils'
import {
  orderTechnicalAtomsForProgram,
  normalizeStudentTechnicalData,
} from '../utils/technicalProgramProgress.js'
import { mergeWithRequiredLevel3Combinations } from '../utils/techniqueCatalog.js'
import { STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections.js'
import {
  applyProgressSliderToTechnicalData,
  buildTechnicalOnlyUpdatePayload,
  countLeadingMasteredAtoms,
  isBaseCartelProgramComplete,
} from '../utils/studentTechnicalUpdate.js'
import {
  applyPracticedAtomsToReinforcement,
  normalizeAtomReinforcement,
} from '../utils/atomReinforcement.js'
import {
  endGroupTrainingSession,
  getGroupTrainingSession,
  startGroupTrainingSession,
  updateGroupTrainingSessionPracticed,
  updateGroupTrainingSessionSliders,
} from '../utils/groupTrainingSession.js'
import TechniqueTierStepper from '../components/training/TechniqueTierStepper.jsx'
import { StudentPickTile } from '../components/student/StudentPickTile.jsx'
import {
  displayNameFromStudent,
  studentInitials,
  studentPhotoUrl,
} from '../utils/studentModel'
import { vk } from '../utils/vkUi.js'

const SAVE_DEBOUNCE_MS = 350

function normalizeSearchText(value) {
  return String(value ?? '').toLowerCase().trim()
}

function tierBadgeClass(variant) {
  if (variant === 'accent') return 'bg-[#f3f0ff] text-[#6f3ff5]'
  return 'bg-[#ecf3fc] text-[#2d81e0]'
}

/** Первый незакрытый уровень программы. */
function resolveActiveTrainingTier({ total1, total2, total3, progress1, progress2, progress3 }) {
  if (total1 > 0 && progress1 < total1) return 1
  if (total2 > 0 && progress2 < total2) return 2
  if (total3 > 0 && progress3 < total3) return 3
  if (total3 > 0) return 3
  if (total2 > 0) return 2
  return 1
}

function StudentProgressRow({
  student,
  orderedL1,
  onChange,
  savingStatus,
  sessionTiers,
  practicedAtomIds,
  onTogglePracticed,
}) {
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const orderedL3 = useMemo(() => {
    const combos = mergeWithRequiredLevel3Combinations(student.technicalCombinations)
    return combos.map((c, index) => ({
      ...c,
      number: index + 1,
      name: c.name ?? `Комбо ${index + 1}`,
    }))
  }, [student.technicalCombinations])

  const total1 = orderedL1.length
  const total2 = orderedL2.length
  const total3 = orderedL3.length
  const data = student.technicalData ?? {}

  const baseline1 = useMemo(() => countLeadingMasteredAtoms(orderedL1, data), [orderedL1, data])
  const baseline2 = useMemo(() => countLeadingMasteredAtoms(orderedL2, data), [orderedL2, data])
  const baseline3 = useMemo(
    () => countLeadingMasteredAtoms(orderedL3.map((c) => ({ id: c.id })), data),
    [orderedL3, data],
  )

  const initial1 = sessionTiers?.l1 != null ? sessionTiers.l1 : baseline1
  const initial2 = sessionTiers?.l2 != null ? sessionTiers.l2 : baseline2
  const initial3 = sessionTiers?.l3 != null ? sessionTiers.l3 : baseline3

  const [slider1, setSlider1] = useState(initial1)
  const [slider2, setSlider2] = useState(initial2)
  const [slider3, setSlider3] = useState(initial3)

  useEffect(() => setSlider1(initial1), [student.id, initial1])
  useEffect(() => setSlider2(initial2), [student.id, initial2])
  useEffect(() => setSlider3(initial3), [student.id, initial3])

  const activeTier = useMemo(
    () =>
      resolveActiveTrainingTier({
        total1,
        total2,
        total3,
        progress1: slider1,
        progress2: slider2,
        progress3: slider3,
      }),
    [total1, total2, total3, slider1, slider2, slider3],
  )

  const emit = (next1, next2, next3) => {
    onChange(student.id, { l1: next1, l2: next2, l3: next3 })
  }

  const statusLine = (() => {
    if (savingStatus === 'saving') return 'Сохранение…'
    if (savingStatus === 'error') return 'Ошибка'
    if (savingStatus === 'saved') return 'Сохранено'
    return null
  })()

  const statusClass = (() => {
    if (savingStatus === 'error') return 'text-[#e64646]'
    if (savingStatus === 'saved') return 'text-[#4bb34b]'
    return 'text-[#818c99]'
  })()

  const baseComplete = useMemo(
    () => isBaseCartelProgramComplete(orderedL1, data),
    [orderedL1, data],
  )

  const activeTierMeta = useMemo(() => {
    if (activeTier === 3) {
      return {
        tierLabel: 'Комбо',
        badge: `Комбо: ${slider3}/${total3}`,
        badgeVariant: 'accent',
        atoms: orderedL3,
        value: slider3,
        accent: true,
        doneHint:
          total2 > 0 && slider2 >= total2 && total1 > 0 && slider1 >= total1
            ? 'Программа и ур. 2 закрыты'
            : null,
      }
    }
    if (activeTier === 2) {
      return {
        tierLabel: 'Ур. 2',
        badge: `Ур.2: ${slider2}/${total2}`,
        badgeVariant: 'primary',
        atoms: orderedL2,
        value: slider2,
        accent: false,
        doneHint: total1 > 0 && slider1 >= total1 ? 'Базовая программа закрыта' : null,
      }
    }
    return {
      tierLabel: 'Программа',
      badge: `Прогр.: ${slider1}/${total1}`,
      badgeVariant: 'primary',
      atoms: orderedL1,
      value: slider1,
      accent: false,
      doneHint: null,
    }
  }, [
    activeTier,
    orderedL1,
    orderedL2,
    orderedL3,
    slider1,
    slider2,
    slider3,
    total1,
    total2,
    total3,
  ])

  const activeTierPassedCount = useMemo(() => {
    if (activeTier === 3) return Math.max(slider3, baseline3)
    if (activeTier === 2) return Math.max(slider2, baseline2)
    return Math.max(slider1, baseline1)
  }, [activeTier, slider1, slider2, slider3, baseline1, baseline2, baseline3])

  return (
    <li className={vk.cardPadded}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <h2 className={`min-w-0 flex-1 truncate ${vk.listItemTitle}`}>{student.displayName}</h2>
        {baseComplete && activeTier === 1 ? (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4bb34b] text-[11px] font-bold text-white"
            title="29 приёмов базы Cartel на «Умение»"
            aria-label="База программы закрыта"
          >
            ✓
          </span>
        ) : null}
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${tierBadgeClass(activeTierMeta.badgeVariant)}`}
        >
          {activeTierMeta.badge}
        </span>
        {statusLine ? (
          <span className={`text-[10px] font-medium ${statusClass}`}>{statusLine}</span>
        ) : null}
      </div>

      {activeTierMeta.doneHint ? (
        <p className={`mt-1 ${vk.mutedXs}`}>{activeTierMeta.doneHint}</p>
      ) : null}

      <div className="mt-2">
        <TechniqueTierStepper
          atoms={activeTierMeta.atoms}
          value={activeTierMeta.value}
          passedCount={activeTierPassedCount}
          tierLabel={activeTierMeta.tierLabel}
          accent={activeTierMeta.accent}
          practicedAtomIds={practicedAtomIds}
          onTogglePracticed={onTogglePracticed}
          onChange={(next) => {
            if (activeTier === 1) {
              setSlider1(next)
              emit(next, slider2, slider3)
            } else if (activeTier === 2) {
              setSlider2(next)
              emit(slider1, next, slider3)
            } else {
              setSlider3(next)
              emit(slider1, slider2, next)
            }
          }}
        />
      </div>
    </li>
  )
}

function ComposePhase({
  students,
  isLoading,
  loadError,
  searchQuery,
  setSearchQuery,
  selectedIds,
  toggleStudent,
  toggleAll,
  allSelectedInView,
  onStartTraining,
  onResumeTraining,
  filteredStudents,
  hasActiveSession,
  orderedL1,
}) {
  const selectedCount = selectedIds.size
  const totalInView = filteredStudents.length

  const selectionPercent =
    students.length > 0 ? Math.round((selectedCount / students.length) * 100) : 0

  return (
    <div className="space-y-2 pb-[4.5rem] sm:pb-0">
      <header className="px-0.5">
        <h1 className={vk.h1Lg}>Тренировка</h1>
        {hasActiveSession ? (
          <button type="button" onClick={onResumeTraining} className={`mt-2 ${vk.btnPrimary}`}>
            Продолжить
          </button>
        ) : null}
      </header>

      {loadError ? <p className={vk.error}>{loadError}</p> : null}

      <section className={`${vk.cardPadded} space-y-2.5`}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Поиск ученика</span>
            <span
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#818c99]"
              aria-hidden
            >
              ⌕
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени"
              className={`${vk.input} pl-8`}
            />
          </label>
          <button
            type="button"
            onClick={() => toggleAll(!allSelectedInView)}
            disabled={totalInView === 0}
            className={vk.btnCompactSecondary}
          >
            {allSelectedInView ? 'Снять' : 'Всех'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-2.5 py-1 text-[12px] font-medium tabular-nums text-[#2c2d2e]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${selectedCount > 0 ? 'bg-[#2d81e0]' : 'bg-[#c4c8cc]'}`}
              aria-hidden
            />
            {selectedCount} из {students.length}
          </span>
          {searchQuery.trim() && totalInView !== students.length ? (
            <span className={`${vk.mutedXs} tabular-nums`}>в списке: {totalInView}</span>
          ) : null}
          <div className="ml-auto hidden min-w-[5rem] flex-1 sm:block">
            <div className="h-1 overflow-hidden rounded-full bg-[#e7e8ec]">
              <div
                className="h-full rounded-full bg-[#2d81e0] transition-[width] duration-200"
                style={{ width: `${selectionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className={`py-8 text-center ${vk.muted}`}>Загрузка…</p>
        ) : students.length === 0 ? (
          <p className={`py-6 text-center ${vk.muted}`}>Нет учеников. Добавьте их на главной.</p>
        ) : filteredStudents.length === 0 ? (
          <p className={`py-6 text-center ${vk.muted}`}>По запросу никто не найден.</p>
        ) : (
          <div
            className="-mx-0.5 max-h-[min(58vh,26rem)] overflow-y-auto overscroll-contain pr-0.5"
            role="group"
            aria-label="Ученики на тренировке"
          >
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {filteredStudents.map((student) => (
                <StudentPickTile
                  key={student.id}
                  student={student}
                  checked={selectedIds.has(student.id)}
                  onToggle={() => toggleStudent(student.id)}
                  baseProgramComplete={isBaseCartelProgramComplete(orderedL1, student.technicalData)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e7e8ec] bg-white/96 px-2 py-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mx-auto flex max-w-4xl items-center gap-2 sm:justify-end">
          <p className={`min-w-0 flex-1 truncate ${vk.mutedXs} sm:hidden`}>
            {selectedCount > 0 ? `${selectedCount} в группе` : 'Отметьте учеников'}
          </p>
          <button
            type="button"
            onClick={onStartTraining}
            disabled={selectedCount === 0}
            className={`shrink-0 sm:min-w-[10rem] ${vk.btnPrimary} w-full sm:w-auto`}
          >
            Начать тренировку
            {selectedCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums">
                {selectedCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProgressPhase({
  coachId,
  studentsForSession,
  orderedL1,
  onBack,
  onCompleteTraining,
  technicalAtoms,
  slidersByStudentId,
  initialPracticedByStudentId,
}) {
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const pendingTiersRef = useRef(new Map())
  const [savingStatusById, setSavingStatusById] = useState({})
  const [practicedByStudentId, setPracticedByStudentId] = useState(
    () => initialPracticedByStudentId ?? {},
  )
  const localDataRef = useRef(new Map())
  const debounceRef = useRef(new Map())

  useEffect(() => {
    setPracticedByStudentId(initialPracticedByStudentId ?? {})
  }, [initialPracticedByStudentId])

  useEffect(() => {
    for (const student of studentsForSession) {
      if (!localDataRef.current.has(student.id)) {
        localDataRef.current.set(student.id, {
          base: student,
          technicalData: normalizeStudentTechnicalData(student.technicalData),
          atomReinforcement: normalizeAtomReinforcement(student.atomReinforcement),
        })
      }
    }
  }, [studentsForSession])

  const setStatus = useCallback((studentId, status) => {
    setSavingStatusById((prev) => ({ ...prev, [studentId]: status }))
  }, [])

  const commitSliderChange = useCallback(
    async (studentId, tiers) => {
      const slot = localDataRef.current.get(studentId)
      if (!slot) return
      const orderedL3 = mergeWithRequiredLevel3Combinations(slot.base.technicalCombinations).map((c) => ({
        id: c.id,
      }))
      let nextTechnical = slot.technicalData
      nextTechnical = applyProgressSliderToTechnicalData(orderedL1, nextTechnical, tiers.l1)
      nextTechnical = applyProgressSliderToTechnicalData(orderedL2, nextTechnical, tiers.l2)
      nextTechnical = applyProgressSliderToTechnicalData(orderedL3, nextTechnical, tiers.l3)
      slot.technicalData = nextTechnical
      try {
        setStatus(studentId, 'saving')
        const patch = buildTechnicalOnlyUpdatePayload(
          { ...slot.base, technicalData: nextTechnical },
          technicalAtoms,
          nextTechnical,
        )
        await updateStudentData(studentId, patch, { section: STUDENT_UPDATE_SECTION.groupTraining })
        slot.base = { ...slot.base, ...patch }
        setStatus(studentId, 'saved')
      } catch (error) {
        console.error('Не удалось сохранить прогресс ученика:', error)
        setStatus(studentId, 'error')
      }
    },
    [orderedL1, orderedL2, setStatus, technicalAtoms],
  )

  const flushPendingSaves = useCallback(() => {
    for (const handle of debounceRef.current.values()) clearTimeout(handle)
    debounceRef.current.clear()
    for (const [studentId, tiers] of pendingTiersRef.current.entries()) {
      void commitSliderChange(studentId, tiers)
    }
    pendingTiersRef.current.clear()
  }, [commitSliderChange])

  useEffect(
    () => () => {
      flushPendingSaves()
    },
    [flushPendingSaves],
  )

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushPendingSaves()
    }
    window.addEventListener('pagehide', flushPendingSaves)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flushPendingSaves)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flushPendingSaves])

  const handleTogglePracticed = useCallback(
    (studentId, atomId) => {
      setPracticedByStudentId((prev) => {
        const set = new Set(prev[studentId] ?? [])
        if (set.has(atomId)) set.delete(atomId)
        else set.add(atomId)
        const ids = [...set]
        const next = { ...prev }
        if (ids.length) next[studentId] = ids
        else delete next[studentId]
        if (coachId) updateGroupTrainingSessionPracticed(coachId, studentId, ids)
        return next
      })
    },
    [coachId],
  )

  const commitReinforcement = useCallback(async () => {
    for (const student of studentsForSession) {
      const atomIds = practicedByStudentId[student.id]
      if (!Array.isArray(atomIds) || atomIds.length === 0) continue
      const slot = localDataRef.current.get(student.id)
      const existing =
        slot?.atomReinforcement ?? normalizeAtomReinforcement(student.atomReinforcement)
      const next = applyPracticedAtomsToReinforcement(existing, atomIds)
      await updateStudentData(student.id, { atomReinforcement: next }, {
        section: STUDENT_UPDATE_SECTION.groupTraining,
      })
      if (slot) {
        slot.atomReinforcement = next
        slot.base = { ...slot.base, atomReinforcement: next }
      }
    }
  }, [studentsForSession, practicedByStudentId])

  const handleSliderChange = useCallback(
    (studentId, tiers) => {
      pendingTiersRef.current.set(studentId, tiers)
      if (coachId) updateGroupTrainingSessionSliders(coachId, studentId, tiers)
      setStatus(studentId, 'saving')
      const prevHandle = debounceRef.current.get(studentId)
      if (prevHandle) clearTimeout(prevHandle)
      const handle = setTimeout(() => {
        debounceRef.current.delete(studentId)
        const latest = pendingTiersRef.current.get(studentId)
        if (latest) void commitSliderChange(studentId, latest)
      }, SAVE_DEBOUNCE_MS)
      debounceRef.current.set(studentId, handle)
    },
    [coachId, commitSliderChange, setStatus],
  )

  const handleComplete = useCallback(async () => {
    flushPendingSaves()
    try {
      await commitReinforcement()
    } catch (error) {
      console.error('Не удалось сохранить упрочнение атомов:', error)
    }
    onCompleteTraining()
  }, [flushPendingSaves, commitReinforcement, onCompleteTraining])

  return (
    <div className="space-y-2">
      <header className="sticky top-12 z-20 -mx-0.5 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="min-w-0 flex-1">
          <h1 className={vk.h1Lg}>Тренировка</h1>
          <p className={vk.mutedXs}>
            {studentsForSession.length} учеников · двигаете ползунки — сохраняется само
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button type="button" onClick={onBack} className={vk.btnSecondary}>
            Группа
          </button>
          <button type="button" onClick={handleComplete} className={vk.btnPrimary}>
            Готово
          </button>
        </div>
      </header>

      {orderedL1.length === 0 ? (
        <p className={vk.noticeWarn}>Программа техники не загрузилась — обновите страницу.</p>
      ) : null}

      <ul className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
        {studentsForSession.map((student) => (
          <StudentProgressRow
            key={student.id}
            student={student}
            orderedL1={orderedL1}
            onChange={handleSliderChange}
            savingStatus={savingStatusById[student.id] ?? 'idle'}
            sessionTiers={slidersByStudentId[student.id]}
            practicedAtomIds={practicedByStudentId[student.id] ?? []}
            onTogglePracticed={(atomId) => handleTogglePracticed(student.id, atomId)}
          />
        ))}
      </ul>
    </div>
  )
}

export default function GroupTrainingPage({ coachId }) {
  const navigate = useNavigate()
  const activeSession = useGroupTrainingSession(coachId)
  const [phase, setPhase] = useState('compose')
  const [students, setStudents] = useState([])
  const [technicalAtoms, setTechnicalAtoms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const sessionRestoredRef = useRef(false)
  const rosterInitializedRef = useRef(false)

  useEffect(() => {
    if (!coachId) return undefined
    let cancelled = false
    const run = async () => {
      try {
        const [data, atoms] = await Promise.all([
          getCoachStudentsForCoach(coachId),
          loadLegacyTechnicalAtoms(),
        ])
        if (cancelled) return
        const decorated = data.map((raw) => {
          const displayName = displayNameFromStudent(raw)
          return {
            ...raw,
            displayName,
            nameSearch: normalizeSearchText(displayName),
            photoUrl: studentPhotoUrl(raw),
            initials: studentInitials(raw),
            technicalData: normalizeStudentTechnicalData(raw.technicalData),
            atomReinforcement: normalizeAtomReinforcement(raw.atomReinforcement),
          }
        })
        decorated.sort((a, b) => a.nameSearch.localeCompare(b.nameSearch, 'ru'))
        setStudents(decorated)
        setTechnicalAtoms(Array.isArray(atoms) ? atoms : [])
        setLoadError('')
      } catch (error) {
        console.error('Ошибка загрузки данных для групповой тренировки:', error)
        if (!cancelled) {
          setStudents([])
          setLoadError(
            'Не удалось загрузить учеников или программу техники. Проверьте интернет и попробуйте ещё раз.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [coachId])

  useEffect(() => {
    if (!coachId || isLoading || rosterInitializedRef.current) return
    rosterInitializedRef.current = true

    const session = getGroupTrainingSession(coachId)
    if (!session?.selectedIds.length) return

    sessionRestoredRef.current = true
    setSelectedIds(new Set(session.selectedIds))
    setPhase('progress')
  }, [coachId, isLoading])

  const orderedAtoms = useMemo(
    () => orderTechnicalAtomsForProgram(technicalAtoms),
    [technicalAtoms],
  )

  const filteredStudents = useMemo(() => {
    const q = normalizeSearchText(searchQuery)
    if (!q) return students
    return students.filter((student) => student.nameSearch.includes(q))
  }, [students, searchQuery])

  const allSelectedInView =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedIds.has(student.id))

  const toggleStudent = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (shouldSelect) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const student of filteredStudents) {
          if (shouldSelect) next.add(student.id)
          else next.delete(student.id)
        }
        return next
      })
    },
    [filteredStudents],
  )

  const studentsForSession = useMemo(() => {
    const ids =
      phase === 'progress' && activeSession?.selectedIds.length
        ? activeSession.selectedIds
        : [...selectedIds]
    const idSet = new Set(ids)
    return students.filter((student) => idSet.has(student.id)).map((student) => ({ ...student }))
  }, [students, selectedIds, phase, activeSession])

  const handleStartTraining = useCallback(() => {
    if (selectedIds.size === 0 || !coachId) return
    startGroupTrainingSession(coachId, selectedIds)
    setPhase('progress')
  }, [selectedIds, coachId])

  const handleResumeTraining = useCallback(() => {
    if (!coachId) return
    const session = getGroupTrainingSession(coachId)
    if (session?.selectedIds.length) {
      setSelectedIds(new Set(session.selectedIds))
    }
    setPhase('progress')
  }, [coachId])

  const handleBackToCompose = useCallback(() => {
    setPhase('compose')
  }, [])

  const handleCompleteTraining = useCallback(() => {
    if (coachId) endGroupTrainingSession(coachId)
    setPhase('compose')
    setSelectedIds(new Set())
    sessionRestoredRef.current = false
    rosterInitializedRef.current = true
  }, [coachId])

  if (!coachId) {
    return (
      <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
        <div className={`${vk.containerMid} max-w-md`}>
          <BackToHomeBar />
          <p className={`${vk.emptyState} py-6`}>
            Войдите в аккаунт тренера, чтобы отмечать прогресс техники.
          </p>
          <button type="button" onClick={() => navigate('/login')} className={vk.btnPrimary}>
            Войти
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-4xl`}>
        {phase === 'compose' ? (
          <div className="mb-1 flex justify-end">
            <Link to="/" className={vk.link}>
              На главную
            </Link>
          </div>
        ) : (
          <BackToHomeBar />
        )}
        {phase === 'compose' ? (
          <ComposePhase
            students={students}
            isLoading={isLoading}
            loadError={loadError}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedIds={selectedIds}
            toggleStudent={toggleStudent}
            toggleAll={toggleAll}
            allSelectedInView={allSelectedInView}
            onStartTraining={handleStartTraining}
            onResumeTraining={handleResumeTraining}
            hasActiveSession={Boolean(activeSession?.selectedIds.length)}
            filteredStudents={filteredStudents}
            orderedL1={orderedAtoms}
          />
        ) : (
          <ProgressPhase
            coachId={coachId}
            studentsForSession={studentsForSession}
            orderedL1={orderedAtoms}
            technicalAtoms={technicalAtoms}
            onBack={handleBackToCompose}
            onCompleteTraining={handleCompleteTraining}
            slidersByStudentId={activeSession?.slidersByStudentId ?? {}}
            initialPracticedByStudentId={activeSession?.practicedAtomIdsByStudentId ?? {}}
          />
        )}
      </div>
    </main>
  )
}
