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
    tagline: 'Кабаньий типаж — сарказм, укол, ноль сюсюканья',
    teaser: 'Жёсткий и прямой. Не объясняет дважды. Похвала звучит как «Уже лучше» — и это максимум.',
    teachingManner: 'Манера: давление, повторение, сарказм',
    biography:
      'Родился в спортивном костюме. По крайней мере, сам так говорит. 58 боёв. 44 победы. 14 поражений до сих пор не признаёт. Тренирует 18 лет. За это время сменил 4 свистка, износил 11 пар кроссовок и довёл до слёз примерно 340 учеников. Все потом говорили спасибо.',
    aboutTrainer: [
      'Кабан Петрович — ходячий сарказм в спортивке. Не злой ради злости: просто не верит в сказки и не кормит соплями.',
      'Объясняет один раз. Второй — уже с фразой «ты серьёзно?». Похвала у него звучит как «Уже лучше» — и ученики потом этим хвастаются годами.',
    ],
    sampleQuote: 'Печально.',
    portraitSrc: '/personas/vasily.png',
    gymSceneSrc: '/student-portal/gym-vasily.png',
    note: 'Крючок: злость на себя, «сделаю назло».',
    phrases: {
      markOk: 'Ну наконец. Не позоришь — пока. Дальше.',
      markBlocked: 'Торопишься, гений. Три образа, включая тело — потом «Понял». Без кинестетики — галочка для слабаков.',
      markSaveFail: 'Не сохранилось. Жми ещё раз.',
      tierLocked: 'Сначала закрой этот этап. Без этого некуда.',
      welcomeBack: 'О, живой. Ну что — работаем или опять будем умничать без дела?',
      stagesIntro:
        'Четыре этапа: Знание → Умение → Навык → Автоматизация. Следующий — «Знание».',
      greetingDialog: [
        { from: 'trainer', text: 'Ну здравствуй. Кабан Петрович. Раз выбрал меня — не для селфи. Посмотрим, выдержишь или сольёшься на первом «сложно».' },
        { from: 'student', text: 'Здравствуйте. Готов работать.' },
        { from: 'trainer', text: '«Готов» — это когда три образа в голове и в теле, а не когда набрал в чат. Ладно, спрашивай — отвечу. Без соплей.' },
      ],
    },
  },
  {
    id: 'arkady',
    animal: 'Медведь',
    patronymic: 'Михайлович',
    roleLabel: 'Виртуальный тренер',
    accentRing: 'ring-[#9a6b45] bg-[#fff9f2]',
    tagline: 'Медвежий типаж — тепло, терпение, вера в тебя',
    teaser: 'Объяснит столько раз, сколько нужно. Не давит — но расслабляться не даст.',
    teachingManner: 'Манера: поддержка, терпение, пошаговость',
    biography:
      'В секцию пришёл в 8 лет — и остался на 30. 44 боя. 31 победа. После каждого поражения разбирал бой по косточкам и возвращался сильнее. Тренирует 14 лет. Говорит, что его главная победа — не в ринге, а когда ученик, который три раза хотел бросить, остался и дошёл до конца. Таких у него больше двухсот.',
    aboutTrainer: [
      'Медведь Михайлович — тот, к кому идут, когда страшно. Объяснит снова и снова, без вздоха. Верит в ученика раньше, чем ученик в себя.',
      'Не кричит и не давит. Но «бросим на потом» у него не проходит — мягко, по-человечески, пока не дойдёшь до шага.',
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
        'Друг, четыре этапа: Знание → Умение → Навык → Автоматизация. Начинаем со «Знания».',
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
    tagline: 'Соколиный типаж — протокол, критерий, ноль лирики',
    teaser: 'Не уговаривает — даёт критерий. Элемент выполнен правильно или нет. Третьего нет.',
    teachingManner: 'Манера: протокол, критерии, контроль',
    biography:
      'В бокс пришёл не за адреналином — за системой. 39 боёв. 34 победы. Проигрывал только тем, кто готовился лучше. Обиды не держал — разбирал, исправлял, выигрывал. Тренирует 12 лет. Ведёт записи по каждому ученику с первого занятия. Не потому что требуют — потому что без данных это не тренировка, а прогулка.',
    aboutTrainer: [
      'Сокол Станиславович не равнодушен — он вдумчив. Задаёт короткие вопросы, которые бьют в суть: «КМС — когда последний бой?», «Соревнования — срок есть?»',
      'Строг по форме, проницателен по смыслу. Не утешает и не подкалывает — но из его вопросов ученик сам видит, где стоит на самом деле.',
    ],
    sampleQuote: 'Засчитано. Дальше.',
    portraitSrc: '/personas/gleb.png',
    gymSceneSrc: '/student-portal/gym-gleb.png',
    phrases: {
      markOk: 'Засчитано. Следующий элемент.',
      markBlocked: 'Условие не выполнено. Три образа, включая кинестетику.',
      markSaveFail: 'Ошибка сохранения. Повтори.',
      tierLocked: 'Этап закрыт. Заверши текущий уровень.',
      welcomeBack: 'Сессия продолжается. Спрашивай — отвечу по критерию.',
      stagesIntro:
        'Схема: Знание → Умение → Навык → Автоматизация. Следующий этап — «Знание».',
      greetingDialog: [
        { from: 'trainer', text: 'Сокол Станиславович. Ты меня выбрал — буду вести программу чётко и по стандарту.' },
        { from: 'student', text: 'Принято. Здравствуй.' },
        { from: 'trainer', text: 'Можешь задать вопрос до перехода к этапам. Отвечаю по делу. Лишнего не будет.' },
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
