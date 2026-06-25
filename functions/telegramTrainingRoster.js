import { getGroupTrainingSession, updateGroupTrainingRoster } from './groupTrainingSessionData.js'
import { displayName, getCoachStudents, updateTelegramSession } from './telegramCoachData.js'
import {
  buildTrainingProgressKeyboard,
  formatGroupTechniqueSummary,
  sendComposeRosterReply,
} from './telegramGroupTraining.js'
import { escapeTelegramHtml, sendTelegramMessage, telegramApi } from './telegramApi.js'
import { menuExtra } from './telegramMenu.js'
import {
  applyRosterCommand,
  isRosterEditCommand,
  parseRosterCommandWithAi,
  parseRosterEditRules,
} from './telegramRosterAi.js'
import {
  findAllStudentsInText,
  matchStudentByMention,
  normalizeText,
} from './telegramRosterNames.js'

const TRAINING_KEYWORD =
  /(?:^|\s)(?:тренировк|начать|начинай|начни|старт|состав|на\s+занят|группов(?:ую|ая|ой)\s+тренировк)/i

const CANCEL = /^(?:отмена|cancel|стоп)\s*$/i

const SKIP =
  /^(?:без|пропусти|пропустить|skip)\s+(.+)$/i

const BOILERPLATE =
  /\b(?:начать|начинай|начни|старт|tренировку|тренировка|тренировки|групповую|групповая|групповой|состав|занятие|занятия|на|с|для|всех|все|учеников|ученика|присутствуют|есть|будут|мне|дай|нужны|нужен|пришли|пришёл|пришла|убери|убрать|оставь|оставить|добавь|добавить|только|исключи|удали)\b/gi

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} text
 * @param {Record<string, unknown>} [extra]
 */
async function sendRosterReply(token, chatId, text, extra = {}) {
  await sendTelegramMessage(token, chatId, text, {
    ...menuExtra(),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })
}

/**
 * @param {object[]} students
 * @param {string} text
 */
export function countStudentsInText(students, text) {
  return findAllStudentsInText(students, text).length
}

/**
 * @param {string} text
 * @param {object[]} students
 * @param {{ confirmedIds?: string[], pendingFragments?: string[], awaitingNames?: boolean } | null | undefined} pending
 * @param {boolean} [activeTraining]
 */
export function isTrainingRosterIntent(text, students, pending, activeTraining = false) {
  if (pending?.awaitingNames) return true
  if (pending?.pendingFragments?.length) return true
  if (activeTraining && isRosterEditCommand(text)) return true
  if (isRosterEditCommand(text)) return true
  if (TRAINING_KEYWORD.test(String(text ?? ''))) return true
  return countStudentsInText(students, text) >= 2
}

/**
 * @param {string} text
 */
