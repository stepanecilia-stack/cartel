/**
 * Фазы и шаблоны по «Плану подготовки» (Филимонов): микроциклы УТС + комплексы 1–11.
 */

export const FILIMONOV_COMPLEXES = [
  { id: 1, title: 'Комплекс 1', tag: 'тест-тренировка', note: 'Нарастающие 15→60 сек мешок / бой с тенью, финал 3 мин. Только при нормальном восстановлении.' },
  { id: 2, title: 'Комплекс 2', tag: 'объём', note: '10×4 мин: 40 сек мешок / 20 сек бой с тенью; отдых 2 мин + пресс/отжимания.' },
  { id: 3, title: 'Комплекс 3', tag: 'скорость-сила', note: '20/10 сек «макс быстро-сильно», смена мешков.' },
  { id: 4, title: 'Комплекс 4', tag: 'серии', note: 'Серии 2→3→4 удара, ×20 циклов — не назначать в щадящем режиме.' },
  { id: 5, title: 'Комплекс 5', tag: 'спурты', note: 'Чередование раундов на мешках и тени со спуртами 10–30 сек.' },
  { id: 6, title: 'Комплекс 6', tag: 'спурты', note: '6×3 мин интенсивной скоростно-силовой работы.' },
  { id: 7, title: 'Комплекс 7', tag: 'ОФП', note: '10×400 м — только при сильном функционале и режиме normal.' },
  { id: 8, title: 'Комплекс 8', tag: 'ССР', note: '6–10×4 мин: 40 сек сильно-быстро / 20 сек расслабление.' },
  { id: 9, title: 'Комплекс 9', tag: 'улица+зал', note: 'Кросс, спринты 10–30 м, лестница раундов тени.' },
  { id: 10, title: 'Комплекс 10', tag: 'мешки', note: '5×4 мин 20/10, смена тяжёлый/лёгкий мешок.' },
  { id: 11, title: 'Комплекс 11', tag: 'предстарт', note: 'За 3–4 дня до боя: короткие раунды, акцент скорость.' },
]

/** @param {number | null} daysUntil */
export function resolvePrepPhase(daysUntil) {
  if (daysUntil == null || !Number.isFinite(daysUntil)) {
    return { id: 'none', label: 'Дата не задана', short: '—', description: '' }
  }
  if (daysUntil < 0) {
    return {
      id: 'past',
      label: 'Соревнования прошли',
      short: 'прошло',
      description: 'Укажите новую дату или скорректируйте план.',
    }
  }
  if (daysUntil === 0) {
    return {
      id: 'fight',
      label: 'День старта',
      short: 'старт',
      description: 'Лёгкая активация, без объёмной работы на мешках.',
    }
  }
  if (daysUntil <= 3) {
    return {
      id: 'preFight',
      label: 'Предсоревновательный',
      short: 'подводка',
      description: 'Комплекс 11: короткие раунды, скорость, много восстановления.',
      complexIds: [11],
    }
  }
  if (daysUntil <= 7) {
    return {
      id: 'taper',
      label: 'Подводящий (разгрузка)',
      short: 'разгрузка',
      description: 'Снижение объёма, сауна/массаж, короткие СТТМ и снаряды.',
      complexIds: [11, 6],
    }
  }
  if (daysUntil <= 21) {
    return {
      id: 'base',
      label: 'Базовый (объёмный)',
      short: 'объём',
      description: 'Пик специальной работы: СТТМ, снаряды с ускорениями, спринты.',
      complexIds: [8, 10, 3, 2],
    }
  }
  return {
    id: 'intro',
    label: 'Втягивающий',
    short: 'втягивание',
    description: 'Вход в режим: кросс, школа бокса, постепенный объём на снарядах.',
    complexIds: [2, 5],
  }
}

const WEEKDAY_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

