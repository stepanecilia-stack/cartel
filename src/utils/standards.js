/**
 * Золотые стандарты (идеальный рост по весу, полу и возрасту) + типаж.
 * Используется для КСП: KSP ≈ Z × H (в процентах после ×100).
 */

import { computeAthleteAgeYears, normalizeBirthYearNumber } from './studentModel.js'

const clamp = (v, a, b) => Math.min(Math.max(v, a), b)

/** @typedef {{ gender: 'M'|'F', ageGroup: string, weightMin: number, weightMax: number, heightMin: number, heightMax: number, openTop?: boolean, label: string }} GoldRow */

/** @param {number} age */
export function ageToStandardsGroup(age) {
  if (age >= 13 && age <= 14) return '13-14'
  if (age >= 15 && age <= 16) return '15-16'
  if (age >= 17 && age <= 18) return '17-18'
  if (age >= 19) return '19-22'
  return null
}

/** Юноши 13–14 */
const M_13_14 = [
  { weightMin: 37, weightMax: 40, heightMin: 153, heightMax: 156, label: 'Жилистый, «сухие» длинные мышцы.' },
  { weightMin: 42, weightMax: 42, heightMin: 158, heightMax: 158, label: 'Легкий атлет, акцент на скорость и прыжок.' },
  { weightMin: 44, weightMax: 44, heightMin: 161, heightMax: 161, label: 'Сбалансированный, начинает оформляться плечевой пояс.' },
  { weightMin: 46, weightMax: 46, heightMin: 164, heightMax: 164, label: 'Эталон. Оптимальное сочетание рычага и плотности.' },
  { weightMin: 48, weightMax: 48, heightMin: 167, heightMax: 167, label: 'Снайпер. Длинные руки, высокая мобильность.' },
  { weightMin: 50, weightMax: 50, heightMin: 170, heightMax: 170, label: 'Атлетичный. Появляется мощь в ударе за счет спины.' },
  { weightMin: 52, weightMax: 52, heightMin: 172, heightMax: 172, label: 'Плотный. Хорошо развиты широчайшие и дельты.' },
  { weightMin: 54, weightMax: 54, heightMin: 174, heightMax: 174, label: 'Универсал. Мощный торс при сохранении роста.' },
  { weightMin: 57, weightMax: 57, heightMin: 176, heightMax: 176, label: 'Силовик-темповик. «Мясо» на груди и мощные ноги.' },
  { weightMin: 60, weightMax: 60, heightMin: 178, heightMax: 178, label: 'Пик функционала. Максимальная плотность удара.' },
  { weightMin: 63, weightMax: 63, heightMin: 181, heightMax: 181, label: 'Крупный атлет. Рост взрослого, сила подростка.' },
  { weightMin: 66, weightMax: 66, heightMin: 183, heightMax: 183, label: 'Мощный каркас. Доминирование за счет физики.' },
  { weightMin: 70, weightMax: 70, heightMin: 185, heightMax: 185, label: 'Тяжелоатлетическое сложение. Взрывной прыжок.' },
  { weightMin: 75, weightMax: 75, heightMin: 188, heightMax: 188, label: 'Гигант с мышечной базой. Редкий, элитный профиль.' },
  { weightMin: 80, weightMax: 80, heightMin: 191, heightMax: 191, label: 'Будущий супертяж. Огромный размах рук.' },
  { weightMin: 81, weightMax: 95, heightMin: 194, heightMax: 220, openTop: true, label: 'Абсолютное доминирование. Мощь + Рост.' },
]

