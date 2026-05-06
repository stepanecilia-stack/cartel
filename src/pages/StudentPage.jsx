import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TECH_DOMINANCE_OPTIONS,
  calculateEffectiveKSR,
  calculateKD,
  calculateKsrAndKsp,
  calculateLegacySectionScores,
  evaluateLegacyTest,
  getNormsForAthlete,
  getWeights,
  loadLegacyNorms,
  loadLegacyTechnicalAtoms,
  normalizeTechnicalDominanceKey,
} from '../utils/ksrUtils'
import {
  anthropometryFieldToInputString,
  birthYearToInputString,
  computeAthleteAgeYears,
  displayNameFromStudent,
  formatBirthYearRu,
  formatShortIdDisplay,
  normalizeBirthYearNumber,
  studentAthleteShape,
  studentPhotoUrl,
} from '../utils/studentModel'
import { buildPublicSharePayload, isValidProgressShareToken } from '../utils/publicSharePayload'
import {
  ensureStudentShortId,
  generateOpaqueShareToken,
  isValidSixDigitShortId,
  setPublicStudentShareDocument,
  updateStudentData,
} from '../services/firebaseService'
import { getSensitiveMotorQualities } from '../utils/sensitivePeriods'

const SECTION_LABELS = {
  техника: 'техника (удары, ноги, защита)',
  физика: 'сила и мощность тела',
  функционал: 'выносливость и высокий темп',
}

const TAB_ITEMS = [
  { id: 'anthropometry', label: 'Антропометрия' },
  { id: 'physical', label: 'Физическое развитие' },
  { id: 'functional', label: 'Функциональная готовность' },
  { id: 'technical', label: 'Техника' },
]

function emptyTestsRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && ('result' in v || 'normalizedScore' in v)) out[k] = v
  }
  return out
}

function emptyTechnicalRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue
    out[k] = { ...v, level: normalizeTechnicalDominanceKey(v.level) }
  }
  return out
}

