import { getPortalPersona, formatPortalPersonaName } from '../constants/studentPortalPersonas.js'
import { getPortalPersonaVoice } from '../constants/portalPersonaVoice.js'
import {
  isPortalPersonaAiRemoteEnabled,
} from '../utils/portalPersonaAiConfig.js'
import { callPortalPersonaChatFunction } from './portalPersonaAiRemote.js'
import {
  scriptedOnboardingGreetingNudge,
  scriptedOnboardingStagesReply,
} from '../utils/onboardingStagesChat.js'
import { assessThreeImagesAnswer, threeImagesCorrectionReply } from '../utils/portalKnowledgeThreeImages.js'

/** @typedef {{ role: 'user' | 'assistant', content: string }} PortalChatMessage */

/** @param {string[]} items */
function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0] ?? ''
}

/**
 * @param {import('../constants/studentPortalPersonas.js').typeof PORTAL_PERSONAS[number]} persona
 * @param {string} userMessage
 * @param {import('./portalPersonaAiPrompt.js').PortalPersonaChatContext} context
 * @param {PortalChatMessage[]} messages
 */
function scriptedPersonaReply(persona, userMessage, context, messages = []) {
  const text = userMessage.trim()
  const lower = text.toLowerCase()
  const voice = getPortalPersonaVoice(persona.id)
  const recentAssistant = messages.filter((m) => m.role === 'assistant').slice(-4).map((m) => m.content)

  /** @param {string[]} items */
  const pickUnique = (items) => {
    const fresh = items.filter((item) => !recentAssistant.includes(item))
    return pickRandom(fresh.length > 0 ? fresh : items)
  }

  if (!text) {
    if (persona.id === 'vasily') return 'Молчишь? Напиши — я не телепат. Спроси про программу или просто поздоровайся.'
    if (persona.id === 'arkady') return 'Я здесь, друг. Напиши что угодно — разберём вместе.'
    return 'Ожидаю сообщение. Формулируйте вопрос.'
  }

  if (/пережива|волну|тревож|страш|боюсь|не увер/i.test(lower)) {
    if (persona.id === 'vasily') {
      return pickUnique([
        'Переживаешь — норм. Я тоже перед первым боем думал, что завтра. Работаем сегодня: один шаг, три образа. Страх подождёт.',
        'Волнение — не приговор. Приговор — когда бросил. Сейчас просто закрой элемент. Остальное потом.',
      ])
    }
    if (persona.id === 'arkady') {
      return pickUnique([
        'Друг, переживать — значит, тебе не всё равно. Это хороший знак. Давай не гонять мысли вперёд — один элемент сегодня.',
        'Я рядом. Страх уходит, когда появляется понимание. Начнём с малого — спроси, что смущает конкретно.',
      ])
    }
    return pickUnique([
      'Тревога зафиксирована. Критерий работы не меняется: элемент, три образа, «Понял». Эмоции — после выполнения.',
      'Переживания не входят в протокол. Входит последовательность обучения. Продолжайте по программе.',
    ])
  }

  if (/соревн|выступ|бой\b|ринг|когда смог|когда буду/i.test(lower)) {
    if (persona.id === 'vasily') {
      return pickUnique([
        'На соревнования не по мечте ходят — по готовности. Сначала «Знание» здесь, потом зал, потом тренер скажет. Не торопи историю.',
        'Бои — когда техника держит, а не когда захотелось. Пройди программу, отработай в зале — и обсудим с тренером.',
      ])
    }
    if (persona.id === 'arkady') {
      return pickUnique([
        'Друг, соревнования придут, когда база будет жить в тебе — не только в голове. Сейчас «Знание», потом зал, потом решение тренера.',
        'Выступления — финал пути, не старт. Сначала элементы, потом уверенность в зале. Я помогу дойти — без гонки.',
      ])
    }
    return pickUnique([
      'Соревнования — вне этапа «Знание». Сначала программа платформы, очная работа, оценка тренера. Срок индивидуален.',
      'Выступление возможно после прохождения этапов и решения очного тренера. Сейчас — текущий элемент программы.',
    ])
  }

  if (/перв(ый|ом)|перед бой|о чем дум|что дум|как было|твой бой|твои бой/i.test(lower)) {
    if (persona.id === 'vasily') {
      return pickUnique([
        'Перед первым думал, что главное — не забыть перчатки. Ошибся. Главное — не сбежать. 58 боёв потом — а страх тот же, только короче. Тебе сейчас то же: не гоняй мысли, работай элемент.',
        'Думал, что меня сейчас убьют — и что я обязан ударить первым. Оба варианта не сработали. Сработала подготовка. Вот чем занимаемся.',
      ])
    }
    if (persona.id === 'arkady') {
      return pickUnique([
        'Перед первым боем думал только о дыхании — вдох, выдох, не убегать от себя. Проиграл — разобрал. Выиграл — тоже разобрал. С тобой начнём проще: один элемент, без гонки.',
        'Помню: руки дрожали, а тренер сказал — «смотри в глаза, не в пол». С тех пор так и учу. Твой «первый бой» — это первый честный «Понял» на платформе.',
      ])
    }
    return pickUnique([
      'Первый бой: протокол страха не регламентирован. Регламентирована подготовка. Сейчас — этап «Знание».',
      'Воспоминания не входят в критерий. Входит текущий элемент программы.',
    ])
  }

  if (/бух|пья|пробит|дура|туп|чмо|идиот|ты норм|с дуб|какаш/i.test(lower)) {
    if (persona.id === 'vasily') {
      return pickUnique([
        'Остро. Молодец. Теперь так же остро — про программу. Или это предел?',
        'Бухой я только от ваших отговорок. Переходи к делу — спроси нормально, отвечу.',
        'Пробитый? 58 боёв — и ты живой. Давай, удиви вопросом по делу.',
      ])
    }
    if (persona.id === 'arkady') {
      return pickUnique([
        'Эй, я на твоей стороне. Подкалывать можно — я не обижаюсь. Только потом давай по-взрослому, ок?',
        'Слышу, что ты напряжён — иногда это выходит шутками. Я здесь. Спроси по-честному.',
      ])
    }
    return pickUnique([
      'Оценка личности не запрашивалась. Запрос по программе — принимается.',
      'Комментарий зафиксирован. Вернёмся к обучению.',
    ])
  }

  if (/биограф|сколько бо|опыт|карьер|58|44 поб|лет трен/i.test(lower)) {
    if (persona.id === 'vasily') {
      return pickUnique([
        `${persona.biography?.slice(0, 120) ?? persona.teaser}… Спрашивай — но не всё сразу.`,
        '58 боёв. 44 победы. 14 поражений «не было» — шучу, были. Главное — 18 лет тренирую. Тебе сейчас важнее первый элемент, не моя статистика.',
      ])
    }
    if (persona.id === 'arkady') {
      return pickUnique([
        '44 боя, 31 победа — но главная цифра: больше двухсот учеников не бросили. Это моя гордость. А твоя — начать с первого шага.',
        `${persona.biography?.slice(0, 130) ?? persona.teaser}… С тобой — своя история, не копируй чужую.`,
      ])
    }
    return pickUnique([
      `${persona.biography?.slice(0, 100) ?? persona.teaser}. Двигаемся к текущему элементу.`,
    ])
  }

  if (/три образ|логик|зрен|кинест|тело|мышц|объясн/i.test(lower)) {
    const ex = voice.chatExamples.find((e) => /образ/i.test(e.user))
    if (ex) {
      const assessment = assessThreeImagesAnswer(text)
      if (!assessment.pass && /логик|зрен|кинест|тело|мышц|образ/i.test(lower)) {
        return threeImagesCorrectionReply(persona.id, assessment.missing, assessment.dismissesKinesthesia)
      }
      return ex.trainer
    }
  }

  if (context === 'onboarding_greeting') {
    const nudge = scriptedOnboardingGreetingNudge(persona.id, text)
    if (nudge) return nudge

    if (/^(привет|здрав|добр|хай|hello)/i.test(lower)) {
      if (persona.id === 'vasily') {
        return pickRandom([
          'Ну здравствуй. Я на связи. Можешь спросить что угодно — отвечу без сахара.',
          'Здорово. Кабан Петрович здесь. Не тяни — говори, что на душе.',
        ])
      }
      if (persona.id === 'arkady') {
        return pickRandom([
          'Привет! Рад тебя видеть. Спрашивай — я рядом, не тороплю.',
          'Здравствуй, друг. Давай познакомимся по-нормальному — что хочешь узнать?',
        ])
      }
      return pickRandom([
        'Приветствие принято. Можете задать вопрос до перехода к этапам.',
        'Здравствуйте. Готов ответить по программе.',
      ])
    }

    if (/готов|поехали|давай|начн|инструкт|этап|ступен|слушаю/i.test(lower)) {
      const nudgeReady = scriptedOnboardingGreetingNudge(persona.id, text)
      if (nudgeReady) return nudgeReady
      if (persona.id === 'vasily') return '«Готов» — это когда сделал, а не когда сказал. Сейчас расскажу про четыре ступени — жми «Дальше», когда скажу. ||READY_FOR_STAGES||'
      if (persona.id === 'arkady') return 'Отлично. Дальше — инструктаж про этапы. ||READY_FOR_STAGES||'
      return 'Принято. «Дальше» — инструктаж по этапам. ||READY_FOR_STAGES||'
    }

    if (/кто ты|как зовут|расскаж|ты кто/i.test(lower)) {
      const name = formatPortalPersonaName(persona)
      if (persona.id === 'vasily') return `Я ${name}. ${persona.teaser} Спроси — не кусаюсь. Почти.`
      if (persona.id === 'arkady') return `Я ${name}. ${persona.teaser} Расскажу сколько нужно.`
      return `Я ${name}. ${persona.teaser}`
    }
  }

  if (context === 'onboarding_stages') {
    return scriptedOnboardingStagesReply(persona.id, text, messages)
  }

  if (context === 'program') {
    if (/понял|кнопк|отмет|сохран/i.test(lower)) {
      if (persona.id === 'vasily') return 'Три образа — логика, зрение и кинестетика в мышцах — потом «Понял». Иначе рано. Не пытайся меня наебать — наебёшь себя.'
      if (persona.id === 'arkady') return 'Сначала три образа — включая прочувствованное в теле — потом «Понял». Так мы честно фиксируем «Знание».'
      return 'Критерий: логика, зрение, кинестетика → «Понял». Иначе элемент не засчитан.'
    }

    if (/знани|этап|стади|умени|навык|автомат/i.test(lower)) {
      return persona.phrases.stagesIntro
    }

    if (/дальше|следующ|что делать|куда|как уч/i.test(lower)) {
      if (persona.id === 'vasily') return 'Элемент → три образа (логика, зрение, кинестетика) → «Понял». По порядку. Скучно, зато работает.'
      if (persona.id === 'arkady') return 'Посмотри видео, проживи три образа — включая ощущение в теле — нажми «Понял». Следующий сам откроется.'
      return 'Алгоритм: элемент → логика, зрение, кинестетика → «Понял». Следующий откроется автоматически.'
    }

    if (/закрыт|уров|откро|комбо/i.test(lower)) {
      return persona.phrases.tierLocked
    }
  }

  if (/спасиб|благодар/i.test(lower)) {
    if (persona.id === 'vasily') return 'Не за что. Лучший спасибо — «Понял» на следующем элементе.'
    if (persona.id === 'arkady') return 'Всегда, друг. Главное — не бросай.'
    return 'Благодарность не входит в протокол. Продолжайте работу.'
  }

  if (/скуч|устал|лень|не хоч/i.test(lower)) {
    if (persona.id === 'vasily') return `${pickRandom(voice.speechTics)} Лень — тоже выбор. Мой — дожать элемент. Твой?`
    if (persona.id === 'arkady') return 'Понимаю. Сделай один маленький шаг — и решишь, продолжать или нет. Я подожду.'
    return 'Усталость фиксирую. Критерий элемента не меняется. Пауза — ваше решение.'
  }

  if (persona.id === 'vasily') {
    return pickUnique([
      `${pickRandom(voice.speechTics)} Услышал. Отвечу по делу: что именно — программа, элемент или страх?`,
      `Вопрос норм. Сначала «Знание» закрываем, потом зал. ${persona.sampleQuote} — но не сдаёмся.`,
      `Не тяни кота. Сформулируй одним предложением — переживаешь, не понимаешь, или когда бой?`,
    ])
  }
  if (persona.id === 'arkady') {
    return pickUnique([
      `${pickRandom(voice.speechTics)} Слышу тебя. Расскажи чуть подробнее — разберём без спешки.`,
      `Хороший повод поговорить. ${persona.sampleQuote} Что из этого главное для тебя сейчас?`,
      `Давай так: что ты хочешь понять — про программу, про себя или про будущие бои?`,
    ])
  }
  return pickUnique([
    `Уточните запрос: программа, элемент или сроки. ${persona.sampleQuote}`,
    `${pickRandom(voice.speechTics)} Нужна конкретика — отвечу по критерию «Знание».`,
  ])
}

