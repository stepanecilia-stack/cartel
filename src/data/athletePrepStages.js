/**
 * Этапы подготовки конкретного спортсмена — что делаем сейчас и к чему идём.
 * Альманах (ОФП→СФП→СТТМ) — только внутренняя методика, см. cartelPrepMethodology / PrepMethodologyBlock.
 */
import { resolveSeasonMode } from './seasonGoals.js'

/** @typedef {import('./seasonGoals.js').SeasonMode} SeasonMode */
/** @typedef {import('./seasonGoals.js').SeasonGoalId} SeasonGoalId */
/** @typedef {{ mission: string, teach: string[], results: string[], check: string }} CoachBrief */
/** @typedef {{ task: string, via: string }} StageTask */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   short: string,
 *   whatWeDo: string,
 *   tasks: StageTask[],
 *   amHint: string,
 *   pmHint: string,
 * }} AthleteStageDisplay */

export const ATHLETE_STAGE_STYLES = {
  gap: { chip: 'bg-amber-50 border-amber-200 text-amber-950', bar: 'bg-amber-400' },
  base: { chip: 'bg-emerald-50 border-emerald-200 text-emerald-900', bar: 'bg-emerald-500' },
  special: { chip: 'bg-orange-50 border-orange-200 text-orange-900', bar: 'bg-orange-500' },
  'fight-ready': { chip: 'bg-violet-50 border-violet-200 text-violet-900', bar: 'bg-violet-500' },
  taper: { chip: 'bg-sky-50 border-sky-200 text-sky-900', bar: 'bg-sky-500' },
  open: { chip: 'bg-slate-100 border-slate-200 text-slate-800', bar: 'bg-slate-400' },
  between: { chip: 'bg-teal-50 border-teal-200 text-teal-900', bar: 'bg-teal-500' },
  transition: { chip: 'bg-slate-100 border-slate-200 text-slate-700', bar: 'bg-slate-400' },
}

const STAGE_CORE = {
  gap: {
    label: 'Разбор и приоритеты',
    short: 'разбор',
    whatWeDo: 'Фиксируем слабые места и план работы до ближайшего старта.',
    tasks: [
      { task: 'Слабые места', via: 'техника, тактика, физика' },
      { task: '3 приоритета', via: 'в карточке ученика' },
      { task: 'Восстановление', via: 'сон, лёгкая работа' },
    ],
    amHint: 'Разбор боёв, точечная школа бокса',
    pmHint: 'Снаряды — средний темп',
  },
  base: {
    label: 'Набор базы',
    short: 'база',
    whatWeDo: 'Выносливость, техника, объём — фундамент под победу на отборе.',
    tasks: [
      { task: 'Выносливость', via: 'кросс, ОРУ' },
      { task: 'Техника', via: 'школа, связки' },
      { task: 'Объём', via: 'снаряды, партнёр' },
    ],
    amHint: 'Кросс, школа бокса',
    pmHint: 'Снаряды, работа с партнёром',
  },
  special: {
    label: 'Боевая выносливость',
    short: 'выносл.',
    whatWeDo: 'Организм привыкает к темпу боя — отрезки и скорость.',
    tasks: [
      { task: 'Спец. выносливость', via: 'отрезки как в бою' },
      { task: 'Скорость', via: 'снаряды, серии' },
      { task: 'Качество ударов', via: 'партнёр' },
    ],
    amHint: 'Интервалы под регламент',
    pmHint: 'Снаряды, СТТМ',
  },
  'fight-ready': {
    label: 'Готовность к бою',
    short: 'бой',
    whatWeDo: 'Тактика, спарринги, уверенность — выходим на старт побеждать.',
    tasks: [
      { task: 'Спарринги', via: 'разные типы соперников' },
      { task: 'Тактика', via: 'план на турнир' },
      { task: 'Психология', via: 'режим, уверенность' },
    ],
    amHint: 'Спарринги, высокий темп',
    pmHint: 'Снаряды, разбор тактики',
  },
  taper: {
    label: 'Подводка к старту',
    short: 'подводка',
    whatWeDo: 'Свежесть и острота — объём вниз, качество вверх.',
    tasks: [
      { task: 'Свежесть', via: 'короткие раунды' },
      { task: 'Вес и режим', via: 'сон, питание' },
      { task: 'Активация', via: 'тень, разминка' },
    ],
    amHint: 'Коротко, без заливки',
    pmHint: 'Знакомые задачи',
  },
  open: {
    label: 'План без даты старта',
    short: 'план',
    whatWeDo: 'Работаем по приоритетам; нужна дата ближайшего отбора в календаре.',
    tasks: [
      { task: 'Техника и база', via: 'ежедневно' },
      { task: 'Опыт', via: 'турниры по плану' },
      { task: 'Дата старта', via: 'внести в календарь' },
    ],
    amHint: 'База, школа бокса',
    pmHint: 'Снаряды, опыт',
  },
  between: {
    label: 'Между стартами',
    short: 'между',
    whatWeDo: 'Поддерживаем форму, набираем опыт — без пика к далёкому отбору.',
    tasks: [
      { task: 'Техника', via: 'школа, снаряды' },
      { task: 'Опыт', via: 'водокачки, матчевые' },
      { task: 'Фокус', via: 'выбрать след. отбор' },
    ],
    amHint: 'По задаче сезона',
    pmHint: 'Контрольные бои',
  },
}

