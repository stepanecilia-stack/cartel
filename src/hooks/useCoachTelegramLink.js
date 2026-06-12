import { useCallback, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { ensureDb } from '../services/firebaseService.js'
import { createTelegramCoachLink } from '../services/telegramCoachLinkService.js'

export const COACH_TELEGRAM_BOT_URL = 'https://t.me/CartelCoachBot'

/**
 * @param {string | undefined} coachId
 */
export function useCoachTelegramLink(coachId) {
  const [linked, setLinked] = useState(false)
  const [busy, setBusy] = useState(false)

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
    if (!coachId || busy) return
    setBusy(true)
    try {
      const { url } = await createTelegramCoachLink()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }, [coachId, busy])

  return { linked, busy, connect, botUrl: COACH_TELEGRAM_BOT_URL }
}
