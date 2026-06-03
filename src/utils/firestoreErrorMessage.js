/**
 * Понятное сообщение об ошибке Firestore для тренера.
 * @param {unknown} err
 */
export function formatFirestoreErrorMessage(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  const raw = err instanceof Error ? err.message : String(err ?? '')

  if (code === 'permission-denied' || /insufficient permissions/i.test(raw)) {
    const projectHint =
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID
        ? String(import.meta.env.VITE_FIREBASE_PROJECT_ID).trim()
        : 'cartel-academy'
    return (
      'Нет доступа к календарю событий в Firestore (коллекция coach_events). ' +
      'Опубликуйте файл firestore.rules из репозитория: Firebase Console → Firestore → Правила → «Опубликовать», ' +
      `или в терминале: npm run deploy:firestore-rules (проект ${projectHint}, нужен firebase login).`
    )
  }
  if (code === 'unauthenticated') {
    return 'Войдите в аккаунт тренера и повторите сохранение.'
  }
  if (raw) return raw
  return 'Не удалось выполнить операцию с базой данных.'
}
