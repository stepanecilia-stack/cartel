import { useEffect, useRef, useState } from 'react'

/**
 * Элемент в зоне видимости (с запасом rootMargin для чуть раньше подгрузки).
 * @param {{ rootMargin?: string, threshold?: number, enabled?: boolean }} [options]
 */
export function useInView(options = {}) {
  const { rootMargin = '100px 0px', threshold = 0.02, enabled = true } = options
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setInView(true)
      return undefined
    }
    const el = ref.current
    if (!el) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      { root: null, rootMargin, threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold, enabled])

  return { ref, inView }
}
