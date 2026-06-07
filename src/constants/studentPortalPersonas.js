/** @typedef {'vasily' | 'arkady' | 'gleb'} PortalPersonaId */

/** @typedef {{ markOk: string, markBlocked: string, markSaveFail: string, tierLocked: string, welcomeBack: string }} PortalPersonaPhrases */

/** @type {Array<{ id: PortalPersonaId, animal: string, patronymic: string, roleLabel: string, accentRing: string, tagline: string, sampleQuote: string, portraitSrc: string, note?: string, phrases: PortalPersonaPhrases }>} */
export const PORTAL_PERSONAS = [
  {
    id: 'vasily',
    animal: 'Кабан',
    patronymic: 'Петрович',
    roleLabel: 'Виртуальный тренер',
    accentRing: 'ring-[#c44b3f] bg-[#fff5f4]',
    tagline: 'Жёсткий типаж — мотивация через упрямство',
    sampleQuote: 'Не то. Ещё раз — нормально.',
    portraitSrc: '/personas/vasily.png',
    note: 'Крючок: злость на себя, «сделаю назло».',
    phrases: {
      markOk: 'Наконец нормально. Дальше.',
      markBlocked: 'Торопишься. Сначала три образа — потом «Понял».',
      markSaveFail: 'Не сохранилось. Жми ещё раз.',
      tierLocked: 'Сначала закрой этот этап. Без этого некуда.',
      welcomeBack: 'Ну что, продолжаем. Без соплей.',
    },
  },
  {
    id: 'arkady',
    animal: 'Медведь',
    patronymic: 'Михайлович',
    roleLabel: 'Виртуальный тренер',
    accentRing: 'ring-[#9a6b45] bg-[#fff9f2]',
    tagline: 'Тёплый типаж — вера и поддержка',
    sampleQuote: 'Давай. Ты уже почти схватил.',
    portraitSrc: '/personas/arkady.png',
    phrases: {
      markOk: 'Вот так! Следующий — справишься.',
      markBlocked: 'Подожди. Логика, зрение и тело — потом «Понял».',
      markSaveFail: 'Что-то пошло не так. Попробуй ещё раз.',
      tierLocked: 'Сначала весь этот этап — потом откроется следующий.',
      welcomeBack: 'С возвращением. Продолжим спокойно.',
    },
  },
  {
    id: 'gleb',
    animal: 'Сокол',
    patronymic: 'Станиславович',
    roleLabel: 'Виртуальный тренер',
    accentRing: 'ring-[#2d81e0] bg-[#f0f6ff]',
    tagline: 'Холодный типаж — только стандарт',
    sampleQuote: 'Три образа есть. Засчитано. Дальше.',
    portraitSrc: '/personas/gleb.png',
    phrases: {
      markOk: 'Засчитано. Следующий элемент.',
      markBlocked: 'Условие не выполнено. Три образа.',
      markSaveFail: 'Ошибка сохранения. Повторите.',
      tierLocked: 'Этап закрыт. Завершите текущий уровень.',
      welcomeBack: 'Продолжаем программу.',
    },
  },
]

const PERSONA_IDS = new Set(PORTAL_PERSONAS.map((p) => p.id))

/** @param {{ animal: string, patronymic: string }} persona */
export function formatPortalPersonaName(persona) {
  return `${persona.animal} ${persona.patronymic}`
}

/** @param {unknown} raw @returns {PortalPersonaId} */
export function normalizePortalPersonaId(raw) {
  const id = typeof raw === 'string' ? raw.trim() : ''
  if (PERSONA_IDS.has(/** @type {PortalPersonaId} */ (id))) {
    return /** @type {PortalPersonaId} */ (id)
  }
  return 'arkady'
}

/** @param {unknown} raw */
export function getPortalPersona(raw) {
  return PORTAL_PERSONAS.find((p) => p.id === normalizePortalPersonaId(raw)) ?? PORTAL_PERSONAS[1]
}

/** @param {unknown} raw */
export function portalPersonaDisplayName(raw) {
  return formatPortalPersonaName(getPortalPersona(raw))
}

/** @param {unknown} raw */
export function portalPersonaShortLabel(raw) {
  return getPortalPersona(raw).animal
}
