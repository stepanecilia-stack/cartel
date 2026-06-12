const DEFAULT_LEVEL1_RAW = [
  { id: 'atom_1', number: '1', name: 'Фронтальная стойка' },
  { id: 'atom_2', number: '2', name: 'Передвижение по кругу во фронтальной стойке' },
  { id: 'atom_3', number: '3', name: 'Боевая стойка' },
  { id: 'atom_4', number: '4', name: 'Передвижение в боевой стойке (вперед-назад, влево-вправо)' },
  { id: 'atom_5', number: '5', name: 'Оттяжка шагом' },
  { id: 'atom_6', number: '6', name: 'Оттяжка отскоком' },
  { id: 'atom_7', number: '7', name: 'Прямой передней в голову' },
  { id: 'atom_8', number: '8', name: 'Защита подставкой (голова)' },
  { id: 'atom_9', number: '9', name: 'Прямой передней в туловище' },
  { id: 'atom_10', number: '10', name: 'Защита подставкой локтя (туловище)' },
  { id: 'atom_11', number: '11', name: 'Прямой сильной в голову' },
  { id: 'atom_12', number: '12', name: 'Защита подставкой плеча' },
  { id: 'atom_13', number: '13', name: 'Прямой сильной в туловище' },
  { id: 'atom_14', number: '14', name: 'Удары во фронтальной стойке на скрёстном шаге' },
  { id: 'atom_15', number: '15', name: 'Защита уклоном' },
  { id: 'atom_16', number: '16', name: 'Защита отбивом (внутрь/наружу)' },
  { id: 'atom_17', number: '17', name: 'Сайдстеп' },
  { id: 'atom_18', number: '18', name: 'Нырок' },
  { id: 'atom_19', number: '19', name: 'Разворот (в боевой стойке)' },
]

const DEFAULT_LEVEL2_RAW = [
  { id: 'lvl2_1', number: '2.1', name: 'Передней сбоку' },
  { id: 'lvl2_2', number: '2.2', name: 'Сильной сбоку' },
  { id: 'lvl2_3', number: '2.3', name: 'Подставка (от боковых)' },
  { id: 'lvl2_4', number: '2.4', name: 'Передней снизу в корпус' },
  { id: 'lvl2_5', number: '2.5', name: 'Сильной снизу в корпус' },
  { id: 'lvl2_6', number: '2.6', name: 'Передней снизу в голову' },
  { id: 'lvl2_7', number: '2.7', name: 'Сильной снизу в голову' },
  { id: 'lvl2_8', number: '2.8', name: 'Передней сбоку (на выходе)' },
]

const REQUIRED_LEVEL3_TEMPLATES = [
  { id: 'combo_std_double_podashag', name: 'Двойка подшаг', steps: ['atom_7', 'atom_7'] },
  { id: 'combo_std_double_tolchok', name: 'Двойка толчок', steps: ['atom_7', 'atom_11'] },
]

const SEQUENCE_HINTS = [
  ['фронтальная стойка'],
  ['передвижение по кругу', 'фронталь'],
  ['боевая стойка'],
  ['передвижение в боевой стойке'],
  ['оттяжка шагом'],
  ['оттяжка отскоком'],
  ['прямой передней в голову'],
  ['защита подставкой (голова)'],
  ['прямой передней в туловище'],
  ['защита подставкой локтя'],
  ['прямой сильной в голову'],
  ['защита подставкой плеча'],
  ['прямой сильной в туловище'],
  ['скрёстном шаге', 'скресном шаге'],
  ['защита уклоном'],
  ['защита отбивом'],
  ['сайдстеп', 'сайд-степ'],
  ['нырок'],
  ['разворот'],
]

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

function sequenceIndex(atom) {
  const normalized = normalizeName(atom?.name)
  for (let i = 0; i < SEQUENCE_HINTS.length; i += 1) {
    if (SEQUENCE_HINTS[i].every((hint) => normalized.includes(normalizeName(hint)))) return i
  }
  const n = Number(atom?.number)
  if (Number.isFinite(n) && n >= 1) return n - 1
  return Number.MAX_SAFE_INTEGER
}

/** @param {object[]} atoms */
function orderLevel1(atoms) {
  return [...atoms].sort((a, b) => {
    const d = sequenceIndex(a) - sequenceIndex(b)
    if (d !== 0) return d
    return String(a?.number ?? '').localeCompare(String(b?.number ?? ''), 'ru')
  })
}

function trimOrNull(value) {
  if (value == null) return null
  const s = String(value).trim()
  return s.length ? s : null
}

/** @param {object} defaults @param {Record<string, unknown> | undefined} override */
function mergeAtom(defaults, override) {
  if (!override) return { ...defaults }
  return {
    ...defaults,
    name: trimOrNull(override.name) ?? defaults.name,
    number: trimOrNull(override.number) ?? defaults.number,
    howTo: trimOrNull(override.howTo) ?? defaults.howTo ?? '',
    mistakes: trimOrNull(override.mistakes) ?? defaults.mistakes ?? '',
  }
}

