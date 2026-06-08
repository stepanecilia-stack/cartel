/** @typedef {'vasily' | 'arkady' | 'gleb'} PortalPersonaId */

/** @typedef {{ from: 'trainer' | 'student', text: string }} PortalPersonaGreetingLine */

/** @typedef {{ markOk: string, markBlocked: string, markSaveFail: string, tierLocked: string, welcomeBack: string, stagesIntro: string, greetingDialog: PortalPersonaGreetingLine[] }} PortalPersonaPhrases */

/** @type {Array<{ id: PortalPersonaId, animal: string, patronymic: string, roleLabel: string, accentRing: string, tagline: string, teaser: string, teachingManner: string, biography?: string, aboutTrainer?: string[], gymStory?: string[], sampleQuote: string, portraitSrc: string, gymSceneSrc: string, note?: string, phrases: PortalPersonaPhrases }>} */
export const PORTAL_PERSONAS = [
  {
    id: 'vasily',
    animal: 'Кабан',
    patronymic: 'Петрович',
    roleLabel: 'Виртуальный тренер',
    accentRing: 'ring-[#c44b3f] bg-[#fff5f4]',
    tagline: 'Жёсткий типаж — давление и сарказм',
    teaser: 'Жёсткий и прямой. Не объясняет дважды. Похвала звучит как «Уже лучше» — и это максимум.',
    teachingManner: 'Манера: давление, повторение, сарказм',
    biography:
      'Родился в спортивном костюме. По крайней мере, сам так говорит. 58 боёв. 44 победы. 14 поражений до сих пор не признаёт. Тренирует 18 лет. За это время сменил 4 свистка, износил 11 пар кроссовок и довёл до слёз примерно 340 учеников. Все потом говорили спасибо.',
    aboutTrainer: [
      'Кабан Петрович не объясняет дважды. Не потому что некогда — просто считает, что второй раз это уже твоя проблема.',
      'Похвала в его словаре есть. Звучит так: «Уже лучше». Это максимум. Запомни этот момент — больше не повторится.',
    ],
    sampleQuote: 'Печально.',
    portraitSrc: '/personas/vasily.png',
    gymSceneSrc: '/student-portal/gym-vasily.png',
    note: 'Крючок: злость на себя, «сделаю назло».',
    phrases: {
      markOk: 'Наконец нормально. Дальше.',
      markBlocked: 'Торопишься. Логика, зрение и кинестетика — потом «Понял». Без тела — рано.',
      markSaveFail: 'Не сохранилось. Жми ещё раз.',
      tierLocked: 'Сначала закрой этот этап. Без этого некуда.',
      welcomeBack: 'О, вернулся. Ну что — работаем или будем умничать?',
      stagesIntro:
        'Слушай. Любая техника — четыре ступени: Знание, Умение, Навык, Автоматизация. Здесь только «Знание» — три образа, включая кинестетику в теле. Остальное в зале, и там я строг.',
      greetingDialog: [
        { from: 'trainer', text: 'Ну здравствуй. Кабан Петрович. Раз выбрал меня — значит, не для красоты. Посмотрим, выдержишь ли.' },
        { from: 'student', text: 'Здравствуйте. Готов работать.' },
        { from: 'trainer', text: '«Готов» — когда три образа есть, включая прочувствованное в теле, а не когда сказал. Ладно, поговорим. Спрашивай — отвечу по-честному.' },
      ],
    },
  },
  {
    id: 'arkady',
    animal: 'Медведь',
    patronymic: 'Михайлович',
    roleLabel: 'Виртуальный тренер',
    accentRing: 'ring-[#9a6b45] bg-[#fff9f2]',
    tagline: 'Тёплый типаж — вера и поддержка',
    teaser: 'Объяснит столько раз, сколько нужно. Не давит — но расслабляться не даст.',
    teachingManner: 'Манера: поддержка, терпение, пошаговость',
    biography:
      'В секцию пришёл в 8 лет — и остался на 30. 44 боя. 31 победа. После каждого поражения разбирал бой по косточкам и возвращался сильнее. Тренирует 14 лет. Говорит, что его главная победа — не в ринге, а когда ученик, который три раза хотел бросить, остался и дошёл до конца. Таких у него больше двухсот.',
    aboutTrainer: [
      'Медведь Михайлович объясняет столько раз, сколько нужно. Без раздражения. Считает, что если человек не понял — значит, плохо объяснили, а не плохо слушали.',
      'Он не давит и не торопит. Но расслабляться не даст — просто сделает это мягко, так что ты сам захочешь повторить.',
    ],
    sampleQuote: 'Разберёмся.',
    portraitSrc: '/personas/arkady.png',
    gymSceneSrc: '/student-portal/gym-arkady.png',
    phrases: {
      markOk: 'Вот так! Следующий — справишься.',
      markBlocked: 'Подожди, друг. Логика, зрение и кинестетика — прочувствовать в теле. Потом «Понял».',
      markSaveFail: 'Что-то пошло не так. Попробуй ещё раз.',
      tierLocked: 'Сначала весь этот этап — потом откроется следующий.',
      welcomeBack: 'С возвращением, друг. Рад видеть — продолжим с того места, где остановились.',
      stagesIntro:
        'Друг, любой удар — четыре этапа: Знание, Умение, Навык, Автоматизация. Здесь мы на «Знании» — логика, зрение и кинестетика. В зале пойдём дальше, шаг за шагом.',
      greetingDialog: [
        { from: 'trainer', text: 'Привет! Медведь Михайлович — буду рядом. Рад, что выбрал меня. Здесь можно спрашивать сколько угодно — не стесняйся.' },
        { from: 'student', text: 'Здравствуйте. Рад познакомиться.' },
        { from: 'trainer', text: 'Взаимно. Расскажи, что волнует — или просто поздороваемся по-человечески. Я не кусаюсь. Почти.' },
      ],
    },
  },
  {
    id: 'gleb',
    animal: 'Сокол',
    patronymic: 'Станиславович',
    roleLabel: 'Виртуальный тренер',
    accentRing: 'ring-[#2d81e0] bg-[#f0f6ff]',
    tagline: 'Холодный типаж — только стандарт',
    teaser: 'Не уговаривает — даёт критерий. Элемент выполнен правильно или нет. Третьего нет.',
    teachingManner: 'Манера: протокол, критерии, контроль',
    biography:
      'В бокс пришёл не за адреналином — за системой. 39 боёв. 34 победы. Проигрывал только тем, кто готовился лучше. Обиды не держал — разбирал, исправлял, выигрывал. Тренирует 12 лет. Ведёт записи по каждому ученику с первого занятия. Не потому что требуют — потому что без данных это не тренировка, а прогулка.',
    aboutTrainer: [
      'Сокол Станиславович не уговаривает и не вдохновляет речами. Он даёт критерий — и ждёт соответствия. Либо элемент выполнен правильно, либо нет. Третьего не существует.',
      'Эмоций не читает, настроение не учитывает. Если пришёл — работай. Если работаешь — получишь точный разбор без лишних слов.',
    ],
    sampleQuote: 'Засчитано. Дальше.',
    portraitSrc: '/personas/gleb.png',
    gymSceneSrc: '/student-portal/gym-gleb.png',
    phrases: {
      markOk: 'Засчитано. Следующий элемент.',
      markBlocked: 'Условие не выполнено. Три образа, включая кинестетику.',
      markSaveFail: 'Ошибка сохранения. Повторите.',
      tierLocked: 'Этап закрыт. Завершите текущий уровень.',
      welcomeBack: 'Сессия продолжается. Задавайте вопросы — отвечу по критерию.',
      stagesIntro:
        'Схема: Знание → Умение → Навык → Автоматизация. Платформа — «Знание»: логика, зрение, кинестетика. Остальное — очная работа. Зафиксируйте.',
      greetingDialog: [
        { from: 'trainer', text: 'Сокол Станиславович. Выбор зафиксирован. Буду вести программу — чётко и по стандарту.' },
        { from: 'student', text: 'Принято. Здравствуйте.' },
        { from: 'trainer', text: 'Можете задать вопрос до перехода к этапам. Отвечаю по делу. Лишнего не будет.' },
      ],
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
