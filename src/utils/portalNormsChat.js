import {
  formatMinutesToMinuteSecond,
  formatNormResultDisplay,
  getNormValueByTestId,
  getPendingStudentSelfReport,
  isCoachAcceptedNormRow,
  isMinuteSecondNorm,
  isStudentSelfReportNormRow,
  resolveNormRowStatus,
  summarizeNormsForValues,
} from './normTestsStorage.js'
import {
  buildNormExecutionScriptReply,
  findNormExecutionRuleFromText,
  formatNormExecutionRulePlain,
  isNormExecutionQuestion,
} from '../data/portalNormExecutionRules.js'
import { formatPortalNormSelfReportTimestamp, getLatestSelfReportByTestId } from './portalNormSelfReports.js'

/** @typedef {'gold' | 'silver' | 'bronze' | 'red' | 'empty'} PortalNormStatus */

/**
 * @typedef {{
 *   testName: string,
 *   testId: string,
 *   displayResult: string,
 *   goalGold: string,
 *   unit: string,
 *   status: PortalNormStatus,
 *   statusLabel: string,
 *   selfReported?: boolean,
 *   pendingRetakeResult?: string,
 *   hasOfficialResult?: boolean,
 *   hasCoachEnteredResult?: boolean,
 * }} PortalNormsItemSnapshot
 */

/**
 * @typedef {ReturnType<typeof summarizeNormsForValues> & {
 *   items: PortalNormsItemSnapshot[],
 *   passedItems: PortalNormsItemSnapshot[],
 *   belowItems: PortalNormsItemSnapshot[],
 *   pendingItems: PortalNormsItemSnapshot[],
 * }} PortalNormsSnapshot
 */

/** @param {PortalNormStatus} status */
function statusLabelRu(status) {
  if (status === 'gold') return 'золото'
  if (status === 'silver') return 'серебро'
  if (status === 'bronze') return 'бронза'
  if (status === 'red') return 'ниже нормы'
  return 'не сдано'
}

/** @param {object[]} norms @param {Record<string, unknown>} values @param {unknown} [selfReports] */
export function buildPortalNormsSnapshot(norms, values, selfReports = null) {
  const list = Array.isArray(norms) ? norms : []
  /** @type {PortalNormsItemSnapshot[]} */
  const items = list.map((norm) => {
    const testId = String(norm.testId ?? norm.testName ?? '')
    const row = getNormValueByTestId(values, testId)
    const selfReportFromPhysical = isStudentSelfReportNormRow(row)
    const selfReportLegacy = getLatestSelfReportByTestId(selfReports, testId)
    const coachResult = selfReportFromPhysical
      ? ''
      : row?.resultRaw != null && row.resultRaw !== ''
        ? String(row.resultRaw)
        : row?.result !== undefined && row?.result !== null
          ? isMinuteSecondNorm(norm)
            ? formatMinutesToMinuteSecond(row.result)
            : String(row.result)
          : ''
    const selfResult = selfReportFromPhysical
      ? formatNormResultDisplay(norm, row)
      : selfReportLegacy?.resultRaw
        ? String(selfReportLegacy.resultRaw)
        : ''
    const hasCoachResult = Boolean(coachResult)
    const displayResult = hasCoachResult ? coachResult : selfResult
    const status = hasCoachResult ? resolveNormRowStatus(norm, row) : selfResult ? 'empty' : resolveNormRowStatus(norm, row)
    const goalGold = Number.isFinite(norm.gold)
      ? isMinuteSecondNorm(norm)
        ? formatMinutesToMinuteSecond(norm.gold)
        : String(norm.gold)
      : '—'

    const pending = getPendingStudentSelfReport(row)
    const pendingRetakeResult = pending ? formatNormResultDisplay(norm, pending) : ''
    const hasOfficialResult = hasCoachResult && isCoachAcceptedNormRow(row)
    const hasCoachEnteredResult = hasCoachResult && !hasOfficialResult

    return {
      testId,
      testName: String(norm.testName ?? 'Норматив'),
      displayResult,
      goalGold,
      unit: String(norm.unit ?? ''),
      status: selfResult && !hasCoachResult ? 'empty' : status,
      statusLabel: selfResult && !hasCoachResult ? 'со слов ученика' : statusLabelRu(status),
      selfReported: Boolean(selfResult && !hasCoachResult),
      pendingRetakeResult,
      hasOfficialResult,
      hasCoachEnteredResult,
    }
  })

  const summary = summarizeNormsForValues(list, values)

  return {
    ...summary,
    items,
    passedItems: items.filter((i) => i.status === 'gold' || i.status === 'silver' || i.status === 'bronze'),
    belowItems: items.filter((i) => i.status === 'red'),
    pendingItems: items.filter((i) => i.status === 'empty'),
  }
}

