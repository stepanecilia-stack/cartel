import {
  formatNormExecutionRulePlain,
  resolveNormExecutionRule,
} from '../data/portalNormExecutionRules.js'
import { formatPortalNormSelfReportTimestamp } from './portalNormSelfReports.js'

/**
 * @typedef {'confirm_start' | 'await_value' | 'confirm_save'} NormSubmitFlowStep
 */

/**
 * @typedef {{
 *   step: NormSubmitFlowStep,
 *   testName: string,
 *   testId: string,
 *   unit: string,
 *   goalGold: string,
 *   pendingValue?: string,
 *   isRetake?: boolean,
 * }} PortalNormSubmitFlow
 */

/** @param {PortalNormsItemSnapshot} item */
function asFlowItem(item) {
  return {
    testName: item.testName,
    testId: item.testId ?? item.testName,
    unit: item.unit ?? '',
    goalGold: item.goalGold ?? '—',
  }
}

/** @typedef {import('./portalNormsChat.js').PortalNormsItemSnapshot} PortalNormsItemSnapshot */

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId
 * @param {PortalNormsItemSnapshot} item
 */
export function buildNormSubmitOfferReply(personaId, item) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const { testName, goalGold, unit } = asFlowItem(item)
  const gold = `${goalGold}${unit ? ` ${unit}` : ''}`
  const resultLine = item.displayResult
    ? `${item.displayResult}${unit ? ` ${unit}` : ''}`
    : ''

  if (item.pendingRetakeResult) {
    const baseLabel = item.hasOfficialResult ? 'Зачёт' : 'В карточке'
    if (id === 'vasily') {
      return `${baseLabel}: ${resultLine}. Пересдача уже записана (${item.pendingRetakeResult}${unit ? ` ${unit}` : ''}). Обновить результат? «Да» — новая цифра, «нет» — отмена.`
    }
    if (id === 'gleb') {
      return `${baseLabel}: ${resultLine}. Есть пересдача (${item.pendingRetakeResult}${unit ? ` ${unit}` : ''}). Обновить? «Да» или «нет».`
    }
    return `Друг, ${baseLabel.toLowerCase()} ${resultLine}, пересдача ${item.pendingRetakeResult}${unit ? ` ${unit}` : ''}. Записать новый результат? «Да» или «нет».`
  }

  if (item.hasOfficialResult && resultLine) {
    if (id === 'vasily') {
      return `«${testName}» уже сдан: ${resultLine}. Пересдача — золото ${gold}. Записать новый результат? «Да» — регламент, «нет» — отмена.`
    }
    if (id === 'gleb') {
      return `«${testName}» зачтён: ${resultLine}. Пересдача, золото — ${gold}. Сдаём? «Да» или «нет».`
    }
    return `«${testName}» уже в зачёте (${resultLine}). Хочешь пересдать? Золото — ${gold}. «Да» или «нет».`
  }

  if (item.hasCoachEnteredResult && resultLine) {
    if (id === 'vasily') {
      return `Тренер записал «${testName}» — ${resultLine}. Сообщить свой результат? «Да» — регламент, «нет» — отмена.`
    }
    if (id === 'gleb') {
      return `В карточке записано: ${resultLine}. Сообщить свой результат? «Да» или «нет».`
    }
    return `Тренер уже записал ${resultLine}. Хочешь добавить свой, друг? «Да» или «нет».`
  }

  if (item.selfReported && resultLine) {
    if (id === 'vasily') {
      return `Сейчас со слов ученика: «${testName}» — ${resultLine}. Обновить? «Да» — регламент, «нет» — отмена.`
    }
    if (id === 'gleb') {
      return `Записано со слов ученика: ${resultLine}. Обновить? «Да» или «нет».`
    }
    return `Сейчас записано: ${resultLine}. Обновить результат, друг? «Да» или «нет».`
  }

  if (id === 'vasily') {
    return `«${testName}» — золото ${gold}. Сдаём сейчас? Напиши «да» — разложу регламент. «Нет» — отмена.`
  }
  if (id === 'gleb') {
    return `«${testName}», критерий золота — ${gold}.\nСдаём? Ответь «да» или «нет».`
  }
  return `Друг, по «${testName}» цель на золото — ${gold}. Хочешь записать свой результат? Напиши «да» или «нет».`
}

