import { getFirestore } from 'firebase-admin/firestore'
import { escapeTelegramHtml, sendTelegramMessage } from './telegramApi.js'
import { menuExtra } from './telegramMenu.js'
import {
  displayName,
  getCoachStudents,
  getStudentById,
  loadLegacyNorms,
  updateTelegramSession,
} from './telegramCoachData.js'
import {
  findProgramAtomByMention,
  isStudentAttachedToCoach,
  normStatusLabelRu,
  saveStudentNormFromTelegram,
  saveStudentTechniqueFromTelegram,
  techniqueLevelLabel,
} from './cartelStudentWrite.js'
import {
  extractNormResultRaw,
  resolveNormForWriteRequest,
  resolvePhysicalNormForStudent,
} from './telegramNormResolve.js'
import { loadTechnicalProgramBundle } from './telegramTechnicalProgram.js'
import { matchStudentByMention, findAllStudentsInText } from './telegramRosterNames.js'
import { applyNormRawInput } from './telegramNormResults.js'
import { resolveTechniqueWriteRequest } from './telegramTechniqueResolve.js'

export function buildWriteConfirmKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Записать', callback_data: 'write:confirm' },
        { text: '✕ Отмена', callback_data: 'write:cancel' },
      ],
    ],
  }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} text
 * @param {Record<string, unknown>} [extra]
 */
async function sendWriteReply(token, chatId, text, extra = {}) {
  await sendTelegramMessage(token, chatId, text, {
    ...menuExtra(),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })
}

/**
 * @param {object[]} students
 * @param {string} mention
 */
function resolveStudent(students, mention) {
  const hit = matchStudentByMention(students, mention)
  return hit?.student ?? null
}

/**
 * @param {{ kind: 'norm' | 'technique', studentName?: string, normName?: string, resultRaw?: string, statusLabel?: string, atomLabel?: string, previousLevel?: string, level?: string }} pending
 */
export function formatWriteConfirmPreview(pending) {
  const lines = ['<b>📝 Подтвердите запись</b>', '']
  lines.push(`Ученик: <b>${escapeTelegramHtml(pending.studentName ?? '—')}</b>`)

  if (pending.kind === 'norm') {
    lines.push(`Норматив: ${escapeTelegramHtml(pending.normName ?? '—')}`)
    lines.push(`Результат: <b>${escapeTelegramHtml(pending.resultRaw ?? '—')}</b>`)
    if (pending.statusLabel) {
      lines.push(`Оценка: ${escapeTelegramHtml(pending.statusLabel)}`)
    }
  } else {
    lines.push(`Элемент: ${escapeTelegramHtml(pending.atomLabel ?? '—')}`)
    if (pending.previousLevel) {
      lines.push(
        `Было: ${escapeTelegramHtml(techniqueLevelLabel(pending.previousLevel))} → Станет: <b>${escapeTelegramHtml(techniqueLevelLabel(pending.level))}</b>`,
      )
    } else {
      lines.push(`Уровень: <b>${escapeTelegramHtml(techniqueLevelLabel(pending.level))}</b>`)
    }
  }

  lines.push('', 'Записать в Cartel?')
  return lines.join('\n')
}

/**
 * @param {string} coachId
 * @param {object} route
 * @param {object[]} students
 * @param {string} userText
 * @param {object | null | undefined} activeStudent
 */
