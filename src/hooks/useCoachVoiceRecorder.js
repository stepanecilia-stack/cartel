import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_RECORD_MS = 90_000
const MIN_SEND_MS = 350
const CANCEL_SLIDE_PX = 72
/**
 * @returns {typeof SpeechRecognition | null}
 */
export function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null
  // @ts-expect-error vendor prefix
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function isCoachVoiceInputSupported() {
  if (typeof navigator === 'undefined') return false
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function formatRecordTimer(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Telegram-style: удержание → запись, отпускание → отправка; свайп влево → отмена; короткий тап → фиксация.
 */
export function useCoachVoiceRecorder() {
  const [phase, setPhase] = useState(
    /** @type {'idle' | 'arming' | 'recording' | 'locked' | 'processing'} */ ('idle'),
  )
  const [elapsedMs, setElapsedMs] = useState(0)
  const [slidePx, setSlidePx] = useState(0)
  const [levels, setLevels] = useState(() => [0.2, 0.35, 0.5, 0.35, 0.2])
  const [error, setError] = useState('')

  const warmStreamRef = useRef(/** @type {MediaStream | null} */ (null))
  const mediaRecorderRef = useRef(/** @type {MediaRecorder | null} */ (null))
  const activeStreamRef = useRef(/** @type {MediaStream | null} */ (null))
  const chunksRef = useRef(/** @type {BlobPart[]} */ ([]))
  const timerRef = useRef(/** @type {ReturnType<typeof setInterval> | null} */ (null))
  const maxTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const rafRef = useRef(/** @type {number | null} */ (null))
  const analyserRef = useRef(/** @type {AnalyserNode | null} */ (null))
  const audioCtxRef = useRef(/** @type {AudioContext | null} */ (null))
  const startedAtRef = useRef(0)
  const holdActiveRef = useRef(false)
  const lockedRef = useRef(false)
  const cancelOnReleaseRef = useRef(false)
  const holdDownAtRef = useRef(0)
  const originXRef = useRef(0)
  /** @type {import('react').MutableRefObject<((value: { blob: Blob, durationSec: number, browserTranscript: string } | null) => void) | null>} */
  const stopResolveRef = useRef(null)
  const armingTokenRef = useRef(0)
  const recordingActiveRef = useRef(false)

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    analyserRef.current = null
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  const releaseActiveStream = useCallback(() => {
    if (activeStreamRef.current && activeStreamRef.current !== warmStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    activeStreamRef.current = null
  }, [])

  const cleanupRecorder = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    stopMeter()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null
    releaseActiveStream()
  }, [releaseActiveStream, stopMeter])

  const resetUi = useCallback(() => {
    setPhase('idle')
    setElapsedMs(0)
    setSlidePx(0)
    setLevels([0.2, 0.35, 0.5, 0.35, 0.2])
    holdActiveRef.current = false
    lockedRef.current = false
    cancelOnReleaseRef.current = false
    recordingActiveRef.current = false
  }, [])

  const cancelRecording = useCallback(() => {
    cleanupRecorder()
    stopResolveRef.current = null
    chunksRef.current = []
    resetUi()
    setError('')
  }, [cleanupRecorder, resetUi])

  const acquireStream = useCallback(async () => {
    if (warmStreamRef.current?.active) return warmStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    warmStreamRef.current = stream
    return stream
  }, [])

  const startMeter = useCallback((stream) => {
    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 32
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      const bins = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(bins)
        const slice = 5
        const next = []
        for (let i = 0; i < slice; i += 1) {
          const idx = Math.floor((i / slice) * bins.length)
          const v = bins[idx] / 255
          next.push(0.15 + v * 0.85)
        }
        setLevels(next)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      /* meter optional */
    }
  }, [])

  const finishStop = useCallback(
    (resolve) => {
      const blob = new Blob(chunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || pickRecorderMimeType() || 'audio/webm',
      })
      const durationMs = Date.now() - startedAtRef.current
      const durationSec = Math.max(1, Math.round(durationMs / 1000))
      cleanupRecorder()
      resetUi()
      if (durationMs < MIN_SEND_MS || blob.size < 400) {
        resolve?.(null)
        return
      }
      resolve?.({ blob, durationSec, browserTranscript: '' })
    },
    [cleanupRecorder, resetUi],
  )

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recordingActiveRef.current || !recorder || recorder.state === 'inactive') {
      return Promise.resolve(null)
    }
    setPhase('processing')
    return new Promise((resolve) => {
      stopResolveRef.current = resolve
      try {
        mediaRecorderRef.current?.stop()
      } catch {
        finishStop(resolve)
      }
    })
  }, [finishStop])

  const beginRecordingWithStream = useCallback(
    (stream, token) => {
      if (token !== armingTokenRef.current) return false
      if (!holdActiveRef.current && !lockedRef.current) return false

      activeStreamRef.current = stream
      chunksRef.current = []
      const mimeType = pickRecorderMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const resolve = stopResolveRef.current
        stopResolveRef.current = null
        finishStop(resolve)
      }

      startedAtRef.current = Date.now()
      recordingActiveRef.current = true
      setElapsedMs(0)
      setPhase(lockedRef.current ? 'locked' : 'recording')
      recorder.start(120)
      startMeter(stream)

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current)
      }, 100)

      maxTimerRef.current = setTimeout(() => {
        void stopRecording()
      }, MAX_RECORD_MS)

      return true
    },
    [finishStop, startMeter, stopRecording],
  )

  const holdStart = useCallback(
    async (clientX) => {
      if (phase !== 'idle' || !isCoachVoiceInputSupported()) return
      setError('')
      holdActiveRef.current = true
      lockedRef.current = false
      cancelOnReleaseRef.current = false
      holdDownAtRef.current = Date.now()
      originXRef.current = clientX
      setSlidePx(0)
      setPhase('arming')

      const token = ++armingTokenRef.current
      try {
        const stream = await acquireStream()
        if (!holdActiveRef.current && !lockedRef.current) return
        beginRecordingWithStream(stream, token)
      } catch (err) {
        console.error(err)
        cancelRecording()
        setError('Нет доступа к микрофону. Разрешите запись в настройках браузера.')
      }
    },
    [phase, acquireStream, beginRecordingWithStream, cancelRecording],
  )

  const holdMove = useCallback((clientX) => {
    if (!holdActiveRef.current || lockedRef.current) return
    if (phase !== 'arming' && phase !== 'recording') return
    const delta = Math.min(0, clientX - originXRef.current)
    setSlidePx(delta)
    cancelOnReleaseRef.current = delta < -CANCEL_SLIDE_PX
  }, [phase])

  const holdEnd = useCallback(async () => {
    if (lockedRef.current) {
      holdActiveRef.current = false
      return null
    }

    holdActiveRef.current = false

    if (cancelOnReleaseRef.current) {
      cancelRecording()
      return null
    }

    if (!recordingActiveRef.current) {
      cancelRecording()
      return null
    }

    return stopRecording()
  }, [cancelRecording, stopRecording])

  const lockRecording = useCallback(() => {
    if (phase !== 'recording') return
    holdActiveRef.current = false
    lockedRef.current = true
    setPhase('locked')
    setSlidePx(0)
    cancelOnReleaseRef.current = false
  }, [phase])

  useEffect(() => {
    if (!isCoachVoiceInputSupported()) return undefined
    acquireStream().catch(() => {})
    return () => {
      cleanupRecorder()
      warmStreamRef.current?.getTracks().forEach((track) => track.stop())
      warmStreamRef.current = null
    }
  }, [acquireStream, cleanupRecorder])

  return {
    phase,
    elapsedLabel: formatRecordTimer(elapsedMs),
    slidePx,
    levels,
    cancelPending: slidePx < -CANCEL_SLIDE_PX * 0.55,
    isLocked: phase === 'locked',
    error,
    isSupported: isCoachVoiceInputSupported(),
    holdStart,
    holdMove,
    holdEnd,
    lockRecording,
    stopRecording,
    cancelRecording,
    clearError: () => setError(''),
  }
}
