import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { subscribePublicStudentShareByToken } from '../services/firebaseService'
import { getWeights } from '../utils/ksrUtils'
import { technicalLevelInterpolationPercent } from '../utils/publicSharePayload'
import { buildShareAutoRecommendations } from '../utils/shareAutoRecommendations'
import ThemeToggleButton from '../components/ThemeToggleButton'
import StandardDuelSilhouettes from '../components/StandardDuelSilhouettes'
import { NormGoldGoalIcon, NormMedalChip } from '../components/NormMedals'
import { normCardToneByStatus, normScoreToneByStatus } from '../utils/normCardTone'

const TAB_ITEMS = [
  { id: 'anthropometry', label: 'Антропометрия' },
  { id: 'physical', label: 'Физическое развитие' },
  { id: 'functional', label: 'Функциональная готовность' },
  { id: 'technical', label: 'Техника' },
]

const TAB_PROGRESS_LABELS = {
  anthropometry: 'Антропометрия',
  physical: 'Физика',
  functional: 'Функционал',
  technical: 'Техника',
}

const TAB_ICONS = {
  anthropometry: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 6v4M9 7v2M12 6v4M15 7v2M18 6v4M6 14v4M9 15v2M12 14v4M15 15v2M18 14v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  physical: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 15c1.2-1.6 2.7-2.4 4.6-2.4 1.5 0 2.8.5 3.8 1.5l1.6 1.6c.8.8.8 2.1 0 2.9-.8.8-2.1.8-2.9 0l-1-1c-.6-.6-1.3-.9-2.2-.9-1.2 0-2.2.5-2.9 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 8.8 8 10.4c.6.6 1.4.9 2.2.9 1.1 0 2-.4 2.7-1.2l1-1.1c.8-.8 2.1-.9 2.9-.1.8.8.9 2.1.1 2.9l-1.5 1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  functional: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13.2 2 5 13h5l-1 9 8.2-11H12l1.2-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  technical: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8.5 13.5c-1.2 0-2.2-1-2.2-2.2V8.8c0-1.8 1.5-3.3 3.3-3.3h3.8c2.4 0 4.3 2 4.3 4.3v5.2c0 1.9-1.6 3.5-3.5 3.5H9.7c-1.8 0-3.2-1.4-3.2-3.2v-.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.3 10.7h3.3c1.1 0 2 .9 2 2v2.2c0 .9-.7 1.6-1.6 1.6H8c-.9 0-1.7-.8-1.7-1.7v-4.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

/** Как у тренера: кольцо «доминирует влияние» только у трёх разделов КСР (без антропометрии). */
const tabIdToInfluenceKey = {
  physical: 'physical',
  functional: 'functional',
  technical: 'tech',
}

function progressColorClass(value) {
  if (value <= 30) return 'bg-red-500'
  if (value <= 70) return 'bg-amber-400'
  return 'bg-emerald-500'
}

function WeightLineChartLight({ points }) {
  const w = 560
  const h = 200
  const pad = 24
  const sorted = useMemo(
    () =>
      [...(points || [])]
        .filter((p) => p.date && Number.isFinite(p.weight))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [points],
  )
  const pathData = useMemo(() => {
    if (sorted.length === 0) return { d: '', circles: [] }
    const weights = sorted.map((p) => p.weight)
    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)
    const span = Math.max(maxW - minW, 1)
    const n = sorted.length
    const coords = sorted.map((p, i) => {
      const x = pad + (n === 1 ? (w - 2 * pad) / 2 : ((w - 2 * pad) * i) / (n - 1))
      const y = pad + (1 - (p.weight - minW) / span) * (h - 2 * pad)
      return { x, y, ...p }
    })
    const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
    return { d, circles: coords }
  }, [sorted, w, h, pad])

  if (sorted.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 text-sm text-slate-500">
        Пока нет записей веса для графика.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto max-w-full text-blue-600">
        <defs>
          <linearGradient id="share-w-lg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        {pathData.d && (
          <path
            d={pathData.d}
            fill="none"
            stroke="url(#share-w-lg)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {pathData.circles.map((c) => (
          <circle key={`${c.date}-${c.weight}`} cx={c.x} cy={c.y} r="5" fill="white" stroke="#2563eb" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        {sorted.map((p) => (
          <span key={`${p.date}-${p.weight}`}>
            {p.date}: <span className="font-semibold text-slate-900 dark:text-slate-100">{p.weight} кг</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ShareReadonlyNormCard({ item }) {
  const cardStatus = item.status === 'empty' ? undefined : item.status
  const cardTone = normCardToneByStatus(cardStatus)
  const scoreTone = normScoreToneByStatus(cardStatus)
  const betterHint =
    item.measureType === 'MAX' ? 'Чем больше — тем лучше' : 'Чем меньше — тем лучше'
  const goalStr =
    item.normGoldDisplay != null && item.normGoldDisplay !== ''
      ? item.normGoldDisplay
      : item.normGold != null && Number.isFinite(item.normGold)
        ? String(item.normGold)
        : '—'

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors ${cardTone}`}>
      <div className="text-center">
        <span className="block text-base font-bold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">{item.name}</span>
        {item.description ? (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400 sm:text-xs">{item.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0">
        <div className="flex min-w-0 items-center gap-2">
          <NormGoldGoalIcon />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/85">Цель</p>
            <p className="truncate text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {goalStr} <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{item.unit}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <p className="max-w-[11rem] text-right text-[11px] font-medium leading-snug text-slate-700 sm:max-w-none sm:text-xs">
            {betterHint}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 dark:border-slate-600/80 pt-2">
        <div className="min-w-[140px] flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Результат ({item.unit})</span>
          <div className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
            {item.hasResult ? item.resultDisplay || item.resultValue : '—'}
          </div>
        </div>
        {item.hasResult && item.status !== 'empty' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Оценка в баллах:{' '}
              <span className={`font-semibold tabular-nums ${scoreTone}`}>{item.normalizedScore ?? '—'}</span>
            </span>
            <NormMedalChip status={item.status} size="sm" />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-600/80 pt-2">
        {item.acceptedDisplay ? (
          <p className="text-[11px] leading-snug text-slate-700">
            <span className="font-semibold text-slate-800">Фиксация норматива:</span> {item.acceptedDisplay}
            {item.acceptanceHistoryCount > 1 ? (
              <span className="text-slate-500"> · в истории {item.acceptanceHistoryCount} записей</span>
            ) : null}
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">Тренер ещё не зафиксировал этот норматив кнопкой «Сохранить норматив».</p>
        )}
      </div>
    </div>
  )
}

export default function ShareProgressPage() {
  const { student_hash: token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState(null)
  const [live, setLive] = useState(false)
  const [activeTab, setActiveTab] = useState('anthropometry')
  const [standardInfoOpen, setStandardInfoOpen] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Некорректная ссылка.')
      return undefined
    }
    setLoading(true)
    setError('')
    setLive(false)
    const unsub = subscribePublicStudentShareByToken(
      token,
      (data) => {
        setLoading(false)
        setLive(true)
        if (!data?.payload) {
          setDoc(null)
          setError('Ссылка недействительна или страница ещё не создана тренером.')
        } else {
          setError('')
          setDoc(data)
        }
      },
      (e) => {
        setLoading(false)
        if (e?.code === 'permission-denied') {
          setError(
            'Нет доступа к данным: в Firebase Console опубликуйте правила Firestore (раздел public_student_shares, чтение для гостей).',
          )
        } else {
          setError('Не удалось подключиться к обновлениям. Проверьте интернет.')
        }
      },
    )
    return () => unsub()
  }, [token])

  const p = doc?.payload

  const tabProgress = useMemo(() => {
    if (!p) return { anthropometry: 0, physical: 0, functional: 0, technical: 0 }
    if (p.tabProgress && typeof p.tabProgress === 'object') {
      return {
        anthropometry: Number(p.tabProgress.anthropometry) || 0,
        physical: Number(p.tabProgress.physical) || 0,
        functional: Number(p.tabProgress.functional) || 0,
        technical: Number(p.tabProgress.technical) || 0,
      }
    }
    return {
      anthropometry: 0,
      physical: p.physical?.fillPct ?? 0,
      functional: p.functional?.fillPct ?? 0,
      technical: p.technical?.fillPct ?? 0,
    }
  }, [p])

  /** Те же входы, что у `dynamicStudent` на странице тренера — для идентичных T/P/F. */
  const studentForWeights = useMemo(() => {
    if (!p) {
      return { height: 0, reach: 0, weight: 0, birthYear: 0, gender: 'M' }
    }
    const a = p.athleteSnapshot
    if (a && typeof a === 'object') {
      return {
        height: Number(a.height) || 0,
        reach: Number(a.reach) || 0,
        weight: Number(a.weight) || 0,
        birthYear: Number(a.birthYear) || 0,
        gender: a.gender === 'F' ? 'F' : 'M',
      }
    }
    const cw = Number(p.currentWeight) || 0
    return { height: 0, reach: 0, weight: cw, birthYear: 0, gender: 'M' }
  }, [p])

  const weights = useMemo(() => getWeights(studentForWeights), [studentForWeights])

  const influenceItems = useMemo(
    () => [
      { key: 'tech', label: 'Техника', value: Math.round(weights.T * 100) },
      { key: 'physical', label: 'Физическое развитие', value: Math.round(weights.P * 100) },
      { key: 'functional', label: 'Функциональная готовность', value: Math.round(weights.F * 100) },
    ],
    [weights],
  )

  const maxInfluenceValue = Math.max(...influenceItems.map((item) => item.value))
  const dominantInfluenceKeys = influenceItems
    .filter((item) => item.value === maxInfluenceValue && maxInfluenceValue > 0)
    .map((item) => item.key)

  const athlete = p?.athleteSnapshot

  const duelRows = p?.duelRows
  const standardPassport = p?.standardPassport

  const autoRecommendations = useMemo(() => {
    if (!p) return null
    const embedded = p.autoRecommendations
    if (embedded && Array.isArray(embedded.bullets) && embedded.bullets.length > 0) return embedded
    return buildShareAutoRecommendations({
      physicalItems: p.physical?.items ?? [],
      functionalItems: p.functional?.items ?? [],
      technicalItems: p.technical?.atoms ?? [],
      duelRows: p.duelRows ?? [],
    })
  }, [p])

  return (
    <main className="relative min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10">
      <div className="absolute right-0 top-0 z-50 pr-3 pt-3 sm:pr-6 sm:pt-6">
        <ThemeToggleButton />
      </div>
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cartel Academy</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Карточка спортсмена</h1>
          {live && !error && p ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Подключено к облаку · обновления в реальном времени
            </p>
          ) : null}
        </header>

        {loading && !p && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 py-16 text-center text-slate-500 shadow-sm">
            Загрузка…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-800">{error}</div>
        )}

        {!loading && p && (
          <>
            <section className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100">
                  {p.photoURL ? (
                    <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                      {String(p.displayName || '?')
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{p.displayName}</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Текущий вес:{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {p.currentWeight > 0 ? `${p.currentWeight} кг` : '—'}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Следующая аттестация:{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {p.nextAttestationDate
                        ? new Date(p.nextAttestationDate + 'T12:00:00').toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'уточняйте у тренера'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Динамика веса</h3>
                <WeightLineChartLight points={p.weightHistory || []} />
              </div>
            </section>

            {autoRecommendations ? (
              <section className="rounded-xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm dark:border-sky-800 dark:bg-sky-950/40 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ориентиры и зоны роста</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{autoRecommendations.intro}</p>
                <ul className="mt-4 list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {autoRecommendations.bullets.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {duelRows?.length > 0 && standardPassport && (
              <section className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-8">
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex flex-col gap-2 bg-slate-900 px-3 py-2.5 text-white sm:px-4 sm:py-3">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <span
                        className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-500 bg-slate-800 sm:inline-flex"
                        aria-hidden
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                        </svg>
                      </span>
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">Историческая модель эталона</p>
                      <span className="group relative hidden shrink-0 sm:inline-flex">
                        <button
                          type="button"
                          onClick={() => setStandardInfoOpen((prev) => !prev)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-300 bg-blue-500/20 text-sm font-bold leading-none text-blue-100 hover:bg-blue-500/30"
                          aria-label="Информация"
                          aria-expanded={standardInfoOpen}
                        >
                          i
                        </button>
                        <span
                          className={`absolute left-1/2 top-[calc(100%+8px)] z-20 w-[min(calc(100vw-2rem),290px)] -translate-x-1/2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg ${
                            standardInfoOpen ? 'block' : 'hidden group-hover:block'
                          }`}
                        >
                          В этой весовой и возрастной категории спортсмены именно с такой антропометрией чаще всего
                          становились победителями в соревнованиях высокой квалификации (усредн.).
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStandardInfoOpen((prev) => !prev)}
                      aria-expanded={standardInfoOpen}
                      className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-blue-400/50 bg-blue-500/25 py-3.5 text-lg font-bold tracking-[0.2em] text-blue-50 transition hover:bg-blue-500/35 sm:hidden"
                    >
                      <span aria-hidden>i</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 transition-transform duration-300 ${standardInfoOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    <div
                      className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out sm:hidden ${
                        standardInfoOpen ? 'max-h-[min(320px,55vh)] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-slate-600/80 pt-3">
                        <p className="text-xs leading-relaxed text-slate-300">
                          В этой весовой и возрастной категории спортсмены именно с такой антропометрией чаще всего
                          становились победителями в соревнованиях высокой квалификации (усредн.).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 px-2 py-3 sm:px-4 sm:py-4">
                    <div className="flex flex-col gap-3">
                      <div className="order-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-2 py-2 sm:px-3 sm:py-3 md:order-2">
                        <StandardDuelSilhouettes
                          athleteLabel={p.displayName || 'Спортсмен'}
                          referenceLabel="Эталон"
                          athleteHeightCm={athlete?.height ?? 0}
                          athleteReachCm={athlete?.reach ?? 0}
                          athleteWeightKg={athlete?.weight ?? 0}
                          referenceHeightCm={duelRows?.[0]?.referenceValue ?? 0}
                          referenceReachCm={duelRows?.[1]?.referenceValue ?? duelRows?.[0]?.referenceValue ?? 0}
                          referenceWeightKg={standardPassport?.referenceWeightKg ?? null}
                        />
                        <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-500">Дуэль: спортсмен vs эталон</p>
                        <div className="mt-2 space-y-2">
                          {duelRows.map((row) => {
                            const tone =
                              !Number.isFinite(row.delta) || row.delta === 0
                                ? 'text-slate-700'
                                : row.delta > 0
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                            const toneOnDark =
                              !Number.isFinite(row.delta) || row.delta === 0
                                ? 'text-white'
                                : row.delta > 0
                                  ? 'text-emerald-300'
                                  : 'text-red-300'
                            const athleteStr =
                              Number.isFinite(row.athleteValue) && row.athleteValue > 0
                                ? `${row.athleteValue} ${row.unit}`
                                : '—'
                            const refStr =
                              Number.isFinite(row.referenceValue) && row.referenceValue > 0
                                ? `${row.referenceValue} ${row.unit}`
                                : '—'
                            const deltaStr = Number.isFinite(row.delta)
                              ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)} ${row.unit}`
                              : '—'
                            return (
                              <div key={row.key} className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-600 text-xs">
                                <div className="p-2.5 sm:hidden">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                                  <div className="mt-2 flex justify-between gap-3 border-b border-slate-100 pb-2">
                                    <span className="shrink-0 text-slate-600 dark:text-slate-400">Спортсмен</span>
                                    <span className="min-w-0 text-right font-semibold tabular-nums text-blue-900">{athleteStr}</span>
                                  </div>
                                  <div className="mt-2 flex justify-between gap-3 border-b border-slate-100 pb-2">
                                    <span className="shrink-0 text-slate-600 dark:text-slate-400">Эталон</span>
                                    <span className="min-w-0 text-right font-semibold tabular-nums text-red-900">{refStr}</span>
                                  </div>
                                  <div className="mt-3 rounded-md bg-slate-900 px-2 py-2.5 text-center">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400">Разница</span>
                                    <p className={`mt-0.5 text-sm font-semibold tabular-nums ${toneOnDark}`}>{deltaStr}</p>
                                  </div>
                                </div>
                                <div className="hidden min-w-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:text-xs">
                                  <div className="min-w-0 bg-blue-50 px-2 py-2 text-blue-900 sm:px-3">
                                    <p className="font-medium text-slate-700">{row.label}</p>
                                    <p className="mt-0.5 font-semibold tabular-nums">
                                      {Number.isFinite(row.athleteValue) && row.athleteValue > 0 ? row.athleteValue : '—'}{' '}
                                      {row.unit}
                                    </p>
                                  </div>
                                  <div className="flex min-w-[4.25rem] flex-col items-center justify-center bg-slate-900 px-1.5 text-white sm:min-w-[4.5rem] sm:px-2">
                                    <span className="text-[9px] uppercase tracking-wider text-slate-300 sm:text-[10px]">delta</span>
                                    <span className={`text-center text-[11px] font-semibold tabular-nums leading-tight sm:text-xs ${tone}`}>
                                      {Number.isFinite(row.delta) ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)} ${row.unit}` : '—'}
                                    </span>
                                  </div>
                                  <div className="min-w-0 bg-red-50 px-2 py-2 text-right text-red-900 sm:px-3">
                                    <p className="font-medium text-slate-700">{row.label}</p>
                                    <p className="mt-0.5 font-semibold tabular-nums">
                                      {Number.isFinite(row.referenceValue) && row.referenceValue > 0 ? row.referenceValue : '—'}{' '}
                                      {row.unit}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="order-2 grid gap-2 sm:gap-3 md:order-1 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-2 py-2 sm:px-3 md:hidden">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Паспорт эталона</p>
                          <p className="mt-1 text-xs text-slate-700">
                            Весовая: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardPassport.weightCategory} кг</span>
                          </p>
                          <p className="text-xs text-slate-700">
                            Возрастная: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardPassport.ageGroup}</span>
                          </p>
                          <p className="text-xs text-slate-700">
                            Типаж: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardPassport.archetype}</span>
                          </p>
                        </div>
                        <div className="hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-3 md:block">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Весовая группа</p>
                          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{standardPassport.weightCategory} кг</p>
                        </div>
                        <div className="hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-3 md:block">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Возрастная группа</p>
                          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{standardPassport.ageGroup}</p>
                        </div>
                        <div className="hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-3 md:block">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Типаж эталона</p>
                          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{standardPassport.archetype}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Тесты и техника</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Разделы и оформление совпадают с кабинетом тренера. Нормативы с отметкой фиксации синхронизируются сразу после
                сохранения тренером.
              </p>

              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-3 sm:px-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Степень влияния на реализацию потенциала
                </p>
                <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">
                  Доля техники, физики и функционала в формуле балла (Smart Weights по антропометрии и эталону). Это не
                  процент заполнения анкеты — заполненность разделов показана на тёмных вкладках ниже.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[...influenceItems]
                    .sort((a, b) => b.value - a.value)
                    .map((item) => {
                      const isTop = item.value === maxInfluenceValue && maxInfluenceValue > 0
                      return (
                        <div
                          key={item.key}
                          className={`rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 ${
                            isTop ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          <p className="text-xs font-medium text-slate-800">{item.label}</p>
                          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{item.value}%</p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-colors ${progressColorClass(item.value)}`}
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:flex md:flex-nowrap md:gap-4">
                {TAB_ITEMS.map((tab) => {
                  const infKey = tabIdToInfluenceKey[tab.id]
                  const isTopInfluenceTab = infKey && dominantInfluenceKeys.includes(infKey)
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`group relative min-h-[116px] rounded-xl border bg-[#1A1A1A] px-3 py-3 text-left text-[#E8E8E8] transition-all duration-300 sm:min-h-[124px] sm:px-4 sm:py-4 md:min-h-[132px] md:flex-1 ${
                        activeTab === tab.id
                          ? 'border-[#E8E8E8] shadow-[0_0_0_1px_rgba(232,232,232,0.18)]'
                          : 'border-[#333333] hover:border-[#E8E8E8] hover:shadow-[0_0_14px_rgba(232,232,232,0.2)]'
                      } ${
                        isTopInfluenceTab ? 'ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-white md:min-h-[138px]' : ''
                      }`}
                    >
                      <span
                        className={`absolute inset-x-0 bottom-0 h-1 rounded-b-xl transition-all duration-300 ${
                          activeTab === tab.id ? 'bg-[#E8E8E8]' : 'bg-transparent'
                        }`}
                        aria-hidden
                      />
                      <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#333333] bg-[#222222] sm:mb-3 sm:h-10 sm:w-10">
                        {TAB_ICONS[tab.id]}
                      </span>
                      <span
                        className="block text-[14px] uppercase leading-tight tracking-normal sm:text-[16px] md:text-[18px] md:tracking-wide"
                        style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif' }}
                      >
                        {tab.label}
                      </span>
                      <span className="mt-2 block text-[11px] text-[#A8A8A8] sm:mt-3 sm:text-xs">
                        {TAB_PROGRESS_LABELS[tab.id]}: {tabProgress[tab.id] ?? 0}%
                      </span>
                      <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[#2A2A2A]" aria-hidden>
                        <span
                          className={`block h-full transition-all duration-300 ${progressColorClass(tabProgress[tab.id] ?? 0)}`}
                          style={{ width: `${tabProgress[tab.id] ?? 0}%` }}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 space-y-6">
                {activeTab === 'anthropometry' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-800">Антропометрия</h3>
                    {athlete ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-2">
                          <p className="text-xs text-slate-500">Год рождения</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {athlete.birthYearLabel || athlete.birthYear || '—'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-2">
                          <p className="text-xs text-slate-500">Пол</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{athlete.genderLabel || '—'}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-2">
                          <p className="text-xs text-slate-500">Рост (см)</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{athlete.height > 0 ? athlete.height : '—'}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-2">
                          <p className="text-xs text-slate-500">Вес (кг)</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{athlete.weight > 0 ? athlete.weight : '—'}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-2">
                          <p className="text-xs text-slate-500">Размах (см)</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{athlete.reach > 0 ? athlete.reach : '—'}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-3 py-2 md:col-span-2">
                          <p className="text-xs text-slate-500">Дата измерения</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{athlete.measureDate || '—'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Попросите тренера обновить ссылку «Поделиться прогрессом» — в данных появится полная антропометрия.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'physical' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-800">Физическое развитие</h3>
                    <div className="grid gap-4">
                      {(p.physical?.items ?? []).length === 0 ? (
                        <p className="text-sm text-slate-500">Нет нормативов для отображения.</p>
                      ) : (
                        (p.physical?.items ?? []).map((item) => <ShareReadonlyNormCard key={item.id} item={item} />)
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'functional' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-800">Функциональная готовность</h3>
                    <div className="grid gap-4">
                      {(p.functional?.items ?? []).length === 0 ? (
                        <p className="text-sm text-slate-500">Нет нормативов для отображения.</p>
                      ) : (
                        (p.functional?.items ?? []).map((item) => <ShareReadonlyNormCard key={item.id} item={item} />)
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'technical' && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-800">Техника</h3>
                    {(p.technical?.atoms ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">Список элементов пуст.</p>
                    ) : (
                      (p.technical?.atoms ?? []).map((atom) => {
                        const pct =
                          atom.levelPercent != null && Number.isFinite(Number(atom.levelPercent))
                            ? Number(atom.levelPercent)
                            : technicalLevelInterpolationPercent(atom.levelKey)
                        return (
                          <article key={atom.id} className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                              <h3 className="min-w-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                                <span className="tabular-nums text-slate-500">#{atom.number}</span> {atom.name}
                              </h3>
                              {atom.videoLink ? (
                                <a
                                  className="flex-shrink-0 text-[11px] font-medium text-blue-600 underline-offset-2 hover:underline sm:text-xs"
                                  href={atom.videoLink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Видео
                                </a>
                              ) : null}
                            </div>
                            {atom.comboChain ? (
                              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                                Цепочка: <span className="font-medium text-slate-800 dark:text-slate-200">{atom.comboChain}</span>
                              </p>
                            ) : null}
                            <div className="mt-2 space-y-0.5">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Уровень освоения
                              </span>
                              <div className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 sm:max-w-md">
                                {atom.levelLabel}
                              </div>
                            </div>
                            <div className="mt-2 h-2 min-w-0 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 transition-[width] duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {atom.comment ? (
                              <div className="mt-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/85 px-2.5 py-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Комментарий тренера</p>
                                <p className="mt-0.5 text-sm text-slate-800 whitespace-pre-wrap">{atom.comment}</p>
                              </div>
                            ) : null}
                            {(atom.howTo || atom.whyHowTo || atom.mistakes || atom.whyMistakes) && (
                              <details className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <summary className="cursor-pointer font-medium text-blue-600">Подсказка и детали</summary>
                                {atom.howTo ? (
                                  <p className="mt-2">
                                    <strong>Как надо:</strong> {atom.howTo}
                                  </p>
                                ) : null}
                                {atom.whyHowTo ? (
                                  <p className="mt-1">
                                    <strong>Почему:</strong> {atom.whyHowTo}
                                  </p>
                                ) : null}
                                {atom.mistakes ? (
                                  <p className="mt-1">
                                    <strong>Ошибки:</strong> {atom.mistakes}
                                  </p>
                                ) : null}
                                {atom.whyMistakes ? (
                                  <p className="mt-1">
                                    <strong>Почему ошибка:</strong> {atom.whyMistakes}
                                  </p>
                                ) : null}
                              </details>
                            )}
                          </article>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-sm sm:p-8">
              <p className="text-lg font-semibold text-emerald-900">Цель — уверенный прогресс по всем разделам</p>
              <p className="mt-2 text-sm text-emerald-800/90">Вопросы по цифрам и плану — к тренеру в зале.</p>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
