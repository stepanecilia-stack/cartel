/** Обязательные комбинации ур.3 программы Cartel (id стабильны для Firestore). */

export const REQUIRED_LEVEL3_COMBO_TEMPLATES = [
  {
    id: 'combo_std_double_podashag',
    name: 'Двойка подшаг',
    steps: ['atom_7', 'atom_7'],
  },
  {
    id: 'combo_std_double_tolchok',
    name: 'Двойка толчок',
    steps: ['atom_7', 'atom_11'],
  },
]

export const REQUIRED_LEVEL3_COMBO_IDS = REQUIRED_LEVEL3_COMBO_TEMPLATES.map((t) => t.id)
