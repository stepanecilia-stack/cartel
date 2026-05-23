import { useCallback, useEffect, useMemo, useState } from 'react'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { NormGoldGoalIcon, NormMedalChip } from '../components/NormMedals'
import { getCoachStudentsForCoach } from '../data/coachStudentsCache.js'
import { loadNormsOnce } from '../data/normsCache.js'
import {
  getLegacyNormsSource,
  getLegacyNormsSyncError,
  publishLegacyNormsFromSheet,
} from '../services/legacyNormsService.js'
import { isProgramAdmin } from '../utils/coachRoles.js'
import {
  getCoachProfile,
  getCurrentCoachId,
  getStudentById,
  updateStudentData,
} from '../services/firebaseService'
import { filterAthletesWithNorm, getAthleteNormForTest, listNormCatalogOptions } from '../utils/bulkNormSession.js'
import { loadLegacyTechnicalAtoms } from '../utils/ksrUtils.js'
import { formatNormAcceptedMeta } from '../utils/normAcceptanceHistory.js'
import {
  applyNormRawInput,
  formatNormGoldLabel,
  formatNormResultDisplay,
  isMinuteSecondNorm,
} from '../utils/normTestsStorage.js'
import { displayNameFromStudent } from '../utils/studentModel.js'
import { normAcceptanceSectionLabel } from '../utils/studentUpdateSections.js'
import {
  buildStudentTestsUpdatePayload,
  getStoredNormRow,
  mergeNormAcceptanceIntoTests,
  mergeStudentTestBuckets,
} from '../utils/studentNormUpdate.js'
import { vk } from '../utils/vkUi.js'

const STATUS_LABEL = {
  gold: 'золото',
  silver: 'серебро',
  bronze: 'бронза',
  red: 'ниже нормы',
}

function normScoreTone(status) {
  if (status === 'gold') return 'text-amber-700'
  if (status === 'silver') return 'text-[#818c99]'
  if (status === 'bronze') return 'text-orange-700'
  return 'text-[#e64646]'
}