/** @type {Record<SeasonMode, Record<string, CoachBrief>>} */
const STAGE_BRIEFS = {
  foundation: {
    gap: {
      mission: 'Понять, что мешает прогрессу, и задать 3 приоритета в работе.',
      teach: ['Разбор последних боёв', 'Запись слабых мест', 'Лёгкая ОФП'],
      results: ['Приоритеты ясны тренеру и спортсмену', 'План на 2–4 недели'],
      check: 'Три задачи записаны и понятны.',
    },
    base: {
      mission: 'Набрать базу: техника и физика до уровня первых отборов.',
      teach: ['Школа бокса', 'Кросс, ОРУ', 'Снаряды в среднем темпе'],
      results: ['Техника стабильнее', 'Нормативы ближе к группе'],
      check: 'Спарринг 4×2:15 — техника держится.',
    },
    special: {
      mission: 'Первые «боевые» отрезки без перегруза.',
      teach: ['Короткие интервалы', 'Снаряды', 'Лёгкие спарринги'],
      results: ['Темп переносится в бой', 'Нет перетренированности'],
      check: 'Самочувствие после тренировки нормальное.',
    },
    'fight-ready': {
      mission: 'Закрепить технику в боевой обстановке.',
      teach: ['Спарринги', 'Тактика', 'Разбор'],
      results: ['Увереннее в бою', 'Меньше ошибок'],
      check: 'Контрольный спарринг — базовые задачи выполняются.',
    },
    taper: {
      mission: 'Выйти на старт свежим.',
      teach: ['Короткая работа', 'Режим'],
      results: ['Свежесть', 'Собранность'],
      check: 'Готов к регламенту.',
    },
    open: {
      mission: 'База без привязки к дате — внесите отбор в календарь.',
      teach: ['Техника', 'ОФП', 'Нормативы'],
      results: ['Рост базы', 'Появится план с датой'],
      check: 'Старт добавлен в карточку.',
    },
    between: {
      mission: 'Между стартами: техника и мягкий опыт.',
      teach: ['Школа бокса', 'Снаряды', 'Контрольные турниры'],
      results: ['База не просела', 'Опыт растёт'],
      check: 'Прогресс в карточке виден.',
    },
  },
  advance: {
    gap: {
      mission: 'После вылета: что помешало пройти дальше — и с чего начать путь к следующему отбору.',
      teach: ['3 слабых места с боёв', 'План по неделям', 'Индивидуальные задачи'],
      results: ['План до старта записан', 'Первая неделя закрывает главный пробел'],
      check: 'Приоритеты в карточке согласованы.',
    },
    base: {
      mission: 'Фундамент под победу на ближайшем отборе — сильнее, чем в момент вылета.',
      teach: ['Объём школы и ОФП', 'Снаряды', 'Опытные бои по плану'],
      results: ['Выносливость и техника выросли', 'Готовность к спец. нагрузке'],
      check: 'Спарринг — нет обвала на 3-м раунде.',
    },
    special: {
      mission: 'Боевая выносливость — чтобы в бою не потерять темп.',
      teach: ['Отрезки под регламент', 'Снаряды на скорость', 'СТТМ с партнёром'],
      results: ['Восстановление между отрезками', 'Скорость выше'],
      check: '3 цикла отрезков за тренировку — темп держит.',
    },
    'fight-ready': {
      mission: 'Готовность к бою: тактика и спарринги — задача победить на отборе.',
      teach: ['Спарринги', 'План на турнир', 'Снаряды в боевом темпе'],
      results: ['План боя понятен', 'Уверенность к завязке'],
      check: 'Условный бой — план выполняется.',
    },
    taper: {
      mission: 'Подводка: свежесть к дате старта.',
      teach: ['Короткие раунды', 'Сон, вес', 'Тень'],
      results: ['Лёгкие ноги', 'Желание выйти на ринг'],
      check: 'Лёгкий спарринг — быстрее и чище.',
    },
    open: {
      mission: 'Наращиваем базу; укажите дату отбора — посчитаем этапы до старта.',
      teach: ['Техника', 'ОФП', 'Добавить старт в календарь'],
      results: ['Рост без хаоса', 'Появится обратный отсчёт'],
      check: 'Фокусный старт выбран.',
    },
    between: {
      mission: 'Между отборами: опыт + поддержание — к следующему старту без лишнего пика.',
      teach: ['Техника по слабым местам', 'Водокачки по плану', 'Выбрать фокусный отбор'],
      results: ['Опыт в боях', 'Готовность к микроплану'],
      check: 'Следующий отбор в календаре и в фокусе.',
    },
  },
  peak: {
    gap: {
      mission: 'Разбор: что отделяет от уровня главной цели сезона — начинаем закрывать сейчас.',
      teach: ['Разбор вылета/боёв', 'Техника и тактика', 'Режим'],
      results: ['Главный блокер назван', 'Работа по нему начата'],
      check: 'Прогресс по №1 приоритету виден на тренировке.',
    },
    base: {
      mission: 'Мощная база под пик сезона — объём и чистая техника.',
      teach: ['ОФП, школа', 'Снаряды', 'Спарринги средней интенсивности'],
      results: ['База шире, чем после вылета', 'Готов к спец. блоку'],
      check: 'Темп и техника лучше, чем в момент вылета.',
    },
    special: {
      mission: 'Спец. выносливость к уровню главного старта.',
      teach: ['Соревновательные отрезки', 'Снаряды 180+', 'СТТМ'],
      results: ['Спец. форма растёт', 'Техника в темпе'],
      check: 'Отрезки 3×2:30 — темп не падает.',
    },
    'fight-ready': {
      mission: 'Боевая готовность к победе на ключевом отборе.',
      teach: ['Спарринги с сильными', 'Тактика', 'Психология'],
      results: ['Готов к старту', 'Острота без перегруза'],
      check: 'Турнирный спарринг — держит план.',
    },
    taper: {
      mission: 'Подводка к главному старту.',
      teach: ['Активация', 'Режим', 'Без нового объёма'],
      results: ['Свежесть', 'Собранность'],
      check: 'Разминка — острота есть.',
    },
    open: {
      mission: 'Пик сезона: внесите дату отбора — этапы посчитаются от старта назад.',
      teach: ['Техника', 'ОФП', 'Календарь стартов'],
      results: ['План с датами', 'Понятен обратный отсчёт'],
      check: 'Отбор в фокусе.',
    },
    between: {
      mission: 'Между стартами: сохраняем накопленное, точечный опыт.',
      teach: ['Поддержание', 'Спарринги', 'След. отбор в фокусе'],
      results: ['Форма не просела', 'Пик к нужной дате'],
      check: 'Дней до фокуса известно, пик не сожжён рано.',
    },
  },
}

