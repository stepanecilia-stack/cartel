import { mergeAtomReinforcementRecords } from './atomReinforcement.js'
import { dominanceRank, normalizeTechnicalDominanceKey } from './ksrUtils.js'
import { migrateStudentTests } from './normsCategory.js'
import { emptyTestsRecord } from './normTestsStorage.js'
import { normalizeMotorQualityWorkLog } from './motorQualityWorkLog.js'
import {
  normalizeSeasonBlocks,
  normalizeSeasonCheckpoints,
} from './seasonPlan.js'
import { buildStudentTestsUpdatePayload } from './studentNormUpdate.js'
import { normalizeTechnicalDataForSave } from './studentTechnicalUpdate.js'
import {
  mergeWithRequiredLevel3Combinations,
  normalizeTechnicalCombinations,
} from './techniqueCatalog.js'

function instantToMs(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'string') {
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : 0
  }
  if (typeof value?.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000
  }
  return 0
}

function pickFirstDefined(...values) {
  for (const v of values) {
    if (v === null || v === undefined) continue
    if (typeof v === 'string' && !v.trim()) continue
    return v
  }
  return undefined
}

function pickBetterNormRow(a, b) {
  if (!a || typeof a !== 'object') return b
  if (!b || typeof b !== 'object') return a
  const scoreA = Number(a.normalizedScore)
  const scoreB = Number(b.normalizedScore)
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB) && scoreB > scoreA) return b
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB) && scoreA > scoreB) return a
  if (Number.isFinite(scoreB) && !Number.isFinite(scoreA)) return b
  if (Number.isFinite(scoreA) && !Number.isFinite(scoreB)) return a
  const tA = instantToMs(a.acceptedAt ?? a.recordedAt ?? a.updatedAt)
  const tB = instantToMs(b.acceptedAt ?? b.recordedAt ?? b.updatedAt)
  return tB > tA ? b : a
}

function mergePhysicalTestBuckets(...sources) {
  const out = {}
  for (const src of sources) {
    const bucket = emptyTestsRecord(src)
    for (const [testId, row] of Object.entries(bucket)) {
      out[testId] = pickBetterNormRow(out[testId], row)
    }
  }
  return out
}

function mergeTechnicalDataRecords(...sources) {
  const out = {}
  for (const raw of sources) {
    const data = normalizeTechnicalDataForSave(raw)
    for (const [id, row] of Object.entries(data)) {
      const prev = out[id]
      if (!prev || dominanceRank(row.level) > dominanceRank(prev.level)) {
        out[id] = { ...prev, ...row, level: normalizeTechnicalDominanceKey(row.level) }
      }
    }
  }
  return out
}

function mergeTechnicalCombinationsLists(...sources) {
  const byId = new Map()
  for (const raw of sources) {
    const list = normalizeTechnicalCombinations(mergeWithRequiredLevel3Combinations(raw))
    for (const combo of list) {
      const prev = byId.get(combo.id)
      if (!prev || (combo.steps?.length ?? 0) >= (prev.steps?.length ?? 0)) {
        byId.set(combo.id, combo)
      }
    }
  }
  return [...byId.values()]
}

function mergeMotorQualityWorkLogs(...sources) {
  const merged = {}
  for (const raw of sources) {
    const norm = normalizeMotorQualityWorkLog(raw)
    for (const [slug, entries] of Object.entries(norm)) {
      const byId = new Map((merged[slug] || []).map((e) => [e.id, e]))
      for (const e of entries) byId.set(e.id, e)
      merged[slug] = [...byId.values()].sort(
        (a, b) => instantToMs(a.completedAt) - instantToMs(b.completedAt),
      )
    }
  }
  return merged
}

function mergeArrayUnique(itemsList, keyFn) {
  const map = new Map()
  for (const items of itemsList) {
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const key = keyFn(item)
      if (key) map.set(key, item)
    }
  }
  return [...map.values()]
}

/** Все uid тренеров, привязанных к карточке. */
export function collectStudentCoachIds(student) {
  const set = new Set()
  if (!student || typeof student !== 'object') return []
  if (student.coachId) set.add(student.coachId)
  if (Array.isArray(student.coach_ids)) {
    for (const id of student.coach_ids) {
      if (typeof id === 'string' && id) set.add(id)
    }
  }
  if (Array.isArray(student.coachIds)) {
    for (const id of student.coachIds) {
      if (typeof id === 'string' && id) set.add(id)
    }
  }
  return [...set]
}

const PROFILE_SCALAR_KEYS = [
  'name',
  'fullName',
  'firstName',
  'lastName',
  'gender',
  'birthYear',
  'birthYearLabel',
  'birthDate',
  'height',
  'reach',
  'weight',
  'photoURL',
  'avatarUrl',
  'photo',
  'notes',
  'competitionDate',
  'competitionTitle',
  'seasonGoal',
  'nextSeasonGoal',
  'cartelStage',
  'cartelStageNote',
  'cartelEarlyAccess',
  'seasonCalendarCustomized',
  'ladderClosed',
  'seasonTasksSessionsPerWeek',
  'progressShareToken',
]

