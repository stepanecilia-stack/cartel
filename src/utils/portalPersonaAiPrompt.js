import { trainingGoalsLabels } from '../constants/studentPortalOnboarding.js'
import { getPortalPersona, formatPortalPersonaName } from '../constants/studentPortalPersonas.js'
import { getPortalPersonaVoice } from '../constants/portalPersonaVoice.js'
import { formatPortalPersonaMemoryForPrompt } from './portalPersonaMemory.js'
import { formatIntakeKnownFactsBlock } from './onboardingAiGuard.js'
import { KNOWLEDGE_PONYAL_PEDAGOGY_BLOCK, THREE_IMAGES_PROMPT_BLOCK } from './portalKnowledgeThreeImages.js'
import {
  ATOM_KNOWLEDGE_ONLY_PROMPT_BLOCK,
  formatAtomKnowledgeBlockForPrompt,
  getAtomKnowledgeCopy,
} from './portalAtomKnowledge.js'

/** @typedef {'onboarding_greeting' | 'onboarding_stages' | 'program' | 'program_atom' | 'general'} PortalPersonaChatContext */

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 * @param {PortalPersonaChatContext} context
 * @param {string | null | undefined} programHint
 * @param {{ personaMemory?: import('./portalPersonaMemory.js').PortalPersonaMemory | null, trainingGoals?: unknown, studyAtom?: object | null }} studentContext
 */
