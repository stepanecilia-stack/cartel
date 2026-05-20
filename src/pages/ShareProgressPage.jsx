import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { subscribePublicStudentShareByToken } from '../services/firebaseService'
import { getWeights } from '../utils/ksrUtils'
import { technicalLevelInterpolationPercent } from '../utils/publicSharePayload'
import StandardDuelSilhouettes from '../components/StandardDuelSilhouettes'
import ShareSensitivePeriodsMap from '../components/ShareSensitivePeriodsMap'
import { NormGoldGoalIcon, NormMedalChip } from '../components/NormMedals'
import { normScoreToneByStatus } from '../utils/normCardTone'
import { ETALON_MODEL_PANEL_CLASS, vk } from '../utils/vkUi.js'

const TAB_ITEMS = [
  { id: 'anthropometry', shortLabel: 'Карта' },
  { id: 'physical', shortLabel: 'Физика' },
  { id: 'functional', shortLabel: 'Функционал' },
  { id: 'technical', shortLabel: 'Техника' },
]

const tabIdToInfluenceKey = {
  physical: 'physical',
  functional: 'functional',
  technical: 'tech',
}

function progressBarClass(value) {
  if (value <= 30) return 'bg-[#e64646]'
  if (value <= 70) return 'bg-[#ffa000]'
  return 'bg-[#4bb34b]'
}

