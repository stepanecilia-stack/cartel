import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LeaderboardCategoryTabs from '../components/LeaderboardCategoryTabs.jsx'
import LeaderboardCuratorPanel from '../components/LeaderboardCuratorPanel.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { useCoachLeaderboard } from '../hooks/useCoachLeaderboard.js'
import { getStudents } from '../services/firebaseService.js'
import {
  LEADERBOARD_CATEGORIES,
  buildLeaderboardRows,
} from '../utils/leaderboardMetrics.js'
import { loadLegacyNorms, loadLegacyTechnicalAtoms } from '../utils/ksrUtils.js'
import { displayNameFromStudent } from '../utils/studentModel.js'
import { vk } from '../utils/vkUi.js'

/**
 * @param {{
 *   scope: 'coach' | 'school',
 *   coachId?: string,
 *   onSelectStudent?: (student: object) => void,
 * }} props
 */
export default function LeaderboardPage({ scope, coachId, onSelectStudent }) {
  const isSchool = scope === 'school'
  const [category, setCategory] = useState('motor')
  const [editMode, setEditMode] = useState(false)

  const coach = useCoachLeaderboard(!isSchool ? coachId : undefined)

  const [schoolStudents, setSchoolStudents] = useState([])
  const [schoolNorms, setSchoolNorms] = useState([])
  const [schoolAtoms, setSchoolAtoms] = useState([])
  const [schoolLoading, setSchoolLoading] = useState(isSchool)
  const [schoolError, setSchoolError] = useState('')

  const syncTimerRef = useRef(null)

  useEffect(() => {
    if (!isSchool) return undefined
    let cancelled = false
    setSchoolLoading(true)
    Promise.all([
      getStudents(),
      loadLegacyNorms().catch(() => []),
      loadLegacyTechnicalAtoms().catch(() => []),
    ])
      .then(([students, norms, atoms]) => {
        if (cancelled) return
        setSchoolStudents(students)
        setSchoolNorms(norms)
        setSchoolAtoms(atoms)
        setSchoolError('')
      })
      .catch(() => {
        if (!cancelled) setSchoolError('Не удалось загрузить данные для рейтинга.')
      })
      .finally(() => {
        if (!cancelled) setSchoolLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSchool])

  const students = isSchool ? schoolStudents : coach.curatedStudents
  const allNorms = isSchool ? schoolNorms : coach.allNorms
  const technicalAtoms = isSchool ? schoolAtoms : coach.technicalAtoms
  const isLoading = isSchool ? schoolLoading : coach.isLoading
  const loadError = isSchool ? schoolError : coach.loadError

  const rawById = useMemo(() => {
    const source = isSchool ? schoolStudents : coach.allStudents
    return new Map(source.map((s) => [s.id, s]))
  }, [isSchool, schoolStudents, coach.allStudents])

  const rows = useMemo(
    () => buildLeaderboardRows(students, allNorms, technicalAtoms, category, displayNameFromStudent),
    [students, allNorms, technicalAtoms, category],
  )

  const editListRows = useMemo(() => {
    if (isSchool) return []
    return [...coach.allStudents]
      .map((s) => ({ id: s.id, name: displayNameFromStudent(s) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [isSchool, coach.allStudents])

  const curatedSet = useMemo(() => new Set(coach.curatedIds), [coach.curatedIds])

  const activeCategory = LEADERBOARD_CATEGORIES.find((c) => c.id === category) ?? LEADERBOARD_CATEGORIES[0]
  const canOpenStudent = !isSchool && typeof onSelectStudent === 'function' && !editMode

  const handleOpenStudent = useCallback(
    (row) => {
      if (!canOpenStudent) return
      const raw = rawById.get(row.id)
      if (raw) onSelectStudent(raw)
    },
    [canOpenStudent, rawById, onSelectStudent],
  )

  useEffect(() => {
    if (isSchool || !coach.shareToken || editMode) return undefined
    clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      coach.syncShareNow(category).catch((e) => console.warn('leaderboard sync', e))
    }, 700)
    return () => clearTimeout(syncTimerRef.current)
  }, [
    isSchool,
    coach.shareToken,
    editMode,
    category,
    coach.curatedStudents,
    coach.curatedIds,
    coach.allNorms,
    coach.technicalAtoms,
    coach.syncShareNow,
  ])

  const scopeLinkClass = (active) =>
    `${vk.segmentBtn} flex min-h-8 flex-1 items-center justify-center text-center ${active ? vk.segmentBtnActive : vk.segmentBtnInactive}`

  const ratingCount = isSchool ? students.length : coach.curatedIds.length

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-3xl space-y-2`}>
        <BackToHomeBar />
        <header className={`${vk.cardPadded} py-2.5 sm:py-3`}>
          <div className="flex items-baseline justify-between gap-2">
            <h1 className={vk.h1Lg}>Рейтинг</h1>
            <span className={`shrink-0 tabular-nums ${vk.mutedXs}`}>
              {ratingCount}{' '}
              {ratingCount === 1 ? 'ученик' : ratingCount < 5 ? 'ученика' : 'учеников'}
            </span>
          </div>
          <nav className={`${vk.segmentBar} mt-1.5`} aria-label="Область рейтинга">
            <Link to="/leaderboard" className={scopeLinkClass(!isSchool)}>
              Мои ученики
            </Link>
            <Link to="/leaderboard/school" className={scopeLinkClass(isSchool)}>
              Вся школа
            </Link>
          </nav>
        </header>

        {!isSchool ? (
          <LeaderboardCuratorPanel
            editMode={editMode}
            onToggleEditMode={() => setEditMode((v) => !v)}
            curatedCount={coach.curatedIds.length}
            totalCount={coach.allStudents.length}
            onSelectAll={coach.selectAllCurated}
            onClearAll={coach.clearAllCurated}
            shareUrl={coach.shareUrl}
            shareError={coach.shareError}
            shareBusy={coach.shareBusy}
            shareFlash={coach.shareFlash}
            isLive={coach.isLive}
            onShare={() => {
              void coach.ensureShareLink(category)
            }}
            onCopyShareUrl={coach.copyShareLink}
          />
        ) : null}

        {!editMode ? (
          <>
            <LeaderboardCategoryTabs category={category} onCategoryChange={setCategory} />

            <p className={`${vk.mutedXs} px-0.5`}>{activeCategory.hint}</p>
          </>
        ) : (
          <p className={vk.muted}>Отметьте учеников для рейтинга и публичной ссылки.</p>
        )}

        {loadError ? <p className={vk.error}>{loadError}</p> : null}

        {isLoading ? (
          <p className={`text-center ${vk.muted}`}>Загрузка рейтинга…</p>
        ) : editMode && !isSchool ? (
          <LeaderboardTable
            rows={editListRows}
            categoryId={category}
            showCheckboxes
            curatedSet={curatedSet}
            onToggleStudent={coach.toggleStudentInCurated}
          />
        ) : students.length === 0 ? (
          <p className={vk.emptyState}>
            {isSchool
              ? 'В системе пока нет учеников.'
              : editMode
                ? 'Нет учеников для выбора.'
                : 'Выберите учеников в составе рейтинга или добавьте их на главной.'}
          </p>
        ) : (
          <LeaderboardTable
            rows={rows}
            categoryId={category}
            rawById={rawById}
            canOpenStudent={canOpenStudent}
            onOpenStudent={handleOpenStudent}
          />
        )}
      </div>
    </main>
  )
}