/**
 * @param {{
 *   personaId: unknown,
 *   messages: PortalChatMessage[],
 *   context?: import('./portalPersonaAiPrompt.js').PortalPersonaChatContext,
 *   programHint?: string | null,
 *   personaMemory?: import('../utils/portalPersonaMemory.js').PortalPersonaMemory | null,
 *   trainingGoals?: unknown,
 * }} params
 * @returns {Promise<{ reply: string, source: import('../utils/portalPersonaAiConfig.js').PortalPersonaReplySource }>}
 */
export async function sendPortalPersonaChatMessage({
  personaId,
  messages,
  context = 'general',
  programHint = null,
  personaMemory = null,
  trainingGoals = null,
}) {
  const persona = getPortalPersona(personaId)
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userMessage = lastUser?.content ?? ''

  const useRemote = isPortalPersonaAiRemoteEnabled()

  if (useRemote) {
    try {
      const reply = await callPortalPersonaChatFunction({
        personaId: persona.id,
        messages,
        context,
        programHint,
        personaMemory,
        trainingGoals,
      })
      if (reply?.trim()) return { reply: reply.trim(), source: 'ai' }
    } catch (err) {
      console.warn('[portalPersonaAi] remote failed, using scripted fallback', err)
      await new Promise((r) => setTimeout(r, 450 + Math.random() * 550))
      return {
        reply: scriptedPersonaReply(persona, userMessage, context, messages),
        source: 'script-fallback',
      }
    }
  }

  await new Promise((r) => setTimeout(r, 450 + Math.random() * 550))
  return {
    reply: scriptedPersonaReply(persona, userMessage, context, messages),
    source: 'script',
  }
}

export function isPortalPersonaAiRemoteConfigured() {
  return isPortalPersonaAiRemoteEnabled()
}
