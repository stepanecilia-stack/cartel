import { useEffect, useRef, useState } from 'react'
import {
  pauseWebmPreview,
  tryPlayWebmPreview,
  unregisterWebmPreview,
} from '../utils/webmPreviewPlayback.js'

/**
 * WebM-превью: грузится и играет только в зоне видимости, с лимитом одновременных декодеров.
 * @param {{
 *   src: string,
 *   className?: string,
 *   priority?: 'high' | 'normal',
 *   alwaysPlay?: boolean,
 *   intersectionRoot?: Element | null,
 * }} props
 */
export default function LoopingWebmPreview({
  src,
  className = '',
  priority = 'normal',
  alwaysPlay = false,
  intersectionRoot = null,
}) {
  const videoRef = useRef(null)
  const [inView, setInView] = useState(alwaysPlay)
  const [loadedSrc, setLoadedSrc] = useState(alwaysPlay ? src : '')

  useEffect(() => {
    if (alwaysPlay) {
      setInView(true)
      setLoadedSrc(src)
      return undefined
    }

    const node = videoRef.current?.parentElement ?? videoRef.current
    if (!node || !src) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      {
        root: intersectionRoot,
        rootMargin: '48px',
        threshold: 0.12,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [src, alwaysPlay, intersectionRoot])

  useEffect(() => {
    if (inView && src) setLoadedSrc(src)
  }, [inView, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !loadedSrc) return undefined

    const shouldPlay = alwaysPlay || inView
    if (shouldPlay) {
      void tryPlayWebmPreview(video, priority)
    } else {
      pauseWebmPreview(video)
    }

    return () => unregisterWebmPreview(video)
  }, [loadedSrc, inView, alwaysPlay, priority])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const video = videoRef.current
      if (!video || !loadedSrc || (!alwaysPlay && !inView)) return
      void tryPlayWebmPreview(video, priority)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadedSrc, inView, alwaysPlay, priority])

  return (
    <video
      ref={videoRef}
      src={loadedSrc || undefined}
      className={`h-full w-full object-cover bg-[#0f0f0f] ${className}`}
      muted
      playsInline
      loop
      preload={loadedSrc ? 'metadata' : 'none'}
      disablePictureInPicture
      aria-hidden
    />
  )
}