const DEFAULT_LEVEL1 = DEFAULT_LEVEL1_RAW.map((a) => ({ ...a, techniqueTier: 1, kind: 'atom' }))
const DEFAULT_LEVEL2 = DEFAULT_LEVEL2_RAW.map((a) => ({ ...a, techniqueTier: 2, kind: 'atom' }))

function buildDefaultLevel3(level1Atoms) {
  const byId = new Map(level1Atoms.map((a) => [a.id, a]))
  return REQUIRED_LEVEL3_TEMPLATES.map((t, index) => ({
    id: t.id,
    number: index + 1,
    name: t.name,
    kind: 'combo',
    techniqueTier: 3,
    steps: [...t.steps],
    chainPreview: t.steps
      .map((sid) => {
        const a = byId.get(sid)
        return a?.number != null ? `#${a.number}` : '?'
      })
      .join(' → '),
  }))
}

/**
 * Как в приложении: канонические 19+8+2, Firestore только переопределяет по atomId.
 * @param {import('firebase-admin/firestore').QueryDocumentSnapshot[]} docs
 */
function buildProgramFromFirestoreDocs(docs) {
  const byId = new Map()
  for (const doc of docs) {
    const data = doc.data()
    if (data?.kind === 'tier_cover') continue
    const atomId = trimOrNull(data?.atomId) || doc.id
    if (!atomId || atomId.startsWith('tier_cover_')) continue
    byId.set(atomId, { atomId, ...data })
  }

  const level1 = orderLevel1(
    DEFAULT_LEVEL1.map((d) => mergeAtom(d, byId.get(d.id))),
  )
  const level2 = DEFAULT_LEVEL2.map((d) => mergeAtom(d, byId.get(d.id)))

  const defaultL3 = buildDefaultLevel3(level1)
  const level3 = defaultL3.map((d) => {
    const o = byId.get(d.id)
    if (!o) return d
    return mergeAtom(d, o)
  })

  const extraCombos = []
  for (const [id, data] of byId.entries()) {
    if (DEFAULT_LEVEL1.some((a) => a.id === id)) continue
    if (DEFAULT_LEVEL2.some((a) => a.id === id)) continue
    if (REQUIRED_LEVEL3_TEMPLATES.some((t) => t.id === id)) continue
    if (data.kind === 'combo' || Number(data.techniqueTier) === 3) {
      extraCombos.push({
        id,
        number: data.number ?? extraCombos.length + 3,
        name: String(data.name ?? id),
        kind: 'combo',
        techniqueTier: 3,
        steps: Array.isArray(data.steps) ? data.steps : [],
      })
    }
  }

  return {
    level1,
    level2,
    level3: [...level3, ...extraCombos],
  }
}

let programCache = /** @type {{ level1: object[], level2: object[], level3: object[] } | null} */ (null)
let programCacheAt = 0

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 */
export async function loadTechnicalProgramBundle(firestore) {
  if (programCache && Date.now() - programCacheAt < 5 * 60 * 1000) return programCache
  try {
    const snap = await firestore.collection('technical_program_atoms').get()
    programCache = buildProgramFromFirestoreDocs(snap.docs)
  } catch (err) {
    console.warn('loadTechnicalProgramBundle', err)
    programCache = buildProgramFromFirestoreDocs([])
  }
  programCacheAt = Date.now()
  return programCache
}

const REQUIRED_LEVEL3_IDS = new Set(REQUIRED_LEVEL3_TEMPLATES.map((t) => t.id))

/**
 * @param {unknown} combinations
 */
function mergeWithRequiredLevel3Combinations(combinations) {
  const normalized = []
  if (Array.isArray(combinations)) {
    for (const item of combinations) {
      if (!item || typeof item !== 'object') continue
      const id = String(item.id ?? '').trim()
      const name = String(item.name ?? '').trim()
      const steps = Array.isArray(item.steps) ? item.steps.map(String).filter(Boolean) : []
      if (!id || !name || !steps.length) continue
      normalized.push({ id, name, steps })
    }
  }
  const byId = new Map(normalized.map((c) => [c.id, c]))
  const head = REQUIRED_LEVEL3_TEMPLATES.map((template) => {
    const saved = byId.get(template.id)
    return {
      id: template.id,
      name: template.name,
      steps: saved?.steps?.length ? [...saved.steps] : [...template.steps],
    }
  })
  const tail = normalized.filter((c) => !REQUIRED_LEVEL3_IDS.has(c.id))
  return [...head, ...tail]
}

/**
 * @param {unknown} combinations
 * @param {object[]} catalogL3
 * @param {object[]} level1Atoms
 */
export function mapStudentCombinations(combinations, catalogL3, level1Atoms) {
  const catalog = catalogL3.length ? catalogL3 : buildDefaultLevel3(level1Atoms)
  const byId = new Map(catalog.map((a) => [a.id, a]))
  const merged = mergeWithRequiredLevel3Combinations(combinations)
  return merged.map((c, index) => {
    const cat = byId.get(c.id)
    return {
      ...(cat ?? {}),
      ...c,
      id: c.id,
      number: cat?.number ?? index + 1,
      name: c.name ?? cat?.name ?? `Комбо ${index + 1}`,
      kind: 'combo',
    }
  })
}
