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
  shortTypageLabel,
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

const TAB_PROGRESS_LABELS = {
  anthropometry: 'Антропометрия',
  physical: 'Физика',
  functional: 'Функционал',
  technical: 'Техника',
}

const TAB_ICONS = {
  anthropometry: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 6v4M9 7v2M12 6v4M15 7v2M18 6v4M6 14v4M9 15v2M12 14v4M15 15v2M18 14v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  physical: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 15c1.2-1.6 2.7-2.4 4.6-2.4 1.5 0 2.8.5 3.8 1.5l1.6 1.6c.8.8.8 2.1 0 2.9-.8.8-2.1.8-2.9 0l-1-1c-.6-.6-1.3-.9-2.2-.9-1.2 0-2.2.5-2.9 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 8.8 8 10.4c.6.6 1.4.9 2.2.9 1.1 0 2-.4 2.7-1.2l1-1.1c.8-.8 2.1-.9 2.9-.1.8.8.9 2.1.1 2.9l-1.5 1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  functional: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13.2 2 5 13h5l-1 9 8.2-11H12l1.2-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  technical: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8.5 13.5c-1.2 0-2.2-1-2.2-2.2V8.8c0-1.8 1.5-3.3 3.3-3.3h3.8c2.4 0 4.3 2 4.3 4.3v5.2c0 1.9-1.6 3.5-3.5 3.5H9.7c-1.8 0-3.2-1.4-3.2-3.2v-.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.3 10.7h3.3c1.1 0 2 .9 2 2v2.2c0 .9-.7 1.6-1.6 1.6H8c-.9 0-1.7-.8-1.7-1.7v-4.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
}

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
  const [shareFlash, setShareFlash] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
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
    setShareFlash(false)
    setShareUrl('')
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
  const standardRow = ksrKsp?.kspDetail?.row ?? null
  const standardWeightCategory = useMemo(() => {
    if (!standardRow) return '—'
    const wMin = Number(standardRow.weightMin)
    const wMax = Number(standardRow.weightMax)
    if (!Number.isFinite(wMin) || !Number.isFinite(wMax)) return '—'
    if (standardRow.openTop) return `${wMin}+`
    if (wMin === wMax) return String(wMin)
    return `${wMin}-${wMax}`
  }, [standardRow])
  const standardAgeGroup = standardRow?.ageGroup ?? '—'
  const standardArchetype = shortTypageLabel(standardRow?.label) || '—'
  const referenceHeight = Number(ksrKsp?.kspDetail?.referenceHeight ?? 0)
  const referenceReach = Number(ksrKsp?.kspDetail?.referenceReach ?? referenceHeight ?? 0)
  const athleteHeight = Number(anthropometry.height || 0)
  const athleteReach = Number(anthropometry.reach || 0)
  const duelRows = [
    {
      key: 'height',
      label: 'Рост',
      athleteValue: athleteHeight,
      referenceValue: referenceHeight,
      delta: athleteHeight - referenceHeight,
      unit: 'см',
    },
    {
      key: 'reach',
      label: 'Размах',
      athleteValue: athleteReach,
      referenceValue: referenceReach,
      delta: athleteReach - referenceReach,
      unit: 'см',
    },
  ]
  const basePercent = Math.max(0, Math.min(100, Number(baseKSR) || 0))
  const kspPercent = Math.max(0, Math.min(100, Number(ksrKsp.ksp) || 0))
  const realizedInsidePotentialPercent =
    kspPercent > 0 ? Math.max(0, Math.min(100, Math.round((basePercent / kspPercent) * 100))) : 0

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
      nextAttestationDate: typeof student?.nextAttestationDate === 'string' ? student.nextAttestationDate : null,
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
      setShareUrl(url)
    } catch (e) {
      console.error(e)
      window.alert('Не удалось создать ссылку. Проверьте интернет и вход тренера в этом браузере.')
    } finally {
      setShareBusy(false)
    }
  }

  const copyShareUrl = async () => {
    if (!shareUrl) return
    let copied = false
    try {
      await navigator.clipboard.writeText(shareUrl)
      copied = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        ta.setSelectionRange(0, ta.value.length)
        copied = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        copied = false
      }
    }
    if (!copied) {
      window.prompt('Скопируйте ссылку вручную:', shareUrl)
      return
    }
    setShareFlash(true)
    window.setTimeout(() => setShareFlash(false), 2200)
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
  const influenceItems = [
    {
      key: 'tech',
      label: 'Техника',
      value: Math.round(weights.T * 100),
    },
    {
      key: 'physical',
      label: 'Физическое развитие',
      value: Math.round(weights.P * 100),
    },
    {
      key: 'functional',
      label: 'Функциональная готовность',
      value: Math.round(weights.F * 100),
    },
  ]
  const maxInfluenceValue = Math.max(...influenceItems.map((item) => item.value))
  const smartStyleDisplay =
    weights.archetypeSmart === 'Силовой'
      ? 'Ближняя / средняя'
      : weights.archetypeSmart === 'Линейный'
        ? 'Дистанционный'
        : weights.archetypeSmart
  const tacticDistanceDisplay =
    weights.tacticMode === 'infighter'
      ? 'Ближняя'
      : weights.tacticMode === 'outfighter'
        ? 'Дальняя'
        : smartStyleDisplay

  const tabProgress = useMemo(() => {
    const anthropometryFilled = [
      anthropometry.birthYear,
      anthropometry.height,
      anthropometry.weight,
      anthropometry.reach,
      anthropometry.gender,
      anthropometry.date,
    ].filter((v) => String(v ?? '').trim() !== '').length
    const anthropometryPercent = Math.round((anthropometryFilled / 6) * 100)

    const normPercent = (norm, row) => {
      const result = Number(row?.result)
      if (!Number.isFinite(result)) return 0
      const evaluated = evaluateLegacyTest(result, norm)
      if (evaluated.status === 'gold') return 100
      if (evaluated.status === 'silver') return 66
      if (evaluated.status === 'bronze') return 33
      // Ниже нормы: интерполируем внутри диапазона 10-20%
      return Math.round(10 + (Math.max(0, Math.min(60, evaluated.normalizedScore)) / 60) * 10)
    }

    const physicalTotal = physicalNorms.length
    const physicalPercent =
      physicalTotal > 0
        ? Math.round(
            physicalNorms.reduce((acc, norm) => acc + normPercent(norm, physicalResults[norm.testId]), 0) /
              physicalTotal,
          )
        : 0

    const functionalTotal = functionalNorms.length
    const functionalPercent =
      functionalTotal > 0
        ? Math.round(
            functionalNorms.reduce((acc, norm) => acc + normPercent(norm, functionalResults[norm.testId]), 0) /
              functionalTotal,
          )
        : 0

    const technicalLevelToPercent = (level) => {
      const key = normalizeTechnicalDominanceKey(level)
      if (key === 'KNOWLEDGE') return 30
      if (key === 'MOTOR_SKILL_LEVEL_1') return 45
      if (key === 'MOTOR_SKILL_LEVEL_2') return 70
      if (key === 'AUTOMATED') return 100
      return 0
    }

    const technicalTotal = technicalAtoms.length
    const technicalPercent =
      technicalTotal > 0
        ? Math.round(
            technicalAtoms.reduce((acc, atom) => acc + technicalLevelToPercent(technicalData[atom.id]?.level), 0) /
              technicalTotal,
          )
        : (() => {
            const entries = Object.values(technicalData || {})
            if (!entries.length) return 0
            return Math.round(
              entries.reduce((acc, item) => acc + technicalLevelToPercent(item?.level), 0) / entries.length,
            )
          })()

    return {
      anthropometry: Math.max(0, Math.min(100, anthropometryPercent)),
      physical: Math.max(0, Math.min(100, physicalPercent)),
      functional: Math.max(0, Math.min(100, functionalPercent)),
      technical: Math.max(0, Math.min(100, technicalPercent)),
    }
  }, [anthropometry, functionalNorms, functionalResults, physicalNorms, physicalResults, technicalAtoms, technicalData])

  const progressColorClass = (value) => {
    if (value <= 30) return 'bg-red-500'
    if (value <= 70) return 'bg-amber-400'
    return 'bg-emerald-500'
  }

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
                <button
                  type="button"
                  disabled={shareBusy || !student?.id}
                  onClick={handleShareProgress}
                  title="Поделиться прогрессом"
                  aria-label="Поделиться прогрессом"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 ${
                    shareFlash
                      ? 'border-emerald-300 text-emerald-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
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
          {shareUrl && (
            <button
              type="button"
              onClick={copyShareUrl}
              title="Нажмите, чтобы скопировать ссылку"
              aria-label="Скопировать ссылку прогресса"
              className={`mt-3 w-full rounded-lg border px-3 py-2 text-left text-xs break-all transition ${
                shareFlash
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {shareUrl}
            </button>
          )}

          <p className="mt-2 text-slate-600">
            Рекомендуемая дистанция боя:{' '}
            <span className="font-semibold text-blue-600">{tacticDistanceDisplay}</span>
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-500 bg-slate-800"
                  aria-hidden
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">Role</p>
                  <p className="text-sm font-semibold">Историческая модель эталона (главный ориентир)</p>
                </div>
              </div>
              <span className="rounded-full border border-red-300/60 bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-red-200">
                MAIN RIVAL
              </span>
            </div>
            <div className="bg-white px-4 py-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Паспорт эталона</p>
                  <p className="mt-1 text-xs text-slate-700">
                    Весовая: <span className="font-semibold text-slate-900">{standardWeightCategory} кг</span>
                  </p>
                  <p className="text-xs text-slate-700">
                    Возрастная: <span className="font-semibold text-slate-900">{standardAgeGroup}</span>
                  </p>
                  <p className="text-xs text-slate-700">
                    Архетип эталона: <span className="font-semibold text-slate-900">{standardArchetype}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Эталонные параметры</p>
                  <p className="mt-1 text-xs text-slate-700">
                    Рост: <span className="font-semibold text-slate-900">{referenceHeight || '—'} см</span>
                  </p>
                  <p className="text-xs text-slate-700">
                    Размах: <span className="font-semibold text-slate-900">{referenceReach || '—'} см</span>
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Рекомендация для спортсмена</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">{tacticDistanceDisplay || '—'}</p>
                  <p className="text-[11px] text-slate-600">Эффективная дистанция боя</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Дуэль: спортсмен vs эталон</p>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] overflow-hidden rounded-md border border-slate-200 text-[10px] uppercase tracking-wide">
                  <div className="bg-blue-100 px-3 py-1 font-semibold text-blue-900">
                    {safeStudent.name || 'Спортсмен'}
                  </div>
                  <div className="bg-slate-800 px-2 py-1 font-semibold text-white">VS</div>
                  <div className="bg-red-100 px-3 py-1 text-right font-semibold text-red-900">Эталон</div>
                </div>
                <div className="mt-2 space-y-2">
                  {duelRows.map((row) => {
                    const tone =
                      !Number.isFinite(row.delta) || row.delta === 0
                        ? 'text-slate-700'
                        : row.delta > 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                    return (
                      <div key={row.key} className="grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-md border border-slate-200 text-xs">
                        <div className="bg-blue-50 px-3 py-2 text-blue-900">
                          <p className="font-medium text-slate-700">{row.label}</p>
                          <p className="mt-0.5 font-semibold">
                            {Number.isFinite(row.athleteValue) && row.athleteValue > 0 ? row.athleteValue : '—'} {row.unit}
                          </p>
                        </div>
                        <div className="flex min-w-[74px] flex-col items-center justify-center bg-slate-900 px-2 text-white">
                          <span className="text-[10px] uppercase tracking-wider text-slate-300">delta</span>
                          <span className={`font-semibold ${tone}`}>
                            {Number.isFinite(row.delta) ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)} ${row.unit}` : '—'}
                          </span>
                        </div>
                        <div className="bg-red-50 px-3 py-2 text-right text-red-900">
                          <p className="font-medium text-slate-700">{row.label}</p>
                          <p className="mt-0.5 font-semibold">
                            {Number.isFinite(row.referenceValue) && row.referenceValue > 0 ? row.referenceValue : '—'} {row.unit}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
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
            <h3 className="text-sm font-semibold text-slate-900">Степень влияния</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {influenceItems.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-lg border px-3 py-3 ${
                    item.value === maxInfluenceValue && maxInfluenceValue > 0
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.value}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-800">Базовый балл (ещё без учёта «насколько вкатана техника»)</p>
              <p className="text-xs text-slate-600">
                Средний прогресс по трём разделам: {Math.round(ksrKsp.trainingProgress ?? 0)} из 100. Этот прогресс
                умножается на «потолок по телу» ниже — получается базовый балл.
              </p>
              <p className="text-5xl font-bold tracking-tight text-slate-900">{baseKSR}</p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                  <span>Спортивная реализация (базовый балл)</span>
                  <span className="font-semibold text-slate-900">{basePercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${basePercent}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-5 py-4">
              <p className="text-sm font-medium text-amber-900">Потолок по телу (сколько «максимум» можно набрать)</p>
              <p className="mt-1 text-xs text-slate-600">
                Считается из роста, веса, пола и возраста: насколько данные тела близки к «эталону» для категории. Это не
                оценка ударов — только тело.
              </p>
              <p className="mt-3 text-5xl font-bold tracking-tight text-amber-950">{ksrKsp.ksp}</p>
              <div className="mt-3 rounded-lg border border-amber-200 bg-white/90 px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                  <span>Коэффициент спортивного потенциала (КСП)</span>
                  <span className="font-semibold text-amber-900">{kspPercent}%</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-300">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-200"
                    style={{ width: `${kspPercent}%` }}
                    title="Потенциально достижимая зона (потолок)"
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.min(basePercent, kspPercent)}%` }}
                    title="Реализовано из доступного потенциала"
                  />
                  <div
                    className="absolute inset-y-[-2px] w-[2px] bg-amber-700/70"
                    style={{ left: `${kspPercent}%` }}
                    aria-hidden
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden />
                    Реализовано: {Math.min(basePercent, kspPercent)}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-200" aria-hidden />
                    Доступно до потолка: {kspPercent}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden />
                    Недостижимо без изменения данных тела
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Освоено от потолка: {realizedInsidePotentialPercent}%</span>
                  <span>Потолок: {kspPercent}%</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Детали расчёта (для любознательных): антропометрия ≈ {Math.round((ksrKsp.kspZ ?? 0) * 100)}%, близость
                к эталонному росту ≈ {Math.round((ksrKsp.kspH ?? 0) * 100)}%
                {ksrKsp.kspIdealHeight ? ` · ориентир роста для веса: ${ksrKsp.kspIdealHeight}` : ''}
              </p>
              {(ksrKsp?.kspDetail?.heightDelta != null || ksrKsp?.kspDetail?.reachDelta != null) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      Number(ksrKsp?.kspDetail?.heightDelta ?? 0) >= 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    <p className="font-semibold">Рост vs эталон</p>
                    <p>
                      {Number(ksrKsp?.kspDetail?.heightDelta ?? 0) >= 0 ? '+' : ''}
                      {Number(ksrKsp?.kspDetail?.heightDelta ?? 0).toFixed(1)} см
                    </p>
                  </div>
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      Number(ksrKsp?.kspDetail?.reachDelta ?? 0) >= 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    <p className="font-semibold">Размах vs эталон</p>
                    <p>
                      {Number(ksrKsp?.kspDetail?.reachDelta ?? 0) >= 0 ? '+' : ''}
                      {Number(ksrKsp?.kspDetail?.reachDelta ?? 0).toFixed(1)} см
                    </p>
                  </div>
                </div>
              )}
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

          <div className="mt-4 grid grid-cols-2 gap-3 md:flex md:flex-nowrap md:gap-4">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group relative min-h-[132px] rounded-xl border bg-[#1A1A1A] px-4 py-4 text-left text-[#E8E8E8] transition-all duration-300 md:flex-1 ${
                  activeTab === tab.id
                    ? 'border-[#E8E8E8] shadow-[0_0_0_1px_rgba(232,232,232,0.18)]'
                    : 'border-[#333333] hover:border-[#E8E8E8] hover:shadow-[0_0_14px_rgba(232,232,232,0.2)]'
                }`}
              >
                <span
                  className={`absolute inset-x-0 bottom-0 h-1 rounded-b-xl transition-all duration-300 ${
                    activeTab === tab.id ? 'bg-[#E8E8E8]' : 'bg-transparent'
                  }`}
                  aria-hidden
                />
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#333333] bg-[#222222]">
                  {TAB_ICONS[tab.id]}
                </span>
                <span
                  className="block text-[18px] uppercase leading-tight tracking-wide"
                  style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif' }}
                >
                  {tab.label}
                </span>
                <span className="mt-3 block text-xs text-[#A8A8A8]">
                  {TAB_PROGRESS_LABELS[tab.id]}: {tabProgress[tab.id] ?? 0}%
                </span>
                <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[#2A2A2A]" aria-hidden>
                  <span
                    className={`block h-full transition-all duration-300 ${progressColorClass(tabProgress[tab.id] ?? 0)}`}
                    style={{ width: `${tabProgress[tab.id] ?? 0}%` }}
                  />
                </span>
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
