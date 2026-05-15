import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { NormGoldGoalIcon, NormMedalChip } from '../components/NormMedals'
import {
  getCoachProfile,
  getCoachStudents,
  getCurrentCoachId,
  getStudentById,
  updateStudentData,
} from '../services/firebaseService'
import { filterAthletesWithNorm, getAthleteNormForTest, listNormCatalogOptions } from '../utils/bulkNormSession.js'
import { loadLegacyNorms, loadLegacyTechnicalAtoms } from '../utils/ksrUtils.js'
import { formatNormAcceptedMeta } from '../utils/normAcceptanceHistory.js'
import {
  applyNormRawInput,
  formatNormGoldLabel,
  formatNormResultDisplay,
  isMinuteSecondNorm,
} from '../utils/normTestsStorage.js'
import { displayNameFromStudent } from '../utils/studentModel.js'
import {
  buildStudentTestsUpdatePayload,
  getStoredNormRow,
  mergeNormAcceptanceIntoTests,
  mergeStudentTestBuckets,
} from '../utils/studentNormUpdate.js'

const STATUS_LABEL = {
  gold: 'золото',
  silver: 'серебро',
  bronze: 'бронза',
  red: 'ниже нормы',
}

function normScoreTone(status) {
  if (status === 'gold') return 'text-amber-700'
  if (status === 'silver') return 'text-slate-600'
  if (status === 'bronze') return 'text-orange-700'
  return 'text-red-600'
}

