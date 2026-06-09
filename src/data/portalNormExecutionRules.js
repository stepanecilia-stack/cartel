/**
 * Регламент сдачи нормативов Cartel (источник: Trainers/Нормативы.txt).
 * Только нормативы из справочника legacy_norms / Google Sheets.
 *
 * @typedef {{
 *   id: string,
 *   testNames: string[],
 *   howTo: string[],
 *   disqualifies: string[],
 * }} PortalNormExecutionRule
 */

/** @type {PortalNormExecutionRule[]} */
export const PORTAL_NORM_EXECUTION_RULES = [
  {
    id: 'endurance_run',
    testNames: [
      'Бег на 1 км',
      'Бег на 1500м',
      'Бег на 2 км',
      'Бег на 2000м',
      'Бег на 3000 м',
      'Шестиминутный бег',
    ],
    howTo: [
      'Старт с высокого старта, группа выстраивается за 3 м до линии.',
      'Старт по выстрелу или команде «Марш!».',
      'Дистанция — по ровной дорожке стадиона или местности.',
      'Время фиксируют секундомером (мин:сек), точность 0,1 с.',
    ],
    disqualifies: [
      'Наступание на левую бровку дорожки — дистанция укорачивается, результат могут не принять.',
    ],
  },
  {
    id: 'sprint',
    testNames: ['Бег 30м', 'Бег 60м', 'Бег 100м'],
    howTo: [
      'Бег по дорожкам или ровной площадке с твёрдым покрытием.',
      '30 м — с высокого старта; 60 и 100 м — низкий или высокий старт.',
      'Стартуют по 2–4 человека, время до 0,1 с.',
    ],
    disqualifies: [
      'Не готов к старту через 2 минуты после вызова.',
      'Уход с дорожки или помеха другому бегущему.',
      'Фальстарт — старт раньше «Марш!» или выстрела.',
    ],
  },
  {
    id: 'shuttle',
    testNames: ['Челночный бег 3×10м'],
    howTo: [
      'Две линии «Старт» и «Финиш» на расстоянии 10 м.',
      'Высокий старт без наступания на линию.',
      'Бег до финиша → касание линии рукой → возврат к старту → касание → финиш без касания финиша рукой.',
      'Старт по двое, время до 0,1 с.',
    ],
    disqualifies: ['Фальстарт.', 'Помеха соседнему.', 'Не коснулся одной из линий рукой.'],
  },
  {
    id: 'forward_bend',
    testNames: ['Наклон вперёд'],
    howTo: [
      'Стоя на гимнастической скамье, ноги прямые, ступни параллельно на ширине 10–15 см.',
      'Два разминочных наклона, на третьем — максимальный; результат фиксируют 2 с обеими руками.',
      'Выше скамьи — «минус» в см, ниже — «плюс».',
      'Одежда должна позволять судье видеть прямые колени.',
    ],
    disqualifies: [
      'Сгибание ног в коленях.',
      'Фиксация одной рукой.',
      'Нет фиксации 2 секунды.',
    ],
  },
  {
    id: 'standing_long_jump',
    testNames: ['Прыжок в длину с места'],
    howTo: [
      'Три попытки, в зачёт — лучшая.',
      'Можно махи руками; на подготовку и прыжок — 1 минута.',
    ],
    disqualifies: [
      'Заступ или касание линии отталкивания.',
      'Отталкивание с предварительного подскока.',
      'Поочерёдное отталкивание ногами.',
      'Отягощения во время прыжка.',
      'Уход назад от места приземления.',
    ],
  },
  {
    id: 'pullups_high',
    testNames: ['Подтягивания (высокая перекладина)'],
    howTo: [
      'Вис хватом сверху, руки на ширине плеч, тело и ноги прямые, ноги не касаются пола.',
      'Подбородок выше перекладины → полное выпрямление рук → фиксация 1 с — один повтор.',
      'Считается число правильных повторений.',
    ],
    disqualifies: [
      'Подбородок ниже грифа.',
      'Рывки, махи ног или туловищем.',
      'Широкий хват в исходном положении.',
      'Фиксация внизу менее 1 с.',
      '«Маятник» с остановкой, согнутые локти в ис.п., раскрытая ладонь.',
      'Согнутые колени при подъёме, неравномерное сгибание рук.',
    ],
  },
  {
    id: 'pullups_low',
    testNames: [
      'Подтягивания (низкая перекладина)',
      'Подтягивания (низкая перекладина 90см)',
    ],
    howTo: [
      'Вис лёжа лицом вверх, хват сверху, руки на ширине плеч; тело — прямая линия.',
      'Гриф на высоте 90 см: подбородок на грифе, затем выпрямление в вис — фиксация 1 с.',
      'Подтягивание до пересечения подбородком грифа; локти не более 45°.',
      'Пятки могут упираться в опору до 4 см.',
    ],
    disqualifies: [
      'Рывки или прогиб туловища.',
      'Подбородок ниже грифа.',
      'Нет фиксации 1 с в исходном положении.',
    ],
  },
  {
    id: 'situps',
    testNames: ['Подъём туловища за 1 мин', 'Подъём туловища за 30с'],
    howTo: [
      'Лёжа на спине на мате, руки «в замок» за головой, лопатки на мате.',
      'Ноги согнуты под прямым углом, ступни прижимает партнёр.',
      'Локти касаются бёдер или колен, возврат в ис.п. — один повтор.',
      'За 1 мин или 30 с — максимум правильных повторений.',
    ],
    disqualifies: [
      'Локти не коснулись бёдер или колен.',
      'Лопатки оторвались от мата.',
      'Пальцы разомкнуты из «замка».',
      'Смещение таза.',
    ],
  },
  {
    id: 'pushups',
    testNames: ['Сгибание/разгибание рук в упоре лёжа'],
    howTo: [
      'Упор лёжа, руки на ширине плеч, локти не более 45°, тело — прямая линия.',
      'Грудь касается пола (или платформы 5 см) → разгибание → фиксация 1 с.',
      'Считается число правильных повторений.',
    ],
    disqualifies: [
      'Нарушена прямая линия «плечи — туловище — ноги».',
      'Нет фиксации 1 с в верхней точке.',
      'Разновременное разгибание рук.',
    ],
  },
]