/** @param {PortalNormsItemSnapshot[]} items @param {number} [max] */
function joinNormNames(items, max = 4) {
  const names = items.map((i) => `«${i.testName}»`)
  if (names.length <= max) return names.join(', ')
  return `${names.slice(0, max).join(', ')} и ещё ${names.length - max}`
}

/** @param {PortalNormsItemSnapshot} item */
function formatItemWithResult(item) {
  const result = item.displayResult ? `${item.displayResult}${item.unit ? ` ${item.unit}` : ''}` : ''
  if (!result) return `«${item.testName}» (${item.statusLabel})`
  return `«${item.testName}» — ${result} (${item.statusLabel})`
}

/** @param {PortalNormsSnapshot} snapshot */
export function buildPortalNormsProgramHint(snapshot) {
  if (snapshot.total <= 0) return 'Нормативы: список пуст — возраст или пол не заданы в карточке.'

  const lines = [
    `Нормативы ученика: зачётов ${snapshot.passed}/${snapshot.total} (🥇 ${snapshot.gold}, 🥈 ${snapshot.silver}, 🥉 ${snapshot.bronze}, ниже нормы ${snapshot.red}, не сдано ${snapshot.empty}).`,
  ]

  if (snapshot.passedItems.length > 0) {
    lines.push(`Сдано: ${snapshot.passedItems.map(formatItemWithResult).join('; ')}.`)
  }
  if (snapshot.belowItems.length > 0) {
    lines.push(`Ниже нормы: ${snapshot.belowItems.map(formatItemWithResult).join('; ')}.`)
  }
  if (snapshot.pendingItems.length > 0) {
    lines.push(
      `Ещё не сдано: ${snapshot.pendingItems.map((i) => `«${i.testName}» (золото ${i.goalGold}${i.unit ? ` ${i.unit}` : ''})`).join('; ')}.`,
    )
  }

  lines.push(
    'Официальный зачёт фиксирует очный тренер в карточке. В чате ученик сообщает норматив и цифру — дату и время программа проставляет сама («со слов ученика»). Принимай данные, уточняй, объясняй физподготовку в контексте бокса и рекомендации к программе. Чем точнее цифры — тем качественнее разбор. На «как сдать» — только регламент Cartel ниже.',
  )

  return lines.join(' ')
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId
 * @param {PortalNormsSnapshot} snapshot
 */
export function buildPortalNormsOpener(personaId, snapshot) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'

  if (snapshot.total <= 0) {
    if (id === 'vasily') {
      return 'Блокнот пуст — для твоего возраста и пола нормативов нет. Пусть тренер проверит карточку.'
    }
    if (id === 'gleb') {
      return 'Данных по нормативам нет. Проверь год рождения и пол в карточке — без этого протокол не собрать.'
    }
    return 'Друг, нормативов для твоего возраста пока не вижу. Попроси тренера проверить данные в карточке.'
  }

  if (id === 'vasily') {
    return 'Зачёт в протоколе пишет очный тренер — я секундомер в блокнот не подставляю. Напиши свои результаты: норматив, цифра. Точность данных определяет качество анализа прогресса и рекомендаций к индивидуальной программе. Задавай все интересующие вопросы по нормативам — разложу.'
  }

  if (id === 'gleb') {
    return 'Зачёт в протоколе фиксирует очный тренер — я здесь не принимаю норматив официально. Напиши свои результаты: норматив, цифра. Точность данных определяет качество анализа прогресса и рекомендаций к индивидуальной программе. Задавай все интересующие вопросы в отношении нормативов — помогу.'
  }

  return 'Друг, официально норматив принимает тренер на занятии — я здесь для разбора. Напиши свои результаты: норматив, цифра. Точность данных определяет качество анализа прогресса и рекомендаций к индивидуальной программе. Любые вопросы по нормативам — спрашивай, помогу.'
}

