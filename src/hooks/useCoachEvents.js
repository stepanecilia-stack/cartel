import { useEffect, useState } from 'react'
import { subscribeCoachEvents } from '../services/coachEventsService.js'

/**
 * @param {string | null | undefined} coachId
 */
export function useCoachEvents(coachId) {
  const [events, setEvents] = useState(/** @type {import('../utils/coachEvents.js').CoachEvent[]} */ ([]))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!coachId) {
      setEvents([])
      setReady(true)
      setError('')
      return undefined
    }
    setReady(false)
    setError('')
    const unsub = subscribeCoachEvents(
      coachId,
      (list) => {
        setEvents(list)
        setReady(true)
      },
      (err) => {
        const msg =
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Не удалось загрузить календарь событий.'
        setError(msg)
        setReady(true)
      },
    )
    return () => unsub()
  }, [coachId])

  return { events, ready, error }
}
