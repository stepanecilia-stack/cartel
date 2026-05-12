import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  TECH_DOMINANCE_OPTIONS,
  calculateEffectiveKSR,
  calculateKD,
  calculateKsrAndKsp,
  calculateLegacySectionScores,
  evaluateLegacyTest,
  getNormsForAthlete,
  getWeights,
  loadLegacyNorms,
  loadLegacyTechnicalAtoms,
  normalizeTechnicalDominanceKey,
  shortTypageLabel,
} from '../utils/ksrUtils'
import { buildTechnicalLocksById, orderTechnicalAtomsForProgram } from '../utils/technicalProgramProgress.js'
import {
  anthropometryFieldToInputString,
  birthYearToInputString,
  computeAthleteAgeYears,
  displayNameFromStudent,
  formatBirthYearRu,
  formatShortIdDisplay,
  normalizeBirthYearNumber,
  studentAthleteShape,
  studentPhotoUrl,
} from '../utils/studentModel'
import { buildPublicSharePayload, isValidProgressShareToken } from '../utils/publicSharePayload'
import {
  buildNormAcceptanceHistoryEntry,
  formatNormAcceptedMeta,
  mergeNormAcceptanceHistory,
} from '../utils/normAcceptanceHistory'
import {
  ensureStudentShortId,
  generateOpaqueShareToken,
  getCoachProfile,
  getCurrentCoachId,
  getStudentById,
  isValidSixDigitShortId,
  setPublicStudentShareDocument,
  updateStudentData,
} from '../services/firebaseService'
import BiometricPotentialBar from '../components/BiometricPotentialBar'
import { NormGoldGoalIcon, NormMedalChip } from '../components/NormMedals'
import { normCardToneByStatus, normScoreToneByStatus } from '../utils/normCardTone'
import { getSensitiveMotorQualities, orderSensitiveQualitiesForBoxing } from '../utils/sensitivePeriods'
import {
  buildCoachRecommendations,
  COACH_REC_ELEMENT_NAME_CLASS,
  isCoachRecSessionFormula,
} from '../utils/coachRecommendations'
import { buildCoachDevelopmentExercisePlan, developmentExerciseSlotCountForAge } from '../utils/motorQualityWorkoutExercises'
import { Link } from 'react-router-dom'
import { getMotorQualitySlug } from '../data/motorQualitiesCatalog'

const MOTOR_QUALITY_LINK_CLASS =
  'font-medium text-blue-600 underline underline-offset-2 decoration-blue-400/70 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'

function MotorQualityInlineLink({ title, qualityReturnState }) {
  const slug = getMotorQualitySlug(title)
  if (!slug) {
    return <span className="font-medium text-slate-800 dark:text-slate-200">{title}</span>
  }
  const to =
    qualityReturnState != null
      ? {
          pathname: `/qualities/${slug}`,
          state: { studentQualityReturn: qualityReturnState },
        }
      : `/qualities/${slug}`
  return (
    <Link to={to} className={MOTOR_QUALITY_LINK_CLASS}>
      {title}
    </Link>
  )
}

/** Подпись этапа вида «… «название» …» — название ведёт на страницу качества. */
function renderQuotedMotorQualityLabel(label, titles, qualityReturnState) {
  if (!titles?.length) return <span className="leading-snug">{label}</span>
  const parts = []
  let rest = label
  let key = 0
  for (const title of titles) {
    const needle = `«${title}»`
    const i = rest.indexOf(needle)
    if (i === -1) {
      parts.push(<span key={`q-${key++}`}>{rest}</span>)
      return <span className="leading-snug">{parts}</span>
    }
    if (i > 0) parts.push(<span key={`q-${key++}`}>{rest.slice(0, i)}</span>)
    parts.push(
      <span key={`q-${key++}`}>
        «<MotorQualityInlineLink title={title} qualityReturnState={qualityReturnState} />»
      </span>,
    )
    rest = rest.slice(i + needle.length)
  }
  if (rest) parts.push(<span key={`q-${key++}`}>{rest}</span>)
  return <span className="leading-snug">{parts}</span>
}

/** Строка «сенситивный период — A, B» с кликабельными качествами из каталога. */
function renderSensitivPeriodHintLabel(label, hintLinkTitles, qualityReturnState) {
  const prefix = 'Упражнения на развитие (сенситивный период — '
  const suffix = ')'
  if (!label.startsWith(prefix) || !label.endsWith(suffix) || !hintLinkTitles?.length) {
    return <span className="leading-snug">{label}</span>
  }
  const hint = label.slice(prefix.length, -suffix.length)
  const segments = hint.split(', ').map((s) => s.trim())
  const linkSet = new Set(hintLinkTitles)
  return (
    <span className="leading-snug">
      {prefix}
      {segments.map((segment, i) => (
        <span key={`h-${segment}-${i}`}>
          {i > 0 ? ', ' : ''}
          {linkSet.has(segment) ? (
            <MotorQualityInlineLink title={segment} qualityReturnState={qualityReturnState} />
          ) : (
            segment
          )}
        </span>
      ))}
      {suffix}
    </span>
  )
}

const COACH_TECH_NAME_BUTTON_CLASS = `${COACH_REC_ELEMENT_NAME_CLASS} rounded-sm text-left underline decoration-blue-400/60 decoration-2 underline-offset-2 hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:text-blue-300 dark:hover:text-blue-200 dark:focus-visible:ring-blue-600`

const COACH_NORM_NAME_BUTTON_CLASS = COACH_TECH_NAME_BUTTON_CLASS

const COACH_NORM_TAB = { phys: 'physical', func: 'functional' }

/** Стабильный id карточки норматива на вкладке «Физика» / «Функционал». */
function normCardDomId(category, testId) {
  const safe = String(testId ?? '').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `norm-card-${category}-${safe}`
}

