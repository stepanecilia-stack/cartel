import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LeaderboardCategoryTabs from '../components/LeaderboardCategoryTabs.jsx'
import LeaderboardCuratorPanel from '../components/LeaderboardCuratorPanel.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import { useCoachLeaderboard } from '../hooks/useCoachLeaderboard.js'
import { getStudents } from '../services/firebaseService.js'
import {
  LEADERBOARD_CATEGORIES,
  buildLeaderboardRows,
} from '../utils/leaderboardMetrics.js'
import { loadLegacyNorms, loadLegacyTechnicalAtoms } from '../utils/ksrUtils.js'
import { displayNameFromStudent } from '../utils/studentModel.js'

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

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 px-2 py-3 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:min-h-[calc(100vh-72px)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-3 sm:space-y-6">
        <header className="space-y-2 sm:space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight sm:text-3xl">Рейтинг спортсменов</h1>
              <p className="mt-0.5 text-xs leading-snug text-slate-600 sm:mt-1 sm:text-sm dark:text-slate-400">
                {isSchool ? (
                  'Все ученики школы.'
                ) : (
                  <>
                    <span className="sm:hidden">Состав, ссылка и сравнение.</span>
                    <span className="hidden sm:inline">
                      Сравнение по активности и прогрессу. Настройте состав и поделитесь ссылкой.
                    </span>
                  </>
                )}
              </p>
            </div>
            <p className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold tabular-nums text-slate-800 sm:w-auto sm:py-1.5 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
              {(() => {
                const n = isSchool ? students.length : coach.curatedIds.length
                const word =
                  n === 1 ? 'ученик' : n < 5 ? 'ученика' : 'учеников'
                return isSchool ? `${n} ${word}` : `${n} ${word} в рейтинге`
              })()}
            </p>
          </div>

          <nav
            className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
            aria-label="Область рейтинга"
          >
            <Link
              to="/leaderboard"
              className={`flex min-h-[2.75rem] flex-1 items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold touch-manipulation sm:px-3 sm:text-sm ${
                !isSchool
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Мои ученики
            </Link>
            <Link
              to="/leaderboard/school"
              className={`flex min-h-[2.75rem] flex-1 items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold touch-manipulation sm:px-3 sm:text-sm ${
                isSchool
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
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

            <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:px-3 sm:text-sm">
              {activeCategory.hint}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">
            Отметьте учеников для рейтинга и публичной ссылки.
          </p>
        )}

        {loadError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {loadError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">Загрузка рейтинга…</p>
        ) : editMode && !isSchool ? (
          <LeaderboardTable
            rows={editListRows}
            categoryId={category}
            showCheckboxes
            curatedSet={curatedSet}
            onToggleStudent={coach.toggleStudentInCurated}
          />
        ) : students.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
            {isSchool
              ? 'В системе пока нет учеников.'
              : editMode
                ? 'Нет учеников для выбора.'
                : 'Выберите учеников в составе рейтинга или добавьте их на дашборде.'}
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

        <p className="text-center text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          <Link
            to="/"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← На дашборд
          </Link>
        </p>
      </div>
    </main>
  )
}
