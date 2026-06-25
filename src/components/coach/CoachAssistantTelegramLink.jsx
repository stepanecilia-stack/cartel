import { useCallback, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { ensureDb } from '../../services/firebaseService.js'
import {
  createTelegramCoachLink,
  setupTelegramCoachWebhook,
} from '../../services/telegramCoachLinkService.js'
import { vk } from '../../utils/vkUi.js'

const BOT_USERNAME = 'CartelCoachBot'
const DEFAULT_WEBHOOK_URL =
  'https://europe-west1-cartel-academy.cloudfunctions.net/telegramCoachWebhook'
const WEBHOOK_URL = String(import.meta.env.VITE_TELEGRAM_WEBHOOK_URL ?? DEFAULT_WEBHOOK_URL).trim()

/**
 * @param {{ coachId: string | undefined }} props
 */
export default function CoachAssistantTelegramLink({ coachId }) {
  const [linked, setLinked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    if (!coachId) {
      setLinked(false)
      return undefined
    }
    const ref = doc(ensureDb(), 'coaches', coachId, 'integrations', 'telegram')
    return onSnapshot(
      ref,
      (snap) => {
        setLinked(snap.exists() && Boolean(snap.data()?.telegramUserId))
      },
      () => setLinked(false),
    )
  }, [coachId])

  const connect = useCallback(async () => {
    if (!coachId) return
    setBusy(true)
    setError('')
    try {
      const { url } = await createTelegramCoachLink()
      setLinkUrl(url)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Не удалось создать ссылку')
    } finally {
      setBusy(false)
    }
  }, [coachId])

  const activateWebhook = useCallback(async () => {
    if (!WEBHOOK_URL) {
      setError('Задайте VITE_TELEGRAM_WEBHOOK_URL в .env.local (URL функции telegramCoachWebhook после деплоя).')
      return
    }
    setBusy(true)
    setError('')
    try {
      await setupTelegramCoachWebhook(WEBHOOK_URL)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Не удалось активировать webhook')
    } finally {
      setBusy(false)
    }
  }, [])

  if (!coachId) return null

  return (
    <div className="rounded-lg border border-[#e7e8ec] bg-[#fafbfc] px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-[#2c2d2e]">Telegram</span>
        {linked ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            @{BOT_USERNAME} подключён
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void connect()}
            className={`${vk.btnSecondary} px-2 py-1 text-[12px]`}
          >
            Подключить Telegram
          </button>
        )}
        {!linked && linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#5181b8] underline"
          >
            Открыть бота снова
          </a>
        ) : null}
        {WEBHOOK_URL && !linked ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void activateWebhook()}
            className={`${vk.btnSecondary} px-2 py-1 text-[11px]`}
          >
            Активировать бота
          </button>
        ) : null}
      </div>
      <p className={`${vk.mutedXs} mt-1`}>
        Умный помощник: голос/текст; запись нормативов и техники — с подтверждением.
      </p>
      {error ? <p className={`${vk.error} mt-1 text-[12px]`}>{error}</p> : null}
    </div>
  )
}
