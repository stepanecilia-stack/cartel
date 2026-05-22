/**
 * Годичный цикл по Альманаху (Филимонов, Степанец).
 * Два полугодия: весна–лето и осень–зима.
 */

/** @typedef {{ task: string, via: string }} AnnualTask */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   short: string,
 *   monthsLabel: string,
 *   tasks: AnnualTask[],
 *   amHint: string,
 *   pmHint: string,
 * }} AnnualMacroPeriod */

/** @type {AnnualMacroPeriod[]} */
export const ANNUAL_MACRO_PERIODS = [
  {
    id: 'prep-spring',
    label: 'Подготовительный',
    short: 'подгот.',
    monthsLabel: 'март – апрель',
    tasks: [
      { task: 'Медосмотр, база', via: 'ОФП, школа бокса' },
      { task: 'Техника', via: 'СТТМ, снаряды' },
      { task: 'Контроль', via: 'отборочные старты' },
    ],
    amHint: 'Кросс, ОРУ, школа бокса',
    pmHint: 'Снаряды, СТТМ — наращивание',
  },
  {
    id: 'comp-summer',
    label: 'Соревновательный',
    short: 'соревн.',
    monthsLabel: 'май – июль',
    tasks: [
      { task: 'Пики к стартам', via: 'ОФП→СФП→СТТМ' },
      { task: 'Проверка формы', via: 'турниры' },
      { task: 'Тактика', via: 'спарринги' },
    ],
    amHint: 'По циклу перед каждым стартом',
    pmHint: 'СТТМ, снаряды — боевой темп',
  },
  {
    id: 'transition-aug',
    label: 'Переходный',
    short: 'переход',
    monthsLabel: 'август',
    tasks: [
      { task: 'Восстановление', via: 'сон, сауна' },
      { task: 'Поддержание', via: 'лёгкая ОФП' },
      { task: 'Без пика', via: 'отдых' },
    ],
    amHint: 'Лёгкий кросс, бой с тенью',
    pmHint: 'Индивидуально, без объёма',
  },
  {
    id: 'prep-autumn',
    label: 'Подготовительный',
    short: 'подгот.',
    monthsLabel: 'сентябрь – октябрь',
    tasks: [
      { task: 'Втягивание в сезон', via: 'ОФП, школа' },
      { task: 'Объём', via: 'снаряды, СТТМ' },
      { task: 'Контроль', via: 'тестовые бои' },
    ],
    amHint: 'Кросс, координация / ССР',
    pmHint: 'Снаряды, партнёр',
  },
  {
    id: 'comp-winter',
    label: 'Соревновательный',
    short: 'соревн.',
    monthsLabel: 'ноябрь – январь',
    tasks: [
      { task: 'Главные старты', via: '3 этапа предстарта' },
      { task: 'Форма', via: 'спарринги' },
      { task: 'Индивидуализация', via: 'под соперника' },
    ],
    amHint: 'Микроцикл к дате старта',
    pmHint: 'СТТМ, снаряды',
  },
  {
    id: 'transition-feb',
    label: 'Переходный',
    short: 'переход',
    monthsLabel: 'февраль',
    tasks: [
      { task: 'Разгрузка', via: 'лечение, сауна' },
      { task: 'Сохранить качества', via: 'ОФП лёгкая' },
      { task: 'Психика', via: 'отдых' },
    ],
    amHint: 'Восстановление',
    pmHint: 'Бой с тенью, без мешков',
  },
]

/** @param {number} month 1–12 */
export function resolveAnnualMacroPeriod(month) {
  if (month >= 3 && month <= 4) return ANNUAL_MACRO_PERIODS.find((p) => p.id === 'prep-spring')
  if (month >= 5 && month <= 7) return ANNUAL_MACRO_PERIODS.find((p) => p.id === 'comp-summer')
  if (month === 8) return ANNUAL_MACRO_PERIODS.find((p) => p.id === 'transition-aug')
  if (month >= 9 && month <= 10) return ANNUAL_MACRO_PERIODS.find((p) => p.id === 'prep-autumn')
  if (month === 11 || month === 12 || month === 1) return ANNUAL_MACRO_PERIODS.find((p) => p.id === 'comp-winter')
  if (month === 2) return ANNUAL_MACRO_PERIODS.find((p) => p.id === 'transition-feb')
  return ANNUAL_MACRO_PERIODS[0]
}