const CATEGORY_TABS = [{ id: 'physical', label: 'Физика', full: 'Физическое развитие и беговые нормативы' }]

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
  const [programAdmin, setProgramAdmin] = useState(false)
  const [normsPublishBusy, setNormsPublishBusy] = useState(false)
  const [normsPublishNote, setNormsPublishNote] = useState('')

  useEffect(() => {
    const coachAuthId = getCurrentCoachId()
    if (!coachAuthId) {
      setProgramAdmin(false)
      return
    }
    getCoachProfile(coachAuthId)
      .then((profile) => setProgramAdmin(isProgramAdmin(profile)))
      .catch(() => setProgramAdmin(false))
  }, [coachId])

  const handlePublishNormsToFirestore = async () => {
    setNormsPublishNote('')
    setNormsPublishBusy(true)
    try {
      const count = await publishLegacyNormsFromSheet()
      setNormsPublishNote(`В Firestore загружено ${count} нормативов. Все тренеры получат их из облака.`)
      const norms = await loadNormsOnce()
      setAllNorms(norms)
    } catch (err) {
      console.error(err)
      setNormsPublishNote(err instanceof Error ? err.message : 'Не удалось опубликовать нормативы.')
    } finally {
      setNormsPublishBusy(false)
    }
  }

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
        getCoachStudentsForCoach(coachId),
        loadNormsOnce().catch(() => []),
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

        const { physical: physicalBase } = mergeStudentTestBuckets(fresh, {}, {})
        const serverRow = getStoredNormRow(fresh, 'physical', testId)
        const acceptedRow = mergeNormAcceptanceIntoTests({
          testsBucket: physicalBase,
          serverRow,
          norm,
          category: 'physical',
          evaluated: draftRow,
          coachId: coachAuthId,
          coachName,
        })
        physicalBase[norm.testId] = acceptedRow

        const payload = buildStudentTestsUpdatePayload({
          student: fresh,
          allNorms,
          technicalAtoms,
          physicalMerged: physicalBase,
          functionalMerged: {},
        })

        await updateStudentData(athlete.id, payload, {
          section: normAcceptanceSectionLabel('physical', norm),
        })
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

  const segmentClass = (active) =>
    [vk.segmentBtn, active ? vk.segmentBtnActive : vk.segmentBtnInactive].join(' ')

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-4xl`}>
        <BackToHomeBar />
        <header>
          <h1 className={vk.h1Lg}>Сдать норматив</h1>
          <p className={`mt-1 ${vk.muted}`}>
            Один тест — несколько спортсменов. В списке только подходящие по возрасту и полу.
          </p>
        </header>

        {loadError ? <p className={vk.error}>{loadError}</p> : null}
        {normsError ? <p className={vk.noticeWarn}>{normsError}</p> : null}
        {getLegacyNormsSyncError() ? (
          <p className={vk.noticeWarn}>{getLegacyNormsSyncError()}</p>
        ) : null}
        {programAdmin ? (
          <div className={`${vk.notice} space-y-2`}>
            <p className="text-[13px] text-[#2c2d2e]">
              Справочник нормативов:{' '}
              <strong>{getLegacyNormsSource() === 'firestore' ? 'Firestore' : 'Google Sheets (резерв)'}</strong>
              . Один раз опубликуйте таблицу в облако — дальше приложение не тянет CSV при каждом старте.
            </p>
            <button
              type="button"
              disabled={normsPublishBusy}
              onClick={() => void handlePublishNormsToFirestore()}
              className={vk.btnSecondary}
            >
              {normsPublishBusy ? 'Публикация…' : 'Опубликовать нормативы в Firestore'}
            </button>
            {normsPublishNote ? <p className={vk.mutedXs}>{normsPublishNote}</p> : null}
          </div>
        ) : null}
        {isLoading ? <p className={`text-center ${vk.muted}`}>Загрузка…</p> : null}

        <section className={`${vk.cardPadded} space-y-3`}>
          <h2 className={vk.h2}>Норматив</h2>
          <nav className={vk.segmentBar} aria-label="Раздел норматива">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={segmentClass(category === tab.id)}
                title={tab.full}
              >
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.full}</span>
              </button>
            ))}
          </nav>
          <label className="block">
            <span className={vk.label}>Упражнение / тест</span>
            <select
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              disabled={isLoading || normOptions.length === 0}
              className={vk.select}
            >
              <option value="">— выберите —</option>
              {normOptions.map((n) => (
                <option key={n.testId} value={n.testId}>
                  {n.testName}
                </option>
              ))}
            </select>
          </label>
          {selectedNormMeta?.description ? (
            <p className={vk.mutedXs}>{selectedNormMeta.description}</p>
          ) : null}
        </section>

        {testId ? (
          <section className={`${vk.cardPadded} space-y-2.5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className={vk.h2}>Спортсмены</h2>
              <span className={`${vk.mutedXs} tabular-nums`}>
                {eligibleAthletes.length} подходят
                {students.length > eligibleAthletes.length
                  ? ` · ${students.length - eligibleAthletes.length} не подходят`
                  : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени"
                className={`${vk.input} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={toggleAllFiltered}
                disabled={filteredEligible.length === 0}
                className={vk.btnSecondary}
              >
                {allFilteredSelected ? 'Снять всех' : 'Всех'}
              </button>
            </div>
            <ul className={`${vk.list} max-h-52 overflow-y-auto`}>
              {filteredEligible.length === 0 ? (
                <li className={`px-3 py-3 ${vk.muted}`}>Никто не подходит под этот норматив.</li>
              ) : (
                filteredEligible.map((s) => (
                  <li key={s.id} className="border-t border-[#e7e8ec] first:border-t-0">
                    <label className="flex cursor-pointer touch-manipulation items-center gap-2.5 px-3 py-2 active:bg-[#f5f6f8]">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="h-4 w-4 shrink-0 rounded border-[#e7e8ec] text-[#2d81e0]"
                      />
                      <span className={`min-w-0 flex-1 truncate ${vk.listItemTitle}`}>
                        {displayNameFromStudent(s)}
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}

        {testId && selectedAthletes.length > 0 ? (
          <section className={`${vk.cardPadded} space-y-3`}>
            <div>
              <h2 className={vk.h2}>Результаты</h2>
              <p className={vk.mutedXs}>
                {selectedNormMeta?.testName} · {selectedAthletes.length} чел.
              </p>
            </div>
            <ul className="space-y-2">
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
                  ? `Было: ${formatNormResultDisplay(norm, stored)}${stored.status ? ` (${STATUS_LABEL[stored.status] ?? stored.status})` : ''}`
                  : 'Не сдавал'
                const lastSavedText =
                  saved && Number.isFinite(saved.result)
                    ? `Сохранено: ${formatNormResultDisplay(norm, saved)}`
                    : null
                const acceptedMeta = saved ? formatNormAcceptedMeta(saved) : null

                return (
                  <li key={student.id} className={vk.previewCard}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate ${vk.listItemTitle}`}>{displayNameFromStudent(student)}</p>
                        <p className={`mt-1 flex flex-wrap items-center gap-1 ${vk.mutedXs}`}>
                          <NormGoldGoalIcon />
                          <span>
                            Золото: <span className="font-semibold tabular-nums text-amber-800">{goldHint}</span>
                          </span>
                        </p>
                        <p className={`mt-0.5 ${vk.mutedXs}`}>{prevText}</p>
                      </div>
                      {displayRow && Number.isFinite(displayRow.result) ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`text-[12px] font-semibold tabular-nums ${normScoreTone(displayRow.status)}`}>
                            {displayRow.normalizedScore}
                          </span>
                          <NormMedalChip status={displayRow.status} size="sm" />
                        </div>
                      ) : null}
                    </div>
                    <label className="mt-2 block">
                      <span className={vk.label}>Результат ({norm.unit})</span>
                      <input
                        type={isMinuteSecondNorm(norm) ? 'text' : 'number'}
                        inputMode={isMinuteSecondNorm(norm) ? 'numeric' : 'decimal'}
                        step={isMinuteSecondNorm(norm) ? undefined : 'any'}
                        className={vk.input}
                        value={inputVal}
                        onChange={(e) => setDraftRaw(student.id, e.target.value)}
                        placeholder={isMinuteSecondNorm(norm) ? 'м:сс' : 'число'}
                      />
                    </label>
                    {lastSavedText ? (
                      <p className="mt-1.5 text-[12px] font-medium text-[#4bb34b]">
                        {lastSavedText}
                        {saved?.status ? ` · ${STATUS_LABEL[saved.status] ?? saved.status}` : ''}
                      </p>
                    ) : null}
                    {acceptedMeta ? <p className={`mt-0.5 ${vk.mutedXs}`}>{acceptedMeta}</p> : null}
                  </li>
                )
              })}
            </ul>

            {saveError ? (
              <p className={vk.error} role="alert">
                {saveError}
              </p>
            ) : null}
            {saveOk && !saveError ? <p className={vk.success}>Результаты сохранены и учтены в баллах.</p> : null}

            <button
              type="button"
              disabled={isSaving || selectedAthletes.length === 0}
              onClick={handleSaveAll}
              className={`w-full sm:w-auto ${vk.btnPrimary}`}
            >
              {isSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </section>
        ) : null}
      </div>
    </main>
  )
}
