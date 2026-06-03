/**
 * Понятное сообщение об ошибке Firestore.
 * @param {unknown} err
 * @param {{ context?: 'coach_events' | 'student_portal' | 'default' }} [options]
 */
export function formatFirestoreErrorMessage(err, options = {}) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const context = options.context ?? 'default'

  if (code === 'permission-denied' || /insufficient permissions/i.test(raw)) {
    const projectHint =
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID
        ? String(import.meta.env.VITE_FIREBASE_PROJECT_ID).trim()
        : 'cartel-academy'
    const rulesHint =
      `Опубликуйте firestore.rules: Firebase Console → Firestore → Правила → «Опубликовать» ` +
      `(проект ${projectHint}) или npm run deploy:firestore-rules.`

    if (context === 'coach_events') {
      return (
        'Нет доступа к календарю событий (коллекция coach_events). ' + rulesHint
      )
    }
    if (context === 'student_portal') {
      return (
        'Не удалось сохранить прогресс в кабинете ученика. ' +
        rulesHint +
        ' Нужны правила с доступом portalAuthUid и полями technicalData / portalLastActivityAt.'
      )
    }
    return `Нет доступа к данным в Firestore. ${rulesHint}`
  }
  if (code === 'unauthenticated') {
    return context === 'student_portal'
      ? 'Сессия истекла. Выйдите из кабинета и войдите снова (код + PIN).'
      : 'Войдите в аккаунт тренера и повторите сохранение.'
  }
  if (raw) return raw
  return 'Не удалось выполнить операцию с базой данных.'
}
