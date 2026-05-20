/** Роль в документе coaches/{uid}: поле `role`. */
export const COACH_ROLE_ADMIN = 'admin'
export const COACH_ROLE_COACH = 'coach'

/**
 * Администратор программы: может редактировать каталог technical_program_atoms.
 * @param {{ role?: string; isAdmin?: boolean } | null | undefined} profile
 */
export function isProgramAdmin(profile) {
  if (!profile || typeof profile !== 'object') return false
  if (profile.role === COACH_ROLE_ADMIN) return true
  if (profile.isAdmin === true) return true
  return false
}
