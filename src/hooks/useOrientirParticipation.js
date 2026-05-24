import { useEffect, useState } from 'react'
import { subscribeOrientirParticipation } from '../services/orientirParticipationService.js'

/**
 * @param {string | null | undefined} coachId
 */
export function useOrientirParticipation(coachId) {
  const [participations, setParticipations] = useState(
    /** @type {import('../utils/orientirParticipation.js').OrientirParticipation[]} */ ([]),
  )
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!coachId) {
      setParticipations([])
      setReady(true)
      setError('')
      return undefined
    }
    setReady(false)
    setError('')
    const unsub = subscribeOrientirParticipation(
      coachId,
      (list) => {
        setParticipations(list)
        setReady(true)
      },
      (err) => {
        const msg =
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Не удалось загрузить участников ориентиров.'
        setError(msg)
        setReady(true)
      },
    )
    return () => unsub()
  }, [coachId])

  return { participations, ready, error }
}
