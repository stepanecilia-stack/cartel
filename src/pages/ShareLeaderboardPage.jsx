import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import LeaderboardCategoryTabs from '../components/LeaderboardCategoryTabs.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import { subscribePublicLeaderboardShareByToken } from '../services/firebaseService.js'
import { LEADERBOARD_CATEGORIES } from '../utils/leaderboardMetrics.js'

export default function ShareLeaderboardPage() {
  const { token } = useParams()
  const [doc, setDoc] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [category, setCategory] = useState('motor')
  const categoryBootstrappedRef = useRef(false)

  useEffect(() => {
    categoryBootstrappedRef.current = false
    setCategory('motor')
  }, [token])

  useEffect(() => {
    if (!token) {
      setDoc(null)
      return undefined
    }
    setLoadError('')
    const unsub = subscribePublicLeaderboardShareByToken(
      token,
      (data) => {
        setDoc(data)
        setIsConnected(true)
        const payload = data?.payload
        if (payload?.defaultCategoryId && !categoryBootstrappedRef.current) {
          setCategory(payload.defaultCategoryId)
          categoryBootstrappedRef.current = true
        }
      },
      (err) => {
        console.error(err)
        setLoadError(
          'Нет доступа к рейтингу. Опубликуйте правила Firestore для public_leaderboard_shares (чтение для гостей).',
        )
        setIsConnected(false)
      },
    )
    return () => {
      unsub()
      setIsConnected(false)
    }
  }, [token])

  const payload = doc?.payload
  const categories = payload?.categories ?? {}
  const activeMeta = categories[category] ?? LEADERBOARD_CATEGORIES.find((c) => c.id === category)
  const rows = categories[category]?.rows ?? []

  const categoryTabs = useMemo(() => {
    const ids = LEADERBOARD_CATEGORIES.map((c) => c.id).filter((id) => categories[id]?.rows)
    if (ids.length > 0) return ids
    return LEADERBOARD_CATEGORIES.map((c) => c.id)
  }, [categories])

  return (
    <main className="min-h-screen bg-[#edeef0] px-2 py-2 text-[#2c2d2e] sm:px-4 sm:py-3">
      <div className="mx-auto max-w-3xl space-y-3 sm:space-y-6">
        <BackToHomeBar to="/welcome" />
        <header className="space-y-1.5 sm:space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs dark:text-slate-400">
            Публичный рейтинг
          </p>
          <h1 className="text-lg font-bold leading-tight tracking-tight sm:text-3xl">
            {payload?.coachDisplayName ?? 'Рейтинг спортсменов'}
          </h1>
          {isConnected ? (
            <p className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 sm:text-xs dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
              Обновляется в реальном времени
            </p>
          ) : null}
        </header>

        {!doc && !loadError ? (
          <p className="text-center text-sm text-slate-500">Загрузка рейтинга…</p>
        ) : null}

        {loadError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 sm:text-sm dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {loadError}
          </p>
        ) : null}

        {doc && !payload ? (
          <p className="text-center text-sm text-slate-500">Ссылка недействительна или рейтинг ещё не опубликован.</p>
        ) : null}

        {payload ? (
          <>
            <LeaderboardCategoryTabs
              category={category}
              onCategoryChange={setCategory}
              categoriesMeta={categories}
              tabIds={categoryTabs}
            />

            <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:px-3 sm:text-sm">
              {activeMeta?.hint ?? ''}
            </p>

            <LeaderboardTable rows={rows} categoryId={category} publicMode />
          </>
        ) : null}
      </div>
    </main>
  )
}
