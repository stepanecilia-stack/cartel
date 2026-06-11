import { getPortalPersona, formatPortalPersonaName } from '../constants/studentPortalPersonas.js'
import { getPortalPersonaVoice } from '../constants/portalPersonaVoice.js'
import {
  isPortalPersonaAiRemoteEnabled,
} from '../utils/portalPersonaAiConfig.js'
import { callPortalPersonaChatFunction } from './portalPersonaAiRemote.js'
import {
  getGreetingIntakeProgress,
  intakeCompleteRedirectReply,
  scriptedOnboardingGreetingReply,
} from '../utils/onboardingGreetingChat.js'
import { enrichOnboardingStagesReply, scriptedOnboardingStagesReply } from '../utils/onboardingStagesChat.js'
import { buildOnboardingSkipAllowReply, detectOnboardingSkipIntent } from '../utils/onboardingSkipIntent.js'
import { deriveProgramAtomQuizPasses, scriptedProgramAtomReply } from '../utils/programAtomChat.js'
import {
  aiReplyUsesExternalBoxingKnowledge,
  scriptedProgramElementReply,
} from '../utils/portalAtomKnowledge.js'
import { scriptedPortalNormsReply, isSelfReportedNormData } from '../utils/portalNormsChat.js'
import { isNormExecutionQuestion } from '../data/portalNormExecutionRules.js'
import { advanceNormSubmitFlow } from '../utils/portalNormsSubmitFlow.js'
import { MARKER_QUIZ_PASS } from '../utils/personaChatMarkers.js'
import { aiReplyInventsStudentRank, buildIntakeFactsCorpus } from '../utils/onboardingAiGuard.js'
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
function enrichProgramAtomReply(userMessage, messages, rawReply, atom) {
  const before = deriveProgramAtomQuizPasses(messages.slice(0, -1), atom)
  const withReply = [...messages, { role: 'assistant', content: String(rawReply ?? '').trim() }]
  const after = deriveProgramAtomQuizPasses(withReply, atom)
  let reply = String(rawReply ?? '').trim()
  if (!reply) return reply
  if (after > before && !reply.includes(MARKER_QUIZ_PASS)) {
    reply = `${reply} ${MARKER_QUIZ_PASS}`
  }
  return reply
}

