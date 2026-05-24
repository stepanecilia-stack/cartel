/**
 * Лестница Cartel: путь к соревнованиям по этапам подготовки.
 * @typedef {'base' | 'functional' | 'combat' | 'documents' | 'competition'} CartelStageId
 */

/** @type {Array<{ id: CartelStageId, title: string, subtitle: string }>} */
export const CARTEL_STAGES = [
  {
    id: 'base',
    title: 'База',
    subtitle: '29 приёмов на «Умение» и зачёты по нормативам.',
  },
  {
    id: 'functional',
    title: 'Функционал',
    subtitle:
      'Минимум: 3 серебра и 1 бронза по нормативам (золото — в приоритете). Качества и спецзачёт.',
  },
  {
    id: 'combat',
    title: 'Боевая практика',
    subtitle: 'Спарринги и матчевые встречи.',
  },
  {
    id: 'documents',
    title: 'Документы',
    subtitle: 'Паспорт боксёра, книжка, МРТ, УМО, страховка.',
  },
  {
    id: 'competition',
    title: 'Соревнования',
    subtitle: 'Старты на календаре и подготовка по плану.',
  },
]

export const CARTEL_RULE_TEXT =
  'Этапы и календарь стартов открывает только тренер. Приложение считает зачёты и подсказывает, что закрыть; досрочный допуск — в исключительных случаях.'

/** Пояснение к порогу нормативов на этапе «Функционал». */
export const CARTEL_FUNCTIONAL_NORMS_NOTE =
  'Минимум для этапа — 3 серебра и 1 бронза; золото по нормативам — главная цель и всегда в приоритете.'

/** Пороги подсказки «по цифрам можно следующий этап» (решение за тренером). */
export const CARTEL_GATES = {
  base: {
    requireAllAtomsAtSkill: true,
    normsPassedMin: 3,
  },
  functional: {
    normsSilverMin: 3,
    normsBronzeMin: 1,
    motorQualityPassesMin: 13,
    requireSpecialPass: true,
  },
  combat: {
    sparringMin: 5,
    matchMin: 5,
  },
  documents: {
    requireAllDocuments: true,
  },
  competition: {
    requireCoachStart: true,
    requirePrepPlan: true,
  },
}

const STAGE_ORDER = /** @type {CartelStageId[]} */ ([
  'base',
  'functional',
  'combat',
  'documents',
  'competition',
])

/** Старые id карточек → новая лестница. */
const LEGACY_STAGE_MAP = {
  train: 'base',
  club: 'functional',
  rank: 'documents',
  federation: 'competition',
  peak: 'competition',
}

/** @param {unknown} raw @returns {CartelStageId} */
export function normalizeCartelStage(raw) {
  const id = typeof raw === 'string' ? raw : ''
  if (STAGE_ORDER.includes(/** @type {CartelStageId} */ (id))) {
    return /** @type {CartelStageId} */ (id)
  }
  const mapped = LEGACY_STAGE_MAP[/** @type {keyof typeof LEGACY_STAGE_MAP} */ (id)]
  return mapped ?? 'base'
}

/** @param {CartelStageId} stage */
export function cartelStageMeta(stage) {
  return CARTEL_STAGES.find((s) => s.id === stage) ?? CARTEL_STAGES[0]
}

/** @param {CartelStageId} a @param {CartelStageId} b */
export function compareCartelStage(a, b) {
  return STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b)
}

/** @param {CartelStageId} stage */
export function nextCartelStage(stage) {
  const i = STAGE_ORDER.indexOf(stage)
  return i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null
}

/**
 * @param {CartelStageId} stage
 * @returns {{ training: string[], focus: string }}
 */
export function defaultTrainingForStage(stage) {
  switch (stage) {
    case 'base':
      return {
        focus: 'Закрыть базу: все приёмы на «Умение» и нормативы.',
        training: [
          'Школа бокса: связки, ноги, защита — качество важнее темпа',
          'Снаряды 3–4 раунда в среднем темпе',
          'Сдать или улучшить нормативы — зафиксировать в карточке',
        ],
      }
    case 'functional':
      return {
        focus: 'Функционал: минимум 3 серебра и 1 бронза; цель — золото по нормативам.',
        training: [
          'Нормативы: в приоритете золото; для этапа — минимум 3 серебра и 1 бронза',
          'Упражнения из банка качеств — отмечать зачёты',
          'Спецзачёт — по «Плану подготовки» (отметка тренера)',
        ],
      }
    case 'combat':
      return {
        focus: 'Боевая практика: спарринги и матчи.',
        training: [
          'Техника в паре 4×2:00 — чистота ударов',
          'Условный спарринг / матч — отметить в сезоне',
          'Разбор после: что тянуть в зал',
        ],
      }
    case 'documents':
      return {
        focus: 'Собрать документы с актуальными датами.',
        training: [
          'Проверить сроки МРТ (2 года) и УМО (6 мес.)',
          'Паспорт боксёра и квалификационная книжка',
          'Спортивная страховка',
        ],
      }
    case 'competition':
      return {
        focus: 'Старт на календаре и план подготовки.',
        training: [
          'Следовать блокам на календаре (база → темп → спарринги)',
          'Контроль веса и режима',
          'Сон и активация перед боем',
        ],
      }
    default:
      return { focus: 'Тренировка по плану.', training: ['Школа бокса', 'Снаряды'] }
  }
}
