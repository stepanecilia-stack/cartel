import { Link } from 'react-router-dom'
import { getMotorQualitiesCatalog, MOTOR_QUALITY_SLUG_BY_TITLE } from '../data/motorQualitiesCatalog'

/**
 * Порядок — методический ориентир «что важнее для бокса как вида спорта» (не абсолютная истина для каждого ученика).
 * Тексты сжаты из методических обсуждений качеств.
 */
const MOTOR_QUALITY_HELPER_ROWS = [
  {
    title: 'Координационные способности',
    marker: 'Паттерн движения связный и ровный по ритму',
    focus: 'Согласование частей тела, смена задач, сначала медленно — потом темп',
    boxing: 'Стойка, шаг, синхрон корпуса и руки, смена уровня без «развала» техники',
  },
  {
    title: 'Точность',
    marker: 'Попадание в зону, момент и траекторию, как задумано',
    focus: 'Сужение мишени, контроль кисти и шага, сначала крупная цель',
    boxing: 'Джеб в цель, прямой «в окно», работа на лапах и мешке без «размазывания»',
  },
  {
    title: 'Быстрота',
    marker: 'Быстро переключается и отвечает на сигнал',
    focus: 'Реакция, частота ног/рук, короткие серии с полным отдыхом',
    boxing: 'Первый шаг, возврат руки, темп размена, старт по команде',
  },
  {
    title: 'Скоростная сила',
    marker: 'Очень короткий пик силы и скорости',
    focus: 'Взрыв с управлением, мало повторов, техника приземления/опоры',
    boxing: 'Старт удара, взрыв стопы, «первая передача» в серии',
  },
  {
    title: 'Скоростно-силовые качества',
    marker: 'Быстро и плотно, сериями без полного распада техники',
    focus: 'Связка силы и скорости, умеренные отягощения, интервалы 15–40 с в переносе',
    boxing: 'Плотные серии, ноги в впритык, ускорение из стойки, «тяжёлый темп»',
  },
  {
    title: 'Динамическая сила',
    marker: 'Мощность держится при повторных усилиях',
    focus: 'Серии усилий в амплитуде, не один пик — устойчивость качества усилия',
    boxing: 'Вторая половина серии на лапах, клинч, когда техника ещё живая под усталостью',
  },
  {
    title: 'Анаэробные возможности',
    marker: 'Короткий тяжёлый отрезок и повторяемость на кислоте',
    focus: 'Интервалы 10–60 с, восстановление между волнами, контроль дыхания',
    boxing: 'Плотность раунда, второй-третий отрезок, короткие спарринговые вставки',
  },
  {
    title: 'Выносливость (аэробные возможности)',
    marker: 'Долго в умеренном темпе, ровное дыхание',
    focus: 'Фон, разговорный тест, длинные лёгкие отрезки, восстановление между раундами',
    boxing: 'Ноги к концу раунда средней интенсивности, «газ» между раундами, теневая длинной серией',
  },
  {
    title: 'Сила',
    marker: 'Контролируемо работает с отягощением и весом тела',
    focus: 'Базовые присед/тяга/жим, прогрессия маленькими шагами, техника важнее веса',
    boxing: 'Корсет, ноги, ударная цепочка, устойчивость в контакте',
  },
  {
    title: 'Статическая сила',
    marker: 'Долго удерживает напряжённую позицию без смещения',
    focus: 'Изометрия и короткие удержания качественно, без задержки дыхания',
    boxing: 'Стойка под давлением, клинч, жёсткий блок, микроудержание оси',
  },
  {
    title: 'Равновесие',
    marker: 'Не заваливается, быстро находит середину после смещения',
    focus: 'Опора на одной/двух ногах, линии и остановки в стойке',
    boxing: 'Перенос веса, смена направления, стойка после шага без «догоняния» корпусом',
  },
  {
    title: 'Гибкость',
    marker: 'Достаточная амплитуда без боли и компенсаций',
    focus: 'Подвижность суставов, короткая динамика и мягкая статика, не «шпагат любой ценой»',
    boxing: 'Плечи/таз для гарды и смены уровня, комфорт в длинной стойке, профилактика перегрузок',
  },
  {
    title: 'Мышечная масса',
    marker: 'Ткань переносит объём тренировки и адаптируется',
    focus: 'Многосуставные паттерны умеренно, сон и регулярность нагрузки',
    boxing: 'Тренируемость, «рамка» под силу и скоростно-силовую работу, не визуальный бодибилдинг',
  },
  {
    title: 'Рост',
    marker: 'Антропометрия и возрастной этап',
    focus: 'Не «тренируется» как удар; контекст нагрузки, сон, питание — с врачом при вопросах',
    boxing: 'Дистанции, рычаги, весовая категория; подбор задач под телосложение, не борьба с ростом',
  },
]

function MotorQualitiesIndexPage() {
  const items = getMotorQualitiesCatalog()

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 px-3 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:min-h-[calc(100vh-72px)] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            База для тренера
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Двигательные качества</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Отдельные страницы по каждому качеству. Сюда постепенно будут добавляться упражнения и методические
            подсказки — чтобы в будущем рекомендации могли ссылаться на конкретные задачи, а не только на крупные
            блоки тренировки.
          </p>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map(({ title, slug, sensitiveAgesLabel }) => (
            <li key={slug}>
              <Link
                to={`/qualities/${slug}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-600 dark:bg-slate-900 dark:hover:border-blue-700"
              >
                <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</span>
                {sensitiveAgesLabel ? (
                  <p className="mt-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                    Сенситивные возрасты (ориентир): {sensitiveAgesLabel}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Карточка качества</p>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Помощник по качествам</h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Порядок строк — ориентир приоритета для бокса как вида спорта (для конкретного ученика акценты может менять
              тренер). Маркер — как «на глаз» понять качество; фокус — что обычно тренируют; последний столбец — связь с
              рингом и залом.
            </p>
          </div>
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  <th className="py-2 pr-3 align-bottom tabular-nums">#</th>
                  <th className="py-2 pr-3 align-bottom">Качество</th>
                  <th className="py-2 pr-3 align-bottom">Маркер</th>
                  <th className="py-2 pr-3 align-bottom">Фокус</th>
                  <th className="py-2 align-bottom">На что влияет в боксе</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-200">
                {MOTOR_QUALITY_HELPER_ROWS.map((row, idx) => {
                  const slug = MOTOR_QUALITY_SLUG_BY_TITLE[row.title]
                  return (
                    <tr
                      key={row.title}
                      className="border-b border-slate-100 align-top last:border-0 dark:border-slate-700/80"
                    >
                      <td className="py-2.5 pr-3 tabular-nums text-slate-400 dark:text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-slate-100">
                        {slug ? (
                          <Link to={`/qualities/${slug}`} className="text-blue-600 hover:underline dark:text-blue-400">
                            {row.title}
                          </Link>
                        ) : (
                          row.title
                        )}
                      </td>
                      <td className="py-2.5 pr-3 leading-snug text-slate-700 dark:text-slate-300">{row.marker}</td>
                      <td className="py-2.5 pr-3 leading-snug text-slate-700 dark:text-slate-300">{row.focus}</td>
                      <td className="py-2.5 leading-snug text-slate-700 dark:text-slate-300">{row.boxing}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            ← На дашборд
          </Link>
        </p>
      </div>
    </main>
  )
}

export default MotorQualitiesIndexPage