/** Юноши 15–16 */
const M_15_16 = [
  { weightMin: 44, weightMax: 46, heightMin: 160, heightMax: 162, label: 'Очень сухой, «звенящий» атлет. Предел весогонки.' },
  { weightMin: 48, weightMax: 48, heightMin: 164, heightMax: 164, label: 'Снайпер-легкач. Высокая скорость рук.' },
  { weightMin: 50, weightMax: 50, heightMin: 167, heightMax: 167, label: 'Оформленный атлет. Появляется жесткость в кости.' },
  { weightMin: 52, weightMax: 52, heightMin: 170, heightMax: 170, label: 'Баланс. Плечи шире таза, сухая талия.' },
  { weightMin: 54, weightMax: 54, heightMin: 172, heightMax: 172, label: 'Плотный «игровик». Мощные ноги для челнока.' },
  { weightMin: 57, weightMax: 57, heightMin: 175, heightMax: 175, label: 'Золотая середина. Идеальный рычаг для этого веса.' },
  { weightMin: 60, weightMax: 60, heightMin: 177, heightMax: 177, label: 'Универсал. Мышцы спины и груди уже отчетливы.' },
  { weightMin: 63, weightMax: 63, heightMin: 179, heightMax: 179, label: 'Силовик. Тяжелый, акцентированный удар.' },
  { weightMin: 66, weightMax: 66, heightMin: 181, heightMax: 181, label: 'Атлет с глубоким рельефом. Мощный плечевой пояс.' },
  { weightMin: 70, weightMax: 70, heightMin: 183, heightMax: 183, label: 'Крупный, сбитый боец. Доминирует за счет массы.' },
  { weightMin: 75, weightMax: 75, heightMin: 186, heightMax: 186, label: 'Полутяж. Рост взрослого профи, мощный костяк.' },
  { weightMin: 80, weightMax: 80, heightMin: 189, heightMax: 189, label: 'Тяжеловес. Огромная физическая мощь + ГТО золото.' },
  { weightMin: 81, weightMax: 130, heightMin: 192, heightMax: 220, openTop: true, label: 'Абсолютка. Массивный скелет, готовый к большим весам.' },
]

/** Юноши 17–18 и 19–22 (одинаковые эталоны) */
const M_17_22 = [
  { weightMin: 48, weightMax: 48, heightMin: 162, heightMax: 162, label: 'Предельно сухой «мухач». Только жилы и кости.' },
  { weightMin: 51, weightMax: 51, heightMin: 165, heightMax: 165, label: 'Скоростной снайпер. Феноменальная резкость.' },
  { weightMin: 54, weightMax: 54, heightMin: 168, heightMax: 168, label: 'Техничный «игровик». Идеальный баланс рычагов.' },
  { weightMin: 57, weightMax: 57, heightMin: 171, heightMax: 171, label: 'Оформленный атлет. Плотный удар, широкие плечи.' },
  { weightMin: 60, weightMax: 60, heightMin: 174, heightMax: 174, label: 'Классика. Образцовый боксерский силуэт.' },
  { weightMin: 63.5, weightMax: 63.5, heightMin: 176, heightMax: 176, label: 'Темповик. Мощный торс, готовый к высокой плотности боя.' },
  { weightMin: 67, weightMax: 67, heightMin: 178, heightMax: 178, label: 'Силовик. Жесткая кость, тяжелый кулак.' },
  { weightMin: 71, weightMax: 71, heightMin: 181, heightMax: 181, label: 'Идеальный рычаг + мужская мощь.' },
  { weightMin: 75, weightMax: 75, heightMin: 183, heightMax: 183, label: 'Мощный средневес. Доминирование за счет физики.' },
  { weightMin: 80, weightMax: 80, heightMin: 186, heightMax: 186, label: 'Полутяж. Сбитый, атлетичный, очень опасный.' },
  { weightMin: 86, weightMax: 86, heightMin: 189, heightMax: 189, label: 'Тяжеловес-атлет. Глубокий рельеф, мощная спина.' },
  { weightMin: 92, weightMax: 92, heightMin: 192, heightMax: 192, label: 'Крузер. Огромная мощь при сохранении мобильности.' },
  { weightMin: 93, weightMax: 140, heightMin: 195, heightMax: 220, openTop: true, label: 'Супертяж. Массивный костяк, готовый нести 100+ кг.' },
]

