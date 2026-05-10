import { Link } from 'react-router-dom'
import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'

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
