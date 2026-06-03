import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { resolveProgramLevel2Atoms } from '../utils/technicalProgramAtomsResolved.js'
import { applyProgressSliderToTechnicalData } from '../utils/studentTechnicalUpdate.js'
import {
  buildFullTechnicalProgramAtoms,
  normalizeTechnicalCombinations,
  buildAtomLookupById,
  mergeWithRequiredLevel3Combinations,
  isRequiredLevel3ComboId,
} from '../utils/techniqueCatalog.js'
import { applyNormRawInput } from '../utils/normTestsStorage.js'
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
import { buildShareSeasonSnapshot } from '../utils/shareSeasonSnapshot.js'
import { useOrientirParticipation } from '../hooks/useOrientirParticipation.js'
import {
  applyOrientirParticipations,
  mergeOrientirExternalCamps,
  participationByOrientirId,
} from '../utils/orientirParticipation.js'
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
import StudentAnthropometryForm from '../components/student/StudentAnthropometryForm.jsx'
import StudentSeasonPanel from '../components/student/StudentSeasonPanel.jsx'
import {
  normalizeSeasonBlocks,
  normalizeSeasonCheckpoints,
} from '../utils/seasonPlan.js'
import { normalizeCartelStage } from '../data/cartelParticipation.js'
import { computeTechniqueLeaderboardMetrics } from '../utils/leaderboardMetrics.js'
import { useCoachEvents } from '../hooks/useCoachEvents.js'
import {
  calendarItemsForStudent,
  mergeCalendarWithOrientirs,
} from '../utils/coachEvents.js'
import {
  pickNearestFutureCompetition,
  resolveTypicalSeasonCalendar,
} from '../utils/plannedCompetitions.js'
import StudentNormsSection from '../components/student/StudentNormsSection.jsx'
import StudentPortalAccessPanel from '../components/student/StudentPortalAccessPanel.jsx'
import StudentTechnicalTab from '../components/student/StudentTechnicalTab.jsx'
import { normalizeAtomReinforcement } from '../utils/atomReinforcement.js'
import { daysUntilCompetition } from '../utils/competitionDate.js'
import { getTechnicalProgramAtomsCache, subscribeTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import BiometricPotentialBar from '../components/BiometricPotentialBar'
import StandardDuelSilhouettes, { referenceWeightFromStandardRow } from '../components/StandardDuelSilhouettes'
import { migrateStudentTests } from '../utils/normsCategory.js'
import { getSensitiveMotorQualities } from '../utils/sensitivePeriods'
import SensitivePeriodTimer from '../components/SensitivePeriodTimer'
import MotorQualityWorkLogPanel from '../components/MotorQualityWorkLogPanel'


const TAB_ITEMS = [
  { id: 'competition', label: 'Сезон и старты', shortLabel: 'Сезон' },
  { id: 'technical', label: 'Техника', shortLabel: 'Техника' },
  { id: 'physical', label: 'Физическое развитие', shortLabel: 'Физика' },
  { id: 'anthropometry', label: 'Карта спортсмена', shortLabel: 'Карта' },
]

const TAB_PROGRESS_LABELS = {
  physical: 'Физика',
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

/** Слияние сохранённых tests.functional в physical перед записью в Firestore. */
function mergePhysicalTestsDraft(freshStudent, physicalDraft) {
  const migrated = migrateStudentTests(freshStudent?.tests)
  return {
    ...migrated.physical,
    ...emptyTestsRecord(physicalDraft),
  }
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

  const [activeTab, setActiveTab] = useState('competition')

  useEffect(() => {
    if (activeTab === 'functional') setActiveTab('physical')
  }, [activeTab])
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
  const [techniqueSliderSaveStatus, setTechniqueSliderSaveStatus] = useState(
    /** @type {'idle' | 'saving' | 'saved' | 'error'} */ ('idle'),
  )
  const techniqueSliderDebounceRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const pendingTechniqueTiersRef = useRef(/** @type {{ l1: number, l2: number, l3: number } | null} */ (null))
  const [copyIdFlash, setCopyIdFlash] = useState(false)
  const [shortIdAssignError, setShortIdAssignError] = useState('')
  const [shareFlash, setShareFlash] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [seasonPlanSaveBusy, setSeasonPlanSaveBusy] = useState(false)
  const [seasonPlanSaveError, setSeasonPlanSaveError] = useState('')
  const [cartelStageSaveBusy, setCartelStageSaveBusy] = useState(false)
  const coachId = getCurrentCoachId()
  const { events: coachEvents } = useCoachEvents(coachId)
  const { participations: orientirParticipations } = useOrientirParticipation(coachId)
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
    setPhysicalResults(migrateStudentTests(tests).physical)
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
        functionalNorms: [],
        physicalResults,
        functionalResults: {},
        technicalData,
        technicalProgramAtoms: programAtomsFull,
      }),
    [physicalNorms, physicalResults, technicalData, programAtomsFull],
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
      ? { ...testsExact.physical, ...testsExact.functional }
      : mergePhysicalTestsDraft(student, physicalResults)
    const technicalMerged = {
      ...emptyTechnicalRecord(student?.technicalData),
      ...technicalData,
    }

    const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
    const w = Number(anthropometry.weight) || 0
    const seasonSnapshot = buildShareSeasonSnapshot({
      studentId: student?.id,
      calendarItems: studentCalendarItems,
      seasonBlocks: student?.seasonBlocks,
      seasonCheckpoints: student?.seasonCheckpoints,
      daysUntilFight,
      ageInt: sensitivePeriods.ageInt,
      student,
      physicalTests: physicalMerged,
      athlete: athleteForNorms,
      kd: kdBundle.kd,
      techniquePercent: tabProgress.technical ?? 0,
      atomsAtSkill: techniqueLeaderboard?.atomsAtSkill ?? 0,
      totalAtoms: techniqueLeaderboard?.totalAtoms ?? atomsForShare.length,
      effectiveKsr: effectiveKSR,
    })

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
      functionalResults: {},
      technicalAtoms: atomsForShare,
      technicalData: technicalMerged,
      season: seasonSnapshot,
      etalonExtras: {
        kspPercent,
        basePercent,
        tacticDistanceDisplay,
        tacticMode: weights.tacticMode ?? '',
        tacticAdvice: weights.tacticAdvice ?? '',
        isYoungHistoricalPreview,
        historicalReferenceLabel,
        referenceHeight,
        referenceReach,
        referenceWeightKg,
      },
      motorQualityWorkLog: student?.motorQualityWorkLog ?? null,
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
      value: Math.round((weights.P + weights.F) * 100),
    },
  ]
  const maxInfluenceValue = Math.max(...influenceItems.map((item) => item.value))
  const dominantInfluenceKeys = influenceItems
    .filter((item) => item.value === maxInfluenceValue && maxInfluenceValue > 0)
    .map((item) => item.key)
  const tabIdToInfluenceKey = {
    physical: 'physical',
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
      technical: Math.max(0, Math.min(100, technicalPercent)),
    }
  }, [physicalNorms, physicalResults, programAtomsFull, technicalData])

  const progressColorClass = (value) => {
    if (value <= 30) return 'bg-red-500'
    if (value <= 70) return 'bg-amber-400'
    return 'bg-emerald-500'
  }

  const updateNormResult = useCallback((category, norm, rawValue) => {
    const set = setPhysicalResults
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      set((prev) => removeNormValueByTestId(prev, norm.testId))
      return
    }
    const row = applyNormRawInput(norm, rawValue)
    if (!row) return
    set((prev) => ({
      ...removeNormValueByTestId(prev, norm.testId),
      [norm.testId]: row,
    }))
  }, [])

  const buildStudentUpdatePayload = (
    physicalMerged,
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
      functionalNorms: [],
      physicalResults: physicalMerged,
      functionalResults: {},
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
        functional: {},
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
      const physicalMerged = mergePhysicalTestsDraft(fresh, physicalResults)
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
      const payload = buildStudentUpdatePayload(physicalMerged, weightHistory)
      await updateStudentData(student.id, payload, { section: STUDENT_UPDATE_SECTION.profile })
      setPhysicalResults(physicalMerged)
      setAnthropometrySaveOk(true)
      onStudentUpdated?.(payload)
      syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: {} })
    } catch (err) {
      console.error(err)
      setAnthropometrySaveError('Не удалось сохранить. Проверьте интернет и права доступа к базе данных.')
    } finally {
      setIsAnthropometrySaving(false)
    }
  }

  const handleSaveNormAcceptance = async (_category, norm) => {
    if (!student?.id) {
      setSaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    const coachId = getCurrentCoachId()
    if (!coachId) {
      setSaveError('Войдите в аккаунт тренера, чтобы зафиксировать норматив.')
      return
    }
    const localRow = getNormValueByTestId(physicalResults, norm.testId)
    if (!localRow || !Number.isFinite(localRow.result)) {
      setSaveError('Введите результат норматива перед сохранением.')
      return
    }
    const busyKey = `physical:${norm.testId}`
    setSaveError('')
    setSaveOk(false)
    setNormSavingKey(busyKey)
    try {
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setSaveError('Ученик не найден в базе.')
        return
      }
      const physicalMerged = mergePhysicalTestsDraft(fresh, physicalResults)
      const serverRow = getNormValueByTestId(physicalMerged, norm.testId)
      const coachName = await resolveCoachDisplayName(coachId)
      const evaluated = {
        result: localRow.result,
        resultRaw: localRow.resultRaw,
        normalizedScore: localRow.normalizedScore,
        status: localRow.status,
      }
      const entry = buildNormAcceptanceHistoryEntry({
        norm,
        category: 'physical',
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
      physicalMerged[norm.testId] = mergedRow

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

      const payload = buildStudentUpdatePayload(physicalMerged, weightHistory)
      await updateStudentData(student.id, payload, {
        section: normAcceptanceSectionLabel('physical', norm),
      })
      setPhysicalResults(physicalMerged)
      setSaveOk(true)
      onStudentUpdated?.(payload)
      syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: {} })
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

      const physicalMerged = mergePhysicalTestsDraft(fresh, physicalResults)

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
        weightHistory,
        technicalMerged,
        combinationsList,
      )
      await updateStudentData(student.id, payload, { section: STUDENT_UPDATE_SECTION.technique })
      setTechnicalData(technicalMerged)
      setTechnicalCombinations(mergeWithRequiredLevel3Combinations(combinationsList))
      setSaveOk(true)
      onStudentUpdated?.(payload)
      syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: {} })
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
  const handlePhysicalNormSave = useCallback(
    (norm) => handleSaveNormAcceptance('physical', norm),
    [handleSaveNormAcceptance],
  )

  const handleAnthropometryChange = useCallback((patch) => {
    setAnthropometry((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleComboLevelChange = useCallback((comboId, level) => {
    setTechnicalData((prev) => ({
      ...prev,
      [comboId]: { ...(prev[comboId] ?? {}), level },
    }))
  }, [])

  const handleSaveCombo = useCallback(
    (combo) =>
      handleSaveTechnicalAtom({
        id: combo.id,
        number: 'III',
        name: combo.name,
        embedUrl: '',
        howTo: '',
        whyHowTo: '',
        mistakes: '',
        whyMistakes: '',
      }),
    [handleSaveTechnicalAtom],
  )

  const handleOpenComboModal = useCallback(() => {
    setComboDraftName('')
    setComboDraftSteps([])
    setComboPickTier('1')
    setComboPickAtomId('')
    setComboModalOpen(true)
  }, [])

  const handleComboAddStep = useCallback(() => {
    if (!comboPickAtomId) return
    setComboDraftSteps((s) => [...s, comboPickAtomId])
  }, [comboPickAtomId])

  const handleComboMoveStep = useCallback((index, direction) => {
    setComboDraftSteps((s) => {
      if (direction === 'up') {
        if (index === 0) return s
        const c = [...s]
        ;[c[index - 1], c[index]] = [c[index], c[index - 1]]
        return c
      }
      if (index >= s.length - 1) return s
      const c = [...s]
      ;[c[index + 1], c[index]] = [c[index], c[index + 1]]
      return c
    })
  }, [])

  const handleComboRemoveStep = useCallback((index) => {
    setComboDraftSteps((s) => s.filter((_, i) => i !== index))
  }, [])

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

  const technicalCombosSectionProps = useMemo(
    () => ({
      combinations: technicalCombinationsResolved,
      atomByIdLookup,
      technicalData,
      technicalSavingKey,
      canSave: Boolean(student?.id),
      onLevelChange: handleComboLevelChange,
      onSaveCombo: handleSaveCombo,
      onDeleteCombo: handleDeleteCombination,
      onOpenCreateModal: handleOpenComboModal,
      modalOpen: comboModalOpen,
      onCloseModal: () => setComboModalOpen(false),
      draftName: comboDraftName,
      onDraftNameChange: setComboDraftName,
      draftSteps: comboDraftSteps,
      pickTier: comboPickTier,
      onPickTierChange: setComboPickTier,
      pickAtomId: comboPickAtomId,
      onPickAtomIdChange: setComboPickAtomId,
      pickOptions: comboPickOptions,
      onAddStep: handleComboAddStep,
      onMoveStep: handleComboMoveStep,
      onRemoveStep: handleComboRemoveStep,
      onConfirmCreate: handleConfirmNewCombination,
      createBusy: Boolean(technicalSavingKey),
    }),
    [
      technicalCombinationsResolved,
      atomByIdLookup,
      technicalData,
      technicalSavingKey,
      student?.id,
      handleComboLevelChange,
      handleSaveCombo,
      handleDeleteCombination,
      handleOpenComboModal,
      comboModalOpen,
      comboDraftName,
      comboDraftSteps,
      comboPickTier,
      comboPickAtomId,
      comboPickOptions,
      handleComboAddStep,
      handleComboMoveStep,
      handleComboRemoveStep,
      handleConfirmNewCombination,
    ],
  )

  const orderedTechnicalAtoms = useMemo(() => orderTechnicalAtomsForProgram(technicalAtoms), [technicalAtoms])

  const level2Atoms = useMemo(
    () => resolveProgramLevel2Atoms(programAtomsCache.level2),
    [programAtomsCache.level2],
  )

  const technicalLocksById = useMemo(
    () => buildTechnicalLocksById(orderedTechnicalAtoms, technicalData),
    [orderedTechnicalAtoms, technicalData],
  )

  const atomReinforcement = useMemo(
    () => normalizeAtomReinforcement(student?.atomReinforcement),
    [student?.atomReinforcement],
  )

  const commitTechniqueProgressSlider = useCallback(
    async (tiers) => {
      if (!student?.id) return
      const l3Atoms = technicalCombinationsResolved.map((c) => ({ id: c.id }))
      let nextTechnical = applyProgressSliderToTechnicalData(orderedTechnicalAtoms, technicalData, tiers.l1)
      nextTechnical = applyProgressSliderToTechnicalData(level2Atoms, nextTechnical, tiers.l2)
      nextTechnical = applyProgressSliderToTechnicalData(l3Atoms, nextTechnical, tiers.l3)
      setTechniqueSliderSaveStatus('saving')
      const ok = await persistTechnicalBundle('technical:slider', nextTechnical, technicalCombinations)
      setTechniqueSliderSaveStatus(ok ? 'saved' : 'error')
    },
    [
      student?.id,
      technicalCombinationsResolved,
      orderedTechnicalAtoms,
      technicalData,
      level2Atoms,
      technicalCombinations,
    ],
  )

  const handleTechniqueProgressSlider = useCallback(
    (tiers) => {
      pendingTechniqueTiersRef.current = tiers
      setTechniqueSliderSaveStatus('saving')
      if (techniqueSliderDebounceRef.current) clearTimeout(techniqueSliderDebounceRef.current)
      techniqueSliderDebounceRef.current = setTimeout(() => {
        techniqueSliderDebounceRef.current = null
        const latest = pendingTechniqueTiersRef.current
        if (latest) void commitTechniqueProgressSlider(latest)
      }, 350)
    },
    [commitTechniqueProgressSlider],
  )

  useEffect(() => {
    return () => {
      if (techniqueSliderDebounceRef.current) {
        clearTimeout(techniqueSliderDebounceRef.current)
        const latest = pendingTechniqueTiersRef.current
        if (latest) void commitTechniqueProgressSlider(latest)
      }
    }
  }, [commitTechniqueProgressSlider])

  const studentOrientirs = useMemo(() => {
    const gender = anthropometry.gender === 'F' ? 'F' : 'M'
    return resolveTypicalSeasonCalendar(sensitivePeriods.ageInt, gender)
  }, [sensitivePeriods.ageInt, anthropometry.gender])

  const studentCalendarItems = useMemo(() => {
    const coachItems = calendarItemsForStudent(coachEvents, student?.id)
    const merged = mergeCalendarWithOrientirs(coachItems, studentOrientirs)
    const participationsByOrientir = participationByOrientirId(orientirParticipations)
    const withParticipants = applyOrientirParticipations(merged, participationsByOrientir)
    return mergeOrientirExternalCamps(withParticipants, orientirParticipations, {
      studentId: student?.id,
    })
  }, [coachEvents, student?.id, studentOrientirs, orientirParticipations])

  const nearestPlanned = useMemo(
    () => pickNearestFutureCompetition(studentCalendarItems),
    [studentCalendarItems],
  )

  const daysUntilFight = useMemo(
    () => (nearestPlanned ? daysUntilCompetition(nearestPlanned.dateISO) : null),
    [nearestPlanned],
  )

  const techniqueLeaderboard = useMemo(
    () =>
      student?.id && technicalAtoms.length
        ? computeTechniqueLeaderboardMetrics(student, technicalAtoms)
        : null,
    [student, technicalAtoms],
  )

  /** Нормативы из вкладки «Физика» + черновик — те же цифры, что в сводке и в Cartel. */
  const studentForCartel = useMemo(() => {
    if (!student) return student
    const physicalMerged = mergePhysicalTestsDraft(student, physicalResults)
    const prevTests = student.tests && typeof student.tests === 'object' ? student.tests : {}
    return {
      ...student,
      tests: {
        ...prevTests,
        physical: physicalMerged,
        functional: {},
      },
    }
  }, [student, physicalResults])

  const handleSaveCartelDocuments = useCallback(
    async (cartelDocuments) => {
      if (!student?.id) return
      setCartelStageSaveBusy(true)
      try {
        await updateStudentData(
          student.id,
          { cartelDocuments },
          { section: STUDENT_UPDATE_SECTION.competitionPrep },
        )
        onStudentUpdatedRef.current?.({ cartelDocuments })
      } catch (err) {
        console.error(err)
        throw err
      } finally {
        setCartelStageSaveBusy(false)
      }
    },
    [student?.id],
  )

  const handleCartelStageChange = useCallback(
    async (stage, opts = {}) => {
      if (!student?.id) return
      const cartelStage = normalizeCartelStage(stage)
      const patch = {
        cartelStage,
        cartelEarlyAccess: Boolean(opts.earlyAccess),
        cartelStageNote:
          typeof opts.note === 'string' && opts.note.trim() ? opts.note.trim() : '',
      }
      setCartelStageSaveBusy(true)
      try {
        await updateStudentData(student.id, patch, {
          section: STUDENT_UPDATE_SECTION.competitionPrep,
        })
        onStudentUpdatedRef.current?.(patch)
      } catch (err) {
        console.error(err)
        throw err
      } finally {
        setCartelStageSaveBusy(false)
      }
    },
    [student?.id],
  )

  const persistSeasonPlan = useCallback(
    async ({ blocks, checkpoints }) => {
      if (!student?.id) return false
      const patch = {
        seasonBlocks: normalizeSeasonBlocks(blocks),
        seasonCheckpoints: normalizeSeasonCheckpoints(checkpoints),
      }
      setSeasonPlanSaveBusy(true)
      setSeasonPlanSaveError('')
      try {
        await updateStudentData(student.id, patch, {
          section: STUDENT_UPDATE_SECTION.competitionPrep,
        })
        onStudentUpdatedRef.current?.(patch)
        return true
      } catch (err) {
        console.error(err)
        setSeasonPlanSaveError('Не удалось сохранить план сезона.')
        throw err
      } finally {
        setSeasonPlanSaveBusy(false)
      }
    },
    [student?.id],
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
                  {tab.id === 'competition' && daysUntilFight != null && daysUntilFight >= 0 ? (
                    <span
                      className={`text-[10px] font-medium tabular-nums leading-none ${
                        isActive ? 'text-[#818c99]' : 'text-[#aeb7c2]'
                      }`}
                    >
                      {daysUntilFight}д
                    </span>
                  ) : null}
                  {tab.id !== 'anthropometry' && tab.id !== 'competition' ? (
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
            {activeTab === 'competition' && (
              <StudentSeasonPanel
                coachId={coachId}
                studentId={student?.id}
                student={studentForCartel}
                studentName={safeStudent.name}
                ageInt={sensitivePeriods.ageInt}
                gender={anthropometry.gender === 'F' ? 'F' : 'M'}
                allNorms={allNorms}
                kd={kdBundle.kd}
                techniquePercent={tabProgress.technical ?? 0}
                atomsAtSkill={techniqueLeaderboard?.atomsAtSkill ?? 0}
                totalAtoms={techniqueLeaderboard?.totalAtoms ?? programAtomsFull.length}
                level1Atoms={technicalAtoms}
                effectiveKsr={effectiveKSR}
                seasonBlocks={student?.seasonBlocks}
                seasonCheckpoints={student?.seasonCheckpoints}
                onSaveSeasonPlan={persistSeasonPlan}
                onCartelStageChange={handleCartelStageChange}
                onSaveCartelDocuments={handleSaveCartelDocuments}
                onOpenTab={(tabId) => {
                  if (tabId === 'motor') {
                    window.location.assign('/qualities')
                    return
                  }
                  setActiveTab(tabId)
                }}
                planSaveBusy={seasonPlanSaveBusy}
                planSaveError={seasonPlanSaveError}
                stageSaveBusy={cartelStageSaveBusy}
              />
            )}

            {activeTab === 'anthropometry' && (
              <StudentAnthropometryForm
                anthropometry={anthropometry}
                onChange={handleAnthropometryChange}
                saveError={anthropometrySaveError}
                saveOk={anthropometrySaveOk}
                isSaving={isAnthropometrySaving}
                canSave={Boolean(student?.id)}
                onSave={handleSaveProfile}
              />
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

            {activeTab === 'technical' && (
              <>
              <StudentPortalAccessPanel
                student={student}
                onPortalChange={(patch) => onStudentUpdated?.(patch)}
              />
              <StudentTechnicalTab
                loadingNorms={loadingNorms}
                technicalAtomsCount={technicalAtoms.length}
                technicalTierTab={technicalTierTab}
                onTierTabChange={setTechnicalTierTab}
                combinationsCount={technicalCombinationsResolved.length}
                level1Atoms={orderedTechnicalAtoms}
                level2Atoms={level2Atoms}
                technicalData={technicalData}
                technicalLocksById={technicalLocksById}
                technicalSavingKey={technicalSavingKey}
                canSave={Boolean(student?.id)}
                onLevelChange={handleTechnicalLevelChange}
                onSaveAtom={handleSaveTechnicalAtom}
                combinations={technicalCombinationsResolved}
                sliderSaveStatus={techniqueSliderSaveStatus}
                onProgressSliderChange={handleTechniqueProgressSlider}
                combosProps={technicalCombosSectionProps}
                atomReinforcement={atomReinforcement}
              />
              </>
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
