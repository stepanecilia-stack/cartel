import { migrateStudentTests } from './normsCategory.js'
import {
  normalizeSeasonBlocks,
  normalizeSeasonCheckpoints,
} from './seasonPlan.js'
import { normalizeBirthYearNumber } from './studentModel.js'

/**
 * @param {unknown} item
 */
function serializeCalendarItemForShare(item) {
  if (!item || typeof item !== 'object') return null
  const raw = /** @type {Record<string, unknown>} */ (item)
  const out = {
    id: String(raw.id ?? ''),
    dateISO: String(raw.dateISO ?? ''),
    title: String(raw.title ?? ''),
  }
  if (raw.dateEndISO) out.dateEndISO = String(raw.dateEndISO)
  if (raw.dateEnd) out.dateEndISO = String(raw.dateEndISO ?? raw.dateEnd)
  if (raw.track) out.track = String(raw.track)
  if (raw.stage) out.stage = raw.stage
  if (raw.dateStatus) out.dateStatus = raw.dateStatus
  if (raw.eventKind) out.eventKind = raw.eventKind
  if (raw.coachEventId) out.coachEventId = String(raw.coachEventId)
  if (raw.orientirId) out.orientirId = String(raw.orientirId)
  if (raw.planKind) out.planKind = String(raw.planKind)
  if (raw.checkpointKind) out.checkpointKind = String(raw.checkpointKind)
  if (raw.calendarOnly === true) out.calendarOnly = true
  if (raw.done === true) out.done = true
  if (Array.isArray(raw.participantIds)) {
    out.participantIds = raw.participantIds.filter((x) => typeof x === 'string')
  }
  if (raw.externalCamp && typeof raw.externalCamp === 'object') {
    const camp = /** @type {Record<string, unknown>} */ (raw.externalCamp)
    out.externalCamp = {
      title: typeof camp.title === 'string' ? camp.title : '',
      dateISO: typeof camp.dateISO === 'string' ? camp.dateISO : '',
      dateEndISO: typeof camp.dateEndISO === 'string' ? camp.dateEndISO : '',
      kind: typeof camp.kind === 'string' ? camp.kind : 'camp',
    }
  }
  return out.dateISO ? out : null
}

/**
 * @param {Array<unknown>} items
 */
export function serializeCalendarItemsForShare(items) {
  return (Array.isArray(items) ? items : [])
    .map(serializeCalendarItemForShare)
    .filter(Boolean)
}

/**
 * @param {{
 *   studentId?: string | null,
 *   calendarItems?: unknown[],
 *   seasonBlocks?: unknown[],
 *   seasonCheckpoints?: unknown[],
 *   daysUntilFight?: number | null,
 *   ageInt?: number | null,
 *   student?: Record<string, unknown> | null,
 *   physicalTests?: Record<string, unknown> | null,
 *   athlete?: { birthYear?: number, gender?: string, height?: number, reach?: number, weight?: number, birthDate?: string | null } | null,
 *   kd?: number,
 *   techniquePercent?: number,
 *   atomsAtSkill?: number,
 *   totalAtoms?: number,
 *   effectiveKsr?: number,
 * }} input
 */
export function buildShareSeasonSnapshot({
  studentId = null,
  calendarItems = [],
  seasonBlocks = [],
  seasonCheckpoints = [],
  daysUntilFight = null,
  ageInt = null,
  student = null,
  physicalTests = null,
  athlete = null,
  kd = 0.25,
  techniquePercent = 0,
  atomsAtSkill = 0,
  totalAtoms = 0,
  effectiveKsr = 0,
}) {
  const st = student && typeof student === 'object' ? student : {}
  const ath = athlete && typeof athlete === 'object' ? athlete : {}
  const physical =
    physicalTests && typeof physicalTests === 'object'
      ? physicalTests
      : migrateStudentTests(st.tests).physical

  const birthYear = normalizeBirthYearNumber(ath.birthYear ?? st.birthYear)
  const gender = ath.gender === 'F' || st.gender === 'F' ? 'F' : 'M'

  return {
    studentId: typeof studentId === 'string' && studentId ? studentId : null,
    calendarItems: serializeCalendarItemsForShare(calendarItems),
    seasonBlocks: normalizeSeasonBlocks(seasonBlocks),
    seasonCheckpoints: normalizeSeasonCheckpoints(seasonCheckpoints),
    daysUntilFight:
      daysUntilFight != null && Number.isFinite(Number(daysUntilFight)) && Number(daysUntilFight) >= 0
        ? Number(daysUntilFight)
        : null,
    ageInt: ageInt != null && Number.isFinite(Number(ageInt)) ? Number(ageInt) : null,
    student: {
      cartelStage: st.cartelStage ?? null,
      cartelDocuments: st.cartelDocuments ?? {},
      motorQualityWorkLog: st.motorQualityWorkLog ?? [],
      cartelStageNote: typeof st.cartelStageNote === 'string' ? st.cartelStageNote : '',
      cartelEarlyAccess: Boolean(st.cartelEarlyAccess),
      birthYear,
      gender,
      height: Number(ath.height ?? st.height) || 0,
      reach: Number(ath.reach ?? st.reach) || 0,
      weight: Number(ath.weight ?? st.weight) || 0,
      birthDate: typeof ath.birthDate === 'string' ? ath.birthDate : st.birthDate ?? null,
      tests: {
        physical,
        functional: {},
      },
    },
    metrics: {
      kd: Number(kd) || 0.25,
      techniquePercent: Number(techniquePercent) || 0,
      atomsAtSkill: Number(atomsAtSkill) || 0,
      totalAtoms: Number(totalAtoms) || 0,
      effectiveKsr: Number(effectiveKsr) || 0,
    },
  }
}