export default function BulkNormSessionPage({ coachId }) {
  const [students, setStudents] = useState([])
  const [allNorms, setAllNorms] = useState([])
  const [technicalAtoms, setTechnicalAtoms] = useState([])
  const [loadError, setLoadError] = useState('')
  const [normsError, setNormsError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('physical')
  const [testId, setTestId] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [drafts, setDrafts] = useState({})
  const [savedRows, setSavedRows] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    if (!coachId) {
      setStudents([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError('')
    try {
      const [list, norms, atoms] = await Promise.all([
        getCoachStudents(coachId),
        loadLegacyNorms().catch(() => []),
        loadLegacyTechnicalAtoms().catch(() => []),
      ])
      setStudents(list)
      setAllNorms(norms)
      setTechnicalAtoms(atoms)
      if (!norms.length) {
        setNormsError('Таблица нормативов не загрузилась. Проверьте интернет.')
      } else {
        setNormsError('')
      }
    } catch (error) {
      console.error(error)
      setLoadError('Не удалось загрузить учеников.')
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }, [coachId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const normOptions = useMemo(() => listNormCatalogOptions(allNorms, category), [allNorms, category])

  const selectedNormMeta = useMemo(
    () => normOptions.find((n) => n.testId === testId) ?? null,
    [normOptions, testId],
  )

  const eligibleAthletes = useMemo(
    () => filterAthletesWithNorm(students, allNorms, category, testId),
    [students, allNorms, category, testId],
  )

  useEffect(() => {
    setTestId('')
    setSelectedIds(new Set())
    setDrafts({})
    setSavedRows({})
    setSaveOk(false)
    setSaveError('')
  }, [category])

  useEffect(() => {
    setSelectedIds(new Set())
    setDrafts({})
    setSavedRows({})
    setSaveOk(false)
    setSaveError('')
  }, [testId])

  const filteredEligible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return eligibleAthletes
    return eligibleAthletes.filter((s) => displayNameFromStudent(s).toLowerCase().includes(q))
  }, [eligibleAthletes, searchQuery])

  const selectedAthletes = useMemo(
    () => eligibleAthletes.filter((s) => selectedIds.has(s.id)),
    [eligibleAthletes, selectedIds],
  )

  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    const ids = filteredEligible.map((s) => s.id)
    const allOn = ids.length > 0 && ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOn) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const setDraftRaw = (studentId, raw) => {
    const student = students.find((s) => s.id === studentId)
    const norm = student ? getAthleteNormForTest(allNorms, student, category, testId) : null
    if (!norm) return
    const row = raw === '' ? null : applyNormRawInput(norm, raw)
    setDrafts((prev) => {
      const next = { ...prev }
      if (row === null) delete next[studentId]
      else next[studentId] = row
      return next
    })
    setSaveOk(false)
  }

  const resolveCoachDisplayName = async (id) => {
    if (!id) return 'Тренер'
    try {
      const p = await getCoachProfile(id)
      const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim()
      if (name) return name
    } catch {
      /* ignore */
    }
    return 'Тренер'
  }

  const handleSaveAll = async () => {
    setSaveError('')
    setSaveOk(false)
    if (!testId || selectedAthletes.length === 0) {
      setSaveError('Выберите норматив и хотя бы одного спортсмена.')
      return
    }

    const coachAuthId = getCurrentCoachId()
    if (!coachAuthId) {
      setSaveError('Войдите в аккаунт тренера.')
      return
    }

    const toSave = selectedAthletes.filter((s) => {
      const row = drafts[s.id]
      return row && Number.isFinite(row.result)
    })

    if (toSave.length === 0) {
      setSaveError('Введите результат хотя бы у одного выбранного спортсмена.')
      return
    }

    setIsSaving(true)
    const coachName = await resolveCoachDisplayName(coachAuthId)
    const nextSaved = { ...savedRows }
    const errors = []

    for (const athlete of toSave) {
      const norm = getAthleteNormForTest(allNorms, athlete, category, testId)
      const draftRow = drafts[athlete.id]
      if (!norm || !draftRow || !Number.isFinite(draftRow.result)) continue

      try {
        const fresh = await getStudentById(athlete.id)
        if (!fresh) {
          errors.push(displayNameFromStudent(athlete))
          continue
        }

        const { physical: physicalBase, functional: functionalBase } = mergeStudentTestBuckets(
          fresh,
          {},
          {},
        )
        const bucket = category === 'physical' ? physicalBase : functionalBase
        const serverRow = getStoredNormRow(fresh, category, testId)
        const acceptedRow = mergeNormAcceptanceIntoTests({
          testsBucket: bucket,
          serverRow,
          norm,
          category,
          evaluated: draftRow,
          coachId: coachAuthId,
          coachName,
        })
        bucket[norm.testId] = acceptedRow

        const physicalMerged = category === 'physical' ? bucket : physicalBase
        const functionalMerged = category === 'functional' ? bucket : functionalBase

        const payload = buildStudentTestsUpdatePayload({
          student: fresh,
          allNorms,
          technicalAtoms,
          physicalMerged,
          functionalMerged,
        })

        await updateStudentData(athlete.id, payload)
        nextSaved[athlete.id] = acceptedRow
        setStudents((prev) =>
          prev.map((s) => (s.id === athlete.id ? { ...s, ...payload } : s)),
        )
      } catch (err) {
        console.error(err)
        errors.push(displayNameFromStudent(athlete))
      }
    }

    setSavedRows(nextSaved)
    setIsSaving(false)

    if (errors.length > 0) {
      setSaveError(`Не удалось сохранить: ${errors.join(', ')}.`)
    } else {
      setSaveOk(true)
    }
  }

  const allFilteredSelected =
    filteredEligible.length > 0 && filteredEligible.every((s) => selectedIds.has(s.id))

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Сдать норматив
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Один норматив — несколько спортсменов. В списке только те, у кого он есть по возрасту и полу.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Назад на дашборд
          </Link>
        </header>

        {loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}
        {normsError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {normsError}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">1. Норматив</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: 'physical', label: 'Физическое развитие' },
              { id: 'functional', label: 'Функциональная готовность' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  category === tab.id
                    ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Упражнение / тест
            </span>
            <select
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              disabled={isLoading || normOptions.length === 0}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="">— выберите норматив —</option>
              {normOptions.map((n) => (
                <option key={n.testId} value={n.testId}>
                  {n.testName}
                </option>
              ))}
            </select>
          </label>
          {selectedNormMeta?.description ? (
            <p className="mt-2 text-xs text-slate-500">{selectedNormMeta.description}</p>
          ) : null}
        </section>

        {testId ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">2. Спортсмены</h2>
            <p className="mt-1 text-xs text-slate-500">
              Доступно по этому нормативу: {eligibleAthletes.length}
              {students.length > eligibleAthletes.length
                ? ` · остальные ${students.length - eligibleAthletes.length} не подходят по возрасту или полу`
                : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени..."
                className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={toggleAllFiltered}
                disabled={filteredEligible.length === 0}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {allFilteredSelected ? 'Снять всех' : 'Выбрать всех'}
              </button>
            </div>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2 dark:border-slate-700">
              {filteredEligible.length === 0 ? (
                <li className="px-2 py-3 text-sm text-slate-500">Никто из учеников не подходит под этот норматив.</li>
              ) : (
                filteredEligible.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-800 dark:text-slate-100">{displayNameFromStudent(s)}</span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}

        {testId && selectedAthletes.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">3. Результаты</h2>
            <p className="mt-1 text-xs text-slate-500">
              {selectedNormMeta?.testName} · выбрано: {selectedAthletes.length}
            </p>
            <ul className="mt-4 space-y-3">
              {selectedAthletes.map((student) => {
                const norm = getAthleteNormForTest(allNorms, student, category, testId)
                if (!norm) return null
                const stored = getStoredNormRow(student, category, testId)
                const draft = drafts[student.id]
                const saved = savedRows[student.id]
                const previewRow = saved ?? draft
                const displayRow = previewRow ?? stored
                const inputVal =
                  draft && !Number.isFinite(draft.result) && draft.resultRaw
                    ? draft.resultRaw
                    : draft
                      ? formatNormResultDisplay(norm, draft)
                      : ''
                const goldHint = formatNormGoldLabel(norm)
                const prevText = stored
                  ? `Ранее: ${formatNormResultDisplay(norm, stored)}${stored.status ? ` (${STATUS_LABEL[stored.status] ?? stored.status})` : ''}`
                  : 'Ранее не сдавал'
                const lastSavedText =
                  saved && Number.isFinite(saved.result)
                    ? `Сохранено: ${formatNormResultDisplay(norm, saved)}`
                    : null
                const acceptedMeta = saved ? formatNormAcceptedMeta(saved) : null

                return (
                  <li
                    key={student.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50 sm:p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {displayNameFromStudent(student)}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                          <NormGoldGoalIcon />
                          <span>
                            Золото:{' '}
                            <span className="font-semibold tabular-nums text-amber-900">{goldHint}</span>
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">{prevText}</p>
                      </div>
                      {displayRow && Number.isFinite(displayRow.result) ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold tabular-nums ${normScoreTone(displayRow.status)}`}
                          >
                            {displayRow.normalizedScore} б.
                          </span>
                          <NormMedalChip status={displayRow.status} size="sm" />
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="min-w-[140px] flex-1">
                        <span className="mb-1 block text-xs font-medium text-slate-600">
                          Результат ({norm.unit})
                        </span>
                        <input
                          type={isMinuteSecondNorm(norm) ? 'text' : 'number'}
                          inputMode={isMinuteSecondNorm(norm) ? 'numeric' : 'decimal'}
                          step={isMinuteSecondNorm(norm) ? undefined : 'any'}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                          value={inputVal}
                          onChange={(e) => setDraftRaw(student.id, e.target.value)}
                          placeholder={isMinuteSecondNorm(norm) ? 'м:сс' : 'число'}
                        />
                      </label>
                    </div>
                    {lastSavedText ? (
                      <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {lastSavedText}
                        {saved?.status ? ` · ${STATUS_LABEL[saved.status] ?? saved.status}` : ''}
                      </p>
                    ) : null}
                    {acceptedMeta ? (
                      <p className="mt-1 text-[11px] text-slate-500">{acceptedMeta}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            {saveError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            ) : null}
            {saveOk && !saveError ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Результаты сохранены и учтены в баллах.
              </div>
            ) : null}

            <button
              type="button"
              disabled={isSaving || selectedAthletes.length === 0}
              onClick={handleSaveAll}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto sm:px-6"
            >
              {isSaving ? 'Сохранение…' : 'Сохранить результаты'}
            </button>
          </section>
        ) : null}

        {isLoading ? <p className="text-center text-sm text-slate-500">Загрузка…</p> : null}
      </div>
    </main>
  )
}
