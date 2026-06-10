import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import StudentPersonaAvatar from '../student/StudentPersonaAvatar.jsx'
import CoachAssistantNormConfirmCard from './CoachAssistantNormConfirmCard.jsx'
import CoachAssistantVoiceBubble from './CoachAssistantVoiceBubble.jsx'
import CoachAssistantVoiceRecorder from './CoachAssistantVoiceRecorder.jsx'

import { formatPortalPersonaName, getPortalPersona } from '../../constants/studentPortalPersonas.js'

import {
  prepareCoachAssistantContext,
  sendCoachAssistantMessage,
} from '../../services/coachAssistantService.js'

import { saveCoachAssistantNorm } from '../../services/coachAssistantNormSave.js'
import { transcribeCoachVoice } from '../../services/coachVoiceTranscribe.js'

import { parseCoachAssistantMarkers } from '../../utils/coachAssistantActions.js'
import { resolvePendingNormFromMessages } from '../../utils/coachAssistantNormPending.js'

import {
  loadCoachAssistantChatMessages,
  resetCoachAssistantChatMessages,
  trimCoachAssistantChatMessages,
  writeCoachAssistantChatHistory,
} from '../../utils/coachAssistantChatHistory.js'

import { buildCoachAssistantOpener } from '../../utils/coachAssistantPrompt.js'

import { isPortalPersonaAiRemoteEnabled } from '../../utils/portalPersonaAiConfig.js'

import { portalPersonaReplySourceLabel } from '../../utils/portalPersonaAiConfig.js'

import { useCoachVoiceRecorder } from '../../hooks/useCoachVoiceRecorder.js'

import { vk } from '../../utils/vkUi.js'

/**
 * @param {{
 *   personaId: import('../../constants/studentPortalPersonas.js').PortalPersonaId,
 *   coachId: string,
 *   coachName?: string,
 *   students?: object[],
 *   focusStudent?: object | null,
 *   disabled?: boolean,
 *   onStudentPatched?: (studentId: string, patch: object) => void,
 * }} props
 */
