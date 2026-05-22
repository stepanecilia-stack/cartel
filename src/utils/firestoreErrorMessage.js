/**
 * Понятное сообщение об ошибке Firestore для тренера.
 * @param {unknown} err
 */
export function formatFirestoreErrorMessage(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  const raw = err instanceof Error ? err.message : String(err ?? '')

  if (code === 'permission-denied' || /insufficient permissions/i.test(raw)) {
    return (
      'Нет доступа к календарю событий в Firestore (коллекция coach_events). ' +
      'Опубликуйте актуальные firestore.rules в Firebase Console или командой: ' +
      'npx firebase-tools deploy --only firestore:rules --project ВАШ_PROJECT_ID'
    )
  }
  if (code === 'unauthenticated') {
    return 'Войдите в аккаунт тренера и повторите сохранение.'
  }
  if (raw) return raw
  return 'Не удалось выполнить операцию с базой данных.'
}
