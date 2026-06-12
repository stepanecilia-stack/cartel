/** Тексты кнопок главного меню (Reply Keyboard). */
export const MENU = {
  TRAINING: '🏋️ Тренировка',
  STUDENTS: '👤 Ученики',
  SUMMARY: '📋 Сводка',
  NORMS: '📊 Нормативы',
  HELP: '❓ Справка',
}

export const MAIN_MENU_KEYBOARD = {
  keyboard: [
    [{ text: MENU.TRAINING }],
    [{ text: MENU.STUDENTS }],
    [{ text: MENU.SUMMARY }, { text: MENU.NORMS }],
    [{ text: MENU.HELP }],
  ],
  resize_keyboard: true,
  is_persistent: true,
}

/** @returns {{ reply_markup: typeof MAIN_MENU_KEYBOARD }} */
export function menuExtra() {
  return { reply_markup: MAIN_MENU_KEYBOARD }
}

/**
 * @param {string} text
 * @returns {'student' | 'summary' | 'norms' | 'help' | null}
 */
export function parseMenuAction(text) {
  const t = String(text ?? '').trim()
  if (!t) return null

  if (
    t === MENU.TRAINING ||
    t === '/training' ||
    t.startsWith('/training@')
  ) {
    return 'training'
  }
  if (
    t === MENU.STUDENTS ||
    t === '/student' ||
    t.startsWith('/student@')
  ) {
    return 'student'
  }
  if (
    t === MENU.SUMMARY ||
    t === '/summary' ||
    t.startsWith('/summary@')
  ) {
    return 'summary'
  }
  if (
    t === MENU.NORMS ||
    t === '/norms' ||
    t.startsWith('/norms@')
  ) {
    return 'norms'
  }
  if (
    t === MENU.HELP ||
    t === '/help' ||
    t.startsWith('/help@')
  ) {
    return 'help'
  }
  return null
}

/**
 * Команды в меню «/» Telegram + кнопка Menu.
 * @param {string} token
 */
export async function setupBotMenu(token) {
  const { telegramApi } = await import('./telegramApi.js')
  await telegramApi(token, 'setMyCommands', {
    commands: [
      { command: 'training', description: 'Групповая тренировка' },
      { command: 'student', description: 'Выбрать ученика' },
      { command: 'summary', description: 'Сводка по ученику' },
      { command: 'norms', description: 'Что не сдано' },
      { command: 'help', description: 'Справка' },
    ],
    language_code: 'ru',
  })
  await telegramApi(token, 'setChatMenuButton', {
    menu_button: { type: 'commands' },
  })
}