function WeightLineChartCompact({ points }) {
  const w = 480
  const h = 140
  const pad = 20
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
  }, [sorted])

  if (sorted.length === 0) {
    return <p className={vk.mutedXs}>Пока нет записей веса для графика.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-[#f0f2f5] p-2">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto max-w-full text-[#2d81e0]">
        <defs>
          <linearGradient id="share-w-vk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2d81e0" />
            <stop offset="100%" stopColor="#5eb3f6" />
          </linearGradient>
        </defs>
        {pathData.d ? (
          <path
            d={pathData.d}
            fill="none"
            stroke="url(#share-w-vk)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {pathData.circles.map((c) => (
          <circle key={`${c.date}-${c.weight}`} cx={c.x} cy={c.y} r="4" fill="white" stroke="#2d81e0" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-[#818c99]">
        {sorted.map((p) => (
          <span key={`${p.date}-${p.weight}`}>
            {p.date}: <span className="font-semibold tabular-nums text-[#2c2d2e]">{p.weight} кг</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ShareNormRow({ item }) {
  const scoreTone = normScoreToneByStatus(item.status === 'empty' ? undefined : item.status)
  const goalStr =
    item.normGoldDisplay != null && item.normGoldDisplay !== ''
      ? item.normGoldDisplay
      : item.normGold != null && Number.isFinite(item.normGold)
        ? String(item.normGold)
        : '—'

  return (
    <article className="rounded-[10px] border border-[#e7e8ec] bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium leading-5 text-[#2c2d2e]">{item.name}</p>
          {item.description ? <p className={`mt-0.5 line-clamp-2 ${vk.mutedXs}`}>{item.description}</p> : null}
        </div>
        {item.hasResult && item.status !== 'empty' ? <NormMedalChip status={item.status} size="sm" /> : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-[#f0f2f5] px-2 py-1.5">
          <NormGoldGoalIcon />
          <div className="min-w-0">
            <p className="text-[10px] text-[#818c99]">Цель</p>
            <p className="truncate font-semibold tabular-nums text-[#2c2d2e]">
              {goalStr} {item.unit}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-[#f0f2f5] px-2 py-1.5">
          <p className="text-[10px] text-[#818c99]">Результат</p>
          <p className="font-semibold tabular-nums text-[#2c2d2e]">
            {item.hasResult ? item.resultDisplay || item.resultValue : '—'}
            {item.hasResult && item.unit ? (
              <span className="ml-0.5 text-[11px] font-medium text-[#818c99]">{item.unit}</span>
            ) : null}
          </p>
        </div>
      </div>

      {item.hasResult && item.status !== 'empty' ? (
        <p className={`mt-1.5 text-[11px] ${scoreTone}`}>
          Баллы: <span className="font-semibold tabular-nums">{item.normalizedScore ?? '—'}</span>
        </p>
      ) : null}

      {item.acceptedDisplay ? (
        <p className={`mt-1.5 ${vk.mutedXs}`}>
          Фиксация: {item.acceptedDisplay}
          {item.acceptanceHistoryCount > 1 ? ` · в истории ${item.acceptanceHistoryCount}` : ''}
        </p>
      ) : (
        <p className={`mt-1.5 ${vk.mutedXs}`}>Норматив ещё не зафиксирован тренером.</p>
      )}
    </article>
  )
}

function ShareTechRow({ atom }) {
  const pct =
    atom.levelPercent != null && Number.isFinite(Number(atom.levelPercent))
      ? Number(atom.levelPercent)
      : technicalLevelInterpolationPercent(atom.levelKey)
  const hasDetails = atom.howTo || atom.whyHowTo || atom.mistakes || atom.whyMistakes

  return (
    <article className="rounded-[10px] border border-[#e7e8ec] bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[14px] font-medium leading-5 text-[#2c2d2e]">
          <span className="tabular-nums text-[#818c99]">#{atom.number}</span> {atom.name}
        </p>
        {atom.videoLink ? (
          <a href={atom.videoLink} target="_blank" rel="noreferrer" className={`shrink-0 ${vk.link}`}>
            Видео
          </a>
        ) : null}
      </div>
      {atom.comboChain ? (
        <p className={`mt-1 ${vk.mutedXs}`}>
          Цепочка: <span className="text-[#2c2d2e]">{atom.comboChain}</span>
        </p>
      ) : null}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] text-[#2c2d2e]">{atom.levelLabel}</span>
        <span className="text-[11px] font-medium tabular-nums text-[#818c99]">{pct}%</span>
      </div>
      <div className={`${vk.progressTrack} mt-1 block`}>
        <span className={`block h-full rounded-full ${progressBarClass(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      {atom.comment ? <p className={`mt-1.5 ${vk.mutedXs}`}>{atom.comment}</p> : null}
      {hasDetails ? (
        <details className="mt-1">
          <summary className={`cursor-pointer ${vk.link}`}>Подробнее</summary>
          <div className={`mt-1 space-y-1 ${vk.mutedXs}`}>
            {atom.howTo ? <p>Как: {atom.howTo}</p> : null}
            {atom.whyHowTo ? <p>Почему: {atom.whyHowTo}</p> : null}
            {atom.mistakes ? <p>Ошибки: {atom.mistakes}</p> : null}
            {atom.whyMistakes ? <p>Почему ошибка: {atom.whyMistakes}</p> : null}
          </div>
        </details>
      ) : null}
    </article>
  )
}

export default function ShareProgressPage() {
  const { student_hash: token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState(null)
  const [live, setLive] = useState(false)
  const [activeTab, setActiveTab] = useState('anthropometry')

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
            'Нет доступа к данным: в Firebase Console опубликуйте правила Firestore (public_student_shares, чтение для гостей).',
          )
        } else {
          setError('Не удалось подключиться. Проверьте интернет.')
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

  const studentForWeights = useMemo(() => {
    if (!p) return { height: 0, reach: 0, weight: 0, birthYear: 0, gender: 'M' }
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
    return { height: 0, reach: 0, weight: Number(p.currentWeight) || 0, birthYear: 0, gender: 'M' }
  }, [p])

  const weights = useMemo(() => getWeights(studentForWeights), [studentForWeights])

  const influenceItems = useMemo(
    () => [
      { key: 'tech', label: 'Техника', value: Math.round(weights.T * 100) },
      { key: 'physical', label: 'Физика', value: Math.round(weights.P * 100) },
      { key: 'functional', label: 'Функционал', value: Math.round(weights.F * 100) },
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

  const attestationLabel = p?.nextAttestationDate
    ? new Date(p.nextAttestationDate + 'T12:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'уточняйте у тренера'

  return (
    <main className={`${vk.page} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-3xl`}>
        <BackToHomeBar to="/welcome" />

        <header className="space-y-1">
          <p className={vk.mutedXs}>Cartel Academy · прогресс спортсмена</p>
          <h1 className={vk.h1Lg}>{p?.displayName ?? 'Карточка спортсмена'}</h1>
          {live && !error && p ? (
            <p className="inline-flex items-center gap-1.5 text-[12px] text-[#4bb34b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4bb34b]" aria-hidden />
              Обновляется в реальном времени
            </p>
          ) : null}
        </header>

        {loading && !p ? <p className={`text-center ${vk.muted}`}>Загрузка…</p> : null}
        {error ? <p className={vk.error}>{error}</p> : null}

        {!loading && p ? (
          <>
            <section className={`${vk.cardPadded} py-2.5`}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#e7e8ec] bg-[#f0f2f5]">
                  {p.photoURL ? (
                    <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#818c99]">
                      {String(p.displayName || '?')
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-[13px] leading-[18px]">
                  <p>
                    Вес:{' '}
                    <span className="font-semibold tabular-nums text-[#2c2d2e]">
                      {p.currentWeight > 0 ? `${p.currentWeight} кг` : '—'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[#818c99]">
                    Аттестация: <span className="font-medium text-[#2c2d2e]">{attestationLabel}</span>
                  </p>
                </div>
              </div>
              <div className="mt-2.5">
                <p className={`mb-1 ${vk.label}`}>Динамика веса</p>
                <WeightLineChartCompact points={p.weightHistory || []} />
              </div>
            </section>

            <ShareSensitivePeriodsMap birthYear={athlete?.birthYear} birthDate={athlete?.birthDate} />

            {duelRows?.length > 0 && standardPassport ? (
              <section className={`${vk.cardPadded} py-2.5`}>
                <h2 className={vk.h2}>Эталон и биометрия</h2>
                <div className={`${ETALON_MODEL_PANEL_CLASS} mt-2 rounded-lg bg-[#f0f2f5] px-2 py-2`}>
                  <StandardDuelSilhouettes
                    flat
                    athleteLabel={p.displayName || 'Спортсмен'}
                    referenceLabel="Эталон"
                    athleteHeightCm={athlete?.height ?? 0}
                    athleteReachCm={athlete?.reach ?? 0}
                    athleteWeightKg={athlete?.weight ?? 0}
                    referenceHeightCm={duelRows?.[0]?.referenceValue ?? 0}
                    referenceReachCm={duelRows?.[1]?.referenceValue ?? duelRows?.[0]?.referenceValue ?? 0}
                    referenceWeightKg={standardPassport?.referenceWeightKg ?? null}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
                  <span className="rounded-md bg-[#f0f2f5] px-2 py-1">
                    Вес: <strong>{standardPassport.weightCategory} кг</strong>
                  </span>
                  <span className="rounded-md bg-[#f0f2f5] px-2 py-1">
                    Возраст: <strong>{standardPassport.ageGroup}</strong>
                  </span>
                  <span className="rounded-md bg-[#f0f2f5] px-2 py-1">
                    Типаж: <strong>{standardPassport.archetype}</strong>
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {duelRows.map((row) => {
                    const deltaTone =
                      !Number.isFinite(row.delta) || row.delta === 0
                        ? 'text-[#818c99]'
                        : row.delta > 0
                          ? 'text-[#4bb34b]'
                          : 'text-[#e64646]'
                    return (
                      <li
                        key={row.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#e7e8ec] bg-white px-2.5 py-2 text-[12px]"
                      >
                        <span className="font-medium text-[#2c2d2e]">{row.label}</span>
                        <span className="tabular-nums text-[#818c99]">
                          {Number.isFinite(row.athleteValue) && row.athleteValue > 0 ? row.athleteValue : '—'} /{' '}
                          {Number.isFinite(row.referenceValue) && row.referenceValue > 0 ? row.referenceValue : '—'}{' '}
                          {row.unit}
                        </span>
                        <span className={`shrink-0 font-semibold tabular-nums ${deltaTone}`}>
                          {Number.isFinite(row.delta)
                            ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)}`
                            : '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <section className={`${vk.cardPadded} py-2.5`}>
              <h2 className={vk.h2}>Тесты и техника</h2>
              <p className={`mt-0.5 ${vk.mutedXs}`}>Доли в формуле балла (Smart Weights). Заполненность — на вкладках.</p>

              <div className="mt-2 grid grid-cols-3 gap-1">
                {[...influenceItems]
                  .sort((a, b) => b.value - a.value)
                  .map((item) => {
                    const isTop = item.value === maxInfluenceValue && maxInfluenceValue > 0
                    return (
                      <div
                        key={item.key}
                        className={`rounded-lg px-2 py-1.5 ${isTop ? 'bg-[#ecf3fc] ring-1 ring-[#aec8e8]' : 'bg-[#f0f2f5]'}`}
                      >
                        <p className="text-[10px] leading-3 text-[#818c99]">{item.label}</p>
                        <p className="text-[15px] font-semibold tabular-nums text-[#2c2d2e]">{item.value}%</p>
                        <div className={`${vk.progressTrack} mt-1 block`}>
                          <span
                            className={`block h-full rounded-full ${progressBarClass(item.value)}`}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>

              <nav className={`${vk.studentTabBar} mt-2`} aria-label="Разделы прогресса">
                {TAB_ITEMS.map((tab) => {
                  const infKey = tabIdToInfluenceKey[tab.id]
                  const isTopInfluenceTab = infKey && dominantInfluenceKeys.includes(infKey)
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`${vk.studentTabBtn} ${
                        isActive ? vk.studentTabBtnActive : vk.studentTabBtnIdle
                      } ${isTopInfluenceTab ? 'ring-1 ring-[#4bb34b]/50 ring-inset' : ''}`}
                    >
                      <span className="text-[12px] font-medium leading-4">{tab.shortLabel}</span>
                      {tab.id !== 'anthropometry' ? (
                        <span
                          className={`text-[10px] font-medium tabular-nums leading-none ${
                            isActive ? 'text-[#818c99]' : 'text-[#aeb7c2]'
                          }`}
                        >
                          {tabProgress[tab.id] ?? 0}%
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </nav>

              <div className="mt-2 space-y-2">
                {activeTab === 'anthropometry' && athlete ? (
                  <div className={vk.formGrid2}>
                    {[
                      ['Год рожд.', athlete.birthYearLabel || athlete.birthYear || '—'],
                      ['Пол', athlete.genderLabel || '—'],
                      ['Рост, см', athlete.height > 0 ? athlete.height : '—'],
                      ['Вес, кг', athlete.weight > 0 ? athlete.weight : '—'],
                      ['Размах, см', athlete.reach > 0 ? athlete.reach : '—'],
                      ['Дата измерения', athlete.measureDate || '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="rounded-lg bg-[#f0f2f5] px-2.5 py-2">
                        <p className="text-[10px] text-[#818c99]">{label}</p>
                        <p className="text-[14px] font-semibold text-[#2c2d2e]">{val}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {activeTab === 'anthropometry' && !athlete ? (
                  <p className={vk.mutedXs}>Попросите тренера обновить ссылку «Поделиться прогрессом».</p>
                ) : null}

                {activeTab === 'physical' ? (
                  (p.physical?.items ?? []).length === 0 ? (
                    <p className={vk.mutedXs}>Нет нормативов для отображения.</p>
                  ) : (
                    (p.physical?.items ?? []).map((item) => <ShareNormRow key={item.id} item={item} />)
                  )
                ) : null}

                {activeTab === 'functional' ? (
                  (p.functional?.items ?? []).length === 0 ? (
                    <p className={vk.mutedXs}>Нет нормативов для отображения.</p>
                  ) : (
                    (p.functional?.items ?? []).map((item) => <ShareNormRow key={item.id} item={item} />)
                  )
                ) : null}

                {activeTab === 'technical' ? (
                  (p.technical?.atoms ?? []).length === 0 ? (
                    <p className={vk.mutedXs}>Список элементов пуст.</p>
                  ) : (
                    (p.technical?.atoms ?? []).map((atom) => <ShareTechRow key={atom.id} atom={atom} />)
                  )
                ) : null}
              </div>
            </section>

            <p className={`text-center ${vk.mutedXs}`}>Вопросы по прогрессу — к тренеру в зале</p>
          </>
        ) : null}
      </div>
    </main>
  )
}