/** @param {Date} d */
export function formatPrepDayLabel(d) {
  const wd = WEEKDAY_RU[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm} (${wd})`
}

/**
 * Шаблон одного тренировочного дня (утро / день / вечер).
 * @param {string} phaseId
 * @param {number} dayIndex — 0 = сегодня
 * @param {'normal' | 'cautious' | 'protected'} loadTier
 * @param {string[]} weakIds
 */
export function buildFilimonovDaySlots(phaseId, dayIndex, loadTier, weakIds) {
  const weakTech = weakIds.includes('technical') || weakIds.includes('kd')
  const weakPhys = weakIds.includes('physical')
  const weakFunc = false

  const bagRounds = (base) => {
    let n = base
    if (loadTier === 'cautious') n = Math.max(3, Math.round(n * 0.75))
    if (loadTier === 'protected') n = Math.max(3, Math.round(n * 0.6))
    return n
  }

  const roundLen = phaseId === 'intro' || phaseId === 'base' ? '4′' : '3′30′′'

  /** @type {{ id: string, label: string, items: string[] }[]} */
  const slots = []

  if (phaseId === 'fight') {
    return [
      { id: 'morning', label: 'Утро', items: ['Прогулка 20–30 мин', 'Дыхательная гимнастика'] },
      { id: 'day', label: 'День', items: ['Отдых, лёгкая растяжка'] },
      { id: 'evening', label: 'Вечер', items: ['Школа бокса 15–20 мин без усталости', 'Сон вовремя'] },
    ]
  }

  if (phaseId === 'preFight' || phaseId === 'taper') {
    const bags = bagRounds(phaseId === 'preFight' ? 4 : 6)
    slots.push({
      id: 'morning',
      label: 'Утро',
      items: [
        'Разминка 10′',
        weakFunc ? 'Лёгкий кросс 10–15′' : 'Кросс 10′ или дорожка 15′',
        'Школа бокса / дорожка 15–20′',
      ],
    })
    slots.push({
      id: 'day',
      label: 'День',
      items:
        dayIndex % 3 === 0
          ? ['Сауна / массаж / тихий отдых', 'Диспансеризация по графику']
          : ['Отдых', 'Индивидуальная гимнастика 10′'],
    })
    slots.push({
      id: 'evening',
      label: 'Вечер',
      items: [
        `СТТМ с партнёром: ${bagRounds(4)}×${roundLen} (тактические модели)`,
        weakTech
          ? `Снаряды: ${bags}×${roundLen} — средний темп, без «вкалывания»`
          : `Снаряды / лапы: ${bags}×${roundLen}, ускорения 20′′ только если самочувствие отличное`,
        'Заминка, растяжка 10′',
      ],
    })
    return slots
  }

  if (phaseId === 'base') {
    const isTestThursday = dayIndex % 7 === 4
    slots.push({
      id: 'morning',
      label: 'Утро',
      items: isTestThursday
        ? [
            'Стадион: разминка ног 15′',
            weakFunc || loadTier === 'protected'
              ? 'Бег 3×100 м + отдых (без 10×400)'
              : 'Тест: 5×100 м, 3×800 м (как в плане УТС)',
            'Расслабление ног 10′',
          ]
        : [
            'Кросс 15′',
            `ССР: спринты 10–20 м (${loadTier === 'protected' ? 'короче серия' : 'полная серия'})`,
            'Школа бокса 15–20′',
          ],
    })
    slots.push({
      id: 'day',
      label: 'День',
      items:
        dayIndex % 6 === 5
          ? ['Сауна, самомассаж', 'Отдых']
          : [
              `Снаряды: ${bagRounds(8)}×${roundLen}`,
              weakPhys ? 'Акцент на силовые качества из базы (20–30′)' : 'Индивидуальная работа 15′',
            ],
    })
    slots.push({
      id: 'evening',
      label: 'Вечер',
      items: [
        'Подготовка 30–40′: скакалка, теннисный мяч, бой с тенью',
        `СТТМ / комбинации: ${bagRounds(10)}×3′30′′`,
        weakTech ? 'Меньше новых связок — отработка 2–3 серий' : 'Тактические модели по заданию',
        `Снаряды: ${bagRounds(5)}×3′30′′ (ускорения 20′′)`,
      ],
    })
    return slots
  }

  // intro + default
  slots.push({
    id: 'morning',
    label: 'Утро',
    items: ['Кросс 20′', 'ОРУ / ССУ 15–20′', 'Школа бокса 15–20′'],
  })
  slots.push({
    id: 'day',
    label: 'День',
    items:
      dayIndex % 7 === 0
        ? ['Отдых или экскурсия / игра (баскетбол)']
        : [`Снаряды: ${bagRounds(6)}×4′ — средний темп`, 'Гимнастика 10′'],
  })
  slots.push({
    id: 'evening',
    label: 'Вечер',
    items: [
      'Подготовка: скакалка, бой с тенью, теннисный мяч',
      `Снаряды: ${bagRounds(8)}×4′`,
      weakTech ? 'СТТМ 6–8×4′ — техника важнее объёма ударов' : 'СТТМ / ближний бой по плану',
      'Заминка 10–15′',
    ],
  })
  return slots
}