const MICRO_LABELS = {
  ofp: 'Набор базы',
  sfp: 'Боевая выносливость',
  sttm: 'Готовность к бою',
  taper: 'Подводка',
  preFight: 'Предстарт',
  fight: 'День боя',
  transition: 'Восстановление',
}

/** @param {string | null | undefined} stageId */
export function athleteStageStyle(stageId) {
  if (!stageId) return ATHLETE_STAGE_STYLES.open
  if (stageId.startsWith('micro-')) {
    const micro = stageId.replace('micro-', '')
    if (micro === 'ofp') return ATHLETE_STAGE_STYLES.base
    if (micro === 'sfp') return ATHLETE_STAGE_STYLES.special
    if (micro === 'sttm') return ATHLETE_STAGE_STYLES['fight-ready']
    if (micro === 'taper' || micro === 'preFight') return ATHLETE_STAGE_STYLES.taper
    if (micro === 'fight') return ATHLETE_STAGE_STYLES['fight-ready']
  }
  const legacy = {
    'roadmap-gap': 'gap',
    'roadmap-ofp': 'base',
    'roadmap-sfp': 'special',
    'roadmap-sttm': 'fight-ready',
    'roadmap-taper': 'taper',
    'roadmap-open': 'open',
  }
  const key = legacy[/** @type {keyof typeof legacy} */ (stageId)] ?? stageId
  return ATHLETE_STAGE_STYLES[/** @type {keyof typeof ATHLETE_STAGE_STYLES} */ (key)] ?? ATHLETE_STAGE_STYLES.open
}

