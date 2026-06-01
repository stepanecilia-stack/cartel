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
  endGroupTrainingSession,
  getGroupTrainingSession,
  startGroupTrainingSession,
  updateGroupTrainingSessionSliders,
} from '../utils/groupTrainingSession.js'
import TechniqueTierStepper from '../components/training/TechniqueTierStepper.jsx'
import TrainingPracticeTierTabs from '../components/training/TrainingPracticeTierTabs.jsx'
import { StudentPickTile } from '../components/student/StudentPickTile.jsx'
import {
  displayNameFromStudent,
  studentInitials,
  studentPhotoUrl,
} from '../utils/studentModel'
import TechnicalAtomMedia from '../components/TechnicalAtomMedia.jsx'
import StaticEmbedThumb from '../components/training/StaticEmbedThumb.jsx'
import { hasLoopingPreviewMedia, resolveTechnicalAtomMedia } from '../utils/technicalAtomMedia.js'
import { buildCoachPracticeCatalogByTier } from '../utils/groupTrainingPractice.js'
import { practiceGridThumbFrameClass } from '../utils/trainingAtomThumb.js'
import MediaLightbox from '../components/MediaLightbox.jsx'
import { vk } from '../utils/vkUi.js'

const SAVE_DEBOUNCE_MS = 350

function normalizeSearchText(value) {
  return String(value ?? '').toLowerCase().trim()
}

function tierBadgeClass(variant) {
  if (variant === 'accent') return 'bg-[#f3f0ff] text-[#6f3ff5]'
  return 'bg-[#ecf3fc] text-[#2d81e0]'
}

