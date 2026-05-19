import { Link } from 'react-router-dom'
import SensitiveAgeScale from '../components/SensitiveAgeScale'
import { getMotorQualitiesCatalog } from '../data/motorQualitiesCatalog'

function MotorQualitiesIndexPage() {
  const items = getMotorQualitiesCatalog()

  return (
    <main className="min-h-[calc(100vh-48px)] bg-[#edeef0] px-2 py-2 text-[#2c2d2e] sm:px-4 sm:py-3">
      <div className="mx-auto max-w-4xl space-y-3 sm:space-y-6">
        <header>
          <h1 className="text-[17px] font-semibold leading-5 sm:text-xl">Двигательные качества</h1>
        </header>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          {items.map(({ title, slug, sensitiveAgeSet }) => (
            <li key={slug}>
              <Link
                to={`/qualities/${slug}`}
                className="block rounded-[10px] bg-white p-2.5 transition active:bg-slate-50 hover:border-blue-200 hover:shadow-md dark:border-slate-600 dark:bg-slate-900 dark:active:bg-slate-800 dark:hover:border-blue-700 sm:rounded-xl sm:p-4"
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
            className="font-medium text-[#2d81e0] hover:opacity-90 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← На дашборд
          </Link>
        </p>
      </div>
    </main>
  )
}

export default MotorQualitiesIndexPage