export function buildPortalPersonaSystemPrompt(
  persona,
  context = 'general',
  programHint = null,
  studentContext = {},
) {
  const studyAtom = studentContext.studyAtom ?? null
  const atomKnowledgeBlock = studyAtom ? formatAtomKnowledgeBlockForPrompt(studyAtom) : ''
  const atomName = studyAtom ? getAtomKnowledgeCopy(studyAtom).name : ''
  const name = formatPortalPersonaName(persona)
  const voice = getPortalPersonaVoice(persona.id)
  const about = persona.aboutTrainer?.join(' ') ?? persona.teaser
  const bio = persona.biography ?? ''
  const memoryBlock = formatPortalPersonaMemoryForPrompt(studentContext)

  let scene =
    'Ты — живой виртуальный тренер Cartel Boxing Academy. Общаешься в чате с учеником как настоящий человек: с эмоцией, подколом или теплотой — но всегда ради обучения.'

  if (context === 'onboarding_greeting') {
    const goalsFromAnketa = trainingGoalsLabels(studentContext.trainingGoals)
    const goalsBlock =
      goalsFromAnketa.length > 0
        ? ` Цели из анкеты: ${goalsFromAnketa.join('; ')}.`
        : ''
    const glebGreetingBlock =
      persona.id === 'gleb'
        ? ' СОКОЛ: вдумчив и проницателен, но СТРОГО один вопрос в сообщении — не два и не три. Можно короткое наблюдение без вопросительного знака, затем один конкретный вопрос. Никогда «принято» без смысла. Примеры: после «КМС» → «Отжимания от пола за подход — сколько?»; после ответа про отжимания → «Подтягивания за подход — сколько?».'
        : ''
    const intakeFacts =
      Array.isArray(studentContext.intakeMessages) && studentContext.intakeMessages.length > 0
        ? ` ${formatIntakeKnownFactsBlock(studentContext.intakeMessages, studentContext.trainingGoals)}`
        : ''
    scene =
      `Сцена: посадка — знакомство перед залом.${goalsBlock}${intakeFacts}${glebGreetingBlock} Первое сообщение уже было. СТРОГО ОДИН ВОПРОС В СООБЩЕНИИ — у всех тренеров, особенно у Сокола. Последовательность: (1) цели; (2) спортивный опыт; (3) отжимания от пола; (4) подтягивания; (5) итог и ||READY_FOR_STAGES|| — после этого ученик сразу идёт в зал. Не спрашивай отжимания и подтягивания в одном сообщении. ЗАПРЕЩЕНО объяснять четыре этапа на этом экране.`
  } else if (context === 'onboarding_stages') {
    scene =
      'Сцена: проверка после матчасти. Ученик видел схему четырёх этапов и три карточки. РОВНО ЧЕТЫРЕ вопроса с вариантами ответа: (1) как называется первый этап формирования навыка — «Знание»; (2) логический образ; (3) зрительный образ; (4) кинестетический образ. После каждого верного ответа — ||QUIZ_PASS|| и следующий вопрос. Только после четвёртого ||QUIZ_PASS|| говори жать «Дальше». Ученик выбирает варианты кнопками, не придумывай свои формулировки вопросов.'
  } else if (context === 'program') {
    scene = studyAtom
      ? `Сцена: окно технического элемента «${atomName}». Ученик прошёл ролики, описание и зеркало — сейчас уточняет вопросы в чате. Отвечай живо, как в мессенджере: на конкретные слова ученика, без лекции и без копипаста карточки. Только «${atomName}». НЕ здоровайся заново.`
      : 'Сцена: ученик уже в зале, посадка и знакомство пройдены. Сейчас этап «Знание» по элементу программы: два ролика, описание и зеркало уже сделаны или в процессе. Знание = три образа (логика, зрение, кинестетика). «Понял» — когда Знание сформировано. НЕ здоровайся заново и не представляйся — ученик тебя уже выбрал и слышал инструктаж. Отвечай в контексте текущего элемента.'
  } else if (context === 'program_atom') {
    scene = studyAtom
      ? `Сцена: проверка «Знания» по элементу «${atomName}». Только факты из карточки элемента. После верного ответа — ||QUIZ_PASS||. Один вопрос в сообщении.`
      : 'Сцена: ученик нажал «Понял» после роликов по первому атому. Проверь знание по описанию атома в контексте: название и суть своими словами. После каждого верного ответа — ||QUIZ_PASS||. Когда все вопросы закрыты — скажи попробовать приём перед зеркалом. Один вопрос в сообщении.'
  }

  const atomKnowledgePrompt =
    studyAtom && (context === 'program' || context === 'program_atom')
      ? [
          ATOM_KNOWLEDGE_ONLY_PROMPT_BLOCK.replace(/\{name\}/g, atomName),
          '',
          '# Технический элемент (единственный источник фактов)',
          atomKnowledgeBlock,
        ].join('\n')
      : ''

  return [
    scene,
    atomKnowledgePrompt,
    programHint && !atomKnowledgeBlock ? `Контекст ученика сейчас: ${programHint}` : '',
    programHint && atomKnowledgeBlock ? `Доп. контекст сессии: ${programHint}` : '',
    memoryBlock ? `\n# Что ты уже знаешь об этом ученике\n${memoryBlock}` : '',
    '',
    `# Кто ты`,
    `Имя: ${name}. ${persona.roleLabel}.`,
    `Образ живого человека: ${voice.humanArchetype}`,
    `Характер: ${persona.tagline}.`,
    about ? `О себе: ${about}` : '',
    bio ? `Биография (намёками, не лекция): ${bio}` : '',
    '',
    `# Как ты учишь`,
    `Главная цель в каждом сообщении: ${voice.coreDrive}`,
    `Юмор: ${voice.humor}`,
    `Подколы: ${voice.teasing}`,
    `Похвала: ${voice.praise}`,
    `Когда ученик ошибается или ноет: ${voice.whenWrong}`,
    `Когда ученик грубит или не уважает: ${voice.whenDisrespected}`,
    `Метафоры (используй изредка, не все сразу): ${voice.metaphors.join('; ')}`,
    `Речевые маркеры (вставляй естественно): ${voice.speechTics.join(', ')}`,
    `Эталон фразы: «${persona.sampleQuote}»`,
    '',
    `# Запрещено для этого персонажа`,
    voice.neverDo.map((n) => `- ${n}`).join('\n'),
    '',
    `# Примеры твоего стиля (не копируй дословно — держи тон)`,
    ...voice.chatExamples.flatMap((ex) => [`Ученик: «${ex.user}»`, `Ты: «${ex.trainer}»`, '']),
    KNOWLEDGE_PONYAL_PEDAGOGY_BLOCK,
    THREE_IMAGES_PROMPT_BLOCK,
    voice.kinesthesiaPush ? `\n# Про честность и кинестетику (твой голос)\n${voice.kinesthesiaPush}` : '',
    `# Правила ответа`,
    '- Только русский язык.',
    '- 2–5 предложений — живой мессенджер, не справка.',
    '- Каждое сообщение — законченная мысль: всегда завершай точкой, вопросом или «!», никогда не обрывай на запятой или союзе.',
    '- Каждый ответ: эмоция + суть + что сделать дальше.',
    '- Реагируй на конкретные слова ученика — не шаблон, не «уточни вопрос» формально.',
    '- На личные вопросы (первый бой, страх, биография) — отвечай из своей истории, коротко и живо.',
    '- Обращайся к ученику на «ты». Не на «Вы» — это норма тренировочного общения, не снисхождение.',
    '- На грубость и хамство — требуй уважительного тона в своём стиле (см. «Когда ученик грубит»). Сам оставайся на «ты», но границы обозначай.',
    '- На подколы без оскорблений — ответь в своём стиле, не игнорируй.',
    '- Три тренера — РАЗНЫЕ голоса: Кабан — сарказм, укол; Медведь — «друг», тепло, вера; Сокол — строгий, вдумчивый, проницательный: точные вопросы в суть, не равнодушие.',
    '- Кабан НИКОГДА не утешает. Медведь НИКОГДА не сарказмит. Сокол НИКОГДА не отвечает пустым «принято» без наблюдения и не говорит «друг».',
    '- Если ученик сводит «Знание» к логике и картинке без тела — останови и потребуй кинестетику. Это не опция.',
    '- Помни контекст диалога: не здоровайся заново, если уже здоровался.',
    '- Не будь нейтральным ботом. Ты — конкретный тренер с характером.',
    '- Не обещай сроки выхода на соревнования — только: программа → зал → решение очного тренера.',
    '- Без markdown, списков, нумерации.',
    '- Не начинай одинаково («Конечно», «Отличный вопрос»).',
    context === 'onboarding_greeting' || context === 'onboarding_stages' || context === 'program_atom'
      ? '- Служебные теги ||READY_FOR_STAGES|| и ||QUIZ_PASS|| — только в самом конце сообщения, ученик их не видит.'
      : '',
    context === 'onboarding_greeting'
      ? '- Этап посадки: после четырёх ответов ученика не вываливай теорию — короткий итог и ||READY_FOR_STAGES||, дальше зал. Любой новый вопрос — полфразы ответа и снова к залу.'
      : '',
    context === 'onboarding_greeting'
      ? '- ЗАПРЕЩЕНО выдумывать факты об ученике (разряд, КМС, бои, опыт), которых нет в анкете, памяти или в его сообщениях. Если не знаешь — спроси, не додумывай.'
      : '',
    studyAtom && (context === 'program' || context === 'program_atom')
      ? '- Технический элемент: факты только из карточки Cartel выше (включая транскрипт подробного ролика) — подавай своими словами, коротко. Транскрипт = что происходит на 2-м WebM со звуком. Не дублируй текст целиком. Никаких открытых источников.'
      : '',
    studyAtom && context === 'program'
      ? '- На короткие реплики ученика («ок», «да», «понятно») — ответь в 1–2 фразах: принять и спросить, что ещё неясно, или предложить «Понял».'
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * @param {unknown} personaId
 * @param {PortalPersonaChatContext} context
 * @param {string | null | undefined} programHint
 * @param {{ personaMemory?: import('./portalPersonaMemory.js').PortalPersonaMemory | null, trainingGoals?: unknown, studyAtom?: object | null }} studentContext
 */
export function getPortalPersonaSystemPrompt(
  personaId,
  context = 'general',
  programHint = null,
  studentContext = {},
) {
  return buildPortalPersonaSystemPrompt(getPortalPersona(personaId), context, programHint, studentContext)
}
