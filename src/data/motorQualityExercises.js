import { MOTOR_QUALITY_SLUG_BY_TITLE } from './motorQualitiesCatalog.js'

/**
 * Упражнение для страницы качества. Медиа: позже подставляется GIF или WebM (одно на выбор UI).
 * @typedef {{
 *   id: string,
 *   title: string,
 *   intent: string,
 *   cues?: string,
 *   avoid?: string,
 *   minAge?: number,
 *   maxAge?: number,
 *   media: { gifSrc: string | null; webmSrc: string | null },
 * }} MotorQualityExercise
 */

/** @type {Record<string, MotorQualityExercise[]>} */
const MOTOR_QUALITY_EXERCISES_BY_SLUG = {
  rost: [
    {
      id: 'ex-rost-01',
      title: 'Контроль линии тела у стены',
      intent: 'Связать рост, осанку и привычку «не сутулиться» без силовой перегрузки.',
      cues: 'Затылок, лопатки и ягодицы касаются стены по очереди; дыхание свободное.',
      avoid: 'Не напрягать шею, не задерживать дыхание.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-rost-02',
      title: 'Ходьба с высоким подниманием бедра',
      intent: 'Мягко «вытянуть» колонну и бедро в динамике, без прыжковой плиометрики.',
      cues: 'Высокий шаг без рывка корпуса назад; взгляд вперёд.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-rost-03',
      title: 'Раскатка стопы мячом сидя',
      intent: 'Поддержка опоры и кровотока стопы при длительных нагрузках на рост.',
      cues: 'Давление умеренное, без боли в своде.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'myshechnaya-massa': [
    {
      id: 'ex-massa-01',
      title: 'Гоблет-присед',
      intent: 'Базовый объём ног и корпуса под контролем.',
      cues: 'Грудь вверх, колени по линии стоп, вес умеренный.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-massa-02',
      title: 'Тяга гантели к поясу в наклоне',
      intent: 'Спина и задняя цепь для переноса тренировочного объёма.',
      cues: 'Лопатка «в карман», локоть вдоль корпуса.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-massa-03',
      title: 'Переноска гантелей (farmer walk)',
      intent: 'Статико-динамическое удержание «рамки» плеч и кора.',
      cues: 'Шаги ровные, не сутулиться; дистанция короткими повторениями.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  bystrota: [
    {
      id: 'ex-bystrota-01',
      title: 'Ступни координационной лестницы под метроном',
      intent: 'Частота ног без потери точности шага.',
      cues: 'Сначала медленный темп, затем +10–15 ударов в минуту.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-bystrota-02',
      title: 'Старт по хлопку на 3–5 шагов',
      intent: 'Реакция и первый шаг из стойки.',
      cues: 'Не наклоняться лбом вперёд; руки в гарде.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-bystrota-03',
      title: 'Скакалка: ускорение 10 с / полный отдых',
      intent: 'Короткий всплеск частоты с восстановлением.',
      avoid: 'Не гнать длину серии до техники «хлопушки».',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'skorostno-silovye-kachestva': [
    {
      id: 'ex-skorosil-01',
      title: 'Бросок медбола в стену от бёдер',
      intent: 'Связка ног и корпуса в быстром импульсе.',
      cues: 'Короткий разгон бёдер, руки «догоняют» корпус.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-skorosil-02',
      title: 'Выпад с гантелью и быстрый возврат в стойку',
      intent: 'Сила ноги в смене опоры с темпом.',
      cues: 'Колено не заваливается внутрь; корпус вертикально.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-skorosil-03',
      title: 'Низкие прыжки с двух ног вперёд по разметке',
      intent: 'Скоростно-силовой контакт без высоты.',
      cues: 'Мягкое приземление, короткий контакт.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  sila: [
    {
      id: 'ex-sila-01',
      title: 'Присед с палкой / пустым грифом',
      intent: 'Паттерн приседа без гонки за весом.',
      cues: 'Колени и стопы согласованы, глубина по мобильности.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-sila-02',
      title: 'Румынская тяга с лёгкой штангой или гантелями',
      intent: 'Задняя цепь и сила захвата для ударной опоры.',
      cues: 'Штанга у ног, нейтральная поясница.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-sila-03',
      title: 'Отжимания с полной амплитудой',
      intent: 'Сила толкания и стабильность плеч.',
      cues: 'Лопатки вниз-вперёд в нижней точке.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'staticheskaya-sila': [
    {
      id: 'ex-stat-01',
      title: 'Планка на предплечьях',
      intent: 'Изометрия кора; короткие качественные удержания.',
      cues: 'Не провисать поясницей; дышать.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-stat-02',
      title: 'Статический выпад — удержание',
      intent: 'Сила передней ноги и стабильность таза.',
      cues: 'Корпус вертикально; заднее колено под тазом.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-stat-03',
      title: '«Стена» — полуприсед спиной к опоре',
      intent: 'Изометрия квадрицепса в безопасной геометрии.',
      avoid: 'Боль в колене — прекратить.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'skorostnaya-sila': [
    {
      id: 'ex-skorostnaya-01',
      title: 'Прыжок на низкую платформу',
      intent: 'Короткий взрыв с контролируемым приземлением.',
      cues: 'Двойной амортизация; глаза вперёд.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-skorostnaya-02',
      title: 'Рывок одной гантели вверх лёгким весом',
      intent: 'Максимальная скорость штанги/гантели в короткой амплитуде.',
      cues: 'Ноги дают импульс, плечо не «вылетает».',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-skorostnaya-03',
      title: 'Резкий шаг вперёд из стойки со «стыком» стоп',
      intent: 'Скоростной старт без длинного разгона.',
      cues: 'Корпус не опережает шаг.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'dinamicheskaya-sila': [
    {
      id: 'ex-dinam-01',
      title: 'Слэм медбола в пол (лёгкий мяч)',
      intent: 'Повторяемые мощные импульсы с ног.',
      cues: 'Короткая серия, полный отдых между подходами.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-dinam-02',
      title: 'Волны канатами 20 с / 40 с отдыха',
      intent: 'Удержание мощности в ритмическом режиме.',
      cues: 'Корпус жёсткий, движение из плеч и кора.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-dinam-03',
      title: 'Мах гири двумя руками лёгкой вес',
      intent: 'Циклическая мощность бёдер и кисти.',
      cues: 'Траектория «высокий треугольник»; не гиперэкстензия в пояснице.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'vyinoslivost-aerobnye': [
    {
      id: 'ex-aerob-01',
      title: 'Бег или ходьба по тесту разговорной фразы',
      intent: 'Аэробный фон без выхода в «кислоту».',
      cues: '10–15 минут ровного темпа.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-aerob-02',
      title: 'Тень 3 минуты в заданном ритме',
      intent: 'Перенос аэробики в боксёрскую специфику.',
      cues: 'Плечи расслаблены, дыхание через нос чаще.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-aerob-03',
      title: 'Вело или эллипс в спокойном темпе',
      intent: 'Монотонная работа для восстановления и фона.',
      cues: 'Пульс «можно говорить фразой».',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'anaerobnye-vozmozhnosti': [
    {
      id: 'ex-anaerob-01',
      title: 'Интервалы на велотренажёре 30/30',
      intent: 'Короткая тяжёлая работа и повторяемость.',
      cues: 'Сопротивление так, чтобы техника педалирования не ломалась.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-anaerob-02',
      title: 'Серия на мешке 20 с высокой плотности / 40 с отдыха',
      intent: 'Боксёрский интервал на кислоте.',
      cues: 'Задача на 1–2 чистых удара, не «молотилка».',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-anaerob-03',
      title: 'Спринт 10–15 м из стойки — 6–8 повторов',
      intent: 'Аликтиковый акцент без длинной дистанции.',
      cues: 'Полное восстановление между повторами.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  gibkost: [
    {
      id: 'ex-gibkost-01',
      title: 'Кошка-корова',
      intent: 'Подвижность грудного и поясничного отдела.',
      cues: 'Медленно, без боли в пояснице.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-gibkost-02',
      title: 'Растяжка грудных у дверного косяка',
      intent: 'Амплитуда для гарды и осанки.',
      cues: '15–30 с × 2–3; плечо без острой боли.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-gibkost-03',
      title: '«Книжка» лёжа на спине с поворотом коленей',
      intent: 'Таз и грудной отдел в мягкой ротации.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  'koordinacionnye-sposobnosti': [
    {
      id: 'ex-koord-01',
      title: 'Теневая по шаблону «два удара — шаг — сдвиг»',
      intent: 'Связность ног и рук в заданном порядке.',
      cues: 'Сначала медленно, затем ускорение без смены шаблона.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-koord-02',
      title: 'Касание конусов ногой по команде',
      intent: 'Дифференциация ног и точность шага.',
      cues: 'Корпус не «ныряет» за ногой.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-koord-03',
      title: 'Бросок мяча в отмеченный квадрат на полу',
      intent: 'Глаз-рука и контроль силы.',
      cues: 'Расстояние подобрать под возраст.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  ravnovesie: [
    {
      id: 'ex-ravn-01',
      title: 'Полубаланс: касание пола свободной стопой',
      intent: 'Статическая устойчивость на одной ноге.',
      cues: 'Взгляд на фиксированную точку; 10–20 с на сторону.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-ravn-02',
      title: 'Ходьба по линии «канатоходец»',
      intent: 'Динамическое равновесие в узкой базе.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-ravn-03',
      title: 'Стояние на одной ноге с закрытыми глазами 10 с',
      intent: 'Проприоцепция; только при безопасной зоне и готовности.',
      avoid: 'Головокружение — не выполнять.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
  tochnost: [
    {
      id: 'ex-tochnost-01',
      title: 'Джеб в малую отметку на лапе или на подушке',
      intent: 'Пространственная и временная точность удара.',
      cues: 'Сначала крупная мишень, затем сужение.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-tochnost-02',
      title: 'Метание мяча в корзину с 3–4 м',
      intent: 'Глаз-рука и контроль траектории.',
      media: { gifSrc: null, webmSrc: null },
    },
    {
      id: 'ex-tochnost-03',
      title: 'Касания стопой отмеченных «мишеней» на полу',
      intent: 'Точность ноги без смещения корпуса.',
      cues: 'Медленный темп, затем ускорение командой.',
      media: { gifSrc: null, webmSrc: null },
    },
  ],
}

function assertMotorQualityExercisesIntegrity() {
  const catalogSlugs = new Set(Object.values(MOTOR_QUALITY_SLUG_BY_TITLE))
  const ids = new Set()
  for (const [slug, list] of Object.entries(MOTOR_QUALITY_EXERCISES_BY_SLUG)) {
    if (!catalogSlugs.has(slug)) {
      throw new Error(`[motorQualityExercises] Неизвестный slug ключа: ${slug}`)
    }
    if (!Array.isArray(list)) {
      throw new Error(`[motorQualityExercises] Ожидался массив для ${slug}`)
    }
    for (const ex of list) {
      if (!ex?.id || ids.has(ex.id)) {
        throw new Error(`[motorQualityExercises] Дубликат или пустой id: ${ex?.id}`)
      }
      ids.add(ex.id)
      if (!ex.title || !ex.intent || !ex.media || typeof ex.media !== 'object') {
        throw new Error(`[motorQualityExercises] Неполная запись ${ex?.id}`)
      }
    }
  }
  for (const slug of catalogSlugs) {
    if (!MOTOR_QUALITY_EXERCISES_BY_SLUG[slug]) {
      throw new Error(`[motorQualityExercises] Нет упражнений для slug: ${slug}`)
    }
  }
}

if (import.meta.env.DEV) {
  assertMotorQualityExercisesIntegrity()
}

/**
 * @param {string} slug
 * @returns {MotorQualityExercise[]}
 */
export function getMotorQualityExercisesBySlug(slug) {
  if (!slug || typeof slug !== 'string') return []
  return MOTOR_QUALITY_EXERCISES_BY_SLUG[slug] ?? []
}
