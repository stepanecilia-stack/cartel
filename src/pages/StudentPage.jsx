import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  TECH_DOMINANCE_OPTIONS,
  calculateEffectiveKSR,
  calculateKD,
  calculateKsrAndKsp,
  calculateLegacySectionScores,
  evaluateLegacyTest,
  getNormsForAthlete,
  getWeights,
  loadLegacyTechnicalAtoms,
  normalizeTechnicalDominanceKey,
  shortTypageLabel,
  TECHNIQUE_LEVEL2_ATOMS,
} from '../utils/ksrUtils'
import { buildTechnicalLocksById, orderTechnicalAtomsForProgram } from '../utils/technicalProgramProgress.js'
import { buildFullTechnicalProgramAtoms, normalizeTechnicalCombinations, buildAtomLookupById, buildComboChainPreview, mergeWithRequiredLevel3Combinations, isRequiredLevel3ComboId, REQUIRED_LEVEL3_COMBO_IDS } from '../utils/techniqueCatalog.js'
import {
  anthropometryFieldToInputString,
  birthDateMatchesBirthYear,
  birthDateToInputString,
  birthYearToInputString,
  computeAthleteAgeYears,
  displayNameFromStudent,
  formatBirthYearRu,
  formatShortIdDisplay,
  normalizeBirthDateISO,
  normalizeBirthYearNumber,
  studentAthleteShape,
  studentPhotoUrl,
} from '../utils/studentModel'
import BackToHomeLink from '../components/layout/BackToHomeLink.jsx'
import { ETALON_MODEL_PANEL_CLASS, vk } from '../utils/vkUi.js'
import { loadNormsOnce } from '../data/normsCache.js'
import { buildPublicSharePayload, isValidProgressShareToken } from '../utils/publicSharePayload'
import { scheduleStudentShareSync } from '../services/studentShareSyncService.js'
import {
  buildNormAcceptanceHistoryEntry,
  mergeNormAcceptanceHistory,
} from '../utils/normAcceptanceHistory'
import { normAcceptanceSectionLabel, STUDENT_UPDATE_SECTION } from '../utils/studentUpdateSections'
import {
  ensureStudentShortId,
  generateOpaqueShareToken,
  getCoachProfile,
  getCurrentCoachId,
  getStudentById,
  isValidSixDigitShortId,
  setPublicStudentShareDocument,
  updateStudentData,
} from '../services/firebaseService'
import StudentNormsSection from '../components/student/StudentNormsSection.jsx'
import StudentTechnicalAtomsList from '../components/student/StudentTechnicalAtomsList.jsx'
import { getTechnicalProgramAtomsCache, subscribeTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import BiometricPotentialBar from '../components/BiometricPotentialBar'
import StandardDuelSilhouettes, { referenceWeightFromStandardRow } from '../components/StandardDuelSilhouettes'
import { getSensitiveMotorQualities } from '../utils/sensitivePeriods'
import SensitivePeriodTimer from '../components/SensitivePeriodTimer'
import MotorQualityWorkLogPanel from '../components/MotorQualityWorkLogPanel'


const TAB_ITEMS = [
  { id: 'anthropometry', label: 'Карта спортсмена', shortLabel: 'Карта' },
  { id: 'physical', label: 'Физическое развитие', shortLabel: 'Физика' },
  { id: 'functional', label: 'Функциональная готовность', shortLabel: 'Функционал' },
  { id: 'technical', label: 'Техника', shortLabel: 'Техника' },
]

const TAB_PROGRESS_LABELS = {
  physical: 'Физика',
  functional: 'Функционал',
  technical: 'Техника',
}

function emptyTestsRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && ('result' in v || 'normalizedScore' in v)) out[k] = v
  }
  return out
}

