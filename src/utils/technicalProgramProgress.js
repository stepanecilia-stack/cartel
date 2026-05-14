import { normalizeTechnicalDominanceKey } from './ksrUtils.js'

export const TECH_SEQUENCE_REQUIRED_LEVEL = 'MOTOR_SKILL_LEVEL_1'

export const TECH_LEVEL_RANK = {
  NOT_LEARNED: 0,
  KNOWLEDGE: 1,
  MOTOR_SKILL_LEVEL_1: 2,
  MOTOR_SKILL_LEVEL_2: 3,
  AUTOMATED: 4,
}

export const TECH_SEQUENCE_NAME_HINTS = [
  ['фронтальная стойка'],
  ['передвижение по кругу', 'фронталь'],
  ['боевая стойка'],
  ['передвижение в боевой стойке'],
  ['оттяжка (шагом)', 'оттяжка шагом'],
  ['оттяжка (отскоком назад)', 'оттяжка отскоком'],
  ['прямой удар передней рукой в голову', 'прямой передней в голову'],
  ['защита подставкой от прямого удара в голову', 'защита подставкой (голова)'],
  ['прямой удар передней рукой в туловище', 'прямой передней в туловище'],
  ['защита подставкой  локтя', 'защита подставкой локтя'],
  ['прямой удар сильной рукой в голову', 'прямой сильной в голову'],
  ['защита подставкой плеча'],
  ['прямой удар сильной рукой в туловище', 'прямой сильной в туловище'],
  ['удары во фронтальной стойке на скресном шаге', 'удары во фронтальной стойке на скрёстном шаге'],
  ['защита уклоном'],
  ['защита отбивом', 'внутрь', 'наружу'],
  ['сайд-степ', 'сайдстеп'],
  ['нырок'],
  ['разворот', 'боевой стойке'],
]

const normalizeTechName = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()

const atomNameMatchesHints = (atomName, hints) => {
  const normalized = normalizeTechName(atomName)
  return hints.every((hint) => normalized.includes(normalizeTechName(hint)))
}

export const resolveSequenceOrderIndex = (atom) => {
  const byName = TECH_SEQUENCE_NAME_HINTS.findIndex((hints) => atomNameMatchesHints(atom?.name, hints))
  if (byName >= 0) return byName
  const n = Number(atom?.number)
  if (Number.isFinite(n) && n >= 1) return n - 1
  return Number.MAX_SAFE_INTEGER
}

export const isTechnicalLevelUnlockedForNext = (levelKey) =>
  (TECH_LEVEL_RANK[normalizeTechnicalDominanceKey(levelKey)] ?? 0) >=
  (TECH_LEVEL_RANK[TECH_SEQUENCE_REQUIRED_LEVEL] ?? 2)

/** Канонический порядок атомов программы (как на странице ученика). */
export function orderTechnicalAtomsForProgram(atoms) {
  if (!Array.isArray(atoms) || atoms.length === 0) return []
  return [...atoms].sort((a, b) => {
    const aIdx = resolveSequenceOrderIndex(a)
    const bIdx = resolveSequenceOrderIndex(b)
    if (aIdx !== bIdx) return aIdx - bIdx
    return String(a?.number ?? '').localeCompare(String(b?.number ?? ''), 'ru')
  })
}

export function buildTechnicalLocksById(orderedAtoms, technicalData) {
  const locks = {}
  let previousUnlocked = true
  const data = technicalData && typeof technicalData === 'object' ? technicalData : {}
  for (const atom of orderedAtoms) {
    const locked = !previousUnlocked
    locks[atom.id] = locked
    const currentLevel = data[atom.id]?.level
    previousUnlocked = previousUnlocked && isTechnicalLevelUnlockedForNext(currentLevel)
  }
  return locks
}

/** Нормализация уровней из Firestore (как `emptyTechnicalRecord` на странице ученика). */
export function normalizeStudentTechnicalData(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue
    out[k] = { ...v, level: normalizeTechnicalDominanceKey(v.level) }
  }
  return out
}

export function rankTechnicalLevel(level) {
  return TECH_LEVEL_RANK[normalizeTechnicalDominanceKey(level)] ?? 0
}

function findCoachStyleFocusOpen(orderedAtoms, locks, data) {
  let focusOpen = null
  let focusRank = -1
  for (const atom of orderedAtoms) {
    if (locks[atom.id]) break
    const r = rankTechnicalLevel(data[atom.id]?.level)
    if (r < 2) {
      focusOpen = atom
      focusRank = r
      break
    }
  }
  if (!focusOpen) {
    for (const atom of orderedAtoms) {
      if (locks[atom.id]) break
      const r = rankTechnicalLevel(data[atom.id]?.level)
      if (r < 3) {
        focusOpen = atom
        focusRank = r
        break
      }
    }
  }
  return { focusOpen, focusRank }
}

/**
 * Текущий «фокус» техники для дашборда: согласован с логикой рекомендаций тренера + понятные fallback.
 * @returns {{ atom: object, focusIndex: number, focusRank: number, levelKey: string, role: 'focus'|'next_locked'|'trail'|'all_done' }}
 */