const ARRAY_MERGE_KEYS = [
  'plannedCompetitions',
  'seasonTasks',
  'seasonBlocks',
  'seasonCheckpoints',
]

/**
 * Собрать обновление основной карточки из дубликатов.
 * @param {object} primary
 * @param {object[]} secondaries
 * @param {{ allNorms?: object[], technicalAtoms?: object[] }} [opts]
 */
export function buildMergedStudentUpdate(primary, secondaries, opts = {}) {
  const all = [primary, ...secondaries.filter(Boolean)]
  const sources = all.map((s) => (s && typeof s === 'object' ? s : {}))

  const coachIdSet = new Set()
  for (const s of sources) {
    for (const id of collectStudentCoachIds(s)) coachIdSet.add(id)
  }
  const coach_ids = [...coachIdSet]
  const coachId = primary?.coachId && coachIdSet.has(primary.coachId) ? primary.coachId : coach_ids[0]

  const mergedScalars = {}
  for (const key of PROFILE_SCALAR_KEYS) {
    const val = pickFirstDefined(...sources.map((s) => s[key]))
    if (val !== undefined) mergedScalars[key] = val
  }

  if (!mergedScalars.short_id && primary?.short_id) {
    mergedScalars.short_id = primary.short_id
  }

  const physicalMerged = mergePhysicalTestBuckets(
    ...sources.map((s) => migrateStudentTests(s.tests).physical),
  )

  const technicalData = mergeTechnicalDataRecords(...sources.map((s) => s.technicalData))
  const atomReinforcement = mergeAtomReinforcementRecords(
    ...sources.map((s) => s.atomReinforcement),
  )
  const technicalCombinations = mergeTechnicalCombinationsLists(
    ...sources.map((s) => s.technicalCombinations),
  )
  const motorQualityWorkLog = mergeMotorQualityWorkLogs(
    ...sources.map((s) => s.motorQualityWorkLog),
  )

  const cartelDocuments = { ...sources[0]?.cartelDocuments }
  for (const s of sources.slice(1)) {
    if (s.cartelDocuments && typeof s.cartelDocuments === 'object') {
      Object.assign(cartelDocuments, s.cartelDocuments)
    }
  }

  const arrayFields = {}
  for (const key of ARRAY_MERGE_KEYS) {
    const merged = mergeArrayUnique(
      sources.map((s) => s[key]),
      (item) => String(item.id ?? item.dateISO ?? item.title ?? JSON.stringify(item)),
    )
    if (merged.length) arrayFields[key] = merged
  }

  if (arrayFields.seasonBlocks) {
    arrayFields.seasonBlocks = normalizeSeasonBlocks(arrayFields.seasonBlocks)
  }
  if (arrayFields.seasonCheckpoints) {
    arrayFields.seasonCheckpoints = normalizeSeasonCheckpoints(arrayFields.seasonCheckpoints)
  }

  const mergedFromStudentIds = [
    ...new Set([
      ...(Array.isArray(primary?.mergedFromStudentIds) ? primary.mergedFromStudentIds : []),
      ...secondaries.map((s) => s?.id).filter(Boolean),
    ]),
  ]

  const baseStudent = {
    ...mergedScalars,
    coachId,
    coach_ids,
    technicalData,
    atomReinforcement,
    technicalCombinations,
    motorQualityWorkLog,
    cartelDocuments,
    ...arrayFields,
    mergedFromStudentIds,
    mergedAt: new Date().toISOString(),
  }

  if (Array.isArray(opts.allNorms) && Array.isArray(opts.technicalAtoms) && opts.technicalAtoms.length) {
    const recalc = buildStudentTestsUpdatePayload({
      student: { ...primary, ...baseStudent },
      allNorms: opts.allNorms,
      technicalAtoms: opts.technicalAtoms,
      physicalMerged,
      functionalMerged: {},
    })
    return { ...baseStudent, ...recalc }
  }

  return {
    ...baseStudent,
    tests: { physical: physicalMerged, functional: {} },
  }
}

/**
 * Краткое описание слияния для превью.
 */
export function summarizeMergePlan(primary, secondaries) {
  const names = secondaries.map((s) => s?.name || s?.fullName || s?.id || '?').filter(Boolean)
  return {
    primaryName: primary?.name || primary?.fullName || primary?.id,
    secondaryCount: secondaries.length,
    secondaryNames: names,
    coachCount: new Set(
      [primary, ...secondaries].flatMap((s) => collectStudentCoachIds(s)),
    ).size,
  }
}
