/**
 * Приёмы, которые не отмечают «в отрыве» — только в связке (стойки, базовые оттяжки, часть защит).
 * Сопоставление по полю number у атома.
 */
export const NON_ISOLATED_REINFORCEMENT_NUMBERS = new Set([
  '1',
  '3',
  '5',
  '6',
  '15',
  '16',
  '19',
  '2.8',
])

export const NON_ISOLATED_REINFORCEMENT_SYMBOL = '—'

export const NON_ISOLATED_REINFORCEMENT_TITLE =
  'Не отрабатывается отдельно — только в связке с другими приёмами'

/**
 * @param {{ id?: string, kind?: string } | null | undefined} atom
 */
export function isTechnicalComboAtom(atom) {
  if (!atom || typeof atom !== 'object') return false
  if (atom.kind === 'combo') return true
  const id = String(atom.id ?? '')
  return id.startsWith('combo_')
}

/**
 * @param {{ id?: string, kind?: string, number?: string | number, name?: string } | null | undefined} atom
 */
export function isAtomReinforceableInIsolation(atom) {
  if (!atom || typeof atom !== 'object') return true
  if (isTechnicalComboAtom(atom)) return true
  const num = String(atom.number ?? '')
    .trim()
    .replace(',', '.')
  return !NON_ISOLATED_REINFORCEMENT_NUMBERS.has(num)
}

/** @param {Array<{ id?: string } | null | undefined>[]} lists */
export function buildProgramAtomById(...lists) {
  const map = new Map()
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const atom of list) {
      if (atom?.id) map.set(atom.id, atom)
    }
  }
  return map
}

/**
 * @param {string[]} atomIds
 * @param {Map<string, { number?: string | number }>} atomById
 */
export function filterReinforceableAtomIds(atomIds, atomById) {
  if (!Array.isArray(atomIds)) return []
  return atomIds.filter((id) => {
    const atom = atomById.get(id)
    return isAtomReinforceableInIsolation(atom ?? null)
  })
}