/** @param {string[]} items */
function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0] ?? ''
}

/** @param {PortalNormsItemSnapshot[]} items @param {string} query */
function findNormByQuery(items, query) {
  const q = query.toLowerCase()
  return (
    items.find((i) => i.testName.toLowerCase().includes(q)) ??
    items.find((i) => {
      const name = i.testName.toLowerCase()
      if (/3000|три тысяч/.test(q) && /3000|3.?000/.test(name)) return true
      if (/100\s*м|сто мет/.test(q) && /100/.test(name)) return true
      if (/пресс|тулов|подъ[её]м/.test(q) && /тулов|подъ/i.test(name)) return true
      if (/наклон/.test(q) && /наклон/.test(name)) return true
      if (/прыж/.test(q) && /прыж/.test(name)) return true
      if (/подтя/.test(q) && /подтя/.test(name)) return true
      if (/отжим/.test(q) && /отжим|упор/.test(name)) return true
      return false
    }) ??
    null
  )
}

function isSelfReportedNormData(text) {
  const lower = String(text ?? '').toLowerCase()
  if (!/\d/.test(lower)) return false
  return /см|раз|мин|сек|м:|:\d{2}|\d+\s*(раз|см|м\b|км)|отжим|подтяг|наклон|прыж|бег|3000|100\s*м|тулов|пресс/i.test(
    lower,
  )
}

export { isSelfReportedNormData }