function StudentPage({ student, onBack, onStudentUpdated }) {
  const onStudentUpdatedRef = useRef(onStudentUpdated)
  onStudentUpdatedRef.current = onStudentUpdated
  const safeStudent = useMemo(() => {
    if (!student?.id) {
      return {
        id: null,
        name: 'Ученик не выбран',
        scores: { техника: 0, физика: 0, функционал: 0 },
        height: 0,
        reach: 0,
        weight: 0,
        birthYear: 0,
        gender: 'M',
      }
    }
    return { id: student.id, ...studentAthleteShape(student) }
  }, [student])

  const [activeTab, setActiveTab] = useState('anthropometry')
  const [allNorms, setAllNorms] = useState([])
  const [technicalAtoms, setTechnicalAtoms] = useState([])
  const [loadingNorms, setLoadingNorms] = useState(true)
  const [normsError, setNormsError] = useState('')
  const [physicalResults, setPhysicalResults] = useState({})
  const [functionalResults, setFunctionalResults] = useState({})
  const [technicalData, setTechnicalData] = useState({})
  const [anthropometry, setAnthropometry] = useState({
    height: '',
    reach: '',
    weight: '',
    birthYear: '',
    date: new Date().toISOString().slice(0, 10),
    gender: 'M',
  })
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copyIdFlash, setCopyIdFlash] = useState(false)
  const [shortIdAssignError, setShortIdAssignError] = useState('')
  const [nextAttestationDate, setNextAttestationDate] = useState('')
  const [shareFlash, setShareFlash] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareBusy, setShareBusy] = useState(false)
  const shortIdDeniedRef = useRef(new Set())

  useEffect(() => {
    const loadLegacyData = async () => {
      try {
        const [norms, atoms] = await Promise.all([loadLegacyNorms(), loadLegacyTechnicalAtoms()])
        setAllNorms(norms)
        setTechnicalAtoms(atoms)
        setNormsError('')
      } catch (error) {
        console.error('Ошибка загрузки legacy данных:', error)
        setNormsError(
          'Таблица нормативов с сайта не подгрузилась (часто это интернет или блокировка). Поля всё равно можно заполнить и сохранить.',
        )
      } finally {
        setLoadingNorms(false)
      }
    }
    loadLegacyData()
  }, [])

  useEffect(() => {
    if (!student?.id) return
    const d =
      typeof student.nextAttestationDate === 'string' && student.nextAttestationDate
        ? student.nextAttestationDate.slice(0, 10)
        : ''
    setNextAttestationDate(d)
  }, [student?.id, student?.nextAttestationDate])

  useEffect(() => {
    if (!student?.id) return
    const sh = studentAthleteShape(student)
    const tests = student.tests && typeof student.tests === 'object' ? student.tests : {}
    setAnthropometry({
      height: anthropometryFieldToInputString(student.height ?? sh.height),
      reach: anthropometryFieldToInputString(student.reach ?? sh.reach),
      weight: anthropometryFieldToInputString(student.weight ?? sh.weight),
      birthYear: birthYearToInputString(student.birthYear ?? student.birthYearLabel ?? sh.birthYear),
      date:
        typeof student.anthropometryDate === 'string' && student.anthropometryDate
          ? student.anthropometryDate
          : new Date().toISOString().slice(0, 10),
      gender: sh.gender === 'F' ? 'F' : 'M',
    })
    setPhysicalResults(emptyTestsRecord(tests.physical))
    setFunctionalResults(emptyTestsRecord(tests.functional))
    setTechnicalData(emptyTechnicalRecord(student.technicalData))
  }, [student])

  useEffect(() => {
    if (!student?.id) return undefined

    if (shortIdDeniedRef.current.has(student.id)) {
      setShortIdAssignError(
        'Личный шестизначный код не создался: у программы нет права записать его в базу. Нужен человек, который подключал приложение к интернету — он знает, где включить разрешение.',
      )
      return undefined
    }

    if (isValidSixDigitShortId(student.short_id)) {
      shortIdDeniedRef.current.delete(student.id)
      setShortIdAssignError('')
      return undefined
    }

    setShortIdAssignError('')

    let cancelled = false
    ;(async () => {
      try {
        const res = await ensureStudentShortId(student.id)
        if (cancelled || !res) return
        if (res.error === 'permission-denied') {
          shortIdDeniedRef.current.add(student.id)
          setShortIdAssignError(
            'Личный код не записался: база отклонила сохранение. Обратитесь к тому, кто настраивал доступ программы к базе.',
          )
          return
        }
        if (!res.short_id) return
        if (!isValidSixDigitShortId(student.short_id) || Number(student.short_id) !== res.short_id) {
          onStudentUpdatedRef.current?.({ short_id: res.short_id })
        }
      } catch (e) {
        console.error('ensureStudentShortId', e)
        setShortIdAssignError('Не удалось получить код: проверьте интернет или настройки доступа к базе.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student?.id, student?.short_id])

  const resolvedBirthYear = useMemo(() => {
    const fromForm = normalizeBirthYearNumber(anthropometry.birthYear)
    if (fromForm) return fromForm
    return normalizeBirthYearNumber(safeStudent.birthYear) || 0
  }, [anthropometry.birthYear, safeStudent.birthYear])

  const athleteForNorms = useMemo(() => {
    const height = Number(anthropometry.height) || 0
    const reach = Number(anthropometry.reach) || 0
    const weight = Number(anthropometry.weight) || 0
    return {
      ...safeStudent,
      height,
      reach,
      weight,
      birthYear: resolvedBirthYear,
      gender: anthropometry.gender === 'F' ? 'F' : 'M',
    }
  }, [safeStudent, anthropometry, resolvedBirthYear])

  const physicalNorms = useMemo(
    () => getNormsForAthlete(allNorms, athleteForNorms, 'physical'),
    [allNorms, athleteForNorms],
  )
  const functionalNorms = useMemo(
    () => getNormsForAthlete(allNorms, athleteForNorms, 'functional'),
    [allNorms, athleteForNorms],
  )

  const scores = useMemo(
    () =>
      calculateLegacySectionScores({
        physicalNorms,
        functionalNorms,
        physicalResults,
        functionalResults,
        technicalData,
      }),
    [functionalNorms, functionalResults, physicalNorms, physicalResults, technicalData],
  )

  const dynamicStudent = useMemo(() => {
    const height = Number(anthropometry.height) || 0
    const reach = Number(anthropometry.reach) || 0
    const weight = Number(anthropometry.weight) || 0
    return {
      ...safeStudent,
      name: displayNameFromStudent(safeStudent),
      height,
      reach,
      weight,
      birthYear: resolvedBirthYear,
      gender: anthropometry.gender === 'F' ? 'F' : 'M',
    }
  }, [safeStudent, anthropometry, resolvedBirthYear])

  const weights = getWeights(dynamicStudent)
  const ksrKsp = useMemo(
    () => calculateKsrAndKsp(dynamicStudent, scores),
    [dynamicStudent, scores],
  )
  const baseKSR = ksrKsp.baseKSR
  const kdBundle = useMemo(() => {
    if (technicalAtoms.length > 0) return calculateKD(technicalAtoms, technicalData)
    const fromDb = Number(student?.kd)
    if (student?.id && Number.isFinite(fromDb) && fromDb >= 0.25) {
      return {
        kd: Number(fromDb.toFixed(4)),
        atomCount: Number(student.kdAtomCount) || 0,
        automationPercent: Number(student.kdAutomationPercent) || 25,
        automatedCount: 0,
      }
    }
    return calculateKD([], technicalData)
  }, [
    technicalAtoms,
    technicalData,
    student?.id,
    student?.kd,
    student?.kdAtomCount,
    student?.kdAutomationPercent,
  ])
  const effectiveKSR = useMemo(
    () => calculateEffectiveKSR(baseKSR, kdBundle.kd),
    [baseKSR, kdBundle.kd],
  )
  const apeIndex = Number(anthropometry.reach || 0) - Number(anthropometry.height || 0)

  const shortIdRaw = student?.short_id ?? safeStudent?.short_id
  const shortIdDigits =
    shortIdRaw != null && shortIdRaw !== '' && Number.isFinite(Number(shortIdRaw))
      ? String(Math.floor(Number(shortIdRaw))).padStart(6, '0')
      : ''

  const ownerCoachIdsForShare = useMemo(
    () => [...new Set([...(student?.coach_ids || []), student?.coachId].filter(Boolean))],
    [student?.coach_ids, student?.coachId],
  )

  const buildSharePayloadForPublic = async (weightHistoryArg) => {
    let norms = allNorms
    let atoms = technicalAtoms
    if (!norms.length) {
      try {
        norms = await loadLegacyNorms()
        setAllNorms(norms)
      } catch {
        norms = []
      }
    }
    if (!atoms.length) {
      try {
        atoms = await loadLegacyTechnicalAtoms()
        setTechnicalAtoms(atoms)
      } catch {
        atoms = []
      }
    }

    const physicalMerged = { ...emptyTestsRecord(student?.tests?.physical), ...physicalResults }
    const functionalMerged = { ...emptyTestsRecord(student?.tests?.functional), ...functionalResults }
    const technicalMerged = {
      ...emptyTechnicalRecord(student?.technicalData),
      ...technicalData,
    }

    const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
    const w = Number(anthropometry.weight) || 0
    return buildPublicSharePayload({
      displayName: displayNameFromStudent(student),
      photoURL: studentPhotoUrl(student),
      currentWeight: w,
      weightHistory: weightHistoryArg,
      measureDate,
      nextAttestationDate: nextAttestationDate || null,
      allNorms: norms,
      athleteForNorms,
      physicalResults: physicalMerged,
      functionalResults: functionalMerged,
      technicalAtoms: atoms,
      technicalData: technicalMerged,
    })
  }

  const handleShareProgress = async () => {
    if (!student?.id) return
    setShareError('')
    setShareBusy(true)
    try {
      let token = typeof student.progressShareToken === 'string' ? student.progressShareToken : ''
      if (!isValidProgressShareToken(token)) {
        token = generateOpaqueShareToken()
        await updateStudentData(student.id, { progressShareToken: token })
        onStudentUpdated?.({ progressShareToken: token })
      }
      const prevHistory = Array.isArray(student.weightHistory) ? [...student.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      const wCur = Number(anthropometry.weight) || 0
      let histForShare = prevHistory
      if (wCur >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== wCur || last.date !== measureDate) {
          histForShare = [...prevHistory, { date: measureDate, weight: wCur }].slice(-36)
        }
      }
      const sharePayload = await buildSharePayloadForPublic(histForShare)
      await setPublicStudentShareDocument(token, {
        payload: sharePayload,
        ownerCoachIds: ownerCoachIdsForShare,
      })
      const url = `${window.location.origin}/share/${token}`
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setShareFlash(true)
      window.setTimeout(() => setShareFlash(false), 3200)
    } catch (e) {
      console.error(e)
      if (e?.code === 'permission-denied') {
        setShareError(
          'База отклонила запись: в консоли Firebase откройте Firestore → Rules и опубликуйте правила из файла firestore.rules проекта (нужны правила для коллекции public_student_shares и обновление карточки ученика).',
        )
      } else {
        setShareError(
          'Не удалось создать ссылку или записать её в базу. Проверьте интернет и вход в аккаунт тренера.',
        )
      }
    } finally {
      setShareBusy(false)
    }
  }

  const copyShortId = async () => {
    if (!shortIdDigits) return
    try {
      await navigator.clipboard.writeText(shortIdDigits)
      setCopyIdFlash(true)
      window.setTimeout(() => setCopyIdFlash(false), 2000)
      return
    } catch {
      /* fallback */
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = shortIdDigits
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyIdFlash(true)
      window.setTimeout(() => setCopyIdFlash(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const sensitivePeriods = useMemo(
    () => getSensitiveMotorQualities(computeAthleteAgeYears(resolvedBirthYear)),
    [resolvedBirthYear],
  )

  const criticalZone = Object.entries(scores).reduce(
    (worst, [section, score]) => {
      const weightKey =
        section === 'техника' ? 'T' : section === 'физика' ? 'P' : 'F'
      const weight = weights[weightKey]
      const currentValue = Number(score) * weight
      const maxValue = 100 * weight
      const gap = maxValue - currentValue

      if (gap > worst.gap) {
        return { section, gap }
      }
      return worst
    },
    { section: 'техника', gap: -1 },
  )

  const updateNormResult = (category, norm, rawValue) => {
    const set =
      category === 'physical' ? setPhysicalResults : setFunctionalResults
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      set((prev) => {
        const next = { ...prev }
        delete next[norm.testId]
        return next
      })
      return
    }
    const result = Number(rawValue)
    if (!Number.isFinite(result)) return
    const evaluated = evaluateLegacyTest(result, norm)
    set((prev) => ({
      ...prev,
      [norm.testId]: {
        ...evaluated,
        result,
        date: new Date().toISOString().slice(0, 10),
      },
    }))
  }

  const handleSave = async () => {
    if (!student?.id) {
      setSaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    setSaveError('')
    setSaveOk(false)
    setIsSaving(true)
    try {
      const height = Number(anthropometry.height) || 0
      const reach = Number(anthropometry.reach) || 0
      const weight = Number(anthropometry.weight) || 0
      const gender = anthropometry.gender === 'F' ? 'F' : 'M'
      const birthYear =
        normalizeBirthYearNumber(anthropometry.birthYear) ||
        normalizeBirthYearNumber(safeStudent.birthYear)
      const mergedAthlete = {
        ...safeStudent,
        height,
        reach,
        weight,
        birthYear,
        gender,
      }
      const nextScores = calculateLegacySectionScores({
        physicalNorms,
        functionalNorms,
        physicalResults,
        functionalResults,
        technicalData,
      })
      const w = getWeights(mergedAthlete)
      const kspBundle = calculateKsrAndKsp(mergedAthlete, nextScores)
      const technicalScore = nextScores.техника / 100

      const kdStats = calculateKD(technicalAtoms, technicalData)
      const effective = calculateEffectiveKSR(kspBundle.baseKSR, kdStats.kd)

      const prevHistory = Array.isArray(student.weightHistory) ? [...student.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      let weightHistory = prevHistory
      if (weight >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== weight || last.date !== measureDate) {
          weightHistory = [...prevHistory, { date: measureDate, weight }].slice(-36)
        }
      }

      const payload = {
        height,
        reach,
        weight,
        gender,
        birthYear,
        birthYearLabel: formatBirthYearRu(birthYear),
        anthropometryDate: measureDate,
        weightHistory,
        nextAttestationDate: nextAttestationDate || null,
        tests: {
          physical: physicalResults,
          functional: functionalResults,
        },
        technicalData,
        scores: nextScores,
        archetype: w.archetype,
        archetypeSmart: w.archetypeSmart,
        archetypeFull: w.archetypeFull ?? null,
        apeIndex: w.apeIndex,
        baseKSR: kspBundle.baseKSR,
        ksp: kspBundle.ksp,
        kspZ: kspBundle.kspZ,
        kspH: kspBundle.kspH,
        kspIdealHeight: kspBundle.kspIdealHeight ?? null,
        technicalScore,
        trainingProgress: kspBundle.trainingProgress,
        kd: kdStats.kd,
        kdAtomCount: kdStats.atomCount,
        kdAutomationPercent: kdStats.automationPercent,
        effectiveKSR: effective,
      }

      await updateStudentData(student.id, payload)
      setSaveOk(true)
      onStudentUpdated?.(payload)

      const shareTok =
        typeof student.progressShareToken === 'string' ? student.progressShareToken : ''
      if (isValidProgressShareToken(shareTok)) {
        try {
          const sharePayload = await buildSharePayloadForPublic(weightHistory)
          await setPublicStudentShareDocument(shareTok, {
            payload: sharePayload,
            ownerCoachIds: ownerCoachIdsForShare,
          })
        } catch (e) {
          console.warn('Не удалось обновить публичную страницу прогресса:', e)
        }
      }
    } catch (err) {
      console.error(err)
      setSaveError('Не удалось сохранить. Проверьте интернет и права доступа к базе данных.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderNormInputs = (category, norms, values) => {
    if (loadingNorms) {
      return <p className="text-sm text-slate-500">Загрузка нормативов...</p>
    }
    if (norms.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          Нет нормативов для возраста и пола. Укажите год рождения и пол в разделе «Антропометрия».
        </p>
      )
    }
    return norms.map((norm) => {
      const row = values[norm.testId]
      const displayVal = row?.result !== undefined && row?.result !== null ? String(row.result) : ''
      return (
        <label key={norm.testId} className="block space-y-1 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <span className="text-sm font-semibold text-slate-900">{norm.testName}</span>
          <p className="text-xs text-slate-500">{norm.description}</p>
          <p className="text-xs text-blue-600">
            Цель «отлично»: {norm.gold} {norm.unit} · как сравнивается результат:{' '}
            {norm.measureType === 'MAX' ? 'чем больше — тем лучше' : 'чем меньше — тем лучше'}
          </p>
          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div className="min-w-[140px] flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Результат ({norm.unit})</span>
              <input
                type="number"
                step="any"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={displayVal}
                onChange={(e) => updateNormResult(category, norm, e.target.value)}
              />
            </div>
            {row && (
              <p className="text-xs text-slate-600">
                Оценка в баллах: <span className="font-semibold text-slate-900">{row.normalizedScore}</span> · уровень:{' '}
                {row.status === 'gold'
                  ? 'отлично'
                  : row.status === 'silver'
                    ? 'хорошо'
                    : row.status === 'bronze'
                      ? 'норма'
                      : 'ниже нормы'}
              </p>
            )}
          </div>
        </label>
      )
    })
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
        >
          Назад к дашборду
        </button>

        <section className="rounded-xl bg-white p-8 shadow-sm">
          <div className="mb-5 rounded-xl border-2 border-slate-300 bg-slate-100 px-4 py-3 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Соответствие категории
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {weights.categoryCorrespondence ?? '—'}
              <span className="font-semibold text-slate-600">
                {' '}
                (
                {weights.categoryDisplayCm != null && weights.categoryCorrespondence !== 'Нет данных'
                  ? `${weights.categoryDisplayCm} см`
                  : '—'}
                )
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{safeStudent.name}</h1>
            {student?.id && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="text-slate-500">Личный код:</span>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-900">
                  {shortIdDigits ? formatShortIdDisplay(shortIdDigits) : '—'}
                </span>
                <button
                  type="button"
                  disabled={!shortIdDigits}
                  onClick={copyShortId}
                  title="Скопировать шесть цифр без пробелов — чтобы передать другому тренеру"
                  aria-label="Скопировать личный код ученика"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                {copyIdFlash && (
                  <span className="text-xs font-medium text-emerald-700">Скопировано</span>
                )}
              </div>
            )}
          </div>
          {shortIdAssignError && (
            <p className="mt-2 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {shortIdAssignError}
            </p>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Ссылка для родителей и спортсмена</h3>
            <p className="mt-1 text-xs text-slate-600">
              На публичной странице нет внутренних баллов тренера — только прогресс по тестам и технике.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={shareBusy || !student?.id}
                onClick={handleShareProgress}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shareBusy ? 'Готовим ссылку…' : 'Поделиться прогрессом'}
              </button>
              {shareFlash && (
                <span className="text-xs font-medium text-emerald-700">Ссылка скопирована в буфер обмена</span>
              )}
            </div>
            {shareError && (
              <p className="mt-2 text-xs font-medium text-red-700">{shareError}</p>
            )}
            <label className="mt-4 block max-w-xs space-y-1">
              <span className="text-xs font-medium text-slate-600">Дата следующей аттестации (для публичной страницы)</span>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={nextAttestationDate}
                onChange={(e) => setNextAttestationDate(e.target.value)}
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">Сохраните карточку ученика, чтобы дата попала в облако вместе с остальными данными.</p>
          </div>
          {(weights.tacticMode === 'infighter' || weights.tacticMode === 'outfighter') && (
            <p className="mt-2 text-slate-600">
              Тактический профиль:{' '}
              <span className="font-semibold text-blue-600">{weights.archetype}</span>
            </p>
          )}
          {weights.tacticMode === 'standard' && weights.typageFromTable && (
            <div className="mt-2 space-y-1 text-slate-600">
              <p>
                <span className="text-slate-500">Какой «тип телосложения» у этой весовой категории по таблице (не про самого человека):</span>{' '}
                <span className="font-semibold text-slate-800">{weights.archetype}</span>
                <span className="ml-1 text-xs text-slate-500">
                  — образ для веса, не личный диагноз спортсмена
                </span>
              </p>
              <p>
                <span className="text-slate-500">
                  Какой стиль боя считает программа по размаху рук и росту (чем длиннее руки относительно роста — тем
                  больше упор на дистанцию):
                </span>{' '}
                <span className="font-semibold text-blue-600">{weights.archetypeSmart}</span>
              </p>
            </div>
          )}
          {weights.tacticMode === 'standard' && !weights.typageFromTable && (
            <p className="mt-2 text-slate-600">
              Стиль боя по размаху и росту:{' '}
              <span className="font-semibold text-blue-600">{weights.archetypeSmart}</span>
            </p>
          )}
          {weights.tacticMode === 'infighter' && weights.tacticAdvice && (
            <div
              className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
              role="alert"
            >
              {weights.tacticAdvice}
            </div>
          )}
          {weights.tacticMode === 'outfighter' && weights.tacticAdvice && (
            <div
              className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900"
              role="status"
            >
              {weights.tacticAdvice}
            </div>
          )}
          <p className="mt-1 text-sm text-slate-600">
            {resolvedBirthYear
              ? `${formatBirthYearRu(resolvedBirthYear)} · возраст для расчётов: ${computeAthleteAgeYears(resolvedBirthYear) ?? '—'} лет`
              : 'Год рождения не указан — укажите в антропометрии'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Руки длиннее или короче роста на:{' '}
            <span className="font-semibold text-slate-800">
              {Number.isFinite(apeIndex) ? apeIndex.toFixed(1) : '0.0'} см
            </span>{' '}
            (считается как размах минус рост; влияет на то, какие разделы важнее в оценке)
          </p>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Что важнее развивать по данным тела</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {weights.tacticMode === 'infighter' && (
                <>
                  Из-за разницы в росте техника дистанционного боя имеет низкую эффективность.{' '}
                  <strong>Фокус на физическую мощь</strong> — физика 50%, функционал 30%, техника 20%
                  (инфайт, плотный блок).
                </>
              )}
              {weights.tacticMode === 'outfighter' && (
                <>
                  Удерживайте дистанцию и линейные удары: <strong>техника 60%</strong>, функционал 25%,
                  физика 15% — запрет на лишнее сближение.
                </>
              )}
              {weights.tacticMode === 'standard' && weights.archetypeSmart === 'Линейный' && (
                <>
                  Ваш главный рычаг — <strong>техника</strong> (она даёт <strong>половину</strong> общего балла).
                  Функционал — 30%, сила тела — 20%. Если «потолок по телу» не меняется, то поднять{' '}
                  <strong>общий балл</strong> проще всего за счёт техники — она тянет оценку сильнее, чем сила.
                </>
              )}
              {weights.tacticMode === 'standard' && weights.archetypeSmart === 'Силовой' && (
                <>
                  Ваш главный рычаг — <strong>физическая мощь</strong> (влияние на результат{' '}
                  <strong>45%</strong>). Функционал — 30%, техника — 25%.
                </>
              )}
              {weights.tacticMode === 'standard' && weights.archetypeSmart === 'Универсал' && (
                <>
                  Универсальный профиль: <strong>Техника 40%</strong>, физика 30%, функционал 30% — равномерное
                  развитие всех разделов.
                </>
              )}
              {weights.tacticMode === 'none' && (
                <span className="text-slate-500">
                  Укажите вес, рост и год рождения — тогда появится оценка соответствия категории и приоритеты.
                </span>
              )}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Доли в общей оценке: техника — {Math.round(weights.T * 100)}%, сила тела —{' '}
              {Math.round(weights.P * 100)}%, выносливость и форма — {Math.round(weights.F * 100)}% (в сумме 100%).
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-800">Базовый балл (ещё без учёта «насколько вкатана техника»)</p>
              <p className="text-xs text-slate-600">
                Средний прогресс по трём разделам: {Math.round(ksrKsp.trainingProgress ?? 0)} из 100. Этот прогресс
                умножается на «потолок по телу» ниже — получается базовый балл.
              </p>
              <p className="text-5xl font-bold tracking-tight text-slate-900">{baseKSR}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-5 py-4">
              <p className="text-sm font-medium text-amber-900">Потолок по телу (сколько «максимум» можно набрать)</p>
              <p className="mt-1 text-xs text-slate-600">
                Считается из роста, веса, пола и возраста: насколько данные тела близки к «эталону» для категории. Это не
                оценка ударов — только тело.
              </p>
              <p className="mt-3 text-5xl font-bold tracking-tight text-amber-950">{ksrKsp.ksp}</p>
              <p className="mt-2 text-xs text-slate-600">
                Детали расчёта (для любознательных): антропометрия ≈ {Math.round((ksrKsp.kspZ ?? 0) * 100)}%, близость
                к эталонному росту ≈ {Math.round((ksrKsp.kspH ?? 0) * 100)}%
                {ksrKsp.kspIdealHeight ? ` · ориентир роста для веса: ${ksrKsp.kspIdealHeight}` : ''}
              </p>
              {ksrKsp.kspTypage && (
                <p className="mt-2 text-xs text-slate-700">
                  Подпись категории по таблице веса: {ksrKsp.kspTypage}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Насколько «вкатана» техника по списку ударов:{' '}
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {kdBundle.kd.toFixed(3)}
              </span>
              <span className="ml-1 text-xs font-normal text-slate-500">(от 0,25 до 1, чем ближе к 1 — тем лучше)</span>
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              Учтено элементов в программе: {kdBundle.atomCount}. Доля элементов на высшем уровне «автоматизм»:{' '}
              {kdBundle.automationPercent}%.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Итоговый балл на главной = базовый балл × этот множитель. Если техника на автомате, общая цифра не
              просядет даже при посредственных силовых тестах.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4">
              <div>
                <p className="text-xs font-medium text-slate-600">Итоговый балл (то, что видно на главной)</p>
                <p className="text-3xl font-bold tracking-tight text-blue-700">{effectiveKSR.toFixed(1)}</p>
                <p className="text-xs text-slate-500">
                  Считается как: базовый балл {baseKSR} × множитель техники {kdBundle.kd.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {normsError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {normsError}
          </div>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Тесты и техника</h2>
          <p className="mt-1 text-sm text-slate-600">
            То, что вы здесь введёте, хранится в карточке ученика. После изменений нажмите внизу кнопку «Сохранить всё
            в облако».
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            {activeTab === 'anthropometry' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Антропометрия</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Год рождения</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min={1990}
                        max={new Date().getFullYear()}
                        placeholder="например, 2012"
                        className="w-full max-w-[200px] rounded-lg border border-slate-200 px-3 py-2"
                        value={anthropometry.birthYear}
                        onChange={(e) =>
                          setAnthropometry((prev) => ({ ...prev, birthYear: e.target.value }))
                        }
                      />
                      <span className="text-sm text-slate-600">
                        {formatBirthYearRu(anthropometry.birthYear) || '—'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Возраст в расчётах: текущий год минус год рождения.
                    </span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Рост (см)</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.height}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, height: e.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Вес (кг)</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.weight}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, weight: e.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Размах рук (см)</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.reach}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, reach: e.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Пол (для подбора норм тестов)</span>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.gender}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, gender: e.target.value }))
                      }
                    >
                      <option value="M">Мужской</option>
                      <option value="F">Женский</option>
                    </select>
                  </label>
                  <label className="md:col-span-2 space-y-2">
                    <span className="text-sm font-medium text-slate-700">Дата измерения</span>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.date}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'physical' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Физическое развитие</h3>
                <div className="grid gap-4">{renderNormInputs('physical', physicalNorms, physicalResults)}</div>
              </div>
            )}

            {activeTab === 'functional' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Функциональная готовность</h3>
                <div className="grid gap-4">{renderNormInputs('functional', functionalNorms, functionalResults)}</div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Техника</h3>
                {technicalAtoms.length === 0 && !loadingNorms ? (
                  <p className="text-sm text-slate-500">
                    Список ударов из общей таблицы не загрузился — проверьте интернет и откройте страницу позже.
                  </p>
                ) : (
                  technicalAtoms.map((atom) => (
                    <article
                      key={atom.id}
                      className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">
                          #{atom.number} {atom.name}
                        </h3>
                        <a
                          className="text-xs text-blue-600"
                          href={atom.videoLink || '#'}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Видео
                        </a>
                      </div>
                      <label className="mt-3 block space-y-1">
                        <span className="text-xs font-medium text-slate-600">Уровень освоения</span>
                        <select
                          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                          value={normalizeTechnicalDominanceKey(technicalData[atom.id]?.level)}
                          onChange={(event) =>
                            setTechnicalData((prev) => ({
                              ...prev,
                              [atom.id]: { ...(prev[atom.id] ?? {}), level: event.target.value },
                            }))
                          }
                        >
                          {TECH_DOMINANCE_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <textarea
                        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Комментарий тренера"
                        value={technicalData[atom.id]?.comment ?? ''}
                        onChange={(event) =>
                          setTechnicalData((prev) => ({
                            ...prev,
                            [atom.id]: { ...(prev[atom.id] ?? {}), comment: event.target.value },
                          }))
                        }
                      />
                      <details className="mt-2 text-sm text-slate-600">
                        <summary className="cursor-pointer text-blue-600">Подсказка и детали</summary>
                        <p className="mt-2">
                          <strong>Как надо:</strong> {atom.howTo}
                        </p>
                        <p className="mt-1">
                          <strong>Почему:</strong> {atom.whyHowTo}
                        </p>
                        <p className="mt-1">
                          <strong>Ошибки:</strong> {atom.mistakes}
                        </p>
                        <p className="mt-1">
                          <strong>Почему ошибка:</strong> {atom.whyMistakes}
                        </p>
                      </details>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">В каком возрасте что лучше тренировать</h2>
          <p className="mt-1 text-xs text-slate-600">
            Ориентир по научным таблицам: в зелёном списке качества, которые в этом возрасте «лучше всего ложатся».
            Красный список — всё остальное из таблицы: тренировать можно, но прирост обычно не такой быстрый.
          </p>
          {sensitivePeriods.reason === 'no_birth_year' && (
            <p className="mt-3 text-sm text-slate-600">
              Укажите год рождения в разделе «Антропометрия» — тогда список сформируется автоматически.
            </p>
          )}
          {sensitivePeriods.reason === 'below_table' && (
            <p className="mt-3 text-sm text-slate-600">
              Таблица «что в каком возрасте лучше тренировать» начинается с 7 лет. Сейчас в расчётах:{' '}
              {sensitivePeriods.ageInt ?? '—'} {sensitivePeriods.ageInt != null ? 'полных лет' : ''}.
            </p>
          )}
          {sensitivePeriods.reason === 'ok' && (
            <>
              <p className="mt-3 text-sm text-slate-700">
                Возраст в расчётах:{' '}
                <span className="font-semibold text-slate-900">{sensitivePeriods.ageInt} лет</span>
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm ring-1 ring-emerald-100">
                  <p className="text-sm font-semibold text-emerald-950">Сейчас удобнее всего развивать:</p>
                  {sensitivePeriods.qualities.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-900/80">Для этого возраста в таблице нет отдельной строки.</p>
                  ) : (
                    <ul className="mt-3 list-none space-y-2 text-sm text-emerald-950">
                      {sensitivePeriods.qualities.map((q) => (
                        <li
                          key={q}
                          className="flex gap-2 rounded-lg border border-emerald-200/80 bg-white/70 px-3 py-2"
                        >
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 shadow-sm ring-1 ring-red-100">
                  <p className="text-sm font-semibold text-red-950">Остальные качества из таблицы (прирост обычно слабее):</p>
                  {sensitivePeriods.lowImpactQualities.length === 0 ? (
                    <p className="mt-3 text-sm text-red-900/80">Все строки таблицы сейчас в «зелёной» зоне.</p>
                  ) : (
                    <ul className="mt-3 list-none space-y-2 text-sm text-red-950">
                      {sensitivePeriods.lowImpactQualities.map((q) => (
                        <li
                          key={q}
                          className="flex gap-2 rounded-lg border border-red-200/80 bg-white/70 px-3 py-2"
                        >
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400" aria-hidden />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Куда смотреть в первую очередь</h2>
          <p className="mt-3 text-sm text-slate-600">
            Баллы по разделам (от 0 до 100): сила и тело —{' '}
            <span className="font-semibold text-blue-600">{scores.физика}</span>, выносливость и форма —{' '}
            <span className="font-semibold text-blue-600">{scores.функционал}</span>, техника по списку —{' '}
            <span className="font-semibold text-blue-600">{scores.техника}</span>
          </p>
          <p className="mt-3 text-slate-700">
            Слабее всего сейчас (с учётом важности для этого спортсмена):{' '}
            <span className="font-semibold text-blue-600">{SECTION_LABELS[criticalZone.section]}</span>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Программа сравнивает: «сколько раздел даёт баллов» и «сколько он мог бы дать при идеале» — где разрыв
            больше, тот раздел и подсвечивается.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {saveOk && !saveError && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Сохранено. Данные ученика в облаке обновлены.
            </div>
          )}
          <button
            type="button"
            disabled={isSaving || !student?.id}
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSaving ? 'Сохранение…' : 'Сохранить всё в облако'}
          </button>
        </section>
      </div>
    </main>
  )
}

export default StudentPage