export default function CoachAssistantChat({
  personaId,
  coachId,
  coachName = 'коллега',
  students = [],
  focusStudent = null,
  disabled = false,
  onStudentPatched = null,
}) {
  const persona = getPortalPersona(personaId)
  const name = formatPortalPersonaName(persona)
  const opener = useMemo(() => buildCoachAssistantOpener(persona.id, coachName), [persona.id, coachName])

  const [messages, setMessages] = useState(() => loadCoachAssistantChatMessages(coachId, persona.id, opener))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [replySource, setReplySource] = useState(null)
  const [pendingNorm, setPendingNorm] = useState(/** @type {Awaited<ReturnType<typeof resolvePendingNormFromMessages>>} */ (null))
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmSaved, setConfirmSaved] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const savedNormKeysRef = useRef(new Set())
  const bottomRef = useRef(null)
  const holdPointerIdRef = useRef(/** @type {number | null} */ (null))
  const voiceRef = useRef(/** @type {ReturnType<typeof useCoachVoiceRecorder> | null} */ (null))

  const voice = useCoachVoiceRecorder()
  voiceRef.current = voice

  const coachContextBase = useMemo(
    () => ({ coachName, students, focusStudent }),
    [coachName, students, focusStudent],
  )

  const persistMessages = useCallback(
    (next) => {
      const trimmed = trimCoachAssistantChatMessages(next)
      setMessages(trimmed)
      writeCoachAssistantChatHistory(coachId, persona.id, trimmed)
      return trimmed
    },
    [coachId, persona.id],
  )

  useEffect(() => {
    setMessages(loadCoachAssistantChatMessages(coachId, persona.id, opener))
    setError('')
    setReplySource(null)
    setInput('')
    setPendingNorm(null)
    setConfirmSaved(false)
    setConfirmError('')
    savedNormKeysRef.current = new Set()
  }, [coachId, persona.id, opener])

  useEffect(() => {
    if (busy || disabled) return undefined

    let cancelled = false
    ;(async () => {
      const pending = await resolvePendingNormFromMessages(messages, coachContextBase)
      if (cancelled) return
      if (!pending || savedNormKeysRef.current.has(pending.key)) {
        setPendingNorm(null)
        setConfirmSaved(false)
        setConfirmError('')
        return
      }
      setPendingNorm(pending)
      setConfirmSaved(false)
      setConfirmError('')
    })()

    return () => {
      cancelled = true
    }
  }, [messages, busy, disabled, coachContextBase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy, pendingNorm, confirmSaved, voice.phase])

  const runNormSave = useCallback(
    async (saveAction) => {
      const saved = await saveCoachAssistantNorm({
        studentId: saveAction.studentId,
        testId: saveAction.testId,
        resultRaw: saveAction.resultRaw,
        coachId,
      })
      onStudentPatched?.(saveAction.studentId, saved.payload)
      return `Записано в карточку: ${saved.studentName} — «${saved.normName}» ${saved.resultDisplay} (${saved.status}).`
    },
    [coachId, onStudentPatched],
  )

  const handleConfirmNorm = useCallback(async () => {
    if (!pendingNorm?.evaluation || confirmBusy || confirmSaved) return
    setConfirmBusy(true)
    setConfirmError('')
    try {
      const note = await runNormSave({
        studentId: String(pendingNorm.evaluation.student.id),
        testId: String(pendingNorm.evaluation.testId),
        resultRaw: pendingNorm.evaluation.resultRaw,
      })
      savedNormKeysRef.current.add(pendingNorm.key)
      setConfirmSaved(true)
      persistMessages([...messages, { role: 'assistant', content: note }])
      window.setTimeout(() => {
        setPendingNorm(null)
        setConfirmSaved(false)
      }, 1800)
    } catch (saveErr) {
      console.error(saveErr)
      setConfirmError(saveErr instanceof Error ? saveErr.message : 'Ошибка записи норматива')
    } finally {
      setConfirmBusy(false)
    }
  }, [pendingNorm, confirmBusy, confirmSaved, runNormSave, messages, persistMessages])

  const submitUserText = useCallback(
    async (text, voiceMeta = null) => {
      const trimmed = text.trim()
      if (!trimmed || busy || disabled) return

      setError('')
      setInput('')
      setConfirmError('')
      voice.clearError()

      /** @type {import('../../utils/coachAssistantChatHistory.js').CoachAssistantChatMessage} */
      const userMessage = {
        role: 'user',
        content: trimmed,
        ...(voiceMeta?.durationSec ? { voiceDurationSec: voiceMeta.durationSec } : {}),
        ...(voiceMeta?.audioUrl ? { voiceAudioUrl: voiceMeta.audioUrl } : {}),
      }

      const nextHistory = persistMessages([...messages, userMessage])
      setBusy(true)

      try {
        const conversationText = nextHistory
          .filter((m) => m.role === 'user')
          .map((m) => m.content ?? '')
          .join('\n')
        const coachContext = await prepareCoachAssistantContext(coachContextBase, trimmed, conversationText)

        const { reply: rawReply, source } = await sendCoachAssistantMessage({
          personaId: persona.id,
          messages: nextHistory,
          coachContext,
        })

        setReplySource(source)

        const { displayReply } = parseCoachAssistantMarkers(rawReply)
        persistMessages([...nextHistory, { role: 'assistant', content: displayReply || '…' }])
      } catch (e) {
        console.error(e)
        setError('Не удалось получить ответ. Попробуйте ещё раз.')
        const rolledBack = messages
        setMessages(rolledBack)
        writeCoachAssistantChatHistory(coachId, persona.id, rolledBack)
        if (!voiceMeta) setInput(trimmed)
      } finally {
        setBusy(false)
      }
    },
    [busy, disabled, messages, persona.id, coachContextBase, persistMessages, coachId, voice],
  )

  const processVoiceRecording = useCallback(
    async (recorded) => {
      if (!recorded?.blob || recorded.blob.size < 400) return
      setBusy(true)
      try {
        const transcript = await transcribeCoachVoice(recorded.blob, {
          browserTranscript: recorded.browserTranscript,
        })
        const audioUrl = URL.createObjectURL(recorded.blob)
        await submitUserText(transcript, {
          durationSec: recorded.durationSec,
          audioUrl,
        })
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Не удалось распознать голосовое')
      } finally {
        setBusy(false)
      }
    },
    [submitUserText],
  )

  const send = () => void submitUserText(input)

  const endHoldRecording = useCallback(async () => {
    const v = voiceRef.current
    if (!v || v.phase !== 'recording') return
    if (v.isLockedActive()) {
      holdPointerIdRef.current = null
      return
    }
    holdPointerIdRef.current = null
    await v.holdEnd()
  }, [])

  const finishLockedRecording = useCallback(async () => {
    holdPointerIdRef.current = null
    await voiceRef.current?.finishRecording()
  }, [])

  const sendVoiceDraft = useCallback(async () => {
    const v = voiceRef.current
    if (!v) return
    const recorded = v.beginSend()
    if (!recorded) return
    v.clearError()
    setError('')
    try {
      await processVoiceRecording(recorded)
    } finally {
      v.completeSend()
    }
  }, [processVoiceRecording])

  const detachHoldListenersRef = useRef(/** @type {(() => void) | null} */ (null))

  const detachHoldListeners = useCallback(() => {
    detachHoldListenersRef.current?.()
    detachHoldListenersRef.current = null
  }, [])

  const attachHoldListeners = useCallback(
    (pointerId) => {
      detachHoldListeners()

      const onMove = (event) => {
        if (event.pointerId !== pointerId) return
        event.preventDefault()
        voiceRef.current?.holdMove(event.clientX, event.clientY)
      }

      const onEnd = (event) => {
        if (event.pointerId !== pointerId) return
        event.preventDefault()
        detachHoldListeners()
        if (voiceRef.current?.isLockedActive()) {
          holdPointerIdRef.current = null
          return
        }
        void endHoldRecording()
      }

      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', onEnd)
      window.addEventListener('pointercancel', onEnd)

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onEnd)
        window.removeEventListener('pointercancel', onEnd)
      }
      detachHoldListenersRef.current = cleanup
    },
    [detachHoldListeners, endHoldRecording],
  )

  useEffect(() => () => detachHoldListeners(), [detachHoldListeners])

  const handleMicPointerDown = (event) => {
    if (disabled || busy || input.trim() || voice.phase !== 'idle') return
    event.preventDefault()
    holdPointerIdRef.current = event.pointerId
    attachHoldListeners(event.pointerId)
    void voiceRef.current?.holdStart(event.clientX, event.clientY)
  }

  const resetChat = useCallback(() => {
    if (busy || disabled) return
    const confirmed = window.confirm(
      `Сбросить переписку с ${name}? История этого помощника будет удалена, контекст начнётся заново.`,
    )
    if (!confirmed) return
    voice.cancelRecording()
    const fresh = resetCoachAssistantChatMessages(coachId, persona.id, opener)
    setMessages(fresh)
    setError('')
    setReplySource(null)
    setInput('')
    setPendingNorm(null)
    setConfirmSaved(false)
    setConfirmError('')
    savedNormKeysRef.current = new Set()
  }, [busy, disabled, coachId, persona.id, name, opener, voice])

  const showConfirmCard = pendingNorm?.evaluation && !busy
  const voiceActive = voice.phase !== 'idle'
  const voiceRecorderMode =
    voice.phase === 'preview' || voice.phase === 'processing' ? voice.phase : 'recording'
  const showMicButton = !input.trim() && voice.isSupported && !voiceActive && !busy

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled || busy || voiceActive}
          onClick={resetChat}
          className={`${vk.btnSecondary} px-2.5 py-1 text-[12px]`}
        >
          Сбросить чат
        </button>
      </div>

      {!isPortalPersonaAiRemoteEnabled() ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          Скриптовый режим. Для полного агента задайте VITE_FIREBASE_* и VITE_PORTAL_PERSONA_AI.
        </p>
      ) : replySource === 'script-fallback' ? (
        <p className={`${vk.mutedXs} rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-900`}>
          {portalPersonaReplySourceLabel(replySource)}
        </p>
      ) : null}

      <div className="min-h-[min(320px,42dvh)] flex-1 space-y-2.5 overflow-y-auto rounded-lg border border-[#e7e8ec] bg-[#fafbfc] p-2.5">
        {messages.map((msg, index) =>
          msg.role === 'user' ? (
            <div key={`${index}-u`} className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-[#ecf3fc] px-3 py-2 text-[14px] leading-snug text-[#2c2d2e]">
                {msg.voiceDurationSec ? (
                  <CoachAssistantVoiceBubble
                    durationSec={msg.voiceDurationSec}
                    audioUrl={msg.voiceAudioUrl}
                    transcript={msg.content}
                  />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ) : (
            <div key={`${index}-a`} className="flex gap-2.5">
              <StudentPersonaAvatar personaId={persona.id} size="md" />
              <div className="min-w-0 max-w-[calc(100%-3rem)] rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] leading-snug text-[#2c2d2e] whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ),
        )}

        {busy && !voiceActive ? (
          <div className="flex gap-2.5">
            <StudentPersonaAvatar personaId={persona.id} size="md" />
            <div className="rounded-2xl rounded-tl-md border border-[#e7e8ec] bg-white px-3 py-2 text-[14px] text-[#818c99]">
              печатает…
            </div>
          </div>
        ) : null}

        {showConfirmCard ? (
          <CoachAssistantNormConfirmCard
            evaluation={pendingNorm.evaluation}
            busy={confirmBusy}
            saved={confirmSaved}
            error={confirmError}
            onConfirm={() => void handleConfirmNorm()}
          />
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="relative w-full min-w-0 touch-none select-none pb-[max(0px,env(safe-area-inset-bottom))]">
        <div
          className={`flex min-w-0 gap-2 transition-opacity duration-150 ${
            voiceActive ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-hidden={voiceActive}
        >
          <input
            type="text"
            className={`${vk.input} min-h-[52px] flex-1 rounded-full`}
            placeholder={`Спросите ${name}…`}
            value={input}
            disabled={disabled || busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            maxLength={500}
          />
          {showMicButton ? (
            <button
              type="button"
              disabled={disabled || busy}
              onPointerDown={handleMicPointerDown}
              className="flex h-[52px] w-[52px] shrink-0 touch-none items-center justify-center rounded-full bg-[#5181b8] text-white transition-transform duration-100 active:scale-90 disabled:opacity-45"
              style={{ touchAction: 'none' }}
              aria-label="Удержите для голосового"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || busy || !input.trim()}
              onClick={send}
              className={`h-[52px] shrink-0 rounded-full px-4 ${vk.btnPrimary}`}
            >
              →
            </button>
          )}
        </div>

        {voiceActive ? (
          <div className="absolute inset-x-0 bottom-0 z-10">
            <CoachAssistantVoiceRecorder
              mode={voiceRecorderMode}
              elapsedLabel={voice.elapsedLabel}
              previewDurationLabel={voice.previewDurationLabel}
              audioUrl={voice.draft?.audioUrl ?? ''}
              levels={voice.levels}
              locked={voice.isLocked}
              slidePx={voice.slidePx}
              slideUpPx={voice.slideUpPx}
              pointerX={voice.gesture.pointerX}
              pointerY={voice.gesture.pointerY}
              lockPending={voice.lockPending}
              cancelPending={voice.cancelPending}
              onCancel={() => {
                holdPointerIdRef.current = null
                detachHoldListeners()
                if (voice.phase === 'preview' || voice.phase === 'processing') {
                  voice.discardPreview()
                } else {
                  voice.cancelRecording()
                }
              }}
              onStop={() => void finishLockedRecording()}
              onSend={() => void sendVoiceDraft()}
            />
          </div>
        ) : null}
      </div>

      {voice.error ? <p className={vk.error}>{voice.error}</p> : null}
      {error ? <p className={vk.error}>{error}</p> : null}
      {voice.isSupported && !voiceActive ? (
        <p className={vk.mutedXs}>Удержите микрофон · ↑ без удержания · ← отмена</p>
      ) : null}
    </div>
  )
}
