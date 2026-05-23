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
    return subscribeGroupTrainingSession(sync)
  }, [coachId])

  return session
}