/** @param {string} testName */
export function resolveNormExecutionRule(testName) {
  const name = String(testName ?? '').trim().toLowerCase()
  if (!name) return null
  return (
    PORTAL_NORM_EXECUTION_RULES.find((rule) =>
      rule.testNames.some((n) => n.toLowerCase() === name),
    ) ?? null
  )
}

/** @param {string} query @param {string[]} [scopeTestNames] */
export function findNormExecutionRuleFromText(query, scopeTestNames = null) {
  const q = String(query ?? '').toLowerCase()
  const allowedRules = scopeTestNames?.length
    ? PORTAL_NORM_EXECUTION_RULES.filter((rule) =>
        rule.testNames.some((n) => scopeTestNames.some((s) => s.toLowerCase() === n.toLowerCase())),
      )
    : PORTAL_NORM_EXECUTION_RULES

  for (const rule of allowedRules) {
    for (const testName of rule.testNames) {
      if (q.includes(testName.toLowerCase())) return { rule, testName }
    }
  }

  if (/подтяг/.test(q) && scopeTestNames?.length) {
    const scoped = scopeTestNames.find((n) => /подтяг/i.test(n))
    if (scoped) {
      const rule = resolveNormExecutionRule(scoped)
      if (rule) return { rule, testName: scoped }
    }
  }

  const matchers = [
    { re: /3000|три тысяч/, id: 'endurance_run', testName: 'Бег на 3000 м' },
    { re: /1500|полторы/, id: 'endurance_run', testName: 'Бег на 1500м' },
    { re: /2000|2\s*км/, id: 'endurance_run', testName: 'Бег на 2000м' },
    { re: /1\s*км|один кил/, id: 'endurance_run', testName: 'Бег на 1 км' },
    { re: /шестиминут|6\s*мин/, id: 'endurance_run', testName: 'Шестиминутный бег' },
    { re: /\b30\s*м\b|тридцат/, id: 'sprint', testName: 'Бег 30м' },
    { re: /\b60\s*м\b|шестидесят/, id: 'sprint', testName: 'Бег 60м' },
    { re: /100\s*м|сто мет/, id: 'sprint', testName: 'Бег 100м' },
    { re: /челноч|3\s*[×x]\s*10/, id: 'shuttle', testName: 'Челночный бег 3×10м' },
    { re: /наклон/, id: 'forward_bend', testName: 'Наклон вперёд' },
    { re: /прыжок|длину/, id: 'standing_long_jump', testName: 'Прыжок в длину с места' },
    { re: /высок.*переклад|переклад.*высок/, id: 'pullups_high', testName: 'Подтягивания (высокая перекладина)' },
    { re: /низк.*переклад|переклад.*90|90\s*см/, id: 'pullups_low', testName: 'Подтягивания (низкая перекладина 90см)' },
    { re: /тулов|пресс|подъ[её]м/, id: 'situps', testName: 'Подъём туловища за 1 мин' },
    { re: /отжим|упор.*л[её]ж/, id: 'pushups', testName: 'Сгибание/разгибание рук в упоре лёжа' },
  ]

  for (const { re, id, testName } of matchers) {
    if (!re.test(q)) continue
    const rule = allowedRules.find((r) => r.id === id) ?? PORTAL_NORM_EXECUTION_RULES.find((r) => r.id === id)
    if (!rule) continue
    const inScope =
      !scopeTestNames?.length ||
      scopeTestNames.some((s) => s.toLowerCase() === testName.toLowerCase()) ||
      rule.testNames.some((n) => scopeTestNames.some((s) => s.toLowerCase() === n.toLowerCase()))
    if (inScope) {
      const scopedName =
        scopeTestNames?.find((s) => rule.testNames.some((n) => n.toLowerCase() === s.toLowerCase())) ??
        testName
      return { rule, testName: scopedName }
    }
  }

  return null
}