/** Таблица минут по тренировке 90 / 60 (данные из buildCoachRecommendations). */
function CoachSessionPlanTable({
  item,
  qualityReturnState,
  onGoToTechnicalAtom,
  onGoToNormative,
  developmentByRowKey,
}) {
  const [minutes, setMinutes] = useState(90)
  const rows = item.rows ?? []
  const total = rows.reduce((acc, row) => acc + (minutes === 90 ? row.m90 : row.m60), 0)

  const rowsWithAbs = useMemo(() => {
    let cum = 0
    return rows.map((row) => {
      const raw = minutes === 90 ? row.m90 : row.m60
      const dur = Number(raw) || 0
      let absLabel = '—'
      let absTitle = 'Длительность этапа не задана'
      if (dur > 0) {
        const fromMin = cum + 1
        cum += dur
        const toMin = cum
        absLabel = `${fromMin}–${toMin}`
        absTitle = `С ${fromMin}-й по ${toMin}-ю минуту от начала тренировки (${dur} мин)`
      }
      return { row, d: dur, absLabel, absTitle }
    })
  }, [rows, minutes])

  return (
    <div className="mt-2 min-w-0 rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 p-2 shadow-sm sm:mt-3 sm:p-4">
      <div
        className="flex w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800"
        role="group"
        aria-label="Длительность тренировки для расчёта минут"
      >
        <button
          type="button"
          onClick={() => setMinutes(90)}
          aria-pressed={minutes === 90}
          className={`min-w-0 flex-1 rounded-md py-2.5 transition sm:py-3 ${
            minutes === 90
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          1,5 ч
        </button>
        <button
          type="button"
          onClick={() => setMinutes(60)}
          aria-pressed={minutes === 60}
          className={`min-w-0 flex-1 rounded-md py-2.5 transition sm:py-3 ${
            minutes === 60
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          1 ч
        </button>
      </div>
      {/* Flex-строки вместо table: на узком экране min-w-0 + shrink-0 гарантируют видимость минут */}
      <div
        className="mt-2 min-w-0 overflow-hidden rounded-md border border-slate-200 text-sm dark:border-slate-600"
        role="table"
        aria-label="Распределение минут по этапам"
      >
        <div
          className="flex gap-1.5 border-b border-slate-200 bg-slate-100/90 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400 sm:gap-3 sm:py-2 sm:text-xs"
          role="row"
        >
          <div className="min-w-0 flex-1 px-1.5 sm:px-2.5" role="columnheader">
            Этап
          </div>
          <div
            className="w-[3.35rem] shrink-0 px-0.5 text-right tabular-nums sm:w-[4.75rem] sm:px-2"
            role="columnheader"
            title="Минута тренировки от начала (включительно)"
          >
            От старта
          </div>
          <div className="w-9 shrink-0 px-1 text-right tabular-nums sm:w-12 sm:px-2.5" role="columnheader">
            Мин
          </div>
        </div>
        <div className="text-slate-800 dark:text-slate-200" role="rowgroup">
          {rowsWithAbs.map(({ row, d: m, absLabel, absTitle }, index) => {
            let stageCell = null
            if (row.kind === 'technical') {
              stageCell =
                row.technical != null ? (
                  <span className="leading-snug">
                    Техника по программе: «
                    {row.technical.atomId && typeof onGoToTechnicalAtom === 'function' ? (
                      <button
                        type="button"
                        className={COACH_TECH_NAME_BUTTON_CLASS}
                        title="Перейти к элементу во вкладке «Техника»"
                        onClick={() => onGoToTechnicalAtom(row.technical.atomId)}
                      >
                        {row.technical.name}
                      </button>
                    ) : (
                      <span className={COACH_REC_ELEMENT_NAME_CLASS}>{row.technical.name}</span>
                    )}
                    »{row.technical.taskSuffix}
                  </span>
                ) : (
                  <span className="text-slate-700">Техника по программе — без выделенного элемента в расчёте</span>
                )
            } else if (row.kind === 'norm') {
              stageCell =
                row.normative != null ? (
                  <span className="leading-snug">
                    Отстающий норматив: «
                    {row.normative.testId &&
                    row.normative.category &&
                    COACH_NORM_TAB[row.normative.category] &&
                    typeof onGoToNormative === 'function' ? (
                      <button
                        type="button"
                        className={COACH_NORM_NAME_BUTTON_CLASS}
                        title="Перейти к нормативу на вкладке «Физика» или «Функционал»"
                        onClick={() =>
                          onGoToNormative(COACH_NORM_TAB[row.normative.category], row.normative.testId)
                        }
                      >
                        {row.normative.testName}
                      </button>
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{row.normative.testName}</span>
                    )}
                    »
                  </span>
                ) : (
                  <span className="text-slate-600">Отстающий норматив — слот не активирован порогами расчёта</span>
                )
            } else if (row.kind === 'plain' && row.key === 'greenFallback' && row.hintLinkTitles?.length) {
              stageCell = renderSensitivPeriodHintLabel(row.label, row.hintLinkTitles, qualityReturnState)
            } else if (row.kind === 'plain' && row.linkableQuotedQualities?.length) {
              stageCell = renderQuotedMotorQualityLabel(row.label, row.linkableQuotedQualities, qualityReturnState)
            } else {
              stageCell = <span className="leading-snug">{row.label}</span>
            }
            const zebra = index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'
            const devBlock = developmentByRowKey?.[row.key]
            return (
              <div
                key={row.key}
                className={`flex gap-1.5 border-b border-slate-100 py-1.5 dark:border-slate-700 sm:gap-3 sm:py-2 ${zebra} px-1.5 sm:px-2.5`}
                role="row"
              >
                <div className="min-w-0 flex-1 break-words text-[13px] leading-snug sm:text-sm" role="cell">
                  {stageCell}
                  {devBlock?.qualities?.length ? (
                    <div className="mt-2 rounded-md border border-blue-100 bg-blue-50/90 px-2 py-2 dark:border-blue-900/50 dark:bg-blue-950/35">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                        Подборка упражнений
                      </p>
                      <div className="mt-1.5 space-y-2">
                        {devBlock.qualities.map((q) => (
                          <div key={q.slug}>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{q.title}</p>
                            <ol className="mt-0.5 list-decimal space-y-1 pl-4 text-[12px] leading-snug text-slate-700 dark:text-slate-300">
                              {q.exercises.map((ex) => (
                                <li key={ex.id}>
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{ex.title}</span>
                                  {ex.intent ? (
                                    <span className="text-slate-600 dark:text-slate-400"> — {ex.intent}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div
                  className="w-[3.35rem] shrink-0 self-start px-0.5 pt-0.5 text-right text-[10px] font-medium tabular-nums text-slate-700 dark:text-slate-300 sm:w-[4.75rem] sm:px-2 sm:text-xs"
                  role="cell"
                  title={absTitle}
                >
                  {absLabel}
                </div>
                <div
                  className="w-9 shrink-0 self-start px-0.5 pt-0.5 text-right text-xs font-medium tabular-nums text-slate-900 dark:text-slate-100 sm:w-12 sm:px-0 sm:text-sm"
                  role="cell"
                >
                  {m}
                </div>
              </div>
            )
          })}
        </div>
        <div
          className="flex gap-1.5 border-t border-slate-200 bg-slate-100 px-1.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:gap-3 sm:px-2.5 sm:py-2 sm:text-sm"
          role="row"
        >
          <div className="min-w-0 flex-1" role="cell">
            Итого
          </div>
          <div
            className="w-[3.35rem] shrink-0 px-0.5 text-right text-[10px] tabular-nums text-slate-700 dark:text-slate-300 sm:w-[4.75rem] sm:px-2 sm:text-xs"
            role="cell"
            title="Вся тренировка от первой до последней минуты"
          >
            {total > 0 ? `1–${total}` : '—'}
          </div>
          <div className="w-9 shrink-0 px-0.5 text-right tabular-nums sm:w-12 sm:px-0" role="cell">
            {total}
          </div>
        </div>
      </div>
    </div>
  )
}

const TAB_ITEMS = [
  { id: 'anthropometry', label: 'Антропометрия' },
  { id: 'physical', label: 'Физическое развитие' },
  { id: 'functional', label: 'Функциональная готовность' },
  { id: 'technical', label: 'Техника' },
]

const TAB_PROGRESS_LABELS = {
  anthropometry: 'Антропометрия',
  physical: 'Физика',
  functional: 'Функционал',
  technical: 'Техника',
}

const TAB_ICONS = {
  anthropometry: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 6v4M9 7v2M12 6v4M15 7v2M18 6v4M6 14v4M9 15v2M12 14v4M15 15v2M18 14v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  physical: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 15c1.2-1.6 2.7-2.4 4.6-2.4 1.5 0 2.8.5 3.8 1.5l1.6 1.6c.8.8.8 2.1 0 2.9-.8.8-2.1.8-2.9 0l-1-1c-.6-.6-1.3-.9-2.2-.9-1.2 0-2.2.5-2.9 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 8.8 8 10.4c.6.6 1.4.9 2.2.9 1.1 0 2-.4 2.7-1.2l1-1.1c.8-.8 2.1-.9 2.9-.1.8.8.9 2.1.1 2.9l-1.5 1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  functional: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13.2 2 5 13h5l-1 9 8.2-11H12l1.2-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  technical: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8.5 13.5c-1.2 0-2.2-1-2.2-2.2V8.8c0-1.8 1.5-3.3 3.3-3.3h3.8c2.4 0 4.3 2 4.3 4.3v5.2c0 1.9-1.6 3.5-3.5 3.5H9.7c-1.8 0-3.2-1.4-3.2-3.2v-.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.3 10.7h3.3c1.1 0 2 .9 2 2v2.2c0 .9-.7 1.6-1.6 1.6H8c-.9 0-1.7-.8-1.7-1.7v-4.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
}

function emptyTestsRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && ('result' in v || 'normalizedScore' in v)) out[k] = v
  }
  return out
}

function normalizeLegacyTestId(id) {
  return String(id ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function getNormValueByTestId(values, testId) {
  if (!values || typeof values !== 'object') return undefined
  if (values[testId]) return values[testId]
  const normalizedTarget = normalizeLegacyTestId(testId)
  if (!normalizedTarget) return undefined
  for (const [key, value] of Object.entries(values)) {
    if (normalizeLegacyTestId(key) === normalizedTarget) return value
  }
  return undefined
}

function removeNormValueByTestId(values, testId) {
  const normalizedTarget = normalizeLegacyTestId(testId)
  if (!normalizedTarget) return { ...values }
  const next = { ...values }
  for (const key of Object.keys(next)) {
    if (normalizeLegacyTestId(key) === normalizedTarget) {
      delete next[key]
    }
  }
  return next
}

function isMinuteSecondNorm(norm) {
  const unit = String(norm?.unit ?? '').toLowerCase()
  return unit.includes('мин') || unit.includes('mm:ss') || unit.includes('м:с')
}

/** Только полная пара секунд (две цифры), иначе «8:3» ошибочно читалось как 8:03 при вводе 8:30. */
function parseMinuteSecondToMinutes(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const match = normalized.match(/^(\d+)\s*:\s*(\d{2})$/)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  if (seconds > 59) return null
  return {
    value: minutes + seconds / 60,
    display: `${minutes}:${String(seconds).padStart(2, '0')}`,
  }
}

/** 8.30 / 8,30 / 8 30 → мин:сек; ровно две цифры после точки/запятой или после пробела. */
function parseDotCommaOrSpaceMinuteSecond(rawValue) {
  const normalized = String(rawValue ?? '').trim()
  const comma = normalized.match(/^(\d+),(\d{2})$/)
  if (comma) {
    const minutes = Number(comma[1])
    const seconds = Number(comma[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  const dot = normalized.match(/^(\d+)\.(\d{2})$/)
  if (dot) {
    const minutes = Number(dot[1])
    const seconds = Number(dot[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  const sp = normalized.match(/^(\d+)\s+(\d{2})$/)
  if (sp) {
    const minutes = Number(sp[1])
    const seconds = Number(sp[2])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null
    return {
      value: minutes + seconds / 60,
      display: `${minutes}:${String(seconds).padStart(2, '0')}`,
    }
  }
  return null
}

function parseAnyCompleteMinuteSecond(rawValue) {
  return parseMinuteSecondToMinutes(rawValue) ?? parseDotCommaOrSpaceMinuteSecond(rawValue)
}

/**
 * Неполный ввод времени: не превращать в число минут и не подставлять :00.
 * «8:3» — ждём вторую цифру секунд; «8.3» при точке — ждём вторую цифру (8.30) или уход с поля (десятичные минуты).
 */
function isPartialMinuteSecondInput(trimmed) {
  if (!trimmed) return false
  if (/^\d+$/.test(trimmed)) return true
  if (/^\d+\s*:\s*$/.test(trimmed)) return true
  if (/^\d+\s*:\s*\d{1}$/.test(trimmed)) return true
  if (/^\d+\s+\d{1}$/.test(trimmed)) return true
  if (/^\d+[.,]\s*$/.test(trimmed)) return true
  if (/^\d+\.\d{1}$/.test(trimmed)) return true
  if (/^\d+[.,]\d{3,}$/.test(trimmed)) return true
  return false
}

function formatMinutesToMinuteSecond(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  let minutes = Math.floor(num)
  let seconds = Math.round((num - minutes) * 60)
  if (seconds === 60) {
    minutes += 1
    seconds = 0
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getCoachInputHint(norm) {
  if (isMinuteSecondNorm(norm)) {
    return 'Время: 8:30 и 8:05 (секунды всегда двумя цифрами), либо 8.30 / 8,30 / 8 30. Дробные минуты без секунд — только запятой: 8,5.'
  }
  return 'Числовой формат: можно вводить с точкой или запятой (например, 6.5 или 6,5) — программа распознает автоматически.'
}

function emptyTechnicalRecord(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue
    out[k] = { ...v, level: normalizeTechnicalDominanceKey(v.level) }
  }
  return out
}

function StudentPage({ student, onBack, onStudentUpdated }) {
  const onStudentUpdatedRef = useRef(onStudentUpdated)
  onStudentUpdatedRef.current = onStudentUpdated
  const safeStudent = useMemo(() => {
    if (!student?.id) {
      return {
        id: null,
        name: 'Ученик не выбран',
        scores: { техника: 0, физика: 0, функционал: 0 },
        height: 0,
        reach: 0,
        weight: 0,
        birthYear: 0,
        gender: 'M',
      }
    }
    return { id: student.id, ...studentAthleteShape(student) }
  }, [student])

  const [activeTab, setActiveTab] = useState('anthropometry')
  const [allNorms, setAllNorms] = useState([])
  const [technicalAtoms, setTechnicalAtoms] = useState([])
  const [loadingNorms, setLoadingNorms] = useState(true)
  const [normsError, setNormsError] = useState('')
  const [physicalResults, setPhysicalResults] = useState({})
  const [functionalResults, setFunctionalResults] = useState({})
  const [technicalData, setTechnicalData] = useState({})
  const [anthropometry, setAnthropometry] = useState({
    height: '',
    reach: '',
    weight: '',
    birthYear: '',
    date: new Date().toISOString().slice(0, 10),
    gender: 'M',
  })
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const [anthropometrySaveError, setAnthropometrySaveError] = useState('')
  const [anthropometrySaveOk, setAnthropometrySaveOk] = useState(false)
  const [isAnthropometrySaving, setIsAnthropometrySaving] = useState(false)
  const [normSavingKey, setNormSavingKey] = useState('')
  const [technicalSavingKey, setTechnicalSavingKey] = useState('')
  const [openTechnicalVideoId, setOpenTechnicalVideoId] = useState(null)
  const [pendingTechnicalFocusId, setPendingTechnicalFocusId] = useState(null)
  const [pendingNormFocus, setPendingNormFocus] = useState(null)
  const [copyIdFlash, setCopyIdFlash] = useState(false)
  const [shortIdAssignError, setShortIdAssignError] = useState('')
  const [shareFlash, setShareFlash] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [standardInfoOpen, setStandardInfoOpen] = useState(false)
  const [sensitivePeriodExpanded, setSensitivePeriodExpanded] = useState(false)
  const [coachGenDevPlan, setCoachGenDevPlan] = useState(null)
  const [coachGenDevNotice, setCoachGenDevNotice] = useState('')
  const shortIdDeniedRef = useRef(new Set())

  useEffect(() => {
    const loadLegacyData = async () => {
      try {
        const [norms, atoms] = await Promise.all([loadLegacyNorms(), loadLegacyTechnicalAtoms()])
        setAllNorms(norms)
        setTechnicalAtoms(atoms)
        setNormsError('')
      } catch (error) {
        console.error('Ошибка загрузки legacy данных:', error)
        setNormsError(
          'Таблица нормативов с сайта не подгрузилась (часто это интернет или блокировка). Поля всё равно можно заполнить и сохранить.',
        )
      } finally {
        setLoadingNorms(false)
      }
    }
    loadLegacyData()
  }, [])

  useEffect(() => {
    if (!student?.id) return
    const sh = studentAthleteShape(student)
    const tests = student.tests && typeof student.tests === 'object' ? student.tests : {}
    setAnthropometry({
      height: anthropometryFieldToInputString(student.height ?? sh.height),
      reach: anthropometryFieldToInputString(student.reach ?? sh.reach),
      weight: anthropometryFieldToInputString(student.weight ?? sh.weight),
      birthYear: birthYearToInputString(student.birthYear ?? student.birthYearLabel ?? sh.birthYear),
      date:
        typeof student.anthropometryDate === 'string' && student.anthropometryDate
          ? student.anthropometryDate
          : new Date().toISOString().slice(0, 10),
      gender: sh.gender === 'F' ? 'F' : 'M',
    })
    setPhysicalResults(emptyTestsRecord(tests.physical))
    setFunctionalResults(emptyTestsRecord(tests.functional))
    setTechnicalData(emptyTechnicalRecord(student.technicalData))
    setShareFlash(false)
    setShareUrl('')
    setStandardInfoOpen(false)
    setSensitivePeriodExpanded(false)
    setOpenTechnicalVideoId(null)
    setSaveError('')
    setSaveOk(false)
    setAnthropometrySaveError('')
    setAnthropometrySaveOk(false)
    setCoachGenDevPlan(null)
    setCoachGenDevNotice('')
  }, [student])

  useEffect(() => {
    if (!student?.id) return undefined

    if (shortIdDeniedRef.current.has(student.id)) {
      setShortIdAssignError(
        'Личный шестизначный код не создался: у программы нет права записать его в базу. Нужен человек, который подключал приложение к интернету — он знает, где включить разрешение.',
      )
      return undefined
    }

    if (isValidSixDigitShortId(student.short_id)) {
      shortIdDeniedRef.current.delete(student.id)
      setShortIdAssignError('')
      return undefined
    }

    setShortIdAssignError('')

    let cancelled = false
    ;(async () => {
      try {
        const res = await ensureStudentShortId(student.id)
        if (cancelled || !res) return
        if (res.error === 'permission-denied') {
          shortIdDeniedRef.current.add(student.id)
          setShortIdAssignError(
            'Личный код не записался: база отклонила сохранение. Обратитесь к тому, кто настраивал доступ программы к базе.',
          )
          return
        }
        if (!res.short_id) return
        if (!isValidSixDigitShortId(student.short_id) || Number(student.short_id) !== res.short_id) {
          onStudentUpdatedRef.current?.({ short_id: res.short_id })
        }
      } catch (e) {
        console.error('ensureStudentShortId', e)
        setShortIdAssignError('Не удалось получить код: проверьте интернет или настройки доступа к базе.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student?.id, student?.short_id])

  const resolvedBirthYear = useMemo(() => {
    const fromForm = normalizeBirthYearNumber(anthropometry.birthYear)
    if (fromForm) return fromForm
    return normalizeBirthYearNumber(safeStudent.birthYear) || 0
  }, [anthropometry.birthYear, safeStudent.birthYear])

  const athleteForNorms = useMemo(() => {
    const height = Number(anthropometry.height) || 0
    const reach = Number(anthropometry.reach) || 0
    const weight = Number(anthropometry.weight) || 0
    return {
      ...safeStudent,
      height,
      reach,
      weight,
      birthYear: resolvedBirthYear,
      gender: anthropometry.gender === 'F' ? 'F' : 'M',
    }
  }, [safeStudent, anthropometry, resolvedBirthYear])

  const physicalNorms = useMemo(
    () => getNormsForAthlete(allNorms, athleteForNorms, 'physical'),
    [allNorms, athleteForNorms],
  )
  const functionalNorms = useMemo(
    () => getNormsForAthlete(allNorms, athleteForNorms, 'functional'),
    [allNorms, athleteForNorms],
  )

  const scores = useMemo(
    () =>
      calculateLegacySectionScores({
        physicalNorms,
        functionalNorms,
        physicalResults,
        functionalResults,
        technicalData,
      }),
    [functionalNorms, functionalResults, physicalNorms, physicalResults, technicalData],
  )

  const dynamicStudent = useMemo(() => {
    const height = Number(anthropometry.height) || 0
    const reach = Number(anthropometry.reach) || 0
    const weight = Number(anthropometry.weight) || 0
    return {
      ...safeStudent,
      name: displayNameFromStudent(safeStudent),
      height,
      reach,
      weight,
      birthYear: resolvedBirthYear,
      gender: anthropometry.gender === 'F' ? 'F' : 'M',
    }
  }, [safeStudent, anthropometry, resolvedBirthYear])

  const weights = getWeights(dynamicStudent)
  const ksrKsp = useMemo(
    () => calculateKsrAndKsp(dynamicStudent, scores),
    [dynamicStudent, scores],
  )
  const baseKSR = ksrKsp.baseKSR
  const kdBundle = useMemo(() => {
    if (technicalAtoms.length > 0) return calculateKD(technicalAtoms, technicalData)
    const fromDb = Number(student?.kd)
    if (student?.id && Number.isFinite(fromDb) && fromDb >= 0.25) {
      return {
        kd: Number(fromDb.toFixed(4)),
        atomCount: Number(student.kdAtomCount) || 0,
        automationPercent: Number(student.kdAutomationPercent) || 25,
        automatedCount: 0,
      }
    }
    return calculateKD([], technicalData)
  }, [
    technicalAtoms,
    technicalData,
    student?.id,
    student?.kd,
    student?.kdAtomCount,
    student?.kdAutomationPercent,
  ])
  const effectiveKSR = useMemo(
    () => calculateEffectiveKSR(baseKSR, kdBundle.kd),
    [baseKSR, kdBundle.kd],
  )
  const standardRow = ksrKsp?.kspDetail?.row ?? null
  const standardWeightCategory = useMemo(() => {
    if (!standardRow) return '—'
    const wMin = Number(standardRow.weightMin)
    const wMax = Number(standardRow.weightMax)
    if (!Number.isFinite(wMin) || !Number.isFinite(wMax)) return '—'
    if (standardRow.openTop) return `${wMin}+`
    if (wMin === wMax) return String(wMin)
    return `${wMin}-${wMax}`
  }, [standardRow])
  const standardAgeGroup = standardRow?.ageGroup ?? '—'
  const standardArchetype = shortTypageLabel(standardRow?.label) || '—'
  const referenceHeight = Number(ksrKsp?.kspDetail?.referenceHeight ?? 0)
  const referenceReach = Number(ksrKsp?.kspDetail?.referenceReach ?? referenceHeight ?? 0)
  const athleteHeight = Number(anthropometry.height || 0)
  const athleteReach = Number(anthropometry.reach || 0)
  const duelRows = [
    {
      key: 'height',
      label: 'Рост',
      athleteValue: athleteHeight,
      referenceValue: referenceHeight,
      delta: athleteHeight - referenceHeight,
      unit: 'см',
    },
    {
      key: 'reach',
      label: 'Размах',
      athleteValue: athleteReach,
      referenceValue: referenceReach,
      delta: athleteReach - referenceReach,
      unit: 'см',
    },
  ]
  const basePercent = Math.max(0, Math.min(100, Number(baseKSR) || 0))
  const kspPercent = Math.max(0, Math.min(100, Number(ksrKsp.ksp) || 0))

  const shortIdRaw = student?.short_id ?? safeStudent?.short_id
  const shortIdDigits =
    shortIdRaw != null && shortIdRaw !== '' && Number.isFinite(Number(shortIdRaw))
      ? String(Math.floor(Number(shortIdRaw))).padStart(6, '0')
      : ''

  const ownerCoachIdsForShare = useMemo(
    () => [...new Set([...(student?.coach_ids || []), student?.coachId].filter(Boolean))],
    [student?.coach_ids, student?.coachId],
  )

  /** @param {null | { physical: object, functional: object }} testsExact — если передан, используется как финальные tests (уже смёрженные), иначе берётся state. */
  const buildSharePayloadForPublic = async (weightHistoryArg, testsExact = null) => {
    let norms = allNorms
    let atoms = technicalAtoms
    if (!norms.length) {
      try {
        norms = await loadLegacyNorms()
        setAllNorms(norms)
      } catch {
        norms = []
      }
    }
    if (!atoms.length) {
      try {
        atoms = await loadLegacyTechnicalAtoms()
        setTechnicalAtoms(atoms)
      } catch {
        atoms = []
      }
    }

    const physicalMerged = testsExact
      ? testsExact.physical
      : { ...emptyTestsRecord(student?.tests?.physical), ...physicalResults }
    const functionalMerged = testsExact
      ? testsExact.functional
      : { ...emptyTestsRecord(student?.tests?.functional), ...functionalResults }
    const technicalMerged = {
      ...emptyTechnicalRecord(student?.technicalData),
      ...technicalData,
    }

    const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
    const w = Number(anthropometry.weight) || 0
    return buildPublicSharePayload({
      displayName: displayNameFromStudent(student),
      photoURL: studentPhotoUrl(student),
      currentWeight: w,
      weightHistory: weightHistoryArg,
      measureDate,
      nextAttestationDate: typeof student?.nextAttestationDate === 'string' ? student.nextAttestationDate : null,
      allNorms: norms,
      athleteForNorms,
      physicalResults: physicalMerged,
      functionalResults: functionalMerged,
      technicalAtoms: atoms,
      technicalData: technicalMerged,
    })
  }

  const handleShareProgress = async () => {
    if (!student?.id) return
    setShareBusy(true)
    try {
      let token = typeof student.progressShareToken === 'string' ? student.progressShareToken : ''
      if (!isValidProgressShareToken(token)) {
        token = generateOpaqueShareToken()
        await updateStudentData(student.id, { progressShareToken: token })
        onStudentUpdated?.({ progressShareToken: token })
      }
      const prevHistory = Array.isArray(student.weightHistory) ? [...student.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      const wCur = Number(anthropometry.weight) || 0
      let histForShare = prevHistory
      if (wCur >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== wCur || last.date !== measureDate) {
          histForShare = [...prevHistory, { date: measureDate, weight: wCur }].slice(-36)
        }
      }
      const sharePayload = await buildSharePayloadForPublic(histForShare)
      await setPublicStudentShareDocument(token, {
        payload: sharePayload,
        ownerCoachIds: ownerCoachIdsForShare,
      })
      const url = `${window.location.origin}/share/${token}`
      setShareUrl(url)
    } catch (e) {
      console.error(e)
      window.alert('Не удалось создать ссылку. Проверьте интернет и вход тренера в этом браузере.')
    } finally {
      setShareBusy(false)
    }
  }

  const copyShareUrl = async () => {
    if (!shareUrl) return
    let copied = false
    try {
      await navigator.clipboard.writeText(shareUrl)
      copied = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        ta.setSelectionRange(0, ta.value.length)
        copied = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        copied = false
      }
    }
    if (!copied) {
      window.prompt('Скопируйте ссылку вручную:', shareUrl)
      return
    }
    setShareFlash(true)
    window.setTimeout(() => setShareFlash(false), 2200)
  }

  const copyShortId = async () => {
    if (!shortIdDigits) return
    try {
      await navigator.clipboard.writeText(shortIdDigits)
      setCopyIdFlash(true)
      window.setTimeout(() => setCopyIdFlash(false), 2000)
      return
    } catch {
      /* fallback */
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = shortIdDigits
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyIdFlash(true)
      window.setTimeout(() => setCopyIdFlash(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const sensitivePeriods = useMemo(
    () => getSensitiveMotorQualities(computeAthleteAgeYears(resolvedBirthYear)),
    [resolvedBirthYear],
  )
  const orderedSensitiveQualities = useMemo(
    () => orderSensitiveQualitiesForBoxing(sensitivePeriods.qualities),
    [sensitivePeriods.qualities],
  )
  const orderedLowImpactQualities = useMemo(
    () => orderSensitiveQualitiesForBoxing(sensitivePeriods.lowImpactQualities),
    [sensitivePeriods.lowImpactQualities],
  )

  const influenceItems = [
    {
      key: 'tech',
      label: 'Техника',
      value: Math.round(weights.T * 100),
    },
    {
      key: 'physical',
      label: 'Физическое развитие',
      value: Math.round(weights.P * 100),
    },
    {
      key: 'functional',
      label: 'Функциональная готовность',
      value: Math.round(weights.F * 100),
    },
  ]
  const maxInfluenceValue = Math.max(...influenceItems.map((item) => item.value))
  const dominantInfluenceKeys = influenceItems
    .filter((item) => item.value === maxInfluenceValue && maxInfluenceValue > 0)
    .map((item) => item.key)
  const tabIdToInfluenceKey = {
    physical: 'physical',
    functional: 'functional',
    technical: 'tech',
  }
  const smartStyleDisplay =
    weights.archetypeSmart === 'Силовой'
      ? 'Ближняя / средняя'
      : weights.archetypeSmart === 'Линейный'
        ? 'Дистанционный'
        : weights.archetypeSmart
  const tacticDistanceDisplay =
    weights.tacticMode === 'infighter'
      ? 'Ближняя'
      : weights.tacticMode === 'outfighter'
        ? 'Дальняя'
        : smartStyleDisplay

  const tabProgress = useMemo(() => {
    const anthropometryFilled = [
      anthropometry.birthYear,
      anthropometry.height,
      anthropometry.weight,
      anthropometry.reach,
      anthropometry.gender,
      anthropometry.date,
    ].filter((v) => String(v ?? '').trim() !== '').length
    const anthropometryPercent = Math.round((anthropometryFilled / 6) * 100)

    const normPercent = (norm, row) => {
      const result = Number(row?.result)
      if (!Number.isFinite(result)) return 0
      const evaluated = evaluateLegacyTest(result, norm)
      if (evaluated.status === 'gold') return 100
      if (evaluated.status === 'silver') return 66
      if (evaluated.status === 'bronze') return 33
      // Ниже нормы: интерполируем внутри диапазона 10-20%
      return Math.round(10 + (Math.max(0, Math.min(60, evaluated.normalizedScore)) / 60) * 10)
    }

    const physicalTotal = physicalNorms.length
    const physicalPercent =
      physicalTotal > 0
        ? Math.round(
            physicalNorms.reduce((acc, norm) => acc + normPercent(norm, getNormValueByTestId(physicalResults, norm.testId)), 0) /
              physicalTotal,
          )
        : 0

    const functionalTotal = functionalNorms.length
    const functionalPercent =
      functionalTotal > 0
        ? Math.round(
            functionalNorms.reduce((acc, norm) => acc + normPercent(norm, getNormValueByTestId(functionalResults, norm.testId)), 0) /
              functionalTotal,
          )
        : 0

    const technicalLevelToPercent = (level) => {
      const key = normalizeTechnicalDominanceKey(level)
      if (key === 'KNOWLEDGE') return 30
      if (key === 'MOTOR_SKILL_LEVEL_1') return 45
      if (key === 'MOTOR_SKILL_LEVEL_2') return 70
      if (key === 'AUTOMATED') return 100
      return 0
    }

    const technicalTotal = technicalAtoms.length
    const technicalPercent =
      technicalTotal > 0
        ? Math.round(
            technicalAtoms.reduce((acc, atom) => acc + technicalLevelToPercent(technicalData[atom.id]?.level), 0) /
              technicalTotal,
          )
        : (() => {
            const entries = Object.values(technicalData || {})
            if (!entries.length) return 0
            return Math.round(
              entries.reduce((acc, item) => acc + technicalLevelToPercent(item?.level), 0) / entries.length,
            )
          })()

    return {
      anthropometry: Math.max(0, Math.min(100, anthropometryPercent)),
      physical: Math.max(0, Math.min(100, physicalPercent)),
      functional: Math.max(0, Math.min(100, functionalPercent)),
      technical: Math.max(0, Math.min(100, technicalPercent)),
    }
  }, [anthropometry, functionalNorms, functionalResults, physicalNorms, physicalResults, technicalAtoms, technicalData])

  const progressColorClass = (value) => {
    if (value <= 30) return 'bg-red-500'
    if (value <= 70) return 'bg-amber-400'
    return 'bg-emerald-500'
  }

  const updateNormResult = (category, norm, rawValue) => {
    const set =
      category === 'physical' ? setPhysicalResults : setFunctionalResults
    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      set((prev) => {
        return removeNormValueByTestId(prev, norm.testId)
      })
      return
    }
    const trimmed = String(rawValue ?? '').trim()

    if (isMinuteSecondNorm(norm)) {
      const complete = parseAnyCompleteMinuteSecond(trimmed)
      if (complete) {
        const result = complete.value
        if (!Number.isFinite(result)) return
        const evaluated = evaluateLegacyTest(result, norm)
        set((prev) => ({
          ...removeNormValueByTestId(prev, norm.testId),
          [norm.testId]: {
            ...evaluated,
            result,
            resultRaw: complete.display,
            date: new Date().toISOString().slice(0, 10),
          },
        }))
        return
      }
      if (isPartialMinuteSecondInput(trimmed)) {
        set((prev) => ({
          ...removeNormValueByTestId(prev, norm.testId),
          [norm.testId]: {
            resultRaw: trimmed,
            date: new Date().toISOString().slice(0, 10),
          },
        }))
        return
      }
      // Дробные минуты с точкой не разбираем здесь — иначе «8.3» при вводе 8.30 станет числом; 8,5 — норма.
      if (trimmed.includes('.') && !parseAnyCompleteMinuteSecond(trimmed)) return
      const numericRaw = trimmed.replace(',', '.')
      const result = Number(numericRaw)
      if (!Number.isFinite(result)) return
      const evaluated = evaluateLegacyTest(result, norm)
      set((prev) => ({
        ...removeNormValueByTestId(prev, norm.testId),
        [norm.testId]: {
          ...evaluated,
          result,
          date: new Date().toISOString().slice(0, 10),
        },
      }))
      return
    }

    const minuteSecond = parseMinuteSecondToMinutes(trimmed)
    const numericRaw = trimmed.replace(',', '.')
    const result = minuteSecond ? minuteSecond.value : Number(numericRaw)
    if (!Number.isFinite(result)) return
    const evaluated = evaluateLegacyTest(result, norm)
    set((prev) => ({
      ...removeNormValueByTestId(prev, norm.testId),
      [norm.testId]: {
        ...evaluated,
        result,
        resultRaw: minuteSecond?.display,
        date: new Date().toISOString().slice(0, 10),
      },
    }))
  }

  const buildStudentUpdatePayload = (
    physicalMerged,
    functionalMerged,
    weightHistoryArg,
    technicalDataOverride = technicalData,
  ) => {
    const height = Number(anthropometry.height) || 0
    const reach = Number(anthropometry.reach) || 0
    const weight = Number(anthropometry.weight) || 0
    const gender = anthropometry.gender === 'F' ? 'F' : 'M'
    const birthYear =
      normalizeBirthYearNumber(anthropometry.birthYear) ||
      normalizeBirthYearNumber(safeStudent.birthYear)
    const mergedAthlete = {
      ...safeStudent,
      height,
      reach,
      weight,
      birthYear,
      gender,
    }
    const nextScores = calculateLegacySectionScores({
      physicalNorms,
      functionalNorms,
      physicalResults: physicalMerged,
      functionalResults: functionalMerged,
      technicalData: technicalDataOverride,
    })
    const w = getWeights(mergedAthlete)
    const kspBundle = calculateKsrAndKsp(mergedAthlete, nextScores)
    const technicalScore = nextScores.техника / 100
    const kdStats = calculateKD(technicalAtoms, technicalDataOverride)
    const effective = calculateEffectiveKSR(kspBundle.baseKSR, kdStats.kd)
    const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)

    return {
      height,
      reach,
      weight,
      gender,
      birthYear,
      birthYearLabel: formatBirthYearRu(birthYear),
      anthropometryDate: measureDate,
      weightHistory: weightHistoryArg,
      tests: {
        physical: physicalMerged,
        functional: functionalMerged,
      },
      technicalData: technicalDataOverride,
      scores: nextScores,
      archetype: w.archetype,
      archetypeSmart: w.archetypeSmart,
      archetypeFull: w.archetypeFull ?? null,
      apeIndex: w.apeIndex,
      baseKSR: kspBundle.baseKSR,
      ksp: kspBundle.ksp,
      kspZ: kspBundle.kspZ,
      kspH: kspBundle.kspH,
      kspIdealHeight: kspBundle.kspIdealHeight ?? null,
      technicalScore,
      trainingProgress: kspBundle.trainingProgress,
      kd: kdStats.kd,
      kdAtomCount: kdStats.atomCount,
      kdAutomationPercent: kdStats.automationPercent,
      effectiveKSR: effective,
    }
  }

  const syncPublicShareIfNeeded = async (weightHistoryArg, testsExact = null) => {
    const shareTok =
      typeof student.progressShareToken === 'string' ? student.progressShareToken : ''
    if (!isValidProgressShareToken(shareTok)) return
    try {
      const sharePayload = await buildSharePayloadForPublic(weightHistoryArg, testsExact)
      await setPublicStudentShareDocument(shareTok, {
        payload: sharePayload,
        ownerCoachIds: ownerCoachIdsForShare,
      })
    } catch (e) {
      console.warn('Не удалось обновить публичную страницу прогресса:', e)
    }
  }

  const resolveCoachDisplayName = async (coachId) => {
    if (!coachId) return 'Тренер'
    try {
      const p = await getCoachProfile(coachId)
      const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim()
      if (name) return name
    } catch {
      /* ignore */
    }
    return 'Тренер'
  }

  /** Антропометрия, весовая история и пересчёт баллов (тесты сливаются с текущими черновиками формы). */
  const handleSaveProfile = async () => {
    if (!student?.id) {
      setAnthropometrySaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    setAnthropometrySaveError('')
    setAnthropometrySaveOk(false)
    setIsAnthropometrySaving(true)
    try {
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setAnthropometrySaveError('Ученик не найден в базе.')
        return
      }
      const physicalMerged = {
        ...emptyTestsRecord(fresh.tests?.physical),
        ...emptyTestsRecord(physicalResults),
      }
      const functionalMerged = {
        ...emptyTestsRecord(fresh.tests?.functional),
        ...emptyTestsRecord(functionalResults),
      }
      const weight = Number(anthropometry.weight) || 0
      const prevHistory = Array.isArray(fresh.weightHistory) ? [...fresh.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      let weightHistory = prevHistory
      if (weight >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== weight || last.date !== measureDate) {
          weightHistory = [...prevHistory, { date: measureDate, weight }].slice(-36)
        }
      }
      const payload = buildStudentUpdatePayload(physicalMerged, functionalMerged, weightHistory)
      await updateStudentData(student.id, payload)
      setPhysicalResults(physicalMerged)
      setFunctionalResults(functionalMerged)
      setAnthropometrySaveOk(true)
      onStudentUpdated?.(payload)
      await syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
    } catch (err) {
      console.error(err)
      setAnthropometrySaveError('Не удалось сохранить. Проверьте интернет и права доступа к базе данных.')
    } finally {
      setIsAnthropometrySaving(false)
    }
  }

  const handleSaveNormAcceptance = async (category, norm) => {
    if (!student?.id) {
      setSaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    const coachId = getCurrentCoachId()
    if (!coachId) {
      setSaveError('Войдите в аккаунт тренера, чтобы зафиксировать норматив.')
      return
    }
    const localRow =
      category === 'physical'
        ? getNormValueByTestId(physicalResults, norm.testId)
        : getNormValueByTestId(functionalResults, norm.testId)
    if (!localRow || !Number.isFinite(localRow.result)) {
      setSaveError('Введите результат норматива перед сохранением.')
      return
    }
    const busyKey = `${category}:${norm.testId}`
    setSaveError('')
    setSaveOk(false)
    setNormSavingKey(busyKey)
    try {
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setSaveError('Ученик не найден в базе.')
        return
      }
      const physicalMerged = {
        ...emptyTestsRecord(fresh.tests?.physical),
        ...emptyTestsRecord(physicalResults),
      }
      const functionalMerged = {
        ...emptyTestsRecord(fresh.tests?.functional),
        ...emptyTestsRecord(functionalResults),
      }
      const bucket = category === 'physical' ? physicalMerged : functionalMerged
      const serverRow = getNormValueByTestId(bucket, norm.testId)
      const coachName = await resolveCoachDisplayName(coachId)
      const evaluated = {
        result: localRow.result,
        resultRaw: localRow.resultRaw,
        normalizedScore: localRow.normalizedScore,
        status: localRow.status,
      }
      const entry = buildNormAcceptanceHistoryEntry({
        norm,
        category,
        coachId,
        coachName,
        evaluated,
      })
      const mergedRow = {
        ...localRow,
        acceptedAt: entry.recordedAt,
        acceptedByCoachId: coachId,
        acceptedByCoachName: coachName,
        acceptanceHistory: mergeNormAcceptanceHistory(serverRow?.acceptanceHistory, entry),
      }
      bucket[norm.testId] = mergedRow

      const weight = Number(anthropometry.weight) || 0
      const prevHistory = Array.isArray(fresh.weightHistory) ? [...fresh.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      let weightHistory = prevHistory
      if (weight >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== weight || last.date !== measureDate) {
          weightHistory = [...prevHistory, { date: measureDate, weight }].slice(-36)
        }
      }

      const payload = buildStudentUpdatePayload(physicalMerged, functionalMerged, weightHistory)
      await updateStudentData(student.id, payload)
      if (category === 'physical') setPhysicalResults(physicalMerged)
      else setFunctionalResults(functionalMerged)
      setSaveOk(true)
      onStudentUpdated?.(payload)
      await syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
    } catch (err) {
      console.error(err)
      setSaveError('Не удалось сохранить норматив.')
    } finally {
      setNormSavingKey('')
    }
  }

  const handleSaveTechnicalAtom = async (atom) => {
    if (!student?.id) {
      setSaveError('Сначала выберите ученика в списке на главной странице.')
      return
    }
    const atomId = atom?.id
    if (!atomId) return
    const busyKey = `technical:${atomId}`
    setSaveError('')
    setSaveOk(false)
    setTechnicalSavingKey(busyKey)
    try {
      const fresh = await getStudentById(student.id)
      if (!fresh) {
        setSaveError('Ученик не найден в базе.')
        return
      }

      const physicalMerged = {
        ...emptyTestsRecord(fresh.tests?.physical),
        ...emptyTestsRecord(physicalResults),
      }
      const functionalMerged = {
        ...emptyTestsRecord(fresh.tests?.functional),
        ...emptyTestsRecord(functionalResults),
      }
      const serverTechnical = emptyTechnicalRecord(fresh.technicalData)
      const localAtom = technicalData[atomId] ?? {}
      const technicalMerged = {
        ...serverTechnical,
        [atomId]: {
          ...(serverTechnical[atomId] ?? {}),
          ...localAtom,
          level: normalizeTechnicalDominanceKey(localAtom.level),
        },
      }

      const weight = Number(anthropometry.weight) || 0
      const prevHistory = Array.isArray(fresh.weightHistory) ? [...fresh.weightHistory] : []
      const measureDate = anthropometry.date || new Date().toISOString().slice(0, 10)
      let weightHistory = prevHistory
      if (weight >= 20) {
        const last = prevHistory[prevHistory.length - 1]
        if (!last || last.weight !== weight || last.date !== measureDate) {
          weightHistory = [...prevHistory, { date: measureDate, weight }].slice(-36)
        }
      }

      const payload = buildStudentUpdatePayload(physicalMerged, functionalMerged, weightHistory, technicalMerged)
      await updateStudentData(student.id, payload)
      setTechnicalData(technicalMerged)
      setSaveOk(true)
      onStudentUpdated?.(payload)
      await syncPublicShareIfNeeded(weightHistory, { physical: physicalMerged, functional: functionalMerged })
    } catch (err) {
      console.error(err)
      setSaveError('Не удалось сохранить техэлемент.')
    } finally {
      setTechnicalSavingKey('')
    }
  }

  const renderNormInputs = (category, norms, values) => {
    if (loadingNorms) {
      return <p className="text-sm text-slate-500">Загрузка нормативов...</p>
    }
    if (norms.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          Нет нормативов для возраста и пола. Укажите год рождения и пол в разделе «Антропометрия».
        </p>
      )
    }
    return norms.map((norm) => {
      const row = getNormValueByTestId(values, norm.testId)
      const displayVal =
        row?.resultRaw ??
        (row?.result !== undefined && row?.result !== null
          ? isMinuteSecondNorm(norm)
            ? formatMinutesToMinuteSecond(row.result)
            : String(row.result)
          : '')
      const inputType = isMinuteSecondNorm(norm) ? 'text' : 'number'
      const goalLabel =
        Number.isFinite(norm.gold)
          ? isMinuteSecondNorm(norm)
            ? formatMinutesToMinuteSecond(norm.gold)
            : String(norm.gold)
          : '—'
      const cardTone = normCardToneByStatus(row?.status)
      const scoreTone = normScoreToneByStatus(row?.status)
      const betterHint =
        norm.measureType === 'MAX' ? 'Чем больше — тем лучше' : 'Чем меньше — тем лучше'
      const acceptedMeta = formatNormAcceptedMeta(row)
      const normBusy = normSavingKey === `${category}:${norm.testId}`
      return (
        <div
          key={norm.testId}
          id={normCardDomId(category, norm.testId)}
          className={`scroll-mt-40 flex flex-col gap-2 rounded-xl border p-4 transition-colors ${cardTone}`}
        >
          <div className="text-center">
            <span className="block text-base font-bold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">{norm.testName}</span>
            {norm.description ? (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-600 sm:text-xs">{norm.description}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0">
            <div className="flex min-w-0 items-center gap-2">
              <NormGoldGoalIcon />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/85">Цель</p>
                <p className="truncate text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {goalLabel}{' '}
                  <span className="text-xs font-semibold text-slate-600">{norm.unit}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <p className="max-w-[11rem] text-right text-[11px] font-medium leading-snug text-slate-700 sm:max-w-none sm:text-xs">
                {betterHint}
              </p>
            </div>
          </div>

          <p className="text-[11px] leading-snug text-slate-500 sm:text-xs">{getCoachInputHint(norm)}</p>
          <div className="flex flex-wrap items-end gap-3 pt-0.5">
            <label className="min-w-[140px] flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Результат ({norm.unit})</span>
              <input
                type={inputType}
                inputMode={inputType === 'text' ? 'numeric' : 'decimal'}
                step={inputType === 'number' ? 'any' : undefined}
                className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={displayVal}
                onChange={(e) => updateNormResult(category, norm, e.target.value)}
              />
            </label>
            {row && Number.isFinite(row.result) ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-600">
                  Оценка в баллах:{' '}
                  <span className={`font-semibold tabular-nums ${scoreTone}`}>{row.normalizedScore}</span>
                </span>
                <NormMedalChip status={row.status} size="sm" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-200/80 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!student?.id || normBusy || !row || !Number.isFinite(row.result)}
                onClick={() => handleSaveNormAcceptance(category, norm)}
                className="rounded-lg border border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {normBusy ? 'Сохранение…' : 'Сохранить норматив'}
              </button>
            </div>
            {acceptedMeta ? (
              <p className="text-[11px] leading-snug text-slate-600">{acceptedMeta}</p>
            ) : (
              <p className="text-[11px] text-slate-400">После сохранения здесь появятся тренер и время фиксации.</p>
            )}
          </div>
        </div>
      )
    })
  }

  const orderedTechnicalAtoms = useMemo(() => orderTechnicalAtomsForProgram(technicalAtoms), [technicalAtoms])

  const technicalLocksById = useMemo(
    () => buildTechnicalLocksById(orderedTechnicalAtoms, technicalData),
    [orderedTechnicalAtoms, technicalData],
  )

  const coachRecommendations = useMemo(
    () =>
      buildCoachRecommendations({
        ageInt: sensitivePeriods.ageInt ?? null,
        sensitive: sensitivePeriods,
        weights,
        kd: kdBundle.kd,
        baseKSR,
        effectiveKSR,
        orderedTechnicalAtoms,
        technicalLocksById,
        technicalData,
        physicalNorms,
        functionalNorms,
        physicalResults,
        functionalResults,
      }),
    [
      sensitivePeriods,
      weights,
      kdBundle.kd,
      baseKSR,
      effectiveKSR,
      orderedTechnicalAtoms,
      technicalLocksById,
      technicalData,
      physicalNorms,
      functionalNorms,
      physicalResults,
      functionalResults,
    ],
  )

  const coachSessionPlanFingerprint = useMemo(() => {
    const formula = coachRecommendations.find(isCoachRecSessionFormula)
    const rows = formula?.rows
    if (!Array.isArray(rows)) return ''
    return JSON.stringify(
      rows.map((r) => [r.key, r.label, r.linkableQuotedQualities ?? null, r.hintLinkTitles ?? null]),
    )
  }, [coachRecommendations])

  const coachDevPlanByRowKey = useMemo(() => {
    if (!coachGenDevPlan?.blocks?.length) return null
    const rec = {}
    for (const b of coachGenDevPlan.blocks) rec[b.rowKey] = b
    return rec
  }, [coachGenDevPlan])

  useEffect(() => {
    setCoachGenDevPlan(null)
    setCoachGenDevNotice('')
  }, [safeStudent?.id, coachSessionPlanFingerprint])

  const handleGenerateCoachDevExercises = useCallback(() => {
    setCoachGenDevNotice('')
    const formula = coachRecommendations.find(isCoachRecSessionFormula)
    if (!formula?.rows?.length) return
    const ageInt = sensitivePeriods.ageInt ?? null
    const blocks = buildCoachDevelopmentExercisePlan(formula.rows, ageInt)
    if (!blocks.length) {
      setCoachGenDevPlan(null)
      setCoachGenDevNotice(
        'В плане нет этапов «Упражнения на развитие» с привязкой к качеству — укажите год рождения или проверьте возраст (до 7 лет таблица сенситивных периодов не используется).',
      )
      return
    }
    setCoachGenDevPlan({ blocks })
  }, [coachRecommendations, sensitivePeriods.ageInt])

  const motorQualityReturnState = useMemo(() => {
    if (!safeStudent?.id) return null
    return {
      returnPath: '/',
      studentName: displayNameFromStudent(safeStudent) || undefined,
    }
  }, [safeStudent])

  const goToCoachTechnicalElement = useCallback((atomId) => {
    if (atomId == null || atomId === '') return
    setActiveTab('technical')
    setPendingNormFocus(null)
    setPendingTechnicalFocusId(String(atomId))
  }, [])

  const goToCoachNormative = useCallback((section, testId) => {
    if (!section || testId == null || testId === '') return
    if (section !== 'physical' && section !== 'functional') return
    setPendingTechnicalFocusId(null)
    setActiveTab(section)
    setPendingNormFocus({ section, testId: String(testId) })
  }, [])

  useLayoutEffect(() => {
    if (activeTab !== 'technical') {
      setPendingTechnicalFocusId((p) => (p == null ? p : null))
    } else if (pendingTechnicalFocusId != null) {
      const atomId = pendingTechnicalFocusId
      requestAnimationFrame(() => {
        document.getElementById(`technical-atom-${atomId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      setPendingTechnicalFocusId(null)
    }
  }, [activeTab, pendingTechnicalFocusId])

  useLayoutEffect(() => {
    if (activeTab !== 'physical' && activeTab !== 'functional') {
      setPendingNormFocus((p) => (p == null ? p : null))
      return
    }
    if (pendingNormFocus == null) return
    if (pendingNormFocus.section !== activeTab) return
    const { section, testId } = pendingNormFocus
    requestAnimationFrame(() => {
      document.getElementById(normCardDomId(section, testId))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    setPendingNormFocus(null)
  }, [activeTab, pendingNormFocus])

  return (
    <main className="min-h-screen bg-slate-50 px-2 py-5 text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto min-w-0 max-w-4xl space-y-3 sm:space-y-6">
        <div
          className="sticky top-14 z-30 -mx-2 flex min-w-0 items-center gap-2 border-b border-slate-200 bg-white/95 py-2.5 pr-2 pl-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:border-slate-600 dark:bg-slate-900/95 sm:top-[72px] sm:-mx-6 sm:gap-3 sm:px-6"
          aria-label="Карточка ученика — закреплённая строка"
        >
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-lg border border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-50 sm:px-4 sm:py-2 sm:text-sm"
          >
            Назад к дашборду
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
            {safeStudent.name}
          </p>
        </div>

        <section className="rounded-xl bg-white dark:bg-slate-900 p-2.5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl sm:tracking-normal">
              {safeStudent.name}
            </h1>
            {student?.id && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="text-slate-500">Личный код:</span>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {shortIdDigits ? formatShortIdDisplay(shortIdDigits) : '—'}
                </span>
                <button
                  type="button"
                  disabled={!shortIdDigits}
                  onClick={copyShortId}
                  title="Скопировать шесть цифр без пробелов — чтобы передать другому тренеру"
                  aria-label="Скопировать личный код ученика"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={shareBusy || !student?.id}
                  onClick={handleShareProgress}
                  title="Поделиться прогрессом"
                  aria-label="Поделиться прогрессом"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 ${
                    shareFlash
                      ? 'border-emerald-300 text-emerald-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                  </svg>
                </button>
                {copyIdFlash && (
                  <span className="text-xs font-medium text-emerald-700">Скопировано</span>
                )}
              </div>
            )}
          </div>
          {shortIdAssignError && (
            <p className="mt-2 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {shortIdAssignError}
            </p>
          )}
          {shareUrl && (
            <button
              type="button"
              onClick={copyShareUrl}
              title="Нажмите, чтобы скопировать ссылку"
              aria-label="Скопировать ссылку прогресса"
              className={`mt-3 w-full rounded-lg border px-3 py-2 text-left text-xs break-all transition ${
                shareFlash
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {shareUrl}
            </button>
          )}
          {coachRecommendations.length > 0 &&
            (() => {
              const formula = coachRecommendations.find(isCoachRecSessionFormula)
              if (!formula) return null
              return (
                <div className="mt-3 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 sm:mt-4 sm:px-4 sm:py-3">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Предложенная тренировка</p>
                      {sensitivePeriods.ageInt != null && Number.isFinite(sensitivePeriods.ageInt) ? (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Подбор упражнений учитывает возраст:{' '}
                          <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                            {sensitivePeriods.ageInt} полных лет
                          </span>
                          {coachGenDevPlan?.blocks?.length ? (
                            <span className="text-slate-500 dark:text-slate-500">
                              {' '}
                              (до {developmentExerciseSlotCountForAge(sensitivePeriods.ageInt)} на каждое качество)
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Без года рождения подбор идёт в режиме «до 2 упражнений на качество».
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateCoachDevExercises}
                      className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 shadow-sm hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700 sm:text-sm"
                    >
                      Сгенерировать
                    </button>
                  </div>
                  {coachGenDevNotice ? (
                    <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                      {coachGenDevNotice}
                    </p>
                  ) : null}
                  <CoachSessionPlanTable
                    item={formula}
                    qualityReturnState={motorQualityReturnState}
                    onGoToTechnicalAtom={goToCoachTechnicalElement}
                    onGoToNormative={goToCoachNormative}
                    developmentByRowKey={coachDevPlanByRowKey}
                  />
                </div>
              )
            })()}
        </section>

        <section className="rounded-xl bg-white dark:bg-slate-900 p-2.5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Тесты и техника</h2>
          <div
            className="mt-2 flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950 shadow-sm sm:px-4"
            role="note"
          >
            <span className="select-none text-lg leading-none text-amber-600" aria-hidden>
              ⚠️
            </span>
            <p className="min-w-0 leading-snug">
              Каждый норматив сохраняется отдельной кнопкой на карточке — это фиксирует результат и запись в истории для будущих графиков. Антропометрию и технику сохраняйте кнопкой внизу блока.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Степень влияния на реализацию потенциала
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-600">
              Для этого спортсмена при расчёте балла сильнее всего тянет раздел с наибольшим процентом; остальные
              разделы дают меньший вклад.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[...influenceItems]
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const isTop = item.value === maxInfluenceValue && maxInfluenceValue > 0
                  return (
                    <div
                      key={item.key}
                      className={`rounded-lg border px-3 py-2.5 transition-shadow ${
                        isTop
                          ? 'border-emerald-300 bg-emerald-50 shadow-md ring-1 ring-emerald-200'
                          : 'border-slate-200 bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs ${isTop ? 'font-semibold text-emerald-950' : 'font-medium text-slate-700'}`}>
                          {item.label}
                        </span>
                        <span className={`shrink-0 text-sm font-bold tabular-nums ${isTop ? 'text-emerald-800' : 'text-slate-800'}`}>
                          {item.value}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-colors ${progressColorClass(item.value)}`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:flex md:flex-nowrap md:gap-4">
            {TAB_ITEMS.map((tab) => {
              const infKey = tabIdToInfluenceKey[tab.id]
              const isTopInfluenceTab = infKey && dominantInfluenceKeys.includes(infKey)
              return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group relative min-h-[116px] rounded-xl border bg-[#1A1A1A] px-3 py-3 text-left text-[#E8E8E8] transition-all duration-300 sm:min-h-[124px] sm:px-4 sm:py-4 md:min-h-[132px] md:flex-1 ${
                  activeTab === tab.id
                    ? 'border-[#E8E8E8] shadow-[0_0_0_1px_rgba(232,232,232,0.18)]'
                    : 'border-[#333333] hover:border-[#E8E8E8] hover:shadow-[0_0_14px_rgba(232,232,232,0.2)]'
                } ${
                  isTopInfluenceTab
                    ? 'ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-white md:min-h-[138px]'
                    : ''
                }`}
              >
                <span
                  className={`absolute inset-x-0 bottom-0 h-1 rounded-b-xl transition-all duration-300 ${
                    activeTab === tab.id ? 'bg-[#E8E8E8]' : 'bg-transparent'
                  }`}
                  aria-hidden
                />
                <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#333333] bg-[#222222] sm:mb-3 sm:h-10 sm:w-10">
                  {TAB_ICONS[tab.id]}
                </span>
                <span
                  className="block text-[14px] uppercase leading-tight tracking-normal sm:text-[16px] md:text-[18px] md:tracking-wide"
                  style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif' }}
                >
                  {tab.label}
                </span>
                <span className="mt-2 block text-[11px] text-[#A8A8A8] sm:mt-3 sm:text-xs">
                  {TAB_PROGRESS_LABELS[tab.id]}: {tabProgress[tab.id] ?? 0}%
                </span>
                <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[#2A2A2A]" aria-hidden>
                  <span
                    className={`block h-full transition-all duration-300 ${progressColorClass(tabProgress[tab.id] ?? 0)}`}
                    style={{ width: `${tabProgress[tab.id] ?? 0}%` }}
                  />
                </span>
              </button>
              )
            })}
          </div>

          <div className="mt-6 space-y-6">
            {activeTab === 'anthropometry' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Антропометрия</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Год рождения</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min={1900}
                        max={new Date().getFullYear()}
                        placeholder="например, 2012"
                        className="w-full max-w-[200px] rounded-lg border border-slate-200 px-3 py-2"
                        value={anthropometry.birthYear}
                        onChange={(e) =>
                          setAnthropometry((prev) => ({ ...prev, birthYear: e.target.value }))
                        }
                      />
                      <span className="text-sm text-slate-600">
                        {formatBirthYearRu(anthropometry.birthYear) || '—'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Возраст в расчётах: текущий год минус год рождения.
                    </span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Рост (см)</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.height}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, height: e.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Вес (кг)</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.weight}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, weight: e.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Размах рук (см)</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.reach}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, reach: e.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Пол (для подбора норм тестов)</span>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.gender}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, gender: e.target.value }))
                      }
                    >
                      <option value="M">Мужской</option>
                      <option value="F">Женский</option>
                    </select>
                  </label>
                  <label className="md:col-span-2 space-y-2">
                    <span className="text-sm font-medium text-slate-700">Дата измерения</span>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={anthropometry.date}
                      onChange={(e) =>
                        setAnthropometry((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-5">
                  {anthropometrySaveError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {anthropometrySaveError}
                    </div>
                  )}
                  {anthropometrySaveOk && !anthropometrySaveError && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                      Антропометрия и расчётные поля сохранены в облаке.
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isAnthropometrySaving || !student?.id}
                    onClick={handleSaveProfile}
                    className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto sm:py-2.5"
                  >
                    {isAnthropometrySaving ? 'Сохранение…' : 'Сохранить антропометрию'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'physical' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Физическое развитие</h3>
                <div className="grid gap-4">{renderNormInputs('physical', physicalNorms, physicalResults)}</div>
              </div>
            )}

            {activeTab === 'functional' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Функциональная готовность</h3>
                <div className="grid gap-4">{renderNormInputs('functional', functionalNorms, functionalResults)}</div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-800">Техника</h3>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900">
                  Предложенные технические элементы и видеоматериалы носят рекомендательный методический характер и
                  не являются единственно верным стандартом исполнения. В зависимости от школы бокса допустимы
                  различия в технике и акцентах обучения. Приоритетным является соблюдение последовательности
                  освоения: переход к следующему элементу осуществляется после уверенного закрепления предыдущего.
                  Видео используется как дополнительный визуальный инструмент по усмотрению тренера.
                </div>
                {technicalAtoms.length === 0 && !loadingNorms ? (
                  <p className="text-sm text-slate-500">
                    Список ударов из общей таблицы не загрузился — проверьте интернет и откройте страницу позже.
                  </p>
                ) : (
                  orderedTechnicalAtoms.map((atom) => {
                    const atomLevelKey = normalizeTechnicalDominanceKey(technicalData[atom.id]?.level)
                    const isLockedBySequence = Boolean(technicalLocksById[atom.id])
                    return (
                    <article
                      key={atom.id}
                      id={`technical-atom-${atom.id}`}
                      className={`scroll-mt-40 rounded-lg border bg-white p-3 shadow-sm ${
                        isLockedBySequence ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-1.5 border-b border-slate-100 pb-2">
                        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                          <span className="tabular-nums text-slate-500">#{atom.number}</span> {atom.name}
                        </h3>
                        {isLockedBySequence && (
                          <span
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-sm text-amber-800"
                            title="Элемент закрыт до уровня «Умение» на предыдущем"
                            aria-label="Элемент закрыт"
                          >
                            🔒
                          </span>
                        )}
                        {atom.embedUrl && (
                          <button
                            type="button"
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
                              openTechnicalVideoId === atom.id
                                ? 'border-blue-300 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                            title="Видеоматериал (опционально)"
                            aria-label="Показать или скрыть видео"
                            aria-expanded={openTechnicalVideoId === atom.id}
                            onClick={() =>
                              setOpenTechnicalVideoId((id) => (id === atom.id ? null : atom.id))
                            }
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M8 5v14l11-7L8 5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {atom.embedUrl && openTechnicalVideoId === atom.id && (
                        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 p-2">
                          <div className="relative w-full pt-[177.78%]">
                            <iframe
                              src={atom.embedUrl}
                              title={`Видео: ${atom.name}`}
                              className="absolute left-0 top-0 h-full w-full"
                              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                              allowFullScreen
                              loading="lazy"
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-2">
                        <label className="min-w-0 space-y-0.5">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Уровень освоения
                          </span>
                          <select
                            className="w-full rounded-md border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            value={atomLevelKey}
                            disabled={isLockedBySequence}
                            onChange={(event) =>
                              isLockedBySequence
                                ? null
                                :
                              setTechnicalData((prev) => ({
                                ...prev,
                                [atom.id]: { ...(prev[atom.id] ?? {}), level: event.target.value },
                              }))
                            }
                          >
                            {TECH_DOMINANCE_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="mt-2 block space-y-0.5">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Комментарий тренера
                        </span>
                        <textarea
                          rows={2}
                          className="w-full resize-y rounded-md border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Заметки по элементу…"
                          value={technicalData[atom.id]?.comment ?? ''}
                          disabled={isLockedBySequence}
                          onChange={(event) =>
                            isLockedBySequence
                              ? null
                              :
                            setTechnicalData((prev) => ({
                              ...prev,
                              [atom.id]: { ...(prev[atom.id] ?? {}), comment: event.target.value },
                            }))
                          }
                        />
                      </label>
                      {isLockedBySequence && (
                        <p className="mt-2 rounded-md border border-amber-200 bg-amber-100/70 px-2.5 py-1.5 text-xs font-medium text-amber-900">
                          Элемент под замком. Чтобы открыть его, предыдущий элемент должен быть на уровне «Умение».
                        </p>
                      )}
                      <div className="mt-2 border-t border-slate-100 pt-2">
                        <button
                          type="button"
                          disabled={!student?.id || isLockedBySequence || technicalSavingKey === `technical:${atom.id}`}
                          onClick={() => handleSaveTechnicalAtom(atom)}
                          className="w-full rounded-lg border border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {technicalSavingKey === `technical:${atom.id}` ? 'Сохранение…' : 'Сохранить элемент'}
                        </button>
                      </div>

                      <details className="mt-1.5 text-xs text-slate-600">
                        <summary className="cursor-pointer font-medium text-blue-600">Подсказка и детали</summary>
                        <p className="mt-2">
                          <strong>Как надо:</strong> {atom.howTo}
                        </p>
                        <p className="mt-1">
                          <strong>Почему:</strong> {atom.whyHowTo}
                        </p>
                        <p className="mt-1">
                          <strong>Ошибки:</strong> {atom.mistakes}
                        </p>
                        <p className="mt-1">
                          <strong>Почему ошибка:</strong> {atom.whyMistakes}
                        </p>
                      </details>
                    </article>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {(saveError || saveOk) && (
            <div className="mt-8 border-t border-slate-200 pt-5">
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}
              {saveOk && !saveError && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Сохранено. Данные ученика в облаке обновлены.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white dark:bg-slate-900 p-2.5 shadow-sm sm:p-8">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex flex-col gap-2 bg-slate-900 px-2.5 py-2.5 text-white sm:px-4 sm:py-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-500 bg-slate-800 sm:inline-flex"
                  aria-hidden
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                  </svg>
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                  Историческая модель эталона
                </p>
                <span className="group relative hidden shrink-0 sm:inline-flex">
                  <button
                    type="button"
                    onClick={() => setStandardInfoOpen((prev) => !prev)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-300 bg-blue-500/20 text-sm font-bold leading-none text-blue-100 hover:bg-blue-500/30"
                    aria-label="Информация об исторической модели эталона"
                    aria-expanded={standardInfoOpen}
                    title="В этой весовой и возрастной категории спортсмены именно с такой антропометрией чаще всего становились победителями в соревнованиях высокой квалификации (усредн.)"
                  >
                    i
                  </button>
                  <span
                    className={`absolute left-1/2 top-[calc(100%+8px)] z-20 w-[min(calc(100vw-2rem),290px)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg ${
                      standardInfoOpen ? 'block' : 'hidden group-hover:block'
                    }`}
                  >
                    В этой весовой и возрастной категории спортсмены именно с такой антропометрией чаще всего становились победителями в соревнованиях высокой квалификации (усредн.)
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setStandardInfoOpen((prev) => !prev)}
                aria-expanded={standardInfoOpen}
                aria-label="Информация об исторической модели эталона"
                className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-blue-400/50 bg-blue-500/25 py-3.5 text-lg font-bold tracking-[0.2em] text-blue-50 transition hover:bg-blue-500/35 active:bg-blue-500/40 sm:hidden"
              >
                <span aria-hidden>i</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 transition-transform duration-300 ${standardInfoOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out sm:hidden ${
                  standardInfoOpen ? 'max-h-[min(320px,55vh)] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="border-t border-slate-600/80 pt-3">
                  <p className="text-xs leading-relaxed text-slate-300">
                    В этой весовой и возрастной категории спортсмены именно с такой антропометрией чаще всего становились победителями в соревнованиях высокой квалификации (усредн.)
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white px-2 py-3 sm:px-4 sm:py-4">
              <div className="flex flex-col gap-3">
                <div className="order-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 sm:py-3 md:order-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Дуэль: спортсмен vs эталон</p>
                <div className="mt-2 overflow-hidden rounded-md border border-slate-200 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:text-[10px] sm:uppercase sm:tracking-wide">
                  <div className="flex flex-col sm:hidden">
                    <div className="bg-blue-100 px-2 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-900/90">Спортсмен</p>
                      <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-blue-950">
                        {safeStudent.name || 'Спортсмен'}
                      </p>
                    </div>
                    <div className="flex justify-center bg-slate-800 py-1.5 text-xs font-bold tracking-widest text-white">
                      VS
                    </div>
                    <div className="bg-red-100 px-2 py-2 text-center">
                      <p className="text-sm font-semibold text-red-900">Эталон</p>
                    </div>
                  </div>
                  <div className="hidden min-w-0 bg-blue-100 px-2 py-2 font-semibold text-blue-900 sm:block sm:px-3 sm:py-1">
                    <span className="break-words">{safeStudent.name || 'Спортсмен'}</span>
                  </div>
                  <div className="hidden bg-slate-800 px-2 py-1 text-center font-semibold text-white sm:block">VS</div>
                  <div className="hidden bg-red-100 px-2 py-1 text-right font-semibold text-red-900 sm:block sm:px-3">
                    Эталон
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {duelRows.map((row) => {
                    const tone =
                      !Number.isFinite(row.delta) || row.delta === 0
                        ? 'text-slate-700'
                        : row.delta > 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                    const toneOnDark =
                      !Number.isFinite(row.delta) || row.delta === 0
                        ? 'text-white'
                        : row.delta > 0
                          ? 'text-emerald-300'
                          : 'text-red-300'
                    const athleteStr =
                      Number.isFinite(row.athleteValue) && row.athleteValue > 0
                        ? `${row.athleteValue} ${row.unit}`
                        : '—'
                    const refStr =
                      Number.isFinite(row.referenceValue) && row.referenceValue > 0
                        ? `${row.referenceValue} ${row.unit}`
                        : '—'
                    const deltaStr = Number.isFinite(row.delta)
                      ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)} ${row.unit}`
                      : '—'
                    return (
                      <div key={row.key} className="overflow-hidden rounded-md border border-slate-200 text-xs">
                        <div className="p-2.5 sm:hidden">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                          <div className="mt-2 flex justify-between gap-3 border-b border-slate-100 pb-2">
                            <span className="shrink-0 text-slate-600">Спортсмен</span>
                            <span className="min-w-0 text-right font-semibold tabular-nums text-blue-900">{athleteStr}</span>
                          </div>
                          <div className="mt-2 flex justify-between gap-3 border-b border-slate-100 pb-2">
                            <span className="shrink-0 text-slate-600">Эталон</span>
                            <span className="min-w-0 text-right font-semibold tabular-nums text-red-900">{refStr}</span>
                          </div>
                          <div className="mt-3 rounded-md bg-slate-900 px-2 py-2.5 text-center">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400">Разница</span>
                            <p className={`mt-0.5 text-sm font-semibold tabular-nums ${toneOnDark}`}>{deltaStr}</p>
                          </div>
                        </div>
                        <div className="hidden min-w-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:text-xs">
                          <div className="min-w-0 bg-blue-50 px-2 py-2 text-blue-900 sm:px-3">
                            <p className="font-medium text-slate-700">{row.label}</p>
                            <p className="mt-0.5 font-semibold tabular-nums">
                              {Number.isFinite(row.athleteValue) && row.athleteValue > 0 ? row.athleteValue : '—'}{' '}
                              {row.unit}
                            </p>
                          </div>
                          <div className="flex min-w-[4.25rem] flex-col items-center justify-center bg-slate-900 px-1.5 text-white sm:min-w-[4.5rem] sm:px-2">
                            <span className="text-[9px] uppercase tracking-wider text-slate-300 sm:text-[10px]">
                              delta
                            </span>
                            <span className={`text-center text-[11px] font-semibold tabular-nums leading-tight sm:text-xs ${tone}`}>
                              {Number.isFinite(row.delta) ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)} ${row.unit}` : '—'}
                            </span>
                          </div>
                          <div className="min-w-0 bg-red-50 px-2 py-2 text-right text-red-900 sm:px-3">
                            <p className="font-medium text-slate-700">{row.label}</p>
                            <p className="mt-0.5 font-semibold tabular-nums">
                              {Number.isFinite(row.referenceValue) && row.referenceValue > 0 ? row.referenceValue : '—'}{' '}
                              {row.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
                <div className="order-2 grid gap-2 sm:gap-3 md:order-1 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 md:hidden">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Паспорт эталона</p>
                    <p className="mt-1 text-xs text-slate-700">
                      Весовая: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardWeightCategory} кг</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Возрастная: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardAgeGroup}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Архетип эталона: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardArchetype}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      Рост: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceHeight || '—'} см</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Размах: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceReach || '—'} см</span>
                    </p>
                  </div>
                  <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 md:block">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Паспорт эталона</p>
                    <p className="mt-1 text-xs text-slate-700">
                      Весовая: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardWeightCategory} кг</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Возрастная: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardAgeGroup}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Архетип эталона: <span className="font-semibold text-slate-900 dark:text-slate-100">{standardArchetype}</span>
                    </p>
                  </div>
                  <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 sm:px-3 md:block">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Эталонные параметры</p>
                    <p className="mt-1 text-xs text-slate-700">
                      Рост: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceHeight || '—'} см</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      Размах: <span className="font-semibold text-slate-900 dark:text-slate-100">{referenceReach || '—'} см</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 sm:px-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Рекомендация для спортсмена</p>
                    <p className="mt-1 text-sm font-semibold text-blue-700">{tacticDistanceDisplay || '—'}</p>
                    <p className="text-[11px] text-slate-600">Эффективная дистанция боя</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {weights.tacticMode === 'infighter' && weights.tacticAdvice && (
            <div
              className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-900 sm:px-4 sm:py-3"
              role="alert"
            >
              {weights.tacticAdvice}
            </div>
          )}
          {weights.tacticMode === 'outfighter' && weights.tacticAdvice && (
            <div
              className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-900 sm:px-4 sm:py-3"
              role="status"
            >
              {weights.tacticAdvice}
            </div>
          )}
          <div className="mt-4 sm:mt-6">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-3 sm:px-5 sm:py-4">
              <p className="text-sm font-medium leading-snug text-amber-900">
                Спортивный биометрический потенциал на базе математических расчётов
              </p>
              <BiometricPotentialBar className="mt-4" kspPercent={kspPercent} basePercent={basePercent} />
              {(ksrKsp?.kspDetail?.heightDelta != null || ksrKsp?.kspDetail?.reachDelta != null) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      Number(ksrKsp?.kspDetail?.heightDelta ?? 0) >= 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    <p className="font-semibold">Рост vs эталон</p>
                    <p>
                      {Number(ksrKsp?.kspDetail?.heightDelta ?? 0) >= 0 ? '+' : ''}
                      {Number(ksrKsp?.kspDetail?.heightDelta ?? 0).toFixed(1)} см
                    </p>
                  </div>
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      Number(ksrKsp?.kspDetail?.reachDelta ?? 0) >= 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    <p className="font-semibold">Размах vs эталон</p>
                    <p>
                      {Number(ksrKsp?.kspDetail?.reachDelta ?? 0) >= 0 ? '+' : ''}
                      {Number(ksrKsp?.kspDetail?.reachDelta ?? 0).toFixed(1)} см
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {normsError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {normsError}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">
              Сенситивный период для{' '}
              <span className="text-slate-800">
                «{displayNameFromStudent(safeStudent) || safeStudent.name || 'Спортсмен'}»
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setSensitivePeriodExpanded((prev) => !prev)}
              aria-expanded={sensitivePeriodExpanded}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-100"
            >
              <span>{sensitivePeriodExpanded ? 'Скрыть' : 'Показать'}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-500 ${sensitivePeriodExpanded ? 'rotate-180' : ''}`}
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${
              sensitivePeriodExpanded ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-600">
                Ориентир по научным таблицам: в зелёном списке качества, которые в этом возрасте «лучше всего ложатся».
                Красный список — всё остальное из таблицы: тренировать можно, но прирост обычно не такой быстрый.
              </p>
              {sensitivePeriods.reason === 'no_birth_year' && (
                <p className="mt-3 text-sm text-slate-600">
                  Укажите год рождения в разделе «Антропометрия» — тогда список сформируется автоматически.
                </p>
              )}
              {sensitivePeriods.reason === 'below_table' && (
                <p className="mt-3 text-sm text-slate-600">
                  Таблица «что в каком возрасте лучше тренировать» начинается с 7 лет. Сейчас в расчётах:{' '}
                  {sensitivePeriods.ageInt ?? '—'} {sensitivePeriods.ageInt != null ? 'полных лет' : ''}.
                </p>
              )}
              {sensitivePeriods.reason === 'ok' && (
                <>
                  <p className="mt-3 text-sm text-slate-700">
                    Возраст в расчётах:{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{sensitivePeriods.ageInt} лет</span>
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm ring-1 ring-emerald-100">
                      <p className="text-sm font-semibold text-emerald-950">Сейчас удобнее всего развивать:</p>
                      {sensitivePeriods.qualities.length === 0 ? (
                        <p className="mt-3 text-sm text-emerald-900/80">
                          Для этого возраста в таблице нет отдельной строки.
                        </p>
                      ) : (
                        <ul className="mt-3 list-none space-y-2 text-sm text-emerald-950">
                          {orderedSensitiveQualities.map((q) => (
                            <li
                              key={q}
                              className="flex gap-2 rounded-lg border border-emerald-200/80 bg-white/70 px-3 py-2 dark:border-emerald-800/60 dark:bg-emerald-950/40"
                            >
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 shadow-sm ring-1 ring-red-100">
                      <p className="text-sm font-semibold text-red-950">
                        Остальные качества из таблицы (прирост обычно слабее):
                      </p>
                      {sensitivePeriods.lowImpactQualities.length === 0 ? (
                        <p className="mt-3 text-sm text-red-900/80">Все строки таблицы сейчас в «зелёной» зоне.</p>
                      ) : (
                        <ul className="mt-3 list-none space-y-2 text-sm text-red-950">
                          {orderedLowImpactQualities.map((q) => (
                            <li
                              key={q}
                              className="flex gap-2 rounded-lg border border-red-200/80 bg-white/70 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30"
                            >
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400" aria-hidden />
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Коэффициент доминантности техники (КД):{' '}
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {(kdBundle.kd * 100).toFixed(1)}%
            </span>
          </p>
          <p className="mt-2 text-sm leading-snug text-slate-700">
            Среднее коэффициентов по уровням освоения элементов техники; на него умножается базовый КСР, чтобы получить эффективный КСР.
          </p>
        </div>
      </div>
    </main>
  )
}

export default StudentPage
