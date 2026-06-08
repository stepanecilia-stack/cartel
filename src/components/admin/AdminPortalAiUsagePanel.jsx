import { useEffect, useState } from 'react'
import { subscribePortalAiUsageStats } from '../../services/portalAiUsageService.js'
import {
  formatPortalAiRub,
  formatPortalAiUsd,
  formatTokenCount,
  PORTAL_AI_INPUT_USD_PER_M,
  PORTAL_AI_OUTPUT_USD_PER_M,
} from '../../utils/portalAiPricing.js'
import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   title: string,
 *   stats: import('../../utils/portalAiUsageStats.js').PortalAiUsageStats,
 *   subtitle?: string,
 * }} props
 */
function UsageCard({ title, stats, subtitle = '' }) {
  return (
    <div className={`${vk.card} space-y-2 border border-[#e7e8ec] p-3`}>
      <div>
        <p className="text-[14px] font-semibold text-[#2c2d2e]">{title}</p>
        {subtitle ? <p className={vk.mutedXs}>{subtitle}</p> : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
        <div>
          <dt className="text-[#818c99]">Input</dt>
          <dd className="font-medium tabular-nums text-[#2c2d2e]">{formatTokenCount(stats.inputTokens)}</dd>
        </div>
        <div>
          <dt className="text-[#818c99]">Output</dt>
          <dd className="font-medium tabular-nums text-[#2c2d2e]">{formatTokenCount(stats.outputTokens)}</dd>
        </div>
        <div>
          <dt className="text-[#818c99]">Ответы чата</dt>
          <dd className="font-medium tabular-nums text-[#2c2d2e]">{formatTokenCount(stats.chatCalls)}</dd>
        </div>
        <div>
          <dt className="text-[#818c99]">Сохранения памяти</dt>
          <dd className="font-medium tabular-nums text-[#2c2d2e]">{formatTokenCount(stats.memoryCalls)}</dd>
        </div>
      </dl>
      <p className="text-[15px] font-bold text-[#2d81e0]">
        {formatPortalAiUsd(stats.estimatedUsd)}{' '}
        <span className="text-[13px] font-semibold text-[#818c99]">≈ {formatPortalAiRub(stats.estimatedUsd)}</span>
      </p>
    </div>
  )
}

export default function AdminPortalAiUsagePanel() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    try {
      return subscribePortalAiUsageStats((next) => setStats(next))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось подписаться на статистику')
      return undefined
    }
  }, [])

  if (error) {
    return <p className={vk.error}>{error}</p>
  }

  if (!stats) {
    return <p className={vk.muted}>Загрузка счётчиков AI…</p>
  }

  const monthLabel = stats.monthKey.replace('-', '.')

  return (
    <div className="space-y-3">
      <p className={vk.muted}>
        Счётчики обновляются автоматически после каждого ответа виртуального тренера и сохранения памяти ученика.
        Оценка стоимости — по тарифу Vertex AI Gemini 2.5 Flash (${PORTAL_AI_INPUT_USD_PER_M} input / $
        {PORTAL_AI_OUTPUT_USD_PER_M} output за 1M токенов).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <UsageCard title={`Текущий месяц (${monthLabel})`} stats={stats.month} />
        <UsageCard title="За всё время" stats={stats.totals} />
      </div>

      <div className={`${vk.cardFlat} space-y-1.5 rounded-[10px] border border-[#e7e8ec] px-3 py-2.5`}>
        <p className="text-[13px] font-semibold text-[#2c2d2e]">Где ещё смотреть расходы</p>
        <ul className={`${vk.mutedXs} list-disc space-y-1 pl-4`}>
          <li>
            В этом приложении: <strong className="text-[#2c2d2e]">Администрирование → AI тренеры</strong> (эта
            страница).
          </li>
          <li>
            Официальный счёт Google Cloud:{' '}
            <a
              href="https://console.cloud.google.com/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2d81e0] underline"
            >
              Billing → Reports
            </a>{' '}
            (фильтр: Vertex AI / SKU Generative AI).
          </li>
          <li>
            Firebase Console → Usage and billing (общий Blaze, без разбивки по чату).
          </li>
        </ul>
      </div>

      {stats.totals.chatCalls === 0 && stats.totals.memoryCalls === 0 ? (
        <p className={`${vk.mutedXs} rounded-lg bg-[#fafbfc] px-2.5 py-2`}>
          Пока нет данных — напишите тренеру в кабинете ученика, счётчики появятся после первого ответа Gemini.
        </p>
      ) : null}
    </div>
  )
}