function normalizeLegacyTestId(id) {
  return String(id ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function getNormValueByTestId(values, testId) {
  if (!values || typeof values !== 'object') return undefined
  if (values[testId]) return values[testId]
  const normalizedTarget = normalizeLegacyTestId(testId)
  if (!normalizedTarget) return undefined
  for (const [key, value] of Object.entries(values)) {
    if (normalizeLegacyTestId(key) === normalizedTarget) return value
  }
  return undefined
}

function removeNormValueByTestId(values, testId) {
  const normalizedTarget = normalizeLegacyTestId(testId)
  if (!normalizedTarget) return { ...values }
  const next = { ...values }
  for (const key of Object.keys(next)) {
    if (normalizeLegacyTestId(key) === normalizedTarget) {
      delete next[key]
    }
  }
  return next
}

function isMinuteSecondNorm(norm) {
  const unit = String(norm?.unit ?? '').toLowerCase()
  return unit.includes('мин') || unit.includes('mm:ss') || unit.includes('м:с')
}

/** Только полная пара секунд (две цифры), иначе «8:3» ошибочно читалось как 8:03 при вводе 8:30. */
function parseMinuteSecondToMinutes(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const match = normalized.match(/^(\d+)\s*:\s*(\d{2})$/)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  if (seconds > 59) return null
  return {
    value: minutes + seconds / 60,
    display: `${minutes}:${String(seconds).padStart(2, '0')}`,
  }
}

/** 8.30 / 8,30 / 8 30 → мин:сек; ровно две цифры после точки/запятой или после пробела. */
function parseDotCommaOrSpaceMinuteSecond(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const comma = normalized.match(/^(\d+),(\d{2})$/)
  if (comma) {
    const minutes = Number(comma[1])
    const seconds = Number(comma[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  const dot = normalized.match(/^(\d+)\.(\d{2})$/)
  if (dot) {
    const minutes = Number(dot[1])
    const seconds = Number(dot[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  const sp = normalized.match(/^(\d+)\s+(\d{2})$/)
  if (sp) {
    const minutes = Number(sp[1])
    const seconds = Number(sp[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  return null
}

function parseAnyCompleteMinuteSecond(rawValue) {
  return parseMinuteSecondToMinutes(rawValue) ?? parseDotCommaOrSpaceMinuteSecond(rawValue)
}

/**
 * Неполный ввод времени: не превращать в число минут и не подставлять :00.
 * «8:3» — ждём вторую цифру секунд; «8.3» при точке — ждём вторую цифру (8.30) или уход с поля (десятичные минуты).
 */
function isPartialMinuteSecondInput(trimmed) {
  if (!trimmed) return false
  if (/^\d+$/.test(trimmed)) return true
  if (/^\d+\s*:\s*$/.test(trimmed)) return true
  if (/^\d+\s*:\s*\d{1}$/.test(trimmed)) return true
  if (/^\d+\s+\d{1}$/.test(trimmed)) return true
  if (/^\d+[.,]\s*$/.test(trimmed)) return true
  if (/^\d+\.\d{1}$/.test(trimmed)) return true
  if (/^\d+[.,]\d{3,}$/.test(trimmed)) return true
  return false
}

function formatMinutesToMinuteSecond(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  let minutes = Math.floor(num)
  let seconds = Math.round((num - minutes) * 60)
  if (seconds === 60) {
    minutes += 1
    seconds = 0
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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
  const [programAtomsCache, setProgramAtomsCache] = useState(() => getTechnicalProgramAtomsCache())
  const technicalAtoms = programAtomsCache.level1
  const [technicalCombinations, setTechnicalCombinations] = useState([])
  const [comboModalOpen, setComboModalOpen] = useState(false)
  const [comboDraftName, setComboDraftName] = useState('')
  const [comboDraftSteps, setComboDraftSteps] = useState([])
  const [comboPickTier, setComboPickTier] = useState('1')
  const [comboPickAtomId, setComboPickAtomId] = useState('')
  /** Подстраницы блока «Техника»: без длинного скролла между уровнями. */
  const [technicalTierTab, setTechnicalTierTab] = useState('level1')
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
    birthDate: '',
    date: new Date().toISOString().slice(0, 10),
    gender: 'M',
  })
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const [anthropometrySaveError, setAnthropometrySaveError] = useState('')
  const [anthropometrySaveOk, setAnthropometrySaveOk] = useState(false)
  const [isAnthropometrySaving, setIsAnthropometrySaving] = useState(false)
  const [normSavingKey, setNormSavingKey] = useState('')
  const [technicalSavingKey, setTechnicalSavingKey] = useState('')
  const [copyIdFlash, setCopyIdFlash] = useState(false)
  const [shortIdAssignError, setShortIdAssignError] = useState('')
  const [shareFlash, setShareFlash] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const shortIdDeniedRef = useRef(new Set())

  useEffect(() => {
    const syncAtomsFromCache = () => setProgramAtomsCache(getTechnicalProgramAtomsCache())
    syncAtomsFromCache()
    const unsubCache = subscribeTechnicalProgramAtomsCache(syncAtomsFromCache)

    const loadLegacyData = async () => {
      try {
        const [norms, atoms] = await Promise.all([loadNormsOnce(), loadLegacyTechnicalAtoms()])
        setAllNorms(norms)
        if (atoms.length > 0) {
          setProgramAtomsCache((prev) => ({
            level1: atoms,
            level2: prev.level2.length > 0 ? prev.level2 : getTechnicalProgramAtomsCache().level2,
          }))
        }
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
    return () => unsubCache()
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
      birthDate: birthDateToInputString(student.birthDate),
      date:
        typeof student.anthropometryDate === 'string' && student.anthropometryDate
          ? student.anthropometryDate
          : new Date().toISOString().slice(0, 10),
      gender: sh.gender === 'F' ? 'F' : 'M',
    })
    setPhysicalResults(emptyTestsRecord(tests.physical))
    setFunctionalResults(emptyTestsRecord(tests.functional))
    setTechnicalData(emptyTechnicalRecord(student.technicalData))
    setTechnicalCombinations(mergeWithRequiredLevel3Combinations(student.technicalCombinations))
    setComboModalOpen(false)
    setComboDraftName('')
    setComboDraftSteps([])
    setComboPickTier('1')
    setComboPickAtomId('')
    setTechnicalTierTab('level1')
    setShareFlash(false)
    setShareUrl('')
    setSaveError('')
    setSaveOk(false)
    setAnthropometrySaveError('')
    setAnthropometrySaveOk(false)
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

  const resolvedBirthDate = useMemo(() => {
    const fromForm = normalizeBirthDateISO(anthropometry.birthDate)
    if (fromForm) return fromForm
    return normalizeBirthDateISO(safeStudent.birthDate)
  }, [anthropometry.birthDate, safeStudent.birthDate])

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
      birthDate: resolvedBirthDate,
      gender: anthropometry.gender === 'F' ? 'F' : 'M',
    }
  }, [safeStudent, anthropometry, resolvedBirthYear, resolvedBirthDate])

  const physicalNorms = useMemo(
    () => getNormsForAthlete(allNorms, athleteForNorms, 'physical'),
    [allNorms, athleteForNorms],
  )
  const functionalNorms = useMemo(
    () => getNormsForAthlete(allNorms, athleteForNorms, 'functional'),
    [allNorms, athleteForNorms],
  )

  const technicalCombinationsResolved = useMemo(
    () => mergeWithRequiredLevel3Combinations(technicalCombinations),
    [technicalCombinations],
  )

  const programAtomsFull = useMemo(
    () => buildFullTechnicalProgramAtoms(technicalAtoms, technicalCombinations),
    [technicalAtoms, technicalCombinations],
  )

  const atomByIdLookup = useMemo(() => buildAtomLookupById(technicalAtoms), [technicalAtoms])

  const comboPickOptions = useMemo(() => {
    if (comboPickTier === '2')
      return TECHNIQUE_LEVEL2_ATOMS.map((a) => ({ value: a.id, label: `№${a.number} ${a.name}` }))
    return orderTechnicalAtomsForProgram(technicalAtoms).map((a) => ({
      value: a.id,
      label: `№${a.number} ${a.name}`,
    }))
  }, [comboPickTier, technicalAtoms])

  const scores = useMemo(
    () =>
      calculateLegacySectionScores({
        physicalNorms,
        functionalNorms,
        physicalResults,
        functionalResults,
        technicalData,
        technicalProgramAtoms: programAtomsFull,
      }),
    [
      functionalNorms,
      functionalResults,
      physicalNorms,
      physicalResults,
      technicalData,
      programAtomsFull,
    ],
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
    if (programAtomsFull.length > 0) return calculateKD(programAtomsFull, technicalData)
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
    programAtomsFull,
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
  const standardRow = ksrKsp?.kspDetail?.row ?? null
  const historicalStandardMode = ksrKsp?.kspDetail?.standardMode ?? null
  const historicalAthleteAge = ksrKsp?.kspDetail?.athleteAge ?? null
  const isYoungHistoricalPreview = historicalStandardMode === 'young_preview'
  const historicalReferenceAgeGroup =
    ksrKsp?.kspDetail?.referenceAgeGroup ?? standardRow?.ageGroup ?? '—'
  const standardWeightCategory = useMemo(() => {
    if (!standardRow) return '—'
    const wMin = Number(standardRow.weightMin)
    const wMax = Number(standardRow.weightMax)
    if (!Number.isFinite(wMin) || !Number.isFinite(wMax)) return '—'
    if (standardRow.openTop) return `${wMin}+`
    if (wMin === wMax) return String(wMin)
    return `${wMin}-${wMax}`
  }, [standardRow])
  const standardAgeGroup = isYoungHistoricalPreview
    ? `${historicalReferenceAgeGroup} (ориентир)`
    : standardRow?.ageGroup ?? '—'
  const historicalReferenceLabel = isYoungHistoricalPreview ? 'Эталон 13–14 лет' : 'Эталон'
  const standardArchetype = shortTypageLabel(standardRow?.label) || '—'
  const referenceHeight = Number(ksrKsp?.kspDetail?.referenceHeight ?? 0)
  const referenceReach = Number(ksrKsp?.kspDetail?.referenceReach ?? referenceHeight ?? 0)
  const athleteHeight = Number(anthropometry.height || 0)
  const athleteReach = Number(anthropometry.reach || 0)
  const athleteWeight = Number(anthropometry.weight || 0)
  const referenceWeightKg = referenceWeightFromStandardRow(standardRow)
  const basePercent = Math.max(0, Math.min(100, Number(baseKSR) || 0))
  const kspPercent = Math.max(0, Math.min(100, Number(ksrKsp.ksp) || 0))

  const shortIdRaw = student?.short_id ?? safeStudent?.short_id
  const shortIdDigits =
    shortIdRaw != null && shortIdRaw !== '' && Number.isFinite(Number(shortIdRaw))
      ? String(Math.floor(Number(shortIdRaw))).padStart(6, '0')
      : ''

  const ownerCoachIdsForShare = useMemo(
    () => [...new Set([...(student?.coach_ids || []), student?.coachId].filter(Boolean))],
    [student?.coach_ids, student?.coachId],
  )

  /** @param {null | { physical: object, functional: object }} testsExact — если передан, используется как финальные tests (уже смёрженные), иначе берётся state. */
  const buildSharePayloadForPublic = async (weightHistoryArg, testsExact = null) => {
    let norms = allNorms
    let atoms = technicalAtoms
    if (!norms.length) {
      try {
        norms = await loadNormsOnce()
        setAllNorms(norms)
      } catch {
        norms = []
      }
    }
    if (!atoms.length) {
      try {
        atoms = await loadLegacyTechnicalAtoms()
        setProgramAtomsCache((prev) => ({
          level1: atoms,
          level2: prev.level2.length > 0 ? prev.level2 : getTechnicalProgramAtomsCache().level2,
        }))
      } catch {
        atoms = []
      }
    }
    const atomsForShare = buildFullTechnicalProgramAtoms(atoms, technicalCombinationsResolved)

    const physicalMerged = testsExact
      ? testsExact.physical
      : { ...emptyTestsRecord(student?.tests?.physical), ...physicalResults }
    const functionalMerged = testsExact
      ? testsExact.functional
      : { ...emptyTestsRecord(student?.tests?.functional), ...functionalResults }
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
      technicalAtoms: atomsForShare,
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
        await updateStudentData(
          student.id,
          { progressShareToken: token },
          { section: STUDENT_UPDATE_SECTION.publicShare },
        )
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
  const dominantInfluenceKeys = influenceItems
    .filter((item) => item.value === maxInfluenceValue && maxInfluenceValue > 0)
    .map((item) => item.key)
  const tabIdToInfluenceKey = {
    physical: 'physical',
    functional: 'functional',
    technical: 'tech',
  }
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
            physicalNorms.reduce((acc, norm) => acc + normPercent(norm, getNormValueByTestId(physicalResults, norm.testId)), 0) /
              physicalTotal,
          )
        : 0

    const functionalTotal = functionalNorms.length
    const functionalPercent =
      functionalTotal > 0
        ? Math.round(
            functionalNorms.reduce((acc, norm) => acc + normPercent(norm, getNormValueByTestId(functionalResults, norm.testId)), 0) /
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

    const technicalTotal = programAtomsFull.length
    const technicalPercent =
      technicalTotal > 0
        ? Math.round(
            programAtomsFull.reduce((acc, atom) => acc + technicalLevelToPercent(technicalData[atom.id]?.level), 0) /
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
      physical: Math.max(0, Math.min(100, physicalPercent)),
      functional: Math.max(0, Math.min(100, functionalPercent)),
      technical: Math.max(0, Math.min(100, technicalPercent)),
    }
  }, [functionalNorms, functionalResults, physicalNorms, physicalResults, programAtomsFull, technicalData])

  const progressColorClass = (value) => {
    if (value <= 30) return 'bg-red-500'
    if (value <= 70) return 'bg-amber-400'
    return 'bg-emerald-500'
  }

  const updateNormResult = useCallback((category, norm, rawValue) => {
    const set =
      category === 'physical' ? setPhysicalResults : setFunctionalResults
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      set((prev) => {
        return removeNormValueByTestId(prev, norm.testId)
      })
      return
    }
    const trimmed = String(rawValue ?? '').trim()

    if (isMinuteSecondNorm(norm)) {
      const complete = parseAnyCompleteMinuteSecond(trimmed)
      if (complete) {
        const result = complete.value
        if (!Number.isFinite(result)) return
        const evaluated = evaluateLegacyTest(result, norm)
        set((prev) => ({
          ...removeNormValueByTestId(prev, norm.testId),
          [norm.testId]: {
            ...evaluated,
            result,
            resultRaw: complete.display,
            date: new Date().toISOString().slice(0, 10),
          },
        }))
        return
      }
      if (isPartialMinuteSecondInput(trimmed)) {
        set((prev) => ({
          ...removeNormValueByTestId(prev, norm.testId),
          [norm.testId]: {
            resultRaw: trimmed,
            date: new Date().toISOString().slice(0, 10),
          },
        }))
        return
      }
      // Дробные минуты с точкой не разбираем здесь — иначе «8.3» при вводе 8.30 станет числом; 8,5 — норма.
      if (trimmed.includes('.') && !parseAnyCompleteMinuteSecond(trimmed)) return
      const numericRaw = trimmed.replace(',', '.')
      const result = Number(numericRaw)
      if (!Number.isFinite(result)) return
      const evaluated = evaluateLegacyTest(result, norm)
      set((prev) => ({
        ...removeNormValueByTestId(prev, norm.testId),
        [norm.testId]: {
          ...evaluated,
          result,
          date: new Date().toISOString().slice(0, 10),
        },
      }))
      return
    }

    const minuteSecond = parseMinuteSecondToMinutes(trimmed)
    const numericRaw = trimmed.replace(',', '.')
    const result = minuteSecond ? minuteSecond.value : Number(numericRaw)
    if (!Number.isFinite(result)) return
    const evaluated = evaluateLegacyTest(result, norm)
    set((prev) => ({
      ...removeNormValueByTestId(prev, norm.testId),
      [norm.testId]: {
        ...evaluated,
        result,
        resultRaw: minuteSecond?.display,
        date: new Date().toISOString().slice(0, 10),
      },
    }))
  }, [])

  const buildStudentUpdatePayload = (
    physicalMerged,
    functionalMerged,
    weightHistoryArg,
    technicalDataOverride = technicalData,
    combinationsOverride = technicalCombinations,
  ) => {
    const height = Number(anthropometry.height) || 0
    const reach = Number(anthropometry.reach) || 0
    const weight = Number(anthropometry.weight) || 0
    const gender = anthropometry.gender === 'F' ? 'F' : 'M'
    const birthYear =
      normalizeBirthYearNumber(anthropometry.birthYear) ||
      normalizeBirthYearNumber(safeStudent.birthYear)
    const birthDate = normalizeBirthDateISO(anthropometry.birthDate)
    const mergedAthlete = {
      ...safeStudent,
      height,
      reach,
      weight,
      birthYear,
      gender,
    }
    const programAtoms = buildFullTechnicalProgramAtoms(technicalAtoms, combinationsOverride)
    const nextScores = calculateLegacySectionScores({
      physicalNorms,
      functionalNorms,
      physicalResults: physicalMerged,
      functionalResults: functionalMerged,
      technicalData: technicalDataOverride,
      technicalProgramAtoms: programAtoms,
    })
    const w = getWeights(mergedAthlete)
    const kspBundle = calculateKsrAndKsp(mergedAthlete, nextScores)
    const technicalScore = nextScores.техника / 100
    const kdStats = calculateKD(programAtoms, technicalDataOverride)
    const effective = calculateEffectiveKSR(kspBundle.baseKSR, kdStats.kd)
    const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)

    return {
      height,
      reach,
      weight,
      gender,
      birthYear,
      birthYearLabel: formatBirthYearRu(birthYear),
      birthDate,
      anthropometryDate: measureDate,
      weightHistory: weightHistoryArg,
      tests: {
        physical: physicalMerged,
        functional: functionalMerged,
      },
      technicalData: technicalDataOverride,
      technicalCombinations: normalizeTechnicalCombinations(
        mergeWithRequiredLevel3Combinations(combinationsOverride),
      ),
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
  }

  const syncPublicShareIfNeeded = (weightHistoryArg, testsExact = null) => {
    const shareTok =
      typeof student.progressShareToken === 'string' ? student.progressShareToken : ''
    if (!isValidProgressShareToken(shareTok)) return
    scheduleStudentShareSync(shareTok, async () => {
      const sharePayload = await buildSharePayloadForPublic(weightHistoryArg, testsExact)
      await setPublicStudentShareDocument(shareTok, {
        payload: sharePayload,
        ownerCoachIds: ownerCoachIdsForShare,
      })
    })
  }

  const resolveCoachDisplayName = async (coachId) => {
    if (!coachId) return 'Тренер'
    try {
      const p = await getCoachProfile(coachId)
      const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim()
      if (name) return name
    } catch {
      /* ignore */
    }
    return 'Тренер'
  }

  /** Антропометрия, весовая история и пересчёт баллов (тесты сливаются с текущими черновиками формы). */
  const handleSaveProfile = async () => {
    if (!student?.id) {
      setAnthropometrySaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    setAnthropometrySaveError('')
    setAnthropometrySaveOk(false)
    const birthDateNorm = normalizeBirthDateISO(anthropometry.birthDate)
    if (String(anthropometry.birthDate ?? '').trim() && !birthDateNorm) {
      setAnthropometrySaveError('Укажите корректную дату рождения или очистите поле.')
      return
    }
    const birthYearForCheck =
      normalizeBirthYearNumber(anthropometry.birthYear) ||
      normalizeBirthYearNumber(safeStudent.birthYear)
    if (birthDateNorm && !birthDateMatchesBirthYear(birthDateNorm, birthYearForCheck)) {
      setAnthropometrySaveError('Год в дате рождения должен совпадать с указанным годом рождения.')
      return
    }

    setIsAnthropometrySaving(true)
    try {
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setAnthropometrySaveError('Ученик не найден в базе.')
        return
      }
      const physicalMerged = {
        ...emptyTestsRecord(fresh.tests?.physical),
        ...emptyTestsRecord(physicalResults),
      }
      const functionalMerged = {
        ...emptyTestsRecord(fresh.tests?.functional),
        ...emptyTestsRecord(functionalResults),
      }
      const weight = Number(anthropometry.weight) || 0
      const prevHistory = Array.isArray(fresh.weightHistory) ? [...fresh.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      let weightHistory = prevHistory
      if (weight >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== weight || last.date !== measureDate) {
          weightHistory = [...prevHistory, { date: measureDate, weight }].slice(-36)
        }
      }
      const payload = buildStudentUpdatePayload(physicalMerged, functionalMerged, weightHistory)
      await updateStudentData(student.id, payload, { section: STUDENT_UPDATE_SECTION.profile })
      setPhysicalResults(physicalMerged)
      setFunctionalResults(functionalMerged)
      setAnthropometrySaveOk(true)
      onStudentUpdated?.(payload)
      syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
    } catch (err) {
      console.error(err)
      setAnthropometrySaveError('Не удалось сохранить. Проверьте интернет и права доступа к базе данных.')
    } finally {
      setIsAnthropometrySaving(false)
    }
  }

  const handleSaveNormAcceptance = async (category, norm) => {
    if (!student?.id) {
      setSaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    const coachId = getCurrentCoachId()
    if (!coachId) {
      setSaveError('Войдите в аккаунт тренера, чтобы зафиксировать норматив.')
      return
    }
    const localRow =
      category === 'physical'
        ? getNormValueByTestId(physicalResults, norm.testId)
        : getNormValueByTestId(functionalResults, norm.testId)
    if (!localRow || !Number.isFinite(localRow.result)) {
      setSaveError('Введите результат норматива перед сохранением.')
      return
    }
    const busyKey = `${category}:${norm.testId}`
    setSaveError('')
    setSaveOk(false)
    setNormSavingKey(busyKey)
    try {
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setSaveError('Ученик не найден в базе.')
        return
      }
      const physicalMerged = {
        ...emptyTestsRecord(fresh.tests?.physical),
        ...emptyTestsRecord(physicalResults),
      }
      const functionalMerged = {
        ...emptyTestsRecord(fresh.tests?.functional),
        ...emptyTestsRecord(functionalResults),
      }
      const bucket = category === 'physical' ? physicalMerged : functionalMerged
      const serverRow = getNormValueByTestId(bucket, norm.testId)
      const coachName = await resolveCoachDisplayName(coachId)
      const evaluated = {
        result: localRow.result,
        resultRaw: localRow.resultRaw,
        normalizedScore: localRow.normalizedScore,
        status: localRow.status,
      }
      const entry = buildNormAcceptanceHistoryEntry({
        norm,
        category,
        coachId,
        coachName,
        evaluated,
      })
      const mergedRow = {
        ...localRow,
        acceptedAt: entry.recordedAt,
        acceptedByCoachId: coachId,
        acceptedByCoachName: coachName,
        acceptanceHistory: mergeNormAcceptanceHistory(serverRow?.acceptanceHistory, entry),
      }
      bucket[norm.testId] = mergedRow

      const weight = Number(anthropometry.weight) || 0
      const prevHistory = Array.isArray(fresh.weightHistory) ? [...fresh.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      let weightHistory = prevHistory
      if (weight >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== weight || last.date !== measureDate) {
          weightHistory = [...prevHistory, { date: measureDate, weight }].slice(-36)
        }
      }

      const payload = buildStudentUpdatePayload(physicalMerged, functionalMerged, weightHistory)
      await updateStudentData(student.id, payload, {
        section: normAcceptanceSectionLabel(category, norm),
      })
      if (category === 'physical') setPhysicalResults(physicalMerged)
      else setFunctionalResults(functionalMerged)
      setSaveOk(true)
      onStudentUpdated?.(payload)
      syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
    } catch (err) {
      console.error(err)
      setSaveError('Не удалось сохранить норматив.')
    } finally {
      setNormSavingKey('')
    }
  }

  const persistTechnicalBundle = async (busyKey, technicalMerged, combinationsList) => {
    if (!student?.id) {
      setSaveError('Сначала выберите ученика в списке на главной странице.')
      return false
    }
    setSaveError('')
    setSaveOk(false)
    setTechnicalSavingKey(busyKey)
    try {
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setSaveError('Ученик не найден в базе.')
        return false
      }

      const physicalMerged = {
        ...emptyTestsRecord(fresh.tests?.physical),
        ...emptyTestsRecord(physicalResults),
      }
      const functionalMerged = {
        ...emptyTestsRecord(fresh.tests?.functional),
        ...emptyTestsRecord(functionalResults),
      }

      const weight = Number(anthropometry.weight) || 0
      const prevHistory = Array.isArray(fresh.weightHistory) ? [...fresh.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      let weightHistory = prevHistory
      if (weight >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== weight || last.date !== measureDate) {
          weightHistory = [...prevHistory, { date: measureDate, weight }].slice(-36)
        }
      }

      const payload = buildStudentUpdatePayload(
        physicalMerged,
        functionalMerged,
        weightHistory,
        technicalMerged,
        combinationsList,
      )
      await updateStudentData(student.id, payload, { section: STUDENT_UPDATE_SECTION.technique })
      setTechnicalData(technicalMerged)
      setTechnicalCombinations(mergeWithRequiredLevel3Combinations(combinationsList))
      setSaveOk(true)
      onStudentUpdated?.(payload)
      syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
      return true
    } catch (err) {
      console.error(err)
      setSaveError('Не удалось сохранить данные техники.')
      return false
    } finally {
      setTechnicalSavingKey('')
    }
  }

  const handleSaveTechnicalAtom = useCallback(
    async (atom) => {
      if (!student?.id) {
        setSaveError('Сначала выберите ученика в списке на главной странице.')
        return
      }
      const atomId = atom?.id
      if (!atomId) return
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setSaveError('Ученик не найден в базе.')
        return
      }

      const serverTechnical = emptyTechnicalRecord(fresh.technicalData)
      const localAtom = technicalData[atomId] ?? {}
      const technicalMerged = {
        ...serverTechnical,
        [atomId]: {
          ...(serverTechnical[atomId] ?? {}),
          ...localAtom,
          level: normalizeTechnicalDominanceKey(localAtom.level),
        },
      }

      await persistTechnicalBundle(`technical:${atomId}`, technicalMerged, technicalCombinations)
    },
    [student?.id, technicalData, technicalCombinations],
  )

  const handleTechnicalLevelChange = useCallback((atomId, level) => {
    setTechnicalData((prev) => ({
      ...prev,
      [atomId]: { ...(prev[atomId] ?? {}), level },
    }))
  }, [])

  const handlePhysicalNormChange = useCallback(
    (norm, raw) => updateNormResult('physical', norm, raw),
    [updateNormResult],
  )
  const handleFunctionalNormChange = useCallback(
    (norm, raw) => updateNormResult('functional', norm, raw),
    [updateNormResult],
  )
  const handlePhysicalNormSave = useCallback(
    (norm) => handleSaveNormAcceptance('physical', norm),
    [handleSaveNormAcceptance],
  )
  const handleFunctionalNormSave = useCallback(
    (norm) => handleSaveNormAcceptance('functional', norm),
    [handleSaveNormAcceptance],
  )

  const handleConfirmNewCombination = async () => {
    const name = comboDraftName.trim()
    if (!student?.id) {
      setSaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    if (!name) {
      setSaveError('Введите название комбинации.')
      return
    }
    if (comboDraftSteps.length === 0) {
      setSaveError('Добавьте в цепочку хотя бы один атом уровня 1 или 2.')
      return
    }
    const fresh = await getStudentById(student.id)
    if (!fresh) {
      setSaveError('Ученик не найден в базе.')
      return
    }
    const id = `combo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
    const serverTechnical = emptyTechnicalRecord(fresh.technicalData)
    const technicalMerged = {
      ...serverTechnical,
      ...technicalData,
      [id]: { level: 'NOT_LEARNED' },
    }
    const nextCombos = mergeWithRequiredLevel3Combinations([
      ...technicalCombinations,
      { id, name, steps: [...comboDraftSteps] },
    ])
    const ok = await persistTechnicalBundle(`technical:combo:${id}`, technicalMerged, nextCombos)
    if (ok) {
      setComboModalOpen(false)
      setComboDraftName('')
      setComboDraftSteps([])
    }
  }

  const handleDeleteCombination = async (comboId) => {
    if (!student?.id || !comboId) return
    if (isRequiredLevel3ComboId(comboId)) {
      setSaveError('Эту комбинацию удалить нельзя — она обязательна по программе.')
      return
    }
    if (!window.confirm('Удалить эту комбинацию у ученика?')) return
    const fresh = await getStudentById(student.id)
    if (!fresh) {
      setSaveError('Ученик не найден в базе.')
      return
    }
    const serverTechnical = emptyTechnicalRecord(fresh.technicalData)
    const nextCombos = technicalCombinations.filter((c) => c.id !== comboId)
    const technicalMerged = { ...serverTechnical, ...technicalData }
    delete technicalMerged[comboId]
    await persistTechnicalBundle(`technical:del:${comboId}`, technicalMerged, nextCombos)
  }

  const orderedTechnicalAtoms = useMemo(() => orderTechnicalAtomsForProgram(technicalAtoms), [technicalAtoms])

  const level2Atoms = useMemo(() => {
    const fromCache = programAtomsCache.level2
    return fromCache.length > 0 ? fromCache : TECHNIQUE_LEVEL2_ATOMS
  }, [programAtomsCache])

  const technicalLocksById = useMemo(
    () => buildTechnicalLocksById(orderedTechnicalAtoms, technicalData),
    [orderedTechnicalAtoms, technicalData],
  )


  return (
    <main className="min-h-screen bg-[#edeef0] px-2 py-2 text-[#2c2d2e] sm:px-4 sm:py-3">
      <div className="mx-auto min-w-0 max-w-4xl space-y-2 sm:space-y-4">
        <div className={`${vk.navSubBar} min-w-0`} aria-label="Карточка ученика — закреплённая строка">
          <BackToHomeLink onClick={onBack} className="shrink-0" />
          <p className={`min-w-0 flex-1 truncate ${vk.h2}`}>{safeStudent.name}</p>
        </div>

        <section className={`${vk.cardPadded} py-2.5 sm:py-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className={`hidden sm:block ${vk.h1Lg}`}>{safeStudent.name}</h1>
            {student?.id && (
              <div className={vk.chipBar}>
                <span className="text-[#818c99]">Код:</span>
                <span className="font-mono text-[15px] font-semibold tabular-nums text-[#2c2d2e]">
                  {shortIdDigits ? formatShortIdDisplay(shortIdDigits) : '—'}
                </span>
                <button
                  type="button"
                  disabled={!shortIdDigits}
                  onClick={copyShortId}
                  title="Скопировать шесть цифр без пробелов — чтобы передать другому тренеру"
                  aria-label="Скопировать личный код ученика"
                  className={vk.iconBtn}
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
                  className={`${vk.iconBtn} ${shareFlash ? 'text-[#4bb34b]' : ''}`}
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
            <p className={`mt-2 max-w-2xl ${vk.noticeWarn}`}>{shortIdAssignError}</p>
          )}
          {shareUrl && (
            <button
              type="button"
              onClick={copyShareUrl}
              title="Нажмите, чтобы скопировать ссылку"
              aria-label="Скопировать ссылку прогресса"
              className={`mt-3 w-full rounded-[10px] px-3 py-2 text-left text-[13px] break-all transition active:opacity-90 ${
                shareFlash ? 'bg-[#e8f7e8] text-[#4bb34b]' : vk.notice
              }`}
            >
              {shareUrl}
            </button>
          )}
        </section>

        <section className={`${vk.cardPadded} py-2.5 sm:py-3`}>
          <h2 className={vk.h2}>Тесты и техника</h2>

          <nav className={vk.studentTabBar} aria-label="Разделы карточки">
            {TAB_ITEMS.map((tab) => {
              const infKey = tabIdToInfluenceKey[tab.id]
              const isTopInfluenceTab = infKey && dominantInfluenceKeys.includes(infKey)
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`${vk.studentTabBtn} ${
                    isActive ? vk.studentTabBtnActive : vk.studentTabBtnIdle
                  } ${isTopInfluenceTab ? 'ring-1 ring-[#4bb34b]/60 ring-inset' : ''}`}
                >
                  <span className="text-[12px] font-medium leading-4">{tab.shortLabel}</span>
                  {tab.id !== 'anthropometry' ? (
                    <span
                      className={`text-[10px] font-medium tabular-nums leading-none ${
                        isActive ? 'text-[#818c99]' : 'text-[#aeb7c2]'
                      }`}
                    >
                      {tabProgress[tab.id] ?? 0}%
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="mt-2 space-y-2">
            {activeTab === 'anthropometry' && (
              <div className={vk.formGrid2}>
                <label className="block">
                  <span className={vk.label}>Год рожд.</span>
                  <input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    placeholder="2013"
                    className={vk.input}
                    value={anthropometry.birthYear}
                    onChange={(e) =>
                      setAnthropometry((prev) => ({ ...prev, birthYear: e.target.value }))
                    }
                  />
                  {formatBirthYearRu(anthropometry.birthYear) ? (
                    <span className={`mt-0.5 block ${vk.mutedXs}`}>
                      {formatBirthYearRu(anthropometry.birthYear)}
                    </span>
                  ) : null}
                </label>
                <label className="block">
                  <span className={vk.label}>Дата рожд.</span>
                  <input
                    type="date"
                    min="1900-01-01"
                    max={new Date().toISOString().slice(0, 10)}
                    className={vk.input}
                    value={anthropometry.birthDate}
                    onChange={(e) =>
                      setAnthropometry((prev) => ({ ...prev, birthDate: e.target.value }))
                    }
                  />
                  {anthropometry.birthDate ? (
                    <button
                      type="button"
                      className={`mt-0.5 ${vk.link}`}
                      onClick={() => setAnthropometry((prev) => ({ ...prev, birthDate: '' }))}
                    >
                      Очистить
                    </button>
                  ) : null}
                </label>
                <label className="block">
                  <span className={vk.label}>Рост, см</span>
                  <input
                    type="number"
                    className={vk.input}
                    value={anthropometry.height}
                    onChange={(e) =>
                      setAnthropometry((prev) => ({ ...prev, height: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className={vk.label}>Вес, кг</span>
                  <input
                    type="number"
                    className={vk.input}
                    value={anthropometry.weight}
                    onChange={(e) =>
                      setAnthropometry((prev) => ({ ...prev, weight: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className={vk.label}>Размах, см</span>
                  <input
                    type="number"
                    className={vk.input}
                    value={anthropometry.reach}
                    onChange={(e) =>
                      setAnthropometry((prev) => ({ ...prev, reach: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className={vk.label}>Пол</span>
                  <select
                    className={vk.select}
                    value={anthropometry.gender}
                    onChange={(e) =>
                      setAnthropometry((prev) => ({ ...prev, gender: e.target.value }))
                    }
                  >
                    <option value="M">М</option>
                    <option value="F">Ж</option>
                  </select>
                </label>
                <label className="col-span-2 block">
                  <span className={vk.label}>Дата измерения</span>
                  <input
                    type="date"
                    className={vk.input}
                    value={anthropometry.date}
                    onChange={(e) =>
                      setAnthropometry((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </label>

                <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-[#e7e8ec] pt-2">
                  {anthropometrySaveError ? (
                    <p className={`flex-1 ${vk.error}`} role="alert">
                      {anthropometrySaveError}
                    </p>
                  ) : null}
                  {anthropometrySaveOk && !anthropometrySaveError ? (
                    <p className={`flex-1 ${vk.success}`}>Сохранено</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={isAnthropometrySaving || !student?.id}
                    onClick={handleSaveProfile}
                    className={`ml-auto ${vk.btnPrimary}`}
                  >
                    {isAnthropometrySaving ? '…' : 'Сохранить'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'physical' && (
              <div className="space-y-2">
                <StudentNormsSection
                  category="physical"
                  norms={physicalNorms}
                  values={physicalResults}
                  loadingNorms={loadingNorms}
                  normSavingKey={normSavingKey}
                  canSave={Boolean(student?.id)}
                  onResultChange={handlePhysicalNormChange}
                  onSaveAcceptance={handlePhysicalNormSave}
                />
              </div>
            )}

            {activeTab === 'functional' && (
              <div className="space-y-2">
                <StudentNormsSection
                  category="functional"
                  norms={functionalNorms}
                  values={functionalResults}
                  loadingNorms={loadingNorms}
                  normSavingKey={normSavingKey}
                  canSave={Boolean(student?.id)}
                  onResultChange={handleFunctionalNormChange}
                  onSaveAcceptance={handleFunctionalNormSave}
                />
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="space-y-2">
                {technicalAtoms.length === 0 && !loadingNorms ? (
                  <p className={vk.mutedXs}>
                    Список не загрузился — проверьте интернет и обновите страницу.
                  </p>
                ) : (
                  <>
                    <nav className={vk.segmentBar} aria-label="Разделы техники">
                      <button
                        type="button"
                        onClick={() => setTechnicalTierTab('level1')}
                        aria-current={technicalTierTab === 'level1' ? 'page' : undefined}
                        className={`${vk.segmentBtn} flex-1 ${
                          technicalTierTab === 'level1' ? vk.segmentBtnActive : vk.segmentBtnInactive
                        }`}
                      >
                        Ур.1
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechnicalTierTab('level2')}
                        aria-current={technicalTierTab === 'level2' ? 'page' : undefined}
                        className={`${vk.segmentBtn} flex-1 ${
                          technicalTierTab === 'level2' ? vk.segmentBtnActive : vk.segmentBtnInactive
                        }`}
                      >
                        Ур.2
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechnicalTierTab('combos')}
                        aria-current={technicalTierTab === 'combos' ? 'page' : undefined}
                        className={`${vk.segmentBtn} flex-1 ${
                          technicalTierTab === 'combos' ? vk.segmentBtnActive : vk.segmentBtnInactive
                        }`}
                      >
                        Комб.
                        {technicalCombinationsResolved.length > 0 ? (
                          <span className="ml-0.5 tabular-nums">{technicalCombinationsResolved.length}</span>
                        ) : null}
                      </button>
                    </nav>

                    {technicalTierTab === 'level1' && (
                      <StudentTechnicalAtomsList
                        atoms={orderedTechnicalAtoms}
                        technicalData={technicalData}
                        technicalLocksById={technicalLocksById}
                        technicalSavingKey={technicalSavingKey}
                        canSave={Boolean(student?.id)}
                        showMethodDetails
                        onLevelChange={handleTechnicalLevelChange}
                        onSaveAtom={handleSaveTechnicalAtom}
                      />
                    )}

                    {technicalTierTab === 'level2' && (
                      <StudentTechnicalAtomsList
                        atoms={level2Atoms}
                        technicalData={technicalData}
                        technicalLocksById={technicalLocksById}
                        technicalSavingKey={technicalSavingKey}
                        canSave={Boolean(student?.id)}
                        onLevelChange={handleTechnicalLevelChange}
                        onSaveAtom={handleSaveTechnicalAtom}
                      />
                    )}

                    {technicalTierTab === 'combos' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className={vk.mutedXs}>Обязательные: двойка подшаг, двойка толчок</p>
                          <button
                            type="button"
                            disabled={!student?.id}
                            onClick={() => {
                              setComboDraftName('')
                              setComboDraftSteps([])
                              setComboPickTier('1')
                              setComboPickAtomId('')
                              setComboModalOpen(true)
                            }}
                            className={vk.btnSecondary}
                          >
                            + Комбинация
                          </button>
                        </div>
                        <ul className={vk.list}>
                          {technicalCombinationsResolved.map((combo) => {
                            const chain = buildComboChainPreview(combo.steps, atomByIdLookup)
                            const atomLevelKey = normalizeTechnicalDominanceKey(technicalData[combo.id]?.level)
                            const reqNum = REQUIRED_LEVEL3_COMBO_IDS.indexOf(combo.id)
                            const isRequiredCombo = reqNum >= 0
                            const comboSaving = technicalSavingKey === `technical:${combo.id}`
                            return (
                              <li
                                key={combo.id}
                                id={`technical-combo-${combo.id}`}
                                className={`scroll-mt-40 border-t border-[#e7e8ec] first:border-t-0 ${
                                  isRequiredCombo ? 'bg-[#fffbeb]' : 'bg-white'
                                }`}
                              >
                                <div className="px-2.5 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#2c2d2e]">
                                      {isRequiredCombo ? (
                                        <span className="mr-1 text-[10px] font-bold text-amber-800">
                                          #{reqNum + 1}
                                        </span>
                                      ) : (
                                        <span className="mr-0.5 text-[#6f3ff5]">∑</span>
                                      )}
                                      {combo.name}
                                    </h3>
                                    {!isRequiredCombo ? (
                                      <button
                                        type="button"
                                        disabled={!student?.id || Boolean(technicalSavingKey)}
                                        onClick={() => handleDeleteCombination(combo.id)}
                                        className="shrink-0 text-[12px] font-medium text-[#e64646] disabled:opacity-40"
                                      >
                                        Удалить
                                      </button>
                                    ) : null}
                                  </div>
                                  <p className={`mt-0.5 line-clamp-2 ${vk.mutedXs}`} title={chain}>
                                    {chain}
                                  </p>
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <select
                                      className={`${vk.select} min-w-0 flex-1`}
                                      value={atomLevelKey}
                                      aria-label="Уровень освоения"
                                      onChange={(e) =>
                                        setTechnicalData((prev) => ({
                                          ...prev,
                                          [combo.id]: { ...(prev[combo.id] ?? {}), level: e.target.value },
                                        }))
                                      }
                                    >
                                      {TECH_DOMINANCE_OPTIONS.map((opt) => (
                                        <option key={opt.key} value={opt.key}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      disabled={!student?.id || comboSaving}
                                      onClick={() =>
                                        handleSaveTechnicalAtom({
                                          id: combo.id,
                                          number: 'III',
                                          name: combo.name,
                                          embedUrl: '',
                                          howTo: '',
                                          whyHowTo: '',
                                          mistakes: '',
                                          whyMistakes: '',
                                        })
                                      }
                                      className={vk.btnCompact}
                                    >
                                      {comboSaving ? '…' : 'Сохранить'}
                                    </button>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {comboModalOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 sm:items-center"
                    role="presentation"
                    onClick={() => setComboModalOpen(false)}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="combo-modal-title"
                      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h4 id="combo-modal-title" className="text-base font-semibold text-slate-900">
                        Новая комбинация
                      </h4>
                      <p className="mt-1 text-xs text-slate-600">
                        Выберите атомы уровня 1 или 2 и выстройте цепочку слева направо, как на тренировке.
                      </p>
                      <label className="mt-4 block space-y-1">
                        <span className="text-xs font-semibold text-slate-700">Название</span>
                        <input
                          type="text"
                          value={comboDraftName}
                          onChange={(e) => setComboDraftName(e.target.value)}
                          placeholder="Например: двойка подшаг"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                        />
                      </label>
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Конструктор</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select
                            value={comboPickTier}
                            onChange={(e) => {
                              setComboPickTier(e.target.value)
                              setComboPickAtomId('')
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="1">Уровень 1</option>
                            <option value="2">Уровень 2</option>
                          </select>
                          <select
                            value={comboPickAtomId}
                            onChange={(e) => setComboPickAtomId(e.target.value)}
                            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="">— выберите блок —</option>
                            {comboPickOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!comboPickAtomId}
                            onClick={() => {
                              if (!comboPickAtomId) return
                              setComboDraftSteps((s) => [...s, comboPickAtomId])
                            }}
                            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
                          >
                            В цепочку
                          </button>
                        </div>
                        {comboDraftSteps.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap items-center gap-1.5">
                            {comboDraftSteps.map((stepId, idx) => {
                              const label = atomByIdLookup.get(stepId)?.name ?? stepId
                              return (
                                <li
                                  key={`${stepId}-${idx}`}
                                  className="inline-flex items-center gap-0.5 rounded-md border border-violet-200 bg-white px-1.5 py-1 text-[11px]"
                                >
                                  <span className="max-w-[140px] truncate" title={label}>
                                    {label}
                                  </span>
                                  <button
                                    type="button"
                                    className="rounded px-0.5 text-slate-500 hover:text-slate-800:text-slate-200"
                                    aria-label="Выше"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      setComboDraftSteps((s) => {
                                        if (idx === 0) return s
                                        const c = [...s]
                                        ;[c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]
                                        return c
                                      })
                                    }
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded px-0.5 text-slate-500 hover:text-slate-800:text-slate-200"
                                    aria-label="Ниже"
                                    disabled={idx >= comboDraftSteps.length - 1}
                                    onClick={() =>
                                      setComboDraftSteps((s) => {
                                        if (idx >= s.length - 1) return s
                                        const c = [...s]
                                        ;[c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]
                                        return c
                                      })
                                    }
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded px-0.5 text-red-600 hover:text-red-800"
                                    aria-label="Убрать из цепочки"
                                    onClick={() => setComboDraftSteps((s) => s.filter((_, i) => i !== idx))}
                                  >
                                    ×
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">Цепочка пока пуста.</p>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setComboModalOpen(false)}
                          className={vk.btnSecondary}
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(technicalSavingKey)}
                          onClick={() => void handleConfirmNewCombination()}
                          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-45"
                        >
                          Сохранить комбинацию
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(saveError || saveOk) && (
            <div className="mt-8 border-t border-slate-200 pt-5">
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}
              {saveOk && !saveError && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Сохранено. Данные ученика в облаке обновлены.
                </div>
              )}
            </div>
          )}
        </section>

        <section className={`${ETALON_MODEL_PANEL_CLASS} ${vk.cardPadded} py-2.5 sm:py-3`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className={vk.h2}>Эталон и КБП</h2>
              <p className={vk.mutedXs}>
                {isYoungHistoricalPreview
                  ? 'Ориентир 13–14 лет по весу'
                  : 'Категория, сравнение роста и потолок потенциала'}
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className="block text-[11px] text-[#818c99]">КБП</span>
              <span className="text-[17px] font-semibold tabular-nums text-[#2d81e0]">{kspPercent}%</span>
            </p>
          </div>

          {isYoungHistoricalPreview ? (
            <p className={`mt-1.5 ${vk.noticeInfo} px-2 py-1.5 text-[12px]`} role="note">
              {Number.isFinite(historicalAthleteAge) ? historicalAthleteAge : '—'} лет — эталон 13–14 по весу.
            </p>
          ) : null}

          <div className="standard-duel-stage mt-1.5">
            <StandardDuelSilhouettes
              flat
              athleteLabel={displayNameFromStudent(safeStudent) || 'Спортсмен'}
              referenceLabel={historicalReferenceLabel}
              athleteHeightCm={athleteHeight}
              athleteReachCm={athleteReach}
              athleteWeightKg={athleteWeight}
              referenceHeightCm={referenceHeight}
              referenceReachCm={referenceReach}
              referenceWeightKg={referenceWeightKg}
            />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1 border-t border-[#e7e8ec] pt-2 text-[12px] leading-4">
            <div className="min-w-0">
              <p className={vk.mutedXs}>Категория</p>
              <p className="mt-0.5 font-medium text-[#2c2d2e]">
                {standardWeightCategory} кг
                <span className="font-normal text-[#818c99]"> · {standardAgeGroup}</span>
              </p>
              <p className="text-[#2c2d2e]">{standardArchetype}</p>
            </div>
            <div className="min-w-0 border-l border-[#e7e8ec] pl-2">
              <p className={vk.mutedXs}>Эталон</p>
              <p className="mt-0.5 text-[#2c2d2e]">
                {referenceHeight || '—'} / {referenceReach || '—'} см
              </p>
            </div>
            <div className="min-w-0 border-l border-[#e7e8ec] pl-2">
              <p className={vk.mutedXs}>Дистанция</p>
              <p className="mt-0.5 font-semibold text-[#2d81e0]">{tacticDistanceDisplay || '—'}</p>
            </div>
          </div>

          {weights.tacticMode === 'infighter' && weights.tacticAdvice ? (
            <p
              className="mt-1.5 rounded-[10px] bg-[#fff0f0] px-2 py-1.5 text-[12px] font-medium text-[#e64646]"
              role="alert"
            >
              {weights.tacticAdvice}
            </p>
          ) : null}
          {weights.tacticMode === 'outfighter' && weights.tacticAdvice ? (
            <p className={`mt-1.5 ${vk.noticeInfo} px-2 py-1.5 text-[12px]`} role="status">
              {weights.tacticAdvice}
            </p>
          ) : null}

          <div className="mt-2 border-t border-[#e7e8ec] pt-2">
            <BiometricPotentialBar
              embedded
              kspPercent={kspPercent}
              basePercent={basePercent}
            />
          </div>
        </section>

        {normsError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {normsError}
          </div>
        )}

        <MotorQualityWorkLogPanel workLog={student?.motorQualityWorkLog ?? safeStudent?.motorQualityWorkLog} />

        <section className={`${vk.cardPadded} py-2.5 sm:py-3`}>
          <h2 className={vk.h2}>Сенситивные периоды</h2>
          <SensitivePeriodTimer
            className="mt-1.5"
            birthYear={resolvedBirthYear}
            birthDate={resolvedBirthDate}
          />
        </section>

      </div>
    </main>
  )
}

export default StudentPage
