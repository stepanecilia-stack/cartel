import { normalizeTechnicalDominanceKey, TECH_DOMINANCE_OPTIONS } from './ksrUtils.js'
import { computeAthleteAgeYears, displayNameFromStudent, studentAthleteShape } from './studentModel.js'
import { getSensitiveMotorQualities, orderSensitiveQualitiesForBoxing } from './sensitivePeriods.js'
import {
  buildTechnicalLocksById,
  normalizeStudentTechnicalData,
  orderTechnicalAtomsForProgram,
  resolveDashboardFocusAtom,
} from './technicalProgramProgress.js'
import { enqueueTechnicalPatch } from './voiceCoachOfflineQueue.js'
import { fuzzyTopAtoms, fuzzyTopLevels, fuzzyTopStudents } from './voiceCoachFuzzy.js'
import {
  needsAtomClarify,
  needsLevelClarify,
  needsStudentClarify,
} from './voiceCoachConfidence.js'

function emptyTechnicalRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue
    out[k] = { ...v, level: normalizeTechnicalDominanceKey(v.level) }
  }
  return out
}

function levelLabelRu(key) {
  return TECH_DOMINANCE_OPTIONS.find((o) => o.key === key)?.label ?? key
}

/**
 * @param {object} student
 * @param {object[]} technicalAtoms ordered not required — will order inside
 */
export function buildVoiceProgramSummary(student, technicalAtoms) {
  const name = displayNameFromStudent(student)
  const shaped = studentAthleteShape(student)
  const ageYears = computeAthleteAgeYears(shaped.birthYear)
  const sens = getSensitiveMotorQualities(ageYears)
  const ordered = orderTechnicalAtomsForProgram(technicalAtoms || [])
  const data = normalizeStudentTechnicalData(student?.technicalData)
  const locks = buildTechnicalLocksById(ordered, data)
  const focus = resolveDashboardFocusAtom(ordered, locks, data)
  const skill = focus.atom?.name || 'следующем шаге программы'
  let qualityLine = 'сенситивные качества по возрасту'
  if (sens.reason === 'no_birth_year') {
    qualityLine = 'укажите год рождения — тогда подберём сенситивные качества'
  } else if (sens.reason === 'below_table') {
    qualityLine = 'возраст младше таблицы сенситивных периодов'
  } else {
    const orderedQ = orderSensitiveQualitiesForBoxing(sens.qualities)
    const q1 = orderedQ[0]
    const q2 = orderedQ[1]
    if (q1 && q2) qualityLine = `${q1} и ${q2}`
    else if (q1) qualityLine = q1
  }
  const tts = `Программа для ${name} готова. Сегодня работаем над ${skill} и развиваем ${qualityLine}.`
  return { tts, skill, qualityLine, focusAtomId: focus.atom?.id ?? null }
}

/**
 * @typedef {{ studentId?: string, atomId?: string, levelKey?: string }} VoiceResolution
 */

/**
 * Один «ход»: распознавание слотов + либо выполнение, либо запрос уточнения.
 * @param {object} p
 * @param {object} p.intent
 * @param {string} p.transcript
 * @param {VoiceResolution} [p.resolution]
 * @param {object[]} p.students
 * @param {object[]} p.technicalAtoms
 * @param {import('fuse.js').default} p.studentFuse
 * @param {import('fuse.js').default} p.atomFuse
 * @param {import('fuse.js').default} p.levelFuse
 * @param {typeof import('../services/firebaseService.js').updateStudentData} p.updateStudentData
 * @param {typeof import('../services/firebaseService.js').getStudentById} p.getStudentById
 * @returns {Promise<
 *   | { kind: 'success'; tts: string; studentId?: string; queued?: boolean; confidence: object }
 *   | { kind: 'clarify'; transcript: string; intent: object; confidence: object; studentCandidates?: object[]; atomCandidates?: object[]; levelCandidates?: object[] }
 *   | { kind: 'error'; error: string; confidence?: object }
 * >}
 */
