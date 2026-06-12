import { athleteShapeFromStudent } from './telegramNormsLite.js'
import { displayName } from './telegramCoachData.js'
import { escapeTelegramHtml } from './telegramTechnicalProgress.js'
import { splitTelegramText } from './telegramApi.js'
import { recordPortalAiUsage } from './portalAiUsage.js'
import { generateGeminiReply } from './vertexGemini.js'

/** 14 моторных качеств Cartel — точные названия из базы. */
const MOTOR_QUALITY_TITLES = [
  'Рост',
  'Мышечная масса',
  'Быстрота',
  'Скоростно-силовые качества',
  'Сила',
  'Статическая сила',
  'Скоростная сила',
  'Динамическая сила',
  'Выносливость (аэробные возможности)',
  'Анаэробные возможности',
  'Гибкость',
  'Координационные способности',
  'Равновесие',
  'Точность',
]

const QUALITY_LIST_FOR_PROMPT = MOTOR_QUALITY_TITLES.join(', ')

const EXERCISE_SECTION_LABELS = ['Упражнение', 'Формат', 'Дозировка', 'Акценты']
const TELEGRAM_EXERCISE_MSG_LIMIT = 3800

/** @type {Record<string, { id: string, label: string, muscles: string, hintQualities: string[] }>} */
export const MUSCLE_GROUPS = {
  legs: {
    id: 'legs',
    label: 'Ноги',
    muscles: 'квадрицепсы, ягодицы, икры — стойка, шаги, перенос веса',
    hintQualities: ['Сила', 'Быстрота', 'Равновесие', 'Выносливость (аэробные возможности)'],
  },
  core: {
    id: 'core',
    label: 'Кор',
    muscles: 'пресс, косые, поясница — вращение корпуса и устойчивость',
    hintQualities: ['Сила', 'Координационные способности', 'Равновесие', 'Динамическая сила'],
  },
  spine: {
    id: 'spine',
    label: 'Спина',
    muscles: 'широчайшие, трапеции, разгибатели — тяга и вращение в ударе',
    hintQualities: ['Динамическая сила', 'Сила', 'Скоростно-силовые качества'],
  },
  shoulders: {
    id: 'shoulders',
    label: 'Плечи',
    muscles: 'дельты, вращательная манжета — гард и работа рук',
    hintQualities: ['Выносливость (аэробные возможности)', 'Статическая сила', 'Сила'],
  },
  forearms: {
    id: 'forearms',
    label: 'Предплечья',
    muscles: 'предплечья и хват — жёсткость кисти и контроль',
    hintQualities: ['Сила', 'Статическая сила', 'Точность'],
  },
}

/**
 * @param {string} groupId
 */
export function getMuscleGroup(groupId) {
  return MUSCLE_GROUPS[groupId] ?? null
}

/**
 * @param {{ count: number, avgAge: number | null }} stats
 */
export function buildMuscleGroupPickerMessage(stats) {
  const countLabel = `${stats.count} ученик${stats.count === 1 ? '' : stats.count < 5 ? 'а' : 'ов'}`
  const ageLabel =
    stats.avgAge != null ? ` · ср. возраст <b>${stats.avgAge}</b> лет` : ''
  return [
    '<b>📋 Упражнения</b>',
    `${countLabel}${ageLabel}`,
    '',
    'Выберите группу мышц — подберём упражнение под возраст и состав группы:',
  ].join('\n')
}

export function buildMuscleGroupPickerKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Ноги', callback_data: 'gt:mg:legs' },
        { text: 'Кор', callback_data: 'gt:mg:core' },
      ],
      [
        { text: 'Спина', callback_data: 'gt:mg:spine' },
        { text: 'Плечи', callback_data: 'gt:mg:shoulders' },
      ],
      [{ text: 'Предплечья', callback_data: 'gt:mg:forearms' }],
      [{ text: '← Назад', callback_data: 'gt:ex:back' }],
    ],
  }
}

export function buildMuscleGroupResultKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Ноги', callback_data: 'gt:mg:legs' },
        { text: 'Кор', callback_data: 'gt:mg:core' },
      ],
      [
        { text: 'Спина', callback_data: 'gt:mg:spine' },
        { text: 'Плечи', callback_data: 'gt:mg:shoulders' },
      ],
      [{ text: 'Предплечья', callback_data: 'gt:mg:forearms' }],
      [{ text: '← К выбору группы', callback_data: 'gt:ex' }],
      [{ text: '✕ Завершить тренировку', callback_data: 'gt:end' }],
    ],
  }
}

