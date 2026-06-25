import { displayName } from './telegramCoachData.js'
import { generateGeminiReply } from './vertexGemini.js'
import { matchStudentByMention, matchStudentsFromMentions, normalizeText } from './telegramRosterNames.js'

const SYSTEM_PROMPT = `Ты парсер команд тренера для состава групповой тренировки бокса.
Пользователь говорит по-русски (часто с ошибками STT). Различай однофамильцев по имени.

Ответь ТОЛЬКО валидным JSON без markdown и комментариев:
{"add":[],"remove":[],"set":null,"only":[],"start":false,"cancel":false,"note":""}

Поля:
- add — кого добавить (полные имена из списка учеников)
- remove — кого убрать из состава
- set — заменить весь состав этим списком (иначе null)
- only — оставить ТОЛЬКО этих (остальных убрать)
- start — true, если явно просят начать/продолжить тренировку
- cancel — true, если отмена
- note — кратко по-русски, если команда неоднозначна (иначе "")

Примеры:
«Убери Ермакова Назара, а Захара Ермакова оставь» → remove:["Назар Ермаков"], add:["Захар Ермаков"]
«Оставь только Стрижова и Захара Ермакова» → only:["Антон Стрижов","Захар Ермаков"]
«Добавь Иванова» → add one matching student name

Имена возвращай максимально близко к списку учеников.`

/**
 * @param {unknown} raw
 */
function parseJsonFromModel(raw) {
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
 * @param {object[]} students
 * @param {string} text
 * @param {{ confirmedIds?: string[], activeTraining?: boolean }} context
 */
export async function parseRosterCommandWithAi(students, text, context = {}) {
  const rosterLines = (students ?? [])
    .map((s) => `- ${displayName(s)}`)
    .join('\n')
  const currentNames = (context.confirmedIds ?? [])
    .map((id) => students.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => displayName(s))
    .join(', ')

  const userPrompt = [
    'Ученики тренера:',
    rosterLines || '(пусто)',
    '',
    `Текущий состав: ${currentNames || 'пусто'}`,
    context.activeTraining ? 'Тренировка уже идёт.' : 'Состав ещё собирается.',
    '',
    `Команда тренера: ${text}`,
  ].join('\n')

  const { text: raw } = await generateGeminiReply(SYSTEM_PROMPT, userPrompt, {
    temperature: 0.12,
    maxOutputTokens: 400,
  })

  const parsed = parseJsonFromModel(raw)
  if (!parsed || typeof parsed !== 'object') return null
  return parsed
}

/**
 * @param {string} text
 */
export function parseRosterEditRules(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return null

  /** @type {string[]} */
  const remove = []
  /** @type {string[]} */
  const add = []
  /** @type {string[]} */
  const only = []
  let start = false
  let cancel = false

  if (/^(?:отмена|cancel|стоп)\s*$/i.test(raw)) cancel = true

  if (/(?:^|\s)(?:начать|старт|давай|поехали)\b/i.test(raw)) start = true

  const onlyRe = /(?:оставь\s+)?только\s+(.+)$/i.exec(raw)
  if (onlyRe) {
    only.push(
      ...onlyRe[1]
        .split(/[,;]|\s+и\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
    return { add, remove, set: null, only, start, cancel, note: '' }
  }

  const removeRe = /(?:убери|убрать|исключи|удали|минус)\s+([^,;]+)/gi
  let m
  while ((m = removeRe.exec(raw))) {
    remove.push(m[1].trim())
  }

  const keepNameLastRe = /,\s*а\s+(.+?)\s+оставь\s*$/i
  const keepLast = keepNameLastRe.exec(raw)
  if (keepLast?.[1]) {
    add.push(keepLast[1].trim())
  }

  const keepRe = /(?:^|,\s*)(?:оставь|оставить)\s+([^,.;]+)/gi
  while ((m = keepRe.exec(raw))) {
    add.push(m[1].trim())
  }

  const addRe = /(?:добавь|добавить|плюс)\s+([^,.;]+)/gi
  while ((m = addRe.exec(raw))) {
    add.push(m[1].trim())
  }

  if (!remove.length && !add.length && !only.length && !start && !cancel) return null
  return { add, remove, set: null, only, start, cancel, note: '' }
}

/**
 * @param {object[]} students
 * @param {string[]} currentIds
 * @param {{ add?: string[], remove?: string[], set?: string[] | null, only?: string[], start?: boolean, cancel?: boolean }} command
 */
export function applyRosterCommand(students, currentIds, command) {
  if (!command) {
    return {
      confirmedIds: [...(currentIds ?? [])],
      pendingFragments: [],
      removedNames: [],
      addedNames: [],
      unmatched: [],
      start: false,
      cancel: false,
    }
  }

  if (command.cancel) {
    return {
      confirmedIds: [],
      pendingFragments: [],
      removedNames: [],
      addedNames: [],
      unmatched: [],
      start: false,
      cancel: true,
    }
  }

  let ids = new Set(currentIds ?? [])
  /** @type {string[]} */
  const unmatched = []
  /** @type {string[]} */
  const removedNames = []
  /** @type {string[]} */
  const addedNames = []

  if (Array.isArray(command.set) && command.set.length) {
    const { matched, unmatched: um } = matchStudentsFromMentions(students, command.set)
    ids = new Set(matched.map((s) => s.id))
    unmatched.push(...um)
    addedNames.push(...matched.map((s) => displayName(s)))
  } else if (Array.isArray(command.only) && command.only.length) {
    const { matched, unmatched: um } = matchStudentsFromMentions(students, command.only)
    const keepIds = new Set(matched.map((s) => s.id))
    for (const id of ids) {
      if (!keepIds.has(id)) {
        const s = students.find((st) => st.id === id)
        if (s) removedNames.push(displayName(s))
      }
    }
    ids = keepIds
    unmatched.push(...um)
    addedNames.push(...matched.map((s) => displayName(s)))
  } else {
    for (const mention of command.remove ?? []) {
      const hit = matchStudentByMention(students, mention)
      if (hit && ids.has(hit.student.id)) {
        ids.delete(hit.student.id)
        removedNames.push(displayName(hit.student))
      } else if (hit) {
        removedNames.push(displayName(hit.student))
      } else {
        unmatched.push(String(mention))
      }
    }

    for (const mention of command.add ?? []) {
      const hit = matchStudentByMention(students, mention)
      if (hit) {
        if (!ids.has(hit.student.id)) {
          ids.add(hit.student.id)
          addedNames.push(displayName(hit.student))
        }
      } else {
        unmatched.push(String(mention))
      }
    }
  }

  return {
    confirmedIds: [...ids],
    pendingFragments: unmatched,
    removedNames,
    addedNames,
    unmatched,
    start: Boolean(command.start),
    cancel: false,
  }
}

/**
 * @param {string} text
 */
export function isRosterEditCommand(text) {
  return /(?:^|\s)(?:убери|убрать|исключи|удали|оставь|оставить|добавь|добавить|только|минус|плюс)\b/i.test(
    normalizeText(text),
  )
}
