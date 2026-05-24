import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  getNormResultInputProps,
  isMinuteSecondNorm,
  normalizeMinuteSecondFieldInput,
} from '../utils/normTestsStorage.js'
import { StudentPickTile } from '../components/student/StudentPickTile.jsx'
import {
  displayNameFromStudent,
  studentInitials,
  studentPhotoUrl,
} from '../utils/studentModel.js'
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

function normalizeSearchText(value) {
  return String(value ?? '').toLowerCase().trim()
}

function decorateStudent(raw) {
  const displayName = displayNameFromStudent(raw)
  return {
    ...raw,
    displayName,
    nameSearch: normalizeSearchText(displayName),
    photoUrl: studentPhotoUrl(raw),
    initials: studentInitials(raw),
  }
}

function NormSessionResultCard({
  student,
  norm,
  stored,
  draft,
  saved,
  inputVal,
  onResultChange,
}) {
  const previewRow = saved ?? draft
  const displayRow = previewRow ?? stored
  const goldHint = formatNormGoldLabel(norm)
  const prevText = stored
    ? `Было: ${formatNormResultDisplay(norm, stored)}${stored.status ? ` (${STATUS_LABEL[stored.status] ?? stored.status})` : ''}`
    : 'Не сдавал'
  const lastSavedText =
    saved && Number.isFinite(saved.result) ? `Сохранено: ${formatNormResultDisplay(norm, saved)}` : null
  const acceptedMeta = saved ? formatNormAcceptedMeta(saved) : null
  const minuteSecond = isMinuteSecondNorm(norm)
  const inputProps = getNormResultInputProps(norm)

  return (
    <li className="rounded-lg border border-[#e7e8ec] bg-[#f7f8fa] p-2.5">
      <div className="flex items-start gap-2">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full border border-[#e7e8ec] object-cover"
          />
        ) : (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e7e8ec] bg-white text-[11px] font-semibold text-[#818c99]"
            aria-hidden
          >
            {student.initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#2c2d2e]">{student.displayName}</p>
          <p className={`mt-0.5 flex flex-wrap items-center gap-1 ${vk.mutedXs}`}>
            <NormGoldGoalIcon />
            <span className="truncate">
              Золото: <span className="font-semibold tabular-nums text-amber-800">{goldHint}</span>
            </span>
          </p>
          <p className={`mt-0.5 truncate ${vk.mutedXs}`}>{prevText}</p>
        </div>
        {displayRow && Number.isFinite(displayRow.result) ? (
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`text-[12px] font-semibold tabular-nums ${normScoreTone(displayRow.status)}`}
            >
              {displayRow.normalizedScore}
            </span>
            <NormMedalChip status={displayRow.status} size="sm" />
          </div>
        ) : null}
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Результат ({norm.unit})</span>
        <input
          {...inputProps}
          className={vk.input}
          value={inputVal}
          onChange={(e) =>
            onResultChange(
              minuteSecond ? normalizeMinuteSecondFieldInput(e.target.value) : e.target.value,
            )
          }
          placeholder={minuteSecond ? '12:20' : `результат, ${norm.unit || ''}`.trim()}
        />
        {minuteSecond ? (
          <p className={`mt-1 ${vk.mutedXs}`}>
            На iPhone: введите цифрами (1220 = 12:20) или с двоеточием 12:20
          </p>
        ) : null}
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
  const [programAdmin, setProgramAdmin] = useState(false)
  const [normsPublishBusy, setNormsPublishBusy] = useState(false)
  const [normsPublishNote, setNormsPublishNote] = useState('')
  const [rosterExpanded, setRosterExpanded] = useState(true)
  const resultsSectionRef = useRef(null)

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
      const decorated = list.map(decorateStudent)
      decorated.sort((a, b) => a.nameSearch.localeCompare(b.nameSearch, 'ru'))
      setStudents(decorated)
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
    setRosterExpanded(true)
  }, [category])

  useEffect(() => {
    setSelectedIds(new Set())
    setDrafts({})
    setSavedRows({})
    setSaveOk(false)
    setSaveError('')
    setRosterExpanded(true)
  }, [testId])

  useEffect(() => {
    if (selectedIds.size === 0) setRosterExpanded(true)
  }, [selectedIds.size])

  const filteredEligible = useMemo(() => {
    const q = normalizeSearchText(searchQuery)
    if (!q) return eligibleAthletes
    return eligibleAthletes.filter((s) => s.nameSearch?.includes(q))
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

  const selectedCount = selectedIds.size
  const readyToSaveCount = useMemo(
    () =>
      selectedAthletes.filter((s) => {
        const row = drafts[s.id]
        return row && Number.isFinite(row.result)
      }).length,
    [selectedAthletes, drafts],
  )

  const selectedNamesPreview = useMemo(() => {
    if (selectedAthletes.length === 0) return ''
    const names = selectedAthletes.slice(0, 2).map((s) => s.displayName)
    const rest = selectedAthletes.length - names.length
    if (rest <= 0) return names.join(', ')
    return `${names.join(', ')} +${rest}`
  }, [selectedAthletes])

  const scrollToResults = useCallback(() => {
    setRosterExpanded(false)
    requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-4xl`}>
        <BackToHomeBar />
        <header className="px-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">Физика</p>
          <h1 className={`mt-0.5 ${vk.h1Lg}`}>Сдать норматив</h1>
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
        <section className={`${vk.cardPadded} space-y-2.5`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">Шаг 1</p>
            <span className="rounded-full bg-[#ecf3fc] px-2 py-0.5 text-[11px] font-semibold text-[#2d81e0]">
              Физика
            </span>
          </div>
          <label className="block">
            <span className={vk.label}>Упражнение / тест</span>
            <select
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              disabled={isLoading || normOptions.length === 0}
              className={vk.select}
            >
              <option value="">— выберите тест —</option>
              {normOptions.map((n) => (
                <option key={n.testId} value={n.testId}>
                  {n.testName}
                </option>
              ))}
            </select>
          </label>
          {isLoading ? <p className={vk.mutedXs}>Загрузка нормативов…</p> : null}
          {selectedNormMeta?.description ? (
            <p className={vk.mutedXs}>{selectedNormMeta.description}</p>
          ) : null}
        </section>

        {testId ? (
          <section className={`${vk.cardPadded} space-y-2.5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">Шаг 2</p>
                <span className={`${vk.mutedXs} tabular-nums`}>
                  {eligibleAthletes.length} подходят
                  {students.length > eligibleAthletes.length
                    ? ` · ${students.length - eligibleAthletes.length} не подходят`
                    : ''}
                </span>
              </div>
              {selectedCount > 0 && !rosterExpanded ? (
                <button type="button" onClick={() => setRosterExpanded(true)} className={vk.btnGhost}>
                  Изменить состав
                </button>
              ) : null}
            </div>

            {selectedCount > 0 && !rosterExpanded ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e7e8ec] bg-[#f7f8fa] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold tabular-nums text-[#2c2d2e]">
                    {selectedCount} спортсменов
                  </p>
                  <p className={`mt-0.5 truncate ${vk.mutedXs}`}>{selectedNamesPreview}</p>
                </div>
                <button type="button" onClick={scrollToResults} className={vk.btnCompact}>
                  К результатам
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Поиск спортсмена</span>
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
                    onClick={toggleAllFiltered}
                    disabled={filteredEligible.length === 0}
                    className={vk.btnCompactSecondary}
                  >
                    {allFilteredSelected ? 'Снять' : 'Всех'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-2.5 py-1 text-[12px] font-medium tabular-nums text-[#2c2d2e]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${selectedCount > 0 ? 'bg-[#2d81e0]' : 'bg-[#c4c8cc]'}`}
                      aria-hidden
                    />
                    {selectedCount} выбрано
                  </span>
                  {searchQuery.trim() && filteredEligible.length !== eligibleAthletes.length ? (
                    <span className={`${vk.mutedXs} tabular-nums`}>в списке: {filteredEligible.length}</span>
                  ) : null}
                  {selectedCount > 0 ? (
                    <button type="button" onClick={scrollToResults} className={`ml-auto ${vk.btnGhost}`}>
                      К результатам ↓
                    </button>
                  ) : null}
                </div>

                {filteredEligible.length === 0 ? (
                  <p className={`py-6 text-center ${vk.muted}`}>Никто не подходит под этот норматив.</p>
                ) : (
                  <div
                    className="-mx-0.5 max-h-36 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-44"
                    role="group"
                    aria-label="Спортсмены для сдачи норматива"
                  >
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {filteredEligible.map((student) => (
                        <StudentPickTile
                          key={student.id}
                          student={student}
                          checked={selectedIds.has(student.id)}
                          onToggle={() => toggleStudent(student.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        ) : null}

        {testId && selectedCount > 0 ? (
          <div className="sticky top-12 z-20 -mx-0.5 sm:top-14">
            <button
              type="button"
              onClick={scrollToResults}
              className={`${vk.btnPrimary} flex w-full items-center justify-center gap-2 shadow-md`}
            >
              К результатам
              <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums">
                {selectedCount}
              </span>
            </button>
          </div>
        ) : null}

        {testId && selectedAthletes.length > 0 ? (
          <div className="space-y-2 pb-[4.5rem] sm:pb-0">
            <section
              ref={resultsSectionRef}
              id="norm-session-results"
              className={`${vk.cardPadded} scroll-mt-16 space-y-2.5 sm:scroll-mt-4`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#818c99]">
                    Шаг 3
                  </p>
                  <h2 className={`mt-0.5 ${vk.h2}`}>Результаты</h2>
                </div>
                <span className={`${vk.mutedXs} tabular-nums`}>
                  {readyToSaveCount}/{selectedAthletes.length} готово
                </span>
              </div>
              <p className={`${vk.mutedXs} -mt-1`}>{selectedNormMeta?.testName}</p>

              <ul className="grid gap-2 sm:grid-cols-2">
                {selectedAthletes.map((student) => {
                  const norm = getAthleteNormForTest(allNorms, student, category, testId)
                  if (!norm) return null
                  const stored = getStoredNormRow(student, category, testId)
                  const draft = drafts[student.id]
                  const saved = savedRows[student.id]
                  const inputVal =
                    draft && !Number.isFinite(draft.result) && draft.resultRaw
                      ? draft.resultRaw
                      : draft
                        ? formatNormResultDisplay(norm, draft)
                        : ''

                  return (
                    <NormSessionResultCard
                      key={student.id}
                      student={student}
                      norm={norm}
                      stored={stored}
                      draft={draft}
                      saved={saved}
                      inputVal={inputVal}
                      onResultChange={(raw) => setDraftRaw(student.id, raw)}
                    />
                  )
                })}
              </ul>

              {saveError ? (
                <p className={vk.error} role="alert">
                  {saveError}
                </p>
              ) : null}
              {saveOk && !saveError ? (
                <p className={vk.success}>Результаты сохранены и учтены в баллах.</p>
              ) : null}
            </section>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e7e8ec] bg-white/96 px-2 py-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <div className="mx-auto flex max-w-4xl items-center gap-2 sm:justify-end">
                <p className={`min-w-0 flex-1 truncate ${vk.mutedXs} sm:hidden`}>
                  {readyToSaveCount > 0
                    ? `К сохранению: ${readyToSaveCount}`
                    : 'Введите результат хотя бы у одного'}
                </p>
                <button
                  type="button"
                  disabled={isSaving || readyToSaveCount === 0}
                  onClick={handleSaveAll}
                  className={`shrink-0 sm:min-w-[9rem] ${vk.btnPrimary} w-full sm:w-auto`}
                >
                  {isSaving ? 'Сохранение…' : 'Сохранить'}
                  {!isSaving && readyToSaveCount > 0 ? (
                    <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums">
                      {readyToSaveCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