export function isNormExecutionQuestion(text) {
  return /как\s+(сд|сда|правил|техник|выпол)|техник|правил|регламент|засчит|ошибк|что\s+нельзя|как\s+правильно|исходн|повтор|попыт|линия\s+отталк|фальстарт/i.test(
    String(text ?? ''),
  )
}

/** @param {PortalNormExecutionRule} rule @param {string} testName */
export function formatNormExecutionRulePlain(rule, testName) {
  const how = rule.howTo.join(' ')
  const bad = rule.disqualifies.length ? ` Не засчитывают: ${rule.disqualifies.join('; ')}.` : ''
  return `«${testName}»: ${how}${bad}`
}

export function formatNormExecutionRulesForPrompt() {
  return PORTAL_NORM_EXECUTION_RULES.map((rule) => {
    const names = rule.testNames.join(', ')
    const how = rule.howTo.map((h) => `- ${h}`).join('\n')
    const bad = rule.disqualifies.map((d) => `- ${d}`).join('\n')
    return [`### ${names}`, 'Как сдавать:', how, 'Не засчитывают:', bad].join('\n')
  }).join('\n\n')
}

/**
 * @param {import('../constants/studentPortalPersonas.js').PortalPersonaId | unknown} personaId
 * @param {PortalNormExecutionRule} rule
 * @param {string} testName
 */
export function buildNormExecutionScriptReply(personaId, rule, testName) {
  const id = typeof personaId === 'string' ? personaId.trim() : 'arkady'
  const howShort = rule.howTo.slice(0, 2).join(' ')
  const badShort = rule.disqualifies.slice(0, 2).join('; ')

  if (id === 'vasily') {
    return `«${testName}»: ${howShort} Не накосячь: ${badShort}. Спрашивай конкретнее, если нужно.`
  }
  if (id === 'gleb') {
    return `Протокол «${testName}». ${howShort} Дисквалификация: ${badShort}.`
  }
  return `Друг, по «${testName}»: ${howShort} Главное — не нарушать: ${badShort}. Уточни, если что-то неясно.`
}