/** @param {string} dateISO */
export function resolveAnnualMacroPeriodForDate(dateISO) {
  const d = new Date(dateISO + 'T12:00:00')
  return resolveAnnualMacroPeriod(d.getMonth() + 1)
}

export const ANNUAL_MACRO_STYLES = {
  'prep-spring': { chip: 'bg-emerald-50 border-emerald-200 text-emerald-900', bar: 'bg-emerald-400' },
  'comp-summer': { chip: 'bg-sky-50 border-sky-200 text-sky-900', bar: 'bg-sky-500' },
  'transition-aug': { chip: 'bg-slate-100 border-slate-200 text-slate-700', bar: 'bg-slate-400' },
  'prep-autumn': { chip: 'bg-teal-50 border-teal-200 text-teal-900', bar: 'bg-teal-500' },
  'comp-winter': { chip: 'bg-violet-50 border-violet-200 text-violet-900', bar: 'bg-violet-500' },
  'transition-feb': { chip: 'bg-slate-100 border-slate-200 text-slate-700', bar: 'bg-slate-400' },
}

export function annualMacroStyle(periodId) {
  return ANNUAL_MACRO_STYLES[periodId] ?? ANNUAL_MACRO_STYLES['prep-spring']
}

/**
 * Прикладной план тренировок вне микроцикла (без пояснительных абзацев).
 * @param {AnnualMacroPeriod} period
 * @returns {Array<{ part: string, text: string }>}
 */
export function buildAnnualDayTraining(period) {
  const lines = []
  if (period.amHint) lines.push({ part: 'Утро', text: period.amHint })
  if (period.pmHint) lines.push({ part: 'День', text: period.pmHint })

  if (period.id === 'transition-aug' || period.id === 'transition-feb') {
    lines.push({ part: 'Нагрузка', text: 'лёгкая, одна тренировка' })
  }

  return lines
}

/**
 * @param {AnnualMacroPeriod} period
 * @param {import('./seasonGoals.js').SeasonMode} seasonMode
 * @param {{ ladderClosed?: boolean }} [meta]
 */
export function buildAnnualDayTrainingForMode(period, seasonMode, meta = {}) {
  if (meta.ladderClosed) {
    if (seasonMode === 'peak') {
      return [
        { part: 'Утро', text: 'ОФП, школа; элементы СФП по плану моста' },
        { part: 'День', text: 'Техника, спарринги; опыт — по календарю' },
        { part: 'Цель', text: 'фундамент пика к следующему сезону' },
      ]
    }
    if (seasonMode === 'advance') {
      return [
        { part: 'Утро', text: 'ОФП, школа — объём под лестницу следующего года' },
        { part: 'День', text: 'Снаряды, СТТМ; водокачки по плану' },
        { part: 'Цель', text: 'мост к отборам следующего сезона' },
      ]
    }
    return [
      { part: 'Утро', text: 'ОФП, школа бокса' },
      { part: 'День', text: 'Снаряды, нормативы' },
      { part: 'Цель', text: 'база к первым отборам' },
    ]
  }

  if (seasonMode === 'foundation') {
    if (period.id === 'comp-summer' || period.id === 'comp-winter') {
      return [
        { part: 'Утро', text: 'Кросс, школа бокса, ОРУ — 150–170' },
        { part: 'День', text: 'Снаряды, СТТМ — средний темп, качество' },
        { part: 'Задача', text: 'база сезона, не пик к ПР' },
      ]
    }
    if (period.id === 'prep-spring' || period.id === 'prep-autumn') {
      return [
        { part: 'Утро', text: 'ОФП, школа бокса' },
        { part: 'День', text: 'Снаряды, нормативы' },
        { part: 'Задача', text: 'техника и физика к первым стартам' },
      ]
    }
  }

  return buildAnnualDayTraining(period)
}
