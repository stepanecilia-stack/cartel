import { Link, Navigate, useParams } from 'react-router-dom'
import { getMotorQualityBySlug, getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'

function MotorQualityDetailPage() {
  const { slug } = useParams()
  const item = getMotorQualityBySlug(slug ?? '')

  if (!item) {
    return <Navigate to="/qualities" replace />
  }

  const catalog = getMotorQualitiesCatalog()

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-3 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <nav className="text-sm text-slate-600 dark:text-slate-400">
          <Link to="/qualities" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Двигательные качества
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-900 dark:text-slate-200">{item.title}</span>
        </nav>

        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{item.title}</h1>
          {item.sensitiveAgesLabel ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Сенситивные возрасты (таблица): </span>
              {item.sensitiveAgesLabel}
            </p>
          ) : null}
        </header>

        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 dark:border-slate-600 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Банк упражнений
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Здесь появится подборка упражнений и объёмов для развития этого качества. Пока раздел пустой — контент
            будет добавляться по мере наполнения базы.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Другие качества</h2>
          <ul className="flex flex-wrap gap-2">
            {catalog
              .filter((q) => q.slug !== item.slug)
              .map((q) => (
                <li key={q.slug}>
                  <Link
                    to={`/qualities/${q.slug}`}
                    className="inline-block rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {q.title}
                  </Link>
                </li>
              ))}
          </ul>
        </section>

        <p className="text-center text-sm">
          <Link to="/" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            На дашборд
          </Link>
        </p>
      </div>
    </main>
  )
}

export default MotorQualityDetailPage
