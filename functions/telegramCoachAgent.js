import { getGroupTrainingSession, updateGroupTrainingRoster } from './groupTrainingSessionData.js'
import {
  appendTelegramChatMessage,
  displayName,
  getCoachStudents,
  getRecentTelegramChatMessages,
  updateTelegramSession,
} from './telegramCoachData.js'
import {
  findStudentMentionInText,
  formatPendingNorms,
  formatStudentSummary,
  getNormsCached,
} from './telegramCoachAssistant.js'
import { sendTelegramMessage, telegramApi } from './telegramApi.js'
import { menuExtra } from './telegramMenu.js'
import { applyRosterCommand } from './telegramRosterAi.js'
import { matchStudentsFromMentions } from './telegramRosterNames.js'
import {
  buildMuscleGroupPickerKeyboard,
  buildMuscleGroupPickerMessage,
  buildGroupTrainingStats,
  getMuscleGroup,
  recommendGroupExercise,
} from './telegramGroupExercises.js'
import {
  buildTrainingProgressKeyboard,
  endTrainingFromTelegram,
  formatGroupTechniqueSummary,
  sendComposeRosterReply,
} from './telegramGroupTraining.js'
import { resolveTrainingRoster, startGroupTrainingWithRoster } from './telegramTrainingRoster.js'
import {
  cancelPendingWrite,
  executePendingWrite,
  isWriteCancelText,
  isWriteConfirmText,
  offerWriteConfirmation,
} from './telegramWriteConfirm.js'
import {
  extractNormResultRaw,
  looksLikeNormMention,
  looksLikeNormWrite,
} from './telegramNormResolve.js'
import {
  isTechniqueAdvanceCommand,
  looksLikeTechniqueWrite,
  resolveTechniqueLevelForWrite,
} from './telegramTechniqueResolve.js'
import { generateGeminiReply } from './vertexGemini.js'

const CONFIDENCE_THRESHOLD = 0.48

const AGENT_SYSTEM = `Ты маршрутизатор команд тренера бокса в Telegram-боте Cartel.
Тренер пишет или говорит (STT) по-русски. Различай однофамильцев по имени и фамилии.

Ответь ТОЛЬКО JSON без markdown:
{
  "intent": "training_roster|training_start|training_end|training_exercises|group_technique|student_summary|student_norms|student_technique|write_norm|write_technique|confirm_write|cancel_write|list_students|select_student|help|cancel|clarify|chat",
  "student_names": [],
  "norm_name": "",
  "result_value": "",
  "element_name": "",
  "level": "",
  "roster_add": [],
  "roster_remove": [],
  "roster_only": [],
  "roster_set": [],
  "muscle_group": null,
  "start_training": false,
  "cancel": false,
  "use_active_student": true,
  "reply": "",
  "confidence": 0.9
}

intent:
- training_roster — состав/правка: назвать фамилии, убрать/добавить/оставить только
- training_start — явно начать тренировку с текущим составом
- training_end — завершить тренировку
- training_exercises — упражнение/разминка/физика (muscle_group: legs|core|spine|shoulders|forearms)
- group_technique — техника по текущей группе на тренировке
- student_summary — сводка по ученику
- student_norms — нормативы, что не сдано
- student_technique — техника, программа, шаг (только чтение)
- write_norm — записать результат норматива (norm_name, result_value, student_names). Синонимы: «отжимания» = «сгибание/разгибание рук в упоре лёжа»; «подтягивания» — из карточки ученика. Число из фразы клади в result_value.
- write_technique — записать этап техники (element_name, level). Этапы: знание, умение, навык, автомат/автоматизация. «Следующий этап», «дальше», «переход» без level → write_technique с level=умение. element_name можно не указывать — возьмётся текущий шаг программы ученика.
- confirm_write — подтвердить ожидающую запись (да, запиши, подтверждаю)
- cancel_write — отменить ожидающую запись
- list_students — список учеников
- select_student — выбрать ученика для обсуждения
- help — справка
- cancel — отмена
- clarify — только если реально непонятно; НЕ используй для отжиманий/подтягиваний с числом — это write_norm
- chat — общий вопрос по контексту; reply — краткий ответ по данным Cartel

Имена учеников — строго из списка. confidence 0..1.`

