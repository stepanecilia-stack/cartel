import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { prewarmTranscribeAuth } from '../services/coachVoiceTranscribe.js'

const MAX_RECORD_MS = 90_000
const MIN_SEND_MS = 200
const MIN_BLOB_BYTES = 64
const ARMING_WAIT_MS = 2_500
export const CANCEL_SLIDE_PX = 80
export const LOCK_SLIDE_PX = 80

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

function waitMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function formatRecordTimer(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** @param {{ audioUrl?: string } | null | undefined} draft */
function revokeDraftUrl(draft) {
  if (draft?.audioUrl?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(draft.audioUrl)
    } catch {
      /* ignore */
    }
  }
}

/**
 * Telegram-style voice: hold → record, slide ↑ lock, slide ← cancel,
 * release → preview, play → send.
 */
export function useCoachVoiceRecorder() {
  const [phase, setPhase] = useState(
    /** @type {'idle' | 'recording' | 'preview' | 'processing'} */ ('idle'),
  )
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [levels, setLevels] = useState(() => Array.from({ length: 20 }, () => 0.18))
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(
    /** @type {{ blob: Blob, durationSec: number, audioUrl: string, browserTranscript: string } | null} */ (null),
  )
  const [, bumpGesture] = useReducer((n) => n + 1, 0)

  const gestureRef = useRef({
    slideX: 0,
    slideY: 0,
    pointerX: 0,
    pointerY: 0,
  })
  const gestureRafRef = useRef(/** @type {number | null} */ (null))

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
  const cancelOnReleaseRef = useRef(false)
  const lockedRef = useRef(false)
  const lockPendingRef = useRef(false)
  const originXRef = useRef(0)
  const originYRef = useRef(0)
  /** @type {import('react').MutableRefObject<((value: unknown) => void) | null>} */
  const stopResolveRef = useRef(null)
  const armingTokenRef = useRef(0)
  const recordingActiveRef = useRef(false)
  const browserTranscriptRef = useRef('')
  const speechRecognitionRef = useRef(/** @type {InstanceType<NonNullable<ReturnType<typeof getSpeechRecognitionCtor>>> | null} */ (null))
  const meterLastPaintRef = useRef(0)

  const scheduleGestureRender = useCallback(() => {
    if (gestureRafRef.current != null) return
    gestureRafRef.current = requestAnimationFrame(() => {
      gestureRafRef.current = null
      bumpGesture()
    })
  }, [])

  const stopSpeechRecognition = useCallback(() => {
    const recognition = speechRecognitionRef.current
    speechRecognitionRef.current = null
    if (!recognition) return
    try {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
    } catch {
      try {
        recognition.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const startSpeechRecognition = useCallback(() => {
    stopSpeechRecognition()
    browserTranscriptRef.current = ''
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    try {
      const recognition = new Ctor()
      recognition.lang = 'ru-RU'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.onresult = (event) => {
        let text = ''
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0]?.transcript ?? ''
        }
        browserTranscriptRef.current = text.trim()
      }
      recognition.onerror = () => {
        /* cloud fallback */
      }
      recognition.onend = () => {
        if (speechRecognitionRef.current === recognition && recordingActiveRef.current) {
          try {
            recognition.start()
          } catch {
            /* ignore */
          }
        }
      }
      speechRecognitionRef.current = recognition
      recognition.start()
    } catch {
      speechRecognitionRef.current = null
    }
  }, [stopSpeechRecognition])

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    analyserRef.current = null
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
    stopSpeechRecognition()
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
  }, [releaseActiveStream, stopMeter, stopSpeechRecognition])

  const resetGesture = useCallback(() => {
    gestureRef.current = { slideX: 0, slideY: 0, pointerX: 0, pointerY: 0 }
    scheduleGestureRender()
  }, [scheduleGestureRender])

  const activateLock = useCallback(() => {
    if (lockedRef.current) return
    lockedRef.current = true
    lockPendingRef.current = false
    holdActiveRef.current = false
    cancelOnReleaseRef.current = false
    setIsLocked(true)
    gestureRef.current = {
      ...gestureRef.current,
      slideX: 0,
      slideY: LOCK_SLIDE_PX,
    }
    scheduleGestureRender()
  }, [scheduleGestureRender])

  const resetRecordingUi = useCallback(() => {
    resetGesture()
    holdActiveRef.current = false
    cancelOnReleaseRef.current = false
    lockedRef.current = false
    lockPendingRef.current = false
    recordingActiveRef.current = false
    setIsLocked(false)
    setLevels(Array.from({ length: 20 }, () => 0.18))
  }, [resetGesture])

  const discardDraft = useCallback(() => {
    setDraft((prev) => {
      revokeDraftUrl(prev)
      return null
    })
  }, [])

  const resetAll = useCallback(() => {
    setPhase('idle')
    setElapsedMs(0)
    resetRecordingUi()
    discardDraft()
    chunksRef.current = []
  }, [discardDraft, resetRecordingUi])

  const cancelRecording = useCallback(() => {
    armingTokenRef.current += 1
    cleanupRecorder()
    stopResolveRef.current = null
    chunksRef.current = []
    resetAll()
    setError('')
  }, [cleanupRecorder, resetAll])

  const acquireStream = useCallback(async () => {
    if (warmStreamRef.current?.active) return warmStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
      },
    })
    warmStreamRef.current = stream
    return stream
  }, [])

  const startMeter = useCallback((stream) => {
    try {
      let ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioContext()
        audioCtxRef.current = ctx
      }
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {})
      }
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 32
      source.connect(analyser)
      analyserRef.current = analyser
      const bins = new Uint8Array(analyser.frequencyBinCount)
      const barCount = 20

      const tick = (now) => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(bins)
        if (now - meterLastPaintRef.current >= 90) {
          meterLastPaintRef.current = now
          const next = []
          for (let i = 0; i < barCount; i += 1) {
            const idx = Math.floor((i / barCount) * bins.length)
            const v = bins[idx] / 255
            next.push(0.12 + v * 0.88)
          }
          setLevels(next)
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      meterLastPaintRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      /* meter optional */
    }
  }, [])

  const finishStopToPreview = useCallback(
    (resolve) => {
      const blob = new Blob(chunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || pickRecorderMimeType() || 'audio/webm',
      })
      const durationMs = Date.now() - startedAtRef.current
      const browserTranscript = browserTranscriptRef.current.trim()
      cleanupRecorder()
      resetRecordingUi()
      chunksRef.current = []

      const hasTranscript = browserTranscript.length >= 2
      const tooBrief = durationMs < MIN_SEND_MS && !hasTranscript
      const emptyAudio = blob.size < MIN_BLOB_BYTES && !hasTranscript
      if (tooBrief || emptyAudio) {
        setPhase('idle')
        setElapsedMs(0)
        setError('Запись слишком короткая. Удерживайте микрофон чуть дольше.')
        browserTranscriptRef.current = ''
        resolve?.(null)
        return
      }

      const durationSec = Math.max(1, Math.round(durationMs / 1000))
      const audioUrl = URL.createObjectURL(blob)
      const nextDraft = {
        blob,
        durationSec,
        audioUrl,
        browserTranscript,
      }
      browserTranscriptRef.current = ''
      setDraft((prev) => {
        revokeDraftUrl(prev)
        return nextDraft
      })
      setElapsedMs(durationMs)
      setPhase('preview')
      resolve?.(nextDraft)
    },
    [cleanupRecorder, resetRecordingUi],
  )

  const stopToPreview = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recordingActiveRef.current || !recorder || recorder.state === 'inactive') {
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      stopResolveRef.current = resolve
      try {
        const recorder = mediaRecorderRef.current
        if (recorder?.state === 'recording') {
          try {
            recorder.requestData()
          } catch {
            /* ignore */
          }
        }
        recorder?.stop()
      } catch {
        finishStopToPreview(resolve)
      }
    })
  }, [finishStopToPreview])

  const beginRecordingWithStream = useCallback(
    (stream, token) => {
      if (token !== armingTokenRef.current) return false

      discardDraft()
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
        finishStopToPreview(resolve)
      }

      startedAtRef.current = Date.now()
      recordingActiveRef.current = true
      setElapsedMs(0)
      setPhase('recording')
      if (lockPendingRef.current) activateLock()
      recorder.start(200)
      startSpeechRecognition()
      prewarmTranscribeAuth()
      startMeter(stream)

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current)
      }, 50)

      maxTimerRef.current = setTimeout(() => {
        void stopToPreview()
      }, MAX_RECORD_MS)

      return true
    },
    [activateLock, discardDraft, finishStopToPreview, startMeter, startSpeechRecognition, stopToPreview],
  )

  const holdStart = useCallback(
    async (clientX, clientY) => {
      if (phase !== 'idle' || !isCoachVoiceInputSupported()) return
      setError('')
      holdActiveRef.current = true
      cancelOnReleaseRef.current = false
      lockedRef.current = false
      lockPendingRef.current = false
      setIsLocked(false)
      originXRef.current = clientX
      originYRef.current = clientY
      gestureRef.current = { slideX: 0, slideY: 0, pointerX: clientX, pointerY: clientY }
      scheduleGestureRender()
      setPhase('recording')
      setElapsedMs(0)

      const token = ++armingTokenRef.current
      try {
        const stream = await acquireStream()
        if (token !== armingTokenRef.current) return
        beginRecordingWithStream(stream, token)
      } catch (err) {
        console.error(err)
        cancelRecording()
        setError('Нет доступа к микрофону. Разрешите запись в настройках браузера.')
      }
    },
    [phase, acquireStream, beginRecordingWithStream, cancelRecording, scheduleGestureRender],
  )

  const holdMove = useCallback(
    (clientX, clientY) => {
      if (lockedRef.current) return
      if (!holdActiveRef.current) return
      if (phase !== 'recording') return

      const deltaX = Math.min(0, clientX - originXRef.current)
      const deltaY = Math.max(0, originYRef.current - clientY)
      gestureRef.current = {
        slideX: deltaX,
        slideY: Math.min(LOCK_SLIDE_PX, deltaY),
        pointerX: clientX,
        pointerY: clientY,
      }
      cancelOnReleaseRef.current = deltaX <= -CANCEL_SLIDE_PX
      scheduleGestureRender()

      if (deltaY >= LOCK_SLIDE_PX) {
        if (recordingActiveRef.current) {
          activateLock()
        } else {
          lockPendingRef.current = true
        }
      }
    },
    [activateLock, phase, scheduleGestureRender],
  )

  const waitForRecordingStart = useCallback(async () => {
    const step = 40
    for (let waited = 0; waited < ARMING_WAIT_MS; waited += step) {
      if (recordingActiveRef.current) return true
      await waitMs(step)
    }
    return recordingActiveRef.current
  }, [])

  const ensureMinRecordDuration = useCallback(async () => {
    if (!recordingActiveRef.current) return
    const elapsed = Date.now() - startedAtRef.current
    if (elapsed < MIN_SEND_MS) {
      await waitMs(MIN_SEND_MS - elapsed)
    }
  }, [])

  const holdEnd = useCallback(async () => {
    if (lockedRef.current) {
      holdActiveRef.current = false
      return null
    }

    const wasCancel = cancelOnReleaseRef.current
    holdActiveRef.current = false

    if (wasCancel) {
      cancelRecording()
      return null
    }

    if (!recordingActiveRef.current) {
      const started = await waitForRecordingStart()
      if (!started) {
        cancelRecording()
        return null
      }
    }

    await ensureMinRecordDuration()
    return stopToPreview()
  }, [cancelRecording, ensureMinRecordDuration, stopToPreview, waitForRecordingStart])

  const finishRecording = useCallback(() => stopToPreview(), [stopToPreview])

  const beginSend = useCallback(() => {
    if (phase !== 'preview' || !draft) return null
    setPhase('processing')
    return draft
  }, [phase, draft])

  const completeSend = useCallback(() => {
    resetAll()
  }, [resetAll])

  const discardPreview = useCallback(() => {
    cleanupRecorder()
    stopResolveRef.current = null
    chunksRef.current = []
    resetAll()
    setError('')
  }, [cleanupRecorder, resetAll])

  useEffect(() => {
    if (!isCoachVoiceInputSupported()) return undefined
    prewarmTranscribeAuth()
    acquireStream().catch(() => {})
    return () => {
      cleanupRecorder()
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      warmStreamRef.current?.getTracks().forEach((track) => track.stop())
      warmStreamRef.current = null
      setDraft((prev) => {
        revokeDraftUrl(prev)
        return null
      })
    }
  }, [acquireStream, cleanupRecorder])

  const gesture = gestureRef.current
  const previewDurationLabel = draft ? `${draft.durationSec} сек` : formatRecordTimer(elapsedMs)

  return {
    phase,
    draft,
    elapsedLabel: formatRecordTimer(elapsedMs),
    previewDurationLabel,
    gesture,
    slidePx: gesture.slideX,
    slideUpPx: gesture.slideY,
    isLocked,
    isLockedActive: () => lockedRef.current,
    lockPending: gesture.slideY >= LOCK_SLIDE_PX * 0.65 && !lockedRef.current,
    cancelPending: gesture.slideX <= -CANCEL_SLIDE_PX * 0.55,
    levels,
    error,
    isSupported: isCoachVoiceInputSupported(),
    holdStart,
    holdMove,
    holdEnd,
    finishRecording,
    beginSend,
    completeSend,
    cancelRecording,
    discardPreview,
    clearError: () => setError(''),
  }
}
