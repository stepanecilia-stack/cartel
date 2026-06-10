import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_RECORD_MS = 90_000

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

/**
 * @param {Blob} blob
 */
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
 * Запись голосового: MediaRecorder + параллельно Web Speech API (ru-RU).
 */
export function useCoachVoiceRecorder() {
  const [phase, setPhase] = useState(/** @type {'idle' | 'recording' | 'processing'} */ ('idle'))
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(/** @type {MediaRecorder | null} */ (null))
  const mediaStreamRef = useRef(/** @type {MediaStream | null} */ (null))
  const chunksRef = useRef(/** @type {BlobPart[]} */ ([]))
  const speechRef = useRef(/** @type {SpeechRecognition | null} */ (null))
  const speechPartsRef = useRef(/** @type {string[]} */ ([]))
  const timerRef = useRef(/** @type {ReturnType<typeof setInterval> | null} */ (null))
  const startedAtRef = useRef(0)
  const maxTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const stopResolveRef = useRef(/** @type {((value: { blob: Blob, durationSec: number, browserTranscript: string }) => void) | null} */ (null))

  const cleanupStreams = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    try {
      speechRef.current?.stop()
    } catch {
      /* ignore */
    }
    speechRef.current = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  useEffect(() => () => cleanupStreams(), [cleanupStreams])

  const cancelRecording = useCallback(() => {
    cleanupStreams()
    stopResolveRef.current = null
    chunksRef.current = []
    speechPartsRef.current = []
    setPhase('idle')
    setElapsedMs(0)
    setError('')
  }, [cleanupStreams])

  const stopRecording = useCallback(() => {
    if (phase !== 'recording') return Promise.resolve(null)
    setPhase('processing')
    return new Promise((resolve) => {
      stopResolveRef.current = resolve
      try {
        mediaRecorderRef.current?.stop()
      } catch {
        resolve(null)
      }
      try {
        speechRef.current?.stop()
      } catch {
        /* ignore */
      }
    })
  }, [phase])

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return
    if (!isCoachVoiceInputSupported()) {
      setError('Микрофон недоступен в этом браузере.')
      return
    }

    setError('')
    chunksRef.current = []
    speechPartsRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mimeType = pickRecorderMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        })
        const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        const browserTranscript = speechPartsRef.current.join(' ').trim()
        cleanupStreams()
        const resolve = stopResolveRef.current
        stopResolveRef.current = null
        setPhase('idle')
        setElapsedMs(0)
        resolve?.({ blob, durationSec, browserTranscript })
      }

      const SpeechRecognition = getSpeechRecognitionCtor()
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        speechRef.current = recognition
        recognition.lang = 'ru-RU'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i]
            if (!result?.isFinal) continue
            const piece = String(result[0]?.transcript ?? '').trim()
            if (piece) speechPartsRef.current.push(piece)
          }
        }
        recognition.onerror = () => {
          /* cloud fallback */
        }
        try {
          recognition.start()
        } catch {
          /* optional */
        }
      }

      startedAtRef.current = Date.now()
      setElapsedMs(0)
      setPhase('recording')
      recorder.start(250)

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current)
      }, 200)

      maxTimerRef.current = setTimeout(() => {
        void stopRecording()
      }, MAX_RECORD_MS)
    } catch (err) {
      cleanupStreams()
      setPhase('idle')
      console.error(err)
      setError('Нет доступа к микрофону. Разрешите запись в настройках браузера.')
    }
  }, [phase, cleanupStreams, stopRecording])

  return {
    phase,
    elapsedLabel: formatRecordTimer(elapsedMs),
    error,
    isSupported: isCoachVoiceInputSupported(),
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: () => setError(''),
  }
}