/** Девушки 13–14 */
const F_13_14 = [
  { weightMin: 34, weightMax: 36, heightMin: 158, heightMax: 161, label: 'Дистанция. Недосягаемость для атак, работа передней рукой.' },
  { weightMin: 38, weightMax: 38, heightMin: 163, heightMax: 163, label: 'Рычаг. Контроль центра ринга за счет длины рук.' },
  { weightMin: 40, weightMax: 40, heightMin: 165, heightMax: 165, label: 'Тайминг. Встречные удары на входе соперницы в зону.' },
  { weightMin: 42, weightMax: 42, heightMin: 167, heightMax: 167, label: 'Маневренность. Удержание дальней дистанции весь бой.' },
  { weightMin: 44, weightMax: 44, heightMin: 169, heightMax: 169, label: 'Геометрия. Удары под углами, недоступные низким.' },
  { weightMin: 46, weightMax: 46, heightMin: 170, heightMax: 170, label: 'Доминирование. Полный контроль пространства ринга.' },
  { weightMin: 48, weightMax: 48, heightMin: 172, heightMax: 172, label: 'Прессинг. Расстрел с дистанции без входа в клинч.' },
  { weightMin: 51, weightMax: 51, heightMin: 174, heightMax: 174, label: 'Функционал. Сочетание длины шага и частоты ударов.' },
  { weightMin: 54, weightMax: 54, heightMin: 176, heightMax: 176, label: 'Резкость. Длинный «хлесткий» джеб, сбивающий атаки.' },
  { weightMin: 57, weightMax: 57, heightMin: 178, heightMax: 178, label: 'Атлетизм. Использование рычага как рычага силы.' },
  { weightMin: 60, weightMax: 60, heightMin: 180, heightMax: 180, label: 'Психология. Подавление ростом и объемом атак.' },
  { weightMin: 64, weightMax: 64, heightMin: 183, heightMax: 183, label: 'Точность. Работа как «высокий снайпер» по этажам.' },
  { weightMin: 70, weightMax: 120, heightMin: 185, heightMax: 210, openTop: true, label: 'Тотальный контроль. Соперницы просто не дотягиваются.' },
]

/** Девушки 15–16 */
const F_15_16 = [
  { weightMin: 44, weightMax: 46, heightMin: 166, heightMax: 168, label: 'Скорость. Максимальный рычаг при сохранении резкости.' },
  { weightMin: 48, weightMax: 48, heightMin: 169, heightMax: 169, label: 'Тайминг. Работа на опережение, контроль дистанции.' },
  { weightMin: 50, weightMax: 50, heightMin: 171, heightMax: 171, label: 'Линейность. Прямые удары, которые длиннее атак соперниц.' },
  { weightMin: 52, weightMax: 52, heightMin: 172, heightMax: 172, label: 'Баланс. Устойчивость в ногах + длинный джеб.' },
  { weightMin: 54, weightMax: 54, heightMin: 173, heightMax: 173, label: 'Жесткость. Появляется «взрыв» в ударе за счет спины.' },
  { weightMin: 57, weightMax: 57, heightMin: 174, heightMax: 174, label: 'Универсализм. Одинаково эффективна на дистанции и в отходе.' },
  { weightMin: 60, weightMax: 60, heightMin: 175, heightMax: 175, label: 'Плотность. Мышцы плечевого пояса позволяют «рубиться».' },
  { weightMin: 63, weightMax: 63, heightMin: 176, heightMax: 176, label: 'Сила. Акцентированные удары, сбивающие защиту.' },
  { weightMin: 66, weightMax: 66, heightMin: 177, heightMax: 177, label: 'Прессинг. Подавление физикой при сохранении роста.' },
  { weightMin: 70, weightMax: 70, heightMin: 178, heightMax: 178, label: 'Мощь. Тяжелый удар, работа по корпусу.' },
  { weightMin: 75, weightMax: 75, heightMin: 180, heightMax: 180, label: 'Доминирование. Сочетание массы и высокого роста.' },
  { weightMin: 80, weightMax: 80, heightMin: 182, heightMax: 182, label: 'Атлетизм. Мощный костяк, готовый к тяжелым разменам.' },
  { weightMin: 81, weightMax: 120, heightMin: 185, heightMax: 210, openTop: true, label: 'Абсолютка. Физическое превосходство во всем.' },
]