/**
 * @param {unknown} raw
 */
function parseAgentJson(raw) {
  const text = String(raw ?? '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

/**
 * @param {string} coachId
 * @param {Record<string, unknown>} session
 */
export async function buildCoachAgentContext(coachId, session) {
  const [students, gtSession, recentMessages, allNorms] = await Promise.all([
    getCoachStudents(coachId),
    getGroupTrainingSession(coachId),
    getRecentTelegramChatMessages(coachId, 10),
    getNormsCached(),
  ])

  const rosterIds =
    gtSession?.selectedIds?.length > 0
      ? gtSession.selectedIds
      : session?.pendingTrainingRoster?.confirmedIds ?? []

  const activeStudent = session?.activeStudentId
    ? students.find((s) => s.id === session.activeStudentId) ?? null
    : null

  return {
    coachId,
    students,
    allNorms,
    session,
    gtSession,
    activeStudent,
    rosterIds,
    rosterStudents: students.filter((s) => rosterIds.includes(s.id)),
    trainingActive: gtSession?.phase === 'progress' && rosterIds.length > 0,
    recentMessages,
  }
}

/**
 * @param {ReturnType<typeof buildCoachAgentContext> extends Promise<infer T> ? T : never} context
 * @param {string} text
 */
function buildRouterPrompt(context, text) {
  const studentLines = context.students.map((s) => `- ${displayName(s)}`).join('\n')
  const rosterLine = context.rosterStudents.length
    ? context.rosterStudents.map((s) => displayName(s)).join(', ')
    : 'пусто'
  const activeLine = context.activeStudent ? displayName(context.activeStudent) : 'не выбран'
  const history = context.recentMessages
    .slice(-6)
    .map((m) => `${m.role === 'assistant' ? 'Бот' : 'Тренер'}: ${String(m.content).slice(0, 300)}`)
    .join('\n')

  return [
    'Ученики:',
    studentLines || '(нет)',
    '',
    `Активный ученик: ${activeLine}`,
    `Состав тренировки: ${rosterLine}`,
    context.trainingActive ? 'Тренировка идёт.' : 'Тренировка не начата.',
    context.session?.pendingAgentWrite
      ? `Ожидает подтверждения запись: ${JSON.stringify(context.session.pendingAgentWrite)}`
      : '',
    context.session?.pendingTrainingRoster?.pendingFragments?.length
      ? `Ждём уточнения: ${context.session.pendingTrainingRoster.pendingFragments.join(', ')}`
      : '',
    '',
    history ? `Диалог:\n${history}\n` : '',
    `Сообщение тренера: ${text}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * @param {Awaited<ReturnType<typeof buildCoachAgentContext>>} context
 * @param {string} text
 */
export async function routeCoachIntent(context, text) {
  const userPrompt = buildRouterPrompt(context, text)
  const { text: raw } = await generateGeminiReply(AGENT_SYSTEM, userPrompt, {
    temperature: 0.15,
    maxOutputTokens: 500,
  })
  const parsed = parseAgentJson(raw)
  if (!parsed || typeof parsed !== 'object') return null

  return {
    intent: String(parsed.intent ?? 'unknown'),
    student_names: Array.isArray(parsed.student_names)
      ? parsed.student_names.map(String).filter(Boolean)
      : [],
    roster_add: Array.isArray(parsed.roster_add) ? parsed.roster_add.map(String).filter(Boolean) : [],
    roster_remove: Array.isArray(parsed.roster_remove)
      ? parsed.roster_remove.map(String).filter(Boolean)
      : [],
    roster_only: Array.isArray(parsed.roster_only) ? parsed.roster_only.map(String).filter(Boolean) : [],
    roster_set: Array.isArray(parsed.roster_set) ? parsed.roster_set.map(String).filter(Boolean) : [],
    norm_name: String(parsed.norm_name ?? '').trim(),
    result_value: String(parsed.result_value ?? '').trim(),
    element_name: String(parsed.element_name ?? '').trim(),
    level: String(parsed.level ?? '').trim(),
    muscle_group: parsed.muscle_group ? String(parsed.muscle_group) : null,
    start_training: Boolean(parsed.start_training),
    cancel: Boolean(parsed.cancel),
    use_active_student: parsed.use_active_student !== false,
    reply: String(parsed.reply ?? '').trim(),
    confidence: Number(parsed.confidence) || 0.5,
  }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} text
 * @param {Record<string, unknown>} [extra]
 */
async function sendAgentReply(token, chatId, text, extra = {}) {
  await sendTelegramMessage(token, chatId, text, {
    ...menuExtra(),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })
}

/**
 * @param {Awaited<ReturnType<typeof buildCoachAgentContext>>} context
 * @param {{ student_names?: string[], use_active_student?: boolean }} route
 * @param {string} [fallbackText]
 */
function resolveStudents(context, route, fallbackText = '') {
  if (route.student_names?.length) {
    const { matched, unmatched } = matchStudentsFromMentions(context.students, route.student_names)
    return { students: matched, unmatched }
  }
  if (route.use_active_student !== false && context.activeStudent) {
    return { students: [context.activeStudent], unmatched: [] }
  }
  const one = findStudentMentionInText(context.students, fallbackText)
  if (one) return { students: [one], unmatched: [] }
  return { students: [], unmatched: [] }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {Awaited<ReturnType<typeof buildCoachAgentContext>>} context
 * @param {NonNullable<Awaited<ReturnType<typeof routeCoachIntent>>>} route
 * @param {string} userText
 */
async function executeRosterTool(token, chatId, coachId, context, route, userText) {
  let currentIds = [...context.rosterIds]

  if (route.roster_set.length) {
    const applied = applyRosterCommand(context.students, currentIds, {
      set: route.roster_set,
      start: route.start_training,
      cancel: false,
    })
    currentIds = applied.confirmedIds
    if (applied.pendingFragments.length) {
      await updateTelegramSession(coachId, {
        pendingTrainingRoster: {
          confirmedIds: currentIds,
          pendingFragments: applied.pendingFragments,
          awaitingNames: false,
        },
      })
      await sendComposeRosterReply(token, chatId, coachId, {
        confirmedIds: currentIds,
        pendingFragments: applied.pendingFragments,
      })
      return { handled: true }
    }
  } else if (
    route.roster_add.length ||
    route.roster_remove.length ||
    route.roster_only.length ||
    route.cancel
  ) {
    const applied = applyRosterCommand(context.students, currentIds, {
      add: route.roster_add,
      remove: route.roster_remove,
      only: route.roster_only,
      start: route.start_training,
      cancel: route.cancel,
    })
    currentIds = applied.confirmedIds
    if (applied.pendingFragments.length) {
      await persistRoster(coachId, currentIds, applied.pendingFragments, context.gtSession)
      await sendComposeRosterReply(token, chatId, coachId, {
        confirmedIds: currentIds,
        pendingFragments: applied.pendingFragments,
        meta: {
          removedNames: applied.removedNames,
          addedNames: applied.addedNames,
        },
      })
      return { handled: true }
    }
  } else if (route.student_names.length || userText) {
    const resolved = resolveTrainingRoster(context.students, userText, {
      confirmedIds: currentIds,
      pendingFragments: context.session?.pendingTrainingRoster?.pendingFragments ?? [],
    })
    currentIds = resolved.confirmedIds
    if (resolved.pendingFragments.length) {
      await persistRoster(coachId, currentIds, resolved.pendingFragments, context.gtSession)
      await sendComposeRosterReply(token, chatId, coachId, {
        confirmedIds: currentIds,
        pendingFragments: resolved.pendingFragments,
      })
      return { handled: true }
    }
  }

  if (currentIds.length === 0) {
    await updateTelegramSession(coachId, {
      pendingTrainingRoster: { confirmedIds: [], pendingFragments: [], awaitingNames: true },
    })
    await sendComposeRosterReply(token, chatId, coachId, { confirmedIds: [], pendingFragments: [] })
    return { handled: true }
  }

  await persistRoster(coachId, currentIds, [], context.gtSession)
  await updateTelegramSession(coachId, { pendingTrainingRoster: null })

  const shouldStart = route.start_training || route.intent === 'training_start'

  if (shouldStart && currentIds.length > 0) {
    await startGroupTrainingWithRoster(token, chatId, coachId, currentIds, context.trainingActive)
    return { handled: true }
  }

  await sendComposeRosterReply(token, chatId, coachId, {
    confirmedIds: currentIds,
    pendingFragments: [],
  })
  return { handled: true }
}

/**
 * @param {string} coachId
 * @param {string[]} confirmedIds
 * @param {string[]} pendingFragments
 * @param {object | null} gtSession
 */
async function persistRoster(coachId, confirmedIds, pendingFragments, gtSession) {
  const phase = gtSession?.phase === 'progress' ? 'progress' : 'compose'
  if (confirmedIds.length > 0) {
    await updateGroupTrainingRoster(coachId, confirmedIds, phase)
  }
  await updateTelegramSession(coachId, {
    pendingTrainingRoster: {
      confirmedIds,
      pendingFragments,
      awaitingNames: false,
    },
  })
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {Awaited<ReturnType<typeof buildCoachAgentContext>>} context
 * @param {NonNullable<Awaited<ReturnType<typeof routeCoachIntent>>>} route
 * @param {string} userText
 * @param {string} helpText
 */
async function executeCoachTool(token, chatId, coachId, context, route, userText, helpText) {
  if (route.cancel || route.intent === 'cancel') {
    await updateTelegramSession(coachId, { pendingTrainingRoster: null, pendingAgentWrite: null })
    await sendAgentReply(token, chatId, 'Отменено.')
    return { handled: true, reply: 'Отменено.' }
  }

  if (route.intent === 'help') {
    await sendAgentReply(token, chatId, helpText)
    return { handled: true, reply: helpText }
  }

  if (route.intent === 'clarify') {
    if (looksLikeNormMention(userText) && context.activeStudent) {
      return offerWriteConfirmation(
        token,
        chatId,
        coachId,
        {
          intent: 'write_norm',
          norm_name: userText,
          result_value: extractNormResultRaw(userText),
        },
        userText,
        context.activeStudent,
      )
    }
    if (
      (looksLikeTechniqueWrite(userText) || isTechniqueAdvanceCommand(userText)) &&
      context.activeStudent
    ) {
      return offerWriteConfirmation(
        token,
        chatId,
        coachId,
        {
          intent: 'write_technique',
          element_name: userText,
          level: resolveTechniqueLevelForWrite(userText) ?? '',
        },
        userText,
        context.activeStudent,
      )
    }
    const reply =
      route.reply ||
      'Уточните, пожалуйста: о ком речь или что сделать с составом тренировки?'
    await sendAgentReply(token, chatId, reply)
    return { handled: true, reply }
  }

  if (route.intent === 'list_students') {
    const lines = ['<b>Ученики</b>', '']
    for (const s of context.students) {
      lines.push(`• ${displayName(s)}`)
    }
    if (!context.students.length) lines.push('Список пуст.')
    await sendAgentReply(token, chatId, lines.join('\n'))
    return { handled: true }
  }

  if (
    route.intent === 'training_roster' ||
    route.intent === 'training_start' ||
    (route.start_training && route.intent !== 'training_end')
  ) {
    if (route.intent === 'training_start' && context.rosterIds.length) {
      route.start_training = true
    }
    return executeRosterTool(token, chatId, coachId, context, route, userText)
  }

  if (route.intent === 'training_end') {
    await endTrainingFromTelegram(coachId)
    await updateTelegramSession(coachId, { pendingTrainingRoster: null })
    await sendAgentReply(
      token,
      chatId,
      'Тренировка завершена. Скажите «тренировка» или назовите фамилии для новой.',
    )
    return { handled: true }
  }

  if (route.intent === 'group_technique') {
    if (!context.rosterIds.length) {
      await sendAgentReply(token, chatId, 'Сначала соберите состав тренировки.')
      return { handled: true }
    }
    const text = await formatGroupTechniqueSummary(coachId, context.students, context.rosterIds)
    await sendAgentReply(token, chatId, text, {
      reply_markup: buildTrainingProgressKeyboard(),
    })
    return { handled: true, reply: text }
  }

  if (route.intent === 'training_exercises') {
    if (!context.rosterIds.length) {
      await sendAgentReply(token, chatId, 'Сначала начните тренировку и выберите состав.')
      return { handled: true }
    }
    const muscleGroupId = route.muscle_group && getMuscleGroup(route.muscle_group)
      ? route.muscle_group
      : null
    if (muscleGroupId) {
      await telegramApi(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(
        () => {},
      )
      const messages = await recommendGroupExercise(
        context.students,
        context.rosterIds,
        muscleGroupId,
      )
      for (const msg of messages) {
        await sendAgentReply(token, chatId, msg)
      }
      return { handled: true }
    }
    const stats = buildGroupTrainingStats(context.students, context.rosterIds)
    await sendAgentReply(token, chatId, buildMuscleGroupPickerMessage(stats), {
      reply_markup: buildMuscleGroupPickerKeyboard(),
    })
    return { handled: true }
  }

  const { students: targets, unmatched } = resolveStudents(context, route, userText)

  if (route.intent === 'select_student') {
    if (!targets.length) {
      await sendAgentReply(
        token,
        chatId,
        route.reply || 'Не нашёл такого ученика. Назовите фамилию из списка.',
      )
      return { handled: true }
    }
    const student = targets[0]
    await updateTelegramSession(coachId, { activeStudentId: student.id })
    const summary = formatStudentSummary(student, context.allNorms)
    await sendAgentReply(
      token,
      chatId,
      `Обсуждаем: <b>${displayName(student)}</b>\n\n${summary}`,
    )
    return { handled: true, reply: summary }
  }

  if (['student_summary', 'student_norms', 'student_technique'].includes(route.intent)) {
    if (!targets.length) {
      await sendAgentReply(
        token,
        chatId,
        route.reply ||
          (unmatched.length
            ? `Не нашёл: ${unmatched.join(', ')}. Назовите ученика из списка.`
            : 'О ком речь? Назовите ученика или выберите 👤 Ученики.'),
      )
      return { handled: true }
    }
    const student = targets[0]
    await updateTelegramSession(coachId, { activeStudentId: student.id })

    let reply = ''
    if (route.intent === 'student_norms') {
      reply = formatPendingNorms(student, context.allNorms)
    } else {
      reply = formatStudentSummary(student, context.allNorms)
    }
    await sendAgentReply(token, chatId, reply)
    return { handled: true, reply }
  }

  if (route.intent === 'chat' && route.reply) {
    await sendAgentReply(token, chatId, route.reply)
    return { handled: true, reply: route.reply }
  }

  if (route.intent === 'confirm_write') {
    return executePendingWrite(token, chatId, coachId, context.session?.pendingAgentWrite)
  }

  if (route.intent === 'cancel_write') {
    return cancelPendingWrite(token, chatId, coachId)
  }

  if (route.intent === 'write_norm' || route.intent === 'write_technique') {
    return offerWriteConfirmation(
      token,
      chatId,
      coachId,
      route,
      userText,
      context.activeStudent,
    )
  }

  return { handled: false }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {string} text
 * @param {Record<string, unknown>} session
 * @param {{ helpText: string }} options
 * @returns {Promise<{ handled: boolean }>}
 */
export async function handleCoachAgentMessage(token, chatId, coachId, text, session, options) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { handled: false }

  if (session?.pendingAgentWrite && isWriteConfirmText(trimmed)) {
    const result = await executePendingWrite(token, chatId, coachId, session.pendingAgentWrite)
    if (result.handled && result.reply) {
      await appendTelegramChatMessage(coachId, 'assistant', JSON.stringify(result.reply))
    }
    return { handled: result.handled }
  }

  if (session?.pendingAgentWrite && isWriteCancelText(trimmed)) {
    return cancelPendingWrite(token, chatId, coachId)
  }

  await telegramApi(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {})

  let context
  try {
    context = await buildCoachAgentContext(coachId, session)
  } catch (err) {
    console.warn('buildCoachAgentContext', err)
    return { handled: false }
  }

  if (session?.pendingNormDraft && extractNormResultRaw(trimmed)) {
    const draft = session.pendingNormDraft
    const draftStudent =
      context.students.find((s) => s.id === draft.studentId) ?? context.activeStudent
    const writeRoute = {
      intent: 'write_norm',
      kind: 'norm',
      norm_name: draft.normName,
      result_value: extractNormResultRaw(trimmed),
    }
    const writeResult = await offerWriteConfirmation(
      token,
      chatId,
      coachId,
      writeRoute,
      `${draft.normName} ${trimmed}`,
      draftStudent,
    )
    return { handled: writeResult.handled }
  }

  if (session?.pendingTechniqueDraft) {
    const draft = session.pendingTechniqueDraft
    const draftStudent =
      context.students.find((s) => s.id === draft.studentId) ?? context.activeStudent
    const level = resolveTechniqueLevelForWrite(trimmed)
    if (level) {
      const writeRoute = {
        intent: 'write_technique',
        kind: 'technique',
        element_name: draft.atomLabel ?? '',
        level,
      }
      const writeResult = await offerWriteConfirmation(
        token,
        chatId,
        coachId,
        writeRoute,
        `${draft.atomLabel} ${trimmed}`,
        draftStudent,
      )
      return { handled: writeResult.handled }
    }
  }

  if (looksLikeTechniqueWrite(trimmed)) {
    const writeRoute = {
      intent: 'write_technique',
      element_name: trimmed,
      level: resolveTechniqueLevelForWrite(trimmed) ?? '',
      student_names: [],
      confidence: 0.88,
    }
    const writeResult = await offerWriteConfirmation(
      token,
      chatId,
      coachId,
      writeRoute,
      trimmed,
      context.activeStudent,
    )
    if (writeResult.handled) {
      await appendTelegramChatMessage(coachId, 'assistant', '[write_technique]')
    }
    return { handled: writeResult.handled }
  }

  if (looksLikeNormWrite(trimmed)) {
    const writeRoute = {
      intent: 'write_norm',
      norm_name: trimmed,
      result_value: extractNormResultRaw(trimmed),
      student_names: [],
      confidence: 0.88,
    }
    const writeResult = await offerWriteConfirmation(
      token,
      chatId,
      coachId,
      writeRoute,
      trimmed,
      context.activeStudent,
    )
    if (writeResult.handled) {
      await appendTelegramChatMessage(coachId, 'assistant', '[write_norm]')
    }
    return { handled: writeResult.handled }
  }

  const normResultOnly =
    looksLikeNormMention(trimmed) &&
    context.activeStudent &&
    extractNormResultRaw(trimmed)
  if (normResultOnly) {
    const writeRoute = {
      intent: 'write_norm',
      norm_name: trimmed,
      result_value: extractNormResultRaw(trimmed),
      student_names: [],
      confidence: 0.85,
    }
    const writeResult = await offerWriteConfirmation(
      token,
      chatId,
      coachId,
      writeRoute,
      trimmed,
      context.activeStudent,
    )
    if (writeResult.handled) {
      await appendTelegramChatMessage(coachId, 'assistant', '[write_norm]')
    }
    return { handled: writeResult.handled }
  }

  let route = null
  try {
    route = await routeCoachIntent(context, trimmed)
  } catch (err) {
    console.warn('routeCoachIntent', err)
    return { handled: false }
  }

  if (!route || route.confidence < CONFIDENCE_THRESHOLD) {
    return { handled: false }
  }

  if (route.intent === 'unknown') {
    return { handled: false }
  }

  try {
    const result = await executeCoachTool(
      token,
      chatId,
      coachId,
      context,
      route,
      trimmed,
      options.helpText,
    )
    if (result.handled && result.reply) {
      await appendTelegramChatMessage(coachId, 'assistant', result.reply.replace(/<[^>]+>/g, ''))
    } else if (result.handled) {
      await appendTelegramChatMessage(coachId, 'assistant', `[${route.intent}]`)
    }
    return { handled: result.handled }
  } catch (err) {
    console.error('executeCoachTool', err)
    return { handled: false }
  }
}