/** @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId @param {string} text @param {Date} [reportedAt] */
function buildSelfReportAckReply(personaId, text, reportedAt = new Date()) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const when = formatPortalNormSelfReportTimestamp(reportedAt)
  const quote = text.trim()
  if (id === 'vasily') {
    return `Записал со слов ученика (${when}): «${quote}». В карточке это не зачёт — протокол ведёт тренер. По цифрам разберу физику под бокс; допиши остальные пункты — чем точнее, тем лучше программа.`
  }
  if (id === 'gleb') {
    return `Принято со слов ученика (${when}): «${quote}». Официальный зачёт — у очного тренера. На этой основе соберу картину физподготовки и рекомендации; уточни остальные нормативы, если сдавал.`
  }
  return `Друг, записал со слов ученика (${when}): «${quote}». Это не официальный зачёт — его ставит тренер. По данным смогу яснее увидеть физику под бокс; допиши остальное — точность важна для программы.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId
 * @param {string} userMessage
 * @param {import('../services/portalPersonaAiService.js').PortalChatMessage[]} _messages
 * @param {PortalNormsSnapshot} snapshot
 */
export function scriptedPortalNormsReply(personaId, userMessage, _messages, snapshot) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const text = userMessage.trim()
  const lower = text.toLowerCase()

  if (!text) {
    if (id === 'vasily') return 'Молчишь на секундомере? Напиши — что сдаём или что непонятно.'
    if (id === 'gleb') return 'Жду запрос по нормативу.'
    return 'Я здесь, друг. Напиши — разберём нормативы.'
  }

  if (/спасиб|благодар/i.test(lower)) {
    if (id === 'vasily') return 'Не за что. Лучший способ — закрыть следующий норматив.'
    if (id === 'gleb') return 'Благодарность не входит в протокол. Продолжай сдачу.'
    return 'Всегда, друг. Главное — не бросай.'
  }

  if (isSelfReportedNormData(text) && !isNormExecutionQuestion(text)) {
    return buildSelfReportAckReply(id, text)
  }

  const scopeTestNames = snapshot.items.map((i) => i.testName)
  const execMatch = findNormExecutionRuleFromText(text, scopeTestNames)

  if (isNormExecutionQuestion(text)) {
    if (execMatch) {
      const { rule, testName } = execMatch
      const detail = formatNormExecutionRulePlain(rule, testName)
      if (id === 'vasily') {
        return `Регламент. ${detail} В зале так и проверяют — без самодеятельности.`
      }
      if (id === 'gleb') {
        return detail
      }
      return `Друг, ${detail} Если что-то из этого непонятно — спроси точечно.`
    }
    const hint = joinNormNames(
      snapshot.items.map((i) => ({ testName: i.testName })),
      3,
    )
    if (id === 'vasily') {
      return hint
        ? `Какой норматив — ${hint}? Назови — разложу технику и ошибки.`
        : 'Какой норматив интересует? Назови — скажу, как сдавать.'
    }
    if (id === 'gleb') {
      return hint ? `Уточни норматив: ${hint}.` : 'Укажи норматив для протокола сдачи.'
    }
    return hint
      ? `По какому пункту — ${hint}? Скажи, объясню регламент.`
      : 'Скажи, какой норматив разобрать — расскажу, как сдавать.'
  }

  if (execMatch && /техник|правил|исходн|ошибк|засчит|как\s/i.test(lower)) {
    return buildNormExecutionScriptReply(id, execMatch.rule, execMatch.testName)
  }

  const specific = findNormByQuery(snapshot.items, lower)
  if (specific) {
    if (specific.status === 'empty') {
      const goal = `${specific.goalGold}${specific.unit ? ` ${specific.unit}` : ''}`
      if (id === 'vasily') {
        return `«${specific.testName}» — ещё не сдан. Золото: ${goal}. Готовься и приходи на контроль, не на авось.`
      }
      if (id === 'gleb') {
        return `«${specific.testName}»: не сдан. Критерий золота — ${goal}. План подготовки обсудим.`
      }
      return `«${specific.testName}» пока не сдан, друг. Цель на золото — ${goal}. Разберём, как подойти.`
    }

    const line = formatItemWithResult(specific)
    if (id === 'vasily') {
      return specific.status === 'red'
        ? `${line}. Цель на золото — ${specific.goalGold}${specific.unit ? ` ${specific.unit}` : ''}. Подтягивай, а не оправдывайся.`
        : `${line}. Не зазнавайся — следующий пункт ждёт.`
    }
    if (id === 'gleb') {
      return `${line}. Золото — ${specific.goalGold}${specific.unit ? ` ${specific.unit}` : ''}.`
    }
    return specific.status === 'red'
      ? `${line}. Друг, до золота (${specific.goalGold}${specific.unit ? ` ${specific.unit}` : ''}) ещё есть куда расти — вместе дожмём.`
      : `${line}. Хорошая работа — двигаемся дальше.`
  }

  if (/остал|не сдан|сдать|что ещё|что еще|сколько остал|дальше|когда/i.test(lower)) {
    if (snapshot.pendingItems.length === 0) {
      if (id === 'vasily') return 'Несданных нет. Либо всё с зачётом, либо есть «ниже нормы» — уточни пункт.'
      if (id === 'gleb') return 'Открытых нормативов нет. Проверь пункты ниже нормы, если есть.'
      return 'Несданных нормативов нет, друг. Если что-то «ниже нормы» — скажи какой.'
    }
    const pending = snapshot.pendingItems
      .map((i) => `«${i.testName}» (золото ${i.goalGold}${i.unit ? ` ${i.unit}` : ''})`)
      .join('; ')
    if (id === 'vasily') return `Ещё закрыть: ${pending}. Без самообмана — на занятии фиксируем.`
    if (id === 'gleb') return `Открыты: ${pending}.`
    return `Осталось сдать: ${pending}. Не торопись — по одному.`
  }

  if (/сдан|зач[ёе]т|результат|что есть|мои норм|сколько сдан|карточк/i.test(lower)) {
    const cardHint =
      snapshot.passed > 0 || snapshot.belowItems.length > 0
        ? `В карточке от тренера: зачётов ${snapshot.passed}/${snapshot.total}.`
        : 'В карточке от тренера пока нет зачётов.'
    if (id === 'vasily') {
      return `${cardHint} Список выше — ориентиры на золото. Свежие цифры пиши сюда — учту со слов ученика и разберу под бокс.`
    }
    if (id === 'gleb') {
      return `${cardHint} Дополни своими результатами в чате — отмечу со слов ученика для анализа физподготовки.`
    }
    return `${cardHint} Напиши свои актуальные цифры — учту со слов ученика и помогу увидеть картину под бокс.`
  }

  if (/готов|тренир|как сд|подготов|совет|план/i.test(lower)) {
    if (snapshot.pendingItems.length > 0) {
      const next = snapshot.pendingItems[0]
      if (id === 'vasily') {
        return `Сначала «${next.testName}». Регулярность, не геройство на один раз. Золото — ${next.goalGold}${next.unit ? ` ${next.unit}` : ''}. Остальное потом.`
      }
      if (id === 'gleb') {
        return `Приоритет: «${next.testName}», цель ${next.goalGold}${next.unit ? ` ${next.unit}` : ''}. Системные занятия, без хаотичных попыток.`
      }
      return `Друг, начни с «${next.testName}» — цель ${next.goalGold}${next.unit ? ` ${next.unit}` : ''}. Маленькими шагами, я верю, что получится.`
    }
    if (id === 'vasily') return 'Нормативы закрыты — поддерживай форму, а не отдыхай на лаврах.'
    if (id === 'gleb') return 'Все пункты с зачётом. Поддерживающий режим — без спада.'
    return 'Все сдано — теперь держим уровень, друг.'
  }

  if (/золот|серебр|бронз|медал/i.test(lower)) {
    if (id === 'vasily') {
      return `Сейчас: 🥇 ${snapshot.gold}, 🥈 ${snapshot.silver}, 🥉 ${snapshot.bronze}. Ниже нормы — ${snapshot.red}. Цель — не бронза для галочки.`
    }
    if (id === 'gleb') {
      return `Медали: золото ${snapshot.gold}, серебро ${snapshot.silver}, бронза ${snapshot.bronze}. Ниже нормы: ${snapshot.red}.`
    }
    return `У тебя ${snapshot.gold} золотых, ${snapshot.silver} серебряных, ${snapshot.bronze} бронзовых. Ниже нормы — ${snapshot.red}. Главное — не останавливаться.`
  }

  if (id === 'vasily') {
    return pickRandom([
      `Зачётов ${snapshot.passed}/${snapshot.total}. ${snapshot.pendingItems.length > 0 ? `Дожми: ${joinNormNames(snapshot.pendingItems, 2)}.` : 'Работаем над слабыми местами.'} Сформулируй вопрос по пункту.`,
      `Секундомер не врёт. ${snapshot.belowItems.length > 0 ? 'Есть ниже нормы — не замалчивай.' : 'Цифры на доске — спрашивай конкретно.'}`,
    ])
  }
  if (id === 'gleb') {
    return pickRandom([
      `Статус: ${snapshot.passed}/${snapshot.total} зачётов. Уточни норматив или этап подготовки.`,
      `Данные в блокноте актуальны. Какой пункт разобрать?`,
    ])
  }
  return pickRandom([
    `Зачётов ${snapshot.passed} из ${snapshot.total}. ${snapshot.pendingItems.length > 0 ? `Осталось: ${joinNormNames(snapshot.pendingItems, 2)}.` : ''} Спрашивай, друг.`,
    `Я вижу твои результаты. Что разобрать — сданное или то, что впереди?`,
  ])
}