/**
 * @param {SeasonMode} seasonMode
 */
function stageThresholds(seasonMode) {
  if (seasonMode === 'foundation') return { taper: 5, fightReady: 18, special: 40, base: 75, gap: 90 }
  if (seasonMode === 'peak') return { taper: 7, fightReady: 21, special: 42, base: 63, gap: 74 }
  return { taper: 7, fightReady: 18, special: 39, base: 60, gap: 72 }
}

/**
 * @param {number | null} daysUntil
 * @param {number} daysFromToday
 * @param {SeasonMode} seasonMode
 */
export function resolveAthleteStageId(daysUntil, daysFromToday, seasonMode) {
  const t = stageThresholds(seasonMode)

  if (daysUntil == null || daysUntil < 0) {
    if (daysFromToday < 14) return 'gap'
    if (daysFromToday < 42) return 'base'
    if (daysFromToday < 70) return 'special'
    return 'fight-ready'
  }

  if (daysUntil <= t.taper) return 'taper'
  if (daysUntil <= t.fightReady) return 'fight-ready'
  if (daysUntil <= t.special) return 'special'
  if (daysUntil <= t.base) return 'base'
  if (daysUntil <= t.gap) return 'gap'
  return 'base'
}

/**
 * @param {string} stageId
 * @param {SeasonMode} seasonMode
 * @returns {AthleteStageDisplay}
 */
export function buildAthleteStageDisplay(stageId, seasonMode) {
  if (stageId.startsWith('micro-')) {
    const microId = stageId.replace('micro-', '')
    const label = MICRO_LABELS[/** @type {keyof typeof MICRO_LABELS} */ (microId)] ?? microId
    const core = STAGE_CORE.base
    return {
      id: stageId,
      label: `Микроплан · ${label}`,
      short: label.slice(0, 6),
      whatWeDo: `Подготовка к дате старта: ${label.toLowerCase()}.`,
      tasks: core.tasks,
      amHint: core.amHint,
      pmHint: core.pmHint,
    }
  }

  const core = STAGE_CORE[/** @type {keyof typeof STAGE_CORE} */ (stageId)] ?? STAGE_CORE.open
  return {
    id: stageId,
    label: core.label,
    short: core.short,
    whatWeDo: core.whatWeDo,
    tasks: core.tasks,
    amHint: core.amHint,
    pmHint: core.pmHint,
  }
}

/**
 * @param {string} stageId
 * @param {SeasonMode} seasonMode
 */
export function buildAthleteStageTraining(stageId, seasonMode) {
  const d = buildAthleteStageDisplay(stageId, seasonMode)
  const lines = [
    { part: 'Утро', text: d.amHint },
    { part: 'День', text: d.pmHint },
    { part: 'Смысл', text: d.whatWeDo },
  ]
  if (stageId === 'gap') {
    lines.push({ part: 'Фокус', text: 'приоритеты спортсмена — в работе сейчас' })
  }
  if (stageId === 'open') {
    lines.push({ part: 'Важно', text: 'дата отбора в календаре' })
  }
  return lines
}

