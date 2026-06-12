import { useEffect, useState } from 'react'
import {
  getGroupTrainingSession,
  subscribeGroupTrainingSession,
} from '../utils/groupTrainingSession.js'

/**
 * @param {string | undefined | null} coachId
 */
export function useGroupTrainingSession(coachId) {
  const [session, setSession] = useState(() => getGroupTrainingSession(coachId))

  useEffect(() => {
    const sync = () => setSession(getGroupTrainingSession(coachId))
    sync()
    return subscribeGroupTrainingSession(coachId, sync)
  }, [coachId])

  return session
}