function stripTrainingBoilerplate(text) {
  return normalizeText(text).replace(BOILERPLATE, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * @param {string} text
 */
function splitNameFragments(text) {
  const cleaned = stripTrainingBoilerplate(text)
  if (!cleaned) return []

  const byDelimiter = cleaned
    .split(/[,;]|\s+и\s+|\s+а\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3)

  if (byDelimiter.length > 1) return byDelimiter

  return cleaned.split(/\s+/).filter((w) => w.length >= 3)
}

/**
 * @param {object[]} students
 * @param {string} fragment
 * @param {Set<string>} takenIds
 */
function findBestStudentForFragment(students, fragment, takenIds) {
  const hit = matchStudentByMention(students, fragment, takenIds)
  if (!hit) return null

  const last = normalizeText(students.find((s) => s.id === hit.student.id)?.lastName ?? '')
  const norm = normalizeText(fragment)
  const ambiguous =
    last.length >= 4 &&
    norm === last &&
    students.filter((s) => normalizeText(s.lastName ?? '') === last && !takenIds.has(s.id)).length > 1

  return { student: hit.student, ambiguous }
}

/**
 * @param {object[]} students
 * @param {string} text
 * @param {{ confirmedIds?: string[], pendingFragments?: string[] } | null | undefined} pending
 */
export function resolveTrainingRoster(students, text, pending) {
  const confirmedIds = [...(pending?.confirmedIds ?? [])]
  let pendingFragments = [...(pending?.pendingFragments ?? [])]
  const takenIds = new Set(confirmedIds)

  const stillPending = []
  for (const frag of pendingFragments) {
    const hit = findBestStudentForFragment(students, frag, takenIds)
    if (hit && !hit.ambiguous) {
      confirmedIds.push(hit.student.id)
      takenIds.add(hit.student.id)
    } else {
      stillPending.push(frag)
    }
  }
  pendingFragments = stillPending

  const fragments = splitNameFragments(text)
  const newUnmatched = []

  for (const frag of fragments) {
    const normFrag = normalizeText(frag)
    if (pendingFragments.some((p) => normalizeText(p) === normFrag)) continue

    const hit = findBestStudentForFragment(students, frag, takenIds)
    if (hit && !hit.ambiguous) {
      confirmedIds.push(hit.student.id)
      takenIds.add(hit.student.id)
    } else if (hit?.ambiguous) {
      newUnmatched.push(frag)
    } else if (normFrag.length >= 3) {
      newUnmatched.push(frag)
    }
  }

  for (const student of findAllStudentsInText(students, text, takenIds)) {
    confirmedIds.push(student.id)
    takenIds.add(student.id)
  }

  pendingFragments = [...new Set([...pendingFragments, ...newUnmatched])]

  return {
    confirmedIds: [...new Set(confirmedIds)],
    pendingFragments: [...new Set(pendingFragments)],
  }
}

/**
 * @param {object[]} students
 * @param {string[]} confirmedIds
 * @param {string[]} pendingFragments
 * @param {{ removedNames?: string[], addedNames?: string[], activeTraining?: boolean, aiNote?: string }} [meta]
 */
export function formatTrainingRosterClarification(students, confirmedIds, pendingFragments, meta = {}) {
  const idSet = new Set(confirmedIds)
  const roster = students.filter((s) => idSet.has(s.id))

  const lines = ['<b>🏋️ Состав тренировки</b>', '']

  if (roster.length) {
    lines.push('<b>В составе:</b>')
    for (const student of roster) {
      lines.push(`✅ ${escapeTelegramHtml(displayName(student))}`)
    }
  } else {
    lines.push('Пока никого не распознал.')
  }

  if (meta.removedNames?.length) {
    lines.push('', '<b>Убрал:</b>', ...meta.removedNames.map((n) => `➖ ${escapeTelegramHtml(n)}`))
  }

  if (meta.addedNames?.length) {
    lines.push('', '<b>Добавил:</b>', ...meta.addedNames.map((n) => `➕ ${escapeTelegramHtml(n)}`))
  }

  if (pendingFragments.length) {
    lines.push('', '<b>Не нашёл в базе:</b>')
    for (const frag of pendingFragments) {
      lines.push(`❓ «${escapeTelegramHtml(frag)}»`)
    }
  } else if (meta.activeTraining) {
    lines.push('', '<i>Состав синхронизирован с тренировкой в приложении.</i>')
  }

  if (meta.aiNote) {
    lines.push('', `<i>${escapeTelegramHtml(meta.aiNote)}</i>`)
  }

  return lines.join('\n')
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {string[]} studentIds
 * @param {boolean} [alreadyActive]
 */
export async function startGroupTrainingWithRoster(token, chatId, coachId, studentIds, alreadyActive = false) {
  await updateGroupTrainingRoster(coachId, studentIds, 'progress')
  const students = await getCoachStudents(coachId)
  const text = await formatGroupTechniqueSummary(coachId, students, studentIds)
  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: alreadyActive ? `<b>Состав обновлён</b>\n\n${text}` : text,
    parse_mode: 'HTML',
    reply_markup: buildTrainingProgressKeyboard(),
    disable_web_page_preview: true,
  })
}

/**
 * @param {object[]} students
 * @param {string} text
 * @param {string[]} currentIds
 * @param {boolean} activeTraining
 */
async function parseAndApplyRosterEdit(students, text, currentIds, token, chatId) {
  if (!isRosterEditCommand(text)) return null

  let command = null
  let aiNote = ''

  await telegramApi(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {})

  try {
    command = await parseRosterCommandWithAi(students, text, {
      confirmedIds: currentIds,
      activeTraining: currentIds.length > 0,
    })
    if (command?.note) aiNote = String(command.note)
  } catch (err) {
    console.warn('parseRosterCommandWithAi', err)
  }

  if (!command) {
    command = parseRosterEditRules(text)
  }

  if (!command) return null

  const hasAction =
    command.cancel ||
    command.start ||
    (Array.isArray(command.add) && command.add.length > 0) ||
    (Array.isArray(command.remove) && command.remove.length > 0) ||
    (Array.isArray(command.only) && command.only.length > 0) ||
    (Array.isArray(command.set) && command.set.length > 0)

  if (!hasAction) return null

  const applied = applyRosterCommand(students, currentIds, command)
  return { ...applied, aiNote, explicitStart: Boolean(command.start) }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {string} text
 * @param {Record<string, unknown>} tgSession
 * @returns {Promise<{ handled: boolean }>}
 */
export async function handleTrainingRosterMessage(token, chatId, coachId, text, tgSession) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { handled: false }

  const students = await getCoachStudents(coachId)
  const pending = tgSession?.pendingTrainingRoster ?? null
  const gtSession = await getGroupTrainingSession(coachId)
  const activeTraining = gtSession?.phase === 'progress' && (gtSession.selectedIds?.length ?? 0) > 0

  const currentIds =
    gtSession?.selectedIds?.length
      ? [...gtSession.selectedIds]
      : [...(pending?.confirmedIds ?? [])]

  if (!isTrainingRosterIntent(trimmed, students, pending, activeTraining)) {
    return { handled: false }
  }

  if (CANCEL.test(trimmed)) {
    await updateTelegramSession(coachId, { pendingTrainingRoster: null })
    await sendRosterReply(token, chatId, 'Подбор состава отменён.')
    return { handled: true }
  }

  let pendingFragments = [...(pending?.pendingFragments ?? [])]
  let confirmedIds = [...currentIds]

  const skipMatch = trimmed.match(SKIP)
  if (skipMatch && (pending || activeTraining)) {
    const target = normalizeText(skipMatch[1])
    pendingFragments = pendingFragments.filter(
      (f) =>
        normalizeText(f) !== target &&
        !normalizeText(f).includes(target) &&
        !target.includes(normalizeText(f)),
    )
    await persistRosterState(coachId, confirmedIds, pendingFragments, gtSession)
    return finishRosterFlow(token, chatId, coachId, students, confirmedIds, pendingFragments, {
      activeTraining,
      gtSession,
    })
  }

  const editResult = await parseAndApplyRosterEdit(students, trimmed, confirmedIds, token, chatId)
  if (editResult) {
    if (editResult.cancel) {
      await updateTelegramSession(coachId, { pendingTrainingRoster: null })
      await sendRosterReply(token, chatId, 'Подбор состава отменён.')
      return { handled: true }
    }

    confirmedIds = editResult.confirmedIds
    pendingFragments = editResult.pendingFragments

    await persistRosterState(coachId, confirmedIds, pendingFragments, gtSession)

    if (pendingFragments.length === 0 && confirmedIds.length > 0 && editResult.explicitStart) {
      await updateTelegramSession(coachId, { pendingTrainingRoster: null })
      await startGroupTrainingWithRoster(token, chatId, coachId, confirmedIds, activeTraining)
      return { handled: true }
    }

    await sendComposeRosterReply(token, chatId, coachId, {
      confirmedIds,
      pendingFragments,
      meta: {
        removedNames: editResult.removedNames,
        addedNames: editResult.addedNames,
      },
    })
    return { handled: true }
  }

  const resolved = resolveTrainingRoster(students, trimmed, {
    confirmedIds,
    pendingFragments,
  })
  confirmedIds = resolved.confirmedIds
  pendingFragments = resolved.pendingFragments

  const onlyKeyword =
    TRAINING_KEYWORD.test(trimmed) &&
    confirmedIds.length === 0 &&
    pendingFragments.length === 0 &&
    countStudentsInText(students, trimmed) === 0

  if (onlyKeyword) {
    await updateTelegramSession(coachId, {
      pendingTrainingRoster: { confirmedIds: [], pendingFragments: [], awaitingNames: true },
    })
    await sendTrainingRosterPicker(token, chatId, coachId)
    return { handled: true }
  }

  if (confirmedIds.length === 0 && pendingFragments.length === 0) {
    await sendTrainingRosterPicker(token, chatId, coachId)
    return { handled: true }
  }

  await persistRosterState(coachId, confirmedIds, pendingFragments, gtSession)
  return finishRosterFlow(token, chatId, coachId, students, confirmedIds, pendingFragments, {
    activeTraining,
    gtSession,
  })
}

/**
 * @param {string} coachId
 * @param {string[]} confirmedIds
 * @param {string[]} pendingFragments
 * @param {object | null} gtSession
 */
async function persistRosterState(coachId, confirmedIds, pendingFragments, gtSession) {
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
 * @param {object[]} students
 * @param {string[]} confirmedIds
 * @param {string[]} pendingFragments
 * @param {{ activeTraining?: boolean, gtSession?: object | null }} ctx
 */
async function finishRosterFlow(token, chatId, coachId, students, confirmedIds, pendingFragments, ctx) {
  if (ctx.explicitStart && pendingFragments.length === 0 && confirmedIds.length > 0) {
    await updateTelegramSession(coachId, { pendingTrainingRoster: null })
    await startGroupTrainingWithRoster(token, chatId, coachId, confirmedIds, ctx.activeTraining)
    return { handled: true }
  }

  await updateTelegramSession(coachId, {
    pendingTrainingRoster: pendingFragments.length
      ? { confirmedIds, pendingFragments, awaitingNames: false }
      : null,
  })
  await sendComposeRosterReply(token, chatId, coachId, {
    confirmedIds,
    pendingFragments,
  })
  return { handled: true }
}

/**
 * @param {string} token
 * @param {number} chatId
 * @param {string} coachId
 * @param {object[]} students
 */
async function sendTrainingRosterPicker(token, chatId, coachId) {
  await updateGroupTrainingRoster(coachId, [], 'compose')
  await sendComposeRosterReply(token, chatId, coachId, { confirmedIds: [], pendingFragments: [] })
}
