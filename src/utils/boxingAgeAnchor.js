/**
 * Возрастной «якорь» для бокса (полные годы).
 * 13+ согласованы с группами эталонов; 7–12 — внутренняя лестница до эталонов.
 */
export function getBoxingAgeAnchorQuality(ageInt) {
  if (ageInt == null || !Number.isFinite(ageInt)) return null
  if (ageInt < 7) return null
  if (ageInt <= 8) return 'Равновесие'
  if (ageInt <= 10) return 'Быстрота'
  if (ageInt <= 12) return 'Координационные способности'
  if (ageInt <= 14) return 'Координационные способности'
  if (ageInt <= 16) return 'Скоростно-силовые качества'
  if (ageInt <= 18) return 'Анаэробные возможности'
  return 'Динамическая сила'
}
