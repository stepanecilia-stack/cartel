/**
 * Подготовка к старту Cartel: юниоры 13–16.
 * Методика: Филимонов В.И., Степанец И.В. (годичный цикл, ОФП→СФП→СТТМ)
 * + рабочий план УТС (комплексы, 2 трен./день, раунд 2:15).
 */

import { isPrepTransitionDay } from './cartelPrepMethodology.js'

export const JUNIOR_PREP_ROUND = '2′15′′'
export const JUNIOR_REST_BETWEEN_ROUNDS = '1′'

/** @typedef {'13-14' | '15-16'} JuniorBand */
/** @typedef {'ofp' | 'sfp' | 'sttm' | 'taper' | 'preFight' | 'fight' | 'past' | 'none'} JuniorPhaseId */

/** @typedef {{ task: string, via: string }} JuniorPrepTask */

/**
 * Этапы цикла: границы по дням до боя (включительно сверху).
 * @type {Array<{ id: JuniorPhaseId, fromDays: number, label: string, short: string, rangeLabel: string, tasks: JuniorPrepTask[] }>}
 */
const PHASE_DEFS = [
  {
    id: 'ofp',
    fromDays: 21,
    label: 'ОФП',
    short: 'ОФП',
    rangeLabel: '21+ дн.',
    tasks: [
      { task: 'Функциональный запас', via: 'кросс, игры' },
      { task: 'Базовая техника', via: 'школа бокса' },
      { task: 'Вход в объём', via: 'снаряды, СТТМ' },
    ],
  },
  {
    id: 'sfp',
    fromDays: 14,
    label: 'СФП',
    short: 'СФП',
    rangeLabel: '14–20 дн.',
    tasks: [
      { task: 'Спец. выносливость', via: 'соревн. отрезки' },
      { task: 'Скорость ударов', via: 'снаряды 20″/10″' },
      { task: 'Качество СТТМ', via: 'партнёр, темп' },
    ],
  },
  {
    id: 'sttm',
    fromDays: 7,
    label: 'СТТМ',
    short: 'СТТМ',
    rangeLabel: '7–13 дн.',
    tasks: [
      { task: 'Боевая форма', via: 'спарринги' },
      { task: 'Тактика под турнир', via: 'модели, СТТМ' },
      { task: 'Пик без перегруза', via: '≤3 цикла' },
    ],
  },
  {
    id: 'taper',
    fromDays: 4,
    label: 'Подводка',
    short: 'подвод.',
    rangeLabel: '4–6 дн.',
    tasks: [
      { task: 'Восстановление', via: 'сон, сауна' },
      { task: 'Объём ↓', via: '4×2:15' },
      { task: 'Острота', via: 'знакомые задачи' },
    ],
  },
  {
    id: 'preFight',
    fromDays: 1,
    label: 'Предстарт',
    short: 'предст.',
    rangeLabel: '1–3 дн.',
    tasks: [
      { task: 'Вес', via: 'питание' },
      { task: 'Скорость', via: 'комплекс 11' },
      { task: 'Свежесть', via: 'бой с тенью, отдых' },
    ],
  },
]

/** Справка по всем этапам (для UI). */
export const JUNIOR_PREP_PHASE_GUIDE = [
  ...PHASE_DEFS.map((d) => ({
    id: d.id,
    label: d.label,
    rangeLabel: d.rangeLabel,
    tasks: d.tasks,
  })),
  {
    id: 'fight',
    label: 'Бой',
    rangeLabel: '0 дн.',
    tasks: [
      { task: 'Старт', via: 'разминка' },
      { task: 'Тонус', via: 'лёгкий бой с тенью' },
    ],
  },
]

/** @param {number | null | undefined} ageInt */
export function resolveJuniorAgeBand(ageInt) {
  if (ageInt == null || !Number.isFinite(ageInt)) return null
  const age = Math.floor(ageInt)
  if (age >= 13 && age <= 14) return '13-14'
  if (age >= 15 && age <= 16) return '15-16'
  return null
}

