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
  loadLegacyNorms,
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
import { buildPublicSharePayload, isValidProgressShareToken } from '../utils/publicSharePayload'
import {
  buildNormAcceptanceHistoryEntry,
  formatNormAcceptedMeta,
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
import BiometricPotentialBar from '../components/BiometricPotentialBar'
import StandardDuelSilhouettes, { referenceWeightFromStandardRow } from '../components/StandardDuelSilhouettes'
import { NormGoldGoalIcon, NormMedalChip } from '../components/NormMedals'
import { normCardToneByStatus, normScoreToneByStatus } from '../utils/normCardTone'
import { getSensitiveMotorQualities } from '../utils/sensitivePeriods'
import SensitivePeriodTimer from '../components/SensitivePeriodTimer'
import MotorQualityWorkLogPanel from '../components/MotorQualityWorkLogPanel'
/** Стабильный id карточки норматива на вкладке «Физика» / «Функционал». */
function normCardDomId(category, testId) {
  const safe = String(testId ?? '').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `norm-card-${category}-${safe}`
}


const TAB_ITEMS = [
  { id: 'anthropometry', label: 'Карта спортсмена' },
  { id: 'physical', label: 'Физическое развитие' },
  { id: 'functional', label: 'Функциональная готовность' },
  { id: 'technical', label: 'Техника' },
]

const TAB_PROGRESS_LABELS = {
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

function getCoachInputHint(norm) {
  if (isMinuteSecondNorm(norm)) {
    return 'Время: 8:30 и 8:05 (секунды всегда двумя цифрами), либо 8.30 / 8,30 / 8 30. Дробные минуты без секунд — только запятой: 8,5.'
  }
  return 'Числовой формат: можно вводить с точкой или запятой (например, 6.5 или 6,5) — программа распознает автоматически.'
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
  const [openTechnicalVideoId, setOpenTechnicalVideoId] = useState(null)
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
    setOpenTechnicalVideoId(null)
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

  const updateNormResult = (category, norm, rawValue) => {
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
  }

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

  const syncPublicShareIfNeeded = async (weightHistoryArg, testsExact = null) => {
    const shareTok =
      typeof student.progressShareToken === 'string' ? student.progressShareToken : ''
    if (!isValidProgressShareToken(shareTok)) return
    try {
      const sharePayload = await buildSharePayloadForPublic(weightHistoryArg, testsExact)
      await setPublicStudentShareDocument(shareTok, {
        payload: sharePayload,
        ownerCoachIds: ownerCoachIdsForShare,
      })
    } catch (e) {
      console.warn('Не удалось обновить публичную страницу прогресса:', e)
    }
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
      await syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
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
      await syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
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
      await syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
      return true
    } catch (err) {
      console.error(err)
      setSaveError('Не удалось сохранить данные техники.')
      return false
    } finally {
      setTechnicalSavingKey('')
    }
  }

  const handleSaveTechnicalAtom = async (atom) => {
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
  }

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

  const renderNormInputs = (category, norms, values) => {
    if (loadingNorms) {
      return <p className="text-sm text-slate-500">Загрузка нормативов...</p>
    }
    if (norms.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          Нет нормативов для возраста и пола. Укажите год рождения и пол в «Карте спортсмена».
        </p>
      )
    }
    return norms.map((norm) => {
      const row = getNormValueByTestId(values, norm.testId)
      const displayVal =
        row?.resultRaw ??
        (row?.result !== undefined && row?.result !== null
          ? isMinuteSecondNorm(norm)
            ? formatMinutesToMinuteSecond(row.result)
            : String(row.result)
          : '')
      const inputType = isMinuteSecondNorm(norm) ? 'text' : 'number'
      const goalLabel =
        Number.isFinite(norm.gold)
          ? isMinuteSecondNorm(norm)
            ? formatMinutesToMinuteSecond(norm.gold)
            : String(norm.gold)
          : '—'
      const cardTone = normCardToneByStatus(row?.status)
      const scoreTone = normScoreToneByStatus(row?.status)
      const betterHint =
        norm.measureType === 'MAX' ? 'Чем больше — тем лучше' : 'Чем меньше — тем лучше'
      const acceptedMeta = formatNormAcceptedMeta(row)
      const normBusy = normSavingKey === `${category}:${norm.testId}`
      return (
        <div
          key={norm.testId}
          id={normCardDomId(category, norm.testId)}
          className={`scroll-mt-40 flex flex-col gap-1.5 rounded-lg border p-2.5 transition-colors sm:gap-2 sm:rounded-xl sm:p-4 ${cardTone}`}
        >
          <div className="text-center">
            <span className="block text-base font-bold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">{norm.testName}</span>
            {norm.description ? (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-600 sm:text-xs">{norm.description}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0">
            <div className="flex min-w-0 items-center gap-2">
              <NormGoldGoalIcon />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/85">Цель</p>
                <p className="truncate text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {goalLabel}{' '}
                  <span className="text-xs font-semibold text-slate-600">{norm.unit}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <p className="max-w-[11rem] text-right text-[11px] font-medium leading-snug text-slate-700 sm:max-w-none sm:text-xs">
                {betterHint}
              </p>
            </div>
          </div>

          <p className="text-[11px] leading-snug text-slate-500 sm:text-xs">{getCoachInputHint(norm)}</p>
          <div className="flex flex-wrap items-end gap-3 pt-0.5">
            <label className="min-w-[140px] flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Результат ({norm.unit})</span>
              <input
                type={inputType}
                inputMode={inputType === 'text' ? 'numeric' : 'decimal'}
                step={inputType === 'number' ? 'any' : undefined}
                className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={displayVal}
                onChange={(e) => updateNormResult(category, norm, e.target.value)}
              />
            </label>
            {row && Number.isFinite(row.result) ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-600">
                  Оценка в баллах:{' '}
                  <span className={`font-semibold tabular-nums ${scoreTone}`}>{row.normalizedScore}</span>
                </span>
                <NormMedalChip status={row.status} size="sm" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-200/80 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!student?.id || normBusy || !row || !Number.isFinite(row.result)}
                onClick={() => handleSaveNormAcceptance(category, norm)}
                className="rounded-lg border border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {normBusy ? 'Сохранение…' : 'Сохранить норматив'}
              </button>
            </div>
            {acceptedMeta ? (
              <p className="text-[11px] leading-snug text-slate-600">{acceptedMeta}</p>
            ) : (
              <p className="text-[11px] text-slate-400">После сохранения здесь появятся тренер и время фиксации.</p>
            )}
          </div>
        </div>
      )
    })
  }

  const orderedTechnicalAtoms = useMemo(() => orderTechnicalAtomsForProgram(technicalAtoms), [technicalAtoms])

  const technicalLocksById = useMemo(
    () => buildTechnicalLocksById(orderedTechnicalAtoms, technicalData),
    [orderedTechnicalAtoms, technicalData],
  )


  return (
    <main className="min-h-screen bg-slate-50 px-2 pt-2 pb-4 text-slate-900 sm:px-6 sm:pt-3 sm:pb-6">
      <div className="mx-auto min-w-0 max-w-4xl space-y-2 sm:space-y-4">
        <div
          className="sticky top-14 z-30 -mx-2 flex min-w-0 items-center gap-2 border-b border-slate-200 bg-white/95 py-2 pr-2 pl-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:top-[4.5rem] sm:-mx-6 sm:gap-3 sm:px-6"
          aria-label="Карточка ученика — закреплённая строка"
        >
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-lg border border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-50 sm:px-4 sm:py-2 sm:text-sm"
          >
            Назад к дашборду
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
            {safeStudent.name}
          </p>
        </div>

        <section className="rounded-xl bg-white p-2 shadow-sm dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="hidden text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:block sm:text-3xl sm:tracking-normal">
              {safeStudent.name}
            </h1>
            {student?.id && (
              <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 sm:ml-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm">
                <span className="text-slate-500">Код:</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 sm:text-base">
                  {shortIdDigits ? formatShortIdDisplay(shortIdDigits) : '—'}
                </span>
                <button
                  type="button"
                  disabled={!shortIdDigits}
                  onClick={copyShortId}
                  title="Скопировать шесть цифр без пробелов — чтобы передать другому тренеру"
                  aria-label="Скопировать личный код ученика"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 sm:h-9 sm:w-9"
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
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9 ${
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
        </section>

        <section className="rounded-xl bg-white p-2 shadow-sm dark:bg-slate-900 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">Тесты и техника</h2>

          <div className="-mx-2 mt-2 flex gap-1.5 overflow-x-auto px-2 pb-1 sm:mx-0 sm:mt-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 md:flex md:flex-nowrap md:gap-4">
            {TAB_ITEMS.map((tab) => {
              const infKey = tabIdToInfluenceKey[tab.id]
              const isTopInfluenceTab = infKey && dominantInfluenceKeys.includes(infKey)
              return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group relative min-w-[7.25rem] shrink-0 min-h-[4.25rem] overflow-hidden rounded-lg border px-2 py-2 text-left transition-all sm:min-w-0 sm:min-h-[124px] sm:rounded-xl sm:px-4 sm:py-4 md:min-h-[132px] md:flex-1 ${
                  activeTab === tab.id
                    ? 'z-[1] border-blue-400 bg-blue-50/60 text-slate-900 shadow-sm ring-1 ring-blue-200/80 sm:-translate-y-0.5 sm:shadow-md sm:shadow-blue-100/80 dark:border-blue-500 dark:bg-blue-950/40 dark:text-slate-100 dark:shadow-blue-950/30 dark:ring-blue-800/50'
                    : 'border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:hover:-translate-y-1 sm:hover:border-slate-300 sm:hover:bg-slate-50 sm:hover:shadow-lg'
                } ${
                  isTopInfluenceTab
                    ? 'ring-2 ring-emerald-500/70 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-900 sm:ring-offset-2 md:min-h-[138px]'
                    : ''
                }`}
              >
                <span
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left rounded-b-xl transition-all duration-500 ease-out ${
                    activeTab === tab.id
                      ? 'scale-x-100 bg-blue-500 dark:bg-blue-400'
                      : 'scale-x-0 bg-transparent group-hover:scale-x-100 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                  }`}
                  aria-hidden
                />
                <span
                  className={`relative mb-1 inline-flex h-6 w-6 items-center justify-center rounded-md border sm:mb-3 sm:h-10 sm:w-10 sm:rounded-lg sm:group-hover:scale-110 ${
                    activeTab === tab.id
                      ? 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:border-slate-500 dark:group-hover:bg-slate-700'
                  }`}
                >
                  {TAB_ICONS[tab.id]}
                </span>
                <span
                  className="relative block text-[11px] uppercase leading-tight text-slate-900 sm:text-[16px] md:text-[18px] md:tracking-wide dark:text-slate-100"
                  style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif' }}
                >
                  {tab.label}
                </span>
                {tab.id !== 'anthropometry' ? (
                  <>
                    <span className="relative mt-0.5 block text-[10px] text-slate-500 sm:mt-3 sm:text-xs dark:text-slate-400">
                      {TAB_PROGRESS_LABELS[tab.id]}: {tabProgress[tab.id] ?? 0}%
                    </span>
                    <span className="relative mt-1 hidden h-1.5 w-full overflow-hidden rounded-full bg-slate-200 sm:mt-2 sm:block dark:bg-slate-700" aria-hidden>
                      <span
                        className={`block h-full rounded-full transition-all duration-500 ease-out ${progressColorClass(tabProgress[tab.id] ?? 0)}`}
                        style={{ width: `${tabProgress[tab.id] ?? 0}%` }}
                      />
                    </span>
                  </>
                ) : null}
              </button>
              )
            })}
          </div>

          <div className="mt-3 space-y-3 sm:mt-6 sm:space-y-6">
            {activeTab === 'anthropometry' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Карта спортсмена</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Год рождения</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min={1900}
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
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">
                      Дата рождения{' '}
                      <span className="font-normal text-slate-500">(необязательно)</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="date"
                        min="1900-01-01"
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full max-w-[220px] rounded-lg border border-slate-200 px-3 py-2"
                        value={anthropometry.birthDate}
                        onChange={(e) =>
                          setAnthropometry((prev) => ({ ...prev, birthDate: e.target.value }))
                        }
                      />
                      {anthropometry.birthDate ? (
                        <button
                          type="button"
                          className="text-sm text-slate-600 underline hover:text-slate-900"
                          onClick={() =>
                            setAnthropometry((prev) => ({ ...prev, birthDate: '' }))
                          }
                        >
                          Очистить
                        </button>
                      ) : null}
                    </div>
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

                <div className="mt-6 border-t border-slate-200 pt-5">
                  {anthropometrySaveError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {anthropometrySaveError}
                    </div>
                  )}
                  {anthropometrySaveOk && !anthropometrySaveError && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                      Данные сохранены в облаке.
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isAnthropometrySaving || !student?.id}
                    onClick={handleSaveProfile}
                    className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto sm:py-2.5"
                  >
                    {isAnthropometrySaving ? 'Сохранение…' : 'Сохранить'}
                  </button>
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
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Техника</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Три уровня: базовые элементы, контексты удара/защиты и индивидуальные комбинации. Шкала освоения для
                    всех уровней одинаковая.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
                  Предложенные технические элементы и видеоматериалы носят рекомендательный методический характер и
                  не являются единственно верным стандартом исполнения. В зависимости от школы бокса допустимы
                  различия в технике и акцентах обучения. Приоритетным является соблюдение последовательности
                  освоения: переход к следующему элементу осуществляется после уверенного закрепления предыдущего.
                  Видео используется как дополнительный визуальный инструмент по усмотрению тренера.
                </div>
                {technicalAtoms.length === 0 && !loadingNorms ? (
                  <p className="text-sm text-slate-500">
                    Список ударов из общей таблицы не загрузился — проверьте интернет и откройте страницу позже.
                  </p>
                ) : (
                  <>
                    <nav
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-800/90 sm:flex-row sm:items-stretch"
                      aria-label="Разделы техники"
                    >
                      <button
                        type="button"
                        onClick={() => setTechnicalTierTab('level1')}
                        aria-current={technicalTierTab === 'level1' ? 'page' : undefined}
                        className={`flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors sm:py-3 ${
                          technicalTierTab === 'level1'
                            ? 'bg-white text-slate-900 shadow ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600'
                            : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        Уровень 1
                        <span className="mt-0.5 block text-[10px] font-normal opacity-80">Базовые элементы</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechnicalTierTab('level2')}
                        aria-current={technicalTierTab === 'level2' ? 'page' : undefined}
                        className={`flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors sm:py-3 ${
                          technicalTierTab === 'level2'
                            ? 'bg-white text-slate-900 shadow ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-600'
                            : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        Уровень 2
                        <span className="mt-0.5 block text-[10px] font-normal opacity-80">Линии удара</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechnicalTierTab('combos')}
                        aria-current={technicalTierTab === 'combos' ? 'page' : undefined}
                        className={`flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors sm:py-3 ${
                          technicalTierTab === 'combos'
                            ? 'bg-white text-slate-900 shadow ring-1 ring-violet-300/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-violet-700/60'
                            : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        Комбинации
                        <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                          {technicalCombinationsResolved.length
                            ? `${technicalCombinationsResolved.length} шт.`
                            : 'Уровень 3'}
                        </span>
                      </button>
                    </nav>

                    {technicalTierTab === 'level1' && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Уровень 1 — базовые элементы
                      </h4>
                      {orderedTechnicalAtoms.map((atom) => {
                        const atomLevelKey = normalizeTechnicalDominanceKey(technicalData[atom.id]?.level)
                        const isLockedBySequence = Boolean(technicalLocksById[atom.id])
                        return (
                          <article
                            key={atom.id}
                            id={`technical-atom-${atom.id}`}
                            className={`scroll-mt-40 rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-900 ${
                              isLockedBySequence ? 'border-amber-300 bg-amber-50/40 dark:border-amber-700/50' : 'border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-700">
                              <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                                <span className="tabular-nums text-slate-500">#{atom.number}</span> {atom.name}
                              </h3>
                              {isLockedBySequence && (
                                <span
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-900/80 dark:text-amber-200"
                                  title="Элемент закрыт до уровня «Умение» на предыдущем"
                                  aria-label="Элемент закрыт"
                                >
                                  🔒
                                </span>
                              )}
                              {atom.embedUrl && (
                                <button
                                  type="button"
                                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:text-slate-300 ${
                                    openTechnicalVideoId === atom.id
                                      ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-200'
                                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700'
                                  }`}
                                  title="Видеоматериал (опционально)"
                                  aria-label="Показать или скрыть видео"
                                  aria-expanded={openTechnicalVideoId === atom.id}
                                  onClick={() =>
                                    setOpenTechnicalVideoId((id) => (id === atom.id ? null : atom.id))
                                  }
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M8 5v14l11-7L8 5z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {atom.embedUrl && openTechnicalVideoId === atom.id && (
                              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-2 dark:border-slate-600">
                                <div className="relative w-full pt-[177.78%]">
                                  <iframe
                                    src={atom.embedUrl}
                                    title={`Видео: ${atom.name}`}
                                    className="absolute left-0 top-0 h-full w-full"
                                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                                    allowFullScreen
                                    loading="lazy"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="mt-2">
                              <label className="min-w-0 space-y-0.5">
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  Уровень освоения
                                </span>
                                <select
                                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                                  value={atomLevelKey}
                                  disabled={isLockedBySequence}
                                  onChange={(event) =>
                                    isLockedBySequence
                                      ? null
                                      : setTechnicalData((prev) => ({
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
                            </div>

                            <label className="mt-2 block space-y-0.5">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Комментарий тренера
                              </span>
                              <textarea
                                rows={2}
                                className="w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                                placeholder="Заметки по элементу…"
                                value={technicalData[atom.id]?.comment ?? ''}
                                disabled={isLockedBySequence}
                                onChange={(event) =>
                                  isLockedBySequence
                                    ? null
                                    : setTechnicalData((prev) => ({
                                        ...prev,
                                        [atom.id]: { ...(prev[atom.id] ?? {}), comment: event.target.value },
                                      }))
                                }
                              />
                            </label>
                            {isLockedBySequence && (
                              <p className="mt-2 rounded-md border border-amber-200 bg-amber-100/70 px-2.5 py-1.5 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
                                Элемент под замком. Чтобы открыть его, предыдущий элемент должен быть на уровне «Умение».
                              </p>
                            )}
                            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                              <button
                                type="button"
                                disabled={!student?.id || isLockedBySequence || technicalSavingKey === `technical:${atom.id}`}
                                onClick={() => handleSaveTechnicalAtom(atom)}
                                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                              >
                                {technicalSavingKey === `technical:${atom.id}` ? 'Сохранение…' : 'Сохранить элемент'}
                              </button>
                            </div>

                            <details className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <summary className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">Подсказка и детали</summary>
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
                        )
                      })}
                    </div>
                    )}

                    {technicalTierTab === 'level2' && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Уровень 2
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Фиксированный набор контекстов; освоение по той же шкале, что и уровень 1. На программу «под
                        замок» уровень 2 не влияет.
                      </p>
                      {TECHNIQUE_LEVEL2_ATOMS.map((atom) => {
                        const atomLevelKey = normalizeTechnicalDominanceKey(technicalData[atom.id]?.level)
                        return (
                          <article
                            key={atom.id}
                            id={`technical-atom-${atom.id}`}
                            className="scroll-mt-40 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-600 dark:bg-slate-900"
                          >
                            <div className="flex items-start gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-700">
                              <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                                <span className="tabular-nums text-slate-500">#{atom.number}</span> {atom.name}
                              </h3>
                            </div>
                            <div className="mt-2">
                              <label className="min-w-0 space-y-0.5">
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  Уровень освоения
                                </span>
                                <select
                                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                  value={atomLevelKey}
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
                            </div>
                            <label className="mt-2 block space-y-0.5">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Комментарий тренера
                              </span>
                              <textarea
                                rows={2}
                                className="w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                placeholder="Заметки по элементу…"
                                value={technicalData[atom.id]?.comment ?? ''}
                                onChange={(event) =>
                                  setTechnicalData((prev) => ({
                                    ...prev,
                                    [atom.id]: { ...(prev[atom.id] ?? {}), comment: event.target.value },
                                  }))
                                }
                              />
                            </label>
                            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                              <button
                                type="button"
                                disabled={!student?.id || technicalSavingKey === `technical:${atom.id}`}
                                onClick={() => handleSaveTechnicalAtom(atom)}
                                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                              >
                                {technicalSavingKey === `technical:${atom.id}` ? 'Сохранение…' : 'Сохранить элемент'}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                    )}

                    {technicalTierTab === 'combos' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Уровень 3
                        </h4>
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
                          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 shadow-sm hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/60"
                        >
                          Добавить комбинацию
                        </button>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        Обязательные к изучению:{' '}
                        <span className="text-violet-700 dark:text-violet-300">1. Двойка подшаг</span>,{' '}
                        <span className="text-violet-700 dark:text-violet-300">2. Двойка толчок</span> — всегда в начале
                        списка, удалить их нельзя.
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Соберите цепочку из атомов уровней 1 и 2 (конструктор). У каждой комбинации свой уровень освоения
                        и комментарий.
                      </p>
                      {technicalCombinationsResolved.map((combo) => {
                        const chain = buildComboChainPreview(combo.steps, atomByIdLookup)
                        const atomLevelKey = normalizeTechnicalDominanceKey(technicalData[combo.id]?.level)
                        const reqNum = REQUIRED_LEVEL3_COMBO_IDS.indexOf(combo.id)
                        const isRequiredCombo = reqNum >= 0
                        return (
                            <article
                              key={combo.id}
                              id={`technical-combo-${combo.id}`}
                              className={`scroll-mt-40 rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-900 ${
                                isRequiredCombo
                                  ? 'border-amber-200 ring-1 ring-amber-100/80 dark:border-amber-800/60 dark:ring-amber-900/40'
                                  : 'border-violet-200 dark:border-violet-800/60'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-700">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {isRequiredCombo ? (
                                      <span className="inline-flex shrink-0 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-100">
                                        Обязательная {reqNum + 1}
                                      </span>
                                    ) : null}
                                    <h3 className="min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                                      <span className="tabular-nums text-violet-600 dark:text-violet-400">∑</span>{' '}
                                      {combo.name}
                                    </h3>
                                  </div>
                                </div>
                                {!isRequiredCombo ? (
                                  <button
                                    type="button"
                                    disabled={!student?.id || Boolean(technicalSavingKey)}
                                    onClick={() => handleDeleteCombination(combo.id)}
                                    className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                                  >
                                    Удалить
                                  </button>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs leading-snug text-slate-600 dark:text-slate-400">
                                Цепочка: <span className="font-medium text-slate-800 dark:text-slate-200">{chain}</span>
                              </p>
                              <div className="mt-2">
                                <label className="min-w-0 space-y-0.5">
                                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Уровень освоения
                                  </span>
                                  <select
                                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                    value={atomLevelKey}
                                    onChange={(event) =>
                                      setTechnicalData((prev) => ({
                                        ...prev,
                                        [combo.id]: { ...(prev[combo.id] ?? {}), level: event.target.value },
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
                              </div>
                              <label className="mt-2 block space-y-0.5">
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  Комментарий тренера
                                </span>
                                <textarea
                                  rows={2}
                                  className="w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                                  placeholder="Заметки по комбинации…"
                                  value={technicalData[combo.id]?.comment ?? ''}
                                  onChange={(event) =>
                                    setTechnicalData((prev) => ({
                                      ...prev,
                                      [combo.id]: { ...(prev[combo.id] ?? {}), comment: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                                <button
                                  type="button"
                                  disabled={!student?.id || technicalSavingKey === `technical:${combo.id}`}
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
                                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                                >
                                  {technicalSavingKey === `technical:${combo.id}` ? 'Сохранение…' : 'Сохранить комбинацию'}
                                </button>
                              </div>
                            </article>
                          )
                      })}
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
                      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900 sm:p-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h4 id="combo-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Новая комбинация
                      </h4>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Выберите атомы уровня 1 или 2 и выстройте цепочку слева направо, как на тренировке.
                      </p>
                      <label className="mt-4 block space-y-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Название</span>
                        <input
                          type="text"
                          value={comboDraftName}
                          onChange={(e) => setComboDraftName(e.target.value)}
                          placeholder="Например: двойка подшаг"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </label>
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/80">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Конструктор</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select
                            value={comboPickTier}
                            onChange={(e) => {
                              setComboPickTier(e.target.value)
                              setComboPickAtomId('')
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="1">Уровень 1</option>
                            <option value="2">Уровень 2</option>
                          </select>
                          <select
                            value={comboPickAtomId}
                            onChange={(e) => setComboPickAtomId(e.target.value)}
                            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
                                  className="inline-flex items-center gap-0.5 rounded-md border border-violet-200 bg-white px-1.5 py-1 text-[11px] dark:border-violet-800 dark:bg-slate-900"
                                >
                                  <span className="max-w-[140px] truncate" title={label}>
                                    {label}
                                  </span>
                                  <button
                                    type="button"
                                    className="rounded px-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
                                    className="rounded px-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
            Историческая модель эталона
          </h2>
          <p className="mt-2 text-sm leading-snug text-slate-600">
            {isYoungHistoricalPreview
              ? 'Сравнение текущих параметров с ближайшим эталоном по весу из группы 13–14 лет'
              : 'Сравнение с усреднённым эталоном в возрастной и весовой категории'}
          </p>
          {isYoungHistoricalPreview ? (
            <div
              className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm leading-snug text-violet-950"
              role="note"
            >
              <p>
                Спортсмену{' '}
                <span className="font-semibold tabular-nums">
                  {Number.isFinite(historicalAthleteAge) ? historicalAthleteAge : '—'} лет
                </span>
                : эталон подобран по ближайшей весовой категории для возраста{' '}
                <span className="font-semibold">13–14</span>, чтобы было видно, сколько ещё «до выхода» на
                этот ориентир по росту и размаху.
              </p>
              <p className="mt-1.5 text-xs text-violet-900/90">
                К участию в календарных соревнованиях допускаются спортсмены от 13 лет.
              </p>
            </div>
          ) : null}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-white px-2 py-3 sm:px-4 sm:py-4">
              <div className="flex flex-col gap-3">
                <div className="order-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 sm:py-3 md:order-2">
                <StandardDuelSilhouettes
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
                <div className="order-2 grid gap-2 sm:gap-3 md:order-1 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 md:hidden">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Паспорт эталона</p>
                    <p className="mt-1 text-xs text-slate-700">
                      Весовая: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardWeightCategory} кг</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Возрастная: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardAgeGroup}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Архетип эталона: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardArchetype}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      Рост: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceHeight || '—'} см</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Размах: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceReach || '—'} см</span>
                    </p>
                  </div>
                  <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 md:block">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Паспорт эталона</p>
                    <p className="mt-1 text-xs text-slate-700">
                      Весовая: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardWeightCategory} кг</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Возрастная: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardAgeGroup}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Архетип эталона: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardArchetype}</span>
                    </p>
                  </div>
                  <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 md:block">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Эталонные параметры</p>
                    <p className="mt-1 text-xs text-slate-700">
                      Рост: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceHeight || '—'} см</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Размах: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceReach || '—'} см</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 sm:px-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Рекомендация для спортсмена</p>
                    <p className="mt-1 text-sm font-semibold text-blue-700">{tacticDistanceDisplay || '—'}</p>
                    <p className="text-[11px] text-slate-600">Эффективная дистанция боя</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {weights.tacticMode === 'infighter' && weights.tacticAdvice && (
            <div
              className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-900 sm:px-4 sm:py-3"
              role="alert"
            >
              {weights.tacticAdvice}
            </div>
          )}
          {weights.tacticMode === 'outfighter' && weights.tacticAdvice && (
            <div
              className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-900 sm:px-4 sm:py-3"
              role="status"
            >
              {weights.tacticAdvice}
            </div>
          )}
          <div className="mt-4 sm:mt-6">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-5 sm:py-4">
              <BiometricPotentialBar kspPercent={kspPercent} basePercent={basePercent} />
            </div>
          </div>
        </section>

        {normsError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {normsError}
          </div>
        )}

        <MotorQualityWorkLogPanel workLog={student?.motorQualityWorkLog ?? safeStudent?.motorQualityWorkLog} />

        <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold leading-snug text-slate-900 sm:text-lg">
            Сенситивные периоды
          </h2>
          <div className="mt-2 sm:mt-4">
            <SensitivePeriodTimer
              birthYear={resolvedBirthYear}
              birthDate={resolvedBirthDate}
            />
          </div>
        </section>

      </div>
    </main>
  )
}

export default StudentPage