/** Юниорки 17–18 */
const F_17_18 = [
  { weightMin: 48, weightMax: 48, heightMin: 164, heightMax: 166, label: 'Резкость. Предельная концентрация силы в сухом теле.' },
  { weightMin: 50, weightMax: 50, heightMin: 168, heightMax: 168, label: 'Линейная скорость. Быстрый вход-выход на длинных ногах.' },
  { weightMin: 52, weightMax: 52, heightMin: 170, heightMax: 170, label: 'Контр-атака. Проваливание соперницы и расстрел с дистанции.' },
  { weightMin: 54, weightMax: 54, heightMin: 171, heightMax: 171, label: 'Техничность. Идеальная координация рычагов и корпуса.' },
  { weightMin: 57, weightMax: 57, heightMin: 172, heightMax: 172, label: 'Жесткий джеб. Остановка любых атак передней рукой.' },
  { weightMin: 60, weightMax: 60, heightMin: 173, heightMax: 173, label: 'Универсальность. Работа на всех дистанциях за счет атлетизма.' },
  { weightMin: 63, weightMax: 63, heightMin: 174, heightMax: 174, label: 'Плотный бой. Силовое доминирование в разменах.' },
  { weightMin: 66, weightMax: 66, heightMin: 175, heightMax: 175, label: 'Устойчивость. Мощный фундамент (ноги) + длинный удар.' },
  { weightMin: 70, weightMax: 70, heightMin: 176, heightMax: 176, label: 'Акцент. Тяжелый, «мужской» по силе удар.' },
  { weightMin: 75, weightMax: 75, heightMin: 178, heightMax: 178, label: 'Физика. Подавление массой при сохранении роста.' },
  { weightMin: 81, weightMax: 81, heightMin: 180, heightMax: 180, label: 'Мощь. Доминирование за счет объема мышц и рычага.' },
  { weightMin: 82, weightMax: 120, heightMin: 183, heightMax: 210, openTop: true, label: 'Абсолютка. Максимальный костяк и ударная мощь.' },
]

/** Юниорки 19–22 / женщины */
const F_19_22 = [
  { weightMin: 48, weightMax: 48, heightMin: 164, heightMax: 166, label: 'Скорость и рычаг. Работа на дистанции, недосягаемость.' },
  { weightMin: 50, weightMax: 50, heightMin: 168, heightMax: 168, label: 'Тайминг. Встречные удары, контроль передней рукой.' },
  { weightMin: 52, weightMax: 52, heightMin: 170, heightMax: 170, label: 'Линейная мощь. Длинные прямые, пробивающие защиту.' },
  { weightMin: 54, weightMax: 54, heightMin: 171, heightMax: 171, label: 'Баланс. Идеальное сочетание устойчивости и длины рук.' },
  { weightMin: 57, weightMax: 57, heightMin: 172, heightMax: 172, label: 'Жесткость. Остановка атак за счет плотности удара.' },
  { weightMin: 60, weightMax: 60, heightMin: 173, heightMax: 173, label: 'Универсализм. Доминирование на всех дистанциях.' },
  { weightMin: 63, weightMax: 63, heightMin: 174, heightMax: 174, label: 'Силовой прессинг. Подавление физикой и рычагом.' },
  { weightMin: 66, weightMax: 66, heightMin: 175, heightMax: 175, label: 'Устойчивость. Мощные ноги (база ГТО) + длинный удар.' },
  { weightMin: 70, weightMax: 70, heightMin: 176, heightMax: 176, label: 'Акцент. Тяжелый удар, работа по этажам.' },
  { weightMin: 75, weightMax: 75, heightMin: 178, heightMax: 178, label: 'Атлетизм. Мощный плечевой пояс, доминирование в клинче.' },
  { weightMin: 81, weightMax: 81, heightMin: 180, heightMax: 180, label: 'Физическая мощь. Подавление массой и ростом.' },
  { weightMin: 82, weightMax: 120, heightMin: 183, heightMax: 210, openTop: true, label: 'Абсолютка. Максимальный костяк, сокрушительный удар.' },
]

function expand(rows, gender, ageGroup) {
  return rows.map((r) => ({ ...r, gender, ageGroup }))
}