const EXERCISE_SYSTEM_PROMPT = [
  'Ты — методист Cartel Boxing. Подбираешь одно интересное упражнение для групповой тренировки боксёров.',
  'Обязательно используй глобальный поиск Google: найди проверенные упражнения из открытых спортивных источников (бокс, ОФП, координация, детско-юношеский спорт).',
  'Упражнение должно быть нацелено на указанную группу мышц и полезно именно для бокса.',
  'Упражнение должно быть безопасным для указанного возраста и реально выполнимым на тренировке за 10–20 минут.',
  'Если учеников 2 и больше — по возможности предложи парный или игровой формат (пары, смена партнёров).',
  'Ответ на русском, до 800 символов, без markdown и без ссылок. Блок «Почему сейчас» не пиши.',
  '',
  'Первая строка ответа ОБЯЗАТЕЛЬНО (1–3 качества из списка Cartel, через запятую):',
  'Качества: …',
  `Допустимые названия качеств (только они): ${QUALITY_LIST_FOR_PROMPT}.`,
  '',
  'Далее блоки с пустой строкой между ними:',
  'Упражнение: «…»',
  'Формат: индивидуальное / парное / групповое',
  'Дозировка: объём + пошагово как выполнять (снаряд, расстановка, действия)',
  'Акценты: кратко техника и безопасность',
].join('\n')

const EXERCISE_SYSTEM_PROMPT_NO_SEARCH = [
  'Ты — методист Cartel Boxing. Подбери одно интересное упражнение для групповой тренировки боксёров.',
  'Учитывай возраст группы. Если учеников 2+ — можно парный формат.',
  'Ответ на русском, до 800 символов, без markdown и без ссылок. Блок «Почему сейчас» не пиши.',
  'Первая строка: Качества: … (1–3 из списка Cartel).',
  `Список качеств: ${QUALITY_LIST_FOR_PROMPT}.`,
  'Блоки через пустую строку: Упражнение / Формат / Дозировка (пошагово) / Акценты.',
].join('\n')

/** @param {number} ageInt */
function getBoxingAgeAnchorQuality(ageInt) {
  if (ageInt == null || !Number.isFinite(ageInt)) return null
  if (ageInt < 7) return null
  if (ageInt <= 8) return 'Равновесие'
  if (ageInt <= 10) return 'Быстрота'
  if (ageInt <= 12) return 'Координационные способности'
  if (ageInt <= 14) return 'Координационные способности'
  if (ageInt <= 16) return 'Скоростно-силовые качества'
  if (ageInt <= 18) return 'Анаэробные возможности'
  return 'Динамическая сила'
}

/**
 * @param {unknown} raw
 */
function normalizeBirthYearNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'string') {
    const m = raw.match(/\d{4}/)
    if (m) return Number(m[0])
  }
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 1900 && n <= 2100) return Math.floor(n)
  return 0
}