export async function preparePendingWrite(coachId, route, students, userText = '', activeStudent = null) {
  let studentMention = route.student_names?.[0] ?? route.student_name ?? ''
  let student = studentMention ? resolveStudent(students, studentMention) : null
  if (!student && activeStudent) student = activeStudent
  if (!student) {
    const fromText = findAllStudentsInText(students, userText)
    if (fromText.length === 1) student = fromText[0]
  }
  if (!student) {
    return { ok: false, error: 'Не нашёл ученика. Назовите фамилию или выберите 👤 Ученики.' }
  }
  if (!isStudentAttachedToCoach(student, coachId)) {
    return { ok: false, error: 'Нет доступа к этому ученику.' }
  }

  if (route.intent === 'write_norm' || route.kind === 'norm') {
    const allNorms = await loadLegacyNorms()
    const normKey = route.norm_name ?? route.normName ?? route.test_name ?? userText ?? ''
    const norm = await resolveNormForWriteRequest(allNorms, student, userText, normKey)
    if (!norm) {
      return {
        ok: false,
        error: `Не нашёл такой норматив для ${displayName(student)}. Попробуйте: «отжимания 25» или «сгибание-разгибание рук 25».`,
      }
    }
    const resultRaw = String(
      route.result_value ?? route.result ?? extractNormResultRaw(userText) ?? '',
    ).trim()
    if (!resultRaw) {
      return {
        ok: false,
        error: `Норматив «${norm.testName}» понял. Скажите результат, например: «25» или «25 раз».`,
        partial: {
          kind: 'norm',
          studentId: student.id,
          studentName: displayName(student),
          normTestId: norm.testId,
          normName: norm.testName,
        },
      }
    }
    const parsed = applyNormRawInput(norm, resultRaw)
    if (!parsed || !Number.isFinite(parsed.result)) {
      return { ok: false, error: 'Не удалось разобрать результат. Пример: 25 или 4:30' }
    }

    return {
      ok: true,
      pending: {
        kind: 'norm',
        studentId: student.id,
        studentName: displayName(student),
        normTestId: norm.testId,
        normName: norm.testName,
        resultRaw: parsed.resultRaw ?? String(parsed.result),
        statusLabel: normStatusLabelRu(parsed.status),
      },
    }
  }

  if (route.intent === 'write_technique' || route.kind === 'technique') {
    const program = await loadTechnicalProgramBundle(getFirestore())
    const atomMention = route.element_name ?? route.atom_name ?? route.technique_element ?? ''
    const resolved = resolveTechniqueWriteRequest(student, program, userText, {
      elementName: atomMention,
      levelHint: route.level ?? route.level_name ?? route.reply ?? '',
    })
    if (!resolved.ok) {
      if (resolved.partial) {
        return {
          ok: false,
          error: resolved.error,
          partial: {
            ...resolved.partial,
            studentId: student.id,
            studentName: displayName(student),
          },
        }
      }
      return { ok: false, error: resolved.error }
    }

    const { atom, level, atomLabel } = resolved
    const prev = student.technicalData?.[atom.id]?.level

    return {
      ok: true,
      pending: {
        kind: 'technique',
        studentId: student.id,
        studentName: displayName(student),
        atomId: atom.id,
        atomLabel,
        level,
        previousLevel: prev ?? 'NOT_LEARNED',
      },
    }
  }

  return { ok: false, error: 'Неизвестный тип записи.' }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {object} route
 * @param {string} [userText]
 * @param {object | null | undefined} [activeStudent]
 */
export async function offerWriteConfirmation(token, chatId, coachId, route, userText = '', activeStudent = null) {
  const students = await getCoachStudents(coachId)
  const prepared = await preparePendingWrite(coachId, route, students, userText, activeStudent)
  if (!prepared.ok) {
    if (prepared.partial) {
      const draftKey =
        prepared.partial.kind === 'technique' ? 'pendingTechniqueDraft' : 'pendingNormDraft'
      await updateTelegramSession(coachId, { [draftKey]: prepared.partial })
    }
    await sendWriteReply(token, chatId, prepared.error ?? 'Не удалось подготовить запись.')
    return { handled: true }
  }

  await updateTelegramSession(coachId, {
    pendingAgentWrite: prepared.pending,
    pendingNormDraft: null,
    pendingTechniqueDraft: null,
  })
  const preview = formatWriteConfirmPreview(prepared.pending)
  await sendWriteReply(token, chatId, preview, {
    reply_markup: buildWriteConfirmKeyboard(),
  })
  return { handled: true, pending: prepared.pending }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {object | null | undefined} pending
 */
export async function executePendingWrite(token, chatId, coachId, pending) {
  if (!pending?.kind || !pending.studentId) {
    await sendWriteReply(token, chatId, 'Нет ожидающей записи. Сформулируйте запрос заново.')
    return { handled: true }
  }

  const student = await getStudentById(pending.studentId)
  if (!student || !isStudentAttachedToCoach(student, coachId)) {
    await updateTelegramSession(coachId, { pendingAgentWrite: null })
    await sendWriteReply(token, chatId, 'Ученик недоступен.')
    return { handled: true }
  }

  try {
    if (pending.kind === 'norm') {
      const allNorms = await loadLegacyNorms()
      const norm = resolvePhysicalNormForStudent(allNorms, student, pending.normTestId ?? pending.normName)
      if (!norm) throw new Error('Норматив не найден.')
      const result = await saveStudentNormFromTelegram(coachId, student, norm, pending.resultRaw)
      await updateTelegramSession(coachId, { pendingAgentWrite: null })
      await sendWriteReply(
        token,
        chatId,
        [
          '<b>✅ Записано</b>',
          '',
          `${escapeTelegramHtml(result.studentName)} — ${escapeTelegramHtml(result.normName)}`,
          `Результат: <b>${escapeTelegramHtml(result.resultDisplay)}</b> (${normStatusLabelRu(result.status)})`,
          '',
          '<i>Карточка обновлена в Cartel.</i>',
        ].join('\n'),
      )
      return { handled: true, reply: result }
    }

    if (pending.kind === 'technique') {
      const program = await loadTechnicalProgramBundle(getFirestore())
      const atom =
        [...program.level1, ...program.level2, ...program.level3].find((a) => a.id === pending.atomId) ??
        null
      if (!atom) throw new Error('Элемент программы не найден.')
      const result = await saveStudentTechniqueFromTelegram(coachId, student, atom, pending.level)
      await updateTelegramSession(coachId, { pendingAgentWrite: null })
      await sendWriteReply(
        token,
        chatId,
        [
          '<b>✅ Записано</b>',
          '',
          `${escapeTelegramHtml(result.studentName)} — ${escapeTelegramHtml(result.atomLabel)}`,
          `Уровень: <b>${escapeTelegramHtml(result.levelLabel)}</b>`,
          '',
          '<i>Карточка обновлена в Cartel.</i>',
        ].join('\n'),
      )
      return { handled: true, reply: result }
    }
  } catch (err) {
    console.error('executePendingWrite', err)
    await sendWriteReply(
      token,
      chatId,
      `Не удалось записать: ${escapeTelegramHtml(err instanceof Error ? err.message : String(err))}`,
    )
    return { handled: true }
  }

  return { handled: false }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 */
export async function cancelPendingWrite(token, chatId, coachId) {
  await updateTelegramSession(coachId, { pendingAgentWrite: null })
  await sendWriteReply(token, chatId, 'Запись отменена.')
  return { handled: true }
}

/** @param {string} text */
export function isWriteConfirmText(text) {
  return /^(?:да|yes|подтверждаю|подтвердить|запиши|записать|верно|ок|ok|\+)\s*$/i.test(
    String(text ?? '').trim(),
  )
}

/** @param {string} text */
export function isWriteCancelText(text) {
  return /^(?:нет|no|отмена|cancel|не надо|стоп)\s*$/i.test(String(text ?? '').trim())
}