/** @type {GoldRow[]} */
export const GOLD_STANDARDS = [
  ...expand(M_13_14, 'M', '13-14'),
  ...expand(M_15_16, 'M', '15-16'),
  ...expand(M_17_22, 'M', '17-18'),
  ...expand(M_17_22, 'M', '19-22'),
  ...expand(F_13_14, 'F', '13-14'),
  ...expand(F_15_16, 'F', '15-16'),
  ...expand(F_17_18, 'F', '17-18'),
  ...expand(F_19_22, 'F', '19-22'),
]

function intervalDistance(weight, row) {
  if (weight >= row.weightMin && weight <= row.weightMax) return 0
  if (weight < row.weightMin) return row.weightMin - weight
  return weight - row.weightMax
}

/**
 * @param {{ gender?: string, birthYear?: number, weight?: number }} athlete
 * @returns {{ row: GoldRow, weightDistance: number } | null}
 */
export function findGoldStandardRow(athlete) {
  const birthYear = normalizeBirthYearNumber(athlete.birthYear)
  if (!birthYear) return null
  const age = computeAthleteAgeYears(birthYear)
  if (age == null) return null
  const ageGroup = ageToStandardsGroup(age)
  if (!ageGroup) return null
  const gender = athlete.gender === 'F' || athlete.gender === 'Ж' ? 'F' : 'M'
  const weight = Number(athlete.weight ?? 0)
  if (!weight || weight < 20) return null

  const pool = GOLD_STANDARDS.filter((r) => r.gender === gender && r.ageGroup === ageGroup)
  if (!pool.length) return null

  const inside = pool.filter((r) => weight >= r.weightMin && weight <= r.weightMax)
  if (inside.length) {
    inside.sort((a, b) => a.weightMax - a.weightMin - (b.weightMax - b.weightMin))
    return { row: inside[0], weightDistance: 0 }
  }

  let best = null
  let bestDist = Infinity
  for (const row of pool) {
    const d = intervalDistance(weight, row)
    if (d < bestDist) {
      bestDist = d
      best = row
    }
  }
  return best ? { row: best, weightDistance: bestDist } : null
}

/**
 * Эталонный рост (см) для сравнения с фактическим: середина коридора; при openTop — нижняя граница эталона.
 * @param {GoldRow} row
 */
export function referenceIdealHeightCm(row) {
  if (!row || row.heightMin == null) return null
  const min = Number(row.heightMin)
  const max = Number(row.heightMax)
  if (!Number.isFinite(min)) return null
  if (row.openTop) return min
  if (Number.isFinite(max) && min === max) return min
  if (Number.isFinite(max)) return Math.round((min + max) / 2)
  return min
}

/**
 * Геометрический дефицит: эталонный рост минус фактический. Критический, если разница > 12 см.
 * @param {object} studentData height, weight, birthYear, gender
 */
export function analyzeGeometricHeightDeficit(studentData = {}) {
  const real = Number(studentData.height ?? 0)
  const result = {
    hasData: false,
    isCritical: false,
    referenceIdealHeightCm: null,
    realHeightCm: Number.isFinite(real) && real > 0 ? real : null,
    deficitCm: null,
  }
  if (!real || real < 100) return result
  const match = findGoldStandardRow(studentData)
  if (!match) return result
  const ideal = referenceIdealHeightCm(match.row)
  if (ideal == null || !Number.isFinite(ideal)) return result
  const deficit = ideal - real
  result.hasData = true
  result.referenceIdealHeightCm = ideal
  result.deficitCm = deficit
  result.isCritical = deficit > 12
  return result
}

/** См на каждый см ниже коридора — штраф сильнее, чем за избыток роста. */
const H_DEFICIT_CM_SCALE = 18
/** См на каждым см выше коридора — мягче, чем симметричный дефицит. */
const H_EXCESS_CM_SCALE = 52

/**
 * H: близость роста к эталонному коридору. Совпадение → 1.0
 * Дефицит роста (ниже эталона) штрафуется сильнее, чем избыток (выше коридора).
 * @param {number} heightCm
 * @param {GoldRow} row
 */