/** @param {number | string | undefined} birthYear */
function computeAthleteAgeYears(birthYear) {
  const y = normalizeBirthYearNumber(birthYear)
  if (!y) return null
  return new Date().getFullYear() - y
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractMotorQualities(text) {
  const raw = String(text ?? '')
  const qualitiesLine = raw.match(/^Качества:\s*(.+)$/im)?.[1] ?? ''
  const haystack = `${qualitiesLine}\n${raw}`
  const found = []
  const sorted = [...MOTOR_QUALITY_TITLES].sort((a, b) => b.length - a.length)
  for (const title of sorted) {
    if (haystack.includes(title)) found.push(title)
  }
  return [...new Set(found)].slice(0, 3)
}

/**
 * @param {string} text
 */
function stripUrlsFromText(text) {
  return String(text ?? '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {string} text
 */
function stripWhyNowSection(text) {
  return String(text ?? '')
    .replace(/^Почему сейчас:\s*[\s\S]*?(?=\n(?:Упражнение|Формат|Дозировка|Акценты):|\n*$)/im, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {string} rawBody
 * @returns {{ label: string, content: string }[]}
 */
function parseExerciseSections(rawBody) {
  const withoutQualities = stripWhyNowSection(
    stripUrlsFromText(rawBody).replace(/^Качества:\s*.+$/im, ''),
  ).trim()
  const sectionPattern = new RegExp(
    `(?=${EXERCISE_SECTION_LABELS.map((label) => `${label}:`).join('|')})`,
  )
  const blocks = withoutQualities
    .split(sectionPattern)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!blocks.length) {
    return withoutQualities ? [{ label: '', content: withoutQualities }] : []
  }

  /** @type {{ label: string, content: string }[]} */
  const sections = []
  for (const block of blocks) {
    const colon = block.indexOf(':')
    if (colon === -1) {
      sections.push({ label: '', content: block })
      continue
    }
    const label = block.slice(0, colon).trim()
    if (/^почему сейчас$/i.test(label)) continue
    sections.push({
      label,
      content: block.slice(colon + 1).trim(),
    })
  }
  return sections
}

/**
 * @param {{ label: string, content: string }} section
 */
function formatExerciseSection(section) {
  if (!section.label) return escapeTelegramHtml(section.content)
  return `<b>${escapeTelegramHtml(section.label)}</b>\n${escapeTelegramHtml(section.content)}`
}

/**
 * @param {string} header
 * @param {string} rawBody
 * @returns {string[]}
 */
function buildExerciseTelegramMessages(header, rawBody) {
  const sections = parseExerciseSections(rawBody)
  if (!sections.length) {
    return [header]
  }

  const accentsIdx = sections.findIndex((s) => /^акценты$/i.test(s.label))
  const mainSections = accentsIdx >= 0 ? sections.slice(0, accentsIdx) : sections
  const accentsSection = accentsIdx >= 0 ? sections[accentsIdx] : null

  const mainBody = mainSections.map(formatExerciseSection).filter(Boolean).join('\n\n')
  const messageMain = mainBody ? `${header}\n\n${mainBody}` : header

  if (!accentsSection) {
    return splitTelegramText(messageMain, TELEGRAM_EXERCISE_MSG_LIMIT)
  }

  const accentsBody = formatExerciseSection(accentsSection)
  const messageFull = `${messageMain}\n\n${accentsBody}`

  if (messageFull.length <= TELEGRAM_EXERCISE_MSG_LIMIT) {
    return [messageFull]
  }

  if (messageMain.length > TELEGRAM_EXERCISE_MSG_LIMIT) {
    return [...splitTelegramText(messageMain, TELEGRAM_EXERCISE_MSG_LIMIT), accentsBody]
  }

  return [messageMain, accentsBody]
}

/**
 * @param {object[]} students
 * @param {string[]} selectedIds
 */
export function buildGroupTrainingStats(students, selectedIds) {
  const idSet = new Set(selectedIds)
  const roster = students.filter((s) => idSet.has(s.id))
  const members = roster.map((student) => {
    const athlete = athleteShapeFromStudent(student)
    const ageRaw = computeAthleteAgeYears(athlete.birthYear)
    const age = ageRaw != null ? Math.floor(ageRaw) : null
    return { name: displayName(student), age }
  })
  const ages = members.map((m) => m.age).filter((a) => a != null)
  const count = members.length
  const avgAge =
    ages.length > 0
      ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10
      : null
  const anchorQuality =
    avgAge != null ? getBoxingAgeAnchorQuality(Math.floor(avgAge)) : null
  return { count, avgAge, ages, members, anchorQuality }
}

/**
 * @param {{ count: number, avgAge: number | null, ages: number[], members: { name: string, age: number | null }[], anchorQuality: string | null }} stats
 * @param {{ label: string, muscles: string, hintQualities: string[] }} muscleGroup
 */
function buildExerciseUserPrompt(stats, muscleGroup) {
  const agesLine = stats.members
    .map((m) => `${m.name}${m.age != null ? ` (${m.age} лет)` : ''}`)
    .join(', ')
  const pairHint =
    stats.count >= 2
      ? 'Группа из 2+ человек — можно парное упражнение или игру в парах.'
      : 'Один ученик — индивидуальное упражнение.'
  const searchHint =
    stats.count >= 2
      ? `Найди в интернете упражнение для группы из ${stats.count} боксёров`
      : 'Найди в интернете упражнение для одного боксёра'

  return [
    searchHint,
    `Целевая группа мышц: ${muscleGroup.label} (${muscleGroup.muscles}).`,
    `Предпочтительные качества Cartel для этой зоны: ${muscleGroup.hintQualities.join(', ')}.`,
    `Группа: ${stats.count} ученик${stats.count === 1 ? '' : stats.count < 5 ? 'а' : 'ов'}.`,
    stats.avgAge != null ? `Средний возраст: ${stats.avgAge} лет.` : 'Средний возраст: неизвестен.',
    stats.anchorQuality ? `Возрастной акцент: ${stats.anchorQuality}.` : '',
    `Состав: ${agesLine}.`,
    pairHint,
    'Укажи 1–3 качества из списка Cartel, которые развивает упражнение.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** @type {Record<string, { title: string, dosage: string, accents: string }>} */
const OFFLINE_FALLBACK_BY_GROUP = {
  legs: {
    title: '«Прыжки в сторону с касанием пола»',
    dosage:
      '3×2 мин, отдых 1 мин. Из стойки прыжок в сторону, коснуться пола ладонью, вернуться в центр. Чередовать стороны.',
    accents: 'мягкое приземление, колени слегка согнуты, корпус прямой',
  },
  core: {
    title: '«Медвежья проходка с поворотом корпуса»',
    dosage:
      '3×20 м, отдых 45 с. В упоре на ладони и носки, колени у пола. Шаг вперёд с поворотом корпуса на каждом шаге.',
    accents: 'корпус стабилен, таз не проваливается, дыхание ровное',
  },
  spine: {
    title: '«Тяга резинки к поясу в стойке боксёра»',
    dosage:
      '3×12 на руку, отдых 45 с. Резинка на уровне пояса, локти вдоль корпуса, тянуть к ребрам, медленно вернуть.',
    accents: 'локти близко к корпусу, лопатки сведены, без рывка',
  },
  shoulders: {
    title: '«Круговые вращения с лёгкими гантелями в гарде»',
    dosage:
      '3×30 сек, отдых 30 с. Лёгкий вес, руки в гарде, круговые движения вперёд и назад без боли в плече.',
    accents: 'малый вес, плечи опущены, кисти на уровне подбородка',
  },
  forearms: {
    title: '«Сжимание мяча / ролл рукавицы»',
    dosage:
      '3×20 сжиманий на руку, отдых 30 с. Сильное, но безболезненное сжатие, чередовать руки.',
    accents: 'сжимать без боли в запястье, запястье в нейтрали',
  },
}

/**
 * @param {{ count: number, avgAge: number | null, anchorQuality: string | null }} stats
 * @param {{ label: string, id: string, hintQualities: string[] }} muscleGroup
 */
function buildOfflineFallback(stats, muscleGroup) {
  const format =
    stats.count >= 2
      ? 'парное — разбейте на пары, меняйте партнёров каждые 1–2 подхода'
      : 'индивидуальное'
  const preset = OFFLINE_FALLBACK_BY_GROUP[muscleGroup.id] ?? OFFLINE_FALLBACK_BY_GROUP.legs
  const qualities = muscleGroup.hintQualities.slice(0, 2).join(', ')
  return [
    `Качества: ${qualities}`,
    '',
    `Упражнение: ${preset.title}`,
    '',
    `Формат: ${format}`,
    '',
    `Дозировка: ${preset.dosage}`,
    '',
    `Акценты: ${preset.accents}.`,
  ].join('\n')
}

/**
 * @param {{ count: number, avgAge: number | null, anchorQuality: string | null }} stats
 * @param {string[]} qualities
 * @param {{ label: string }} muscleGroup
 */
function buildExerciseHeader(stats, qualities, muscleGroup) {
  const countLabel = `${stats.count} ученик${stats.count === 1 ? '' : stats.count < 5 ? 'а' : 'ов'}`
  const ageLabel =
    stats.avgAge != null ? ` · ср. возраст <b>${stats.avgAge}</b> лет` : ''
  const qualityLine =
    qualities.length > 0
      ? qualities.map((q) => escapeTelegramHtml(q)).join(' · ')
      : stats.anchorQuality
        ? escapeTelegramHtml(stats.anchorQuality)
        : '—'

  return [
    `<b>📋 Упражнение · ${escapeTelegramHtml(muscleGroup.label)}</b>`,
    `<b>Качества:</b> ${qualityLine}`,
    `${countLabel}${ageLabel}`,
  ].join('\n')
}

/**
 * @param {object[]} students
 * @param {string[]} selectedIds
 * @param {string} muscleGroupId
 * @returns {Promise<string[]>}
 */
export async function recommendGroupExercise(students, selectedIds, muscleGroupId) {
  const muscleGroup = getMuscleGroup(muscleGroupId)
  if (!muscleGroup) {
    return ['Неизвестная группа мышц.']
  }

  const stats = buildGroupTrainingStats(students, selectedIds)
  if (!stats.count) {
    return ['Никого не выбрано на тренировке.']
  }

  const userPrompt = buildExerciseUserPrompt(stats, muscleGroup)
  let body = ''

  try {
    const result = await generateGeminiReply(EXERCISE_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.92,
      maxOutputTokens: 1100,
      useGoogleSearch: true,
    })
    body = stripWhyNowSection(result.text).slice(0, 2800)
    await recordPortalAiUsage({
      kind: 'chat',
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      modelId: result.modelId,
    })
  } catch (err) {
    console.warn('recommendGroupExercise: search grounding failed, trying without search', err)
    try {
      const result = await generateGeminiReply(EXERCISE_SYSTEM_PROMPT_NO_SEARCH, userPrompt, {
        temperature: 0.9,
        maxOutputTokens: 1100,
      })
      body = stripWhyNowSection(result.text).slice(0, 2800)
      await recordPortalAiUsage({
        kind: 'chat',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        modelId: result.modelId,
      })
    } catch (fallbackErr) {
      console.warn('recommendGroupExercise: Gemini failed, using offline fallback', fallbackErr)
      body = buildOfflineFallback(stats, muscleGroup)
    }
  }

  const qualities = extractMotorQualities(body)
  const header = buildExerciseHeader(stats, qualities, muscleGroup)
  return buildExerciseTelegramMessages(header, body)
}
