import { Link } from 'react-router-dom'
import SensitiveAgeScale from '../components/SensitiveAgeScale'
import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'

function MotorQualitiesIndexPage() {
  const items = getMotorQualitiesCatalog()

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 px-2 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:min-h-[calc(100vh-72px)] sm:px-6 sm:py-10 md:py-12">
      <div className="mx-auto max-w-4xl space-y-3 sm:space-y-6">
        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-3xl md:text-4xl">Двигательные качества</h1>
        </header>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          {items.map(({ title, slug, sensitiveAgeSet }) => (
            <li key={slug}>
              <Link
                to={`/qualities/${slug}`}
                className="block rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition active:bg-slate-50 hover:border-blue-200 hover:shadow-md dark:border-slate-600 dark:bg-slate-900 dark:active:bg-slate-800 dark:hover:border-blue-700 sm:rounded-xl sm:p-4"
              >
                <span className="text-sm font-semibold leading-snug text-slate-900 sm:text-base dark:text-slate-100">
                  {title}
                </span>
                {sensitiveAgeSet?.size > 0 ? (
                  <SensitiveAgeScale
                    sensitiveAges={sensitiveAgeSet}
                    compact
                    showCaption={false}
                    className="mt-2 sm:mt-3"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        <p className="pt-1 text-center text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          <Link
            to="/"
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← На дашборд
          </Link>
        </p>
      </div>
    </main>
  )
}

export default MotorQualitiesIndexPage