function AtomCompactPreviewVisual({ atom, dense = false, playing = false, onTogglePlay }) {
  if (hasLoopingPreviewMedia(atom)) {
    return (
      <TechnicalAtomMedia
        atom={atom}
        className="h-full w-full"
        previewable={false}
        playing={playing}
        onTogglePlay={onTogglePlay}
        compactThumb
        title={atom.name}
      />
    )
  }
  const kind = resolveTechnicalAtomMedia(atom).kind
  if (kind === 'embed' || kind === 'link') {
    return <StaticEmbedThumb />
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[#f0f2f5] p-0.5 text-[#818c99]">
      <span className={`leading-none ${dense ? 'text-base' : 'text-lg'}`}>✓</span>
      {!dense ? (
        <span className="line-clamp-2 text-center text-[7px] leading-tight">{atom.name}</span>
      ) : null}
    </div>
  )
}

function PracticeCoachTile({ atom, playing, onActivate }) {
  const hasMedia = hasLoopingPreviewMedia(atom)
  const playingThis = playing && hasMedia

  return (
    <button
      type="button"
      onClick={() => onActivate(atom)}
      className={`${practiceGridThumbFrameClass} touch-manipulation border-[#e7e8ec] bg-white text-left active:bg-[#f0f2f5] ${
        playingThis ? 'ring-2 ring-[#2d81e0] ring-offset-1' : ''
      }`}
      title={`#${atom.number ?? '—'} ${atom.name}`}
      aria-label={
        playingThis
          ? `${atom.name}, на весь экран`
          : hasMedia
            ? `Воспроизвести: ${atom.name}`
            : atom.name
      }
    >
      <span className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-white/90 px-1 py-px text-[11px] font-semibold tabular-nums text-[#818c99] shadow-sm">
        #{atom.number ?? '—'}
      </span>
      {hasMedia ? (
        <TechnicalAtomMedia
          atom={atom}
          className="h-full w-full"
          previewable={false}
          playing={playingThis}
          onTogglePlay={() => onActivate(atom)}
          title={atom.name}
        />
      ) : (
        <AtomCompactPreviewVisual atom={atom} dense />
      )}
      {atom.name ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 pb-1 pt-5 text-left">
          <span className="line-clamp-2 text-[10px] font-medium leading-snug text-white drop-shadow-sm sm:text-[11px]">
            {atom.name}
          </span>
        </span>
      ) : null}
    </button>
  )
}

function GroupPracticeBlock({ practiceAtomsByTier, showHeader = true }) {
  const [viewTier, setViewTier] = useState(1)
  const [playingAtomId, setPlayingAtomId] = useState(null)
  const [lightbox, setLightbox] = useState({ open: false, media: null, title: '' })

  const atomTiers = useMemo(
    () =>
      [
        { id: 1, label: 'Программа', atoms: practiceAtomsByTier.level1 ?? [] },
        { id: 2, label: 'Ур. 2', atoms: practiceAtomsByTier.level2 ?? [] },
        { id: 3, label: 'Комбо', atoms: practiceAtomsByTier.level3 ?? [] },
      ].filter((t) => t.atoms.length > 0),
    [practiceAtomsByTier],
  )

  const activeTier = atomTiers.some((t) => t.id === viewTier) ? viewTier : atomTiers[0]?.id ?? 1
  const atoms = atomTiers.find((t) => t.id === activeTier)?.atoms ?? []

  useEffect(() => {
    setPlayingAtomId(null)
  }, [viewTier, activeTier])

  const handleActivate = useCallback((atom) => {
    if (playingAtomId === atom.id) {
      const media = resolveTechnicalAtomMedia(atom)
      if (media.kind !== 'none') {
        setLightbox({ open: true, media, title: atom.name ?? '' })
      }
      return
    }
    if (hasLoopingPreviewMedia(atom)) {
      setPlayingAtomId(atom.id)
    }
  }, [playingAtomId])

  return (
    <section className={showHeader ? `${vk.cardPadded} space-y-2` : 'space-y-2'}>
      {showHeader ? (
        <header className="space-y-0.5">
          <h3 className={vk.h2}>Отработка приёмов</h3>
          <p className={vk.mutedXs}>
            Справочник для тренера · 1-й тап — воспроизведение, повторный тап — на весь экран
          </p>
        </header>
      ) : null}

      {atomTiers.length === 0 ? (
        <p className={vk.mutedXs}>Программа техники не загружена.</p>
      ) : (
        <>
          <div className={`${vk.segmentBar} p-0.5`} role="tablist" aria-label="Уровень программы">
            {atomTiers.map((tier) => {
              const active = tier.id === activeTier
              return (
                <button
                  key={tier.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setViewTier(tier.id)}
                  className={`min-w-0 flex-1 touch-manipulation rounded-md px-1 py-1.5 text-[11px] font-medium sm:text-[12px] ${
                    active ? vk.segmentBtnActive : vk.segmentBtnInactive
                  }`}
                >
                  <span className="block truncate">{tier.label}</span>
                  <span className="block tabular-nums text-[10px] opacity-80">{tier.atoms.length}</span>
                </button>
              )
            })}
          </div>

          <div className="rounded-lg bg-[#fafbfc] p-1 sm:p-1.5">
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {atoms.map((atom) => (
                <PracticeCoachTile
                  key={atom.id}
                  atom={atom}
                  playing={playingAtomId === atom.id}
                  onActivate={handleActivate}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <MediaLightbox
        open={lightbox.open}
        onClose={() => setLightbox({ open: false, media: null, title: '' })}
        media={lightbox.media ?? { kind: 'none', src: '' }}
        title={lightbox.title}
      />
    </section>
  )
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

function StudentProgressRow({ student, orderedL1, onChange, savingStatus, sessionTiers }) {
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const orderedL3 = useMemo(() => {
    const combos = mergeWithRequiredLevel3Combinations(student.technicalCombinations)
    return combos.map((c, index) => ({
      ...c,
      kind: 'combo',
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

  const passed1 = Math.max(slider1, baseline1)
  const passed2 = Math.max(slider2, baseline2)
  const passed3 = Math.max(slider3, baseline3)

  const [practiceViewTier, setPracticeViewTier] = useState(activeTier)

  useEffect(() => {
    setPracticeViewTier(activeTier)
  }, [student.id, activeTier])

  const practiceTierTabs = useMemo(() => {
    /** @type {{ id: number, label: string, count: number, total: number, isProgressTier?: boolean }[]} */
    const tabs = []
    if (total1 > 0 && (passed1 > 0 || activeTier === 1)) {
      tabs.push({
        id: 1,
        label: 'Программа',
        count: passed1,
        total: total1,
        isProgressTier: activeTier === 1,
      })
    }
    if (total2 > 0 && (passed2 > 0 || activeTier === 2)) {
      tabs.push({
        id: 2,
        label: 'Ур. 2',
        count: passed2,
        total: total2,
        isProgressTier: activeTier === 2,
      })
    }
    if (total3 > 0 && (passed3 > 0 || activeTier === 3)) {
      tabs.push({
        id: 3,
        label: 'Комбо',
        count: passed3,
        total: total3,
        isProgressTier: activeTier === 3,
      })
    }
    return tabs
  }, [passed1, passed2, passed3, total1, total2, total3, activeTier])

  useEffect(() => {
    if (!practiceTierTabs.some((t) => t.id === practiceViewTier)) {
      const fallback = practiceTierTabs[0]?.id ?? activeTier
      setPracticeViewTier(fallback)
    }
  }, [practiceTierTabs, practiceViewTier, activeTier])

  const viewTierMeta = useMemo(() => {
    if (practiceViewTier === 3) {
      return {
        tierLabel: 'Комбо',
        atoms: orderedL3,
        value: slider3,
        passed: passed3,
        accent: true,
      }
    }
    if (practiceViewTier === 2) {
      return {
        tierLabel: 'Ур. 2',
        atoms: orderedL2,
        value: slider2,
        passed: passed2,
        accent: false,
      }
    }
    return {
      tierLabel: 'Программа',
      atoms: orderedL1,
      value: slider1,
      passed: passed1,
      accent: false,
    }
  }, [
    practiceViewTier,
    orderedL1,
    orderedL2,
    orderedL3,
    slider1,
    slider2,
    slider3,
    passed1,
    passed2,
    passed3,
  ])

  const progressLocked = practiceViewTier !== activeTier
  const stepperValue = progressLocked ? viewTierMeta.passed : viewTierMeta.value

  return (
    <li className={`${vk.cardPadded} !p-2 sm:!p-3`}>
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
        <p className={`mt-0.5 hidden ${vk.mutedXs} sm:block`}>{activeTierMeta.doneHint}</p>
      ) : null}

      <div className="mt-1">
        <TrainingPracticeTierTabs
          tabs={practiceTierTabs}
          viewTier={practiceViewTier}
          onViewTierChange={setPracticeViewTier}
        />
        <TechniqueTierStepper
          atoms={viewTierMeta.atoms}
          value={stepperValue}
          passedCount={viewTierMeta.passed}
          tierLabel={viewTierMeta.tierLabel}
          accent={viewTierMeta.accent}
          progressLocked={progressLocked}
          dense
          hideHeader={practiceTierTabs.length > 0}
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
}) {
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const pendingTiersRef = useRef(new Map())
  const [savingStatusById, setSavingStatusById] = useState({})
  const localDataRef = useRef(new Map())
  const debounceRef = useRef(new Map())

  const practiceAtomsByTier = useMemo(
    () =>
      buildCoachPracticeCatalogByTier({
        students: studentsForSession,
        orderedL1,
        orderedL2,
      }),
    [studentsForSession, orderedL1, orderedL2],
  )

  useEffect(() => {
    for (const student of studentsForSession) {
      if (!localDataRef.current.has(student.id)) {
        localDataRef.current.set(student.id, {
          base: student,
          technicalData: normalizeStudentTechnicalData(student.technicalData),
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
    const onPageHide = () => flushPendingSaves()
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flushPendingSaves])

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

  const handleComplete = useCallback(() => {
    flushPendingSaves()
    onCompleteTraining()
  }, [flushPendingSaves, onCompleteTraining])

  return (
    <div className="space-y-1 sm:space-y-2">
      <header className="sticky top-12 z-20 -mx-0.5 flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#e7e8ec] bg-white px-2 py-1.5 sm:static sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="min-w-0 flex-1">
          <h1 className={vk.h1Lg}>Тренировка</h1>
          <p className={vk.mutedXs}>
            {studentsForSession.length} учеников · прогресс сохраняется само
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

      <ul className="space-y-1 lg:grid lg:grid-cols-2 lg:gap-1.5 lg:space-y-0">
        {studentsForSession.map((student) => (
          <StudentProgressRow
            key={student.id}
            student={student}
            orderedL1={orderedL1}
            onChange={handleSliderChange}
            savingStatus={savingStatusById[student.id] ?? 'idle'}
            sessionTiers={slidersByStudentId[student.id]}
          />
        ))}
      </ul>

      <details className="rounded-[10px] bg-white sm:hidden" open>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 touch-manipulation marker:content-none [&::-webkit-details-marker]:hidden">
          <span className={`min-w-0 flex-1 ${vk.h2}`}>Отработка приёмов</span>
          <span className="text-[12px] text-[#818c99]" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="border-t border-[#e7e8ec] px-2 pb-2 pt-1.5">
          <GroupPracticeBlock showHeader={false} practiceAtomsByTier={practiceAtomsByTier} />
        </div>
      </details>
      <div className="hidden sm:block">
        <GroupPracticeBlock practiceAtomsByTier={practiceAtomsByTier} />
      </div>
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
          />
        )}
      </div>
    </main>
  )
}