/**
 * @param {string} stageId
 * @param {SeasonMode} seasonMode
 * @returns {CoachBrief}
 */
export function getAthleteStageBrief(stageId, seasonMode) {
  const byMode = STAGE_BRIEFS[seasonMode] ?? STAGE_BRIEFS.advance
  if (stageId.startsWith('micro-')) {
    const microId = stageId.replace('micro-', '')
    const map = {
      ofp: 'base',
      sfp: 'special',
      sttm: 'fight-ready',
      taper: 'taper',
      preFight: 'taper',
      fight: 'fight-ready',
      transition: 'between',
    }
    const key = map[/** @type {keyof typeof map} */ (microId)] ?? 'fight-ready'
    return byMode[key] ?? byMode['fight-ready']
  }
  return byMode[/** @type {keyof typeof byMode} */ (stageId)] ?? byMode.between ?? STAGE_BRIEFS.advance.base
}

export function getMicroStageLabel(microPhaseId) {
  return MICRO_LABELS[/** @type {keyof typeof MICRO_LABELS} */ (microPhaseId)] ?? microPhaseId
}

/**
 * @param {{
 *   seasonGoal?: SeasonGoalId | string | null,
 *   nextSeasonGoal?: SeasonGoalId | string | null,
 *   ladderClosed?: boolean,
 *   inFocusPrep?: boolean,
 *   microPhaseId?: string,
 *   isTransitionDay?: boolean,
 *   daysUntilFocus?: number | null,
 *   daysUntilAnchor?: number | null,
 *   daysFromToday?: number,
 *   hasFocusStart?: boolean,
 *   anchorCertainty?: import('../utils/plannedCompetitions.js').CompetitionDateStatus | 'none',
 * }} ctx
 */
export function resolveAthleteStageIdForDay(ctx) {
  const mode = resolveSeasonMode({
    seasonGoal: ctx.seasonGoal,
    nextSeasonGoal: ctx.nextSeasonGoal,
    ladderClosed: ctx.ladderClosed,
  })

  if (ctx.inFocusPrep && ctx.microPhaseId) {
    const id = ctx.isTransitionDay ? 'transition' : ctx.microPhaseId
    return `micro-${id}`
  }

  const orientir = ctx.anchorCertainty === 'orientir'
  const daysUntil = orientir
    ? null
    : ctx.ladderClosed
      ? ctx.daysUntilAnchor
      : ctx.daysUntilFocus
  const daysFromToday = ctx.daysFromToday ?? 0

  if (!ctx.ladderClosed && !ctx.hasFocusStart && (daysUntil == null || daysUntil > 35)) {
    return 'between'
  }

  if (daysUntil == null && !ctx.inFocusPrep) {
    if (orientir && ctx.hasFocusStart) return resolveAthleteStageId(null, daysFromToday, mode)
    return 'open'
  }

  return resolveAthleteStageId(daysUntil ?? null, daysFromToday, mode)
}

/**
 * @param {Array<{ id: string, label: string, rangeLabel: string }>} timeline
 * @param {string} todayStageId
 */
export function buildStageTimelineLabels(seasonMode, daysUntilAnchor) {
  const order = ['gap', 'base', 'special', 'fight-ready', 'taper']
  const t = stageThresholds(seasonMode)
  const progressiveOnly = daysUntilAnchor == null
  return order.map((id) => {
    const core = STAGE_CORE[/** @type {keyof typeof STAGE_CORE} */ (id)]
    let rangeLabel = ''
    if (progressiveOnly) {
      rangeLabel = 'по нарастанию'
    } else if (daysUntilAnchor != null && daysUntilAnchor >= 0) {
      if (id === 'taper') rangeLabel = `≤${t.taper} дн`
      else if (id === 'fight-ready') rangeLabel = `${t.taper + 1}–${t.fightReady} дн`
      else if (id === 'special') rangeLabel = `${t.fightReady + 1}–${t.special} дн`
      else if (id === 'base') rangeLabel = `${t.special + 1}–${t.base} дн`
      else rangeLabel = `>${t.base} дн`
    }
    return { id, label: core.short, fullLabel: core.label, rangeLabel }
  })
}
