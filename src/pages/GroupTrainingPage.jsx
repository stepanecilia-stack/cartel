import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  isLevel1BaseProgramComplete,
} from '../utils/studentTechnicalUpdate.js'
import {
  endGroupTrainingSession,
  getGroupTrainingSession,
  startGroupTrainingSession,
  updateGroupTrainingSessionSliders,
} from '../utils/groupTrainingSession.js'
import { StudentPickTile } from '../components/student/StudentPickTile.jsx'
import {
  displayNameFromStudent,
  studentInitials,
  studentPhotoUrl,
} from '../utils/studentModel'
import { vk } from '../utils/vkUi.js'

const SAVE_DEBOUNCE_MS = 350

function TrainingRangeSlider({ min, max, value, onChange, ariaLabel, variant = 'primary' }) {
  const fillPercent = max > 0 ? (value / max) * 100 : 0
  const fillClass = variant === 'accent' ? 'bg-[#6f3ff5]' : 'bg-[#2d81e0]'
  const thumbBorderClass =
    variant === 'accent'
      ? '[&::-moz-range-thumb]:border-[#6f3ff5] [&::-webkit-slider-thumb]:border-[#6f3ff5]'
      : '[&::-moz-range-thumb]:border-[#2d81e0] [&::-webkit-slider-thumb]:border-[#2d81e0]'

  return (
    <div className="relative flex h-9 items-center sm:h-8">
      <div
        className="pointer-events-none absolute inset-x-0 h-2 overflow-hidden rounded-full bg-[#e7e8ec]"
        aria-hidden
      >
        <div className={`h-full ${fillClass}`} style={{ width: `${fillPercent}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className={`relative z-10 h-9 w-full cursor-pointer appearance-none bg-transparent sm:h-8 ${thumbBorderClass} [&::-moz-range-progress]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md sm:[&::-moz-range-thumb]:h-5 sm:[&::-moz-range-thumb]:w-5 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[calc((0.5rem-1.5rem)/2)] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md sm:[&::-webkit-slider-thumb]:mt-[calc((0.5rem-1.25rem)/2)] sm:[&::-webkit-slider-thumb]:h-5 sm:[&::-webkit-slider-thumb]:w-5`}
      />
    </div>
  )
}

function normalizeSearchText(value) {
  return String(value ?? '').toLowerCase().trim()
}

function tierBadgeClass(variant) {
  if (variant === 'accent') return 'bg-[#f3f0ff] text-[#6f3ff5]'
  return 'bg-[#ecf3fc] text-[#2d81e0]'
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">Шаг 1</p>
        <h1 className={`mt-0.5 ${vk.h1Lg}`}>Прогресс техники</h1>
        <p className={`mt-1 ${vk.muted}`}>Отметьте учеников на сегодняшней тренировке.</p>
      </header>

      {hasActiveSession ? (
        <div className="rounded-[10px] border border-[#2d81e0]/35 bg-[#ecf3fc] px-3 py-2.5">
          <p className="text-[13px] font-medium text-[#2c2d2e]">Тренировка не завершена</p>
          <p className={`mt-0.5 ${vk.mutedXs}`}>
            Состав и ползунки сохранены — можно продолжить с любой страницы.
          </p>
          <button type="button" onClick={onResumeTraining} className={`mt-2 ${vk.btnPrimary}`}>
            Продолжить тренировку
          </button>
        </div>
      ) : null}

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
          {orderedL1.length > 0 ? (
            <span className={`inline-flex items-center gap-1 ${vk.mutedXs}`}>
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4bb34b] text-[9px] font-bold text-white"
                aria-hidden
              >
                ✓
              </span>
              — {orderedL1.length} приёмов на «Умение»
            </span>
          ) : null}
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
                  baseProgramComplete={isLevel1BaseProgramComplete(orderedL1, student.technicalData)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e7e8ec] bg-white/96 px-2 py-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mx-auto flex max-w-4xl items-center gap-2 sm:justify-end">
          <p className={`min-w-0 flex-1 truncate ${vk.mutedXs} sm:hidden`}>
            {selectedCount > 0
              ? `На тренировке: ${selectedCount}`
              : 'Выберите хотя бы одного ученика'}
          </p>
          <button
            type="button"
            onClick={onStartTraining}
            disabled={selectedCount === 0}
            className={`shrink-0 sm:min-w-[9rem] ${vk.btnPrimary} w-full sm:w-auto`}
          >
            Начать
            <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums">
              {selectedCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function StudentProgressRow({ student, orderedL1, onChange, savingStatus, sessionTiers }) {
  const orderedL2 = TECHNIQUE_LEVEL2_ATOMS
  const orderedL3 = useMemo(
    () => mergeWithRequiredLevel3Combinations(student.technicalCombinations),
    [student.technicalCombinations],
  )

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
  const [showTier2, setShowTier2] = useState(() => total1 > 0 && initial1 >= total1)
  const [showTier3, setShowTier3] = useState(() => total2 > 0 && initial2 >= total2 && total3 > 0)

  useEffect(() => {
    setSlider1(initial1)
  }, [student.id, initial1])
  useEffect(() => {
    setSlider2(initial2)
  }, [student.id, initial2])
  useEffect(() => {
    setSlider3(initial3)
  }, [student.id, initial3])

  useEffect(() => {
    if (total1 > 0 && slider1 >= total1) setShowTier2(true)
  }, [slider1, total1])

  useEffect(() => {
    if (total2 > 0 && slider2 >= total2) setShowTier3(true)
  }, [slider2, total2])

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
    () => isLevel1BaseProgramComplete(orderedL1, data),
    [orderedL1, data],
  )

  const tierLabel = (n, total, value) => `Ур.${n}: ${value}/${total}`

  const renderTierHint = (ordered, value, total) => {
    const current = value >= 1 && value <= total ? ordered[value - 1] : null
    const next = value < total ? ordered[value] : null
    if (!current && !(value === total && total > 0)) {
      return <p className={`mt-0.5 ${vk.mutedXs}`}>Не начато</p>
    }
    return (
      <div className={`mt-0.5 ${vk.mutedXs} leading-snug`}>
        {current ? (
          <p className="line-clamp-2" title={current.name}>
            <span className="font-semibold text-[#2d81e0]">Шаг {value}.</span> {current.name}
          </p>
        ) : null}
        {next ? (
          <p className="mt-0.5 hidden line-clamp-1 sm:block" title={next.name}>
            Дальше: {next.name}
          </p>
        ) : value === total && total > 0 ? (
          <p className="mt-0.5 font-medium text-[#4bb34b]">Уровень закрыт</p>
        ) : null}
      </div>
    )
  }

  const renderTierBlock = (tierNum, total, value, ordered, variant, onValueChange) => {
    if (total <= 0) return null
    const label = tierNum === 3 ? 'Ур.3' : tierNum === 2 ? 'Ур.2' : 'Ур.1'
    const sliderVariant = tierNum === 3 ? 'accent' : 'primary'
    return (
      <div className="border-t border-[#e7e8ec] pt-2 first:border-t-0 first:pt-0">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">{label}</p>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#2c2d2e]">
            {value}/{total}
          </span>
        </div>
        <TrainingRangeSlider
          min={0}
          max={total}
          value={value}
          variant={sliderVariant}
          ariaLabel={`${label}, ${student.displayName}`}
          onChange={(e) => {
            const raw = Number(e.target.value)
            const next = Math.min(Math.max(Number.isFinite(raw) ? raw : 0, 0), total)
            onValueChange(next)
          }}
        />
        {renderTierHint(ordered, value, total)}
      </div>
    )
  }

  return (
    <li className={vk.cardPadded}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <h2 className={`min-w-0 flex-1 truncate ${vk.listItemTitle}`}>{student.displayName}</h2>
        {baseComplete ? (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4bb34b] text-[11px] font-bold text-white"
            title="29 базовых приёмов на «Умение»"
            aria-label="База программы закрыта"
          >
            ✓
          </span>
        ) : null}
        <span className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${tierBadgeClass('primary')}`}>
          {tierLabel(1, total1, slider1)}
        </span>
        {showTier2 && total2 > 0 ? (
          <span className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${tierBadgeClass('primary')}`}>
            {tierLabel(2, total2, slider2)}
          </span>
        ) : null}
        {showTier3 && total3 > 0 ? (
          <span className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums ${tierBadgeClass('accent')}`}>
            {tierLabel(3, total3, slider3)}
          </span>
        ) : null}
        {statusLine ? (
          <span className={`text-[10px] font-medium ${statusClass}`}>{statusLine}</span>
        ) : null}
      </div>

      <div className="mt-2 space-y-2">
        {renderTierBlock(1, total1, slider1, orderedL1, 'primary', (next) => {
          setSlider1(next)
          emit(next, slider2, slider3)
        })}

        {showTier2 && total2 > 0
          ? renderTierBlock(2, total2, slider2, orderedL2, 'primary', (next) => {
              setSlider2(next)
              emit(slider1, next, slider3)
            })
          : null}
        {showTier3 && total3 > 0
          ? renderTierBlock(3, total3, slider3, orderedL3, 'accent', (next) => {
              setSlider3(next)
              emit(slider1, slider2, next)
            })
          : null}
      </div>
    </li>
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
    window.addEventListener('pagehide', flushPendingSaves)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flushPendingSaves)
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
    <div className="space-y-2">
      <header className="sticky top-12 z-20 -mx-0.5 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e7e8ec] bg-white px-2.5 py-2 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="min-w-0 flex-1">
          <h1 className={vk.h1Lg}>По шагам</h1>
          <p className={vk.mutedXs}>
            <span className="sm:hidden">Шаг 2 · автосохранение · {studentsForSession.length} чел.</span>
            <span className="hidden sm:inline">
              Три ползунка: программа, ур.2 и комбинации. Ур.2–3 открываются после закрытия предыдущего.
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button type="button" onClick={onBack} className={vk.btnSecondary}>
            Состав
          </button>
          <button type="button" onClick={handleComplete} className={vk.btnPrimary}>
            Завершить тренировку
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
    if (!coachId || isLoading || sessionRestoredRef.current) return
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
        <BackToHomeBar />
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