export function resolveDashboardFocusAtom(orderedAtoms, locks, data) {
  const { focusOpen, focusRank } = findCoachStyleFocusOpen(orderedAtoms, locks, data)
  if (focusOpen) {
    const idx = orderedAtoms.findIndex((a) => a.id === focusOpen.id)
    return {
      atom: focusOpen,
      focusIndex: Math.max(0, idx),
      focusRank,
      levelKey: normalizeTechnicalDominanceKey(data[focusOpen.id]?.level),
      role: 'focus',
    }
  }
  const firstLocked = orderedAtoms.find((a) => locks[a.id])
  if (firstLocked) {
    const idx = orderedAtoms.findIndex((a) => a.id === firstLocked.id)
    return {
      atom: firstLocked,
      focusIndex: Math.max(0, idx),
      focusRank: rankTechnicalLevel(data[firstLocked.id]?.level),
      levelKey: normalizeTechnicalDominanceKey(data[firstLocked.id]?.level),
      role: 'next_locked',
    }
  }
  for (let i = orderedAtoms.length - 1; i >= 0; i -= 1) {
    const a = orderedAtoms[i]
    const k = normalizeTechnicalDominanceKey(data[a.id]?.level)
    if (k !== 'AUTOMATED') {
      return {
        atom: a,
        focusIndex: i,
        focusRank: rankTechnicalLevel(data[a.id]?.level),
        levelKey: k,
        role: 'trail',
      }
    }
  }
  const last = orderedAtoms[orderedAtoms.length - 1]
  const idx = orderedAtoms.length - 1
  return {
    atom: last,
    focusIndex: idx,
    focusRank: 4,
    levelKey: 'AUTOMATED',
    role: 'all_done',
  }
}

/**
 * До 5 позиций вокруг focusIndex: «2 назад — текущий — 2 вперёд», с паддингом на краях программы.
 * @returns {{ slots: { kind: 'atom'|'pad', atom?: object, index?: number, isCurrent: boolean }[] }}
 */
export function buildTechnicalFiveWindow(orderedAtoms, focusIndex) {
  const n = orderedAtoms.length
  const emptySlots = () =>
    Array.from({ length: 5 }, () => ({
      kind: 'pad',
      atom: undefined,
      index: undefined,
      isCurrent: false,
    }))
  if (n === 0) return { slots: emptySlots() }
  const f = Math.min(Math.max(Number(focusIndex) || 0, 0), n - 1)
  let start = f - 2
  let end = f + 2
  if (start < 0) {
    end += -start
    start = 0
  }
  if (end > n - 1) {
    start -= end - (n - 1)
    end = n - 1
  }
  start = Math.max(0, start)
  end = Math.min(n - 1, end)
  if (n <= 5) {
    start = 0
    end = n - 1
  } else {
    if (start === 0) end = Math.min(n - 1, start + 4)
    if (end === n - 1) start = Math.max(0, end - 4)
  }
  const indices = []
  for (let i = start; i <= end; i += 1) indices.push(i)
  while (indices.length < 5 && indices[0] > 0) indices.unshift(indices[0] - 1)
  while (indices.length < 5 && indices[indices.length - 1] < n - 1) indices.push(indices[indices.length - 1] + 1)
  const slots = indices.slice(0, 5).map((i) => ({
    kind: 'atom',
    atom: orderedAtoms[i],
    index: i,
    isCurrent: i === f,
  }))
  while (slots.length < 5) slots.push({ kind: 'pad', atom: undefined, index: undefined, isCurrent: false })
  return { slots: slots.slice(0, 5) }
}

/** Сколько первых атомов в программе должны быть не ниже «Умение», чтобы был допуск к отработке в парах. */
export const PAIR_WORK_MIN_UMENIE_ATOMS = 8

/**
 * Сколько из первых 8 атомов программы (по каноническому порядку) уже не ниже «Умение».
 * Допуск к парам: все первые 8 на «Умение» или выше.
 */
export function countFirstProgramAtomsAtOrAboveUmenie(orderedAtoms, data) {
  const d = data && typeof data === 'object' ? data : {}
  if (!Array.isArray(orderedAtoms) || !orderedAtoms.length) return 0
  const slice = orderedAtoms.slice(0, PAIR_WORK_MIN_UMENIE_ATOMS)
  let n = 0
  for (const atom of slice) {
    if (rankTechnicalLevel(d[atom.id]?.level) >= TECH_LEVEL_RANK.MOTOR_SKILL_LEVEL_1) n += 1
  }
  return n
}

export function hasPairWorkEligibility(orderedAtoms, data) {
  if (!Array.isArray(orderedAtoms) || orderedAtoms.length < PAIR_WORK_MIN_UMENIE_ATOMS) return false
  return countFirstProgramAtomsAtOrAboveUmenie(orderedAtoms, data) >= PAIR_WORK_MIN_UMENIE_ATOMS
}

export function buildDashboardTechnicalSnapshot(programAtoms, technicalDataRaw) {
  const ordered = orderTechnicalAtomsForProgram(programAtoms || [])
  if (!ordered.length) {
    return {
      empty: true,
      ordered,
      data: {},
      locks: {},
      focus: null,
      window: { slots: [] },
      pairWorkEligible: false,
      pairWorkUmenieCount: 0,
      pairWorkRequired: PAIR_WORK_MIN_UMENIE_ATOMS,
    }
  }
  const data = normalizeStudentTechnicalData(technicalDataRaw)
  const locks = buildTechnicalLocksById(ordered, data)
  const focus = resolveDashboardFocusAtom(ordered, locks, data)
  const window = buildTechnicalFiveWindow(ordered, focus.focusIndex)
  const pairWorkUmenieCount = countFirstProgramAtomsAtOrAboveUmenie(ordered, data)
  const pairWorkEligible = pairWorkUmenieCount >= PAIR_WORK_MIN_UMENIE_ATOMS
  return {
    empty: false,
    ordered,
    data,
    locks,
    focus,
    window,
    pairWorkEligible,
    pairWorkUmenieCount,
    pairWorkRequired: PAIR_WORK_MIN_UMENIE_ATOMS,
  }
}
