import { useCallback, useEffect, useMemo, useState } from 'react'
import { BackToHomeBar } from '../components/layout/BackToHomeLink.jsx'
import { useCoachStudents } from '../hooks/useCoachStudents.js'
import {
  adminMergeStudentCards,
  attachCoachToStudent,
  detachCoachFromStudent,
  getAllCoaches,
  getStudentById,
} from '../services/adminStudentsService.js'
import { loadNormsOnce } from '../data/normsCache.js'
import { getTechnicalProgramAtomsCache } from '../data/technicalProgramAtomsCache.js'
import { loadTechnicalProgramAtomsOnce } from '../services/technicalProgramAtomsService.js'
import { displayCoachLabel } from '../utils/coachDisplay.js'
import { collectStudentCoachIds, summarizeMergePlan } from '../utils/studentMergeUtils.js'
import {
  displayNameFromStudent,
  formatBirthYearRu,
  formatShortIdDisplay,
  isStudentAttachedToCoach,
} from '../utils/studentModel.js'
import { vk } from '../utils/vkUi.js'

function normalizeSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
}

function AdminMergePanel({ students, coachId, onOpenStudent }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [primaryId, setPrimaryId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const filtered = useMemo(() => {
    const q = normalizeSearch(search)
    const list = [...students].sort((a, b) =>
      displayNameFromStudent(a).localeCompare(displayNameFromStudent(b), 'ru'),
    )
    if (!q) return list
    return list.filter((s) => normalizeSearch(displayNameFromStudent(s)).includes(q))
  }, [students, search])

  const selectedList = useMemo(
    () => students.filter((s) => selected.has(s.id)),
    [students, selected],
  )

  const primary = selectedList.find((s) => s.id === primaryId) ?? selectedList[0]
  const secondaries = selectedList.filter((s) => s.id !== primary?.id)

  const preview = useMemo(() => {
    if (!primary || secondaries.length === 0) return null
    return summarizeMergePlan(primary, secondaries)
  }, [primary, secondaries])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSuccess('')
    setError('')
  }

  useEffect(() => {
    if (!primaryId && selectedList.length > 0) {
      setPrimaryId(selectedList[0].id)
    }
    if (primaryId && !selected.has(primaryId) && selectedList.length > 0) {
      setPrimaryId(selectedList[0].id)
    }
  }, [selected, selectedList, primaryId])

  const runMerge = async () => {
    if (!primary?.id || secondaries.length === 0) {
      setError('Отметьте минимум две карточки и выберите основную.')
      return
    }
    const label = displayNameFromStudent(primary)
    if (
      !window.confirm(
        `Объединить ${secondaries.length} карточ(ку/ки/ек) в «${label}»? Дубликаты будут удалены безвозвратно.`,
      )
    ) {
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const [allNorms, atoms] = await Promise.all([
        loadNormsOnce().catch(() => []),
        loadTechnicalProgramAtomsOnce()
          .then(() => getTechnicalProgramAtomsCache().level1)
          .catch(() => []),
      ])
      await adminMergeStudentCards({
        primaryId: primary.id,
        secondaryIds: secondaries.map((s) => s.id),
        allNorms,
        technicalAtoms: atoms,
      })
      setSelected(new Set([primary.id]))
      setPrimaryId(primary.id)
      setSuccess(`Слияние выполнено. Удалено дубликатов: ${secondaries.length}.`)
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Не удалось выполнить слияние.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className={vk.muted}>
        Отметьте дубликаты, выберите <strong className="font-medium text-[#2c2d2e]">основную</strong> карточку — в неё
        перенесутся тесты, техника, сезон, журнал качеств и все тренеры. Остальные документы удаляются.
      </p>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по ФИО…"
        className={vk.input}
      />

      <div className={`max-h-[min(50vh,420px)] overflow-y-auto rounded-[10px] border border-[#e7e8ec] ${vk.cardFlat}`}>
        <ul className="divide-y divide-[#e7e8ec]">
          {filtered.map((student) => {
            const checked = selected.has(student.id)
            const isPrimary = primaryId === student.id && checked
            const code =
              student.short_id != null && Number.isFinite(Number(student.short_id))
                ? formatShortIdDisplay(Number(student.short_id))
                : null
            return (
              <li key={student.id} className="flex flex-wrap items-center gap-2 px-2.5 py-2 sm:px-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(student.id)}
                  className="h-4 w-4 shrink-0"
                  aria-label={`Выбрать ${displayNameFromStudent(student)}`}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-[14px] font-medium text-[#2c2d2e] active:opacity-80"
                  onClick={() => onOpenStudent?.(student)}
                >
                  {displayNameFromStudent(student)}
                  {formatBirthYearRu(student.birthYear) ? (
                    <span className="ml-1 font-normal text-[#818c99]">
                      · {formatBirthYearRu(student.birthYear)}
                    </span>
                  ) : null}
                  {code ? (
                    <span className="ml-1 font-normal tabular-nums text-[#818c99]">· {code}</span>
                  ) : null}
                  {coachId && !isStudentAttachedToCoach(student, coachId) ? (
                    <span className="ml-1 text-[11px] font-normal text-amber-800">· чужая</span>
                  ) : null}
                </button>
                {checked && selected.size >= 2 ? (
                  <label className="flex shrink-0 items-center gap-1 text-[12px] text-[#818c99]">
                    <input
                      type="radio"
                      name="merge-primary"
                      checked={isPrimary}
                      onChange={() => setPrimaryId(student.id)}
                    />
                    основная
                  </label>
                ) : null}
              </li>
            )
          })}
        </ul>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-[13px] text-[#818c99]">Никого не найдено.</p>
        ) : null}
      </div>

      {preview ? (
        <div className={`${vk.card} border border-[#e7e8ec]`}>
          <p className="text-[14px] font-semibold text-[#2c2d2e]">Превью слияния</p>
          <p className={`mt-1 ${vk.muted}`}>
            Основная: <strong className="text-[#2c2d2e]">{preview.primaryName}</strong>
          </p>
          <p className={vk.muted}>Дубликаты: {preview.secondaryNames.join(', ')}</p>
          <p className={vk.muted}>Тренеров после слияния: {preview.coachCount}</p>
        </div>
      ) : null}

      {error ? <p className={vk.error}>{error}</p> : null}
      {success ? <p className="text-[13px] font-medium text-[#4bb34b]">{success}</p> : null}

      <button
        type="button"
        disabled={busy || selected.size < 2}
        onClick={runMerge}
        className={vk.btnPrimary}
      >
        {busy ? 'Слияние…' : 'Объединить карточки'}
      </button>
    </div>
  )
}

function AdminCoachAccessPanel({ students, coachId }) {
  const [studentSearch, setStudentSearch] = useState('')
  const [activeStudent, setActiveStudent] = useState(null)
  const [coaches, setCoaches] = useState([])
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [coachesError, setCoachesError] = useState('')
  const [attachCoachId, setAttachCoachId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setCoachesLoading(true)
    getAllCoaches()
      .then((list) => {
        if (!cancelled) {
          setCoaches(list)
          setCoachesError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoachesError(
            'Не удалось загрузить тренеров. Опубликуйте обновлённые правила Firestore (админ → read coaches).',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCoachesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const coachesById = useMemo(() => new Map(coaches.map((c) => [c.id, c])), [coaches])

  const filteredStudents = useMemo(() => {
    const q = normalizeSearch(studentSearch)
    const list = [...students].sort((a, b) =>
      displayNameFromStudent(a).localeCompare(displayNameFromStudent(b), 'ru'),
    )
    if (!q) return list.slice(0, 80)
    return list.filter((s) => normalizeSearch(displayNameFromStudent(s)).includes(q)).slice(0, 80)
  }, [students, studentSearch])

  const refreshStudent = useCallback(async (id) => {
    if (!id) return
    const fresh = await getStudentById(id)
    if (fresh) setActiveStudent(fresh)
  }, [])

  const linkedCoachIds = useMemo(
    () => (activeStudent ? collectStudentCoachIds(activeStudent) : []),
    [activeStudent],
  )

  const attachOptions = useMemo(
    () => coaches.filter((c) => c.id && !linkedCoachIds.includes(c.id)),
    [coaches, linkedCoachIds],
  )

  const pickStudent = async (student) => {
    setMessage('')
    setActiveStudent(student)
    await refreshStudent(student.id)
  }

  const handleAttach = async () => {
    if (!activeStudent?.id || !attachCoachId) return
    setBusy(true)
    setMessage('')
    try {
      const { status } = await attachCoachToStudent(activeStudent.id, attachCoachId)
      setMessage(status === 'already' ? 'Тренер уже был привязан.' : 'Доступ выдан.')
      setAttachCoachId('')
      await refreshStudent(activeStudent.id)
    } catch (e) {
      console.error(e)
      setMessage(e?.message || 'Не удалось выдать доступ.')
    } finally {
      setBusy(false)
    }
  }

  const handleDetach = async (targetCoachId) => {
    if (!activeStudent?.id) return
    const name = displayCoachLabel(coachesById.get(targetCoachId))
    if (!window.confirm(`Снять доступ у тренера «${name}»?`)) return
    setBusy(true)
    setMessage('')
    try {
      const res = await detachCoachFromStudent(activeStudent.id, targetCoachId)
      if (res.status === 'no_coaches_left') {
        setMessage('У карточки не осталось тренеров — привяжите хотя бы одного.')
      } else {
        setMessage('Доступ снят.')
      }
      await refreshStudent(activeStudent.id)
    } catch (e) {
      console.error(e)
      setMessage(e?.message || 'Не удалось снять доступ.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className={vk.muted}>
        Выберите ученика и управляйте списком тренеров с доступом к его карточке (как «Присоединить по коду», но от
        имени администратора).
      </p>

      {coachesError ? <p className={vk.error}>{coachesError}</p> : null}
      {coachesLoading ? <p className={vk.muted}>Загрузка списка тренеров…</p> : null}

      <input
        type="search"
        value={studentSearch}
        onChange={(e) => setStudentSearch(e.target.value)}
        placeholder="Найти ученика…"
        className={vk.input}
      />

      <div className={`max-h-40 overflow-y-auto rounded-[10px] border border-[#e7e8ec] ${vk.cardFlat}`}>
        <ul className="divide-y divide-[#e7e8ec]">
          {filteredStudents.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pickStudent(s)}
                className={`w-full px-3 py-2 text-left text-[14px] active:bg-[#f5f6f8] ${
                  activeStudent?.id === s.id ? 'bg-[#ecf3fc] font-medium text-[#2d81e0]' : 'text-[#2c2d2e]'
                }`}
              >
                {displayNameFromStudent(s)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {activeStudent ? (
        <div className={`${vk.card} space-y-3 border border-[#e7e8ec]`}>
          <p className="text-[15px] font-semibold text-[#2c2d2e]">{displayNameFromStudent(activeStudent)}</p>

          <div>
            <p className={vk.label}>Тренеры с доступом</p>
            {linkedCoachIds.length === 0 ? (
              <p className={vk.muted}>Никто не привязан.</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-2">
                {linkedCoachIds.map((id) => (
                  <li
                    key={id}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#f0f2f5] px-2 py-1 text-[13px] text-[#2c2d2e]"
                  >
                    <span>
                      {displayCoachLabel(coachesById.get(id))}
                      {id === coachId ? (
                        <span className="ml-1 text-[11px] text-[#818c99]">(вы)</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDetach(id)}
                      className="text-[#e64646] active:opacity-70"
                      aria-label="Снять доступ"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[12rem] flex-1">
              <span className={vk.label}>Выдать доступ тренеру</span>
              <select
                value={attachCoachId}
                onChange={(e) => setAttachCoachId(e.target.value)}
                className={vk.select}
                disabled={busy || attachOptions.length === 0}
              >
                <option value="">— выберите —</option>
                {attachOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {displayCoachLabel(c)}
                    {c.email ? ` (${c.email})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !attachCoachId}
              onClick={handleAttach}
              className={vk.btnPrimary}
            >
              Выдать доступ
            </button>
          </div>

          {message ? (
            <p className={`text-[13px] ${message.includes('Не') ? 'text-[#e64646]' : 'text-[#4bb34b]'}`}>
              {message}
            </p>
          ) : null}
        </div>
      ) : (
        <p className={vk.muted}>Выберите ученика из списка выше.</p>
      )}
    </div>
  )
}

/**
 * @param {{ coachId?: string, onOpenStudent?: (student: object) => void }} props
 */
export default function AdminToolsPage({ coachId, onOpenStudent }) {
  const [tab, setTab] = useState('merge')
  const { students, isLoading, loadError } = useCoachStudents(coachId, { viewAllStudents: true })

  const segmentClass = (active) =>
    [vk.segmentBtn, active ? vk.segmentBtnActive : vk.segmentBtnInactive].join(' ')

  return (
    <main className={`${vk.pageWithNav} ${vk.pagePad}`}>
      <div className={`${vk.containerMid} max-w-3xl`}>
        <BackToHomeBar />
        <div className={vk.cardPadded}>
          <h1 className={vk.h1Lg}>Администрирование</h1>
          <p className={`mt-1.5 ${vk.muted}`}>
            Слияние дубликатов учеников и выдача доступа тренерам. Действия необратимы — проверяйте ФИО и год рождения.
          </p>

          <div className={`mt-4 ${vk.segmentBar}`}>
            <button type="button" className={segmentClass(tab === 'merge')} onClick={() => setTab('merge')}>
              Слияние карточек
            </button>
            <button type="button" className={segmentClass(tab === 'access')} onClick={() => setTab('access')}>
              Доступ тренеров
            </button>
          </div>

          {loadError ? <p className={`mt-3 ${vk.error}`}>{loadError}</p> : null}
          {isLoading ? <p className={`mt-3 ${vk.muted}`}>Загрузка учеников…</p> : null}

          {!isLoading && !loadError ? (
            <div className="mt-4">
              {tab === 'merge' ? (
                <AdminMergePanel students={students} coachId={coachId} onOpenStudent={onOpenStudent} />
              ) : (
                <AdminCoachAccessPanel students={students} coachId={coachId} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
