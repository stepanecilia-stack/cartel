import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import LeaderboardCategoryTabs from '../components/LeaderboardCategoryTabs.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import { subscribePublicLeaderboardShareByToken } from '../services/firebaseService.js'
import { LEADERBOARD_CATEGORIES } from '../utils/leaderboardMetrics.js'
import { vk } from '../utils/vkUi.js'

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
    <main className={`${vk.page} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-3xl`}>
        <BackToHomeBar to="/welcome" />
        <header className="space-y-1.5">
          <p className={vk.mutedXs}>Публичный рейтинг</p>
          <h1 className={vk.h1Lg}>{payload?.coachDisplayName ?? 'Рейтинг спортсменов'}</h1>
          {isConnected ? (
            <p className="inline-flex items-center gap-1.5 text-[12px] text-[#4bb34b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4bb34b]" aria-hidden />
              Обновляется в реальном времени
            </p>
          ) : null}
        </header>

        {!doc && !loadError ? <p className={`text-center ${vk.muted}`}>Загрузка рейтинга…</p> : null}

        {loadError ? <p className={vk.error}>{loadError}</p> : null}

        {doc && !payload ? (
          <p className={`text-center ${vk.muted}`}>Ссылка недействительна или рейтинг ещё не опубликован.</p>
        ) : null}

        {payload ? (
          <section className={`${vk.cardPadded} py-2.5`}>
            <LeaderboardCategoryTabs
              category={category}
              onCategoryChange={setCategory}
              categoriesMeta={categories}
              tabIds={categoryTabs}
            />
            <p className={`mt-1.5 line-clamp-2 ${vk.mutedXs}`}>{activeMeta?.hint ?? ''}</p>
            <div className="mt-2">
              <LeaderboardTable rows={rows} categoryId={category} publicMode />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