/** @param {PortalNormsItemSnapshot} item */
export function createNormSubmitFlow(item) {
  const base = asFlowItem(item)
  const isRetake = Boolean(
    item.displayResult ||
      item.pendingRetakeResult ||
      item.hasOfficialResult ||
      item.hasCoachEnteredResult ||
      item.selfReported,
  )
  return /** @type {PortalNormSubmitFlow} */ ({
    step: 'confirm_start',
    ...base,
    isRetake,
  })
}

function isAffirmative(text) {
  return /^(да|ага|угу|yes|ok|ок|окей|подтверж|верно|запис|сохран|\+)$/i.test(text.trim()) ||
    /\b(да|подтверждаю|записывай|сохраняй|верно)\b/i.test(text)
}

function isNegative(text) {
  return /^(нет|no|неа|отмен|стоп|\-)$/i.test(text.trim()) ||
    /\b(нет|отмена|не надо|не хочу|передумал)\b/i.test(text)
}

function looksLikeNormValue(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed || isAffirmative(trimmed) || isNegative(trimmed)) return false
  return /\d/.test(trimmed) || /:\d{2}/.test(trimmed) || /^-\d/.test(trimmed)
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId
 * @param {PortalNormSubmitFlow} flow
 */
function buildCriteriaReply(personaId, flow) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const rule = resolveNormExecutionRule(flow.testName)
  const gold = `${flow.goalGold}${flow.unit ? ` ${flow.unit}` : ''}`
  const criteria = rule
    ? formatNormExecutionRulePlain(rule, flow.testName)
    : `«${flow.testName}»: сдавай по регламенту Cartel на занятии.`

  if (id === 'vasily') {
    return `${criteria} Золото — ${gold}. Теперь цифра: напиши результат одним сообщением.`
  }
  if (id === 'gleb') {
    return `${criteria} Критерий золота: ${gold}. Укажи результат.`
  }
  return `${criteria} Цель на золото — ${gold}. Напиши свой результат, друг.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId
 * @param {PortalNormSubmitFlow} flow
 * @param {string} value
 */
function buildConfirmSaveReply(personaId, flow, value) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const unit = flow.unit ? ` ${flow.unit}` : ''
  const line = `«${flow.testName}» — ${value}${unit}`

  if (id === 'vasily') {
    return `Записать со слов ученика: ${line}? Это не официальный зачёт — протокол ведёт тренер. «Да» — сохраняю, «нет» — переделаешь цифру.`
  }
  if (id === 'gleb') {
    return `Подтверди запись: ${line}. Статус — со слов ученика, не протокол. «Да» — в базу, «нет» — введи результат заново.`
  }
  return `Друг, сохранить ${line}? Это со слов ученика, не зачёт тренера. «Да» — записываю, «нет» — другая цифра.`
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId
 * @param {PortalNormSubmitFlow} flow
 * @param {Date} reportedAt
 */
function buildSavedReply(personaId, flow, reportedAt, isRetake = false) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const when = formatPortalNormSelfReportTimestamp(reportedAt)
  const value = flow.pendingValue ?? ''
  const unit = flow.unit ? ` ${flow.unit}` : ''
  const line = `«${flow.testName}» — ${value}${unit}`
  const verb = isRetake ? 'Обновлено' : 'Записано'

  if (id === 'vasily') {
    return `${verb} со слов ученика (${when}): ${line}. Официальный зачёт — у тренера на занятии. Другой пункт — жми в списке или спрашивай.`
  }
  if (id === 'gleb') {
    return `${isRetake ? 'Пересдача сохранена' : 'Сохранено'} (${when}), со слов ученика: ${line}. Протокол на занятии не заменяет. Выбери следующий норматив или задай вопрос.`
  }
  return `Готово, друг (${when}): ${line} — ${isRetake ? 'пересдача' : 'со слов ученика'}. Тренер на занятии поставит зачёт отдельно. Можешь выбрать ещё пункт из списка.`
}

/**
 * @param {{
 *   flow: PortalNormSubmitFlow | null,
 *   personaId: import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown,
 *   userMessage: string,
 * }} params
 * @returns {{
 *   reply: string | null,
 *   nextFlow: PortalNormSubmitFlow | null,
 *   savePayload: { testName: string, testId: string, resultRaw: string } | null,
 * }}
 */
export function advanceNormSubmitFlow({ flow, personaId, userMessage }) {
  if (!flow) return { reply: null, nextFlow: null, savePayload: null }

  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const text = userMessage.trim()
  const lower = text.toLowerCase()

  if (flow.step === 'confirm_start') {
    if (isAffirmative(lower)) {
      return {
        reply: buildCriteriaReply(id, flow),
        nextFlow: { ...flow, step: 'await_value' },
        savePayload: null,
      }
    }
    if (isNegative(lower)) {
      if (id === 'vasily') {
        return { reply: 'Отмена. Выбери другой пункт в списке, когда будешь готов.', nextFlow: null, savePayload: null }
      }
      if (id === 'gleb') {
        return { reply: 'Отменено. Выбери норматив в списке, когда будешь готов.', nextFlow: null, savePayload: null }
      }
      return { reply: 'Хорошо, друг. Когда захочешь — нажми на норматив в списке.', nextFlow: null, savePayload: null }
    }
    if (id === 'vasily') {
      return { reply: 'Ответь «да» — начнём, или «нет» — отмена.', nextFlow: flow, savePayload: null }
    }
    if (id === 'gleb') {
      return { reply: 'Нужен ответ: «да» или «нет».', nextFlow: flow, savePayload: null }
    }
    return { reply: 'Напиши «да», если готов, или «нет», чтобы отменить.', nextFlow: flow, savePayload: null }
  }

  if (flow.step === 'await_value') {
    if (!looksLikeNormValue(text)) {
      if (id === 'vasily') {
        return { reply: 'Цифра, не философия. Напиши результат — число, время или см.', nextFlow: flow, savePayload: null }
      }
      if (id === 'gleb') {
        return { reply: 'Укажи результат: число, время (мин:сек) или см.', nextFlow: flow, savePayload: null }
      }
      return { reply: 'Друг, напиши результат цифрами — сколько получилось.', nextFlow: flow, savePayload: null }
    }
    return {
      reply: buildConfirmSaveReply(id, flow, text),
      nextFlow: { ...flow, step: 'confirm_save', pendingValue: text },
      savePayload: null,
    }
  }

  if (flow.step === 'confirm_save') {
    if (isAffirmative(lower)) {
      const value = flow.pendingValue ?? text
      return {
        reply: buildSavedReply(id, flow, new Date(), Boolean(flow.isRetake)),
        nextFlow: null,
        savePayload: {
          testName: flow.testName,
          testId: flow.testId,
          resultRaw: value,
        },
      }
    }
    if (isNegative(lower)) {
      if (id === 'vasily') {
        return { reply: 'Ок. Напиши результат заново.', nextFlow: { ...flow, step: 'await_value', pendingValue: undefined }, savePayload: null }
      }
      if (id === 'gleb') {
        return { reply: 'Введи результат заново.', nextFlow: { ...flow, step: 'await_value', pendingValue: undefined }, savePayload: null }
      }
      return { reply: 'Хорошо, друг. Напиши правильную цифру.', nextFlow: { ...flow, step: 'await_value', pendingValue: undefined }, savePayload: null }
    }
    if (id === 'vasily') {
      return { reply: '«Да» — сохраняю, «нет» — другая цифра.', nextFlow: flow, savePayload: null }
    }
    if (id === 'gleb') {
      return { reply: 'Подтверди «да» или «нет».', nextFlow: flow, savePayload: null }
    }
    return { reply: 'Ответь «да», чтобы сохранить, или «нет», чтобы изменить цифру.', nextFlow: flow, savePayload: null }
  }

  return { reply: null, nextFlow: flow, savePayload: null }
}
