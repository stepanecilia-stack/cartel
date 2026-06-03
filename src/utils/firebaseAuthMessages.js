/**
 * Человекочитаемое сообщение по коду ошибки Firebase Auth.
 * @param {unknown} error
 * @returns {string}
 */
export function formatFirebaseAuthError(error) {
  if (error instanceof Error && error.message.includes('Firebase Auth недоступен')) {
    return 'Firebase не настроен: заполните .env.local по образцу .env.example или переменные VITE_FIREBASE_* на Vercel и пересоберите проект.'
  }
  if (error instanceof Error && error.message.includes('Firebase не настроен')) {
    return 'Нет доступа к базе: проверьте переменные VITE_FIREBASE_* и пересборку.'
  }

  const code = error && typeof error === 'object' && 'code' in error ? error.code : null

  const byCode = {
    'auth/invalid-credential': 'Неверная почта или пароль.',
    'auth/wrong-password': 'Неверный пароль.',
    'auth/user-not-found': 'Пользователь с такой почтой не найден. Если аккаунта ещё нет — сначала зарегистрируйтесь.',
    'auth/invalid-email': 'Некорректный формат почты.',
    'auth/too-many-requests': 'Слишком много попыток входа. Подождите несколько минут и попробуйте снова.',
    'auth/network-request-failed': 'Нет связи с сервером. Проверьте интернет и блокировщики рекламы.',
    'auth/unauthorized-domain':
      'Этот адрес сайта не разрешён для входа. В Firebase Console → Authentication → Settings → Authorized domains добавьте текущий домен (например localhost или ваш-сайт.vercel.app).',
    'auth/user-disabled': 'Этот аккаунт отключён.',
    'auth/operation-not-allowed':
      'Этот способ входа выключен в Firebase. Authentication → Sign-in method: для тренера — Email/Password, для кабинета ученика — Anonymous.',
    'auth/admin-restricted-operation':
      'Firebase запрещает создание пользователей с клиента. Authentication → Settings → User actions → включите «Enable create (sign-up)». ' +
      'Для кабинета ученика также: Sign-in method → Anonymous → Enable. ' +
      'Для тренера: Sign-in method → Email/Password → Enable.',
    'auth/email-already-in-use': 'Аккаунт с такой почтой уже есть — используйте «Вход».',
    'auth/weak-password': 'Пароль слишком простой. Нужно не менее 6 символов.',
    'auth/invalid-api-key': 'Неверный API-ключ Firebase. Проверьте .env.local или переменные на Vercel и пересоберите проект.',
  }

  if (code && byCode[code]) return byCode[code]

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    const msg = error.message
    if (msg.includes('Firebase') && msg.length < 200) return msg
  }

  return code
    ? `Не удалось выполнить действие (${code}). Откройте консоль браузера (F12) для подробностей.`
    : 'Не удалось выполнить действие. Проверьте интернет и настройки Firebase.'
}