export function calculateHeightFactorH(heightCm, row) {
  const h = Number(heightCm)
  if (!h || h < 100) return 0.35
  const { heightMin, heightMax, openTop } = row
  if (openTop) {
    if (h >= heightMin) return 1
    return clamp(1 - (heightMin - h) / H_DEFICIT_CM_SCALE, 0.35, 1)
  }
  if (h >= heightMin && h <= heightMax) return 1
  if (h < heightMin) return clamp(1 - (heightMin - h) / H_DEFICIT_CM_SCALE, 0, 1)
  return clamp(1 - (h - heightMax) / H_EXCESS_CM_SCALE, 0, 1)
}

/**
 * Z: антропометрия (Ape Index + насколько вес «сидит» в категории + согласованность с типажом)
 */
export function calculateAnthropometricZ(reach, height, row, weightDistance) {
  const h = Number(height)
  const r = Number(reach)
  const referenceHeight = referenceIdealHeightCm(row)
  const referenceReach = referenceHeight
  const heightDelta =
    Number.isFinite(h) && Number.isFinite(referenceHeight) ? h - referenceHeight : 0
  const reachDelta =
    Number.isFinite(r) && Number.isFinite(referenceReach) ? r - referenceReach : 0

  // Рост: дефицит штрафуем жёстче, избыток — мягче.
  const zHeight =
    heightDelta >= 0
      ? clamp(1 + heightDelta / 60, 0.55, 1.03)
      : clamp(1 + heightDelta / 22, 0.35, 1)

  // Размах: даём больший вес, т.к. может компенсировать небольшой недобор роста.
  const zReach =
    reachDelta >= 0
      ? clamp(1 + reachDelta / 35, 0.55, 1.08)
      : clamp(1 + reachDelta / 28, 0.4, 1)

  const zGeom = clamp(0.4 * zHeight + 0.6 * zReach, 0, 1.08)
  const zWeight = weightDistance === 0 ? 1 : clamp(1 - weightDistance / 18, 0.55, 1)
  const z = clamp(zGeom * zWeight, 0, 1)
  return {
    z,
    zHeight,
    zReach,
    zGeom,
    zWeight,
    referenceHeight,
    referenceReach,
    heightDelta,
    reachDelta,
    apeIndex: r - h,
    targetApe: 0,
  }
}

/**
 * КСП (потолок) в процентах 0–100: Z × H × 100
 */
export function calculateKSPPercent(studentData = {}) {
  const height = Number(studentData.height ?? 0)
  const reach = Number(studentData.reach ?? 0)
  const match = findGoldStandardRow(studentData)
  if (!match) {
    return {
      ksp: 0,
      z: 0,
      h: 0,
      row: null,
      typage: null,
      idealHeightRange: null,
      weightDistance: null,
      apeIndex: reach - height,
    }
  }
  const { row, weightDistance } = match
  const h = calculateHeightFactorH(height, row)
  const {
    z,
    zHeight,
    zReach,
    zGeom,
    zWeight,
    referenceHeight,
    referenceReach,
    heightDelta,
    reachDelta,
    apeIndex,
    targetApe,
  } = calculateAnthropometricZ(
    reach,
    height,
    row,
    weightDistance,
  )
  const raw = z * h
  const ksp = Math.round(clamp(raw * 100, 0, 100))
  return {
    ksp,
    z,
    h,
    // Совместимость: ранее UI/отчёты могли использовать поле zApe как «антропометрический подфактор».
    zApe: zGeom,
    zHeight,
    zReach,
    zGeom,
    zWeight,
    row,
    typage: row.label,
    idealHeightRange: row.openTop
      ? `${row.heightMin}+ см`
      : row.heightMin === row.heightMax
        ? `${row.heightMin} см`
        : `${row.heightMin}–${row.heightMax} см`,
    weightDistance,
    referenceHeight,
    referenceReach,
    heightDelta,
    reachDelta,
    apeIndex,
    targetApe,
  }
}

/** Короткое имя типажа для карточки (до первой точки или 42 символа). */
export function shortTypageLabel(full) {
  if (!full || typeof full !== 'string') return ''
  const cut = full.split('.')[0].trim()
  return cut.length > 48 ? `${cut.slice(0, 45)}…` : cut
}
