import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadLegacyTechnicalAtoms } from '../utils/ksrUtils'
import { displayNameFromStudent } from '../utils/studentModel'
import { classifyVoiceTranscript } from '../utils/voiceCoachIntent'
import {
  buildStudentFuseIndex,
  buildTechnicalAtomFuseIndex,
  buildLevelFuseIndex,
} from '../utils/voiceCoachFuzzy'
import { runVoiceCoachTurn } from '../utils/voiceCoachActions'
import { flushTechnicalPatchQueue, getOfflineQueueLength } from '../utils/voiceCoachOfflineQueue'
import { appendVoiceCoachLog, clearVoiceCoachLogs, getVoiceCoachLogs } from '../utils/voiceCoachLearningLog'
import { getStudentById, isFirebaseConfigured, updateStudentData } from '../services/firebaseService'

function pickSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function speakRu(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const t = String(text ?? '').trim()
  if (!t) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(t)
  u.lang = 'ru-RU'
  u.rate = 1
  window.speechSynthesis.speak(u)
}

function formatConf(c) {
  if (c == null || typeof c !== 'object') return ''
  return Object.entries(c)
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? `${Math.round(v * 100)}%` : v}`)
    .join(', ')
}

/**
 * Голосовой ассистент: STT → intent → уверенность / уточнение → действие; журнал в localStorage.
 */
export default function VoiceCoachAssistant({ students, onRosterChanged }) {
  const [atoms, setAtoms] = useState([])
  const [atomsError, setAtomsError] = useState('')
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [manualText, setManualText] = useState('')
  const [lastReply, setLastReply] = useState('')
  const [lastError, setLastError] = useState('')
  const [queueLen, setQueueLen] = useState(() => getOfflineQueueLength())
  const [flushBusy, setFlushBusy] = useState(false)
  const [clarifyPanel, setClarifyPanel] = useState(null)
  const [logOpen, setLogOpen] = useState(false)
  const [logVersion, setLogVersion] = useState(0)
  const resolutionRef = useRef({})
  const recRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await loadLegacyTechnicalAtoms()
        if (!cancelled) {
          setAtoms(Array.isArray(list) ? list : [])
          setAtomsError('')
        }
      } catch {
        if (!cancelled) {
          setAtoms([])
          setAtomsError('Не удалось загрузить программу техники для сопоставления ударов.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const studentsForFuse = useMemo(
    () =>
      (students || []).map((s) => ({
        id: s.id,
        name: displayNameFromStudent(s),
      })),
    [students],
  )

  const studentFuse = useMemo(() => buildStudentFuseIndex(studentsForFuse), [studentsForFuse])
  const atomFuse = useMemo(() => buildTechnicalAtomFuseIndex(atoms), [atoms])
  const levelFuse = useMemo(() => buildLevelFuseIndex(), [])

  const logEntries = useMemo(() => {
    void logVersion
    return getVoiceCoachLogs().slice(-12).reverse()
  }, [logVersion])

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop?.()
    } catch {
      /* ignore */
    }
    recRef.current = null
    setListening(false)
  }, [])

  const executeWithResolution = useCallback(
    async (rawText, res, { isNewCommand } = { isNewCommand: false }) => {
      const text = String(rawText ?? '').trim()
      if (!text) return
      if (!isFirebaseConfigured) {
        setLastError('Firebase не настроен — сохранение недоступно.')
        return
      }
      if (!studentsForFuse.length) {
        setLastError('Нет учеников в списке.')
        return
      }
      if (isNewCommand) {
        resolutionRef.current = {}
        setClarifyPanel(null)
        setLastReply('')
        setLastError('')
      }
      const effectiveRes = isNewCommand ? {} : res

      setProcessing(true)
      if (isNewCommand) setLastError('')
      try {
        const apiKey = typeof import.meta.env.VITE_OPENAI_API_KEY === 'string' ? import.meta.env.VITE_OPENAI_API_KEY : ''
        const { intent } = await classifyVoiceTranscript(text, { openAiApiKey: apiKey })
        const out = await runVoiceCoachTurn({
          intent,
          transcript: text,
          resolution: effectiveRes,
          students,
          technicalAtoms: atoms,
          studentFuse,
          atomFuse,
          levelFuse,
          updateStudentData,
          getStudentById,
        })

        if (out.kind === 'clarify') {
          setClarifyPanel(out)
          appendVoiceCoachLog({
            transcript: text,
            intent,
            outcome: 'clarify',
            detail: formatConf(out.confidence),
            confidence: out.confidence,
          })
          setLogVersion((v) => v + 1)
          setLastReply('Нужно уточнение — выберите вариант ниже.')
          return
        }

        setClarifyPanel(null)
        resolutionRef.current = {}

        if (out.kind === 'success') {
          setLastReply(out.tts)
          speakRu(out.tts)
          appendVoiceCoachLog({
            transcript: text,
            intent,
            outcome: out.queued ? 'executed_queued' : 'executed',
            detail: out.tts.slice(0, 200),
            confidence: out.confidence,
          })
          setLogVersion((v) => v + 1)
          setQueueLen(getOfflineQueueLength())
          if (out.studentId && onRosterChanged) onRosterChanged()
          return
        }

        setLastError(out.error || 'Не удалось выполнить команду.')
        appendVoiceCoachLog({
          transcript: text,
          intent,
          outcome: 'error',
          detail: out.error,
          confidence: out.confidence,
        })
        setLogVersion((v) => v + 1)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setLastError(msg)
        appendVoiceCoachLog({ transcript: text, intent: null, outcome: 'error', detail: msg })
        setLogVersion((v) => v + 1)
      } finally {
        setProcessing(false)
      }
    },
    [atoms, atomFuse, levelFuse, onRosterChanged, studentFuse, students, studentsForFuse.length],
  )

  const runNewCommand = useCallback(
    (text) => {
      const t = String(text ?? '').trim()
      setTranscript(t)
      void executeWithResolution(t, {}, { isNewCommand: true })
    },
    [executeWithResolution],
  )

  const startListening = useCallback(() => {
    const SpeechRecognition = pickSpeechRecognition()
    if (!SpeechRecognition) {
      setLastError('В этом браузере нет распознавания речи (SpeechRecognition). Введите команду текстом ниже.')
      return
    }
    setLastError('')
    const rec = new SpeechRecognition()
    rec.lang = 'ru-RU'
    rec.interimResults = true
    rec.continuous = false
    recRef.current = rec
    setListening(true)
    let finalText = ''
    rec.onresult = (ev) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const piece = ev.results[i][0]?.transcript ?? ''
        if (ev.results[i].isFinal) finalText += piece
        else interim += piece
      }
      setTranscript((finalText + interim).trim())
    }
    rec.onerror = () => {
      setListening(false)
      setLastError('Ошибка микрофона или распознавания. Проверьте разрешения браузера.')
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      const combined = finalText.trim()
      if (combined) {
        runNewCommand(combined)
      }
    }
    try {
      rec.start()
    } catch {
      setListening(false)
      setLastError('Не удалось запустить распознавание.')
    }
  }, [runNewCommand])

  const handleFlushQueue = useCallback(async () => {
    if (!isFirebaseConfigured) return
    setFlushBusy(true)
    setLastError('')
    try {
      const r = await flushTechnicalPatchQueue(updateStudentData)
      setQueueLen(getOfflineQueueLength())
      if (r.processed > 0 && onRosterChanged) onRosterChanged()
      if (r.remaining > 0 && r.lastError) {
        setLastError(`Часть очереди не отправилась: ${r.lastError}`)
      } else if (r.processed > 0) {
        setLastReply(`Отправлено из очереди: ${r.processed}.`)
        speakRu(`Сохранено из очереди: ${r.processed}`)
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
    } finally {
      setFlushBusy(false)
    }
  }, [onRosterChanged])

  const sttSupported = Boolean(pickSpeechRecognition())

  const pickStudent = (id) => {
    const prev = resolutionRef.current
    const next = { ...prev, studentId: id }
    resolutionRef.current = next
    const line = clarifyPanel?.transcript || transcript
    queueMicrotask(() => void executeWithResolution(line, next, { isNewCommand: false }))
  }
  const pickAtom = (id) => {
    const prev = resolutionRef.current
    const next = { ...prev, atomId: id }
    resolutionRef.current = next
    const line = clarifyPanel?.transcript || transcript
    queueMicrotask(() => void executeWithResolution(line, next, { isNewCommand: false }))
  }
  const pickLevel = (key) => {
    const prev = resolutionRef.current
    const next = { ...prev, levelKey: key }
    resolutionRef.current = next
    const line = clarifyPanel?.transcript || transcript
    queueMicrotask(() => void executeWithResolution(line, next, { isNewCommand: false }))
  }

  const cancelClarify = () => {
    const snap = clarifyPanel
    setClarifyPanel(null)
    resolutionRef.current = {}
    setLastReply('')
    appendVoiceCoachLog({
      transcript: snap?.transcript || transcript,
      intent: snap?.intent,
      outcome: 'cancelled',
      detail: 'Отмена уточнения',
    })
    setLogVersion((v) => v + 1)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
            Голосовой ассистент
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-snug text-slate-600 dark:text-slate-400">
            Команда проверяется по уверенности (Fuse + пороги): при сомнении вместо записи в базу покажутся кнопки
            уточнения. Журнал шагов хранится только в этом браузере — для разбора ошибок и будущего дообучения.
          </p>
          {import.meta.env.VITE_OPENAI_API_KEY ? (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Активен режим уточнения намерения через OpenAI (ключ из VITE_OPENAI_API_KEY). Для продакшена лучше свой
              прокси-сервер без ключа в клиенте.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Без ключа OpenAI используются только эвристики по шаблонам фраз (достаточно для чётких команд).
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {queueLen > 0 && (
            <button
              type="button"
              disabled={flushBusy}
              onClick={() => void handleFlushQueue()}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
            >
              {flushBusy ? 'Отправка…' : `Очередь: ${queueLen}`}
            </button>
          )}
          <button
            type="button"
            disabled={listening || processing}
            onClick={() => (listening ? stopListening() : startListening())}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 ${
              listening ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600'
            }`}
          >
            {listening ? 'Стоп' : 'Микрофон'}
          </button>
        </div>
      </div>

      {atomsError ? (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{atomsError}</p>
      ) : null}

      {!sttSupported && (
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
          Распознавание речи недоступно — используйте текстовое поле.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Текст команды (если без микрофона)
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={2}
            placeholder="Например: Ученик Иван Иванов освоил прямой передней в туловище на уровень умение"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900/40"
          />
        </label>
        <button
          type="button"
          disabled={processing || !manualText.trim()}
          onClick={() => {
            const t = manualText.trim()
            runNewCommand(t)
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {processing ? 'Обработка…' : 'Выполнить текстом'}
        </button>
      </div>

      {transcript ? (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Распознано:</span> {transcript}
        </p>
      ) : null}

      {clarifyPanel ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/90 px-3 py-3 dark:border-blue-900/50 dark:bg-blue-950/35">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Уточните команду</p>
          {formatConf(clarifyPanel.confidence) ? (
            <p className="mt-1 text-[11px] text-blue-800/90 dark:text-blue-200/90">
              Уверенность: {formatConf(clarifyPanel.confidence)}
            </p>
          ) : null}

          {clarifyPanel.lockedStudentLabel ? (
            <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
              Ученик: <span className="font-semibold">{clarifyPanel.lockedStudentLabel}</span>
            </p>
          ) : null}
          {clarifyPanel.studentCandidates?.length ? (
            <div className="mt-2">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Кого имели в виду?</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {clarifyPanel.studentCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={processing}
                    onClick={() => pickStudent(c.id)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {c.label}
                    <span className="ml-1 tabular-nums text-[10px] text-slate-500">{(c.confidence * 100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {clarifyPanel.lockedAtomLabel ? (
            <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
              Техника: <span className="font-semibold">{clarifyPanel.lockedAtomLabel}</span>
            </p>
          ) : null}
          {clarifyPanel.atomCandidates?.length ? (
            <div className="mt-2">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Какой элемент программы?</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {clarifyPanel.atomCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={processing}
                    onClick={() => pickAtom(c.id)}
                    className="max-w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="line-clamp-2">{c.label}</span>
                    <span className="ml-1 tabular-nums text-[10px] text-slate-500">{(c.confidence * 100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {clarifyPanel.levelCandidates?.length ? (
            <div className="mt-2">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Какой уровень освоения?</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {clarifyPanel.levelCandidates.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    disabled={processing}
                    onClick={() => pickLevel(c.key)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {c.label}
                    <span className="ml-1 tabular-nums text-[10px] text-slate-500">{(c.confidence * 100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={cancelClarify}
            className="mt-3 text-xs font-medium text-slate-600 underline decoration-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            Отмена
          </button>
        </div>
      ) : null}

      {lastReply ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          {lastReply}
        </p>
      ) : null}

      {lastError ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
          {lastError}
        </p>
      ) : null}

      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setLogOpen((o) => !o)}
          className="text-xs font-medium text-slate-600 underline decoration-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {logOpen ? 'Скрыть' : 'Показать'} журнал (локально, {getVoiceCoachLogs().length} записей)
        </button>
        {logOpen ? (
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                clearVoiceCoachLogs()
                setLogVersion((v) => v + 1)
              }}
              className="text-[11px] text-red-700 underline dark:text-red-400"
            >
              Очистить журнал
            </button>
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] dark:border-slate-600 dark:bg-slate-800/80">
              {logEntries.length === 0 ? (
                <li className="text-slate-500">Пока пусто</li>
              ) : (
                logEntries.map((row, i) => (
                  <li
                    key={`${row.ts}-${i}`}
                    className="border-b border-slate-200/80 pb-2 last:border-0 dark:border-slate-600/80"
                  >
                    <span className="font-mono text-slate-500">{row.ts.slice(11, 19)}</span>{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{row.outcome}</span>
                    {row.detail ? <span className="block text-slate-600 dark:text-slate-400"> {row.detail}</span> : null}
                    <span className="block truncate text-slate-500" title={row.transcript}>
                      «{row.transcript}»
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