export function juniorAgeBandLabel(band) {
  if (band === '13-14') return '13–14 лет (координация, школа бокса)'
  if (band === '15-16') return '15–16 лет (скорость-сила, тактика)'
  return null
}

/** @param {number} lo @param {number} hi @param {number} n */
function clamp(lo, hi, n) {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * 0 — начало этапа (далеко от следующего порога), 1 — конец этапа (у порога подводки/спец.).
 * @param {JuniorPhaseId} phaseId
 * @param {number} daysUntil
 */
function phaseProgress(phaseId, daysUntil) {
  switch (phaseId) {
    case 'ofp':
      return clamp(0, 1, (35 - daysUntil) / 14)
    case 'sfp':
      return clamp(0, 1, (20 - daysUntil) / 6)
    case 'sttm':
      return clamp(0, 1, (13 - daysUntil) / 6)
    case 'taper':
      return clamp(0, 1, (6 - daysUntil) / 2)
    case 'preFight':
      return clamp(0, 1, (3 - daysUntil) / 2)
    default:
      return 0
  }
}

/**
 * @param {JuniorPhaseId} phaseId
 * @param {number} progress 0..1
 */
function volumeForPhase(phaseId, progress) {
  const p = progress
  switch (phaseId) {
    case 'ofp':
      return { partner: Math.round(3 + p), bags: Math.round(4 + p) }
    case 'sfp':
      return { partner: Math.round(5 + p * 2), bags: Math.round(5 + p * 2) }
    case 'sttm':
      return { partner: Math.round(7 + p), bags: Math.round(7 + p) }
    case 'taper':
      return { partner: 4, bags: 4 }
    case 'preFight':
      return { partner: 3, bags: 3 }
    case 'fight':
      return { partner: 0, bags: 0 }
    default:
      return { partner: 4, bags: 4 }
  }
}

/** @param {number | null} daysUntil */
export function resolveJuniorPrepPhase(daysUntil) {
  if (daysUntil == null || !Number.isFinite(daysUntil)) {
    return {
      id: 'none',
      label: 'Дата не задана',
      short: '—',
      rangeLabel: '',
      tasks: [],
      metrics: '',
    }
  }
  if (daysUntil < 0) {
    return {
      id: 'past',
      label: 'Старт прошёл',
      short: '—',
      rangeLabel: '',
      tasks: [],
      metrics: '',
    }
  }
  if (daysUntil === 0) {
    const fightTasks = JUNIOR_PREP_PHASE_GUIDE.find((g) => g.id === 'fight')?.tasks ?? []
    return {
      id: 'fight',
      label: 'День боя',
      short: 'бой',
      rangeLabel: '0 дн.',
      tasks: fightTasks,
      metrics: '',
    }
  }

  const def = PHASE_DEFS.find((d) => daysUntil >= d.fromDays) ?? PHASE_DEFS[0]
  const progress = phaseProgress(def.id, daysUntil)
  const vol = volumeForPhase(def.id, progress)

  return {
    id: def.id,
    label: def.label,
    short: def.short,
    rangeLabel: def.rangeLabel,
    tasks: [...def.tasks],
    metrics: `СТТМ ${vol.partner}×${JUNIOR_PREP_ROUND} · снаряды ${vol.bags}×${JUNIOR_PREP_ROUND}`,
    progress,
    volume: vol,
  }
}

export const JUNIOR_PREP_PHASE_STYLES = {
  ofp: {
    chip: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    bar: 'bg-emerald-400',
    legend: 'bg-emerald-500',
  },
  sfp: {
    chip: 'bg-teal-50 border-teal-200 text-teal-900',
    bar: 'bg-teal-500',
    legend: 'bg-teal-500',
  },
  sttm: {
    chip: 'bg-sky-50 border-sky-200 text-sky-900',
    bar: 'bg-sky-500',
    legend: 'bg-sky-500',
  },
  transition: {
    chip: 'bg-slate-50 border-slate-300 text-slate-800',
    bar: 'bg-slate-400',
    legend: 'bg-slate-400',
  },
  taper: {
    chip: 'bg-violet-50 border-violet-200 text-violet-900',
    bar: 'bg-violet-500',
    legend: 'bg-violet-500',
  },
  preFight: {
    chip: 'bg-amber-50 border-amber-200 text-amber-900',
    bar: 'bg-amber-500',
    legend: 'bg-amber-500',
  },
  fight: {
    chip: 'bg-rose-50 border-rose-300 text-rose-900',
    bar: 'bg-rose-500',
    legend: 'bg-rose-500',
  },
  past: {
    chip: 'bg-slate-100 border-slate-200 text-slate-600',
    bar: 'bg-slate-300',
    legend: 'bg-slate-400',
  },
  none: {
    chip: 'bg-slate-50 border-slate-200 text-slate-500',
    bar: 'bg-slate-200',
    legend: 'bg-slate-300',
  },
}

export const JUNIOR_PREP_PHASE_LEGEND = [
  { id: 'ofp', label: 'ОФП' },
  { id: 'sfp', label: 'СФП' },
  { id: 'sttm', label: 'СТТМ' },
  { id: 'taper', label: 'Подводка' },
  { id: 'preFight', label: 'Предстарт' },
  { id: 'fight', label: 'Бой' },
]

const WEEKDAY_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

/** @param {Date} d */
export function formatJuniorPrepDayShort(d) {
  const wd = WEEKDAY_RU[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return { date: `${dd}.${mm}`, weekday: wd }
}

/** @param {Date} d */
export function formatJuniorPrepDayLabel(d) {
  const wd = WEEKDAY_RU[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm} (${wd})`
}

/** @param {JuniorBand} band @param {JuniorPhaseId} phaseId */
export function getJuniorWorkModes(band, phaseId) {
  const common = [
    { id: 'school', title: 'Школа бокса', note: 'Лапы / бой с тенью: техника, связки, передвижения.' },
    {
      id: 'partner',
      title: 'СТТМ с партнёром',
      note: `Раунды ${JUNIOR_PREP_ROUND}, отдых ${JUNIOR_REST_BETWEEN_ROUNDS}.`,
    },
    {
      id: 'bags',
      title: 'Снаряды / лапы',
      note: `Раунды ${JUNIOR_PREP_ROUND}; режим по этапу (темп / 20″·10″).`,
    },
  ]
  if (phaseId === 'ofp' || phaseId === 'sfp') {
    if (band === '13-14') {
      return [...common, { id: 'coord', title: 'Координация / ОФП', note: 'Скакалка, мяч, ОРУ 10–20 мин.' }]
    }
    return [...common, { id: 'ssr', title: 'ССР', note: 'Короткие спринты 10–20 м, отдых 2 мин.' }]
  }
  if (phaseId === 'sttm') {
    if (band === '15-16') {
      return [
        ...common,
        { id: 'sprints', title: 'Спринты', note: '10–30 м, полный отдых, в паузе — бой с тенью.' },
        { id: 'tactics', title: 'Тактика', note: 'Темповик / игровик / контратака — в задании раунда.' },
      ]
    }
    return [...common, { id: 'legs', title: 'Ноги / координация', note: 'Дорожка, прыжки, работа на ногах 15 мин.' }]
  }
  if (phaseId === 'taper' || phaseId === 'preFight') {
    return [
      ...common,
      { id: 'recovery', title: 'Восстановление', note: 'Сон, сауна, массаж, лёгкая активация.' },
    ]
  }
  return common
}

/** Переходный день (переходная неделя Альманаха в сжатом виде). */
function slotTransition(band) {
  return [
    {
      id: 'am',
      label: 'Утренняя',
      items: [
        'Кросс / прогулка 15 мин',
        band === '13-14' ? 'Координация, мяч' : 'Лёгкая ССР',
        'Школа бокса или лёгкий бой с тенью — без усталости',
      ],
    },
    {
      id: 'pm',
      label: 'Дневная',
      items: [
        'Индивидуальный план с тренером',
        'Сауна / самомассаж — по возможности',
        'Отдых, без новых объёмных нагрузок',
      ],
    },
  ]
}

/** @param {JuniorBand} band @param {number} partner @param {number} bags @param {string} r */
function slotFight() {
  return [
    {
      id: 'am',
      label: 'Утренняя',
      items: ['Прогулка, дыхание 15–20 мин', 'Школа бокса 15–20 мин — без усталости'],
    },
    { id: 'pm', label: 'Дневная', items: ['Отдых, питание', 'Разминка по регламенту соревнований'] },
  ]
}

/** @param {JuniorBand} band @param {{ partner: number, bags: number }} vol @param {number} dayIndex */
function slotPreFight(band, vol, dayIndex) {
  const r = JUNIOR_PREP_ROUND
  const accent = dayIndex % 2 === 0 ? 'с партнёром' : 'на снарядах'
  return [
    {
      id: 'am',
      label: 'Утренняя',
      items: [
        'Прогулка / кросс 10 мин',
        'Школа бокса 20–25 мин — скорость',
        band === '15-16' ? '3×20 м, отдых полный' : 'Координация + бой с тенью 15 мин',
      ],
    },
    {
      id: 'pm',
      label: 'Дневная',
      items: [
        'Вес / отдых',
        `${vol.partner}×${r} ${accent} (комплекс 11: 20″ мешок / 20″ бой с тенью)`,
        'Заминка, сон до 22:00',
      ],
    },
  ]
}

/** @param {JuniorBand} band @param {{ partner: number, bags: number }} vol @param {number} dayIndex */
function slotTaper(band, vol, dayIndex) {
  const r = JUNIOR_PREP_ROUND
  const recoveryDay = dayIndex % 3 === 2
  return [
    {
      id: 'am',
      label: 'Утренняя',
      items: recoveryDay
        ? ['Кросс 15 мин лёгкий', 'Школа бокса 25 мин', 'Сауна / самомассаж — по графику']
        : [
            'Разминка 10 мин',
            band === '15-16' ? 'Школа бокса 30 мин' : 'Школа бокса + координация 35 мин',
            'Отдых до второй',
          ],
    },
    {
      id: 'pm',
      label: 'Дневная',
      items: recoveryDay
        ? ['Отдых или лёгкая активация', 'По желанию: 2×' + r + ' бой с тенью']
        : [
            'Разминка 15 мин',
            `СТТМ: ${vol.partner}×${r} — знакомые связки`,
            `Снаряды: ${vol.bags}×${r} — средний темп`,
            'Заминка 10 мин',
          ],
    },
  ]
}

/** @param {JuniorBand} band @param {{ partner: number, bags: number }} vol @param {number} dayIndex */
function slotSttm(band, vol, dayIndex) {
  const r = JUNIOR_PREP_ROUND
  const cycle = dayIndex % 3

  if (band === '15-16') {
    if (cycle === 0) {
      return [
        {
          id: 'am',
          label: 'Утренняя',
          items: [
            'Разминка 10 мин',
            'Спринты: 10×10 м, 10×15 м, 10×20 м (отдых 2 мин, бой с тенью)',
            'Школа бокса 25 мин',
          ],
        },
        {
          id: 'pm',
          label: 'Дневная',
          items: [
            'Разминка 15 мин',
            `СТТМ: ${vol.partner}×${r} — атака/контратака по заданию`,
            `Снаряды: ${vol.bags}×${r}, 20″ сильно / 10″ свободно`,
            'Заминка 10–15 мин',
          ],
        },
      ]
    }
    if (cycle === 1) {
      return [
        {
          id: 'am',
          label: 'Утренняя',
          items: ['Кросс 10 мин', 'Школа бокса с ускорениями 30 мин', 'Теннисный мяч / скакалка 10 мин'],
        },
        {
          id: 'pm',
          label: 'Дневная',
          items: [
            'Разминка 15 мин',
            'Тактические модели: темповик / игровик — 3×' + r,
            `Снаряды: ${vol.bags}×${r}, спурты 20″ / 10″`,
            'Заминка',
          ],
        },
      ]
    }
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items: ['Разминка', 'ССР 15×10–20 м', 'Индивидуально с тренером 20 мин'],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: [
          `СТТМ: ${vol.partner}×${r} — смена партнёров`,
          `Снаряды: ${vol.bags}×${r} — смена тяжёлый/лёгкий мешок`,
          'Вестибулярная гимнастика 10 мин',
        ],
      },
    ]
  }

  // 13-14
  if (cycle === 0) {
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items: ['Разминка 10 мин', 'Дорожка / ноги 15 мин', 'Школа бокса 30 мин'],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: [
          `СТТМ: ${vol.partner}×${r}`,
          `Снаряды: ${vol.bags}×${r} — техника ударов`,
          'Заминка',
        ],
      },
    ]
  }
  if (cycle === 1) {
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items: ['Кросс 15 мин', 'ОФП + координация 20 мин', 'Лапы: связки 25 мин'],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: [
          `СТТМ: ${vol.partner}×${r} — передвижения`,
          `Снаряды: ${vol.bags}×${r} — средний темп`,
          'Скакалка 5 мин',
        ],
      },
    ]
  }
  return [
    {
      id: 'am',
      label: 'Утренняя',
      items: ['Школа бокса 25 мин', 'Мяч / скакалка 15 мин', 'Отдых до второй'],
    },
    {
      id: 'pm',
      label: 'Дневная',
      items: [
        `Снаряды: ${vol.bags}×${r} — 40″ мешок / 20″ бой с тенью (компл. 2)`,
        `СТТМ: ${Math.max(4, vol.partner - 1)}×${r}`,
        'Растяжка 10 мин',
      ],
    },
  ]
}

/** @param {JuniorBand} band @param {{ partner: number, bags: number }} vol @param {number} dayIndex */
function slotSfp(band, vol, dayIndex) {
  const r = JUNIOR_PREP_ROUND
  const cycle = dayIndex % 4

  if (cycle === 0) {
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items:
          band === '15-16'
            ? ['Кросс 15 мин', 'ССР: 15×10 м, 15×15 м, 15×20 м', 'Школа бокса 20 мин']
            : ['Кросс 15 мин', 'ОФП 15 мин', 'Школа бокса 20 мин'],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: [
          'Разминка 15 мин',
          `Снаряды: ${vol.bags}×${r} — ускорения 20″ / 10″`,
          'Пресс / отжимания в отдыхе между раундами',
          'Заминка 10 мин',
        ],
      },
    ]
  }
  if (cycle === 1) {
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items: ['Школа бокса 30 мин', 'Скакалка / мяч 10 мин', 'Гимнастика 10 мин'],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: [
          `СТТМ: ${vol.partner}×${r} — комбинации, смена партнёра`,
          'Ближний бой 6 мин (как в плане УТС, сокращённо)',
          'Заминка',
        ],
      },
    ]
  }
  if (cycle === 2) {
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items:
          band === '15-16'
            ? ['Разминка', 'Работа на дороге + лапы 40 мин']
            : ['Кросс 20 мин', 'Прыжки + координация 15 мин', 'Школа бокса 15 мин'],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: [
          band === '15-16' ? 'Спарринг 3×' + r + ' (контроль)' : `СТТМ: ${vol.partner}×${r}`,
          `Снаряды: ${Math.max(4, vol.bags - 1)}×${r}`,
          'Дыхательная гимнастика 10 мин',
        ],
      },
    ]
  }
  return [
    {
      id: 'am',
      label: 'Утренняя',
      items: ['Кросс 15 мин лёгкий', 'Школа бокса 20 мин', 'Отдых / диспансер — по графику'],
    },
    {
      id: 'pm',
      label: 'Дневная',
      items: [
        `СТТМ: ${vol.partner}×${r} — тактические модели`,
        `Снаряды: ${vol.bags}×${r}`,
        band === '15-16' ? 'Темповик в задании 2 раунда' : 'Координация 10 мин',
      ],
    },
  ]
}

/** @param {JuniorBand} band @param {{ partner: number, bags: number }} vol @param {number} dayIndex @param {number} daysUntil */
function slotOfp(band, vol, dayIndex, daysUntil) {
  const r = JUNIOR_PREP_ROUND
  const cycle = dayIndex % 3
  const far = daysUntil >= 28

  if (cycle === 0) {
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items: [
          far ? 'Кросс 15 мин' : 'Кросс 20 мин',
          'ОРУ / разминка 10 мин',
          'Школа бокса 20–25 мин',
        ],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: [
          'Разминка, скакалка 5 мин',
          `Снаряды: ${vol.bags}×${r} — техника, средний темп`,
          'Гимнастика 10 мин',
        ],
      },
    ]
  }
  if (cycle === 1) {
    return [
      {
        id: 'am',
        label: 'Утренняя',
        items:
          band === '13-14'
            ? ['Координация: мяч, скакалка 15 мин', 'Школа бокса 20 мин']
            : ['Кросс 15 мин', 'ССР лёгкая: 10×10–15 м', 'Школа бокса 15 мин'],
      },
      {
        id: 'pm',
        label: 'Дневная',
        items: far
          ? ['Отдых или лёгкий бой с тенью 20 мин', `СТТМ: ${vol.partner}×${r} — ознакомительно`]
          : [
              'Разминка 15 мин',
              `СТТМ: ${vol.partner}×${r}`,
              `Снаряды: ${Math.max(3, vol.bags - 1)}×${r}`,
              'Заминка',
            ],
      },
    ]
  }
  return [
    {
      id: 'am',
      label: 'Утренняя',
      items: ['Школа бокса 25 мин', band === '13-14' ? 'ОФП 15 мин' : 'Отягощения / бой с тенью 10 мин'],
    },
    {
      id: 'pm',
      label: 'Дневная',
      items: [
        `Снаряды: ${vol.bags}×${r}`,
        far ? 'Индивидуально с тренером' : `СТТМ: ${vol.partner}×${r} — связки`,
        'Дыхательные упражнения 5 мин',
      ],
    },
  ]
}

/**
 * Две тренировки в день; объём и содержание зависят от этапа, прогресса внутри этапа и дня микроцикла.
 * @param {JuniorBand} band
 * @param {JuniorPhaseId} phaseId
 * @param {number} dayIndex — 0 = сегодня в ленте
 * @param {number} daysUntilOnDay — дней до боя на этот календарный день
 */
export function buildJuniorDaySlots(band, phaseId, dayIndex, daysUntilOnDay) {
  if (isPrepTransitionDay(daysUntilOnDay, dayIndex) && phaseId !== 'fight' && phaseId !== 'preFight') {
    return slotTransition(band)
  }

  const progress = phaseProgress(phaseId, daysUntilOnDay)
  const vol = volumeForPhase(phaseId, progress)

  switch (phaseId) {
    case 'fight':
      return slotFight()
    case 'preFight':
      return slotPreFight(band, vol, dayIndex)
    case 'taper':
      return slotTaper(band, vol, dayIndex)
    case 'sttm':
      return slotSttm(band, vol, dayIndex)
    case 'sfp':
      return slotSfp(band, vol, dayIndex)
    case 'ofp':
      return slotOfp(band, vol, dayIndex, daysUntilOnDay)
    default:
      return slotOfp(band, vol, dayIndex, daysUntilOnDay ?? 21)
  }
}

/** @param {JuniorBand} band @param {{ tasks?: JuniorPrepTask[], metrics?: string }} phase */
export function buildJuniorPriorities(band, phase) {
  const list = []
  if (phase.metrics) list.push(phase.metrics)
  list.push(band === '13-14' ? '13–14: координация' : '15–16: ССР, тактика')
  return list
}