export async function runVoiceCoachTurn(p) {
  const {
    intent,
    transcript,
    resolution = {},
    students,
    technicalAtoms,
    studentFuse,
    atomFuse,
    levelFuse,
    updateStudentData,
    getStudentById,
  } = p

  const confidence = {}

  if (!intent || intent.type === 'unknown') {
    return {
      kind: 'error',
      error:
        'Команда не распознана. Пример: «Составь программу для Иван Петров» или «Ученик Иван освоил прямой в пузо на уровень умение».',
    }
  }

  let studentId = resolution.studentId
  if (!studentId) {
    const tops = fuzzyTopStudents(studentFuse, intent.student_query, 4)
    if (!tops.length) {
      return { kind: 'error', error: 'Ученик по имени не найден. Произнесите имя как в списке на дашборде.' }
    }
    const c1 = tops[0].confidence
    const c2 = tops[1]?.confidence
    confidence.student = c1
    if (needsStudentClarify(c1, c2)) {
      return {
        kind: 'clarify',
        transcript,
        intent,
        confidence,
        studentCandidates: tops.slice(0, 3),
      }
    }
    studentId = tops[0].id
  } else {
    confidence.student = 1
  }

  const student = students.find((s) => s.id === studentId)
  if (!student) {
    return { kind: 'error', error: 'Ученик не найден в текущем списке.', confidence }
  }
  const displayName = displayNameFromStudent(student)

  if (intent.type === 'generate_program') {
    const { tts } = buildVoiceProgramSummary(student, technicalAtoms)
    return {
      kind: 'success',
      tts,
      studentId: student.id,
      confidence: { ...confidence, student: confidence.student ?? 1 },
    }
  }

  if (intent.type === 'update_technical_level') {
    if (!technicalAtoms || technicalAtoms.length === 0) {
      return {
        kind: 'error',
        error: 'Элементы техники ещё загружаются — подождите секунду и повторите.',
        confidence,
      }
    }

    let atomId = resolution.atomId
    if (!atomId) {
      const tops = fuzzyTopAtoms(atomFuse, intent.skill_query, 4)
      if (!tops.length) {
        return {
          kind: 'error',
          error: 'Не сопоставил технику с программой. Повторите название элемента.',
          confidence,
        }
      }
      const c1 = tops[0].confidence
      const c2 = tops[1]?.confidence
      confidence.atom = c1
      if (needsAtomClarify(c1, c2)) {
        return {
          kind: 'clarify',
          transcript,
          intent,
          confidence,
          lockedStudentId: student.id,
          lockedStudentLabel: displayName,
          atomCandidates: tops.slice(0, 3),
        }
      }
      atomId = tops[0].id
    } else {
      confidence.atom = 1
    }

    const atomMeta = technicalAtoms.find((a) => a.id === atomId)
    const atomLabel = atomMeta?.name || 'элемент'

    let levelKey = resolution.levelKey
    if (!levelKey) {
      const tops = fuzzyTopLevels(levelFuse, intent.level_query, 4)
      if (!tops.length) {
        const fallback = normalizeTechnicalDominanceKey(intent.level_query)
        if (!fallback || fallback === 'NOT_LEARNED') {
          return {
            kind: 'error',
            error: 'Не распознан уровень. Скажите: знание, умение, навык или автоматизм.',
            confidence,
          }
        }
        levelKey = fallback
      } else {
        const c1 = tops[0].confidence
        const c2 = tops[1]?.confidence
        confidence.level = c1
        if (needsLevelClarify(c1, c2)) {
          return {
            kind: 'clarify',
            transcript,
            intent,
            confidence,
            lockedStudentId: student.id,
            lockedStudentLabel: displayName,
            lockedAtomId: atomId,
            lockedAtomLabel: atomLabel,
            levelCandidates: tops.slice(0, 4),
          }
        }
        levelKey = tops[0].key
      }
    } else {
      levelKey = normalizeTechnicalDominanceKey(levelKey)
      confidence.level = 1
    }

    let fresh = null
    try {
      fresh = await getStudentById(student.id)
      if (!fresh) {
        return { kind: 'error', error: 'Ученик не найден в базе.', confidence }
      }
      const serverTechnical = emptyTechnicalRecord(fresh.technicalData)
      const prev = serverTechnical[atomId] || {}
      const technicalMerged = {
        ...serverTechnical,
        [atomId]: {
          ...prev,
          level: levelKey,
        },
      }
      await updateStudentData(student.id, { technicalData: technicalMerged })
      const tts = `Принято. У ${displayName} теперь уровень «${levelLabelRu(levelKey)}» в элементе «${atomLabel}».`
      return {
        kind: 'success',
        tts,
        studentId: student.id,
        confidence: { ...confidence, student: confidence.student ?? 1, atom: confidence.atom ?? 1, level: confidence.level ?? 1 },
      }
    } catch {
      const base = fresh ? emptyTechnicalRecord(fresh.technicalData) : emptyTechnicalRecord(student.technicalData)
      const prev = base[atomId] || {}
      const technicalMergedFallback = {
        ...base,
        [atomId]: { ...prev, level: levelKey },
      }
      enqueueTechnicalPatch({
        studentId: student.id,
        technicalData: technicalMergedFallback,
        createdAt: new Date().toISOString(),
      })
      const tts = `Сеть недоступна: уровень «${levelLabelRu(levelKey)}» для «${atomLabel}» поставлен в очередь и сохранится при связи.`
      return {
        kind: 'success',
        tts,
        queued: true,
        studentId: student.id,
        confidence: { ...confidence, student: confidence.student ?? 1, atom: confidence.atom ?? 1, level: confidence.level ?? 1 },
      }
    }
  }

  return { kind: 'error', error: 'Неподдерживаемое действие.', confidence }
}

/** Совместимость: старый одношаговый вызов без уточнений */
export async function executeVoiceCoachAction(params) {
  const r = await runVoiceCoachTurn({
    intent: params.intent,
    transcript: '',
    resolution: {},
    students: params.students,
    technicalAtoms: params.technicalAtoms,
    studentFuse: params.studentFuse,
    atomFuse: params.atomFuse,
    levelFuse: params.levelFuse,
    updateStudentData: params.updateStudentData,
    getStudentById: params.getStudentById,
  })
  if (r.kind === 'success') {
    return { ok: true, tts: r.tts, studentId: r.studentId, queued: r.queued }
  }
  if (r.kind === 'error') {
    return { ok: false, error: r.error }
  }
  return { ok: false, error: 'Нужно уточнение — выберите вариант на экране.' }
}
