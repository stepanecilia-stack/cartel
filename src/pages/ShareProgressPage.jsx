import { useEffect, useId, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicStudentShareByToken } from '../services/firebaseService'
import { technicalLevelInterpolationPercent } from '../utils/publicSharePayload'

function IconCheck({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCircleEmpty({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

/** Золото — звезда (как просили). */
function IconStarGold({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.95 7.4 7.9.58-6.05 4.68 2.2 7.74L12 17.77l-6 3.63 2.2-7.74-6.05-4.68 7.9-.58L12 2z" />
    </svg>
  )
}

/** Серебряная медаль (ленты + круг). */
function IconSilverMedal() {
  const rid = useId().replace(/:/g, '')
  const gid = `silv-${rid}`
  return (
    <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id={gid} cx="32%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
      </defs>
      <path
        d="M6.5 3 L8 9.5 L3 10.5 L7.5 14 L6 21 L12 17.5 L18 21 L16.5 14 L21 10.5 L16 9.5 L17.5 3 L12 7 Z"
        fill={`url(#${gid})`}
        stroke="#64748b"
        strokeWidth="0.45"
      />
      <circle cx="12" cy="15.2" r="5.4" fill={`url(#${gid})`} stroke="#475569" strokeWidth="0.7" />
    </svg>
  )
}

/** Бронзовая медаль. */
function IconBronzeMedal() {
  const rid = useId().replace(/:/g, '')
  const gid = `brz-${rid}`
  return (
    <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id={gid} cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="40%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
      </defs>
      <path
        d="M6.5 3 L8 9.5 L3 10.5 L7.5 14 L6 21 L12 17.5 L18 21 L16.5 14 L21 10.5 L16 9.5 L17.5 3 L12 7 Z"
        fill={`url(#${gid})`}
        stroke="#92400e"
        strokeWidth="0.45"
      />
      <circle cx="12" cy="15.2" r="5.4" fill={`url(#${gid})`} stroke="#78350f" strokeWidth="0.7" />
    </svg>
  )
}

function FuelTank({ label, subtitle, pct, delayMs, animate, fillCaption }) {
  const safe = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/60 p-5 shadow-lg shadow-black/20">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-zinc-50">{label}</h3>
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        </div>
        <span className="text-2xl font-bold tabular-nums text-emerald-400">{safe}%</span>
      </div>
      <div className="mt-4 h-12 overflow-hidden rounded-xl border border-zinc-600/80 bg-zinc-950/80">
        <div
          className="h-full rounded-xl bg-gradient-to-r from-emerald-700 via-teal-500 to-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-[width] duration-[1400ms] ease-out"
          style={{
            width: animate ? `${safe}%` : '0%',
            transitionDelay: `${delayMs}ms`,
          }}
        />
      </div>
      <p className="mt-2 text-right text-xs text-zinc-500">
        {fillCaption ?? 'Заполнение: доля тестов с внесённым результатом.'}
      </p>
    </div>
  )
}

function tierChipClass(tierLabel) {
  if (tierLabel === 'Золото') return 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-500/40'
  if (tierLabel === 'Серебро') return 'bg-slate-400/20 text-slate-200 ring-1 ring-slate-400/35'
  if (tierLabel === 'Бронза') return 'bg-orange-700/25 text-orange-100 ring-1 ring-orange-600/35'
  if (tierLabel === 'Критическое отставание' || tierLabel === 'Ниже нормы')
    return 'bg-red-600/25 text-red-100 ring-1 ring-red-500/40'
  return 'bg-zinc-700/80 text-zinc-300'
}

function NormRow({ item }) {
  const {
    hasResult,
    passedDisplay,
    critical,
    status,
    name,
    unit,
    resultValue,
    normGold,
    normSilver,
    normBronze,
    compareHint,
  } = item
  let { tierLabel } = item
  if (!tierLabel) {
    if (!hasResult) tierLabel = 'Результат не внесён'
    else if (status === 'gold') tierLabel = 'Золото'
    else if (status === 'silver') tierLabel = 'Серебро'
    else if (status === 'bronze') tierLabel = 'Бронза'
    else if (critical) tierLabel = 'Критическое отставание'
    else tierLabel = 'Ниже нормы'
  }
  let icon = <IconCircleEmpty className="h-6 w-6 shrink-0 text-zinc-600" />
  if (hasResult && passedDisplay) {
    if (status === 'gold') {
      icon = (
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center drop-shadow-[0_0_6px_rgba(251,191,36,0.55)]">
          <IconStarGold className="h-8 w-8 text-amber-400" />
        </span>
      )
    } else if (status === 'silver') {
      icon = (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center drop-shadow-[0_0_5px_rgba(148,163,184,0.45)]">
          <IconSilverMedal />
        </span>
      )
    } else if (status === 'bronze') {
      icon = (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center drop-shadow-[0_0_5px_rgba(180,83,9,0.4)]">
          <IconBronzeMedal />
        </span>
      )
    } else {
      icon = <IconCheck className="h-6 w-6 shrink-0 text-emerald-400" />
    }
  } else if (hasResult && critical) {
    icon = <IconCircleEmpty className="h-6 w-6 shrink-0 text-red-500/80" />
  }

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
        critical
          ? 'border-red-500/40 bg-red-950/30'
          : 'border-zinc-800/80 bg-zinc-900/40'
      }`}
    >
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${critical ? 'text-red-200' : 'text-zinc-200'}`}>{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tierChipClass(tierLabel)}`}>
            {tierLabel}
          </span>
        </div>
        {(hasResult || normGold != null) && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-zinc-800/80 bg-black/25 px-3 py-2 text-xs leading-relaxed text-zinc-300">
            {hasResult && resultValue != null && Number.isFinite(resultValue) && (
              <p>
                <span className="text-zinc-500">Результат спортсмена:</span>{' '}
                <span className="font-bold text-white">
                  {resultValue}
                  {unit ? ` ${unit}` : ''}
                </span>
              </p>
            )}
            {normGold != null && Number.isFinite(normGold) && (
              <p>
                <span className="text-amber-400/90">Норма «золото»:</span>{' '}
                <span className="font-bold text-amber-100">
                  {normGold}
                  {unit ? ` ${unit}` : ''}
                </span>
                {compareHint ? <span className="block pt-0.5 text-[11px] text-zinc-500">{compareHint}</span> : null}
              </p>
            )}
            {normSilver != null && Number.isFinite(normSilver) && (
              <p>
                <span className="text-slate-400">Норма «серебро»:</span>{' '}
                <span className="font-semibold text-slate-200">
                  {normSilver}
                  {unit ? ` ${unit}` : ''}
                </span>
              </p>
            )}
            {normBronze != null && Number.isFinite(normBronze) && (
              <p>
                <span className="text-orange-400/80">Норма «бронза»:</span>{' '}
                <span className="font-semibold text-orange-100">
                  {normBronze}
                  {unit ? ` ${unit}` : ''}
                </span>
              </p>
            )}
          </div>
        )}
        {critical && (
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-400">Требует внимания</p>
        )}
      </div>
    </li>
  )
}

function atomLevelPillClass(levelKey) {
  if (levelKey === 'AUTOMATED') return 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/35'
  if (levelKey === 'MOTOR_SKILL_LEVEL_2') return 'bg-emerald-600/25 text-emerald-200 ring-1 ring-emerald-500/30'
  if (levelKey === 'MOTOR_SKILL_LEVEL_1') return 'bg-teal-700/30 text-teal-100 ring-1 ring-teal-500/25'
  if (levelKey === 'KNOWLEDGE') return 'bg-sky-900/40 text-sky-200 ring-1 ring-sky-600/30'
  return 'bg-zinc-700 text-zinc-300'
}

function AtomRow({ atom }) {
  const label = atom.levelLabel ?? atom.statusLabel ?? '—'
  const key = atom.levelKey ?? ''
  const pct =
    atom.levelPercent != null && Number.isFinite(Number(atom.levelPercent))
      ? Number(atom.levelPercent)
      : technicalLevelInterpolationPercent(key)
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <span className="text-sm text-zinc-200">
          <span className="text-zinc-500">#{atom.number}</span> {atom.name}
        </span>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-700 to-cyan-400 transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-zinc-500">{pct}%</span>
        </div>
      </div>
      <span
        className={`shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-auto ${atomLevelPillClass(key)}`}
      >
        {label}
      </span>
    </li>
  )
}

function WeightLineChart({ points }) {
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
      <div className="flex h-52 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/50 text-sm text-zinc-500">
        Пока нет записей веса для графика — тренер добавит измерения при сохранении карточки.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto max-w-full text-emerald-400/90">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        {pathData.d && (
          <path
            d={pathData.d}
            fill="none"
            stroke="url(#lg)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {pathData.circles.map((c) => (
          <circle key={`${c.date}-${c.weight}`} cx={c.x} cy={c.y} r="5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        {sorted.map((p) => (
          <span key={`${p.date}-${p.weight}`}>
            {p.date}: <span className="font-semibold text-zinc-300">{p.weight} кг</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ShareProgressPage() {
  const { student_hash: token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState(null)
  const [animateTanks, setAnimateTanks] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getPublicStudentShareByToken(token)
        if (cancelled) return
        if (!data?.payload) {
          setError('Ссылка недействительна или страница ещё не создана тренером.')
          setDoc(null)
        } else {
          setDoc(data)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          if (e?.code === 'permission-denied') {
            setError(
              'Нет доступа к данным: в Firebase Console опубликуйте правила Firestore из файла firestore.rules (раздел public_student_shares, чтение get для гостей).',
            )
          } else {
            setError('Не удалось загрузить данные. Проверьте интернет.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!doc?.payload || loading) return undefined
    const t = window.setTimeout(() => setAnimateTanks(true), 120)
    return () => window.clearTimeout(t)
  }, [doc, loading])

  const p = doc?.payload

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:px-6">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500/90">Cartel Boxing</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Прогресс спортсмена</h1>
          <p className="mt-2 text-sm text-zinc-500">Страница для родителей и атлета. Внутренние оценки тренера здесь не показываются.</p>
        </header>

        {loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-20 text-center text-zinc-400">Загрузка…</div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/40 px-5 py-6 text-center text-red-200">{error}</div>
        )}

        {!loading && p && (
          <div className="space-y-12">
            <section className="rounded-3xl border border-zinc-700/60 bg-zinc-900/40 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-zinc-800 ring-4 ring-emerald-500/10">
                  {p.photoURL ? (
                    <img src={p.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-zinc-600">
                      {String(p.displayName || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">{p.displayName}</h2>
                  <p className="mt-3 text-lg text-zinc-300">
                    Текущий вес:{' '}
                    <span className="font-semibold text-emerald-400">
                      {p.currentWeight > 0 ? `${p.currentWeight} кг` : '—'}
                    </span>
                  </p>
                </div>
              </div>

              {p.context && (
                <div className="mt-6 rounded-2xl border border-cyan-900/40 bg-cyan-950/25 p-4 text-left">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">
                    С кем сравниваем по таблице программы
                  </h3>
                  <p className="mt-2 text-sm text-zinc-200">
                    <span className="text-zinc-500">Весовая категория:</span>{' '}
                    <span className="font-semibold text-white">{p.context.weightCategoryLabel}</span>
                  </p>
                  <p className="mt-2 text-sm text-zinc-200">
                    <span className="text-zinc-500">Рост «идеального бойца» по нашей базе:</span>{' '}
                    <span className="font-semibold text-white">{p.context.idealHeightLine}</span>
                  </p>
                  {p.context.typageHint ? (
                    <p className="mt-2 text-sm text-zinc-300">
                      <span className="text-zinc-500">Образ по таблице:</span> {p.context.typageHint}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">{p.context.note}</p>
                </div>
              )}

              <div className="mt-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Динамика веса</h3>
                <WeightLineChart points={p.weightHistory || []} />
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Шкалы прогресса</h2>
              <div className="space-y-5">
                <FuelTank
                  label="Физическое развитие"
                  subtitle={`${p.physical?.filled ?? 0} из ${p.physical?.total ?? 0} тестов с результатом`}
                  pct={p.physical?.fillPct ?? 0}
                  delayMs={0}
                  animate={animateTanks}
                  fillCaption="Доля тестов, где тренер вписал результат (не оценка «золото»)."
                />
                <ul className="space-y-2">
                  {(p.physical?.items ?? []).length === 0 ? (
                    <li className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-500">
                      Список силовых нормативов пуст. Тренеру: откройте карточку при рабочем интернете и снова нажмите
                      «Поделиться прогрессом» или сохраните карточку — подтянутся таблицы и результаты из базы.
                    </li>
                  ) : (
                    (p.physical?.items ?? []).map((item) => <NormRow key={item.id} item={item} />)
                  )}
                </ul>

                <FuelTank
                  label="Функциональная база"
                  subtitle={`${p.functional?.filled ?? 0} из ${p.functional?.total ?? 0} тестов с результатом`}
                  pct={p.functional?.fillPct ?? 0}
                  delayMs={120}
                  animate={animateTanks}
                  fillCaption="Доля тестов, где тренер вписал результат (не оценка «золото»)."
                />
                <ul className="space-y-2">
                  {(p.functional?.items ?? []).length === 0 ? (
                    <li className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-500">
                      Список функциональных нормативов пуст. Попросите тренера обновить публичную ссылку после
                      сохранения карточки при подключённом интернете.
                    </li>
                  ) : (
                    (p.functional?.items ?? []).map((item) => <NormRow key={item.id} item={item} />)
                  )}
                </ul>

                <FuelTank
                  label="Технический арсенал"
                  subtitle={`Среднее по ${p.technical?.total ?? 0} элементам: не изучен 0% · знание 15% · умение 40% · навык 75% · автоматизм 100%`}
                  pct={p.technical?.fillPct ?? 0}
                  delayMs={240}
                  animate={animateTanks}
                  fillCaption="Шкала — средний процент освоения по всем элементам (интерполяция по уровню каждого)."
                />
                <p className="text-xs text-zinc-500">Удары и элементы программы — статусы по занятиям.</p>
                <ul className="space-y-2">
                  {(p.technical?.atoms ?? []).length === 0 ? (
                    <li className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-500">
                      Список техники ещё не подгрузился у тренера — попросите обновить ссылку после сохранения
                      карточки.
                    </li>
                  ) : (
                    (p.technical?.atoms ?? []).map((atom) => <AtomRow key={atom.id} atom={atom} />)
                  )}
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-600/30 bg-gradient-to-br from-emerald-950/80 to-zinc-950 p-6 text-center shadow-lg shadow-emerald-950/40 sm:p-8">
              <p className="text-lg font-semibold text-emerald-100">
                Твоя цель — заполнить все шкалы на 100%!
              </p>
              <p className="mt-3 text-sm text-emerald-200/80">
                Следующая аттестация:{' '}
                <span className="font-semibold text-white">
                  {p.nextAttestationDate
                    ? new Date(p.nextAttestationDate + 'T12:00:00').toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'дата уточняется у тренера'}
                </span>
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