function scriptedPersonaReply(persona, userMessage, context, messages = [], studyAtom = null, normsSnapshot = null) {
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
    if (context === 'onboarding_greeting' && getGreetingIntakeProgress(messages).complete) {
      return intakeCompleteRedirectReply(persona.id, recentAssistant)
    }
    if (persona.id === 'vasily') return 'Молчишь? Напиши — я не телепат. Спроси про программу или просто поздоровайся.'
    if (persona.id === 'arkady') return 'Я здесь, друг. Напиши что угодно — разберём вместе.'
    return 'Жду сообщение. Сформулируй вопрос.'
  }

  if (context === 'onboarding_greeting' && getGreetingIntakeProgress(messages).complete) {
    const completeReply = scriptedOnboardingGreetingReply(persona.id, text, messages)
    if (completeReply) return completeReply
    return intakeCompleteRedirectReply(persona.id, recentAssistant)
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
      'Тревога зафиксирована. Критерий не меняется: элемент, три образа, «Понял». Эмоции — после выполнения.',
      'Переживания не входят в протокол. Входит последовательность обучения. Продолжай по программе.',
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

  if (/бух|пья|пробит|дура|туп|чмо|идиот|ты норм|с дуб|какаш|хам|груб|пошел|пошёл|иди на|заткн/i.test(lower)) {
    if (persona.id === 'vasily') {
      return pickUnique([
        voice.whenDisrespected,
        'Остро. Молодец. Но со мной так не разговаривают — уважение, потом вопрос по делу.',
        'Бухой я только от твоих отговорок. Переходи к делу — спроси нормально, отвечу.',
        'Пробитый? 58 боёв — и ты живой. Уважай тренера — и удиви вопросом по делу.',
      ])
    }
    if (persona.id === 'arkady') {
      return pickUnique([
        voice.whenDisrespected,
        'Эй, я на твоей стороне. Подкалывать можно — но уважение базовое. Спроси по-честному.',
        'Слышу напряжение — иногда это выходит шутками. Давай по-нормальному, друг.',
      ])
    }
    return pickUnique([
      voice.whenDisrespected,
      'Оценка личности не запрашивалась. Запрос по программе — на уважительном тоне.',
      'Комментарий зафиксирован. Переформулируй — без оскорблений.',
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
    const greetingReply = scriptedOnboardingGreetingReply(persona.id, text, messages)
    if (greetingReply) return greetingReply

    if (/^(привет|здрав|добр|хай|hello)/i.test(lower)) {
      const progress = getGreetingIntakeProgress(messages)
      if (!progress.goalsDone) {
        if (persona.id === 'vasily') return 'Здорово. Сначала цели — своими словами.'
        if (persona.id === 'arkady') return 'Привет ещё раз, друг. Напомни цели — как ты сам их видишь.'
        return 'Приветствие принято. Подтверди цели.'
      }
      const greetingReply = scriptedOnboardingGreetingReply(persona.id, userMessage, messages)
      if (greetingReply) return greetingReply
    }

    if (/кто ты|как зовут|расскаж|ты кто/i.test(lower)) {
      if (getGreetingIntakeProgress(messages).complete) {
        return intakeCompleteRedirectReply(persona.id, recentAssistant)
      }
      const name = formatPortalPersonaName(persona)
      if (persona.id === 'vasily') return `Я ${name}. ${persona.teaser} Спроси — не кусаюсь. Почти.`
      if (persona.id === 'arkady') return `Я ${name}. ${persona.teaser} Расскажу сколько нужно.`
      return `Я ${name}. ${persona.teaser}`
    }
  }

  if (context === 'onboarding_stages') {
    return scriptedOnboardingStagesReply(persona.id, text, messages)
  }

  if (context === 'norms' && normsSnapshot) {
    return scriptedPortalNormsReply(persona.id, text, messages, normsSnapshot)
  }

  if (context === 'program' && studyAtom) {
    return scriptedProgramElementReply(persona.id, text, messages, studyAtom)
  }

  if (context === 'program_atom' && studyAtom) {
    return scriptedProgramAtomReply(persona.id, text, messages, studyAtom)
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
    return 'Благодарность не входит в протокол. Продолжай работу.'
  }

  if (/скуч|устал|лень|не хоч/i.test(lower)) {
    if (persona.id === 'vasily') return `${pickRandom(voice.speechTics)} Лень — тоже выбор. Мой — дожать элемент. Твой?`
    if (persona.id === 'arkady') return 'Понимаю. Сделай один маленький шаг — и решишь, продолжать или нет. Я подожду.'
    return 'Усталость фиксирую. Критерий элемента не меняется. Пауза — твоё решение.'
  }

  if (context === 'onboarding_greeting') {
    const progress = getGreetingIntakeProgress(messages)
    const next = scriptedOnboardingGreetingReply(persona.id, userMessage, messages)
    if (next) return next
    if (progress.complete) {
      return intakeCompleteRedirectReply(persona.id, recentAssistant)
    }
    if (!progress.goalsDone) {
      if (persona.id === 'vasily') return 'Услышал. Сначала цели — одним ответом.'
      if (persona.id === 'arkady') return 'Слышу тебя, друг. Начнём с целей — своими словами.'
      return 'Сначала цели — своими словами, одним предложением.'
    }
    if (!progress.sportDone) {
      if (persona.id === 'vasily') return 'Ок. Теперь только про спорт — чем занимался?'
      if (persona.id === 'arkady') return 'Хорошо. Расскажи про спортивный опыт.'
      return 'Спортивный опыт: разряд, виды, сколько лет — конкретно, без общих слов.'
    }
    if (!progress.pushUpsDone) {
      if (persona.id === 'vasily') return 'Ок. Сначала отжимания от пола — примерно за подход.'
      if (persona.id === 'arkady') return 'Спасибо. Сначала отжимания от пола — сколько за подход?'
      return 'Отжимания от пола за один подход — цифра, честно.'
    }
    if (!progress.physicalDone) {
      if (persona.id === 'vasily') return 'Понял. Теперь подтягивания за подход — примерно.'
      if (persona.id === 'arkady') return 'Хорошо. И подтягивания — сколько за подход?'
      return 'Подтягивания за один подход — сколько?'
    }
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
    `Уточни запрос: программа, элемент или сроки. ${persona.sampleQuote}`,
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
 *   studyAtom?: object | null,
 *   normsSnapshot?: import('../utils/portalNormsChat.js').PortalNormsSnapshot | null,
 *   normSubmitFlow?: import('../utils/portalNormsSubmitFlow.js').PortalNormSubmitFlow | null,
 * }} params
 * @returns {Promise<{
 *   reply: string,
 *   source: import('../utils/portalPersonaAiConfig.js').PortalPersonaReplySource,
 *   normSubmitFlow?: import('../utils/portalNormsSubmitFlow.js').PortalNormSubmitFlow | null,
 *   normSavePayload?: { testName: string, testId: string, resultRaw: string } | null,
 * }>}
 */
export async function sendPortalPersonaChatMessage({
  personaId,
  messages,
  context = 'general',
  programHint = null,
  personaMemory = null,
  trainingGoals = null,
  studyAtom = null,
  normsSnapshot = null,
  normSubmitFlow = null,
}) {
  const persona = getPortalPersona(personaId)
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const userMessage = lastUser?.content ?? ''

  const useRemote = isPortalPersonaAiRemoteEnabled()

  if (
    (context === 'onboarding_greeting' || context === 'onboarding_stages') &&
    detectOnboardingSkipIntent(userMessage)
  ) {
    return { reply: buildOnboardingSkipAllowReply(persona.id), source: 'script' }
  }

  if (context === 'norms' && normSubmitFlow) {
    const flowResult = advanceNormSubmitFlow({
      flow: normSubmitFlow,
      personaId: persona.id,
      userMessage,
    })
    return {
      reply:
        flowResult.reply ??
        scriptedPortalNormsReply(persona.id, userMessage, messages, normsSnapshot ?? { items: [], total: 0, passed: 0, gold: 0, silver: 0, bronze: 0, red: 0, empty: 0, passedItems: [], belowItems: [], pendingItems: [], filled: 0 }),
      source: 'script',
      normSubmitFlow: flowResult.nextFlow,
      normSavePayload: flowResult.savePayload,
    }
  }

  if (
    context === 'norms' &&
    normsSnapshot &&
    isSelfReportedNormData(userMessage) &&
    !isNormExecutionQuestion(userMessage)
  ) {
    return {
      reply: scriptedPortalNormsReply(persona.id, userMessage, messages, normsSnapshot),
      source: 'script',
    }
  }

  if (context === 'onboarding_stages') {
    const graded = scriptedOnboardingStagesReply(persona.id, userMessage, messages)

    if (useRemote) {
      try {
        await callPortalPersonaChatFunction({
          personaId: persona.id,
          messages,
          context,
          programHint,
          personaMemory,
          trainingGoals,
        })
        return {
          reply: enrichOnboardingStagesReply(persona.id, userMessage, messages, graded),
          source: 'ai',
        }
      } catch (err) {
        console.warn('[portalPersonaAi] stages quiz remote failed, using graded reply', err)
        return { reply: graded, source: 'script-fallback' }
      }
    }

    return { reply: graded, source: 'script' }
  }

  const scriptedAtomFallback = () => {
    if (context === 'program' && studyAtom) {
      return scriptedProgramElementReply(persona.id, userMessage, messages, studyAtom)
    }
    if (context === 'program_atom' && studyAtom) {
      return scriptedProgramAtomReply(persona.id, userMessage, messages, studyAtom)
    }
    return null
  }

  const scriptedIntakeReply = () => {
    if (context === 'onboarding_greeting') {
      return scriptedOnboardingGreetingReply(persona.id, userMessage, messages)
    }
    if (context === 'onboarding_stages') {
      return scriptedOnboardingStagesReply(persona.id, userMessage, messages)
    }
    return scriptedAtomFallback()
  }

  if (useRemote) {
    try {
      const reply = await callPortalPersonaChatFunction({
        personaId: persona.id,
        messages,
        context,
        programHint,
        personaMemory,
        trainingGoals,
        studyAtom,
      })
      const trimmed = reply?.trim()
      if (trimmed) {
        if (context === 'onboarding_greeting' && aiReplyInventsStudentRank(trimmed, buildIntakeFactsCorpus(messages, trainingGoals))) {
          const fallback = scriptedIntakeReply()
          if (fallback) {
            console.warn('[portalPersonaAi] intake reply invented facts, using script')
            return { reply: fallback, source: 'script-fallback' }
          }
        }
        if (context === 'onboarding_stages') {
          return {
            reply: enrichOnboardingStagesReply(persona.id, userMessage, messages, trimmed),
            source: 'ai',
          }
        }
        if (
          (context === 'program' || context === 'program_atom') &&
          studyAtom &&
          aiReplyUsesExternalBoxingKnowledge(trimmed)
        ) {
          const fallback = scriptedAtomFallback()
          if (fallback) {
            console.warn('[portalPersonaAi] atom reply used external knowledge, using script fallback')
            return { reply: fallback, source: 'script-fallback' }
          }
        }
        if (context === 'program_atom' && studyAtom) {
          return {
            reply: enrichProgramAtomReply(userMessage, messages, trimmed, studyAtom),
            source: 'ai',
          }
        }
        return { reply: trimmed, source: 'ai' }
      }
    } catch (err) {
      console.warn('[portalPersonaAi] remote failed, using scripted fallback', err)
      return {
        reply: scriptedPersonaReply(persona, userMessage, context, messages, studyAtom, normsSnapshot),
        source: 'script-fallback',
      }
    }
  }

  return {
    reply: scriptedPersonaReply(persona, userMessage, context, messages, studyAtom, normsSnapshot),
    source: 'script',
  }
}

export function isPortalPersonaAiRemoteConfigured() {
  return isPortalPersonaAiRemoteEnabled()
}
